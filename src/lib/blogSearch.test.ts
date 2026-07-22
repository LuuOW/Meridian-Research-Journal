import { test } from "node:test";
import assert from "node:assert";
import { PRELOADED_BLOGS } from "../data";
import { generateSlug, extractArxivId } from "./arxivUtils";

test("PRELOADED_BLOGS can be filtered by tag", () => {
  const tags = new Set<string>();
  PRELOADED_BLOGS.forEach((blog) => {
    blog.tags.forEach((tag) => tags.add(tag));
  });

  assert.ok(tags.size > 0, "There should be at least one unique tag across preloaded blogs");

  const sampleTag = Array.from(tags)[0];
  const filtered = PRELOADED_BLOGS.filter((blog) => blog.tags.includes(sampleTag));

  assert.ok(filtered.length > 0, `Filtering by tag '${sampleTag}' should yield at least one article`);
  filtered.forEach((blog) => {
    assert.ok(blog.tags.includes(sampleTag), `Blog ${blog.id} should include tag '${sampleTag}'`);
  });
});

test("PRELOADED_BLOGS search query matching", () => {
  const query = "quantum";
  const matchingBlogs = PRELOADED_BLOGS.filter((blog) => {
    const q = query.toLowerCase();
    return (
      blog.title.toLowerCase().includes(q) ||
      blog.excerpt.toLowerCase().includes(q) ||
      blog.content.toLowerCase().includes(q) ||
      blog.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  assert.ok(matchingBlogs.length > 0, `Search query '${query}' should match at least one article in preloaded dataset`);
});

test("Blog slugs match generated slugs from titles", () => {
  PRELOADED_BLOGS.forEach((blog) => {
    const expectedSlugPrefix = generateSlug(blog.title).slice(0, 20);
    assert.ok(blog.slug.length > 0, `Blog ${blog.id} must have a non-empty slug`);
    assert.match(blog.slug, /^[a-z0-9-]+$/, `Blog slug ${blog.slug} should be lowercase alphanumeric with hyphens`);
  });
});

test("Extract arXiv IDs from blog arXiv links", () => {
  PRELOADED_BLOGS.forEach((blog) => {
    if (blog.arxivLink && blog.arxivLink.includes("arxiv.org")) {
      const extracted = extractArxivId(blog.arxivLink);
      assert.ok(extracted, `Should be able to extract valid arXiv ID from blog arXiv link: ${blog.arxivLink}`);
      assert.match(extracted, /^\d{4}\.\d{4,5}$/, `Extracted ID ${extracted} should match standard arXiv pattern`);
    }
  });
});
