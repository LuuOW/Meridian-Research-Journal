import test from "node:test";
import assert from "node:assert";
import {
  buildArticleNetwork,
  extractTagCooccurrence,
  findConnectedClusters
} from "./graphUtils.js";
import { BlogPost } from "../types.js";

const samplePosts: BlogPost[] = [
  {
    id: "post-optics-1",
    title: "Integrated Photonics and Waveguide Resonators",
    slug: "integrated-photonics-waveguides",
    excerpt: "Silicon waveguides.",
    content: "We use micro-ring resonators for optical filtering.",
    tags: ["Photonics", "Optics", "Silicon"],
    author: "Dr. Alice Vance",
    date: "2026-08-01",
    readingTime: "4 min read",
    arxivLink: "https://arxiv.org/abs/2608.10001",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "post-optics-2",
    title: "Non-linear Frequency Combs in Microcavities",
    slug: "nonlinear-frequency-combs",
    excerpt: "Kerr frequency combs.",
    content: "Discusses Silicon waveguides and Integrated Photonics.",
    tags: ["Photonics", "Optics", "Kerr Effect"],
    author: "Dr. Alice Vance",
    date: "2026-08-02",
    readingTime: "5 min read",
    arxivLink: "https://arxiv.org/abs/2608.10002",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "post-quantum-1",
    title: "Superconducting Qubit Quantum State Tomography",
    slug: "superconducting-qubits-tomography",
    excerpt: "Transmon qubits.",
    content: "Fidelity analysis in multi-qubit registers.",
    tags: ["Quantum", "Superconductivity"],
    author: "Dr. Bob Martinez",
    date: "2026-08-03",
    readingTime: "6 min read",
    arxivLink: "https://arxiv.org/abs/2608.10003",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "post-quantum-2",
    title: "Quantum Error Correction with Surface Codes",
    slug: "quantum-error-correction-surface",
    excerpt: "Topological fault tolerance.",
    content: "Fault-tolerant Superconducting Qubit systems.",
    tags: ["Quantum", "Superconductivity", "Error Correction"],
    author: "Dr. Bob Martinez",
    date: "2026-08-04",
    readingTime: "6 min read",
    arxivLink: "https://arxiv.org/abs/2608.10004",
    bannerSvg: "<svg></svg>"
  },
  {
    id: "post-cosmo-1",
    title: "Gravitational Lensing by Primordial Black Holes",
    slug: "gravitational-lensing-primordial-black-holes",
    excerpt: "Micro-lensing light curves.",
    content: "Dark matter candidates and general relativistic lensing.",
    tags: ["Astrophysics", "Cosmology", "Relativity"],
    author: "Dr. Clara Oswald",
    date: "2026-08-05",
    readingTime: "7 min read",
    arxivLink: "https://arxiv.org/abs/2608.10005",
    bannerSvg: "<svg></svg>"
  }
];

test("buildArticleNetwork scales node size by degree and assigns primary group", () => {
  const network = buildArticleNetwork(samplePosts);

  assert.strictEqual(network.nodes.length, 5);
  const p1 = network.nodes.find(n => n.id === "post-optics-1");
  const p3 = network.nodes.find(n => n.id === "post-quantum-1");
  const p5 = network.nodes.find(n => n.id === "post-cosmo-1");

  assert.ok(p1 && p3 && p5);
  assert.strictEqual(p1.group, "Photonics");
  assert.strictEqual(p3.group, "Quantum");
  assert.strictEqual(p5.group, "Astrophysics");

  // Connected nodes have size > 10
  assert.ok(p1.size > 10);
  assert.ok(p3.size > 10);
  // Isolated post has degree 0 and size 10
  assert.strictEqual(p5.degree, 0);
  assert.strictEqual(p5.size, 10);
});

test("extractTagCooccurrence extracts pair combinations without duplicates", () => {
  const pairs = extractTagCooccurrence(samplePosts);
  assert.ok(pairs.length > 0);

  // Photonics & Optics co-occur in 2 posts
  const photonicsOptics = pairs.find(
    p => (p.tagA === "Optics" && p.tagB === "Photonics") || (p.tagA === "Photonics" && p.tagB === "Optics")
  );
  assert.ok(photonicsOptics);
  assert.strictEqual(photonicsOptics.count, 2);

  // Quantum & Superconductivity co-occur in 2 posts
  const quantumSuper = pairs.find(
    p => (p.tagA === "Quantum" && p.tagB === "Superconductivity") || (p.tagA === "Superconductivity" && p.tagB === "Quantum")
  );
  assert.ok(quantumSuper);
  assert.strictEqual(quantumSuper.count, 2);
});

test("findConnectedClusters partitions disconnected components into clusters", () => {
  const network = buildArticleNetwork(samplePosts);
  const clusters = findConnectedClusters(network);

  // Expect 3 distinct clusters: Optics pair, Quantum pair, and isolated Cosmo node
  assert.strictEqual(clusters.length, 3);
  assert.strictEqual(clusters[0].length, 2);
  assert.strictEqual(clusters[1].length, 2);
  assert.strictEqual(clusters[2].length, 1);
  assert.strictEqual(clusters[2][0], "post-cosmo-1");
});
