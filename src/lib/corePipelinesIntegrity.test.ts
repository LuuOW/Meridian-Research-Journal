import test from "node:test";
import assert from "node:assert";
import { generateScientificArticleFromArxiv, createBespokeExcerpt, cleanLatexForPlainText } from "./paperGenerationEngine";
import { generateCorpusBannerSvg, deriveCorpusProfile } from "./corpusBannerAlgorithm";
import { generateProceduralBannerSvg } from "./svgBannerGenerator";
import { ensureAnimatedSvg } from "./svgUtils";
import {
  generateStagedArticleDraft,
  formatArtReadableDate,
  getArtTime
} from "./dailyEditorialEngine";
import { normalizeDateToIso } from "../services/ArxivWebScraper";

// ============================================================================
// 1. MANUAL ARXIV GENERATION PIPELINE AUDIT
// ============================================================================

test("Manual Generation: synthesizes distinct high-fidelity articles across domains without generic boilerplate", () => {
  // Test Case A: Meson decay with neutrinophilic scalar (arXiv:2610.08606)
  const mesonTitle = "Missing Mass Matters: Neutrinophilic Scalar in D-Meson Decays";
  const mesonSummary = "We study leptonic D-meson decays as a probe of light neutrinophilic scalar bosons via three-body kinematics and missing mass squared.";
  const mesonArticle = generateScientificArticleFromArxiv(mesonTitle, mesonSummary, "https://arxiv.org/abs/2610.08606", "Jin-Man Cai, Gang Li", 101);

  assert.strictEqual(mesonArticle.title, mesonTitle);
  assert.ok(mesonArticle.tags.includes("Neutrinophilic Scalar"));
  assert.ok(mesonArticle.content.includes("M_{\\text{miss}}^2"));
  assert.ok(!mesonArticle.excerpt.includes("transformative implications of"));
  assert.ok(!mesonArticle.excerpt.includes("http://"));
  assert.ok(!mesonArticle.excerpt.includes("https://"));

  // Test Case B: Fermion electromagnetic moments (arXiv:2610.09974)
  const fermionTitle = "Diagonal and Transition Electromagnetic Moments of Spin-1/2 Fermions";
  const fermionSummary = "One-loop calculation of magnetic dipole moments, electric dipole moments, and transition vertices for Dirac and Majorana fermions.";
  const fermionArticle = generateScientificArticleFromArxiv(fermionTitle, fermionSummary, "https://arxiv.org/abs/2610.09974", "Physics Lab", 202);

  assert.strictEqual(fermionArticle.title, fermionTitle);
  assert.ok(fermionArticle.tags.includes("Electromagnetic Moments") || fermionArticle.tags.includes("hep-ph"));
  assert.ok(fermionArticle.content.includes("F_1(q^2)") || fermionArticle.content.includes("F_2(q^2)"));
  assert.ok(!fermionArticle.excerpt.includes("transformative implications of"));

  // Test Case C: Fallback author defaults to Meridian Research
  const fallbackArticle = generateScientificArticleFromArxiv("Quantum Topological Invariants", "Study of Chern numbers in lattice models.", "", "");
  assert.strictEqual(fallbackArticle.author, "Meridian Research");
});

test("Manual Generation: createBespokeExcerpt cleans LaTeX, handles short snippets, and preserves core thesis", () => {
  const latexTitle = "Probing $\\phi$ and $\\nu_\\tau$ via $M_{\\text{miss}}^2$ Distributions";
  const cleanTitle = cleanLatexForPlainText(latexTitle);
  assert.ok(!cleanTitle.includes("$"));
  assert.ok(!cleanTitle.includes("\\"));
  assert.ok(cleanTitle.includes("φ"));
  assert.ok(cleanTitle.includes("ν"));

  // Short snippet fallback should incorporate title directly
  const shortExcerpt = createBespokeExcerpt(cleanTitle, "Short stub");
  assert.ok(shortExcerpt.includes("Probing"));
  assert.ok(!shortExcerpt.includes("transformative implications of"));

  // Thesis extraction from real abstract
  const abstract = "In this letter, we demonstrate that non-reciprocal topological photonic crystals exhibit unidirectional edge states immune to backscattering. This discovery enables robust integrated optical isolators.";
  const thesisExcerpt = createBespokeExcerpt("Topological Isolators", abstract);
  assert.ok(thesisExcerpt.toLowerCase().includes("non-reciprocal") || thesisExcerpt.toLowerCase().includes("topological"));
  assert.ok(!thesisExcerpt.includes("transformative implications of"));
});

// ============================================================================
// 2. BANNER PIPELINE AUDIT
// ============================================================================

