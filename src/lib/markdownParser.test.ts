import test from "node:test";
import assert from "node:assert";
import {
  parseMarkdownBlocks,
  getMarkdownStats,
  extractMarkdownLinks
} from "./markdownParser";

test("parseMarkdownBlocks correctly identifies headings with levels", () => {
  const md = `# Main Title\n\nSome introductory text.\n\n## Subheading Section\n\nMore detailed analysis.`;
  const blocks = parseMarkdownBlocks(md);

  assert.strictEqual(blocks.length, 4);
  assert.strictEqual(blocks[0].type, "heading");
  assert.strictEqual(blocks[0].level, 1);
  assert.strictEqual(blocks[0].content, "Main Title");

  assert.strictEqual(blocks[1].type, "paragraph");
  assert.strictEqual(blocks[1].content, "Some introductory text.");

  assert.strictEqual(blocks[2].type, "heading");
  assert.strictEqual(blocks[2].level, 2);
  assert.strictEqual(blocks[2].content, "Subheading Section");
});

test("parseMarkdownBlocks extracts fenced code blocks with language", () => {
  const md = `Before code.\n\n\`\`\`typescript\nconst a: number = 42;\nconsole.log(a);\n\`\`\`\n\nAfter code.`;
  const blocks = parseMarkdownBlocks(md);

  assert.strictEqual(blocks.length, 3);
  assert.strictEqual(blocks[1].type, "code");
  assert.strictEqual(blocks[1].language, "typescript");
  assert.ok(blocks[1].content.includes("const a: number = 42;"));
});

test("parseMarkdownBlocks isolates display math $$ blocks", () => {
  const md = `Introduction.\n\n$$\n\\hat{H} |\\psi\\rangle = E |\\psi\\rangle\n$$\n\nConclusion.`;
  const blocks = parseMarkdownBlocks(md);

  assert.strictEqual(blocks.length, 3);
  assert.strictEqual(blocks[1].type, "math");
  assert.ok(blocks[1].content.includes("\\hat{H} |\\psi\\rangle = E |\\psi\\rangle"));
});

test("parseMarkdownBlocks isolates blockquotes", () => {
  const md = `> Physics is the poetry of nature.\n\nStandard text.`;
  const blocks = parseMarkdownBlocks(md);

  assert.strictEqual(blocks.length, 2);
  assert.strictEqual(blocks[0].type, "blockquote");
  assert.strictEqual(blocks[0].content, "Physics is the poetry of nature.");
});

test("getMarkdownStats computes counts of structure elements and words", () => {
  const md = `# Quantum Optics\n\nParagraph 1.\n\n## Section 1\n\nParagraph 2.\n\n\`\`\`python\nimport numpy as np\n\`\`\`\n\n$$\nE = h \\nu\n$$`;
  const stats = getMarkdownStats(md);

  assert.strictEqual(stats.headingsCount, 2);
  assert.strictEqual(stats.paragraphCount, 2);
  assert.strictEqual(stats.codeBlocksCount, 1);
  assert.strictEqual(stats.mathBlocksCount, 1);
  assert.ok(stats.wordCount > 0);
});

test("extractMarkdownLinks captures all markdown hyperlinks", () => {
  const md = `Check out [arXiv Paper](https://arxiv.org/abs/2403.12345) and [Google Scholar](https://scholar.google.com).`;
  const links = extractMarkdownLinks(md);

  assert.strictEqual(links.length, 2);
  assert.strictEqual(links[0].text, "arXiv Paper");
  assert.strictEqual(links[0].url, "https://arxiv.org/abs/2403.12345");
  assert.strictEqual(links[1].text, "Google Scholar");
  assert.strictEqual(links[1].url, "https://scholar.google.com");
});

test("extractMarkdownLinks returns empty array for markdown with no links", () => {
  const md = `Pure text without any hyperlinks.`;
  const links = extractMarkdownLinks(md);
  assert.deepStrictEqual(links, []);
});
