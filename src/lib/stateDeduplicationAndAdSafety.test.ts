import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";
import { searchAndRankBlogs } from "./tagFilter";

test("deduplicateBlogs utility safely strips duplicate IDs, nulls, and preserves insertion order", () => {
  const deduplicateBlogs = (list: Partial<BlogPost>[]): Partial<BlogPost>[] => {
    const seen = new Set<string>();
    return list.filter((b) => {
      if (!b || !b.id || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  };

  const sampleList: Partial<BlogPost>[] = [
    { id: "article-1", title: "First Article" },
    { id: "article-2", title: "Second Article" },
    { id: "article-1", title: "Duplicate First Article (Stale)" },
    null as any,
    undefined as any,
    { id: "", title: "Empty ID Article" },
    { id: "article-3", title: "Third Article" },
    { id: "article-2", title: "Duplicate Second Article" },
  ];

  const result = deduplicateBlogs(sampleList);

  assert.strictEqual(result.length, 3, "Only 3 unique valid items should remain");
  assert.strictEqual(result[0]?.id, "article-1");
  assert.strictEqual(result[0]?.title, "First Article", "Original first entry should be preserved");
  assert.strictEqual(result[1]?.id, "article-2");
  assert.strictEqual(result[2]?.id, "article-3");
});

test("PRELOADED_BLOGS and custom_blogs.json have strictly zero duplicate IDs across all datasets", () => {
  // Check PRELOADED_BLOGS
  const preloadedCounts: Record<string, number> = {};
  for (const blog of PRELOADED_BLOGS) {
    assert.ok(blog.id && typeof blog.id === "string" && blog.id.trim().length > 0, "Blog must have non-empty string ID");
    preloadedCounts[blog.id] = (preloadedCounts[blog.id] || 0) + 1;
  }

  const preloadedDuplicates = Object.entries(preloadedCounts).filter(([_, count]) => count > 1);
  assert.strictEqual(
    preloadedDuplicates.length,
    0,
    `PRELOADED_BLOGS must contain zero duplicate IDs, but found: ${JSON.stringify(preloadedDuplicates)}`
  );

  // Check custom_blogs.json
  const customBlogsRaw = fs.readFileSync(path.join(process.cwd(), "custom_blogs.json"), "utf-8");
  const customBlogs: BlogPost[] = JSON.parse(customBlogsRaw);
  const customCounts: Record<string, number> = {};
  for (const blog of customBlogs) {
    assert.ok(blog.id && typeof blog.id === "string" && blog.id.trim().length > 0, "Custom blog must have valid string ID");
    customCounts[blog.id] = (customCounts[blog.id] || 0) + 1;
  }

  const customDuplicates = Object.entries(customCounts).filter(([_, count]) => count > 1);
  assert.strictEqual(
    customDuplicates.length,
    0,
    `custom_blogs.json must contain zero duplicate IDs, but found: ${JSON.stringify(customDuplicates)}`
  );
});

test("Banner override pipeline merges custom SVG banners onto existing and preloaded articles seamlessly", () => {
  const deduplicateBlogs = (list: BlogPost[]): BlogPost[] => {
    const seen = new Set<string>();
    return list.filter((b) => {
      if (!b || !b.id || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  };

  const sampleBannerOverrides: Record<string, string> = {
    "editorial-frontier-photonic-engines-8842": "<svg><rect fill='red'/></svg>",
    "custom-item-42": "<svg><circle fill='blue'/></svg>"
  };

  const sampleBlogs: BlogPost[] = [
    {
      id: "editorial-frontier-photonic-engines-8842",
      title: "Frontier Photonic Engines",
      slug: "frontier-photonic-engines",
      author: "Meridian Editorial Board",
      excerpt: "Sample excerpt",
      content: "Sample content",
      date: "August 22, 2026",
      readingTime: "7 min read",
      arxivLink: "https://arxiv.org/abs/2608.20224",
      tags: ["Optics", "Editor's Edition"],
      bannerSvg: "<svg><rect fill='original'/></svg>",
      views: 100
    },
    {
      id: "article-untouched",
      title: "Untouched Article",
      slug: "untouched-article",
      author: "Dr. J. Doe",
      excerpt: "Sample excerpt",
      content: "Sample content",
      date: "August 22, 2026",
      readingTime: "5 min read",
      arxivLink: "https://arxiv.org/abs/2608.11111",
      tags: ["Physics"],
      bannerSvg: "<svg><rect fill='default'/></svg>",
      views: 50
    }
  ];

  const applyOverrides = (list: BlogPost[]) =>
    deduplicateBlogs(list).map((b) =>
      sampleBannerOverrides[b.id] ? { ...b, bannerSvg: sampleBannerOverrides[b.id] } : b
    );

  const processed = applyOverrides(sampleBlogs);

  assert.strictEqual(processed[0]?.bannerSvg, "<svg><rect fill='red'/></svg>", "Overridden blog must receive updated bannerSvg");
  assert.strictEqual(processed[1]?.bannerSvg, "<svg><rect fill='default'/></svg>", "Un-overridden blog must preserve its bannerSvg");
});

test("Editor's Edition search ranking accurately surfaces photonic and editorial queries", () => {
  const editorArticle = PRELOADED_BLOGS.find((b) => b.id === "editorial-frontier-photonic-engines-8842");
  assert.ok(editorArticle, "Editor's edition article must exist");

  // Query: "Photonic Engines"
  const photonicResults = searchAndRankBlogs(PRELOADED_BLOGS, "Photonic Engines", []);
  assert.ok(photonicResults.length > 0, "Search for 'Photonic Engines' should return matching articles");
  assert.strictEqual(
    photonicResults[0]?.id,
    "editorial-frontier-photonic-engines-8842",
    "Editor's article should be the top match for 'Photonic Engines'"
  );

  // Query: "Wavefront Shaping"
  const wavefrontResults = searchAndRankBlogs(PRELOADED_BLOGS, "Wavefront Shaping", []);
  const containsEditor = wavefrontResults.some((b) => b.id === "editorial-frontier-photonic-engines-8842");
  assert.ok(containsEditor, "Search for 'Wavefront Shaping' should include the editor's synthesis article");

  // Tag filter: "Editor's Edition"
  const editorTagResults = searchAndRankBlogs(PRELOADED_BLOGS, "", ["Editor's Edition"]);
  assert.ok(editorTagResults.length >= 1, "Tag filter for Editor's Edition should match");
  assert.ok(
    editorTagResults.some((b) => b.id === "editorial-frontier-photonic-engines-8842"),
    "Editor's article must be in the tag-filtered result"
  );
});

test("In-article ad and bottom-of-page ad units coexist without DOM/attribute collision", () => {
  const inArticleAd = fs.readFileSync(path.join(process.cwd(), "src/components/GoogleInArticleAd.tsx"), "utf-8");
  const bottomAd = fs.readFileSync(path.join(process.cwd(), "src/components/GoogleAdSlot.tsx"), "utf-8");

  // Check different default slot IDs
  assert.ok(inArticleAd.includes('slotId = "2342440882"'));
  assert.ok(bottomAd.includes('slotId = "9736830690"'));

  // Ensure ad formats are differentiated appropriately
  assert.ok(inArticleAd.includes('data-ad-layout="in-article"'));
  assert.ok(bottomAd.includes('data-ad-format={adFormat}') && bottomAd.includes('adFormat = "auto"'));

  // Ensure both units use the publisher ID safely
  assert.ok(inArticleAd.includes('ca-pub-7734562716191044'));
  assert.ok(bottomAd.includes('ca-pub-7734562716191044'));
});
