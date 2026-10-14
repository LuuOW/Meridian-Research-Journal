import test from "node:test";
import assert from "node:assert";
import { ensureAnimatedSvg, prepareSvgForPngExport, SVG_ANIMATION_STYLES } from "./svgUtils";
import { generateProceduralBannerSvg } from "./svgBannerGenerator";

test("SVG Animation Styles defines adaptive dark mode inversion", () => {
  assert.ok(
    SVG_ANIMATION_STYLES.includes("@media (prefers-color-scheme: dark)"),
    "SVG_ANIMATION_STYLES must define media query for dark mode"
  );
  assert.ok(
    SVG_ANIMATION_STYLES.includes("invert(0.92)") && SVG_ANIMATION_STYLES.includes("hue-rotate(180deg)"),
    "Dark mode styles must include chromatic hue-preserving inversion"
  );
  assert.ok(
    SVG_ANIMATION_STYLES.includes("mrd-dark-mode") || SVG_ANIMATION_STYLES.includes("data-theme"),
    "Dark mode styles must support explicit theme selectors"
  );
});

test("ensureAnimatedSvg annotates root SVG with banner classes and data attributes", () => {
  const plainSvg = '<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="400" fill="#000" /></svg>';
  const processed = ensureAnimatedSvg(plainSvg);

  assert.ok(processed.includes('class="meridian-banner-svg mrd-banner-root"'));
  assert.ok(processed.includes('data-banner="true"'));
  assert.ok(processed.includes('<style id="mrd-svg-animations">'));
});

test("ensureAnimatedSvg applies dark mode theme when explicitly requested", () => {
  const plainSvg = '<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="400" fill="#000" /></svg>';
  const darkProcessed = ensureAnimatedSvg(plainSvg, "dark");

  assert.ok(darkProcessed.includes('data-theme="dark"'), "Must have data-theme='dark'");
  assert.ok(darkProcessed.includes("mrd-dark-mode"), "Must contain mrd-dark-mode class");
});

test("ensureAnimatedSvg preserves light mode theme when explicitly requested", () => {
  const plainSvg = '<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" class="mrd-dark-mode"><rect width="800" height="400" fill="#000" /></svg>';
  const lightProcessed = ensureAnimatedSvg(plainSvg, "light");

  assert.ok(lightProcessed.includes('data-theme="light"'), "Must have data-theme='light'");
  const rootTag = lightProcessed.match(/<svg\b[^>]*>/i)?.[0] || "";
  assert.ok(!rootTag.includes("mrd-dark-mode"), "Root SVG must not contain mrd-dark-mode class");
});

test("ensureAnimatedSvg updates older existing style blocks with fresh dark mode styles", () => {
  const legacySvg = `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style id="mrd-svg-animations">/* legacy old styles without dark mode */</style>
    </defs>
    <rect width="800" height="400" fill="#050510" />
  </svg>`;

  const upgraded = ensureAnimatedSvg(legacySvg);
  assert.ok(
    upgraded.includes("@media (prefers-color-scheme: dark)"),
    "Should replace legacy style block with updated animations and dark mode rules"
  );
});

test("generateProceduralBannerSvg includes banner identifying classes out of the box", () => {
  const svg = generateProceduralBannerSvg("Neutrino Tridents and W-boson Production", "High-Energy Physics", 42);
  assert.ok(svg.includes("meridian-banner-svg"));
  assert.ok(svg.includes('data-banner="true"'));
});

test("prepareSvgForPngExport supports dark theme mode parameter", () => {
  const svg = '<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="400" fill="#000" /></svg>';
  const darkExport = prepareSvgForPngExport(svg, 1200, 675, "dark");
  assert.ok(darkExport.includes('data-theme="dark"'));
  assert.ok(darkExport.includes('width="1200"'));
  assert.ok(darkExport.includes('height="675"'));
});
