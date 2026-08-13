import test from "node:test";
import assert from "node:assert";
import { ensureAnimatedSvg, prepareSvgForPngExport } from "./svgUtils.js";

test("injects animation styles and keyframes into static SVG string", () => {
  const staticSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400"><path d="M 0,0 L 100,100" stroke="#00f" /></svg>`;
  const animated = ensureAnimatedSvg(staticSvg);

  assert.ok(animated.includes("@keyframes mrdWaveFlow"));
  assert.ok(animated.includes("mrd-anim-wave-1"));
  assert.ok(animated.includes('<path class="mrd-anim-wave-1"'));
});

test("adds pulse animation classes to circle elements", () => {
  const svgWithCircle = `<svg viewBox="0 0 800 400"><circle cx="400" cy="200" r="10" fill="#fff" /></svg>`;
  const animated = ensureAnimatedSvg(svgWithCircle);

  assert.ok(animated.includes("mrd-anim-pulse"));
  assert.ok(animated.includes('<circle class="mrd-anim-pulse mrd-anim-float"'));
});

test("prepares SVG string for PNG export with correct dimensions and namespace", () => {
  const rawSvg = `<svg viewBox="0 0 800 400"><path d="M 0,0 L 10,10" /></svg>`;
  const prepared = prepareSvgForPngExport(rawSvg, 1200, 675);

  assert.ok(prepared.includes('width="1200"'));
  assert.ok(prepared.includes('height="675"'));
  assert.ok(prepared.includes('xmlns="http://www.w3.org/2000/svg"'));
});
