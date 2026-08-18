import test from "node:test";
import assert from "node:assert";
import {
  getTagHue,
  getTagStyle,
  hslToRgb,
  getRelativeLuminance,
  calculateContrastRatio
} from "./colorThemeUtils.js";

test("getTagHue computes deterministic integer hues between 0 and 359", () => {
  const hue1 = getTagHue("Quantum Physics");
  const hue2 = getTagHue("Quantum Physics");
  const hue3 = getTagHue("Astrophysics");

  assert.strictEqual(hue1, hue2, "Identical tags must produce identical hues");
  assert.ok(hue1 >= 0 && hue1 < 360, "Hue must be within [0, 360)");
  assert.ok(hue3 >= 0 && hue3 < 360, "Hue must be within [0, 360)");
  assert.strictEqual(getTagHue(""), 210, "Empty tag must return default 210 hue");
});

test("getTagStyle applies specialized palettes for core scientific domains", () => {
  const quantum = getTagStyle("Quantum Computing");
  assert.ok(quantum.bg.includes("cyan"));
  assert.strictEqual(quantum.accentColor, "#06b6d4");

  const optics = getTagStyle("Laser Photonics");
  assert.ok(optics.bg.includes("violet"));
  assert.strictEqual(optics.accentColor, "#8b5cf6");

  const cosmology = getTagStyle("Spacetime Relativity");
  assert.ok(cosmology.bg.includes("amber"));
  assert.strictEqual(cosmology.accentColor, "#f59e0b");

  const thermo = getTagStyle("Statistical Thermodynamics");
  assert.ok(thermo.bg.includes("emerald"));
  assert.strictEqual(thermo.accentColor, "#10b981");

  const particle = getTagStyle("High Energy Particle Physics");
  assert.ok(particle.bg.includes("rose"));
  assert.strictEqual(particle.accentColor, "#f43f5e");
});

test("getTagStyle produces dynamic HSL style for custom tags", () => {
  const custom = getTagStyle("Synthetic Biology");
  assert.ok(custom.bg.startsWith("rgba("));
  assert.ok(custom.text.startsWith("hsl("));
  assert.ok(custom.border.startsWith("rgba("));
  assert.ok(custom.accentColor.startsWith("hsl("));
});

test("hslToRgb converts primary hues to valid RGB string format", () => {
  // Pure Red: H=0, S=100, L=50 -> 255, 0, 0
  assert.strictEqual(hslToRgb(0, 100, 50), "255, 0, 0");

  // Pure Green: H=120, S=100, L=50 -> 0, 255, 0
  assert.strictEqual(hslToRgb(120, 100, 50), "0, 255, 0");

  // Pure Blue: H=240, S=100, L=50 -> 0, 0, 255
  assert.strictEqual(hslToRgb(240, 100, 50), "0, 0, 255");

  // White: L=100 -> 255, 255, 255
  assert.strictEqual(hslToRgb(0, 0, 100), "255, 255, 255");

  // Black: L=0 -> 0, 0, 0
  assert.strictEqual(hslToRgb(0, 0, 0), "0, 0, 0");
});

test("getRelativeLuminance calculates accurate sRGB relative luminance", () => {
  // White has luminance of 1.0
  const lumWhite = getRelativeLuminance(255, 255, 255);
  assert.ok(Math.abs(lumWhite - 1.0) < 0.001);

  // Black has luminance of 0.0
  const lumBlack = getRelativeLuminance(0, 0, 0);
  assert.ok(Math.abs(lumBlack - 0.0) < 0.001);

  // Standard sRGB coefficients: Green > Red > Blue
  const lumGreen = getRelativeLuminance(0, 255, 0);
  const lumRed = getRelativeLuminance(255, 0, 0);
  const lumBlue = getRelativeLuminance(0, 0, 255);
  assert.ok(lumGreen > lumRed && lumRed > lumBlue);
});

test("calculateContrastRatio computes WCAG contrast ratios correctly", () => {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const gray = { r: 128, g: 128, b: 128 };

  // Maximum contrast (Black vs White) is 21:1
  const maxContrast = calculateContrastRatio(white, black);
  assert.strictEqual(maxContrast, 21);

  // Identical colors have contrast 1:1
  const identityContrast = calculateContrastRatio(gray, gray);
  assert.strictEqual(identityContrast, 1);

  // Contrast calculation is symmetric
  assert.strictEqual(calculateContrastRatio(white, gray), calculateContrastRatio(gray, white));
});
