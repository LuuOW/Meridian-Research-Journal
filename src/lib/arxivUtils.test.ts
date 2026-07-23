import { test } from "node:test";
import assert from "node:assert";
import { parseArxivXml, parseArxivFeedXml, extractArxivId, generateSlug, cleanJsonText, isWeekend } from "./arxivUtils";

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
