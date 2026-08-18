import test from "node:test";
import assert from "node:assert";
import {
  getSpeechScript,
  getSentences,
  formatAudioTime,
  estimateSpeechDuration
} from "./audioUtils.js";

test("getSpeechScript generates clear audio script with title and publisher", () => {
  const content = `## Section 1
We examine the Hamiltonian:
$$ \\hat{H} = \\hbar \\omega \\left( a^\\dagger a + \\frac{1}{2} \\right) $$
The inline energy is $E = h\\nu$. This yields high coherence.`;

  const script = getSpeechScript(content, "Quantum Oscillation");

  assert.ok(script.startsWith("Listening to: Quantum Oscillation. Published by Meridian Research."));
  assert.ok(script.includes("equation mathematical formula"));
  assert.ok(!script.includes("$$"));
  assert.ok(script.includes("Section 1."));
  assert.ok(!script.includes("##"));
});

test("getSpeechScript cleanly strips bold, italic, lists, and horizontal rules", () => {
  const md = `---
**Key findings:**
* *First*, photon entanglement was observed.
* *Second*, teleportation fidelity exceeded 99%.
---`;

  const script = getSpeechScript(md, "Teleportation");
  assert.ok(!script.includes("**"));
  assert.ok(!script.includes("*"));
  assert.ok(!script.includes("---"));
  assert.ok(script.includes("First, photon entanglement was observed."));
});

test("getSentences parses text into clean sentence segments", () => {
  const text = "Quantum state tomography was performed. The density matrix is positive semi-definite! Did the fidelity exceed 99%? Yes, it did.";
  const sentences = getSentences(text);

  assert.strictEqual(sentences.length, 4);
  assert.strictEqual(sentences[0], "Quantum state tomography was performed.");
  assert.strictEqual(sentences[1], "The density matrix is positive semi-definite!");
  assert.strictEqual(sentences[2], "Did the fidelity exceed 99%?");
  assert.strictEqual(sentences[3], "Yes, it did.");
});

test("getSentences handles multiline text, trailing punctuation, and whitespace gracefully", () => {
  assert.deepStrictEqual(getSentences(""), []);
  assert.deepStrictEqual(getSentences("   \n\n  "), []);

  const multiline = `First sentence here.
Second sentence follows.
Third one!`;

  const sentences = getSentences(multiline);
  assert.strictEqual(sentences.length, 3);
});

test("formatAudioTime accurately formats durations into MM:SS format", () => {
  assert.strictEqual(formatAudioTime(0), "0:00");
  assert.strictEqual(formatAudioTime(5), "0:05");
  assert.strictEqual(formatAudioTime(59), "0:59");
  assert.strictEqual(formatAudioTime(60), "1:00");
  assert.strictEqual(formatAudioTime(65), "1:05");
  assert.strictEqual(formatAudioTime(600), "10:00");
  assert.strictEqual(formatAudioTime(3665), "61:05");
  assert.strictEqual(formatAudioTime(-10), "0:00");
  assert.strictEqual(formatAudioTime(NaN), "0:00");
});

test("estimateSpeechDuration calculates duration across various speed multipliers", () => {
  // 150 words at 1.0x speed = 60 seconds
  assert.strictEqual(estimateSpeechDuration(150, 1.0), 60);

  // 150 words at 2.0x speed = 30 seconds
  assert.strictEqual(estimateSpeechDuration(150, 2.0), 30);

  // 150 words at 0.5x speed = 120 seconds
  assert.strictEqual(estimateSpeechDuration(150, 0.5), 120);

  // 300 words at 1.5x speed = 80 seconds
  assert.strictEqual(estimateSpeechDuration(300, 1.5), 80);

  // Edge cases
  assert.strictEqual(estimateSpeechDuration(0, 1.0), 0);
  assert.strictEqual(estimateSpeechDuration(-50, 1.0), 0);
  assert.strictEqual(estimateSpeechDuration(100, 0), 0);
  assert.strictEqual(estimateSpeechDuration(100, -1), 0);
});
