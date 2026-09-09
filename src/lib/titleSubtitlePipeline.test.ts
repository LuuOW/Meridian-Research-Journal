import { test } from "node:test";
import assert from "node:assert";
import {
  latexToHumanReadable,
  formatSafeSubtitle,
  ensureBalancedMathDelimiters,
  validateTitleAndSubtitle,
  verifyAndSanitizeArticlePresentation
} from "./titleSubtitlePipeline";

test("latexToHumanReadable converts LaTeX math macros into pristine human-readable Unicode", () => {
  // Title formula conversion
  const rawTitle = "Fanout Complexity of Symmetric Boolean Functions in $\\mathsf{QAC}^0$";
  const readable = latexToHumanReadable(rawTitle);
  assert.strictEqual(readable, "Fanout Complexity of Symmetric Boolean Functions in QAC⁰");

  // Advanced symbols, Greek letters, and sub/superscripts
  const formulaWithGreek = "$\\alpha + \\beta \\le \\gamma^{2} + \\mathtt{PARITY}_n$";
  const readableGreek = latexToHumanReadable(formulaWithGreek);
  assert.ok(readableGreek.includes("α + β ≤ γ² + PARITYₙ"));

  // Fractions and square roots
  const mathExpr = "$\\sqrt{x} + \\frac{a}{b}$";
  const readableMath = latexToHumanReadable(mathExpr);
  assert.ok(readableMath.includes("√(x) + (a)/(b)"));
});

test("formatSafeSubtitle guarantees subtitle never cuts off inside LaTeX formulas or dangling escape sequences", () => {
  const brokenExcerpt = "Whether $\\mathsf{QAC}^0$ can compute $\\mathtt{PARITY}_n$ remains open. Computing $\\mathtt{PARITY}_n$ is equivalent to implementing $\\mathtt{FANOUT}_n$ under $\\m...";
  const safe = formatSafeSubtitle(brokenExcerpt, "2609.05153v1");

  // Must not end in broken \m... or unclosed $
  assert.ok(!safe.includes("$\\m..."));
  assert.ok(!safe.includes("under $\\m"));
  assert.ok(!safe.endsWith("$"));
  assert.ok(!safe.endsWith("\\"));

  // Check balanced math delimiters
  const dollars = (safe.match(/(?<!\\)\$/g) || []).length;
  assert.strictEqual(dollars % 2, 0, "Math delimiters must be balanced in safe subtitle");

  // Check prefix inclusion
  assert.ok(safe.startsWith("Autonomous scholarly analysis of arXiv:2609.05153v1:"));
});

test("ensureBalancedMathDelimiters fixes unbalanced dollar signs", () => {
  const unbalanced = "Title with $x^2 + y^2 unclosed";
  const fixed = ensureBalancedMathDelimiters(unbalanced);
  const dollars = (fixed.match(/(?<!\\)\$/g) || []).length;
  assert.strictEqual(dollars % 2, 0);

  const alreadyBalanced = "Title with $x^2$ and $y^2$ balanced";
  assert.strictEqual(ensureBalancedMathDelimiters(alreadyBalanced), alreadyBalanced);
});

test("validateTitleAndSubtitle validates formulas, catches syntax errors, and sanitizes", () => {
  const goodTitle = "Quantum Bounds in $\\mathsf{QAC}^0$";
  const goodExcerpt = "Autonomous scholarly analysis of arXiv:2609.05153: Computing $\\mathtt{PARITY}_n$ under $\\mathsf{QAC}^0$ reductions.";
  
  const result = validateTitleAndSubtitle(goodTitle, goodExcerpt);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.readableTitle, "Quantum Bounds in QAC⁰");
  assert.ok(result.readableExcerpt.includes("PARITYₙ"));

  // Broken case with dangling escape sequence
  const brokenExcerpt = "Under $\\m... testing";
  const brokenResult = validateTitleAndSubtitle(goodTitle, brokenExcerpt);
  assert.ok(brokenResult.errors.length > 0 || brokenResult.sanitizedExcerpt.includes("reductions"));
  assert.ok(!brokenResult.sanitizedExcerpt.includes("$\\m..."));
  assert.ok(!brokenResult.sanitizedExcerpt.includes("Under $\\m"));
});

test("verifyAndSanitizeArticlePresentation processes article for pristine end-user presentation", () => {
  const rawArticle = {
    title: "Fanout Complexity in $\\mathsf{QAC}^0$",
    excerpt: "Autonomous scholarly analysis of arXiv:2609.05153v1: Whether $\\mathsf{QAC}^0$ can compute $\\mathtt{PARITY}_n$ under $\\m...",
    id: "blog-1",
    content: "Body text"
  };

  const verified = verifyAndSanitizeArticlePresentation(rawArticle);
  assert.strictEqual(verified.readableTitle, "Fanout Complexity in QAC⁰");
  assert.ok(!verified.excerpt.includes("$\\m..."));
  assert.ok(!verified.excerpt.includes("under $\\m"));
  assert.ok(verified.readableExcerpt.includes("QAC⁰"));
});
