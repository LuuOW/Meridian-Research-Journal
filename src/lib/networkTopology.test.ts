import test from "node:test";
import assert from "node:assert";
import {
  buildArticleNetwork,
  extractTagCooccurrence,
  findConnectedClusters
} from "./graphUtils.js";
import { BlogPost } from "../types";

const networkMockPosts: BlogPost[] = [
  {
    id: "n-1",
    title: "High-Q Whispering Gallery Mode Resonators",
    slug: "whispering-gallery-resonators",
    excerpt: "Optical cavity Q factors exceeding 10^8 in silica microspheres.",
    content: "We build on Optical Soliton Dynamics and Kerr comb generation.",
    tags: ["Microcavities", "Photonics", "Nonlinear Optics"],
    author: "Lucas Kempe",
    date: "2026-08-01",
    readingTime: "4 min read",
    arxivLink: "https://arxiv.org/abs/2608.10001",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "n-2",
    title: "Optical Soliton Dynamics",
    slug: "optical-soliton-dynamics",
    excerpt: "Dissipative Kerr solitons in microresonator frequency combs.",
    content: "Discusses High-Q Whispering Gallery Mode Resonators.",
    tags: ["Microcavities", "Photonics", "Solitons"],
    author: "Lucas Kempe",
    date: "2026-08-02",
    readingTime: "6 min read",
    arxivLink: "https://arxiv.org/abs/2608.10002",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "n-3",
    title: "Quantum Key Distribution Protocols",
    slug: "quantum-key-distribution",
    excerpt: "Decoy-state BB84 protocols over satellite downlinks.",
    content: "Analysis of photon number splitting attacks and single photon detectors.",
    tags: ["Cryptography", "Quantum Security"],
    author: "Lucas Kempe",
    date: "2026-08-03",
    readingTime: "7 min read",
    arxivLink: "https://arxiv.org/abs/2608.10003",
    bannerSvg: "<svg></svg>"
  }
];

test("buildArticleNetwork sets appropriate node sizing based on degree connectivity", () => {
  const network = buildArticleNetwork(networkMockPosts);
  
  assert.strictEqual(network.nodes.length, 3);
  
  const node1 = network.nodes.find(n => n.id === "n-1");
  const node3 = network.nodes.find(n => n.id === "n-3");

  assert.ok(node1);
  assert.ok(node3);
  
  // n-1 is connected to n-2 (shared tags Microcavities + Photonics, and direct mentions)
  assert.ok(node1.degree >= 1);
  // n-3 shares no tags with n-1 or n-2
  assert.strictEqual(node3.degree, 0);
});

test("extractTagCooccurrence computes mutual frequencies across multiple tags", () => {
  const cooccurrences = extractTagCooccurrence(networkMockPosts);

  // Microcavities and Photonics occur together in n-1 and n-2
  const pair = cooccurrences.find(
    p => (p.tagA === "Microcavities" && p.tagB === "Photonics") ||
         (p.tagA === "Photonics" && p.tagB === "Microcavities")
  );

  assert.ok(pair, "Should locate Microcavities <-> Photonics co-occurrence");
  assert.strictEqual(pair.count, 2);
});

test("findConnectedClusters isolates disconnected singletons and dense subgroups", () => {
  const network = buildArticleNetwork(networkMockPosts);
  const clusters = findConnectedClusters(network);

  // Should yield 2 clusters: {n-1, n-2} and {n-3}
  assert.strictEqual(clusters.length, 2);

  const groupWithN3 = clusters.find(c => c.includes("n-3"));
  assert.ok(groupWithN3);
  assert.strictEqual(groupWithN3.length, 1);

  const groupWithPhotonics = clusters.find(c => c.includes("n-1") && c.includes("n-2"));
  assert.ok(groupWithPhotonics);
  assert.strictEqual(groupWithPhotonics.length, 2);
});
