import test from "node:test";
import assert from "node:assert";
import {
  ensureAnimatedSvg,
  prepareSvgForPngExport,
  SVG_ANIMATION_STYLES
} from "./svgUtils.js";

test("SVG_ANIMATION_STYLES defines all required keyframe animations", () => {
  assert.ok(SVG_ANIMATION_STYLES.includes("@keyframes mrdWaveFlow"));
  assert.ok(SVG_ANIMATION_STYLES.includes("@keyframes mrdWaveFlowRev"));
  assert.ok(SVG_ANIMATION_STYLES.includes("@keyframes mrdPulseGlow"));
  assert.ok(SVG_ANIMATION_STYLES.includes("@keyframes mrdFloat"));
  assert.ok(SVG_ANIMATION_STYLES.includes("@keyframes mrdSpinCenter"));
  assert.ok(SVG_ANIMATION_STYLES.includes("@keyframes mrdShimmerGrid"));
  assert.ok(SVG_ANIMATION_STYLES.includes("@keyframes mrdBeamPulse"));
});

test("ensureAnimatedSvg injects defs and style block if missing in static SVG", () => {
  const staticSvg = `<svg viewBox="0 0 800 400"><rect width="800" height="400" fill="#000"/></svg>`;
  const animated = ensureAnimatedSvg(staticSvg);

  assert.ok(animated.includes("<defs>"));
  assert.ok(animated.includes('id="mrd-svg-animations"'));
  assert.ok(animated.includes("mrdWaveFlow"));
});

test("ensureAnimatedSvg inserts style block into existing defs tag", () => {
  const svgWithDefs = `<svg viewBox="0 0 800 400"><defs><linearGradient id="grad1"/></defs><rect width="800" height="400"/></svg>`;
  const animated = ensureAnimatedSvg(svgWithDefs);

  assert.ok(animated.includes('<defs>\n    <style id="mrd-svg-animations">'));
  assert.ok(animated.includes('<linearGradient id="grad1"/>'));
});

test("ensureAnimatedSvg adds animation classes to un-annotated path elements", () => {
  const svgWithPaths = `<svg viewBox="0 0 800 400"><path d="M 0 0 L 100 100" stroke="#00ffff"/></svg>`;
  const animated = ensureAnimatedSvg(svgWithPaths);

  assert.ok(animated.includes('class="mrd-anim-wave-1"'));
});

test("ensureAnimatedSvg assigns wave-2 animation to paths with stroke-dasharray", () => {
  const svgWithDashedPath = `<svg viewBox="0 0 800 400"><path stroke-dasharray="4,2" d="M 0 50 Q 200 100 400 50" stroke="#ff00ff"/></svg>`;
  const animated = ensureAnimatedSvg(svgWithDashedPath);

  assert.ok(animated.includes('class="mrd-anim-wave-2"'));
});

test("ensureAnimatedSvg adds pulse and float classes to circles", () => {
  const svgWithCircles = `<svg viewBox="0 0 800 400"><circle cx="400" cy="200" r="25" fill="#38bdf8"/></svg>`;
  const animated = ensureAnimatedSvg(svgWithCircles);

  assert.ok(animated.includes('class="mrd-anim-pulse mrd-anim-float"'));
});

test("prepareSvgForPngExport adds width, height and XML namespace attributes", () => {
  const rawSvg = `<svg viewBox="0 0 1200 675"><circle cx="600" cy="337" r="100"/></svg>`;
  const prepared = prepareSvgForPngExport(rawSvg, 1920, 1080);

  assert.ok(prepared.includes('width="1920"'));
  assert.ok(prepared.includes('height="1080"'));
  assert.ok(prepared.includes('xmlns="http://www.w3.org/2000/svg"'));
});

test("prepareSvgForPngExport sanitizes unescaped ampersands and dangerous external font URLs", () => {
  const dangerousSvg = `<svg viewBox="0 0 800 400"><text>Quantum & Classical</text><style>@import url('https://fonts.googleapis.com/css');</style></svg>`;
  const prepared = prepareSvgForPngExport(dangerousSvg);

  assert.ok(prepared.includes("Quantum &amp; Classical"));
  assert.ok(!prepared.includes("@import"));
});

test("ensureAnimatedSvg handles empty or non-string inputs safely", () => {
  assert.strictEqual(ensureAnimatedSvg(""), "");
  assert.strictEqual(ensureAnimatedSvg(null as unknown as string), null);
  assert.strictEqual(ensureAnimatedSvg(undefined as unknown as string), undefined);
});
