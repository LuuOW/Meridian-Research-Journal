import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";
import { searchAndRankBlogs, extractUniqueTags, normalizeTag, filterBlogsByTags } from "./tagFilter";
import { extractTableOfContents, slugifyHeading, filterNavHeadings } from "./tocUtils";
import { sanitizeLatexFormula, isMathExpression } from "./mathUtils";
import { generateProceduralBannerSvg } from "./svgBannerGenerator";
import { ensureAnimatedSvg, prepareSvgForPngExport } from "./svgUtils";
import { getWordFrequencyMap, calculateVocabularyDensity, calculateParagraphMetrics, extractKeyPhrases } from "./articleStatistics";
import { calculateReadingTimeMinutes, formatReadingTime, estimateAndFormatReadingTime } from "./readingTime";
import { formatViews, calculateBaseViews, calculateActiveReaders, parsePublicationDate, calculateDaysSincePublication } from "./viewCounter";

test("Deduplication logic rigorously handles empty IDs, whitespace, and preserves immutable order", () => {
  const deduplicateBlogs = (list: Partial<BlogPost>[]): Partial<BlogPost>[] => {
    const seen = new Set<string>();
    return list.filter((b) => {
      if (!b || !b.id || typeof b.id !== "string" || b.id.trim() === "" || seen.has(b.id.trim())) return false;
      seen.add(b.id.trim());
      return true;
    });
  };

  const dirtyInput: Partial<BlogPost>[] = [
    { id: " article-alpha ", title: "Alpha Clean" },
    { id: "article-beta", title: "Beta First" },
    { id: "article-beta", title: "Beta Duplicate" },
    null as any,
    undefined as any,
    { id: "", title: "Blank ID" },
    { id: "   ", title: "Whitespace ID" },
    { id: "article-gamma", title: "Gamma" },
    { id: "article-alpha", title: "Alpha Duplicate" },
  ];

  const cleaned = deduplicateBlogs(dirtyInput);
  assert.strictEqual(cleaned.length, 3, "Exactly 3 distinct valid IDs should remain");
  assert.strictEqual(cleaned[0]?.title, "Alpha Clean");
  assert.strictEqual(cleaned[1]?.title, "Beta First");
  assert.strictEqual(cleaned[2]?.title, "Gamma");
});

test("Math parsing correctly isolates equations from prose and currency symbols", () => {
  // Test math formulas
  assert.strictEqual(isMathExpression("\\hbar \\omega_0"), true);
  assert.strictEqual(isMathExpression("H |\\psi\\rangle = E |\\psi\\rangle"), true);
  assert.strictEqual(isMathExpression("\\int_{0}^{\\infty} e^{-x^2} dx"), true);
  assert.strictEqual(isMathExpression("E = mc^2"), true);

  // Test non-math / currency prose
  assert.strictEqual(isMathExpression("The cost is $50 to $100"), false);
  assert.strictEqual(isMathExpression("We raised $1.5M in funding"), false);
  assert.strictEqual(isMathExpression("General relativity and quantum gravity"), false);
  assert.strictEqual(isMathExpression(""), false);

  // Sanitization
  assert.strictEqual(sanitizeLatexFormula("\\[ \\sum_{i=1}^n x_i \\]"), "\\sum_{i=1}^n x_i");
  assert.strictEqual(sanitizeLatexFormula("$$ \\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t} $$"), "\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}");
});

test("Table of contents extracts nested headings with distinct anchor IDs", () => {
  const sampleMarkdown = `
# Main Article Title (H1)

Some introductory paragraphs here.

## Quantum Resonances in Nanophotonics
Exploration of localized plasmons.

### Topological Edge Modes
Boundary conditions and Berry phase.

### Topological Edge Modes
A secondary section with an identical heading text.

## Experimental Verification and Benchmarks
Empirical data and laser measurements.
`;

  const toc = extractTableOfContents(sampleMarkdown);
  assert.strictEqual(toc.length, 5);

  const navItems = filterNavHeadings(toc);
  assert.strictEqual(navItems.length, 4, "H1 should be excluded from reader navigation");

  // Check unique anchor generation for duplicates
  assert.strictEqual(navItems[1]?.id, "topological-edge-modes");
  assert.strictEqual(navItems[2]?.id, "topological-edge-modes-1", "Duplicate heading slug must have unique index suffix");
});

test("Procedural SVG banner generator creates valid, animated vector graphics across seeds", () => {
  const svg1 = generateProceduralBannerSvg(
    "Quantum Entanglement in Microcavities",
    "Quantum Optics, Physics",
    101
  );

  assert.ok(svg1.startsWith("<svg") || svg1.includes("<svg"), "Generated output must contain <svg tag");
  assert.ok(svg1.includes("viewBox=\"0 0 800 400\""), "Must have standard 800x400 viewBox");
  assert.ok(svg1.includes("Quantum Entanglement in Microcavities"), "Banner must include title text");
  assert.ok(svg1.includes("QUANTUM OPTICS"), "Banner must render category badge");

  const svg2 = generateProceduralBannerSvg(
    "Quantum Entanglement in Microcavities",
    "Quantum Optics, Physics",
    102
  );

  // Ensure deterministic differing seeds produce different visual color/geometry paths
  assert.notStrictEqual(svg1, svg2, "Different seeds should yield distinct graphic outputs");

  // Verify animated styles injection
  const animatedSvg = ensureAnimatedSvg(svg1);
  assert.ok(animatedSvg.includes("@keyframes") || animatedSvg.includes("mrd-anim-"), "Animated SVG must contain animation rules or classes");
});

