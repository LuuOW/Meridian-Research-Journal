import test from "node:test";
import assert from "node:assert";
import { generateProceduralBannerSvg } from "./svgBannerGenerator.js";
import { ensureAnimatedSvg, prepareSvgForPngExport } from "./svgUtils.js";

interface BannerRegenerationPayload {
  title: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  password?: string;
  seed?: number;
}

function validateBannerPayload(payload: unknown): { valid: boolean; error?: string; cleanPayload?: BannerRegenerationPayload } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Invalid payload: expected an object" };
  }

  const p = payload as Record<string, any>;
  if (!p.title || typeof p.title !== "string" || p.title.trim().length === 0) {
    return { valid: false, error: "Missing or empty title" };
  }

  return {
    valid: true,
    cleanPayload: {
      title: p.title.trim(),
      excerpt: typeof p.excerpt === "string" ? p.excerpt : "",
      content: typeof p.content === "string" ? p.content : "",
      tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
      password: typeof p.password === "string" ? p.password : undefined,
      seed: typeof p.seed === "number" ? p.seed : Date.now()
    }
  };
}

function executeBannerRegeneration(payload: BannerRegenerationPayload): { bannerSvg: string; generatedVia: "procedural" | "ai"; uid: string } {
  // Simulating the server pipeline:
  // When AI is unavailable or as procedural fallback:
  const tagsStr = payload.tags ? payload.tags.join(", ") : "QUANTUM OPTICS";
  const rawSvg = generateProceduralBannerSvg(payload.title, tagsStr, payload.seed);
  const animatedSvg = ensureAnimatedSvg(rawSvg);
  
  const uidMatch = animatedSvg.match(/#([a-z0-9]+)/i);
  const uid = uidMatch ? uidMatch[1] : "000000";

  return {
    bannerSvg: animatedSvg,
    generatedVia: "procedural",
    uid
  };
}

test("validateBannerPayload rejects empty or malformed payloads", () => {
  assert.strictEqual(validateBannerPayload(null).valid, false);
  assert.strictEqual(validateBannerPayload({}).valid, false);
  assert.strictEqual(validateBannerPayload({ title: "  " }).valid, false);
  assert.strictEqual(validateBannerPayload({ title: 123 }).valid, false);
});

test("validateBannerPayload accepts valid blog data with optional seed", () => {
  const result = validateBannerPayload({
    title: "Quantum State Tomography via Compressed Sensing",
    tags: ["Quantum Information", "Optics"],
    seed: 987654321
  });

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.cleanPayload?.title, "Quantum State Tomography via Compressed Sensing");
  assert.strictEqual(result.cleanPayload?.seed, 987654321);
  assert.strictEqual(result.cleanPayload?.tags?.length, 2);
});

test("executeBannerRegeneration produces valid, animated SVG output", () => {
  const result = executeBannerRegeneration({
    title: "Intensity-based scattering correction enables in vivo two-photon imaging beyond 1 mm",
    tags: ["Optics", "Neuroscience", "Deep Learning"],
    seed: 55443322
  });

  assert.ok(result.bannerSvg.startsWith("<svg"));
  assert.ok(result.bannerSvg.endsWith("</svg>"));
  assert.ok(result.bannerSvg.includes("mrd-anim-"), "Should contain animation classes");
  assert.ok(result.bannerSvg.includes("<style id=\"mrd-svg-animations\">"), "Should have embedded CSS animations");
  assert.ok(result.uid.length >= 3, "Should extract a valid banner run UID");
});

test("prepareSvgForPngExport generates canvas-ready markup from regenerated banner", () => {
  const regeneration = executeBannerRegeneration({
    title: "Topological Symmetry Breaking and Chiral Light Emission",
    tags: ["Nanophotonics", "Plasmonics"]
  });

  const exportSvg = prepareSvgForPngExport(regeneration.bannerSvg, 1920, 1080);
  assert.ok(exportSvg.includes('width="1920"'));
  assert.ok(exportSvg.includes('height="1080"'));
  assert.ok(!exportSvg.includes("@import"));
  assert.ok(exportSvg.includes('xmlns="http://www.w3.org/2000/svg"'));
});
