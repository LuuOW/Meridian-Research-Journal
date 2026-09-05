/**
 * Minimal xAI (SpaceXAI / Grok) client.
 * Uses the OpenAI-compatible chat completions endpoint.
 * Secret: XAI_API_KEY (already present in Cloudflare + .env.example)
 */

export type XaiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type XaiChatOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
};

export type XaiChatResult = {
  id: string;
  model: string;
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  raw?: any;
};

const XAI_BASE = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.6"; // coding-capable flagship; falls back gracefully

export function getXaiApiKey(env?: Record<string, any>): string | null {
  const key =
    env?.XAI_API_KEY ||
    (typeof process !== "undefined" ? process.env?.XAI_API_KEY : undefined);
  return key ? String(key).trim() : null;
}

export async function xaiChatCompletion(
  messages: XaiMessage[],
  options: XaiChatOptions = {},
  env?: Record<string, any>
): Promise<XaiChatResult> {
  const apiKey = getXaiApiKey(env);
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not configured");
  }

  const body = {
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.max_tokens ?? 4096,
    stream: false,
  };

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`xAI API error ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    "";

  return {
    id: data?.id || `xai_${Date.now()}`,
    model: data?.model || body.model,
    content: String(content).trim(),
    usage: data?.usage,
    raw: data,
  };
}

/** Streaming helper (Server-Sent Events style). Returns the full concatenated text. */
export async function xaiChatCompletionStream(
  messages: XaiMessage[],
  options: XaiChatOptions = {},
  env?: Record<string, any>,
  onChunk?: (delta: string) => void
): Promise<XaiChatResult> {
  const apiKey = getXaiApiKey(env);
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not configured");
  }

  const body = {
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.max_tokens ?? 4096,
    stream: true,
  };

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`xAI stream error ${res.status}: ${text.slice(0, 400)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let model = body.model;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content || "";
        if (delta) {
          full += delta;
          onChunk?.(delta);
        }
        if (json?.model) model = json.model;
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }

  return {
    id: `xai_stream_${Date.now()}`,
    model,
    content: full.trim(),
  };
}
