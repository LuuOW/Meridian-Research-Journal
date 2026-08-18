import test from "node:test";
import assert from "node:assert";
import {
  countSyllables,
  calculateFleschKincaidScore,
  analyzeTextMetrics
} from "./readability.js";

test("countSyllables accurately counts syllables in complex scientific terms", () => {
  assert.strictEqual(countSyllables("quantum"), 2);
  assert.strictEqual(countSyllables("superconductivity"), 7);
  assert.strictEqual(countSyllables("spectroscopy"), 4);
  assert.strictEqual(countSyllables("interferometer"), 6);
  assert.strictEqual(countSyllables("photon"), 2);
  assert.strictEqual(countSyllables("the"), 1);
});

test("countSyllables returns 0 for empty or non-alphabetic inputs", () => {
  assert.strictEqual(countSyllables(""), 0);
  assert.strictEqual(countSyllables("12345"), 0);
  assert.strictEqual(countSyllables("$$$"), 0);
});

test("calculateFleschKincaidScore classifies dense scientific abstracts appropriately", () => {
  const academicPaper = `
    We investigate the non-equilibrium topological phase transitions in a two-dimensional
    honeycomb lattice driven by off-resonant circularly polarized optical fields. Utilizing
    Floquet-Magnus perturbation theory, we calculate the effective time-independent Hamiltonian
    and demonstrate that the dynamic breaking of time-reversal symmetry induces a non-zero
    Chern number, opening an energy gap at the Dirac points with quantized Hall conductance.
  `;
  const result = calculateFleschKincaidScore(academicPaper);

  assert.ok(result.score <= 50, `Dense academic paper score (${result.score}) should be college/academic level`);
  assert.ok(
    result.level.includes("Difficult") || result.level.includes("Academic") || result.level.includes("Dense"),
    `Grade level should be Academic/Difficult, got ${result.level}`
  );
});

test("calculateFleschKincaidScore strips LaTeX formulas before scoring", () => {
  const textWithFormulas = `
    The wave function evolves according to the Schrodinger equation:
    $$ i \\hbar \\frac{\\partial}{\\partial t} \\Psi(r,t) = \\hat{H} \\Psi(r,t) $$
    This provides the complete time evolution of the state vector.
  `;
  const result = calculateFleschKincaidScore(textWithFormulas);
  assert.ok(result.score > 0);
});

test("analyzeTextMetrics generates complete and consistent metrics", () => {
  const markdownArticle = `# Quantum Computing
This is the first introductory paragraph discussing quantum entanglement and superposition.

Here is the second paragraph analyzing decoherence times and error correction thresholds.`;

  const metrics = analyzeTextMetrics(markdownArticle);

  assert.ok(metrics.characterCount > 100);
  assert.ok(metrics.wordCount >= 20);
  assert.strictEqual(metrics.paragraphCount, 2);
  assert.ok(metrics.readabilityScore >= 0 && metrics.readabilityScore <= 100);
  assert.ok(typeof metrics.readabilityLevel === "string");
});

test("analyzeTextMetrics handles empty strings gracefully", () => {
  const metrics = analyzeTextMetrics("");
  assert.strictEqual(metrics.wordCount, 0);
  assert.strictEqual(metrics.characterCount, 0);
  assert.strictEqual(metrics.sentenceCount, 0);
  assert.strictEqual(metrics.paragraphCount, 0);
  assert.strictEqual(metrics.readabilityScore, 100);
  assert.strictEqual(metrics.readabilityLevel, "Very Easy");
});
