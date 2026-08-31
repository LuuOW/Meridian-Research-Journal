import test from "node:test";
import assert from "node:assert";
import {
  normalizeSlug,
  stripSlugTimestampSuffix,
  extractArxivIdFromText,
  resolveBlogSlugOrId
} from "./slugResolver";
import { BlogPost } from "../types";

const mockBlogs: BlogPost[] = [
  {
    id: "generated-1787570419854",
    slug: "towards-optimal-quantum-estimators-for-state-frame-potential-9854",
    title: "Towards Optimal Quantum Estimators for State Frame Potential",
    author: "Alice Researcher",
    date: "2026-08-30",
    readingTime: "9 min read",
    bannerSvg: "<svg></svg>",
    arxivLink: "https://arxiv.org/abs/2408.09854",
    excerpt: "Quantum state tomography estimators",
    content: "Content with $$E=mc^2$$",
    tags: ["Quantum", "Optics"]
  },
  {
    id: "deep-brain-imaging-4879",
    slug: "deep-brain-scattering-correction-two-photon-microscopy",
    title: "Deep-Brain Scattering Correction for Two-Photon Microscopy Beyond 1 mm",
    author: "Bob Scientist",
    date: "2026-08-28",
    readingTime: "11 min read",
    bannerSvg: "<svg></svg>",
    arxivLink: "https://arxiv.org/abs/2608.04879",
    excerpt: "In vivo two-photon microscopy",
    content: "Deep focus imaging",
    tags: ["Biophotonics", "Microscopy"]
  },
  {
    id: "topological-slr-3301",
    slug: "topological-valley-polarized-surface-lattice-resonances",
    title: "Topological Valley Polarized Surface Lattice Resonances",
    author: "Elena Vance",
    date: "2026-08-25",
    readingTime: "8 min read",
    bannerSvg: "<svg></svg>",
    arxivLink: "https://arxiv.org/abs/2608.03301",
    excerpt: "Valley polarization in metasurfaces",
    content: "Pseudoangular momentum",
    tags: ["Nanophotonics", "Topology"]
  }
];

test("normalizeSlug converts text into clean lowercase hyphenated slug without accents", () => {
  assert.strictEqual(
    normalizeSlug("Towards Optimal Quantum Estimators for State Frame Potential!"),
    "towards-optimal-quantum-estimators-for-state-frame-potential"
  );
  assert.strictEqual(
    normalizeSlug("  Théorie des Champs & Électrodynamique Quantique -- 2026  "),
    "theorie-des-champs-electrodynamique-quantique-2026"
  );
  assert.strictEqual(normalizeSlug(""), "");
  assert.strictEqual(normalizeSlug(null as unknown as string), "");
});

test("stripSlugTimestampSuffix removes trailing numeric and hex timestamp hashes", () => {
  assert.strictEqual(
    stripSlugTimestampSuffix("towards-optimal-quantum-estimators-9854"),
    "towards-optimal-quantum-estimators"
  );
  assert.strictEqual(
    stripSlugTimestampSuffix("generated-1787570419854"),
    "generated"
  );
  assert.strictEqual(
    stripSlugTimestampSuffix("topological-slr-abcdef1234"),
    "topological-slr"
  );
  assert.strictEqual(
    stripSlugTimestampSuffix("article-without-hash"),
    "article-without-hash"
  );
  assert.strictEqual(stripSlugTimestampSuffix(""), "");
});

test("extractArxivIdFromText extracts valid 4+4 and 4+5 arXiv identifiers", () => {
  assert.strictEqual(extractArxivIdFromText("https://arxiv.org/abs/2408.09854"), "2408.09854");
  assert.strictEqual(extractArxivIdFromText("arxiv:2608.20992v2"), "2608.20992v2");
  assert.strictEqual(extractArxivIdFromText("Look at paper 2301.12345 in quant-ph"), "2301.12345");
  assert.strictEqual(extractArxivIdFromText("non-arxiv string without id"), null);
  assert.strictEqual(extractArxivIdFromText(""), null);
});

test("resolveBlogSlugOrId Tier 1: exact ID match", () => {
  const result = resolveBlogSlugOrId("generated-1787570419854", mockBlogs);
  assert.strictEqual(result?.id, "generated-1787570419854");
});

test("resolveBlogSlugOrId Tier 2: exact slug match", () => {
  const result = resolveBlogSlugOrId(
    "towards-optimal-quantum-estimators-for-state-frame-potential-9854",
    mockBlogs
  );
  assert.strictEqual(result?.id, "generated-1787570419854");
});

test("resolveBlogSlugOrId Tier 3: base slug match without timestamp suffix", () => {
  const result = resolveBlogSlugOrId(
    "towards-optimal-quantum-estimators-for-state-frame-potential",
    mockBlogs
  );
  assert.strictEqual(result?.id, "generated-1787570419854");
});

test("resolveBlogSlugOrId Tier 4: normalized title match", () => {
  const result = resolveBlogSlugOrId(
    "Deep-Brain Scattering Correction for Two-Photon Microscopy Beyond 1 mm",
    mockBlogs
  );
  assert.strictEqual(result?.id, "deep-brain-imaging-4879");
});

test("resolveBlogSlugOrId Tier 5: arXiv ID match in URL or text", () => {
  const result = resolveBlogSlugOrId("2608.03301", mockBlogs);
  assert.strictEqual(result?.id, "topological-slr-3301");

  const resultUrl = resolveBlogSlugOrId("https://arxiv.org/abs/2408.09854", mockBlogs);
  assert.strictEqual(resultUrl?.id, "generated-1787570419854");
});

test("resolveBlogSlugOrId Tier 6: 4-digit suffix match", () => {
  const result = resolveBlogSlugOrId("article-4879", mockBlogs);
  assert.strictEqual(result?.id, "deep-brain-imaging-4879");
});

test("resolveBlogSlugOrId Tier 7: substring and word match fallback", () => {
  const result = resolveBlogSlugOrId("optimal quantum estimators state frame", mockBlogs);
  assert.strictEqual(result?.id, "generated-1787570419854");
});

test("resolveBlogSlugOrId returns null for empty or non-matching query", () => {
  assert.strictEqual(resolveBlogSlugOrId("", mockBlogs), null);
  assert.strictEqual(resolveBlogSlugOrId("completely-unrelated-query-xyz", mockBlogs), null);
  assert.strictEqual(resolveBlogSlugOrId("test", []), null);
});
