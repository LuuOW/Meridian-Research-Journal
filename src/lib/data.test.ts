import { test } from "node:test";
import assert from "node:assert";
import { PRELOADED_BLOGS } from "../data";

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
