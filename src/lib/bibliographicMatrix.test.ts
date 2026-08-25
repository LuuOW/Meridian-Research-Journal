import test from "node:test";
import assert from "node:assert";
import {
  extractYear,
  generateBibTeX,
  generateAPA,
  generateMLA,
  generateRIS
} from "./citationExport";
import { BlogPost } from "../types";

const testPost: BlogPost = {
  id: "arxiv-2608-9999",
  title: "Non-Hermitian Topological Photonics in Active Waveguide Arrays & Resonators",
  slug: "non-hermitian-topological-photonics-active-waveguides",
  excerpt: "Exploring exceptional points, skin effect, and parity-time symmetry in photonic platforms.",
  content: "Non-Hermitian systems exhibit complex eigenvalues and defective Hamiltonians.",
  tags: ["Photonics", "Topology", "Non-Hermitian Physics"],
  author: "Lucas Kempe, Elena Vance, Marcus Brody",
  date: "2026-08-20T00:00:00Z",
  readingTime: "8 min read",
  arxivLink: "https://arxiv.org/abs/2608.9999",
  bannerSvg: "<svg></svg>",
  views: 1840
};

test("Year Extraction: extracts 4-digit publication years or falls back to current year", () => {
  assert.strictEqual(extractYear("August 20, 2026"), "2026");
  assert.strictEqual(extractYear("2025-11-04T00:00:00Z"), "2025");
  assert.strictEqual(extractYear("May 1999"), "1999");
  assert.strictEqual(extractYear(""), new Date().getFullYear().toString());
  assert.strictEqual(extractYear(null as any), new Date().getFullYear().toString());
});

test("BibTeX Generation: produces valid citation entry with journal and URL", () => {
  const bibtex = generateBibTeX(testPost);
  assert.ok(bibtex.startsWith("@article{"));
  assert.ok(bibtex.includes("author    = {Lucas Kempe, Elena Vance, Marcus Brody}"));
  assert.ok(bibtex.includes("title     = {Non-Hermitian Topological Photonics in Active Waveguide Arrays & Resonators}"));
  assert.ok(bibtex.includes("journal   = {Meridian Research Journal}"));
  assert.ok(bibtex.includes("year      = {2026}"));
  assert.ok(bibtex.includes("url       = {https://arxiv.org/abs/2608.9999}"));
});

test("APA Generation: produces standardized APA citation with journal name and URL", () => {
  const apa = generateAPA(testPost);
  assert.ok(apa.includes("Lucas Kempe, Elena Vance, Marcus Brody. (2026)."));
  assert.ok(apa.includes("Non-Hermitian Topological Photonics in Active Waveguide Arrays & Resonators."));
  assert.ok(apa.includes("Meridian Research Journal."));
  assert.ok(apa.includes("https://arxiv.org/abs/2608.9999"));
});

test("MLA Generation: produces standardized MLA citation with quotes and publication venue", () => {
  const mla = generateMLA(testPost);
  assert.ok(mla.includes('Lucas Kempe, Elena Vance, Marcus Brody. "Non-Hermitian Topological Photonics in Active Waveguide Arrays & Resonators."'));
  assert.ok(mla.includes("Meridian Research Journal, 2026,"));
  assert.ok(mla.includes("https://arxiv.org/abs/2608.9999"));
});

test("RIS Generation: formats research citation for Zotero and EndNote import", () => {
  const ris = generateRIS(testPost);
  assert.ok(ris.includes("TY  - JOUR"));
  assert.ok(ris.includes("TI  - Non-Hermitian Topological Photonics in Active Waveguide Arrays & Resonators"));
  assert.ok(ris.includes("AU  - Lucas Kempe, Elena Vance, Marcus Brody"));
  assert.ok(ris.includes("JO  - Meridian Research Journal"));
  assert.ok(ris.includes("PY  - 2026"));
  assert.ok(ris.includes("UR  - https://arxiv.org/abs/2608.9999"));
  assert.ok(ris.includes("ER  -"));
});

test("Null and Missing Post Safety: handles empty inputs without throwing", () => {
  assert.strictEqual(generateBibTeX(null as any), "");
  assert.strictEqual(generateAPA(null as any), "");
  assert.strictEqual(generateMLA(null as any), "");
  assert.strictEqual(generateRIS(null as any), "");
});
