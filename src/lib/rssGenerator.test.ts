import test from "node:test";
import assert from "node:assert";
import { escapeXml, generateRssFeed } from "./rssGenerator.js";
import { BlogPost } from "../types.js";

const samplePost: BlogPost = {
  id: "post-101",
  title: "Integrated Photonics & Quantum Optics",
  slug: "integrated-photonics-quantum-optics",
  excerpt: "High-speed laser & optical resonators.",
  content: "Full scientific article content...",
  date: "August 1, 2026",
  readingTime: "6 min read",
  arxivLink: "https://arxiv.org/abs/2608.10101",
  bannerSvg: "<svg></svg>",
  author: "Dr. Maria Chen",
  tags: ["#Photonics", "Quantum"]
};

test("escapeXml handles XML special characters properly", () => {
  assert.strictEqual(escapeXml("Photonics & Lasers <2026>"), "Photonics &amp; Lasers &lt;2026&gt;");
  assert.strictEqual(escapeXml('"Quotes" & \'Appos\''), "&quot;Quotes&quot; &amp; &apos;Appos&apos;");
  assert.strictEqual(escapeXml(""), "");
  assert.strictEqual(escapeXml(null as unknown as string), "");
});

test("generateRssFeed produces valid RSS XML with channel metadata and item entries", () => {
  const rss = generateRssFeed([samplePost], { title: "Custom Science Feed" });

  assert.ok(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(rss.includes("<title>Custom Science Feed</title>"));
  assert.ok(rss.includes("<title>Integrated Photonics &amp; Quantum Optics</title>"));
  assert.ok(rss.includes("<dc:creator>Dr. Maria Chen</dc:creator>"));
  assert.ok(rss.includes("<category>Photonics</category>"));
  assert.ok(rss.includes("<category>Quantum</category>"));
});

test("generateRssFeed handles empty post lists gracefully", () => {
  const rss = generateRssFeed([]);
  assert.ok(rss.includes("<channel>"));
  assert.ok(rss.includes("Meridian Research Journal"));
  assert.ok(!rss.includes("<item>"));
});
