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

test("does not double-inject keyframe animations if already present", () => {
  const existingSvg = `<svg viewBox="0 0 800 400"><defs><style>@keyframes mrdWaveFlow { 0% {} }</style></defs><path d="M0,0 L10,10"/></svg>`;
  const result = ensureAnimatedSvg(existingSvg);
  const matches = result.match(/@keyframes mrdWaveFlow/g);
  assert.strictEqual(matches?.length, 1, "Should not duplicate keyframe block");
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

test("prepareSvgForPngExport cleans unescaped ampersands and external web fonts", () => {
  const dirtySvg = `<svg viewBox="0 0 800 400"><defs><style>@import url('https://fonts.googleapis.com/css2?family=Roboto');</style></defs><text>Quantum & Optics</text></svg>`;
  const prepared = prepareSvgForPngExport(dirtySvg);

  assert.ok(!prepared.includes("@import"), "External font import should be stripped for canvas safety");
  assert.ok(prepared.includes("Quantum &amp; Optics"), "Unescaped ampersand should be converted to &amp;");
});

test("ensureAnimatedSvg returns non-string inputs unmodified", () => {
  assert.strictEqual(ensureAnimatedSvg(""), "");
  assert.strictEqual(ensureAnimatedSvg(null as unknown as string), null);
});
