import test from "node:test";
import assert from "node:assert";
import {
  parseMarkdownBlocks,
  getMarkdownStats,
  extractMarkdownLinks
} from "./markdownParser.js";

test("parseMarkdownBlocks correctly differentiates code fences, math blocks, and headings", () => {
  const md = `# Title Level 1
Introductory sentence.

## Sub-header Level 2
A paragraph detailing scientific hypothesis.

\`\`\`rust
fn calculate_fidelity(psi: &State) -> f64 {
    1.0
}
\`\`\`

$$
\\langle x | p \\rangle = \\frac{1}{\\sqrt{2\\pi\\hbar}} e^{i p x / \\hbar}
$$

> "Nature does not make leaps." — Gottfried Leibniz
`;

  const blocks = parseMarkdownBlocks(md);

  assert.strictEqual(blocks.length, 7);
  assert.strictEqual(blocks[0].type, "heading");
  assert.strictEqual(blocks[0].level, 1);
  assert.strictEqual(blocks[0].content, "Title Level 1");

  assert.strictEqual(blocks[1].type, "paragraph");
  assert.strictEqual(blocks[1].content, "Introductory sentence.");

  assert.strictEqual(blocks[2].type, "heading");
  assert.strictEqual(blocks[2].level, 2);

  assert.strictEqual(blocks[3].type, "paragraph");

  assert.strictEqual(blocks[4].type, "code");
  assert.strictEqual(blocks[4].language, "rust");
  assert.ok(blocks[4].content.includes("calculate_fidelity"));

  assert.strictEqual(blocks[5].type, "math");
  assert.ok(blocks[5].content.includes("\\langle x | p \\rangle"));

  assert.strictEqual(blocks[6].type, "blockquote");
  assert.ok(blocks[6].content.includes("Gottfried Leibniz"));
});

test("parseMarkdownBlocks handles single-line inline $$ display math", () => {
  const md = `Above formula.
$$ E = mc^2 $$
Below formula.`;

  const blocks = parseMarkdownBlocks(md);
  assert.strictEqual(blocks.length, 3);
  assert.strictEqual(blocks[1].type, "math");
  assert.strictEqual(blocks[1].content, "E = mc^2");
});

test("parseMarkdownBlocks handles empty strings and unclosed fences gracefully", () => {
  assert.deepStrictEqual(parseMarkdownBlocks(""), []);
  assert.deepStrictEqual(parseMarkdownBlocks("   \n\n  "), []);

  const unclosedCode = "```python\nprint('hello')\n";
  const blocks = parseMarkdownBlocks(unclosedCode);
  assert.deepStrictEqual(blocks, []);
});

test("getMarkdownStats accurately counts structural components and words", () => {
  const md = `# Heading 1
## Heading 2
### Heading 3

First paragraph containing eight distinct words for testing.

\`\`\`typescript
const a = 1;
\`\`\`

\`\`\`python
b = 2
\`\`\`

$$
\\alpha + \\beta = \\gamma
$$
`;

  const stats = getMarkdownStats(md);
  assert.strictEqual(stats.headingsCount, 3);
  assert.strictEqual(stats.codeBlocksCount, 2);
  assert.strictEqual(stats.mathBlocksCount, 1);
  assert.strictEqual(stats.paragraphCount, 1);
  assert.ok(stats.wordCount > 5);
});

test("extractMarkdownLinks extracts URL references and titles", () => {
  const md = `
Refer to the [arXiv preprint](https://arxiv.org/abs/2608.12345) and the [DOI publication](https://doi.org/10.1038/nature12345).
Also see [GitHub Source Code](https://github.com/meridian/research).
`;

  const links = extractMarkdownLinks(md);
  assert.strictEqual(links.length, 3);
  assert.strictEqual(links[0].text, "arXiv preprint");
  assert.strictEqual(links[0].url, "https://arxiv.org/abs/2608.12345");
  assert.strictEqual(links[1].text, "DOI publication");
  assert.strictEqual(links[2].text, "GitHub Source Code");
});
