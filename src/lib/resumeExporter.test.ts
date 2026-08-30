import test from "node:test";
import assert from "node:assert";
import { RESUME_DATA, ResumeData } from "./resumeData";
import {
  generateMarkdownResume,
  generatePrintableHtmlResume,
  downloadFile,
  printResumeDocument
} from "./resumeExporter";

test("Resume Data Schema & Contact Integrity", async (t) => {
  await t.test("Contact information has valid formats", () => {
    assert.strictEqual(RESUME_DATA.name, "Lucas Kempe");
    assert.strictEqual(RESUME_DATA.email, "lucas.kempe@icloud.com");
    assert.match(RESUME_DATA.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    assert.strictEqual(RESUME_DATA.phone, "+54 11 7132-3723");
    assert.match(RESUME_DATA.phone, /^\+54/);
    assert.strictEqual(RESUME_DATA.linkedin, "https://www.linkedin.com/in/lucaskempe/");
    assert.ok(RESUME_DATA.location.includes("Buenos Aires"));
  });

  await t.test("Title, subtitle, and executive summary are thorough and descriptive", () => {
    assert.ok(RESUME_DATA.title.length > 10);
    assert.ok(RESUME_DATA.subtitle.length > 20);
    assert.ok(RESUME_DATA.summary.length > 150);
    assert.ok(RESUME_DATA.summary.includes("Meridian Journal"));
    assert.ok(RESUME_DATA.summary.includes("quantum optics") || RESUME_DATA.summary.includes("quantum"));
    assert.ok(RESUME_DATA.summary.includes("Apple Neural Engine") || RESUME_DATA.summary.includes("WebGPU"));
  });
});

test("Resume Data: Core Competencies Structure", async (t) => {
  await t.test("Has required competency pillars", () => {
    assert.ok(RESUME_DATA.coreCompetencies.length >= 3);
    const categories = RESUME_DATA.coreCompetencies.map((c) => c.category);
    assert.ok(categories.some((c) => c.includes("Quantum") || c.includes("Physics")));
    assert.ok(categories.some((c) => c.includes("Systems") || c.includes("Edge AI")));
    assert.ok(categories.some((c) => c.includes("Scientific") || c.includes("Research")));
  });

  await t.test("Each competency category contains rich, non-empty skills with no duplicates", () => {
    const allSkills = new Set<string>();
    for (const comp of RESUME_DATA.coreCompetencies) {
      assert.ok(comp.skills.length >= 5, `Category ${comp.category} should have at least 5 skills`);
      for (const skill of comp.skills) {
        assert.ok(skill.trim().length > 2, `Skill name is too short: "${skill}"`);
        assert.ok(!allSkills.has(skill), `Duplicate skill detected across categories: "${skill}"`);
        allSkills.add(skill);
      }
    }
  });
});

test("Resume Data: Professional Experience & Roles", async (t) => {
  await t.test("Chronology and details of leadership roles", () => {
    assert.ok(RESUME_DATA.experience.length >= 2);
    const meridianRole = RESUME_DATA.experience[0];
    assert.strictEqual(meridianRole.organization, "Meridian Informatics / Meridian Journal");
    assert.ok(meridianRole.role.includes("Founder"));
    assert.ok(meridianRole.period.includes("Present"));
    assert.ok(meridianRole.highlights.length >= 4);
    assert.ok(meridianRole.technologies.length >= 6);
  });

  await t.test("Each experience item has actionable highlights and key technologies", () => {
    for (const exp of RESUME_DATA.experience) {
      assert.ok(exp.role.length > 3);
      assert.ok(exp.organization.length > 3);
      assert.ok(exp.period.length > 3);
      assert.ok(exp.location.length > 3);
      assert.ok(exp.highlights.length >= 3);
      assert.ok(exp.technologies.length >= 4);

      for (const highlight of exp.highlights) {
        assert.ok(highlight.length >= 25, `Highlight too brief: "${highlight}"`);
      }
    }
  });
});

test("Resume Data: Research Domains & Theoretical Syntheses", async (t) => {
  await t.test("Captures photonics, quantum error correction, and wavefront shaping", () => {
    assert.ok(RESUME_DATA.researchDomains.length >= 3);
    const domainNames = RESUME_DATA.researchDomains.map((d) => d.domain);
    assert.ok(domainNames.some((d) => d.includes("Photonics") || d.includes("Waveguide")));
    assert.ok(domainNames.some((d) => d.includes("Quantum Computing") || d.includes("Error Correction")));
    assert.ok(domainNames.some((d) => d.includes("Wavefront") || d.includes("Adaptive Optics")));
  });

  await t.test("Key themes and representative papers exist for all domains", () => {
    for (const dom of RESUME_DATA.researchDomains) {
      assert.ok(dom.keyThemes.length >= 3, `Domain ${dom.domain} has fewer than 3 themes`);
      assert.ok(dom.representativePapers.length >= 2, `Domain ${dom.domain} has fewer than 2 papers`);

      for (const paper of dom.representativePapers) {
        assert.ok(paper.length > 10, `Paper title too short: "${paper}"`);
      }
    }
  });
});

test("Resume Data: Selected Publications & arXiv Ingestion", async (t) => {
  await t.test("Validates publication links and metadata", () => {
    assert.ok(RESUME_DATA.keyPublications.length >= 5);

    for (const pub of RESUME_DATA.keyPublications) {
      assert.ok(pub.title.length > 5, `Publication title missing or too short`);
      assert.ok(pub.category.length > 3, `Publication category missing`);
      assert.ok(pub.impactSummary.length > 30, `Publication impact summary too brief: ${pub.title}`);
      assert.ok(pub.keywords.length >= 2, `Publication keywords missing: ${pub.title}`);

      if (pub.arxivLink) {
        assert.match(
          pub.arxivLink,
          /^https:\/\/arxiv\.org\/abs\/\d{4}\.\d{4,5}(v\d+)?$/,
          `Malformed arXiv URL: ${pub.arxivLink}`
        );
      }
    }
  });

  await t.test("Specific seminal Meridian articles are represented", () => {
    const titles = RESUME_DATA.keyPublications.map((p) => p.title);
    assert.ok(titles.some((t) => t.includes("Bound States in the Continuum")));
    assert.ok(titles.some((t) => t.includes("QLDPC") || t.includes("Hook Errors")));
    assert.ok(titles.some((t) => t.includes("Apple Neural Engine")));
    assert.ok(titles.some((t) => t.includes("WebGPU")));
  });
});

test("Resume Data: Technical Keywords Index", async (t) => {
  await t.test("ATS index contains over 25 distinct technical keywords", () => {
    assert.ok(RESUME_DATA.technicalKeywords.length >= 25);
    const set = new Set(RESUME_DATA.technicalKeywords);
    assert.strictEqual(set.size, RESUME_DATA.technicalKeywords.length, "All keywords must be unique");
  });

  await t.test("Keyword coverage spans quantum, photonics, compilers, and cloud edge systems", () => {
    const kw = RESUME_DATA.technicalKeywords.join(" ");
    assert.ok(kw.includes("Quantum Error Correction"));
    assert.ok(kw.includes("QLDPC Codes"));
    assert.ok(kw.includes("Bound States in Continuum"));
    assert.ok(kw.includes("Diffractive Neural Networks"));
    assert.ok(kw.includes("Apple Neural Engine"));
    assert.ok(kw.includes("WebGPU"));
    assert.ok(kw.includes("Model Context Protocol"));
    assert.ok(kw.includes("WebAuthn"));
    assert.ok(kw.includes("Oxford Nanopore"));
  });
});

test("Resume Exporter: Markdown Generator (ATS & Plaintext)", async (t) => {
  const md = generateMarkdownResume();

  await t.test("Generates comprehensive Markdown with required headers", () => {
    assert.ok(md.startsWith("# Lucas Kempe"));
    assert.ok(md.includes("## Executive Summary"));
    assert.ok(md.includes("## Core Competencies & Specializations"));
    assert.ok(md.includes("## Professional Experience"));
    assert.ok(md.includes("## Key Research Domains & Theoretical Syntheses"));
    assert.ok(md.includes("## Selected Publications & Technical Briefs"));
    assert.ok(md.includes("## Comprehensive Technical Keywords"));
  });

  await t.test("Generates valid contact bar with pipes and bold labels", () => {
    assert.ok(md.includes("**Email:** lucas.kempe@icloud.com"));
    assert.ok(md.includes("**LinkedIn:** https://www.linkedin.com/in/lucaskempe/"));
    assert.ok(md.includes("**Phone:** +54 11 7132-3723"));
    assert.ok(md.includes("**Location:** Buenos Aires, Argentina"));
  });

  await t.test("Formats arXiv links cleanly as Markdown hyperlinks", () => {
    assert.ok(md.includes("[arXiv Preprint](https://arxiv.org/abs/"));
  });

  await t.test("Includes footer watermark", () => {
    assert.ok(md.includes("*Generated by Meridian Journal · Scientific Resume Engine*"));
  });

  await t.test("Markdown content size passes depth threshold (> 1500 chars)", () => {
    assert.ok(md.length > 1500);
  });
});

test("Resume Exporter: HTML & PDF Document Generator", async (t) => {
  const html = generatePrintableHtmlResume();

  await t.test("Generates valid HTML5 document structure", () => {
    assert.ok(html.startsWith("<!DOCTYPE html>"));
    assert.ok(html.includes("<html lang=\"en\">"));
    assert.ok(html.includes("<head>"));
    assert.ok(html.includes("</head>"));
    assert.ok(html.includes("<body>"));
    assert.ok(html.includes("</body>"));
    assert.ok(html.includes("</html>"));
  });

  await t.test("Includes typography font imports and print media rules", () => {
    assert.ok(html.includes("fonts.googleapis.com/css2?family=Cinzel"));
    assert.ok(html.includes("JetBrains+Mono"));
    assert.ok(html.includes("Plus+Jakarta+Sans"));
    assert.ok(html.includes("@page {"));
    assert.ok(html.includes("size: A4 portrait;"));
    assert.ok(html.includes("@media print {"));
    assert.ok(html.includes(".no-print {"));
  });

  await t.test("Embeds contact information with clickable mailto and external links", () => {
    assert.ok(html.includes("mailto:lucas.kempe@icloud.com"));
    assert.ok(html.includes("linkedin.com/in/lucaskempe"));
    assert.ok(html.includes("+54 11 7132-3723"));
  });

  await t.test("Embeds all experience items and competency badges", () => {
    assert.ok(html.includes("Founder &amp; Principal Systems Director") || html.includes("Founder & Principal Systems Director"));
    assert.ok(html.includes("comp-card"));
    assert.ok(html.includes("pub-card"));
    assert.ok(html.includes("keyword-badge"));
  });
});

test("Resume Exporter: Browser Download & Print Utilities", async (t) => {
  await t.test("downloadFile handles DOM object creation safely in mocked/browser context", () => {
    // Verify downloadFile is a callable function
    assert.strictEqual(typeof downloadFile, "function");
    
    // In node test environment, verify it doesn't crash when Blob/URL are polyfilled or guarded
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      assert.doesNotThrow(() => {
        downloadFile("test.txt", "Hello World", "text/plain");
      });
    }
  });

  await t.test("printResumeDocument is callable and resilient", () => {
    assert.strictEqual(typeof printResumeDocument, "function");
  });
});
