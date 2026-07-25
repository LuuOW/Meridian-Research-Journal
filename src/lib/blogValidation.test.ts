import { test } from "node:test";
import assert from "node:assert";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";

function validateBlogPostStructure(blog: Partial<BlogPost>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!blog.id || typeof blog.id !== "string" || blog.id.trim() === "") {
    errors.push("Missing or invalid id");
  }
  if (!blog.title || typeof blog.title !== "string" || blog.title.trim() === "") {
    errors.push("Missing or invalid title");
  }
  if (!blog.slug || typeof blog.slug !== "string" || !/^[a-z0-9-]+$/.test(blog.slug)) {
    errors.push("Missing or invalid slug format");
  }
  if (!blog.excerpt || typeof blog.excerpt !== "string") {
    errors.push("Missing excerpt");
  }
  if (!blog.content || typeof blog.content !== "string" || blog.content.length < 50) {
    errors.push("Content is missing or too short");
  }
  if (!Array.isArray(blog.tags) || blog.tags.length === 0) {
    errors.push("Tags must be a non-empty array");
  }

  return { valid: errors.length === 0, errors };
}

function checkLatexDelimiterBalance(markdownContent: string): boolean {
  // Remove fenced code blocks first
  const noCodeBlocks = markdownContent.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  // Remove escaped dollar signs \$
  const noEscapedDollars = noCodeBlocks.replace(/\\\$/g, "");

  // Count $$ occurrences
  const doubleDollarCount = (noEscapedDollars.match(/\$\$/g) || []).length;
  if (doubleDollarCount % 2 !== 0) return false;

  // Mask out $$ to count single $
  const masked = noEscapedDollars.replace(/\$\$/g, "");
  const singleDollarCount = (masked.match(/\$/g) || []).length;
  return singleDollarCount % 2 === 0;
}

function aggregateTagFrequencies(blogs: BlogPost[]): Record<string, number> {
  const freqs: Record<string, number> = {};
  for (const blog of blogs) {
    for (const tag of blog.tags) {
      freqs[tag] = (freqs[tag] || 0) + 1;
    }
  }
  return freqs;
}

function sortBlogsByTimestamp(blogs: BlogPost[]): BlogPost[] {
  return [...blogs].sort((a, b) => {
    const timeA = a.timestamp || new Date(a.date).getTime() || 0;
    const timeB = b.timestamp || new Date(b.date).getTime() || 0;
    return timeB - timeA; // Descending
  });
}

test("validateBlogPostStructure validates complete and incomplete blog posts", () => {
  const validSample: BlogPost = PRELOADED_BLOGS[0];
  const validation1 = validateBlogPostStructure(validSample);
  assert.strictEqual(validation1.valid, true);
  assert.strictEqual(validation1.errors.length, 0);

  const invalidSample: Partial<BlogPost> = {
    id: "",
    title: "   ",
    slug: "Invalid Slug!",
    content: "Too short",
    tags: []
  };
  const validation2 = validateBlogPostStructure(invalidSample);
  assert.strictEqual(validation2.valid, false);
  assert.ok(validation2.errors.length >= 4, "Should report multiple structural validation errors");
});

test("PRELOADED_BLOGS all pass LaTeX math delimiter balance check", () => {
  PRELOADED_BLOGS.forEach((blog) => {
    const isBalanced = checkLatexDelimiterBalance(blog.content);
    assert.strictEqual(
      isBalanced,
      true,
      `Blog '${blog.title}' (${blog.id}) has unbalanced LaTeX math delimiters`
    );
  });
});

test("aggregateTagFrequencies computes correct tag counts", () => {
  const sampleBlogs: BlogPost[] = [
    { ...PRELOADED_BLOGS[0], tags: ["Quantum", "Optics"] },
    { ...PRELOADED_BLOGS[0], id: "test-2", tags: ["Optics", "Algebra"] },
    { ...PRELOADED_BLOGS[0], id: "test-3", tags: ["Quantum", "Algebra", "Optics"] }
  ];

  const freqs = aggregateTagFrequencies(sampleBlogs);
  assert.strictEqual(freqs["Quantum"], 2);
  assert.strictEqual(freqs["Optics"], 3);
  assert.strictEqual(freqs["Algebra"], 2);
});

test("sortBlogsByTimestamp correctly orders articles newest first", () => {
  const sampleBlogs: BlogPost[] = [
    { ...PRELOADED_BLOGS[0], id: "old", timestamp: 1000000, date: "May 10, 2024" },
    { ...PRELOADED_BLOGS[0], id: "newest", timestamp: 3000000, date: "May 12, 2024" },
    { ...PRELOADED_BLOGS[0], id: "middle", timestamp: 2000000, date: "May 11, 2024" }
  ];

  const sorted = sortBlogsByTimestamp(sampleBlogs);
  assert.strictEqual(sorted[0].id, "newest");
  assert.strictEqual(sorted[1].id, "middle");
  assert.strictEqual(sorted[2].id, "old");
});
