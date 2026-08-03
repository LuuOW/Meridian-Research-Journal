import test from "node:test";
import assert from "node:assert";
import { generateArticleJsonLd, generateOpenGraphMeta } from "./metaDataUtils.js";
import { BlogPost } from "../types.js";

const samplePost: BlogPost = {
  id: "meta-post-1",
  title: "Superconducting Cavity Electrodynamics",
  slug: "superconducting-cavity-electrodynamics",
  excerpt: "Measurement of microwave photon decay rates in 3D aluminum cavities.",
  content: "Full text content...",
  date: "August 2, 2026",
  readingTime: "9 min read",
  arxivLink: "https://arxiv.org/abs/2608.20202",
  bannerSvg: "<svg></svg>",
  author: "Dr. Marcus Vance",
  tags: ["Superconductivity", "Quantum Optics"]
};

test("generateArticleJsonLd builds Schema.org ScholarlyArticle metadata", () => {
  const jsonLd = generateArticleJsonLd(samplePost);

  assert.strictEqual(jsonLd["@context"], "https://schema.org");
  assert.strictEqual(jsonLd["@type"], "ScholarlyArticle");
  assert.strictEqual(jsonLd.headline, "Superconducting Cavity Electrodynamics");
  assert.strictEqual(jsonLd.author.name, "Dr. Marcus Vance");
  assert.strictEqual(
    jsonLd.mainEntityOfPage,
    "https://meridian-journal.org/post/superconducting-cavity-electrodynamics"
  );
  assert.deepStrictEqual(jsonLd.keywords, ["Superconductivity", "Quantum Optics"]);
});

test("generateOpenGraphMeta produces key-value pairs for social tags", () => {
  const og = generateOpenGraphMeta(samplePost);

  assert.strictEqual(og["og:title"], "Superconducting Cavity Electrodynamics");
  assert.strictEqual(
    og["og:description"],
    "Measurement of microwave photon decay rates in 3D aluminum cavities."
  );
  assert.strictEqual(og["og:type"], "article");
  assert.strictEqual(
    og["og:url"],
    "https://meridian-journal.org/post/superconducting-cavity-electrodynamics"
  );
  assert.strictEqual(og["twitter:card"], "summary_large_image");
});

test("Metadata functions handle null or empty post object without crashing", () => {
  const jsonLdNull = generateArticleJsonLd(null as unknown as BlogPost);
  assert.strictEqual(jsonLdNull.headline, "Untitled Article");

  const ogNull = generateOpenGraphMeta(null as unknown as BlogPost);
  assert.strictEqual(ogNull["og:title"], "Meridian Research Journal");
});
