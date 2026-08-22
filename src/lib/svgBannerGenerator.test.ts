import test from "node:test";
import assert from "node:assert";
import {
  generateProceduralBannerSvg,
  BANNER_THEMES,
  resetProceduralCounter,
  getProceduralCounter
} from "./svgBannerGenerator.js";

test("BANNER_THEMES contains 6 distinct curated color schemes", () => {
  assert.strictEqual(BANNER_THEMES.length, 6);
  BANNER_THEMES.forEach((theme, index) => {
    assert.ok(theme.bgStart.startsWith("#"), `Theme ${index} bgStart should be a valid hex`);
    assert.ok(theme.bgMid.startsWith("#"), `Theme ${index} bgMid should be a valid hex`);
    assert.ok(theme.bgEnd.startsWith("#"), `Theme ${index} bgEnd should be a valid hex`);
    assert.ok(theme.primary.startsWith("#"), `Theme ${index} primary should be a valid hex`);
    assert.ok(theme.secondary.startsWith("#"), `Theme ${index} secondary should be a valid hex`);
    assert.ok(theme.accent.startsWith("#"), `Theme ${index} accent should be a valid hex`);
    assert.ok(theme.accent2.startsWith("#"), `Theme ${index} accent2 should be a valid hex`);
    assert.ok(theme.label.length > 5, `Theme ${index} label should be descriptive`);
  });
});

test("generateProceduralBannerSvg generates valid standalone SVG markup", () => {
  resetProceduralCounter();
  const svg = generateProceduralBannerSvg(
    "Intensity-based scattering correction enables in vivo two-photon imaging beyond 1 mm",
    "Optics, Quantum Computing",
    12345
  );

  assert.ok(svg.startsWith("<svg"), "Should begin with <svg");
  assert.ok(svg.endsWith("</svg>"), "Should end with </svg>");
  assert.ok(svg.includes('viewBox="0 0 800 400"'), "Should have standard 800x400 viewBox");
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "Should declare svg namespace");
  assert.ok(svg.includes("<defs>"), "Should include defs section for gradients");
  assert.ok(svg.includes("<linearGradient"), "Should contain linear gradients");
  assert.ok(svg.includes("<radialGradient"), "Should contain radial glow gradients");
  assert.ok(svg.includes("<filter"), "Should contain feGaussianBlur glow filter");
  assert.ok(svg.includes("MERIDIAN RESEARCH"), "Should contain brand watermark");
});

test("generateProceduralBannerSvg sanitizes quotes and truncates long titles", () => {
  const longTitle = 'Quantum "Entanglement" <script>alert(1)</script> & Wavefront Dynamic Non-Hermitian Invariance Across Manifolds 1234567890 1234567890';
  const svg = generateProceduralBannerSvg(longTitle, "Theoretical Physics", 9999);

  assert.ok(!svg.includes("<script>"), "Must strip angle brackets and potential tags");
  assert.ok(!svg.includes('"Entanglement"'), "Must strip raw unescaped quotes");
  assert.ok(svg.includes("Quantum Entanglement"), "Must retain clean text");
});

test("generateProceduralBannerSvg renders distinct geometric archetypes based on seed", () => {
  // Test generation across seeds that select all 6 geometric archetypes (geomType 0 to 5)
  const archetypeOutputs = new Set<string>();

  for (let i = 0; i < 30; i++) {
    const seed = i * 13 * 17;
    const svg = generateProceduralBannerSvg(`Paper Variant ${i}`, "Quantum Optics", seed);
    
    if (svg.includes("mrd-anim-beam") && svg.includes("Laser Waist Beam")) {
      archetypeOutputs.add("optical-cavity");
    } else if (svg.includes("Concentric Phase Rings") || svg.includes("Radial Caustic Rays")) {
      archetypeOutputs.add("fresnel-caustics");
    } else if (svg.includes("Tensor Contraction Points") || svg.includes("Intersecting Manifold Curves")) {
      archetypeOutputs.add("topological-geodesics");
    } else if (svg.includes("Photonic Crystal Lattice Grid Dots") || svg.includes("Central Guided Wave Path")) {
      archetypeOutputs.add("photonic-crystal");
    } else if (svg.includes("Mach-Zehnder") || svg.includes("Beam Splitters")) {
      archetypeOutputs.add("mach-zehnder");
    } else if (svg.includes("Wave Packet Harmonics") || svg.includes("Nodes")) {
      archetypeOutputs.add("diffraction-wave-packet");
    }
  }

  assert.ok(archetypeOutputs.size >= 4, `Should produce diverse geometric archetypes, got ${archetypeOutputs.size}`);
});

test("procedural counter increments and guarantees unique banner generation across successive calls", () => {
  resetProceduralCounter();
  assert.strictEqual(getProceduralCounter(), 0);

  const banner1 = generateProceduralBannerSvg("Test Article 1", "Physics", 100);
  assert.strictEqual(getProceduralCounter(), 1);

  const banner2 = generateProceduralBannerSvg("Test Article 1", "Physics", 100);
  assert.strictEqual(getProceduralCounter(), 2);

  // Because procedural counter changes, the UIDs and exact paths should differ even with same initial seed
  assert.notStrictEqual(banner1, banner2, "Consecutive banners should produce unique SVG artwork");
});

test("generateProceduralBannerSvg handles missing title, empty tags, and zero seed gracefully", () => {
  const fallbackSvg = generateProceduralBannerSvg("", "", 0);

  assert.ok(fallbackSvg.includes("<svg"), "Must produce valid SVG even with empty inputs");
  assert.ok(fallbackSvg.includes("Scientific Publication"), "Should provide safe default title");
  assert.ok(fallbackSvg.includes("PHYSICS & QUANTUM"), "Should provide safe default tag text");
});
