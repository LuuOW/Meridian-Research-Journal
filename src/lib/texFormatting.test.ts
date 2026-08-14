import test from "node:test";
import assert from "node:assert";
import { isMathExpression, sanitizeLatexFormula } from "./mathUtils";

test("sanitizeLatexFormula strips bracket wrappers \\[ and \\]", () => {
  const formula = "\\[ \\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} \\]";
  const sanitized = sanitizeLatexFormula(formula);
  assert.strictEqual(sanitized, "\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J}");
});

test("sanitizeLatexFormula strips double dollar $$ markers", () => {
  const formula = "$$\\int_{-\\infty}^\\infty e^{-x^2} dx = \\sqrt{\\pi}$$";
  const sanitized = sanitizeLatexFormula(formula);
  assert.strictEqual(sanitized, "\\int_{-\\infty}^\\infty e^{-x^2} dx = \\sqrt{\\pi}");
});

test("sanitizeLatexFormula preserves inner LaTeX syntax without outer delimiters", () => {
  const formula = "H |\\psi\\rangle = E |\\psi\\rangle";
  const sanitized = sanitizeLatexFormula(formula);
  assert.strictEqual(sanitized, "H |\\psi\\rangle = E |\\psi\\rangle");
});

test("sanitizeLatexFormula handles empty and falsy input safely", () => {
  assert.strictEqual(sanitizeLatexFormula(""), "");
  assert.strictEqual(sanitizeLatexFormula("   "), "");
});

test("isMathExpression correctly classifies real mathematical expressions", () => {
  assert.strictEqual(isMathExpression("x = y + z"), true);
  assert.strictEqual(isMathExpression("\\hbar \\omega"), true);
  assert.strictEqual(isMathExpression("E = mc^2"), true);
  assert.strictEqual(isMathExpression("\\rho_{AB} = \\sum p_i |\\psi_i\\rangle \\langle \\psi_i|"), true);
  assert.strictEqual(isMathExpression("k_B T"), true);
  assert.strictEqual(isMathExpression("x"), true);
  assert.strictEqual(isMathExpression("p"), true);
  assert.strictEqual(isMathExpression("T"), true);
});

test("isMathExpression correctly rejects plain currency and monetary figures", () => {
  assert.strictEqual(isMathExpression("29"), false);
  assert.strictEqual(isMathExpression("0.02"), false);
  assert.strictEqual(isMathExpression("10k"), false);
  assert.strictEqual(isMathExpression("30M"), false);
  assert.strictEqual(isMathExpression("100k"), false);
  assert.strictEqual(isMathExpression("~0.02"), false);
});

test("isMathExpression rejects common English prose words", () => {
  assert.strictEqual(isMathExpression("until"), false);
  assert.strictEqual(isMathExpression("requests per month"), false);
  assert.strictEqual(isMathExpression("million tokens"), false);
  assert.strictEqual(isMathExpression("dollars per day"), false);
  assert.strictEqual(isMathExpression("free off"), false);
});

test("isMathExpression rejects multiline strings", () => {
  assert.strictEqual(isMathExpression("first line\nsecond line"), false);
});
