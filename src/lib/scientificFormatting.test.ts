import test from "node:test";
import assert from "node:assert";
import {
  getSpeechScript,
  getSentences,
  formatAudioTime,
  estimateSpeechDuration
} from "./audioUtils.js";
import {
  isMathExpression,
  sanitizeLatexFormula
} from "./mathUtils.js";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState
} from "./rayTracingUtils.js";

test("getSpeechScript removes LaTeX block equations and formats clean spoken prose", () => {
  const content = `
    # Quantum Photonics
    Here is our core equation:
    $$ \\hat{H} = \\hbar \\omega (a^\\dagger a + \\frac{1}{2}) $$
    And inline formula: $E = \\hbar \\nu$.
    ## Section 1: Detection
    The photodetector registers single photon events.
  `;
  const script = getSpeechScript(content, "Quantum Detection");

  assert.ok(script.includes("Listening to: Quantum Detection. Published by Meridian Research."));
  assert.ok(script.includes("equation mathematical formula"));
  assert.ok(!script.includes("$$"));
  assert.ok(!script.includes("## Section 1:"));
  assert.ok(script.includes("Section 1: Detection."));
});

test("getSentences splits markdown text into spoken sentence segments", () => {
  const text = "First sentence about quantum optics. Second sentence with precision timing! Third sentence?";
  const sentences = getSentences(text);

  assert.strictEqual(sentences.length, 3);
  assert.strictEqual(sentences[0], "First sentence about quantum optics.");
  assert.strictEqual(sentences[1], "Second sentence with precision timing!");
  assert.strictEqual(sentences[2], "Third sentence?");
});

test("getSentences returns empty array on empty or whitespace strings", () => {
  assert.deepStrictEqual(getSentences(""), []);
  assert.deepStrictEqual(getSentences("   "), []);
  assert.deepStrictEqual(getSentences("..."), []);
});

test("formatAudioTime formats seconds into MM:SS correctly", () => {
  assert.strictEqual(formatAudioTime(0), "0:00");
  assert.strictEqual(formatAudioTime(5), "0:05");
  assert.strictEqual(formatAudioTime(59), "0:59");
  assert.strictEqual(formatAudioTime(60), "1:00");
  assert.strictEqual(formatAudioTime(125), "2:05");
  assert.strictEqual(formatAudioTime(3600), "60:00");
  assert.strictEqual(formatAudioTime(-10), "0:00");
  assert.strictEqual(formatAudioTime(NaN), "0:00");
});

test("estimateSpeechDuration estimates speech length according to word count and speed multiplier", () => {
  // 150 words at 1.0x -> 60 seconds
  assert.strictEqual(estimateSpeechDuration(150, 1.0), 60);

  // 300 words at 1.0x -> 120 seconds
  assert.strictEqual(estimateSpeechDuration(300, 1.0), 120);

  // 150 words at 1.5x -> 40 seconds
  assert.strictEqual(estimateSpeechDuration(150, 1.5), 40);

  // 0 words -> 0 seconds
  assert.strictEqual(estimateSpeechDuration(0, 1.0), 0);
  assert.strictEqual(estimateSpeechDuration(-50, 1.0), 0);
});

test("sanitizeLatexFormula normalizes various LaTeX wrapper delimiters", () => {
  assert.strictEqual(sanitizeLatexFormula("\\[ \\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0} \\]"), "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}");
  assert.strictEqual(sanitizeLatexFormula("$$ \\sum_{i=1}^n x_i $$"), "\\sum_{i=1}^n x_i");
  assert.strictEqual(sanitizeLatexFormula("\\( \\alpha + \\beta \\)"), "\\( \\alpha + \\beta \\)");
});

test("isMathExpression distinguishes physics operators and formulas from standard text", () => {
  assert.strictEqual(isMathExpression("\\psi"), true);
  assert.strictEqual(isMathExpression("A \\cup B"), true);
  assert.strictEqual(isMathExpression("\\sqrt{2}"), true);
  assert.strictEqual(isMathExpression("e^{i \\pi} + 1 = 0"), true);
  assert.strictEqual(isMathExpression("million tokens per month"), false);
  assert.strictEqual(isMathExpression("500 dollars per month"), false);
  assert.strictEqual(isMathExpression("100k"), false);
  assert.strictEqual(isMathExpression("~0.02"), false);
});

test("calculateNormalizedCursor bounds coordinates to range [-1, 1]", () => {
  const rect = { left: 100, top: 100, width: 200, height: 200 };

  // Center (200, 200) -> (0, 0)
  const center = calculateNormalizedCursor(200, 200, rect);
  assert.strictEqual(center.normX, 0);
  assert.strictEqual(center.normY, 0);

  // Top-left (100, 100) -> (-1, -1)
  const topLeft = calculateNormalizedCursor(100, 100, rect);
  assert.strictEqual(topLeft.normX, -1);
  assert.strictEqual(topLeft.normY, -1);

  // Far beyond bounds clamped to 1
  const farRight = calculateNormalizedCursor(1000, 1000, rect);
  assert.strictEqual(farRight.normX, 1);
  assert.strictEqual(farRight.normY, 1);
});

test("computeRayTracedLightState calculates accurate light, tilt, and shadow projections", () => {
  const state = computeRayTracedLightState(0, 0, 4, 20);

  assert.strictEqual(state.lightX, 50);
  assert.strictEqual(state.lightY, 50);
  assert.strictEqual(state.tiltX, 0);
  assert.strictEqual(state.tiltY, 0);
  assert.strictEqual(state.shadowX, 0);
  assert.strictEqual(state.shadowY, 8);
});

test("getDefaultLightState returns consistent resting card light parameters", () => {
  const defaultState = getDefaultLightState();
  assert.strictEqual(defaultState.lightX, 50);
  assert.strictEqual(defaultState.lightY, 50);
  assert.strictEqual(defaultState.tiltX, 0);
  assert.strictEqual(defaultState.tiltY, 0);
  assert.strictEqual(defaultState.shadowX, 0);
  assert.strictEqual(defaultState.shadowY, 12);
});
