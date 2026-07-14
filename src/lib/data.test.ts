import { test } from "node:test";
import assert from "node:assert";
import { PRELOADED_BLOGS } from "../data";
import { extractArxivId } from "./arxivUtils";

test("PRELOADED_BLOGS contains valid articles", () => {
  assert.ok(Array.isArray(PRELOADED_BLOGS), "PRELOADED_BLOGS should be an array");
  assert.ok(PRELOADED_BLOGS.length > 0, "PRELOADED_BLOGS should have at least one element");
  
  const firstBlog = PRELOADED_BLOGS[0];
  assert.ok(firstBlog.id, "Each blog should have an id");
  assert.ok(firstBlog.title, "Each blog should have a title");
  assert.ok(firstBlog.slug, "Each blog should have a slug");
  assert.ok(firstBlog.content, "Each blog should have content");
  assert.ok(firstBlog.tags && firstBlog.tags.length > 0, "Each blog should have tags");
});

test("PRELOADED_BLOGS has no duplicate IDs or Slugs", () => {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const blog of PRELOADED_BLOGS) {
    assert.strictEqual(ids.has(blog.id), false, `Duplicate blog ID found: ${blog.id}`);
    assert.strictEqual(slugs.has(blog.slug), false, `Duplicate blog slug found: ${blog.slug}`);
    ids.add(blog.id);
    slugs.add(blog.slug);
  }
});

test("PRELOADED_BLOGS metadata is formatted properly", () => {
  for (const blog of PRELOADED_BLOGS) {
    assert.match(blog.readingTime, /^\d+ min read$/, `Reading time should match format like 'X min read': ${blog.readingTime}`);
    assert.ok(blog.tags.every(tag => tag.length > 0), "Tags should not contain empty strings");
  }
});

test("extractArxivId extracts correct paper IDs", () => {
  // Test standard abstract URL
  assert.strictEqual(
    extractArxivId("https://arxiv.org/abs/2403.12345"),
    "2403.12345",
    "Should extract ID from standard https abstract URL"
  );

  // Test pdf URL
  assert.strictEqual(
    extractArxivId("https://arxiv.org/pdf/2112.01234"),
    "2112.01234",
    "Should extract ID from standard pdf URL"
  );

  // Test case insensitivity and http
  assert.strictEqual(
    extractArxivId("http://ARXIV.org/abs/1904.5678"),
    "1904.5678",
    "Should extract ID from HTTP and uppercase URL"
  );

  // Test plain ID input
  assert.strictEqual(
    extractArxivId("2305.12345"),
    "2305.12345",
    "Should return plain ID as is"
  );

  // Test invalid URLs/IDs
  assert.strictEqual(
    extractArxivId("https://arxiv.org/abs/invalid-id"),
    null,
    "Should return null for non-numeric paper ID URL"
  );

  assert.strictEqual(
    extractArxivId("invalid-format"),
    null,
    "Should return null for plain invalid string"
  );

  assert.strictEqual(
    extractArxivId("https://google.com"),
    null,
    "Should return null for generic non-arxiv URLs"
  );
});

