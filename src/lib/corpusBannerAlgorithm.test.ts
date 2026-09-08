import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { BlogPost } from "../types";
import {
  classifyArticleArchetype,
  deriveCorpusProfile,
  generateCorpusBannerSvg,
  regenerateAllCorpusBanners
} from "./corpusBannerAlgorithm";

test("Corpus Banner Algorithm: Archetype Classification", (t) => {
  // 1. Quantum State & Circuits
  const quantumArticle: Partial<BlogPost> = {
    title: "Continuous-Variable Quantum Information and Wigner Distortions",
    tags: ["Quantum Information", "Continuous Variables"],
    excerpt: "Analysis of quantum state frame potential and circuit fidelity"
  };
  assert.strictEqual(classifyArticleArchetype(quantumArticle), "QUANTUM_STATES_AND_CIRCUITS");

  // 2. Cavity QED & Lasers
  const cavityArticle: Partial<BlogPost> = {
    title: "High-Q Whispering Gallery Optical Microcavity Resonance",
    tags: ["Optics", "Cavity QED", "Laser"],
    excerpt: "Measuring photon lifetimes and Purcell enhancement factors in laser resonators"
  };
  assert.strictEqual(classifyArticleArchetype(cavityArticle), "CAVITY_QED_AND_LASERS");

  // 3. Diffractive AI / Neural Holography
  const mlArticle: Partial<BlogPost> = {
    title: "Deep Neural Wavefront Shaping and Diffractive Transformer Inference",
    tags: ["Machine Learning", "Neural Network", "Computer Vision"],
    excerpt: "Real-time phase retrieval using deep convolutional architectures"
  };
  assert.strictEqual(classifyArticleArchetype(mlArticle), "DIFFRACTIVE_AI_AND_TENSORS");

  // 4. Diamond NV Centers
  const nvArticle: Partial<BlogPost> = {
    title: "Spin Coherence of Nitrogen-Vacancy Centers in Nanodiamonds",
    tags: ["Diamond", "NV Center", "Quantum Magnetometry"],
    excerpt: "Optically detected magnetic resonance (ODMR) at room temperature"
  };
  assert.strictEqual(classifyArticleArchetype(nvArticle), "DIAMOND_NV_AND_COLOR_CENTERS");

  // 5. Distributed Systems & MCP Protocols
  const mcpArticle: Partial<BlogPost> = {
    title: "Autonomous Tool Calling in Decentralized Microservices",
    tags: ["MCP", "Microservices", "Autonomous Agents"],
    excerpt: "Model context protocol and stream multiplexing"
  };
  assert.strictEqual(classifyArticleArchetype(mcpArticle), "DISTRIBUTED_SYSTEMS_AND_MCP");

  // 6. Biophotonics & Imaging
  const bioArticle: Partial<BlogPost> = {
    title: "Two-Photon Fluorescence Microscopy in Turbid Living Tissues",
    tags: ["Biophotonics", "Two-Photon", "Microscopy"],
    excerpt: "Deep tissue non-linear ballistic optical excitation"
  };
  assert.strictEqual(classifyArticleArchetype(bioArticle), "BIOPHOTONICS_AND_IMAGING");
});

test("Corpus Banner Algorithm: Profile Derivation & Golden-Ratio Color Distribution", () => {
  const mockArticle: Partial<BlogPost> = {
    id: "test-article-1",
    title: "Entanglement Distillation in Quantum Networks",
    tags: ["Quantum Physics"]
  };

  const profile0 = deriveCorpusProfile(mockArticle, 0, 0);
  const profile1 = deriveCorpusProfile(mockArticle, 1, 0);

  // Colors must be distinct between neighboring index positions
  assert.notStrictEqual(profile0.hueAngle, profile1.hueAngle);
  assert.notStrictEqual(profile0.primary, profile1.primary);
  assert.ok(profile0.formula.length > 0, "Formula must be assigned");
  assert.ok(profile0.corpusHash.length > 0, "Corpus hash must be generated");
});

