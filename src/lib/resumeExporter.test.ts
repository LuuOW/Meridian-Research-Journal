import test from "node:test";
import assert from "node:assert";
import { RESUME_DATA } from "./resumeData";
import { generateMarkdownResume, generatePrintableHtmlResume } from "./resumeExporter";

test("Resume Data: Contains all verified contact info, experience, and articles", () => {
  assert.strictEqual(RESUME_DATA.name, "Lucas Kempe");
  assert.strictEqual(RESUME_DATA.email, "lucas.kempe@icloud.com");
  assert.strictEqual(RESUME_DATA.phone, "+54 11 7132-3723");
  assert.strictEqual(RESUME_DATA.linkedin, "https://www.linkedin.com/in/lucaskempe/");
  assert.strictEqual(RESUME_DATA.location, "Buenos Aires, Argentina");
  assert.ok(RESUME_DATA.experience.length >= 2);
  assert.ok(RESUME_DATA.coreCompetencies.length >= 3);
  assert.ok(RESUME_DATA.researchDomains.length >= 3);
  assert.ok(RESUME_DATA.keyPublications.length >= 5);
  assert.ok(RESUME_DATA.technicalKeywords.length >= 20);
});

test("Resume Data: Publication entries include valid arXiv preprint links and impact summaries", () => {
  for (const pub of RESUME_DATA.keyPublications) {
    assert.ok(pub.title.length > 5, `Publication missing title: ${JSON.stringify(pub)}`);
    assert.ok(pub.impactSummary.length > 20, `Publication missing impact summary: ${pub.title}`);
    assert.ok(pub.keywords.length >= 2, `Publication missing keywords: ${pub.title}`);
    if (pub.arxivLink) {
      assert.ok(pub.arxivLink.startsWith("https://arxiv.org/abs/"), `Invalid arXiv URL: ${pub.arxivLink}`);
    }
  }
});

test("Resume Data: Research domains capture the primary article topics", () => {
  const domains = RESUME_DATA.researchDomains.map(d => d.domain);
  assert.ok(domains.some(d => d.includes("Photonics") || d.includes("Waveguide")));
  assert.ok(domains.some(d => d.includes("Quantum") || d.includes("Fault-Tolerant")));
  assert.ok(domains.some(d => d.includes("Wavefront") || d.includes("Adaptive")));

  for (const dom of RESUME_DATA.researchDomains) {
    assert.ok(dom.keyThemes.length >= 3, `Domain ${dom.domain} should have at least 3 themes`);
    assert.ok(dom.representativePapers.length >= 2, `Domain ${dom.domain} should have at least 2 representative papers`);
  }
});

test("Resume Exporter: Markdown export is ATS-compliant, well-structured, and non-empty", () => {
  const md = generateMarkdownResume();
  assert.ok(md.includes("# Lucas Kempe"));
  assert.ok(md.includes("lucas.kempe@icloud.com"));
  assert.ok(md.includes("https://www.linkedin.com/in/lucaskempe/"));
  assert.ok(md.includes("+54 11 7132-3723"));
  assert.ok(md.includes("## Executive Summary"));
  assert.ok(md.includes("## Core Competencies"));
  assert.ok(md.includes("## Professional Experience"));
  assert.ok(md.includes("## Key Research Domains"));
  assert.ok(md.includes("## Selected Publications"));
  assert.ok(md.includes("## Comprehensive Technical Keywords"));
  assert.ok(md.length > 1500, "Markdown content should be comprehensive");
});

test("Resume Exporter: HTML printable document contains required styles and print directives", () => {
  const html = generatePrintableHtmlResume();
  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("<html lang=\"en\">"));
  assert.ok(html.includes("Lucas Kempe"));
  assert.ok(html.includes("@page"));
  assert.ok(html.includes("resume-container"));
  assert.ok(html.includes("lucas.kempe@icloud.com"));
  assert.ok(html.includes("Core Competencies"));
  assert.ok(html.includes("Professional Experience"));
  assert.ok(html.includes("Selected Publications"));
  assert.ok(html.includes("keyword-badge"));
  assert.ok(html.includes("@media print"));
});

test("Resume Keywords: ATS technical index covers quantum, photonics, ML compilers, and systems", () => {
  const keywords = RESUME_DATA.technicalKeywords;
  const kwString = keywords.join(" ");

  assert.ok(kwString.includes("Quantum Error Correction"));
  assert.ok(kwString.includes("QLDPC"));
  assert.ok(kwString.includes("Bound States in Continuum"));
  assert.ok(kwString.includes("Apple Neural Engine"));
  assert.ok(kwString.includes("WebGPU"));
  assert.ok(kwString.includes("Model Context Protocol"));
  assert.ok(kwString.includes("Oxford Nanopore"));
});

