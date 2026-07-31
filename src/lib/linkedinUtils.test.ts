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

test("generateFallbackLinkedInPost handles short title and custom excerpt", () => {
  const shortTitle = "Photonic Crystal Fibers";
  const customExcerpt = "A novel hollow-core fiber structure for high-power laser delivery.";
  const fallback = generateFallbackLinkedInPost({
    title: shortTitle,
    excerpt: customExcerpt,
    blogUrl: "https://meridian-research.org/blog/pcf-1"
  });

  assert.strictEqual(fallback.success, true);
  assert.strictEqual(fallback.headline, "Research Highlight: Photonic Crystal Fibers");
  assert.ok(!fallback.headline.includes("..."), "Short title should not be truncated with ellipsis");
  assert.ok(fallback.postText.includes(customExcerpt), "Fallback post should include the custom excerpt");
});

test("sanitizeHashtags handles non-array input gracefully", () => {
  const invalidInput = null as unknown as string[];
  const fallbackTags = sanitizeHashtags(invalidInput);

  assert.deepStrictEqual(fallbackTags, ["#Optics", "#QuantumPhysics", "#SiliconPhotonics"]);
});

test("buildLinkedInSystemInstruction includes all 5 required post structure sections", () => {
  const instruction = buildLinkedInSystemInstruction("https://example.com");

  assert.ok(instruction.includes("1. Hook:"), "Instruction must require Hook section");
  assert.ok(instruction.includes("2. Key Takeaways:"), "Instruction must require Key Takeaways section");
  assert.ok(instruction.includes("3. Why It Matters:"), "Instruction must require Why It Matters section");
  assert.ok(instruction.includes("4. Call to Action:"), "Instruction must require Call to Action section");
  assert.ok(instruction.includes("5. Hashtags:"), "Instruction must require Hashtags section");
});
