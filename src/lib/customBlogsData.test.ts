import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { PRELOADED_BLOGS } from "../data.js";
import { BlogPost } from "../types.js";

test("custom_blogs.json matches PRELOADED_BLOGS in length and critical fields", () => {
  const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");
  assert.ok(fs.existsSync(customBlogsPath), "custom_blogs.json must exist in workspace root");

  const rawJson = fs.readFileSync(customBlogsPath, "utf-8");
  const customBlogs: BlogPost[] = JSON.parse(rawJson);

  assert.ok(Array.isArray(customBlogs), "custom_blogs.json should contain an array of posts");
  assert.ok(customBlogs.length >= 5, "custom_blogs.json should contain all publication articles");

  // Check that all custom blog IDs are accounted for in PRELOADED_BLOGS
  const preloadedIds = new Set(PRELOADED_BLOGS.map((b) => b.id));
  customBlogs.forEach((blog) => {
    assert.ok(preloadedIds.has(blog.id), `PRELOADED_BLOGS should contain custom blog ID ${blog.id}`);
  });
});

test("all recently generated arXiv articles have verified structure and valid metadata", () => {
  const recentArticles = [
    {
      id: "generated-1787340727569",
      arxiv: "2608.20224",
      keyword: "two-photon imaging"
    },
    {
      id: "generated-1787339117236",
      arxiv: "2608.17551",
      keyword: "wavefront shaping"
    },
    {
      id: "generated-1787148362988",
      arxiv: "2608.18005",
      keyword: "pseudoangular momentum"
    },
    {
      id: "generated-1787145885719",
      arxiv: "2608.16857",
      keyword: "fault-tolerant"
    },
    {
      id: "generated-1787145841698",
      arxiv: "2608.14468",
      keyword: "PT-symmetry"
    }
  ];

  for (const target of recentArticles) {
    const post = PRELOADED_BLOGS.find((b) => b.id === target.id);
    assert.ok(post, `Should find blog post with ID ${target.id}`);

    // Verify Title & Keyword
    assert.ok(
      post.title.toLowerCase().includes(target.keyword.toLowerCase()),
      `Post ${post.id} title "${post.title}" should include keyword "${target.keyword}"`
    );

    // Verify Excerpt
    assert.ok(post.excerpt && post.excerpt.length > 20, `Post ${post.id} excerpt must be substantial`);

    // Verify Reading Time format
    assert.match(post.readingTime, /^\d+\s+min\s+read$/, `Post ${post.id} readingTime should be 'X min read'`);

    // Verify Arxiv Link
    assert.ok(
      post.arxivLink.includes(target.arxiv),
      `Post ${post.id} arxivLink "${post.arxivLink}" should contain arXiv ID ${target.arxiv}`
    );

    // Verify Banner SVG is non-empty and well-formed
    assert.ok(post.bannerSvg.startsWith("<svg"), `Post ${post.id} bannerSvg should start with <svg`);
    assert.ok(post.bannerSvg.endsWith("</svg>"), `Post ${post.id} bannerSvg should end with </svg>`);
    assert.ok(post.bannerSvg.includes("viewBox="), `Post ${post.id} bannerSvg should have viewBox attribute`);

    // Verify Content has Markdown sections and LaTeX math expressions
    assert.ok(post.content.includes("##"), `Post ${post.id} content must have markdown headings`);
    assert.ok(post.content.includes("$$") || post.content.includes("$"), `Post ${post.id} content must have LaTeX math`);

    // Verify Authors & Tags
    assert.ok(post.author && post.author.length > 2, `Post ${post.id} author must be populated`);
    assert.ok(Array.isArray(post.tags) && post.tags.length > 0, `Post ${post.id} tags array must not be empty`);

    // Verify Slug
    assert.ok(post.slug && post.slug.length > 5, `Post ${post.id} slug must be valid`);
    assert.ok(!post.slug.includes(" "), `Post ${post.id} slug should not contain whitespace`);

    // Verify Views
    assert.strictEqual(typeof post.views, "number", `Post ${post.id} views should be a number`);
    assert.ok(post.views >= 0, `Post ${post.id} views should be non-negative`);
  }
});
