import test from "node:test";
import assert from "node:assert";
import {
  extractArxivId,
  extractSvgString,
  cleanJsonText,
  generateSlug,
  isWeekend,
  parseArxivXml,
  parseArxivFeedXml
} from "./arxivUtils.js";

test("extractArxivId accurately parses arXiv URLs including latest 2026 preprints", () => {
  // Test with user provided 2026 preprints
  assert.strictEqual(extractArxivId("https://arxiv.org/pdf/2608.14468"), "2608.14468");
  assert.strictEqual(extractArxivId("https://arxiv.org/pdf/2608.16857"), "2608.16857");
  assert.strictEqual(extractArxivId("https://arxiv.org/abs/2608.14468v2"), "2608.14468");
  assert.strictEqual(extractArxivId("https://arxiv.org/pdf/2608.16857.pdf"), "2608.16857");

  // Bare IDs
  assert.strictEqual(extractArxivId("2608.14468"), "2608.14468");
  assert.strictEqual(extractArxivId("2608.14468v1"), "2608.14468");
  assert.strictEqual(extractArxivId("2401.00123"), "2401.00123");

  // Invalid or empty strings
  assert.strictEqual(extractArxivId(""), null);
  assert.strictEqual(extractArxivId("https://google.com/search?q=arxiv"), null);
  assert.strictEqual(extractArxivId("not-an-arxiv-id"), null);
});

test("extractSvgString extracts valid SVG markup and strips markdown fences", () => {
  const markdownWrapped = "```xml\n<svg width=\"100\" height=\"100\"><circle r=\"10\"/></svg>\n```";
  assert.strictEqual(extractSvgString(markdownWrapped), "<svg width=\"100\" height=\"100\"><circle r=\"10\"/></svg>");

  const rawSvg = "<svg viewBox=\"0 0 800 400\"><rect width=\"800\" height=\"400\" fill=\"#000\"/></svg>";
  assert.strictEqual(extractSvgString(rawSvg), rawSvg);

  assert.strictEqual(extractSvgString(""), "");
  assert.strictEqual(extractSvgString("No SVG in here"), "No SVG in here");
});

test("cleanJsonText repairs LLM markdown blocks and handles LaTeX escape sequences", () => {
  const jsonWithLatex = "```json\n{\n  \"title\": \"Quantum Mechanics\",\n  \"formula\": \"\\\\frac{1}{\\\\sqrt{2}}\\\\psi\"\n}\n```";
  const cleaned = cleanJsonText(jsonWithLatex);
  const parsed = JSON.parse(cleaned);

  assert.strictEqual(parsed.title, "Quantum Mechanics");
  assert.ok(parsed.formula.includes("frac"));
});

test("generateSlug creates lowercase URL-safe slugs with hyphens", () => {
  assert.strictEqual(
    generateSlug("Quantum Ground-State Cooling of Resonators!"),
    "quantum-ground-state-cooling-of-resonators"
  );
  assert.strictEqual(
    generateSlug("   Nonlinear Optics: Kerr Combs (2026)   "),
    "nonlinear-optics-kerr-combs-2026"
  );
  assert.strictEqual(generateSlug(""), "");
});

test("isWeekend identifies weekend vs weekday dates accurately", () => {
  // Saturday, August 15, 2026
  const saturday = new Date("2026-08-15T12:00:00Z");
  assert.strictEqual(isWeekend(saturday), true);

  // Sunday, August 16, 2026
  const sunday = new Date("2026-08-16T12:00:00Z");
  assert.strictEqual(isWeekend(sunday), true);

  // Tuesday, August 18, 2026
  const tuesday = new Date("2026-08-18T12:00:00Z");
  assert.strictEqual(isWeekend(tuesday), false);

  // Wednesday, August 19, 2026
  const wednesday = new Date("2026-08-19T12:00:00Z");
  assert.strictEqual(isWeekend(wednesday), false);
});

test("parseArxivXml parses entry content and multi-author lists", () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>arXiv Query</title>
  <entry>
    <id>http://arxiv.org/abs/2608.14468v1</id>
    <title>Optical Parametric Oscillations in Microresonators</title>
    <summary>We demonstrate low-threshold Kerr soliton generation.</summary>
    <author><name>Dr. Alice Vance</name></author>
    <author><name>Dr. Bob Miller</name></author>
  </entry>
</feed>`;

  const meta = parseArxivXml(xml);
  assert.strictEqual(meta.title, "Optical Parametric Oscillations in Microresonators");
  assert.strictEqual(meta.summary, "We demonstrate low-threshold Kerr soliton generation.");
  assert.strictEqual(meta.authors, "Dr. Alice Vance, Dr. Bob Miller");
});

test("parseArxivFeedXml parses multiple entries from search feed", () => {
  const feedXml = `<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2608.14468v1</id>
    <title>Paper One</title>
    <summary>Summary of Paper One</summary>
    <author><name>Author A</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2608.16857v1</id>
    <title>Paper Two</title>
    <summary>Summary of Paper Two</summary>
    <author><name>Author B</name></author>
  </entry>
</feed>`;

  const papers = parseArxivFeedXml(feedXml);
  assert.strictEqual(papers.length, 2);
  assert.strictEqual(papers[0].id, "2608.14468v1");
  assert.strictEqual(papers[0].title, "Paper One");
  assert.strictEqual(papers[0].link, "https://arxiv.org/abs/2608.14468");
  assert.strictEqual(papers[1].id, "2608.16857v1");
  assert.strictEqual(papers[1].title, "Paper Two");
});
