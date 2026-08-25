import { test } from "node:test";
import assert from "node:assert";
import { generateLinkedInDraft, generateTwitterDraft, formatMarkdownExport } from "./shareUtils";
import { BlogPost } from "../types";

test("generateLinkedInDraft generates clean social media post with truncated title and sticky ask-meridian.uk/blog link", () => {
  const shortTitle = "Topological Quantum States in Silicon";
  const longTitle = "A Very Long Scientific Research Paper Title That Exceeds Eighty Characters and Needs Truncation for Social Posts";
  const excerpt = "An in-depth summary of quantum photonic states.";

  const draftShort = generateLinkedInDraft(shortTitle, excerpt, "123");
  assert.ok(draftShort.includes("Topological Quantum States in Silicon"), "Should include full title if <= 80 chars");
  assert.ok(draftShort.includes("An in-depth summary of quantum photonic states."), "Should include article excerpt");
  assert.ok(draftShort.includes("Read the full paper breakdown on Meridian: https://ask-meridian.uk/blog/123"), "Should format sticky short blog URL");

  const draftLong = generateLinkedInDraft(longTitle, excerpt, "456");
  assert.ok(draftLong.includes("..."), "Should truncate titles longer than 80 characters");
  assert.ok(draftLong.includes("Read the full paper breakdown on Meridian: https://ask-meridian.uk/blog/456"));

  const draftNoId = generateLinkedInDraft(shortTitle, excerpt);
  assert.ok(draftNoId.includes("Read the full paper breakdown on Meridian: https://ask-meridian.uk/blog"));
});

test("generateTwitterDraft creates concise tweet format with emojis and link", () => {
  const title = "Neural Metasurface Inverse Design";
  const tweet = generateTwitterDraft(title, "789", "https://example.com");

  assert.ok(tweet.startsWith("🔬 Hot Off the Press: \"Neural Metasurface Inverse Design\""));
  assert.ok(tweet.includes("https://example.com/blog/789"));
});

test("formatMarkdownExport formats full blog post object into structured markdown document", () => {
  const sampleBlog: BlogPost = {
    id: "sample-1",
    slug: "sample-blog",
    title: "Quantum Integrated Circuits",
    excerpt: "Exploring next-gen silicon photonics.",
    content: "# Introduction\nSilicon photonics is advancing rapidly.",
    date: "July 28, 2026",
    readingTime: "5 min read",
    arxivLink: "https://arxiv.org/abs/2401.12345",
    bannerSvg: "<svg></svg>",
    tags: ["Quantum", "Photonics", "Optics"],
    author: "Meridian Labs"
  };

  const md = formatMarkdownExport(sampleBlog);

  assert.ok(md.includes("# Quantum Integrated Circuits"), "Markdown should have title heading");
  assert.ok(md.includes("**Published:** July 28, 2026"), "Markdown should contain publication metadata");
  assert.ok(md.includes("https://arxiv.org/abs/2401.12345"), "Markdown should include arXiv link");
  assert.ok(md.includes("`Quantum`, `Photonics`, `Optics`"), "Markdown should render tag list");
  assert.ok(md.includes("## Abstract & Highlights\nExploring next-gen silicon photonics."), "Markdown should include excerpt section");
});
