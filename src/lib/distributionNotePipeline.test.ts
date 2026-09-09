import { test } from "node:test";
import assert from "node:assert";
import {
  stripAllEmojis,
  cleanTextForDistributionNote,
  draftDistributionNote,
  validateAndSanitizeDistributionNote
} from "./distributionNotePipeline";

test("stripAllEmojis eliminates emojis from text", () => {
  const textWithEmoji = "🔬 Breakthrough in Quantum Systems! 🚀 Amazing discovery ⚛️.";
  const stripped = stripAllEmojis(textWithEmoji);
  assert.strictEqual(stripped, "Breakthrough in Quantum Systems! Amazing discovery.");
  assert.strictEqual(stripAllEmojis("No emojis here."), "No emojis here.");
});

test("cleanTextForDistributionNote converts LaTeX math and strips emojis", () => {
  const input = "🔬 New results for $\\mathsf{QAC}^0$ with $\\mathtt{PARITY}_n$ circuits! 🚀";
  const cleaned = cleanTextForDistributionNote(input);
  assert.ok(!cleaned.includes("🔬"));
  assert.ok(!cleaned.includes("🚀"));
  assert.ok(cleaned.includes("QAC⁰"));
  assert.ok(cleaned.includes("PARITYₙ"));
});

test("draftDistributionNote generates human-readable, emoji-free, concise distribution note", () => {
  const result = draftDistributionNote({
    title: "Fanout Complexity of Symmetric Boolean Functions in $\\mathsf{QAC}^0$",
    excerpt: "Autonomous analysis of arXiv:2609.05153v1: Whether QAC⁰ can compute PARITYₙ.",
    tags: ["Optics", "Photonics", "Quantum Systems"],
    blogId: "2609-05153v1-8804"
  });

  // Zero emojis
  const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
  assert.strictEqual(emojiRegex.test(result.noteText), false, "Distribution note must have zero emojis");

  // Zero raw LaTeX syntax
  assert.ok(!result.noteText.includes("\\mathsf"), "Must not contain raw LaTeX \\mathsf");
  assert.ok(!result.noteText.includes("\\mathtt"), "Must not contain raw LaTeX \\mathtt");
  assert.ok(!result.noteText.includes("$\\"), "Must not contain raw math delimiters");

  // Reduced length: 3 sentences format
  assert.ok(result.sentenceCount <= 3, `Sentence count should be <= 3, was ${result.sentenceCount}`);
  assert.ok(result.wordCount <= 65, `Word count should be concise (<= 65 words), was ${result.wordCount}`);

  // Canonical Ask Meridian URL present
  assert.ok(result.canonicalUrl.includes("ask-meridian.uk"));
  assert.ok(result.noteText.includes("https://ask-meridian.uk"));
});

test("draftDistributionNote strictly complies with 3-sentence requirement and human-readable Unicode for user paper arXiv:2609.05153v1", () => {
  const result = draftDistributionNote({
    title: "Fanout Complexity of Symmetric Boolean Functions in $\\mathsf{QAC}^0$",
    excerpt: "Autonomous scholarly analysis of arXiv:2609.05153v1: Whether $\\mathsf{QAC}^0$ can compute $\\mathtt{PARITY}_n$ remains open.",
    tags: ["Quantum Computing", "Boolean Functions"],
    blogId: "2609-05153v1-test"
  });

  // Check exact 3 sentences
  assert.strictEqual(result.sentenceCount, 3, "Draft must be exactly 3 sentences in length");

  // Check no emojis
  const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
  assert.strictEqual(emojiRegex.test(result.noteText), false);

  // Check QAC⁰ and PARITYₙ are cleanly rendered in Unicode
  assert.ok(result.noteText.includes("QAC⁰"), "Must render QAC⁰ cleanly in human-readable Unicode");
  assert.ok(result.noteText.includes("PARITYₙ"), "Must render PARITYₙ cleanly in human-readable Unicode");
  assert.ok(!result.noteText.includes("\\mathsf"), "Must have no raw LaTeX");
  assert.ok(!result.noteText.includes("\\mathtt"), "Must have no raw LaTeX");
});

test("validateAndSanitizeDistributionNote verification pipeline ensures pristine output", () => {
  // Input containing emoji and raw LaTeX
  const dirtyNote = "Breakthrough in $\\mathsf{QAC}^0$: new bounds derived. 🔬 Solves major question. Read: https://ask-meridian.uk/blog/123\n\n#Optics #AskMeridian";
  const validation = validateAndSanitizeDistributionNote(dirtyNote);

  // Verification detected errors
  assert.strictEqual(validation.hasEmoji, true);
  assert.strictEqual(validation.hasRawLatex, true);

  // Pipeline sanitized the output
  assert.ok(!validation.sanitizedText.includes("🔬"));
  assert.ok(!validation.sanitizedText.includes("$\\mathsf"));
  assert.ok(validation.sanitizedText.includes("QAC⁰"));
});
