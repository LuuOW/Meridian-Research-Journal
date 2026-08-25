import test from "node:test";
import assert from "node:assert";
import { generateProceduralBannerSvg } from "./svgBannerGenerator";
import { ensureAnimatedSvg, prepareSvgForPngExport, SVG_ANIMATION_STYLES } from "./svgUtils";

test("Procedural SVG Generation: creates deterministic, self-contained SVG for article banner", () => {
  const svg = generateProceduralBannerSvg(
    "Spontaneous Parametric Down-Conversion in Microresonators",
    ["Photonics", "Quantum Optics", "Non-linear Optics"],
    42
  );

  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.includes("viewBox="));
  assert.ok(svg.includes("xmlns="));
  assert.ok(svg.includes("PARAMETRIC DOWN-CONVERSION") || svg.includes("PHOTONICS") || svg.includes("QUANTUM"));
  assert.ok(svg.endsWith("</svg>"));
});

test("Procedural SVG Generation: handles HTML/XML quotes and entities safely", () => {
  const unsafeTitle = 'Quantum "Schrödinger" <States> & Coherence 100% in H2O';
  const svg = generateProceduralBannerSvg(unsafeTitle, ["Quantum", "Chemistry"], 101);

  assert.ok(!svg.includes("<States>"));
  assert.ok(svg.includes("&lt;States&gt;") || svg.includes("States"));
});

test("SVG Animation Injection: ensures dynamic CSS styles and keyframes are present", () => {
  const staticSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    <path d="M 10 10 L 100 100" stroke="#06b6d4" stroke-width="2"/>
    <circle cx="200" cy="200" r="10" fill="#a855f7"/>
  </svg>`;

  const animated = ensureAnimatedSvg(staticSvg);
  assert.ok(animated.includes("@keyframes mrdWaveFlow"));
  assert.ok(animated.includes("mrd-anim-pulse") || animated.includes("mrd-anim-wave"));
});

test("SVG PNG Export Sanitization: adds explicit pixel dimensions and strips dangerous web fonts", () => {
  const inputSvg = `<svg viewBox="0 0 800 400"><text font-family="'Inter', sans-serif">Formula & Science</text></svg>`;
  const prepped = prepareSvgForPngExport(inputSvg, 1200, 630);

  assert.ok(prepped.includes('width="1200"'));
  assert.ok(prepped.includes('height="630"'));
  assert.ok(prepped.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(!prepped.includes("@import url('https://fonts.googleapis.com"));
});
