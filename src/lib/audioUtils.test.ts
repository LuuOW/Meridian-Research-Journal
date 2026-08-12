import { test } from "node:test";
import assert from "node:assert";
import { getSpeechScript, getSentences, formatAudioTime, estimateSpeechDuration } from "./audioUtils";

test("getSpeechScript strips markdown, headers, LaTeX, and backslashes for speech engine", () => {
  const content = `## Introduction\nIn this paper on $\\psi$-states, we show that $a = b$.\n\n$$\\int_0^1 f(x) dx = 1$$\n\n- Key result: *bold statement* [reference].`;
  const title = "Quantum Topological States";

  const script = getSpeechScript(content, title);
  
  assert.ok(script.includes("Listening to: Quantum Topological States"), "Script should start with header");
  assert.ok(!script.includes("##"), "Should strip markdown headers");
  assert.ok(!script.includes("$$"), "Should replace display equations");
  assert.ok(script.includes("equation mathematical formula"), "Should insert equation substitute label");
  assert.ok(!script.includes("*bold statement*"), "Should strip markdown asterisks");
});

test("getSentences splits text into clean non-empty sentence chunks", () => {
  const text = "First sentence! Second sentence? Third sentence.\nFourth line sentence.";
  const sentences = getSentences(text);

  assert.strictEqual(sentences.length, 4, "Should split into 4 distinct sentences");
  assert.strictEqual(sentences[0], "First sentence!");
  assert.strictEqual(sentences[1], "Second sentence?");
  assert.strictEqual(sentences[2], "Third sentence.");
  assert.strictEqual(sentences[3], "Fourth line sentence.");
});

test("formatAudioTime formats seconds into clean m:ss display", () => {
  assert.strictEqual(formatAudioTime(0), "0:00");
  assert.strictEqual(formatAudioTime(5), "0:05");
  assert.strictEqual(formatAudioTime(65), "1:05");
  assert.strictEqual(formatAudioTime(125), "2:05");
  assert.strictEqual(formatAudioTime(3600), "60:00", "3600 seconds should format to 60:00");
  assert.strictEqual(formatAudioTime(-10), "0:00");
  assert.strictEqual(formatAudioTime(NaN), "0:00");
});

test("estimateSpeechDuration handles boundary conditions and non-positive speed multipliers", () => {
  assert.strictEqual(estimateSpeechDuration(150, 1.0), 60);
  assert.strictEqual(estimateSpeechDuration(150, 2.0), 30);
  assert.strictEqual(estimateSpeechDuration(300, 1.5), 80);
  assert.strictEqual(estimateSpeechDuration(0, 1.0), 0);
  assert.strictEqual(estimateSpeechDuration(-100, 1.0), 0);
  assert.strictEqual(estimateSpeechDuration(150, 0), 0);
  assert.strictEqual(estimateSpeechDuration(150, -1.0), 0);
});

test("getSentences ignores single-character noise and empty strings", () => {
  assert.deepStrictEqual(getSentences(""), []);
  const sentences = getSentences("Hello world. a. b. Good day.");
  assert.strictEqual(sentences.length, 2);
  assert.strictEqual(sentences[0], "Hello world.");
  assert.strictEqual(sentences[1], "Good day.");
});