test("Corpus Banner Algorithm: SVG Banner Rendering", () => {
  const article: BlogPost = {
    id: "test-banner-render",
    title: "Non-Hermitian Topology in Dielectric Waveguides",
    excerpt: "Analytical demonstration of exceptional points and chiral states",
    content: "Detailed mathematical derivation of the complex Hamiltonian",
    tags: ["Topological Photonics", "Waveguides"],
    date: "September 8, 2026",
    readingTime: "6 min read",
    author: "Meridian Research",
    arxivLink: "https://arxiv.org/abs/2609.00000",
    views: 120,
    timestamp: 1788820000000,
    slug: "2609-00000-non-hermitian",
    bannerSvg: ""
  };

  const svg = generateCorpusBannerSvg(article, [article]);

  assert.ok(svg.startsWith("<svg"), "Must start with <svg");
  assert.ok(svg.endsWith("</svg>"), "Must end with </svg>");
  assert.ok(svg.includes('viewBox="0 0 800 400"'), "Must have standard 800x400 viewBox");
  assert.ok(svg.includes("Non-Hermitian Topology"), "Must contain sanitized title");
  assert.ok(svg.includes("MERIDIAN RESEARCH"), "Must contain journal branding");
  assert.ok(svg.includes("mrd-svg-animations"), "Must contain embedded animation styles");
  assert.ok(svg.includes("<defs>"), "Must define gradients and filters");
});

test("Corpus Banner Algorithm: 100% Unique Banners Across Entire 102-Article Dataset", () => {
  const blogsPath = path.resolve(process.cwd(), "custom_blogs.json");
  const blogs: BlogPost[] = JSON.parse(fs.readFileSync(blogsPath, "utf-8"));

  assert.ok(blogs.length >= 100, "Dataset must contain at least 100 articles");

  const generatedBanners = blogs.map((b) => generateCorpusBannerSvg(b, blogs));
  const uniqueBanners = new Set(generatedBanners);

  assert.strictEqual(
    uniqueBanners.size,
    blogs.length,
    `Every single article in the corpus must receive a completely unique banner SVG (expected ${blogs.length}, got ${uniqueBanners.size})`
  );

  // Verify all banners are non-empty and have valid SVG tags
  generatedBanners.forEach((banner, idx) => {
    assert.ok(banner.length > 500, `Banner ${idx} must be detailed (> 500 chars)`);
    assert.ok(banner.includes("<svg") && banner.includes("</svg>"), `Banner ${idx} must be valid SVG XML`);
  });
});

test("Corpus Banner Algorithm: Seed Modifier Produces Geometric/Color Variations", () => {
  const article: BlogPost = {
    id: "var-test",
    title: "Quantum Interference in High-Finesse Cavities",
    tags: ["Quantum Optics"],
    excerpt: "Multi-photon Hong-Ou-Mandel effect",
    content: "Experimental setup and photodetector coincidence counting",
    date: "September 8, 2026",
    readingTime: "5 min read",
    author: "Meridian Research",
    slug: "quantum-interference-cavities",
    arxivLink: "https://arxiv.org/abs/2609.00001",
    bannerSvg: ""
  };

  const banner1 = generateCorpusBannerSvg(article, [article], 100);
  const banner2 = generateCorpusBannerSvg(article, [article], 200);

  assert.notStrictEqual(banner1, banner2, "Different seeds must produce different banner variations");
});

test("Corpus Banner Algorithm: Bulk Regeneration (regenerateAllCorpusBanners)", () => {
  const sampleCorpus: BlogPost[] = [
    {
      id: "sample-1",
      title: "Sample Quantum Article",
      tags: ["Quantum"],
      excerpt: "Excerpt 1",
      content: "Content 1",
      date: "September 8, 2026",
      readingTime: "5 min",
      author: "Meridian",
      slug: "sample-1",
      arxivLink: "https://arxiv.org/abs/2609.00002",
      bannerSvg: ""
    },
    {
      id: "sample-2",
      title: "Sample Machine Learning Article",
      tags: ["Machine Learning"],
      excerpt: "Excerpt 2",
      content: "Content 2",
      date: "September 8, 2026",
      readingTime: "5 min",
      author: "Meridian",
      slug: "sample-2",
      arxivLink: "https://arxiv.org/abs/2609.00003",
      bannerSvg: ""
    }
  ];

  const result = regenerateAllCorpusBanners(sampleCorpus, 42);
  assert.strictEqual(result.length, 2);
  assert.ok(result[0].bannerSvg.length > 200);
  assert.ok(result[1].bannerSvg.length > 200);
  assert.notStrictEqual(result[0].bannerSvg, result[1].bannerSvg);
});
