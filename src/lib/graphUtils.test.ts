import test from "node:test";
import assert from "node:assert";
import {
  buildArticleNetwork,
  extractTagCooccurrence,
  findConnectedClusters
} from "./graphUtils";
import { BlogPost } from "../types";

const mockPosts: BlogPost[] = [
  {
    id: "post-1",
    title: "Quantum Entanglement",
    slug: "quantum-entanglement",
    excerpt: "Intro to entanglement.",
    content: "Content referencing nothing special.",
    tags: ["Quantum", "Optics"],
    author: "Lucas Kempe",
    date: "2026-08-01",
    readingTime: "3 min",
    arxivLink: "https://arxiv.org/abs/2608.11111",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "post-2",
    title: "Cavity QED Systems",
    slug: "cavity-qed-systems",
    excerpt: "Photons in microcavities.",
    content: "We use concepts from Quantum Entanglement.",
    tags: ["Quantum", "Optics"],
    author: "Lucas Kempe",
    date: "2026-08-02",
    readingTime: "4 min",
    arxivLink: "https://arxiv.org/abs/2608.22222",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "post-3",
    title: "Astrophysical Black Holes",
    slug: "astrophysical-black-holes",
    excerpt: "Kerr metric solutions.",
    content: "Gravitational lensing near event horizons.",
    tags: ["Cosmology", "Relativity"],
    author: "Lucas Kempe",
    date: "2026-08-03",
    readingTime: "5 min",
    arxivLink: "https://arxiv.org/abs/2608.33333",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "post-4",
    title: "Gravitational Waves",
    slug: "gravitational-waves",
    excerpt: "LIGO detection waveforms.",
    content: "Analysis of binary black hole coalescences.",
    tags: ["Cosmology", "Astrophysics"],
    author: "Lucas Kempe",
    date: "2026-08-04",
    readingTime: "5 min",
    arxivLink: "https://arxiv.org/abs/2608.44444",
    bannerSvg: "<svg></svg>"
  }
];

test("buildArticleNetwork creates nodes and calculates degree from shared tags and mentions", () => {
  const network = buildArticleNetwork(mockPosts);

  assert.strictEqual(network.nodes.length, 4);
  
  // post-1 and post-2 share "Quantum" and "Optics", plus post-2 mentions post-1 title
  const edgeQ = network.edges.find(
    e => (e.source === "post-1" && e.target === "post-2") || (e.source === "post-2" && e.target === "post-1")
  );
  assert.ok(edgeQ, "Edge between post-1 and post-2 must exist");
  assert.strictEqual(edgeQ.relationshipType, "direct_reference");
  assert.ok(edgeQ.weight > 3.0);

  // post-3 and post-4 share "Cosmology"
  const edgeCosmo = network.edges.find(
    e => (e.source === "post-3" && e.target === "post-4") || (e.source === "post-4" && e.target === "post-3")
  );
  assert.ok(edgeCosmo, "Edge between post-3 and post-4 must exist");
  assert.strictEqual(edgeCosmo.relationshipType, "shared_tag");
});

test("buildArticleNetwork gracefully handles empty posts array", () => {
  const emptyNetwork = buildArticleNetwork([]);
  assert.deepStrictEqual(emptyNetwork.nodes, []);
  assert.deepStrictEqual(emptyNetwork.edges, []);
});

test("extractTagCooccurrence extracts pair frequencies sorted descending", () => {
  const pairs = extractTagCooccurrence(mockPosts);
  assert.ok(pairs.length > 0);

  const opticsQuantum = pairs.find(
    p => (p.tagA === "Optics" && p.tagB === "Quantum") || (p.tagA === "Quantum" && p.tagB === "Optics")
  );
  assert.ok(opticsQuantum);
  assert.strictEqual(opticsQuantum.count, 2, "Optics and Quantum co-occur in 2 posts");
});

test("findConnectedClusters identifies discrete independent topic communities", () => {
  const network = buildArticleNetwork(mockPosts);
  const clusters = findConnectedClusters(network);

  // Should find 2 separate clusters: [post-1, post-2] (Quantum) and [post-3, post-4] (Cosmology)
  assert.strictEqual(clusters.length, 2);
  assert.strictEqual(clusters[0].length, 2);
  assert.strictEqual(clusters[1].length, 2);

  const cluster1 = new Set(clusters[0]);
  const cluster2 = new Set(clusters[1]);

  const hasQuantumCluster = (cluster1.has("post-1") && cluster1.has("post-2")) ||
    (cluster2.has("post-1") && cluster2.has("post-2"));
  const hasCosmoCluster = (cluster1.has("post-3") && cluster1.has("post-4")) ||
    (cluster2.has("post-3") && cluster2.has("post-4"));

  assert.ok(hasQuantumCluster, "Quantum cluster should be grouped together");
  assert.ok(hasCosmoCluster, "Cosmology cluster should be grouped together");
});
