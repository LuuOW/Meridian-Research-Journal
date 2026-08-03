import test from "node:test";
import assert from "node:assert";
import {
  countSyllables,
  calculateFleschKincaidScore,
  analyzeTextMetrics
} from "./readability.js";

test("countSyllables counts syllables accurately for standard English words", () => {
  assert.strictEqual(countSyllables("cat"), 1);
  assert.strictEqual(countSyllables("quantum"), 2);
  assert.strictEqual(countSyllables("photonics"), 3);
  assert.strictEqual(countSyllables("superposition"), 5);
  assert.strictEqual(countSyllables(""), 0);
  assert.strictEqual(countSyllables(null as unknown as string), 0);
});

test("calculateFleschKincaidScore computes valid score and level for simple text", () => {
  const simpleText = "The cat sat on the mat. It was a sunlit day.";
  const result = calculateFleschKincaidScore(simpleText);
  assert.ok(result.score > 80);
  assert.ok(result.level.includes("Easy"));
});

test("calculateFleschKincaidScore rates dense academic text as difficult/academic", () => {
  const academicText = `
    Parametric down-conversion processes in non-centrosymmetric optical crystals yield non-classical photon pairs with high non-degenerate polarization entanglement, enabling quantum key distribution across free-space optical channels.
  `;
  const result = calculateFleschKincaidScore(academicText);
  assert.ok(result.score < 50);
  assert.ok(result.level.includes("Difficult") || result.level.includes("Academic"));
});

test("calculateFleschKincaidScore handles empty text gracefully", () => {
  const result = calculateFleschKincaidScore("");
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.level, "Very Easy");
});

test("analyzeTextMetrics generates complete metrics object", () => {
  const article = `
    Quantum optics investigates individual photons interacting with microscopic matter.
    
    Integrated photonic circuits utilize silicon waveguides to guide optical signals with minimal loss.
  `;
  const metrics = analyzeTextMetrics(article);
  assert.ok(metrics.characterCount > 100);
  assert.ok(metrics.wordCount > 15);
  assert.strictEqual(metrics.paragraphCount, 2);
  assert.ok(metrics.sentenceCount >= 2);
  assert.ok(typeof metrics.readabilityScore === "number");
  assert.ok(typeof metrics.readabilityLevel === "string");
});
