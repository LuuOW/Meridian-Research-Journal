import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { generateSitemapXml } from "./githubSync";
import { BlogPost } from "../types";

test("public/robots.txt exists with appropriate search engine directives", () => {
  const robotsPath = path.join(process.cwd(), "public", "robots.txt");
  assert.strictEqual(fs.existsSync(robotsPath), true, "public/robots.txt should exist");

  const content = fs.readFileSync(robotsPath, "utf-8");
  assert.match(content, /User-agent:\s*\*/);
  assert.match(content, /Allow:\s*\//);
  assert.match(content, /Allow:\s*\/blog\//);
  assert.match(content, /Disallow:\s*\/api\//);
  assert.match(content, /Sitemap:\s*https:\/\/ask-meridian\.uk\/sitemap\.xml/);
});

test("public/sitemap.xml exists with valid XML structure", () => {
  const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
  assert.strictEqual(fs.existsSync(sitemapPath), true, "public/sitemap.xml should exist");

  const xml = fs.readFileSync(sitemapPath, "utf-8");
  assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'), "Should have XML declaration");
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), "Should have urlset namespace");
  assert.ok(xml.includes("<loc>https://ask-meridian.uk/</loc>"), "Should include homepage");
  assert.ok(xml.includes("https://ask-meridian.uk/blog/"), "Should include blog entries");
});

test("generateSitemapXml dynamically formats blog URLs and lastmod tags accurately", () => {
  const mockBlogs: BlogPost[] = [
    {
      id: "test-1",
      title: "Test Paper One",
      slug: "test-paper-one",
      excerpt: "An excerpt",
      date: "May 10, 2026",
      content: "Content",
      readingTime: "5 min",
      views: 100,
      author: "Author",
      tags: ["Quantum"],
      arxivLink: "https://arxiv.org/abs/2608.00001",
      bannerSvg: "<svg></svg>"
    },
    {
      id: "test-2",
      title: "Test Paper Two",
      slug: "test-paper-two",
      excerpt: "An excerpt 2",
      date: "2026-06-15",
      content: "Content 2",
      readingTime: "6 min",
      views: 120,
      author: "Author 2",
      tags: ["Optics"],
      arxivLink: "https://arxiv.org/abs/2608.00002",
      bannerSvg: "<svg></svg>"
    }
  ];

  const xml = generateSitemapXml(mockBlogs, "https://ask-meridian.uk");
  assert.ok(xml.includes("<loc>https://ask-meridian.uk/</loc>"));
  assert.ok(xml.includes("<loc>https://ask-meridian.uk/blog/test-paper-one</loc>"));
  assert.ok(xml.includes("<loc>https://ask-meridian.uk/blog/test-paper-two</loc>"));
  assert.ok(xml.includes("<lastmod>2026-05-10</lastmod>"));
  assert.ok(xml.includes("<lastmod>2026-06-15</lastmod>"));
});
