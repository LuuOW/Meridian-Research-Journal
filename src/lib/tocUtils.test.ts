import test from "node:test";
import assert from "node:assert";
import {
  slugifyHeading,
  extractTableOfContents,
  filterNavHeadings
} from "./tocUtils.js";

test("slugifyHeading creates clean URL-friendly anchor IDs", () => {
  assert.strictEqual(slugifyHeading("Introduction & Background"), "introduction-background");
  assert.strictEqual(slugifyHeading("1. Quantum Cavities ($H_0$)"), "1-quantum-cavities-h0");
  assert.strictEqual(slugifyHeading("   "), "");
  assert.strictEqual(slugifyHeading(null as unknown as string), "");
});

test("extractTableOfContents parses markdown headings with correct levels and unique anchor IDs", () => {
  const markdown = `
# Title of the Article
Some introductory text...

## Quantum Entanglement
Details on entanglement...

### Bell State Analysis
Mathematical proofs...

## Quantum Entanglement
Another section with duplicate title...
  `;

  const toc = extractTableOfContents(markdown);

  assert.strictEqual(toc.length, 4);
  assert.strictEqual(toc[0].text, "Title of the Article");
  assert.strictEqual(toc[0].level, 1);
  assert.strictEqual(toc[0].id, "title-of-the-article");

  assert.strictEqual(toc[1].text, "Quantum Entanglement");
  assert.strictEqual(toc[1].level, 2);
  assert.strictEqual(toc[1].id, "quantum-entanglement");

  assert.strictEqual(toc[2].text, "Bell State Analysis");
  assert.strictEqual(toc[2].level, 3);
  assert.strictEqual(toc[2].id, "bell-state-analysis");

  // Duplicate heading should receive suffix "-1"
  assert.strictEqual(toc[3].id, "quantum-entanglement-1");
});

test("filterNavHeadings excludes H1 titles and keeps H2/H3 subsections", () => {
  const toc = [
    { id: "main-title", text: "Main Title", level: 1 },
    { id: "sec-1", text: "Section 1", level: 2 },
    { id: "sec-1-1", text: "Subsection 1.1", level: 3 }
  ];

  const filtered = filterNavHeadings(toc);
  assert.strictEqual(filtered.length, 2);
  assert.strictEqual(filtered[0].id, "sec-1");
  assert.strictEqual(filtered[1].id, "sec-1-1");
});

test("extractTableOfContents handles empty or non-string input safely", () => {
  assert.deepStrictEqual(extractTableOfContents(""), []);
  assert.deepStrictEqual(extractTableOfContents(null as unknown as string), []);
});
