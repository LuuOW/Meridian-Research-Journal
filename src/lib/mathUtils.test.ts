import { test } from "node:test";
import assert from "node:assert";
import { isMathExpression, sanitizeLatexFormula } from "./mathUtils";

test("isMathExpression distinguishes valid LaTeX math from dollar amounts and plain numbers", () => {
  // Valid math
  assert.strictEqual(isMathExpression("x"), true, "Single variable 'x' should be math");
  assert.strictEqual(isMathExpression("T"), true, "Single variable 'T' should be math");
  assert.strictEqual(isMathExpression("\\psi"), true, "LaTeX command should be math");
  assert.strictEqual(isMathExpression("E = mc^2"), true, "Formula with = and ^ should be math");
  assert.strictEqual(isMathExpression("a_i + b_i"), true, "Subscripts and addition should be math");
  assert.strictEqual(isMathExpression("2 \\times 2"), true, "Math expression with numbers and command should be math");
  assert.strictEqual(isMathExpression("\\frac{a}{b}"), true, "Fractions should be math");
  assert.strictEqual(isMathExpression("f(x) = x^2"), true, "Functions with parentheses should be math");

  // Currency / plain text false positives
  assert.strictEqual(isMathExpression("100"), false, "Plain number should not be math");
  assert.strictEqual(isMathExpression("10k"), false, "Number with suffix should not be math");
  assert.strictEqual(isMathExpression("0.02"), false, "Decimal number should not be math");
  assert.strictEqual(isMathExpression("50 million dollars per year"), false, "Plain sentence with currency keywords should not be math");
  assert.strictEqual(isMathExpression("free off requests"), false, "Sentence with common excluded words should not be math");
  assert.strictEqual(isMathExpression("line1\nline2"), false, "Multiline string should not be math");
  assert.strictEqual(isMathExpression(""), false, "Empty string should not be math");
});

test("sanitizeLatexFormula strips enclosing bracket and dollar wrappers cleanly", () => {
  assert.strictEqual(sanitizeLatexFormula("$$x^2 + y^2 = z^2$$"), "x^2 + y^2 = z^2");
  assert.strictEqual(sanitizeLatexFormula("\\[ \\alpha + \\beta \\]"), "\\alpha + \\beta");
  assert.strictEqual(sanitizeLatexFormula("  E=mc^2  "), "E=mc^2");
  assert.strictEqual(sanitizeLatexFormula("$$\\int f(x) dx$$"), "\\int f(x) dx");
  assert.strictEqual(sanitizeLatexFormula(""), "");
  assert.strictEqual(sanitizeLatexFormula(null as unknown as string), "");
});

