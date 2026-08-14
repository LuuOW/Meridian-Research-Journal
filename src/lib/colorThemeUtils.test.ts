import test from "node:test";
import assert from "node:assert";
import {
  getTagHue,
  getTagStyle,
  hslToRgb,
  getRelativeLuminance,
  calculateContrastRatio
} from "./colorThemeUtils";

test("getTagHue returns consistent deterministic hue within 0-359", () => {
  const hue1 = getTagHue("Quantum Informatics");
  const hue2 = getTagHue("Quantum Informatics");
  const hue3 = getTagHue("Astrophysics");

  assert.strictEqual(hue1, hue2, "Identical strings must yield identical hues");
  assert.ok(hue1 >= 0 && hue1 < 360, "Hue must be in range [0, 360)");
  assert.ok(hue3 >= 0 && hue3 < 360, "Hue must be in range [0, 360)");
});

test("getTagHue handles empty string with default hue", () => {
  const hue = getTagHue("");
  assert.strictEqual(hue, 210);
});

test("getTagStyle provides custom thematic styling for specific scientific domains", () => {
  const quantumStyle = getTagStyle("Quantum Computing");
  assert.ok(quantumStyle.bg.includes("cyan"), "Quantum tags should use cyan accent");
  assert.strictEqual(quantumStyle.accentColor, "#06b6d4");

  const opticsStyle = getTagStyle("Coherent Laser Optics");
  assert.ok(opticsStyle.bg.includes("violet"), "Optics tags should use violet accent");
  assert.strictEqual(opticsStyle.accentColor, "#8b5cf6");

  const cosmologyStyle = getTagStyle("Cosmology & Black Holes");
  assert.ok(cosmologyStyle.bg.includes("amber"), "Cosmology tags should use amber accent");
  assert.strictEqual(cosmologyStyle.accentColor, "#f59e0b");

  const thermoStyle = getTagStyle("Statistical Thermodynamics");
  assert.ok(thermoStyle.bg.includes("emerald"), "Thermodynamics tags should use emerald accent");
  assert.strictEqual(thermoStyle.accentColor, "#10b981");

  const particleStyle = getTagStyle("Gauge Field Theory");
  assert.ok(particleStyle.bg.includes("rose"), "Particle physics tags should use rose accent");
  assert.strictEqual(particleStyle.accentColor, "#f43f5e");
});

test("getTagStyle falls back to deterministic HSL calculation for general terms", () => {
  const style = getTagStyle("Nonlinear Dynamics");
  assert.ok(style.accentColor.startsWith("hsl("));
  assert.ok(style.text.startsWith("hsl("));
});

test("hslToRgb correctly transforms HSL values to RGB values", () => {
  const black = hslToRgb(0, 0, 0);
  assert.strictEqual(black, "0, 0, 0");

  const white = hslToRgb(0, 0, 100);
  assert.strictEqual(white, "255, 255, 255");

  const pureRed = hslToRgb(0, 100, 50);
  assert.strictEqual(pureRed, "255, 0, 0");

  const pureGreen = hslToRgb(120, 100, 50);
  assert.strictEqual(pureGreen, "0, 255, 0");

  const pureBlue = hslToRgb(240, 100, 50);
  assert.strictEqual(pureBlue, "0, 0, 255");
});

test("getRelativeLuminance computes correct bounds for black and white", () => {
  const blackLum = getRelativeLuminance(0, 0, 0);
  const whiteLum = getRelativeLuminance(255, 255, 255);

  assert.strictEqual(blackLum, 0);
  assert.strictEqual(Math.round(whiteLum), 1);
});

test("calculateContrastRatio accurately validates WCAG contrast ratios", () => {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const maxContrast = calculateContrastRatio(white, black);

  assert.strictEqual(maxContrast, 21.0, "White on black contrast must be 21:1");

  const sameContrast = calculateContrastRatio(white, white);
  assert.strictEqual(sameContrast, 1.0, "Identical colors must have 1:1 contrast");

  const darkNavy = { r: 10, g: 17, b: 40 };
  const cyanText = { r: 56, g: 189, b: 248 };
  const badgeContrast = calculateContrastRatio(darkNavy, cyanText);
  assert.ok(badgeContrast >= 4.5, "Cyan on dark navy must exceed WCAG AA minimum 4.5:1");
});
