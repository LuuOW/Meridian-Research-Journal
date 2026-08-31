import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PRELOADED_BLOGS } from "../data";
import { RESUME_DATA } from "./resumeData";
import { 
  generateMarkdownResume, 
  generatePrintableHtmlResume 
} from "./resumeExporter";
import { 
  isMathExpression, 
  sanitizeLatexFormula 
} from "./mathUtils";
import { 
  extractTableOfContents, 
  slugifyHeading 
} from "./tocUtils";
import { 
  calculateNormalizedCursor, 
  computeRayTracedLightState, 
  getDefaultLightState 
} from "./rayTracingUtils";
import { calculateReadingTimeMinutes } from "./readingTime";
import { formatViews, calculateBaseViews, calculateActiveReaders } from "./viewCounter";

describe("Sitemap, SEO & Static Assets Suite", () => {
  test("public/sitemap.xml and root sitemap.xml exist and are well-formed XML", () => {
    const publicSitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
    const rootSitemapPath = path.join(process.cwd(), "sitemap.xml");

    assert.ok(fs.existsSync(publicSitemapPath), "public/sitemap.xml must exist");
    assert.ok(fs.existsSync(rootSitemapPath), "root sitemap.xml must exist");

    const publicContent = fs.readFileSync(publicSitemapPath, "utf-8");
    const rootContent = fs.readFileSync(rootSitemapPath, "utf-8");

    assert.ok(publicContent.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
    assert.ok(publicContent.includes("<urlset xmlns="));
    assert.ok(publicContent.includes("</urlset>"));

    assert.strictEqual(
      publicContent.trim(),
      rootContent.trim(),
      "public/sitemap.xml and root sitemap.xml must remain in exact synchronization"
    );
  });

  test("sitemap.xml homepage entry is updated to 2026-08-31 with priority 1.0", () => {
    const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
    const content = fs.readFileSync(sitemapPath, "utf-8");

    assert.ok(content.includes("<loc>https://ask-meridian.uk/</loc>"));
    assert.ok(content.includes("<lastmod>2026-08-31</lastmod>"));
    assert.ok(content.includes("<priority>1.0</priority>"));
    assert.ok(content.includes("<changefreq>daily</changefreq>"));
  });

  test("sitemap.xml contains loc entries for all published articles in PRELOADED_BLOGS dataset", () => {
    const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
    const content = fs.readFileSync(sitemapPath, "utf-8");

    PRELOADED_BLOGS.forEach(blog => {
      const expectedUrl = `https://ask-meridian.uk/blog/${blog.slug}`;
      assert.ok(
        content.includes(expectedUrl),
        `sitemap.xml is missing entry for article slug: ${blog.slug}`
      );
    });
  });

  test("robots.txt is valid and points to the authoritative sitemap", () => {
    const robotsPath = path.join(process.cwd(), "public", "robots.txt");
    assert.ok(fs.existsSync(robotsPath), "robots.txt must exist in /public");

    const content = fs.readFileSync(robotsPath, "utf-8");
    assert.ok(content.includes("User-agent: *"));
    assert.ok(content.includes("Allow: /"));
    assert.ok(content.includes("Allow: /blog/"));
    assert.ok(content.includes("Allow: /ads.txt"));
    assert.ok(content.includes("Allow: /sitemap.xml"));
    assert.ok(content.includes("Sitemap: https://ask-meridian.uk/sitemap.xml"));
  });

  test("ads.txt exists and contains legitimate ad seller records", () => {
    const adsPath = path.join(process.cwd(), "public", "ads.txt");
    assert.ok(fs.existsSync(adsPath), "ads.txt must exist in /public");

    const content = fs.readFileSync(adsPath, "utf-8");
    assert.ok(content.includes("google.com, pub-7734562716191044, DIRECT, f08c47fec0942fa0"));
  });
});

describe("Service Worker & Advertising MultiTags Suite", () => {
  test("sw.js and service-worker.js exist in /public and have matching service worker scripts", () => {
    const swPath = path.join(process.cwd(), "public", "sw.js");
    const serviceWorkerPath = path.join(process.cwd(), "public", "service-worker.js");

    assert.ok(fs.existsSync(swPath), "/public/sw.js must exist");
    assert.ok(fs.existsSync(serviceWorkerPath), "/public/service-worker.js must exist");

    const swContent = fs.readFileSync(swPath, "utf-8");
    const serviceWorkerContent = fs.readFileSync(serviceWorkerPath, "utf-8");

    assert.ok(swContent.includes('"domain": "5gvci.com"'));
    assert.ok(swContent.includes('"zoneId": 11654383'));
    assert.ok(swContent.includes("importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')"));
    assert.strictEqual(swContent.trim(), serviceWorkerContent.trim());
  });

  test("index.html includes all required multi-tag and ad monetization scripts", () => {
    const indexPath = path.join(process.cwd(), "index.html");
    assert.ok(fs.existsSync(indexPath), "index.html must exist");

    const content = fs.readFileSync(indexPath, "utf-8");
    assert.ok(content.includes('src="https://quge5.com/88/tag.min.js"'));
    assert.ok(content.includes('data-zone="273258"'));
    assert.ok(content.includes('src="https://omg10.com/4/11690699"'));
    assert.ok(content.includes('name="monetag"'));
    assert.ok(content.includes('content="61b2a2175718b425ada1eedb07f24112"'));
  });
});

describe("Resume Data & Exporters Deep Invariants", () => {
  test("RESUME_DATA contact coordinates and author credentials are valid", () => {
    assert.strictEqual(RESUME_DATA.name, "Lucas Kempe");
    assert.strictEqual(RESUME_DATA.email, "lucas.kempe@icloud.com");
    assert.strictEqual(RESUME_DATA.phone, "+54 11 7132-3723");
    assert.ok(RESUME_DATA.title.length > 5);
    assert.ok(RESUME_DATA.summary.length > 100);
    assert.ok(RESUME_DATA.location.includes("Argentina"));
  });

  test("RESUME_DATA core competencies encompass quantum, photonics and edge AI pipelines", () => {
    assert.ok(RESUME_DATA.coreCompetencies.length >= 3);
    const allSkills = RESUME_DATA.coreCompetencies.flatMap(c => c.skills);
    assert.ok(allSkills.includes("Quantum Error Correction (QEC & QLDPC)"));
    assert.ok(allSkills.includes("Temporal Coupled-Mode Theory (TCMT)"));
    assert.ok(allSkills.includes("Wavefront Shaping & Adaptive Optics"));
  });

  test("generateMarkdownResume produces valid markdown with complete sections and contact block", () => {
    const md = generateMarkdownResume();
    assert.ok(typeof md === "string");
    assert.ok(md.startsWith("# Lucas Kempe"));
    assert.ok(md.includes("lucas.kempe@icloud.com"));
    assert.ok(md.includes("+54 11 7132-3723"));
    assert.ok(md.includes("## Executive Summary"));
    assert.ok(md.includes("## Core Competencies"));
    assert.ok(md.includes("## Professional Experience"));
    assert.ok(md.includes("## Key Research Domains"));
    assert.ok(md.includes("## Selected Publications"));
    assert.ok(md.includes("## Comprehensive Technical Keywords"));
    assert.ok(md.includes("Meridian Journal"));
  });

  test("generatePrintableHtmlResume produces clean HTML5 with print styles and semantic tags", () => {
    const html = generatePrintableHtmlResume();
    assert.ok(typeof html === "string");
    assert.ok(html.startsWith("<!DOCTYPE html>"));
    assert.ok(html.includes("<html lang=\"en\">"));
    assert.ok(html.includes("<title>Lucas Kempe — Curriculum Vitae / Resume</title>"));
    assert.ok(html.includes("@media print"));
    assert.ok(html.includes("Lucas Kempe"));
    assert.ok(html.includes("lucas.kempe@icloud.com"));
    assert.ok(html.includes("+54 11 7132-3723"));
    assert.ok(html.includes("</html>"));
  });
});

describe("Math AST & Article Typography Stress Test", () => {
  test("All published articles pass LaTeX parsing, slugification, and reading time checks", () => {
    assert.ok(PRELOADED_BLOGS.length >= 30, `Expected at least 30 articles, found: ${PRELOADED_BLOGS.length}`);

    PRELOADED_BLOGS.forEach(blog => {
      // 1. Slugs & Titles
      assert.ok(blog.id, "Article must have an id");
      assert.ok(blog.slug && blog.slug.length > 5, `Article ${blog.id} has invalid slug`);
      assert.ok(blog.title && blog.title.length > 5, `Article ${blog.id} has invalid title`);

      // 2. Reading time calculation
      const readingTime = calculateReadingTimeMinutes(blog.content);
      assert.ok(readingTime >= 1, `Article ${blog.id} reading time must be >= 1 min`);
      assert.ok(Number.isFinite(readingTime), `Article ${blog.id} reading time must be finite`);

      // 3. View counter formatting
      const baseViews = calculateBaseViews(blog.id);
      assert.ok(baseViews > 0, `Base views for ${blog.id} must be > 0`);
      const formatted = formatViews(baseViews);
      assert.ok(typeof formatted === "string" && formatted.length > 0);

      // 4. Active readers calculation
      const activeReaders = calculateActiveReaders(blog.id);
      assert.ok(activeReaders >= 1, `Active readers for ${blog.id} must be >= 1`);

      // 5. Table of contents parsing
      const toc = extractTableOfContents(blog.content);
      assert.ok(Array.isArray(toc));
      toc.forEach(item => {
        assert.ok(item.level >= 1 && item.level <= 6);
        assert.ok(item.text.length > 0);
        assert.ok(item.id.length > 0);
      });
    });
  });

  test("Latex sanitizer handles exotic bracketings and nested delimiters", () => {
    assert.strictEqual(sanitizeLatexFormula("\\[ \\hat{H} \\left| \\psi \\right\\rangle = E \\left| \\psi \\right\\rangle \\]"), "\\hat{H} \\left| \\psi \\right\\rangle = E \\left| \\psi \\right\\rangle");
    assert.strictEqual(sanitizeLatexFormula("$$ \\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} $$"), "\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J}");
    assert.strictEqual(sanitizeLatexFormula(""), "");
    assert.strictEqual(sanitizeLatexFormula(null as any), "");
  });

  test("Math expression detector reliably flags equations while ignoring currency and prose", () => {
    assert.ok(isMathExpression("\\psi(x,t)"));
    assert.ok(isMathExpression("\\int_{0}^{\\infty} e^{-x^2} dx"));
    assert.ok(isMathExpression("\\sum_{k=1}^N a_k"));
    assert.ok(isMathExpression("x^2 + y^2 = r^2"));
    assert.ok(isMathExpression("\\alpha + \\beta = \\gamma"));

    assert.strictEqual(isMathExpression("100"), false);
    assert.strictEqual(isMathExpression("49.99"), false);
    assert.strictEqual(isMathExpression("10k"), false);
    assert.strictEqual(isMathExpression("30M"), false);
    assert.strictEqual(isMathExpression("This is standard English prose with no formulas"), false);
    assert.strictEqual(isMathExpression(""), false);
  });

  test("Slugify heading produces safe, URL-friendly identifiers", () => {
    assert.strictEqual(slugifyHeading("Introduction & Theoretical Foundations"), "introduction-theoretical-foundations");
    assert.strictEqual(slugifyHeading("2.1 Quantum Error Correction (QLDPC)"), "21-quantum-error-correction-qldpc");
    assert.strictEqual(slugifyHeading("Wavefront Shaping: Beyond 1 mm Depth!"), "wavefront-shaping-beyond-1-mm-depth");
  });
});

describe("Ray-Tracing Specular Lighting Vector Engine Suite", () => {
  test("calculateNormalizedCursor accurately normalizes cursor to [-1, 1] range", () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 };
    const center = calculateNormalizedCursor(100, 100, rect);
    assert.strictEqual(center.normX, 0);
    assert.strictEqual(center.normY, 0);

    const topLeft = calculateNormalizedCursor(0, 0, rect);
    assert.strictEqual(topLeft.normX, -1);
    assert.strictEqual(topLeft.normY, -1);

    const bottomRight = calculateNormalizedCursor(200, 200, rect);
    assert.strictEqual(bottomRight.normX, 1);
    assert.strictEqual(bottomRight.normY, 1);

    // Clamping on out-of-bounds
    const clamped = calculateNormalizedCursor(500, -200, rect);
    assert.strictEqual(clamped.normX, 1);
    assert.strictEqual(clamped.normY, -1);
  });

  test("computeRayTracedLightState computes smooth angle, specular highlights, and shadow offsets", () => {
    const state = computeRayTracedLightState(0.5, -0.5);
    assert.ok(state.angle >= 0 && state.angle <= 360);
    assert.ok(state.lightX >= 0 && state.lightX <= 100);
    assert.ok(state.lightY >= 0 && state.lightY <= 100);
    assert.ok(typeof state.shadowX === "number");
    assert.ok(typeof state.shadowY === "number");
    assert.ok(typeof state.tiltX === "number");
    assert.ok(typeof state.tiltY === "number");
  });

  test("getDefaultLightState returns consistent centered resting coordinates", () => {
    const defaultState = getDefaultLightState();
    assert.strictEqual(defaultState.lightX, 50);
    assert.strictEqual(defaultState.lightY, 50);
    assert.strictEqual(defaultState.angle, 45);
    assert.strictEqual(defaultState.shadowX, 0);
    assert.strictEqual(defaultState.shadowY, 12);
  });
});
