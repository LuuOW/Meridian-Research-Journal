import { test } from "node:test";
import assert from "node:assert";
import { parseArxivXml, parseArxivFeedXml, extractArxivId, generateSlug, cleanJsonText, isWeekend, extractSvgString } from "./arxivUtils";

test("extractSvgString strips code fences and extracts raw SVG XML", () => {
  const rawWithFence = '```svg\n<svg viewBox="0 0 800 400"><rect width="800" height="400" fill="#0a1128"/></svg>\n```';
  const extracted = extractSvgString(rawWithFence);
  assert.strictEqual(extracted, '<svg viewBox="0 0 800 400"><rect width="800" height="400" fill="#0a1128"/></svg>');

  const rawWithPrefixText = 'Here is the generated SVG:\n<svg viewBox="0 0 800 400"><circle cx="400" cy="200" r="50"/></svg>\nHope you like it!';
  assert.strictEqual(extractSvgString(rawWithPrefixText), '<svg viewBox="0 0 800 400"><circle cx="400" cy="200" r="50"/></svg>');
});

test("parseArxivXml handles XML elements in paper metadata", () => {
  const xmlWithEntities = `
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Quantum Mechanics &amp; Multi-Agent Systems &lt;V2&gt;</title>
        <summary>A study on spin dynamics in &quot;entangled&quot; states &amp; wavefunctions.</summary>
        <author><name>Alice Smith</name></author>
        <author><name>Bob Jones</name></author>
        <published>2026-05-10T14:30:00Z</published>
      </entry>
    </feed>
  `;

  const meta = parseArxivXml(xmlWithEntities);
  assert.ok(meta, "Should parse XML");
  assert.strictEqual(meta?.title, "Quantum Mechanics &amp; Multi-Agent Systems &lt;V2&gt;");
  assert.strictEqual(meta?.authors, "Alice Smith, Bob Jones");
});

test("parseArxivFeedXml correctly extracts multiple entries from arXiv feed", () => {
  const feedXml = `
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>http://arxiv.org/abs/2401.00001v1</id>
        <title>First Paper on Neural Fields</title>
        <summary>Overview of neural fields representation.</summary>
        <author><name>Dr. Claire</name></author>
        <published>2024-01-01T00:00:00Z</published>
      </entry>
      <entry>
        <id>http://arxiv.org/abs/2401.00002v1</id>
        <title>Second Paper on Diffusion Models</title>
        <summary>Latent space exploration in generative AI.</summary>
        <author><name>Dr. Dave</name></author>
        <published>2024-01-02T00:00:00Z</published>
      </entry>
    </feed>
  `;

  const entries = parseArxivFeedXml(feedXml);
  assert.strictEqual(entries.length, 2, "Should extract exactly 2 entries");
  assert.strictEqual(entries[0].id, "2401.00001v1");
  assert.strictEqual(entries[0].title, "First Paper on Neural Fields");
  assert.strictEqual(entries[1].id, "2401.00002v1");
  assert.strictEqual(entries[1].title, "Second Paper on Diffusion Models");
});

test("extractArxivId extracts valid IDs from URLs and strings", () => {
  assert.strictEqual(extractArxivId("https://arxiv.org/abs/2608.12345v2"), "2608.12345");
  assert.strictEqual(extractArxivId("http://arxiv.org/pdf/2401.99999"), "2401.99999");
  assert.strictEqual(extractArxivId("2608.12345"), "2608.12345");
  assert.strictEqual(extractArxivId("invalid-id"), null);
  assert.strictEqual(extractArxivId(""), null);
});

test("cleanJsonText strips markdown fences and repairs unescaped LaTeX backslashes in JSON", () => {
  const rawWithLatex = '```json\n{\n  "formula": "\\\\alpha + \\\\beta = \\\\gamma",\n  "text": "sample \\n new line"\n}\n```';
  const cleaned = cleanJsonText(rawWithLatex);
  assert.ok(!cleaned.startsWith("```"));
  assert.ok(!cleaned.endsWith("```"));
  const parsed = JSON.parse(cleaned);
  assert.ok(parsed.formula.includes("alpha"));
});

test("isWeekend accurately checks day of week", () => {
  const fri = new Date("2026-07-24T10:00:00Z");
  const sat = new Date("2026-07-25T10:00:00Z");
  const sun = new Date("2026-07-26T10:00:00Z");
  const mon = new Date("2026-07-27T10:00:00Z");

  assert.strictEqual(isWeekend(fri), false);
  assert.strictEqual(isWeekend(sat), true);
  assert.strictEqual(isWeekend(sun), true);
  assert.strictEqual(isWeekend(mon), false);
});
