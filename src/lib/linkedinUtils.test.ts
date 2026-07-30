import { test } from "node:test";
import assert from "node:assert";
import {
  buildLinkedInSystemInstruction,
  buildLinkedInUserPrompt,
  sanitizeHashtags,
  generateFallbackLinkedInPost
} from "./linkedinUtils";

test("buildLinkedInSystemInstruction incorporates blog URL and required tone rules", () => {
  const blogUrl = "https://meridian-research.org/blog/photonic-crystal-123";
  const instruction = buildLinkedInSystemInstruction(blogUrl);

  assert.ok(instruction.includes("Ask Meridian"), "Instruction should mention Ask Meridian");
  assert.ok(instruction.includes(blogUrl), "Instruction should embed target blog URL");
  assert.ok(instruction.includes("technical"), "Instruction should outline technical tone");
  assert.ok(instruction.includes("executive"), "Instruction should outline executive tone");
  assert.ok(instruction.includes("future"), "Instruction should outline future vision tone");
  assert.ok(instruction.includes("punchy"), "Instruction should outline punchy tone");
});

test("buildLinkedInUserPrompt formats input fields and truncates long content snippets", () => {
  const longContent = "A".repeat(3000);
  const prompt = buildLinkedInUserPrompt({
    title: "Quantum Metasurface Nanophotonics",
    excerpt: "Breakthrough inverse design method for optical switches.",
    content: longContent,
    tags: ["Quantum", "Optics"],
    tone: "executive",
    customPrompt: "Emphasize high bandwidth metrics"
  });

  assert.ok(prompt.includes("Article Title: \"Quantum Metasurface Nanophotonics\""));
  assert.ok(prompt.includes("Article Summary: \"Breakthrough inverse design method for optical switches.\""));
  assert.ok(prompt.includes("Tags: Quantum, Optics"));
  assert.ok(prompt.includes("Target Tone: executive"));
  assert.ok(prompt.includes("Special User Instruction: \"Emphasize high bandwidth metrics\""));

  // Check content snippet length truncation at 1500 chars
  const snippetMatch = prompt.match(/Full\/Partial Article Content snippet:\n"([^"]*)"/);
  assert.ok(snippetMatch, "Prompt should contain content snippet wrapper");
  if (snippetMatch) {
    assert.strictEqual(snippetMatch[1].length, 1500, "Content snippet should be truncated to 1500 characters");
  }
});

test("sanitizeHashtags ensures proper formatting and leading hash symbol", () => {
  const rawTags = ["Optics", "#QuantumPhysics", "Silicon Photonics!", "  #Nanotech  "];
  const clean = sanitizeHashtags(rawTags);

  assert.deepStrictEqual(clean, ["#Optics", "#QuantumPhysics", "#SiliconPhotonics", "#Nanotech"]);

  // Test fallback for empty array
  const emptyResult = sanitizeHashtags([] as string[]);
  assert.ok(emptyResult.length > 0, "Should handle empty array gracefully");
});

test("generateFallbackLinkedInPost returns structured fallback response", () => {
  const fallback = generateFallbackLinkedInPost({
    title: "Integrated Photonic Quantum Memories",
    excerpt: "Demonstrating high-coherence optical storage in silicon carbide.",
    blogUrl: "https://meridian-research.org/blog/memory-789"
  });

  assert.strictEqual(fallback.success, true);
  assert.strictEqual(fallback.tone, "fallback");
  assert.ok(fallback.headline.includes("Integrated Photonic Quantum Memories"));
  assert.ok(fallback.postText.includes("Demonstrating high-coherence optical storage"));
  assert.ok(fallback.postText.includes("https://meridian-research.org/blog/memory-789"));
  assert.ok(fallback.hashtags.includes("#Optics"));
});
