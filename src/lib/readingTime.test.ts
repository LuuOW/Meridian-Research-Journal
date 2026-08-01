import test from "node:test";
import assert from "node:assert";
import {
  calculateReadingTimeMinutes,
  formatReadingTime,
  estimateAndFormatReadingTime
} from "./readingTime.js";

test("calculateReadingTimeMinutes returns 1 for empty or invalid input", () => {
  assert.strictEqual(calculateReadingTimeMinutes(""), 1);
  assert.strictEqual(calculateReadingTimeMinutes(null as unknown as string), 1);
  assert.strictEqual(calculateReadingTimeMinutes(undefined as unknown as string), 1);
  assert.strictEqual(calculateReadingTimeMinutes("   "), 1);
});

test("calculateReadingTimeMinutes computes correct minutes based on word count", () => {
  // 400 words at 200 wpm -> 2 minutes
  const words400 = Array(400).fill("quantum").join(" ");
  assert.strictEqual(calculateReadingTimeMinutes(words400, 200), 2);

  // 201 words at 200 wpm -> 2 minutes (rounded up)
  const words201 = Array(201).fill("optics").join(" ");
  assert.strictEqual(calculateReadingTimeMinutes(words201, 200), 2);

  // 100 words at 200 wpm -> 1 minute
  const words100 = Array(100).fill("photon").join(" ");
  assert.strictEqual(calculateReadingTimeMinutes(words100, 200), 1);
});

test("calculateReadingTimeMinutes strips markdown and LaTeX formulas before counting words", () => {
  const contentWithLatex = `
    # High-Energy Physics
    Here is a formula: $$ \\frac{d\\sigma}{d\\Omega} = |f(\\theta)|^2 $$
    And inline math: $E = mc^2$.
    The photon energy is measured in electronvolts.
  `;
  const minutes = calculateReadingTimeMinutes(contentWithLatex, 200);
  assert.strictEqual(minutes, 1);
});

test("formatReadingTime formats numeric minutes correctly", () => {
  assert.strictEqual(formatReadingTime(1), "1 min read");
  assert.strictEqual(formatReadingTime(7), "7 min read");
  assert.strictEqual(formatReadingTime(0), "1 min read");
  assert.strictEqual(formatReadingTime(-5), "1 min read");
  assert.strictEqual(formatReadingTime(NaN), "1 min read");
  assert.strictEqual(formatReadingTime(12.8), "13 min read");
});

test("estimateAndFormatReadingTime estimates and returns formatted string", () => {
  const text = Array(600).fill("waveguide").join(" ");
  assert.strictEqual(estimateAndFormatReadingTime(text, 200), "3 min read");
});
