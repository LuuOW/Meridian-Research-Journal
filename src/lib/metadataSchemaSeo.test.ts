import test from "node:test";
import assert from "node:assert";
import {
  generateArticleJsonLd,
  generateOpenGraphMeta
} from "./metaDataUtils.js";
import { BlogPost } from "../types.js";

const testPost: BlogPost = {
  id: "quantum-photonics-2026",
  title: "Quantum State Transfer in Superconducting-Optomechanical Networks",
  slug: "quantum-state-transfer-optomechanics",
  excerpt: "High-fidelity coherent microwave-to-optical photon conversion.",
  content: "Optomechanical transducers bridge microwave qubits and long-distance optical communication channels.",
  author: "Dr. Elena Vance",
  tags: ["#Quantum", "#Optics", "#Superconductivity"],
  date: "2026-08-18",
  readingTime: "7 min read",
  arxivLink: "https://arxiv.org/abs/2608.14468",
  bannerSvg: "<svg></svg>"
};

test("generateArticleJsonLd builds standard ScholarlyArticle Schema.org object", () => {
  const jsonLd = generateArticleJsonLd(testPost, "https://meridian-journal.org");

  assert.strictEqual(jsonLd["@context"], "https://schema.org");
  assert.strictEqual(jsonLd["@type"], "ScholarlyArticle");
  assert.strictEqual(jsonLd.headline, "Quantum State Transfer in Superconducting-Optomechanical Networks");
  assert.strictEqual(jsonLd.author.name, "Dr. Elena Vance");
  assert.strictEqual(jsonLd.publisher.name, "Meridian Research Journal");
  assert.strictEqual(jsonLd.mainEntityOfPage, "https://meridian-journal.org/post/quantum-state-transfer-optomechanics");
  assert.deepStrictEqual(jsonLd.keywords, ["Quantum", "Optics", "Superconductivity"]);
});

test("generateOpenGraphMeta builds complete OpenGraph and Twitter card metadata", () => {
  const og = generateOpenGraphMeta(testPost, "https://meridian-journal.org");

  assert.strictEqual(og["og:title"], "Quantum State Transfer in Superconducting-Optomechanical Networks");
  assert.strictEqual(og["og:type"], "article");
  assert.strictEqual(og["og:site_name"], "Meridian Research Journal");
  assert.strictEqual(og["twitter:card"], "summary_large_image");
  assert.strictEqual(og["twitter:title"], "Quantum State Transfer in Superconducting-Optomechanical Networks");
});
