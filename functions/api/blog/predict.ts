import { CloudflareEnv, jsonResponse } from "../_utils";

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as { topic?: string };
    const topic = body?.topic || "Topological Quantum Computing & Squeezed Light Waveguides";

    const geminiKey = env.GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "");

    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const prompt = `Provide a rapid scholarly prediction and roadmap for the following scientific domain: "${topic}". Outline 3 breakthrough milestones expected within 18-36 months with technical rigor.`;

        const resp = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (resp.ok) {
          const data = (await resp.json()) as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return jsonResponse({
              success: true,
              prediction: text,
              source: "gemini-api",
            });
          }
        }
      } catch (err) {
        console.warn("[Cloudflare Backend] Gemini predict fallback:", err);
      }
    }

    return jsonResponse({
      success: true,
      prediction: `### Emerging Quantum & Photonic Horizons\n\n1. **High-Order Kerr Soliton Mode Locking**: Monolithic lithium niobate integration will enable phase-noise reduction exceeding 45 dB.\n2. **Non-Hermitian Waveguide Array Invariants**: Exceptional point stabilization across dynamic thermal turbulence without active active feedback.\n3. **Scalable Entanglement Distribution**: Multi-core photonic interconnects surpassing 100 Tbit/s transmission thresholds.`,
      source: "procedural-fallback",
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Prediction error" }, 500);
  }
};
