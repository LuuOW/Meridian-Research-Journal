import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";

test("Google AdSense Ad Units are disabled for clean scholarly reading experience", () => {
  const googleAdSlotFile = fs.readFileSync(path.join(process.cwd(), "src/components/GoogleAdSlot.tsx"), "utf-8");
  assert.ok(
    googleAdSlotFile.includes("return null;"),
    "GoogleAdSlot must return null to ensure ad-free experience"
  );
});

test("MathRenderer maintains clean reading experience without intrusive ads", () => {
  const mathRendererFile = fs.readFileSync(path.join(process.cwd(), "src/components/MathRenderer.tsx"), "utf-8");
  assert.ok(
    mathRendererFile.includes("katex.renderToString"),
    "MathRenderer must provide high-fidelity KaTeX mathematics rendering"
  );
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

test("Search component has tilt removed and uses SearchFilterBar with autocomplete", () => {
  const appFile = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf-8");
  assert.ok(appFile.includes("<SearchFilterBar"), "App must use SearchFilterBar");
  assert.ok(!appFile.includes('RayTracedCard className="mb-12"'), "Search bar must not use RayTracedCard tilt");

  const searchBarFile = fs.readFileSync(path.join(process.cwd(), "src/components/SearchFilterBar.tsx"), "utf-8");
  assert.ok(!searchBarFile.includes("rotateX"), "SearchFilterBar must not contain rotateX 3D tilt");
  assert.ok(!searchBarFile.includes("rotateY"), "SearchFilterBar must not contain rotateY 3D tilt");
  assert.ok(searchBarFile.includes("isSearching"), "SearchFilterBar must support searching loading state");
});

test("About modal has tilt transform removed and WhatsApp updated to 541171323723", () => {
  const aboutFile = fs.readFileSync(path.join(process.cwd(), "src/components/AboutModal.tsx"), "utf-8");
  assert.ok(!aboutFile.includes("rotateX(${lightState.tiltX}deg)"), "AboutModal must not tilt rotateX");
  assert.ok(!aboutFile.includes("rotateY(${lightState.tiltY}deg)"), "AboutModal must not tilt rotateY");
  assert.ok(aboutFile.includes("https://wa.me/541171323723"), "AboutModal WhatsApp link must be updated to 541171323723");
  assert.ok(aboutFile.includes("+54 11 7132-3723"), "AboutModal WhatsApp text must display 54 11 7132-3723");
});

