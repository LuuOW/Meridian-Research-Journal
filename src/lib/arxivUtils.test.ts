import { test } from "node:test";
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

test("extractSvgString extracts valid SVG markup from markdown codeblocks or raw strings", () => {
  const rawSvgInCodeblock = "```xml\n<svg width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\"/></svg>\n```";
  const extracted1 = extractSvgString(rawSvgInCodeblock);
  assert.strictEqual(extracted1, "<svg width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\"/></svg>");

  const svgWithSurroundingText = "Here is the generated banner: <svg viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\"/></svg> Hope you like it!";
  const extracted2 = extractSvgString(svgWithSurroundingText);
  assert.strictEqual(extracted2, "<svg viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\"/></svg>");

  assert.strictEqual(extractSvgString(""), "");
  assert.strictEqual(extractSvgString("No SVG content here"), "No SVG content here");
});

test("extractArxivId extracts arXiv IDs from various URL formats and raw IDs", () => {
  assert.strictEqual(extractArxivId("https://arxiv.org/abs/2403.01234"), "2403.01234");
  assert.strictEqual(extractArxivId("https://arxiv.org/pdf/2403.01234v2"), "2403.01234");
  assert.strictEqual(extractArxivId("https://arxiv.org/abs/2403.12345v1"), "2403.12345");
  assert.strictEqual(extractArxivId("http://arxiv.org/abs/2403.00123"), "2403.00123");
  assert.strictEqual(extractArxivId("2403.01234"), "2403.01234");
  assert.strictEqual(extractArxivId("2403.12345v3"), "2403.12345");
  assert.strictEqual(extractArxivId("invalid-link"), null);
  assert.strictEqual(extractArxivId(""), null);
});

test("generateSlug creates safe URL slugs from titles with punctuation and whitespace", () => {
  assert.strictEqual(generateSlug("Quantum Entanglement & Superposition: A New Paradigm!"), "quantum-entanglement-superposition-a-new-paradigm");
  assert.strictEqual(generateSlug("  Topological Insulators in 2D Systems...  "), "topological-insulators-in-2d-systems");
  assert.strictEqual(generateSlug("arXiv:2403.01234 - High Energy Physics"), "arxiv-2403-01234-high-energy-physics");
});

test("isWeekend identifies weekends and weekdays correctly", () => {
  const saturday = new Date("2026-08-08T12:00:00Z"); // Saturday
  const sunday = new Date("2026-08-09T12:00:00Z");   // Sunday
  const monday = new Date("2026-08-10T12:00:00Z");   // Monday
  const friday = new Date("2026-08-14T12:00:00Z");   // Friday

  assert.strictEqual(isWeekend(saturday), true);
  assert.strictEqual(isWeekend(sunday), true);
  assert.strictEqual(isWeekend(monday), false);
  assert.strictEqual(isWeekend(friday), false);
});

test("parseArxivXml handles XML with single and multiple authors", () => {
  const xml = `
    <entry>
      <title> Quantum Interference in Photonics </title>
      <summary> An experimental study. </summary>
      <author><name>Alice Smith</name></author>
      <author><name>Bob Johnson</name></author>
      <author><name>Charlie Brown</name></author>
      <author><name>Dana Scully</name></author>
    </entry>
  `;
  const metadata = parseArxivXml(xml);
  assert.strictEqual(metadata.title, "Quantum Interference in Photonics");
  assert.strictEqual(metadata.summary, "An experimental study.");
  assert.strictEqual(metadata.authors, "Alice Smith, Bob Johnson, Charlie Brown");
});

test("parseArxivXml handles fallback when tags are missing", () => {
  const xml = `<entry><invalid>data</invalid></entry>`;
  const metadata = parseArxivXml(xml);
  assert.strictEqual(metadata.title, "Unknown Paper Title");
  assert.strictEqual(metadata.summary, "");
  assert.strictEqual(metadata.authors, "");
});

test("parseArxivFeedXml parses multiple entries from Atom feed XML with clean URLs", () => {
  const feedXml = `
    <feed>
      <entry>
        <id>https://arxiv.org/abs/2608.11111v1</id>
        <title>First Paper</title>
        <summary>Summary 1</summary>
        <author><name>Dr. A</name></author>
      </entry>
      <entry>
        <id>https://arxiv.org/abs/2608.22222v2</id>
        <title>Second Paper</title>
        <summary>Summary 2</summary>
        <author><name>Dr. B</name></author>
      </entry>
    </feed>
  `;
  const papers = parseArxivFeedXml(feedXml);
  assert.strictEqual(papers.length, 2);
  assert.strictEqual(papers[0].id, "2608.11111v1");
  assert.strictEqual(papers[0].title, "First Paper");
  assert.strictEqual(papers[0].link, "https://arxiv.org/abs/2608.11111");
  assert.strictEqual(papers[1].id, "2608.22222v2");
  assert.strictEqual(papers[1].title, "Second Paper");
  assert.strictEqual(papers[1].link, "https://arxiv.org/abs/2608.22222");
});
