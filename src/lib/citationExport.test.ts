import test from "node:test";
import assert from "node:assert";
import {
  extractYear,
  generateBibTeX,
  generateAPA,
  generateMLA,
  generateRIS
} from "./citationExport.js";
import { BlogPost } from "../types.js";

const samplePost: BlogPost = {
  id: "test-post-1",
  title: "Quantum Entanglement in Nanophotonic Waveguides",
  slug: "quantum-entanglement-nanophotonic-waveguides",
  excerpt: "Exploring non-linear optics.",
  content: "Full scientific article content.",
  date: "August 15, 2026",
  readingTime: "8 min read",
  arxivLink: "https://arxiv.org/abs/2608.12345",
  bannerSvg: "<svg></svg>",
  author: "Dr. Elena Vance",
  tags: ["Quantum Optics", "Nanophotonics"]
};

test("extractYear extracts 4-digit year from date string or falls back", () => {
  assert.strictEqual(extractYear("August 15, 2026"), "2026");
  assert.strictEqual(extractYear("2024-11-05"), "2024");
  assert.strictEqual(extractYear("invalid-date"), new Date().getFullYear().toString());
  assert.strictEqual(extractYear(""), new Date().getFullYear().toString());
});

test("generateBibTeX generates correct BibTeX entry", () => {
  const bib = generateBibTeX(samplePost);
  assert.ok(bib.includes("@article{quantum-entanglement-nanophotonic-waveguides,"));
  assert.ok(bib.includes("author    = {Dr. Elena Vance}"));
  assert.ok(bib.includes("title     = {Quantum Entanglement in Nanophotonic Waveguides}"));
  assert.ok(bib.includes("year      = {2026}"));
  assert.ok(bib.includes("url       = {https://arxiv.org/abs/2608.12345}"));
});

test("generateAPA formats post correctly in APA format", () => {
  const apa = generateAPA(samplePost);
  assert.strictEqual(
    apa,
    "Dr. Elena Vance. (2026). Quantum Entanglement in Nanophotonic Waveguides. Meridian Research Journal. https://arxiv.org/abs/2608.12345"
  );
});

test("generateMLA formats post correctly in MLA format", () => {
  const mla = generateMLA(samplePost);
  assert.strictEqual(
    mla,
    'Dr. Elena Vance. "Quantum Entanglement in Nanophotonic Waveguides." Meridian Research Journal, 2026, https://arxiv.org/abs/2608.12345.'
  );
});

test("generateRIS produces valid RIS block lines", () => {
  const ris = generateRIS(samplePost);
  assert.ok(ris.includes("TY  - JOUR"));
  assert.ok(ris.includes("TI  - Quantum Entanglement in Nanophotonic Waveguides"));
  assert.ok(ris.includes("AU  - Dr. Elena Vance"));
  assert.ok(ris.includes("JO  - Meridian Research Journal"));
  assert.ok(ris.includes("PY  - 2026"));
  assert.ok(ris.includes("ER  -"));
});

test("Citation functions handle missing/empty post fields gracefully", () => {
  const emptyPost: BlogPost = {
    id: "empty",
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    date: "",
    readingTime: "",
    arxivLink: "",
    bannerSvg: "",
    author: "",
    tags: []
  };

  assert.ok(generateBibTeX(emptyPost).includes("Meridian Research Journal"));
  assert.ok(generateAPA(emptyPost).includes("Untitled Article"));
  assert.ok(generateMLA(emptyPost).includes("Untitled Article"));
  assert.ok(generateRIS(emptyPost).includes("TY  - JOUR"));
});

test("Citation functions handle posts without arxivLink and fallback slug to id", () => {
  const postNoLink: BlogPost = {
    id: "custom-id-99",
    title: "Cavity QED & Non-Linear Optics",
    slug: "",
    excerpt: "Excerpt",
    content: "Content",
    date: "2025",
    readingTime: "3 min read",
    arxivLink: "",
    bannerSvg: "",
    author: "Alice & Bob",
    tags: []
  };

  const bib = generateBibTeX(postNoLink);
  assert.ok(bib.includes("@article{custom-id-99,"), "BibTeX key should fall back to ID if slug is empty");
  assert.ok(bib.includes("url       = {https://meridian-journal.org}"), "BibTeX url should fall back to journal URL if arxivLink is empty");

  const apa = generateAPA(postNoLink);
  assert.ok(apa.endsWith("https://meridian-journal.org"), "APA should end with default journal link when no arxivLink is present");

  const ris = generateRIS(postNoLink);
  assert.ok(ris.includes("UR  - https://meridian-journal.org"));
});
