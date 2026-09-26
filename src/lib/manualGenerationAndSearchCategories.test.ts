import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { extractArxivId } from "./arxivUtils";
import { checkArticleBlocked } from "./arxivBlocklist";
import { BlogPost } from "../types";

describe("Search Categories Removal & Manual Generation Resilience Suite", () => {
  const searchFilterBarPath = path.join(process.cwd(), "src", "components", "SearchFilterBar.tsx");
  const serverPath = path.join(process.cwd(), "server.ts");
  const appPath = path.join(process.cwd(), "src", "App.tsx");
  const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");

  test("SearchFilterBar: Category/topic filter pills have been completely removed from UI", () => {
    const searchFilterBarSrc = fs.readFileSync(searchFilterBarPath, "utf-8");

    // Must not render "All Topics" button
    assert.ok(!searchFilterBarSrc.includes("All Topics"), "SearchFilterBar must not contain 'All Topics' button");

    // Must not render tag filter buttons
    assert.ok(!searchFilterBarSrc.includes("Scrollable Topic Filter Tags"), "SearchFilterBar must not have topic filter tags section");
    assert.ok(!searchFilterBarSrc.includes("allTags.map"), "SearchFilterBar must not iterate allTags to render pills");

    // Must have clean, full-width search container
    assert.ok(searchFilterBarSrc.includes("relative w-full"), "SearchFilterBar must use full-width input container");
    assert.ok(searchFilterBarSrc.includes("Search publications by keyword"), "Search input placeholder must be present");
  });

  test("Server API: /api/blog/generate accepts default 'meridian' password alongside environment password", () => {
    const serverSrc = fs.readFileSync(serverPath, "utf-8");

    // Find /api/blog/generate handler
    const genIndex = serverSrc.indexOf('app.post("/api/blog/generate"');
    assert.ok(genIndex !== -1, "/api/blog/generate must exist in server.ts");

    const genSnippet = serverSrc.slice(genIndex, genIndex + 600);
    assert.ok(
      genSnippet.includes('password !== "meridian"'),
      "generate endpoint must accept 'meridian' default password alongside expectedPassword"
    );
  });

  test("App.tsx: Immediately activates generated article upon manual/async completion", () => {
    const appSrc = fs.readFileSync(appPath, "utf-8");

    const funcStart = appSrc.indexOf("const handleStartAsyncGeneration");
    assert.ok(funcStart !== -1, "handleStartAsyncGeneration must exist in App.tsx");

    const funcSnippet = appSrc.slice(funcStart, funcStart + 3500);
    assert.ok(funcSnippet.includes("setActiveBlog(data.blog)"), "Must set newly generated blog as activeBlog immediately");
    assert.ok(funcSnippet.includes("handleBlogGenerated(data.blog)"), "Must persist newly generated blog");
  });

  test("Black hole article generated yesterday is present, valid, and resolvable in database", () => {
    const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(customBlogsPath, "utf-8"));
    const blackHoleArticle = customBlogs.find(
      (b) => b.id === "generated-1790281414849" || b.title?.toLowerCase().includes("black hole")
    );

    assert.ok(blackHoleArticle, "Black hole article generated yesterday must exist in custom_blogs.json");
    assert.ok(blackHoleArticle?.title.includes("black hole thermodynamics"), "Article title must match black hole thermodynamics");
    assert.ok(blackHoleArticle?.content && blackHoleArticle.content.length > 500, "Article content must be substantial");
    assert.ok(blackHoleArticle?.arxivLink.includes("arxiv.org"), "Article must have valid arXiv link");
  });

  test("Neutrino & Black hole preprint (arXiv:2609.26773) passes scope and blocklist checks", () => {
    const candidateId = "2609.26773";
    const extracted = extractArxivId(`https://arxiv.org/abs/${candidateId}`);
    assert.strictEqual(extracted, candidateId, "extractArxivId must extract 2609.26773");

    const blockCheck = checkArticleBlocked({
      id: candidateId,
      title: "Resonant neutrino flavor conversion within dark matter spikes",
      summary: "Neutrino-dark matter interactions around supermassive black hole...",
      primaryCategory: "hep-ph",
      categories: ["hep-ph", "astro-ph.HE"]
    });

    assert.strictEqual(blockCheck.blocked, false, "Preprint 2609.26773 must NOT be blocked");
  });

  test("Chronological sorting DOES NOT apply for manual generated articles via this tool", async () => {
    const { sortBlogsByPublicationDate, isManualGeneratedBlog } = await import("./viewCounter");

    const manualArticle: BlogPost = {
      id: "generated-9999999999",
      slug: "manual-breakthrough-quantum-optics",
      arxivLink: "https://arxiv.org/abs/2609.99999",
      title: "Manual Breakthrough in Quantum Optics",
      excerpt: "A manual paper generated via this tool",
      content: "Deep scholarly content",
      author: "Meridian",
      date: "September 20, 2026", // older historical date
      createdAt: 2000000000000,
      timestamp: 2000000000000,
      tags: ["Optics"],
      readingTime: "5 min",
      bannerSvg: "<svg></svg>",
      views: 100,
      isManual: true,
      isManualGeneration: true,
      source: "manual_tool"
    };

    const regularNewerArticle: BlogPost = {
      id: "blog-standard-newer",
      slug: "newer-standard-dispatch",
      arxivLink: "https://arxiv.org/abs/2609.88888",
      title: "Newer Standard Dispatch",
      excerpt: "Standard automated article with newer publication date",
      content: "Content",
      author: "Meridian",
      date: "September 25, 2026", // newer date
      createdAt: 1000000000000,
      timestamp: 1000000000000,
      tags: ["Optics"],
      readingTime: "5 min",
      bannerSvg: "<svg></svg>",
      views: 100
    };

    assert.strictEqual(isManualGeneratedBlog(manualArticle), true, "Must detect manual article");
    assert.strictEqual(isManualGeneratedBlog(regularNewerArticle), false, "Must detect regular article");

    const sorted = sortBlogsByPublicationDate([regularNewerArticle, manualArticle]);
    assert.strictEqual(
      sorted[0].id,
      manualArticle.id,
      "Manual generated article MUST appear at index 0, exempt from chronological sorting"
    );
  });
});
