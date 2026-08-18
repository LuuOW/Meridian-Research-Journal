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
} from "./exportUtils.js";
import {
  generateBibTeX,
  generateAPA,
  generateMLA,
  generateRIS
} from "./citationExport.js";
import { BlogPost } from "../types.js";

const complexPost: BlogPost = {
  id: "quantum-optomechanics-2026",
  title: "Quantum Ground-State Cooling of Microtoroidal Resonators",
  slug: "quantum-ground-state-cooling-microtoroid",
  excerpt: "Laser sideband cooling in high-Q optical microcavities.",
  content: "Detailed experimental analysis of quantum backaction evasion and optomechanical phonon cooling.",
  author: "Dr. Elena Vance, Dr. Lucas Kempe, Prof. Arthur Pendelton",
  arxivLink: "https://arxiv.org/abs/2608.54321",
  tags: ["Optomechanics", "Quantum Optics", "Nanophotonics"],
  date: "2026-08-16T14:30:00Z",
  readingTime: "7 min read",
  bannerSvg: "<svg></svg>"
};

test("generateApaCitation handles multiple authors and year extraction", () => {
  const apa = generateApaCitation(complexPost);
  assert.ok(apa.includes("Dr. Elena Vance, Dr. Lucas Kempe, Prof. Arthur Pendelton"));
  assert.ok(apa.includes("(2026)."));
  assert.ok(apa.includes("Quantum Ground-State Cooling of Microtoroidal Resonators."));
  assert.ok(apa.includes("arXiv preprint arXiv:2608.54321."));
});

test("generateIeeeCitation formats numeric brackets and journal info", () => {
  const ieee = generateIeeeCitation(complexPost);
  assert.ok(ieee.includes('Dr. Elena Vance, Dr. Lucas Kempe, Prof. Arthur Pendelton, "Quantum Ground-State Cooling of Microtoroidal Resonators,"'));
  assert.ok(ieee.includes("Meridian Research Preprint"));
  assert.ok(ieee.includes("2026"));
  assert.ok(ieee.includes("arXiv:2608.54321"));
});

test("generateAcmCitation formats ACM bibliographic style", () => {
  const acm = generateAcmCitation(complexPost);
  assert.ok(acm.includes("Dr. Elena Vance, Dr. Lucas Kempe, Prof. Arthur Pendelton. 2026."));
  assert.ok(acm.includes("Quantum Ground-State Cooling of Microtoroidal Resonators."));
  assert.ok(acm.includes("Meridian Research Publications."));
});

test("generateBibTeXEntry generates complete BibTeX fields with cleaned key", () => {
  const bibtex = generateBibTeXEntry(complexPost);
  assert.ok(bibtex.startsWith("@article{quantum_ground_state_cooling_m,"));
  assert.ok(bibtex.includes("author    = {Dr. Elena Vance, Dr. Lucas Kempe, Prof. Arthur Pendelton},"));
  assert.ok(bibtex.includes("title     = {{Quantum Ground-State Cooling of Microtoroidal Resonators}},"));
  assert.ok(bibtex.includes("journal   = {Meridian Research Preprints},"));
  assert.ok(bibtex.includes("year      = {2026},"));
  assert.ok(bibtex.includes("eprint    = {2608.54321},"));
  assert.ok(bibtex.includes("archivePrefix = {arXiv},"));
});

test("generateRISReference maps tags to KW keys and ends with ER tag", () => {
  const ris = generateRISReference(complexPost);
  assert.ok(ris.includes("TY  - RPRT"));
  assert.ok(ris.includes("TI  - Quantum Ground-State Cooling of Microtoroidal Resonators"));
  assert.ok(ris.includes("AU  - Dr. Elena Vance, Dr. Lucas Kempe, Prof. Arthur Pendelton"));
  assert.ok(ris.includes("KW  - Optomechanics"));
  assert.ok(ris.includes("KW  - Quantum Optics"));
  assert.ok(ris.includes("KW  - Nanophotonics"));
  assert.ok(ris.endsWith("ER  - "));
});

test("citationExport module produces consistent MLA and BibTeX records", () => {
  const bib = generateBibTeX(complexPost);
  const mla = generateMLA(complexPost);
  const apa = generateAPA(complexPost);
  const ris = generateRIS(complexPost);

  assert.ok(bib.includes("@article{quantum-ground-state-cooling-microtoroid,"));
  assert.ok(mla.includes('Dr. Elena Vance, Dr. Lucas Kempe, Prof. Arthur Pendelton. "Quantum Ground-State Cooling of Microtoroidal Resonators."'));
  assert.ok(apa.includes("Dr. Elena Vance, Dr. Lucas Kempe, Prof. Arthur Pendelton. (2026)."));
  assert.ok(ris.includes("TY  - JOUR"));
});

test("exportPostToJson and validateImportedPostJson validate full round-trip payload", () => {
  const jsonStr = exportPostToJson(complexPost);
  const parsed = JSON.parse(jsonStr);

  assert.strictEqual(parsed.schemaVersion, "1.0.0");
  assert.strictEqual(parsed.blogPost.id, complexPost.id);
  assert.strictEqual(parsed.blogPost.tags.length, 3);

  const val = validateImportedPostJson(jsonStr);
  assert.strictEqual(val.valid, true);
  assert.strictEqual(val.post?.id, complexPost.id);
  assert.strictEqual(val.post?.title, complexPost.title);
});

test("validateImportedPostJson rejects malformed inputs with descriptive errors", () => {
  assert.strictEqual(validateImportedPostJson("").valid, false);
  assert.strictEqual(validateImportedPostJson("null").valid, false);
  assert.strictEqual(validateImportedPostJson(JSON.stringify({ notPost: true })).valid, false);

  const missingTitle = JSON.stringify({ id: "p1", content: "some content" });
  const val = validateImportedPostJson(missingTitle);
  assert.strictEqual(val.valid, false);
  assert.ok(val.error?.includes("title"));
});
