import test from "node:test";
import assert from "node:assert";
import {
  normalizeTag,
  extractUniqueTags,
  filterBlogsByTags,
  searchAndRankBlogs
} from "./tagFilter.js";
import { BlogPost } from "../types.js";

const sampleBlogs: BlogPost[] = [
  {
    id: "blog-1",
    title: "Quantum Computing Basics",
    slug: "quantum-computing-basics",
    excerpt: "Introductory guide to quantum qubits.",
    content: "Detailed content on quantum gates and superpositions.",
    date: "July 1, 2026",
    readingTime: "5 min read",
    arxivLink: "https://arxiv.org/abs/2607.00001",
    bannerSvg: "<svg></svg>",
    author: "Alice Smith",
    tags: ["#Quantum", "Computing", "Physics"]
  },
  {
    id: "blog-2",
    title: "Silicon Photonics in Data Centers",
    slug: "silicon-photonics-data-centers",
    excerpt: "High speed laser interconnects.",
    content: "Exploring optical waveguides and modulators.",
    date: "July 2, 2026",
    readingTime: "7 min read",
    arxivLink: "https://arxiv.org/abs/2607.00002",
    bannerSvg: "<svg></svg>",
    author: "Bob Jones",
    tags: ["Optics", "Silicon Photonics"]
  },
  {
    id: "blog-3",
    title: "Advanced Quantum Optics",
    slug: "advanced-quantum-optics",
    excerpt: "Squeezed states and non-classical light.",
    content: "Mathematical analysis of optical parametric oscillators.",
    date: "July 3, 2026",
    readingTime: "10 min read",
    arxivLink: "https://arxiv.org/abs/2607.00003",
    bannerSvg: "<svg></svg>",
    author: "Alice Smith",
    tags: ["Quantum", "Optics"]
  }
];

test("normalizeTag strips leading hashes and normalizes whitespace", () => {
  assert.strictEqual(normalizeTag("   #Quantum Physics  "), "Quantum Physics");
  assert.strictEqual(normalizeTag("Optics"), "Optics");
  assert.strictEqual(normalizeTag(""), "");
  assert.strictEqual(normalizeTag(null as unknown as string), "");
});

test("extractUniqueTags returns sorted tags with correct counts", () => {
  const unique = extractUniqueTags(sampleBlogs);
  assert.ok(unique.length > 0);

  // Quantum and Optics both appear twice
  const quantumEntry = unique.find((t) => t.tag === "Quantum");
  const opticsEntry = unique.find((t) => t.tag === "Optics");

  assert.ok(quantumEntry);
  assert.strictEqual(quantumEntry?.count, 2);
  assert.ok(opticsEntry);
  assert.strictEqual(opticsEntry?.count, 2);
});

test("filterBlogsByTags filters with 'any' mode", () => {
  const result = filterBlogsByTags(sampleBlogs, ["Silicon Photonics"]);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, "blog-2");
});

test("filterBlogsByTags filters with 'all' mode", () => {
  const resultAll = filterBlogsByTags(sampleBlogs, ["Quantum", "Optics"], "all");
  assert.strictEqual(resultAll.length, 1);
  assert.strictEqual(resultAll[0].id, "blog-3");
});

test("searchAndRankBlogs ranks exact title matches higher", () => {
  const results = searchAndRankBlogs(sampleBlogs, "Quantum Computing Basics");
  assert.ok(results.length >= 1);
  assert.strictEqual(results[0].id, "blog-1");
});

test("searchAndRankBlogs handles empty query by returning tag-filtered items", () => {
  const results = searchAndRankBlogs(sampleBlogs, "   ", ["Optics"]);
  assert.strictEqual(results.length, 2); // blog-2 and blog-3
});
