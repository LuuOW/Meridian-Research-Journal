import test from "node:test";
import assert from "node:assert";
import {
  calculateTagOverlapScore,
  calculateTextSimilarity,
  findRelatedArticles,
  groupArticlesByTopic
} from "./relatedArticles.js";
import { BlogPost } from "../types.js";

const postA: BlogPost = {
  id: "p1",
  title: "Quantum Entanglement and Photonic Cavities",
  slug: "quantum-entanglement-photonic-cavities",
  excerpt: "Study of quantum entanglement in nanophotonics.",
  content: "Detailed analysis...",
  date: "August 1, 2026",
  readingTime: "5 min read",
  arxivLink: "https://arxiv.org/abs/2608.0001",
  bannerSvg: "<svg></svg>",
  author: "Dr. Alice Vance",
  tags: ["#Quantum", "Photonics", "Optics"]
};

const postB: BlogPost = {
  id: "p2",
  title: "Silicon Photonics and Integrated Cavities",
  slug: "silicon-photonics-integrated-cavities",
  excerpt: "Advances in integrated photonics.",
  content: "Waveguide resonators...",
  date: "August 2, 2026",
  readingTime: "6 min read",
  arxivLink: "https://arxiv.org/abs/2608.0002",
  bannerSvg: "<svg></svg>",
  author: "Dr. Alice Vance",
  tags: ["Photonics", "Silicon"]
};

const postC: BlogPost = {
  id: "p3",
  title: "Neural Network Architectures for LLM Alignment",
  slug: "neural-network-llm-alignment",
  excerpt: "RAG alignment and deep learning.",
  content: "Transformers...",
  date: "August 3, 2026",
  readingTime: "8 min read",
  arxivLink: "https://arxiv.org/abs/2608.0003",
  bannerSvg: "<svg></svg>",
  author: "Dr. Bob Martinez",
  tags: ["Machine Learning", "AI"]
};

test("calculateTagOverlapScore computes Jaccard similarity correctly", () => {
  const scoreAB = calculateTagOverlapScore(["#Quantum", "Photonics", "Optics"], ["Photonics", "Silicon"]);
  // Intersection: 1 (photonics)
  // Union: 4 (quantum, photonics, optics, silicon) -> 1/4 = 0.25
  assert.strictEqual(scoreAB, 0.25);

  assert.strictEqual(calculateTagOverlapScore([], ["Tag1"]), 0);
  assert.strictEqual(calculateTagOverlapScore(["Tag1"], []), 0);
});

test("calculateTextSimilarity measures word token overlap", () => {
  const similarity = calculateTextSimilarity(
    "Quantum Entanglement and Photonic Cavities",
    "Silicon Photonics and Integrated Cavities"
  );
  assert.ok(similarity > 0);
  assert.strictEqual(calculateTextSimilarity("", "Something"), 0);
});

test("findRelatedArticles identifies and ranks most relevant posts", () => {
  const related = findRelatedArticles(postA, [postA, postB, postC], 2);
  assert.strictEqual(related.length, 2);
  assert.strictEqual(related[0].id, "p2"); // postB shares photonics tag, author, and cavity words
});

test("findRelatedArticles excludes target post itself", () => {
  const related = findRelatedArticles(postA, [postA], 3);
  assert.strictEqual(related.length, 0);
});

test("groupArticlesByTopic clusters posts by primary tag", () => {
  const groups = groupArticlesByTopic([postA, postB, postC]);
  assert.ok(groups["Quantum"]);
  assert.strictEqual(groups["Quantum"].length, 1);
  assert.ok(groups["Photonics"]);
  assert.strictEqual(groups["Photonics"].length, 1);
});
