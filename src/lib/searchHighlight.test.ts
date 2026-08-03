import test from "node:test";
import assert from "node:assert";
import {
  highlightQueryMatches,
  generateSearchExcerpt,
  calculateQueryRelevanceScore
} from "./searchHighlight.js";

test("highlightQueryMatches marks matching search terms correctly", () => {
  const text = "Quantum computing uses quantum qubits.";
  const chunks = highlightQueryMatches(text, "quantum");

  assert.strictEqual(chunks.length, 4);
  assert.strictEqual(chunks[0].text, "Quantum");
  assert.strictEqual(chunks[0].match, true);
  assert.strictEqual(chunks[1].text, " computing uses ");
  assert.strictEqual(chunks[1].match, false);
  assert.strictEqual(chunks[2].text, "quantum");
  assert.strictEqual(chunks[2].match, true);
});

test("highlightQueryMatches returns single unmatched chunk for empty query", () => {
  const chunks = highlightQueryMatches("Hello World", "");
  assert.strictEqual(chunks.length, 1);
  assert.strictEqual(chunks[0].match, false);
});

test("generateSearchExcerpt centers around match location with ellipsis", () => {
  const text = "In this research article, we investigate silicon photonics for high-density optical interconnects in modern datacenters.";
  const excerpt = generateSearchExcerpt(text, "silicon photonics", 40);

  assert.ok(excerpt.includes("silicon photonics"));
  assert.ok(excerpt.startsWith("..."));
  assert.ok(excerpt.endsWith("..."));
});

test("generateSearchExcerpt handles non-matching queries gracefully", () => {
  const text = "Short article text.";
  const excerpt = generateSearchExcerpt(text, "nonexistent", 50);
  assert.strictEqual(excerpt, "Short article text.");
});

test("calculateQueryRelevanceScore weighs title match heavier than content match", () => {
  const titleScore = calculateQueryRelevanceScore("Quantum Mechanics", "Introductory optics.", "Quantum");
  const contentScore = calculateQueryRelevanceScore("Optics Overview", "Quantum quantum quantum physics.", "Quantum");

  assert.ok(titleScore >= 50);
  assert.ok(titleScore > contentScore);
});
