import test from "node:test";
import assert from "node:assert";
import { cleanJsonText } from "./arxivUtils";

test("cleanJsonText strips ```json code fences and trailing fences", () => {
  const fenced = "```json\n{\n  \"title\": \"Quantum Entanglement in Nanophotonics\"\n}\n```";
  const result = cleanJsonText(fenced);
  const parsed = JSON.parse(result);
  assert.strictEqual(parsed.title, "Quantum Entanglement in Nanophotonics");
});

test("cleanJsonText strips bare ``` markdown blocks", () => {
  const fenced = "```\n{\n  \"status\": \"ready\"\n}\n```";
  const result = cleanJsonText(fenced);
  const parsed = JSON.parse(result);
  assert.strictEqual(parsed.status, "ready");
});

test("cleanJsonText preserves LaTeX equations with single backslashes in JSON strings", () => {
  const jsonWithLatex = `{
    "formula": "\\frac{1}{\\sqrt{2}} (|00\\rangle + |11\\rangle)",
    "hamiltonian": "\\hat{H} = \\hbar \\omega \\left( a^\\dagger a + \\frac{1}{2} \\right)"
  }`;

  const cleaned = cleanJsonText(jsonWithLatex);
  const parsed = JSON.parse(cleaned);

  assert.ok(parsed.formula.includes("frac"), "Should preserve LaTeX frac command");
  assert.ok(parsed.formula.includes("sqrt"), "Should preserve LaTeX sqrt command");
  assert.ok(parsed.hamiltonian.includes("hbar"), "Should preserve LaTeX hbar command");
});

test("cleanJsonText handles literal unescaped newlines inside strings", () => {
  const jsonWithRawNewlines = `{
    "title": "Quantum Paper",
    "content": "Line one of paper.\nLine two of paper.\nLine three."
  }`;

  const cleaned = cleanJsonText(jsonWithRawNewlines);
  const parsed = JSON.parse(cleaned);
  assert.ok(parsed.content.includes("Line one of paper."));
  assert.ok(parsed.content.includes("Line three."));
});

test("cleanJsonText preserves valid JSON escape sequences like \\n, \\\", \\\\", () => {
  const jsonStandard = `{
    "summary": "This is a quote: \\"Important findings\\".\\nNext paragraph starts here."
  }`;

  const cleaned = cleanJsonText(jsonStandard);
  const parsed = JSON.parse(cleaned);
  assert.strictEqual(parsed.summary, 'This is a quote: "Important findings".\nNext paragraph starts here.');
});

test("cleanJsonText handles nested arrays and complex structures", () => {
  const complexJson = `{
    "articles": [
      {
        "id": "1",
        "tags": ["quantum", "optics"],
        "equations": ["E = mc^2", "\\Psi(x, t) = A e^{i(kx - \\omega t)}"]
      }
    ],
    "meta": {
      "count": 1,
      "generated": true
    }
  }`;

  const cleaned = cleanJsonText(complexJson);
  const parsed = JSON.parse(cleaned);
  assert.strictEqual(parsed.articles.length, 1);
  assert.strictEqual(parsed.articles[0].tags[0], "quantum");
  assert.strictEqual(parsed.meta.generated, true);
});