test("SVG export sanitization produces clean XML for canvas and PNG rendering", () => {
  const rawSvg = `<svg viewBox="0 0 800 400"><text>Photons & Lasers</text><rect width="100" height="100"/></svg>`;
  const prepared = prepareSvgForPngExport(rawSvg);

  assert.ok(prepared.includes('xmlns="http://www.w3.org/2000/svg"'), "Must inject XML namespace");
  assert.ok(prepared.includes('width="1200"'), "Must inject default 1200 width");
  assert.ok(prepared.includes('height="675"'), "Must inject default 675 height");
  assert.ok(!prepared.includes('& ') || prepared.includes('&amp;'), "Must sanitize unescaped ampersands");
});

test("Search and ranking engine accurately prioritizes titles, authors, and composite tags", () => {
  const resultsByTitle = searchAndRankBlogs(PRELOADED_BLOGS, "Split-Step Fourier", []);
  assert.ok(resultsByTitle.length > 0, "Search by title substring should return matches");
  assert.ok(
    resultsByTitle[0]?.title.toLowerCase().includes("split-step fourier"),
    "Top result should match query directly"
  );

  const resultsByAuthor = searchAndRankBlogs(PRELOADED_BLOGS, "Fabio", []);
  assert.ok(resultsByAuthor.length > 0, "Search by author name should surface matching papers");

  const uniqueTags = extractUniqueTags(PRELOADED_BLOGS);
  assert.ok(uniqueTags.length > 0, "Tag extraction should produce list of unique tags");
  assert.ok(uniqueTags.every(t => t.count > 0), "Every extracted tag should have a positive count");
});

test("Article statistics and reading time metrics produce accurate linguistic evaluations", () => {
  const sampleArticleText = `
Photonic reservoir computing maps nonlinear optical signals into high-dimensional Hilbert space.
Optical amplifiers and semiconductor delay loops provide physical nonlinearity.

By compensating for Kerr nonlinearities in optical fibers, photonic computing enhances data bandwidth.
High-dimensional projections allow linear readouts to classify distorted signals accurately.
`;

  // Reading time tests
  const readingMinutes = calculateReadingTimeMinutes(sampleArticleText, 200);
  assert.strictEqual(readingMinutes, 1, "Short technical text should be 1 min read");
  assert.strictEqual(formatReadingTime(7), "7 min read");

  const formattedEstimate = estimateAndFormatReadingTime(sampleArticleText, 200);
  assert.strictEqual(formattedEstimate, "1 min read");

  // Vocabulary richness and paragraph analysis
  const vocabDensity = calculateVocabularyDensity(sampleArticleText);
  assert.ok(vocabDensity > 50, "Vocabulary density should be greater than 50%");

  const paraMetrics = calculateParagraphMetrics(sampleArticleText);
  assert.strictEqual(paraMetrics.paragraphCount, 2, "Should detect 2 distinct paragraphs");
  assert.ok(paraMetrics.avgWordsPerParagraph > 10, "Average words per paragraph should be positive");

  const frequencies = getWordFrequencyMap(sampleArticleText, 5);
  assert.ok(frequencies.length > 0, "Word frequency analysis should identify top tokens");
  assert.ok(
    frequencies.some((f) => f.word === "optical" || f.word === "photonic" || f.word === "nonlinearities"),
    "Common domain tokens should be captured in frequency map"
  );

  const keyPhrases = extractKeyPhrases(sampleArticleText, 3);
  assert.ok(keyPhrases.length > 0, "Key collocations should be extracted");
});

test("Publication date mathematics and deterministic view counter metrics", () => {
  const baseViews1 = calculateBaseViews("article-id-12345");
  const baseViews2 = calculateBaseViews("article-id-12345");
  assert.strictEqual(baseViews1, baseViews2, "Base view calculation must be deterministic for identical article IDs");
  assert.ok(baseViews1 >= 320 && baseViews1 <= 1850, "Base views should fall within expected bounds");

  const activeReaders = calculateActiveReaders("article-id-12345", baseViews1);
  assert.ok(activeReaders >= 2 && activeReaders <= 18, "Active reader calculation should stay within bounds");

  assert.strictEqual(formatViews(450), "450");
  assert.strictEqual(formatViews(1450), "1,450");
  assert.strictEqual(formatViews(15400), "15.4k");
  assert.strictEqual(formatViews(1200000), "1.2M");

  const parsed = parsePublicationDate("August 21, 2026");
  assert.ok(parsed instanceof Date && !isNaN(parsed.getTime()));
  assert.strictEqual(parsed.getFullYear(), 2026);

  const ref = new Date("2026-08-24T12:00:00Z");
  assert.strictEqual(calculateDaysSincePublication("2026-08-21T12:00:00Z", ref), 3);
});

