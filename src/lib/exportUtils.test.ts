import test from "node:test";
import assert from "node:assert";
import {
  generateApaCitation,
  generateIeeeCitation,
  generateAcmCitation,
  generateBibTeXEntry,
  generateRISReference,
  exportPostToJson,
  validateImportedPostJson
} from "./exportUtils";
import { BlogPost } from "../types";

const mockPost: BlogPost = {
  id: "quantum-photonics-2026",
  title: "Quantum State Tomography in Silicon Photonics",
  slug: "quantum-state-tomography-silicon",
  excerpt: "High-dimensional quantum state reconstruction using integrated optical circuits.",
  content: "# Experimental Results\n\nDensity matrix reconstruction yields 99.4% fidelity.",
  author: "Lucas Kempe, Alice Smith",
  arxivLink: "https://arxiv.org/abs/2608.99999",
  tags: ["Quantum", "Optics", "Silicon Photonics"],
  date: "2026-08-14T10:00:00Z",
  readingTime: "5 min",
  bannerSvg: "<svg></svg>"
};

test("generateApaCitation formats valid APA 7th reference with arXiv ID", () => {
  const apa = generateApaCitation(mockPost);
  assert.ok(apa.includes("Lucas Kempe, Alice Smith"));
  assert.ok(apa.includes("(2026)"));
  assert.ok(apa.includes("Quantum State Tomography in Silicon Photonics."));
  assert.ok(apa.includes("arXiv preprint arXiv:2608.99999."));
});

test("generateIeeeCitation formats IEEE style reference with double quotes", () => {
  const ieee = generateIeeeCitation(mockPost);
  assert.ok(ieee.includes('Lucas Kempe, Alice Smith, "Quantum State Tomography in Silicon Photonics,"'));
  assert.ok(ieee.includes("arXiv:2608.99999"));
  assert.ok(ieee.includes("2026"));
});

test("generateAcmCitation formats ACM style citation", () => {
  const acm = generateAcmCitation(mockPost);
  assert.ok(acm.includes("Lucas Kempe, Alice Smith. 2026."));
  assert.ok(acm.includes("Meridian Research Publications."));
  assert.ok(acm.includes("arXiv:2608.99999"));
});

test("generateBibTeXEntry creates syntactically valid BibTeX entry", () => {
  const bibtex = generateBibTeXEntry(mockPost);
  assert.ok(bibtex.startsWith("@article{quantum_state_tomography_sili,"));
  assert.ok(bibtex.includes("author    = {Lucas Kempe, Alice Smith},"));
  assert.ok(bibtex.includes("title     = {{Quantum State Tomography in Silicon Photonics}},"));
  assert.ok(bibtex.includes("eprint    = {2608.99999},"));
  assert.ok(bibtex.includes("archivePrefix = {arXiv},"));
});

test("generateRISReference produces standard RIS tags (TY, TI, AU, PY, AB, KW, ER)", () => {
  const ris = generateRISReference(mockPost);
  assert.ok(ris.includes("TY  - RPRT"));
  assert.ok(ris.includes("TI  - Quantum State Tomography in Silicon Photonics"));
  assert.ok(ris.includes("AU  - Lucas Kempe, Alice Smith"));
  assert.ok(ris.includes("PY  - 2026"));
  assert.ok(ris.includes("KW  - Quantum"));
  assert.ok(ris.includes("KW  - Optics"));
  assert.ok(ris.includes("KW  - Silicon Photonics"));
  assert.ok(ris.endsWith("ER  - "));
});

test("exportPostToJson and validateImportedPostJson ensure bidirectional integrity", () => {
  const exportedJson = exportPostToJson(mockPost);
  assert.ok(exportedJson.includes('"schemaVersion": "1.0.0"'));

  const validation = validateImportedPostJson(exportedJson);
  assert.strictEqual(validation.valid, true);
  assert.strictEqual(validation.post?.id, mockPost.id);
  assert.strictEqual(validation.post?.title, mockPost.title);
  assert.strictEqual(validation.post?.content, mockPost.content);
});

test("validateImportedPostJson catches missing fields and syntax errors", () => {
  const invalidJson = "{ invalid json here";
  const val1 = validateImportedPostJson(invalidJson);
  assert.strictEqual(val1.valid, false);
  assert.ok(val1.error?.includes("Invalid JSON format"));

  const missingTitle = JSON.stringify({ id: "123", content: "some text" });
  const val2 = validateImportedPostJson(missingTitle);
  assert.strictEqual(val2.valid, false);
  assert.ok(val2.error?.includes("required field 'title'"));

  const missingContent = JSON.stringify({ id: "123", title: "Valid Title" });
  const val3 = validateImportedPostJson(missingContent);
  assert.strictEqual(val3.valid, false);
  assert.ok(val3.error?.includes("required field 'content'"));
});
