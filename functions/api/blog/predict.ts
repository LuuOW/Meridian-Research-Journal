import { CloudflareEnv, jsonResponse } from "../_utils";

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as { topic?: string };
    const topic = body?.topic || "Topological Quantum Computing & Squeezed Light Waveguides";

    const githubToken = env.GITHUB_TOKEN || (typeof process !== "undefined" ? process.env?.GITHUB_TOKEN : "");

    if (githubToken) {
      try {
        const ghUrl = "https://models.github.ai/inference/chat/completions";
        const prompt = `Provide a rapid scholarly prediction and roadmap for the following scientific domain: "${topic}". Outline 3 breakthrough milestones expected within 18-36 months with technical rigor.`;

        const resp = await fetch(ghUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${githubToken}`,
            "User-Agent": "AskMeridian-Edge/1.0"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
          }),
        });

        if (resp.ok) {
          const data = (await resp.json()) as any;
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            return jsonResponse({
              success: true,
              prediction: text,
              source: "github-models",
            });
          }
        }
      } catch (err) {
        console.warn("[Cloudflare Backend] GitHub Models predict fallback:", err);
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
