import { test } from "node:test";
import assert from "node:assert";
import {
  buildLinkedInSystemInstruction,
  buildLinkedInUserPrompt,
  sanitizeHashtags,
  generateFallbackLinkedInPost,
  countSentences,
  isWithinSentenceLimit
} from "./linkedinUtils";

test("countSentences accurately measures sentence count excluding URLs and hashtags", () => {
  const sample = "🔬 Hot Off the Press on Meridian: 'Quantum Metasurfaces'. New theoretical insights in quantum optics. Read the breakdown: https://example.com #Optics #Quantum";
  const sentences = countSentences(sample);
  assert.strictEqual(sentences, 3);
  assert.strictEqual(countSentences(""), 0);
  assert.strictEqual(countSentences(null as unknown as string), 0);
});

test("isWithinSentenceLimit confirms post text is <= 5 sentences", () => {
  const shortPost = "First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.";
  const longPost = "First. Second. Third. Fourth. Fifth. Sixth sentence exceeds limit.";

  assert.strictEqual(isWithinSentenceLimit(shortPost, 5), true);
  assert.strictEqual(isWithinSentenceLimit(longPost, 5), false);
});

test("buildLinkedInSystemInstruction incorporates blog URL, tone rules, and 5-sentence constraint", () => {
  const blogUrl = "https://meridian-research.org/blog/photonic-crystal-123";
  const instruction = buildLinkedInSystemInstruction(blogUrl);

  assert.ok(instruction.includes("Ask Meridian"), "Instruction should mention Ask Meridian");
  assert.ok(instruction.includes(blogUrl), "Instruction should embed target blog URL");
  assert.ok(instruction.includes("5 SENTENCES"), "Instruction should explicitly enforce 5 sentences limit");
  assert.ok(instruction.includes("technical"), "Instruction should outline technical tone");
  assert.ok(instruction.includes("executive"), "Instruction should outline executive tone");
  assert.ok(instruction.includes("future"), "Instruction should outline future vision tone");
  assert.ok(instruction.includes("punchy"), "Instruction should outline punchy tone");
});

test("generateFallbackLinkedInPost produces post text strictly <= 5 sentences", () => {
  const fallback = generateFallbackLinkedInPost({
    title: "High Precision Quantum Sensing",
    excerpt: "Measuring weak magnetic fields using nitrogen-vacancy centers in diamond.",
    blogUrl: "https://meridian-research.org/blog/quantum-sensing"
  });

  assert.strictEqual(fallback.success, true);
  assert.ok(isWithinSentenceLimit(fallback.postText, 5), "Fallback post text must be 5 sentences or fewer");
});

test("buildLinkedInUserPrompt includes 5-sentence strict requirement prompt constraint", () => {
  const prompt = buildLinkedInUserPrompt({
    title: "Quantum Metasurface Nanophotonics",
    excerpt: "Breakthrough inverse design method for optical switches.",
    content: "Content snippet here...",
    tags: ["Quantum", "Optics"],
    tone: "executive",
    customPrompt: "Emphasize high bandwidth metrics"
  });

  assert.ok(prompt.includes("Article Title: \"Quantum Metasurface Nanophotonics\""));
  assert.ok(prompt.includes("STRICT REQUIREMENT: The LinkedIn companion post MUST be no longer than 5 sentences in length."));
  assert.ok(prompt.includes("Target Tone: executive"));
});

test("sanitizeHashtags ensures proper formatting and leading hash symbol", () => {
  const rawTags = ["Optics", "#QuantumPhysics", "Silicon Photonics!", "  #Nanotech  "];
  const clean = sanitizeHashtags(rawTags);

  assert.deepStrictEqual(clean, ["#Optics", "#QuantumPhysics", "#SiliconPhotonics", "#Nanotech"]);

  // Test fallback for empty array
  const emptyResult = sanitizeHashtags([] as string[]);
  assert.ok(emptyResult.length > 0, "Should handle empty array gracefully");
});

test("buildLinkedInUserPrompt handles missing optional parameters with sensible defaults", () => {
  const prompt = buildLinkedInUserPrompt({
    title: "Minimal Title Article"
  });

  assert.ok(prompt.includes("Article Title: \"Minimal Title Article\""));
  assert.ok(prompt.includes("Article Summary: \"\""));
  assert.ok(prompt.includes("Target Tone: technical"));
  assert.ok(!prompt.includes("Special User Instruction:"));
});

test("generateFallbackLinkedInPost truncates long titles appropriately", () => {
  const veryLongTitle = "Quantum Entanglement in Microcavity Arrays with Extremely Long Title That Exceeds Eighty Characters Limit";
  const fallback = generateFallbackLinkedInPost({
    title: veryLongTitle,
    blogUrl: "https://meridian-research.org/blog/long-title"
  });

  assert.ok(fallback.headline.includes("..."), "Fallback headline should contain truncation ellipsis");
  assert.ok(fallback.postText.includes("New theoretical and experimental insights"), "Fallback should supply default excerpt when missing");
});

test("sanitizeHashtags handles non-array input gracefully", () => {
  const invalidInput = null as unknown as string[];
  const fallbackTags = sanitizeHashtags(invalidInput);

  assert.deepStrictEqual(fallbackTags, ["#Optics", "#QuantumPhysics", "#SiliconPhotonics"]);
});

