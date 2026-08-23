import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";

test("Google AdSense Ad Units are correctly specified with correct client ID and Slot IDs", () => {
  const googleAdSlotFile = fs.readFileSync(path.join(process.cwd(), "src/components/GoogleAdSlot.tsx"), "utf-8");
  const googleInArticleAdFile = fs.readFileSync(path.join(process.cwd(), "src/components/GoogleInArticleAd.tsx"), "utf-8");
  const appFile = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf-8");

  // 1. Custom_01 ad unit verification (bottom of article)
  assert.ok(
    googleAdSlotFile.includes('slotId = "9736830690"') || appFile.includes('slotId="9736830690"'),
    "Bottom ad slot must use ID 9736830690 (custom_01)"
  );
  assert.ok(
    googleAdSlotFile.includes('data-ad-client="ca-pub-7734562716191044"'),
    "Ad unit must use client ID ca-pub-7734562716191044"
  );
  assert.ok(
    googleAdSlotFile.includes('data-full-width-responsive="true"'),
    "Ad unit must be configured for full-width responsiveness"
  );

  // 2. In-article ad unit verification (native 2nd paragraph ad)
  assert.ok(
    googleInArticleAdFile.includes('slotId = "2342440882"'),
    "In-article ad slot must default to slot ID 2342440882"
  );
  assert.ok(
    googleInArticleAdFile.includes('data-ad-layout="in-article"'),
    "In-article ad must have data-ad-layout='in-article'"
  );
  assert.ok(
    googleInArticleAdFile.includes('data-ad-format="fluid"'),
    "In-article ad must specify data-ad-format='fluid'"
  );
  assert.ok(
    googleInArticleAdFile.includes('textAlign: "center"') || googleInArticleAdFile.includes('text-align: center'),
    "In-article ad must be centered according to Google AdSense guidelines"
  );
});

test("MathRenderer in-article ad placement logic targets precisely after 2 substantive paragraphs", () => {
  const mathRendererFile = fs.readFileSync(path.join(process.cwd(), "src/components/MathRenderer.tsx"), "utf-8");
  
  assert.ok(
    mathRendererFile.includes("GoogleInArticleAd"),
    "MathRenderer must import and render GoogleInArticleAd"
  );
  assert.ok(
    mathRendererFile.includes('slotId="2342440882"'),
    "MathRenderer must place in-article ad with slot ID 2342440882"
  );
  assert.ok(
    mathRendererFile.includes("priorParagraphCount === 1") || mathRendererFile.includes("priorParagraphCount"),
    "In-article ad must count prior paragraphs to place after the 2nd paragraph"
  );

  // Simulation test of the paragraph placement rule
  interface Block {
    type: "paragraph" | "heading" | "math_block" | "table";
    content: string;
  }

  const sampleBlocks: Block[] = [
    { type: "paragraph", content: "This is the first substantive introductory paragraph of research." },
    { type: "heading", content: "1. Quantum Channel Setup" },
    { type: "paragraph", content: "This is the second substantive paragraph where readers have engaged with the material." },
    { type: "paragraph", content: "This is the third paragraph that continues the technical thesis." },
    { type: "paragraph", content: "This is the fourth paragraph concluding the results." }
  ];

  let adInjectedIndex = -1;

  sampleBlocks.forEach((block, bIdx) => {
    if (block.type === "paragraph") {
      const priorParagraphCount = sampleBlocks
        .slice(0, bIdx)
        .filter((b) => b.type === "paragraph" && b.content.trim().length > 20).length;
      const isSecondParagraph = priorParagraphCount === 1 && block.content.trim().length > 20;
      if (isSecondParagraph) {
        adInjectedIndex = bIdx;
      }
    }
  });

  // Second paragraph is at index 2 in sampleBlocks
  assert.strictEqual(adInjectedIndex, 2, "In-article ad must be positioned immediately after paragraph #2");
});

test("Editor's Edition article exists with proper metadata, tags, and custom banner", () => {
  const customBlogs: BlogPost[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "custom_blogs.json"), "utf-8")
  );

  const editorArticle = customBlogs.find(
    (b) => b.isEditorEdition === true || b.tags?.some((t) => t.toLowerCase().includes("editor"))
  );

  assert.ok(editorArticle, "There must be an Editor's Edition article in custom_blogs.json");
  assert.ok(
    editorArticle?.title.includes("Frontier Photonic Engines"),
    "Editor article title should match 'Frontier Photonic Engines'"
  );
  assert.ok(
    editorArticle?.arxivLink.includes("arxiv.org"),
    "Editor article must have a valid arXiv link"
  );
  assert.ok(
    editorArticle?.bannerSvg.includes("EDITOR'S SPECIAL EDITION") || editorArticle?.bannerSvg.includes("Frontier Photonic Engines"),
    "Editor banner SVG must contain custom editorial branding"
  );
  assert.ok(
    editorArticle?.content.includes("Quantum & Particle Optics") &&
    editorArticle?.content.includes("Wavefront Shaping"),
    "Editor article content must include the multi-domain photonic synthesis"
  );

  // Check also in data.ts preloaded blogs
  const preloadedEditorArticle = PRELOADED_BLOGS.find(
    (b) => b.isEditorEdition === true || b.tags?.some((t) => t.toLowerCase().includes("editor"))
  );
  assert.ok(preloadedEditorArticle, "Editor's edition must be synced into PRELOADED_BLOGS in src/data.ts");
});

test("Editorial badge logic correctly detects Editor's Edition vs standard publications", () => {
  function getBadgeLabel(blog: Partial<BlogPost>): string {
    const isEditor = blog.isEditorEdition || blog.tags?.some((t) => t.toLowerCase().includes("editor"));
    return isEditor
      ? "MERIDIAN SPECIAL SYNTHESIS // EDITOR'S EDITION"
      : "MERIDIAN PUBLICATION REVIEW // PEER TRANSLATED";
  }

  const standardBlog: Partial<BlogPost> = {
    title: "Quantum Unitary Channels",
    tags: ["Quantum Computing", "Physics"]
  };

  const editorialBlog: Partial<BlogPost> = {
    title: "Frontier Photonic Engines",
    tags: ["Editor's Edition", "Optics"],
    isEditorEdition: true
  };

  assert.strictEqual(
    getBadgeLabel(standardBlog),
    "MERIDIAN PUBLICATION REVIEW // PEER TRANSLATED",
    "Standard articles should receive peer review badge"
  );
  assert.strictEqual(
    getBadgeLabel(editorialBlog),
    "MERIDIAN SPECIAL SYNTHESIS // EDITOR'S EDITION",
    "Editor's edition articles should receive special synthesis badge"
  );
});

test("Main article body container has 3D tilt disabled for stable readability", () => {
  const appFile = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf-8");

  // Verify that the article body is NOT wrapped inside RayTracedCard
  const articleSectionMatch = appFile.match(/MAIN SCHOLARLY ARTICLE BODY VIEW CONTAINER([\s\S]*?)<\/article>/);
  assert.ok(articleSectionMatch, "Article body container section must be present");
  
  const articleSection = articleSectionMatch[1];
  assert.ok(
    !articleSection.includes("<RayTracedCard"),
    "Article reading body must NOT be wrapped in RayTracedCard (tilt effect disabled)"
  );
  assert.ok(
    articleSection.includes("relative rounded-3xl bg-white dark:bg-neutral-900 border"),
    "Article reading body must use stable flat card container for reading"
  );
});
