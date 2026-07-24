import { test } from "node:test";
import assert from "node:assert";
import { generateSlug, cleanJsonText } from "./arxivUtils";

function calculateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function sanitizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 30)
    )
  );
}

function formatBlogTitle(title: string, triggerId?: number): string {
  const cleanTitle = title.trim().replace(/\s+/g, " ");
  if (!cleanTitle) {
    return "Untitled Research Article";
  }
  return cleanTitle;
}

test("calculateReadingTime calculates correct reading time based on word count", () => {
  const shortText = "This is a brief article abstract.";
  assert.strictEqual(calculateReadingTime(shortText), "1 min read");

  const longText = Array(500).fill("scientific").join(" ");
  assert.strictEqual(calculateReadingTime(longText), "3 min read");
});

test("sanitizeTags removes duplicates, empty strings, and trims whitespace", () => {
  const rawTags = [" Quantum ", "Quantum", "", "   ", "Optics", "Superconductors", "Optics"];
  const cleaned = sanitizeTags(rawTags);
  assert.deepStrictEqual(cleaned, ["Quantum", "Optics", "Superconductors"]);
});

test("formatBlogTitle sanitizes title string and falls back if empty", () => {
  assert.strictEqual(formatBlogTitle("   Quantum   Coherence   "), "Quantum Coherence");
  assert.strictEqual(formatBlogTitle("   "), "Untitled Research Article");
});

test("generateSlug produces unique URL-safe slugs for dynamic titles", () => {
  const title1 = "Quantum State Tomography via Machine Learning!";
  const title2 = "Quantum State Tomography: A Machine Learning Approach";

  const slug1 = generateSlug(title1);
  const slug2 = generateSlug(title2);

  assert.match(slug1, /^[a-z0-9-]+$/);
  assert.match(slug2, /^[a-z0-9-]+$/);
  assert.notStrictEqual(slug1, slug2, "Different paper titles should produce distinct slugs");
});

test("cleanJsonText handles embedded JSON blocks inside markdown code blocks", () => {
  const rawLlmOutput = "```json\n{\n  \"title\": \"Quantum Optics\",\n  \"content\": \"Math $E=mc^2$\"\n}\n```";
  const cleaned = cleanJsonText(rawLlmOutput);
  const parsed = JSON.parse(cleaned);

  assert.strictEqual(parsed.title, "Quantum Optics");
  assert.strictEqual(parsed.content, "Math $E=mc^2$");
});
