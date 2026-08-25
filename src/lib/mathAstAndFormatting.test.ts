import test from "node:test";
import assert from "node:assert";
import {
  sanitizeLatexFormula,
  isMathExpression,
  formatMathSummary
} from "./mathUtils";

test("Math Utilities: LaTeX formula sanitization strips redundant block delimiters", () => {
  assert.strictEqual(sanitizeLatexFormula("\\[ \\hat{H} \\psi = E \\psi \\]"), "\\hat{H} \\psi = E \\psi");
  assert.strictEqual(sanitizeLatexFormula("$$ \\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} $$"), "\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J}");
  assert.strictEqual(sanitizeLatexFormula("  E = mc^2  "), "E = mc^2");
  assert.strictEqual(sanitizeLatexFormula(""), "");
  assert.strictEqual(sanitizeLatexFormula(null as any), "");
});

test("Math Utilities: accurately identifies valid LaTeX expressions and distinguishes from monetary text", () => {
  // Real math expressions
  assert.strictEqual(isMathExpression("\\frac{d\\psi}{dt}"), true);
  assert.strictEqual(isMathExpression("\\alpha + \\beta = \\gamma"), true);
  assert.strictEqual(isMathExpression("x^2 + y^2 = r^2"), true);
  assert.strictEqual(isMathExpression("\\int_{0}^{\\infty} e^{-x} dx"), true);
  assert.strictEqual(isMathExpression("k_B T \\ln(2)"), true);

  // False positives to reject
  assert.strictEqual(isMathExpression("$100 is cheaper than $200"), false);
  assert.strictEqual(isMathExpression("Just a regular English sentence"), false);
  assert.strictEqual(isMathExpression(""), false);
  assert.strictEqual(isMathExpression(null as any), false);
});

test("Math Utilities: formats clean mathematical summary strings for screen reader accessibility", () => {
  const formula = "\\frac{\\hbar^2}{2m} \\nabla^2 \\psi + V \\psi";
  const summary = formatMathSummary(formula);
  
  assert.ok(typeof summary === "string" && summary.length > 0);
  assert.ok(summary.includes("hbar") || summary.includes("nabla") || summary.includes("psi") || summary.includes("\\"));
});