test("Banner Pipeline: generateCorpusBannerSvg produces valid animated SVGs with wrapped titles and unique profiles", () => {
  const article1 = {
    id: "blog-test-1",
    title: "Quantum Simulation of Strongly Correlated Electrons in High-Tc Cuprates",
    excerpt: "Exploring fractionalized Fermi liquids and superconducting pairing in optical lattices.",
    tags: ["Condensed Matter", "Superconductivity", "Quantum Simulation"]
  };

  const article2 = {
    id: "blog-test-2",
    title: "Missing Mass Matters: Neutrinophilic Scalar in D-Meson Decays at Super Tau-Charm Factory",
    excerpt: "Probing light neutrinophilic scalars through leptonic D-meson decays via full missing-mass kinematics.",
    tags: ["hep-ph", "Meson Decays", "Neutrinophilic Scalar"]
  };

  const svg1 = generateCorpusBannerSvg(article1, [], 111);
  const svg2 = generateCorpusBannerSvg(article2, [article1 as any], 222);

  // Markups are valid SVGs
  assert.ok(svg1.startsWith("<svg") && svg1.endsWith("</svg>"));
  assert.ok(svg2.startsWith("<svg") && svg2.endsWith("</svg>"));

  // Both banners are strictly unique
  assert.notStrictEqual(svg1, svg2);

  // Profile derivation produces distinct archetypes and hues
  const profile1 = deriveCorpusProfile(article1, 0, 111);
  const profile2 = deriveCorpusProfile(article2, 1, 222);
  assert.notStrictEqual(profile1.archetype, profile2.archetype);

  // Animated styles are injected cleanly
  const animatedSvg1 = ensureAnimatedSvg(svg1);
  assert.ok(animatedSvg1.includes("@keyframes") || animatedSvg1.includes("<style"));
});

test("Banner Pipeline: generateProceduralBannerSvg handles responsive multi-line title wrapping gracefully", () => {
  const longTitle = "Experimental Investigation of Non-Abelian Anyonic Statistics and Topological Braiding Operations in Fractional Quantum Hall States at Filling Factor 5/2";
  const svg = generateProceduralBannerSvg(longTitle, "Quantum Physics", 42);

  assert.ok(svg.includes("<svg"));
  assert.ok(svg.includes("</svg>"));
  // Must render text lines without exploding SVG bounds
  assert.ok(svg.includes("<text"));
  assert.ok(svg.includes("viewBox=\"0 0 800 400\""));
});

// ============================================================================
// 3. DAILY CRAWL, FETCH, AND PUBLICATION PIPELINE AUDIT
// ============================================================================

test("Daily Pipeline: generateStagedArticleDraft produces complete publication with KaTeX equations and animated banner", () => {
  const mockCandidate = {
    id: "2610.99999",
    title: "Neutrino Oscillation Tomography of Earth Core Density Profile",
    summary: "Measuring matter-induced resonant MSW flavor conversions to constrain core geophysical parameters with optical Cherenkov photons.",
    authors: "E. Vance, M. Thorne",
    link: "https://arxiv.org/abs/2610.99999",
    primaryCategory: "hep-ph",
    categories: ["hep-ph"],
    category: "hep-ph" as const
  };

  const art = getArtTime();
  const draft = generateStagedArticleDraft(mockCandidate, {
    totalArticles: 10,
    opticsCount: 5,
    quantPhCount: 5,
    opticsRatio: 0.5,
    quantPhRatio: 0.5,
    recommendedCategory: "hep-ph",
    recentTags: ["Quantum", "Optics"],
    recentTopics: ["Neutrinos"],
    selectionRationale: "Test draft"
  }, art, []);

  assert.ok(draft.id.startsWith("blog-2610-99999-"));
  assert.ok(draft.title.toLowerCase().includes("neutrino"));
  assert.ok(draft.excerpt.toLowerCase().includes("photon"));
  assert.ok(draft.content.includes("$$"));
  assert.ok(draft.content.includes("\\mathcal{L}"));
  assert.ok(draft.bannerSvg.includes("<svg") && draft.bannerSvg.includes("</svg>"));
  assert.strictEqual(draft.author, "E. Vance");
  assert.strictEqual(draft.status, "staged_dispatch");
});

test("Daily Pipeline: Date formatting, ISO normalization, and date matching align across timezones and formats", () => {
  const dateStr = "2026-10-10";
  const readable = formatArtReadableDate(dateStr);
  assert.strictEqual(readable, "October 10, 2026");

  const isoRes1 = normalizeDateToIso("October 10, 2026");
  assert.strictEqual(isoRes1.isoDate, "2026-10-10");
  assert.strictEqual(isoRes1.canonicalDate, "October 10, 2026");

  const isoRes2 = normalizeDateToIso("10 Oct 2026");
  assert.strictEqual(isoRes2.isoDate, "2026-10-10");

  const isoRes3 = normalizeDateToIso("[Submitted on 10 Oct 2026]");
  assert.strictEqual(isoRes3.isoDate, "2026-10-10");
});
