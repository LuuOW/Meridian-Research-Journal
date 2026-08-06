import test from "node:test";
import assert from "node:assert";
import {
  getWordFrequencyMap,
  calculateVocabularyDensity,
  calculateParagraphMetrics,
  extractKeyPhrases
} from "./articleStatistics.js";

test("getWordFrequencyMap extracts top word frequencies and ignores stop words", () => {
  const sample = "Quantum optics is a field of quantum mechanics. Quantum physics uses photon waveguides and quantum states.";
  const frequencies = getWordFrequencyMap(sample, 3);

  assert.strictEqual(frequencies.length, 3);
  assert.strictEqual(frequencies[0].word, "quantum");
  assert.strictEqual(frequencies[0].count, 4);
});

test("getWordFrequencyMap handles empty strings and default limit gracefully", () => {
  assert.deepStrictEqual(getWordFrequencyMap(""), []);
  assert.deepStrictEqual(getWordFrequencyMap(null as unknown as string), []);

  const text = "Alpha beta gamma delta epsilon alpha beta gamma alpha beta alpha";
  const result = getWordFrequencyMap(text);
  assert.strictEqual(result[0].word, "alpha");
  assert.strictEqual(result[0].count, 4);
});

test("calculateVocabularyDensity measures Type-Token Ratio correctly", () => {
  // 5 unique words out of 5 total words = 100.0%
  const uniqueText = "Quantum mechanics explores atomic photons";
  assert.strictEqual(calculateVocabularyDensity(uniqueText), 100);

  // 1 unique word repeated 4 times = 25.0%
  const repeatedText = "Quantum quantum quantum quantum";
  assert.strictEqual(calculateVocabularyDensity(repeatedText), 25);

  // Empty string
  assert.strictEqual(calculateVocabularyDensity(""), 0);
});

test("calculateParagraphMetrics accurately calculates structural dimensions", () => {
  const text = `Paragraph one has six simple words. Second sentence in paragraph one.

Paragraph two contains additional detail on photon scattering and entanglement.`;

  const metrics = calculateParagraphMetrics(text);

  assert.strictEqual(metrics.paragraphCount, 2);
  assert.ok(metrics.avgWordsPerParagraph > 0);
  assert.ok(metrics.avgWordsPerSentence > 0);
});

test("calculateParagraphMetrics handles empty text", () => {
  const emptyMetrics = calculateParagraphMetrics("");
  assert.strictEqual(emptyMetrics.paragraphCount, 0);
  assert.strictEqual(emptyMetrics.avgWordsPerParagraph, 0);
  assert.strictEqual(emptyMetrics.avgWordsPerSentence, 0);
});

test("extractKeyPhrases extracts non-stop word bigrams correctly", () => {
  const text = "Quantum optics studies quantum optics in silicon photonics chips with quantum optics and silicon photonics.";
  const keyPhrases = extractKeyPhrases(text, 2);

  assert.strictEqual(keyPhrases[0], "quantum optics");
  assert.strictEqual(keyPhrases[1], "silicon photonics");
});

test("extractKeyPhrases returns empty array for empty or short input", () => {
  assert.deepStrictEqual(extractKeyPhrases(""), []);
  assert.deepStrictEqual(extractKeyPhrases("the and of"), []);
});
