import { test } from "node:test";
import assert from "node:assert";
import { generateScientificArticleFromArxiv } from "./paperGenerationEngine";
import { auditArticleAgainstArxiv, auditCatalogUniqueness, countLatexFormulas } from "./arxivAuditor";
import { extractArxivId, parseArxivXml } from "./arxivUtils";
import { BlogPost } from "../types";

test("arXiv ID extraction handles various URL and identifier formats", () => {
  assert.strictEqual(extractArxivId("https://arxiv.org/abs/2608.20992"), "2608.20992");
  assert.strictEqual(extractArxivId("https://arxiv.org/pdf/2608.21361v2"), "2608.21361");
  assert.strictEqual(extractArxivId("https://arxiv.org/abs/2608.20224"), "2608.20224");
  assert.strictEqual(extractArxivId("2608.17551"), "2608.17551");
  assert.strictEqual(extractArxivId("invalid-url-string"), null);
});

test("parseArxivXml cleanly extracts paper title, summary, and authors", () => {
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <title>Artificial Anisotropy Induced Bound States in the Continuum for Integrated Photonic Waveguide</title>
      <summary>Bound states in the continuum (BICs) enable counterintuitive light confinement without radiation loss. Here artificial optical anisotropy is introduced as a new design paradigm.</summary>
      <author><name>Jinzhao Wang</name></author>
      <author><name>Kunrun Lu</name></author>
      <author><name>Yuanlin Li</name></author>
    </entry>
  </feed>`;

  const meta = parseArxivXml(sampleXml);
  assert.strictEqual(meta.title, "Artificial Anisotropy Induced Bound States in the Continuum for Integrated Photonic Waveguide");
  assert.ok(meta.summary.includes("Bound states in the continuum (BICs)"));
  assert.strictEqual(meta.authors, "Jinzhao Wang, Kunrun Lu, Yuanlin Li");
});

test("generateScientificArticleFromArxiv generates topic-specific formulations for Bound States in Continuum (BIC)", () => {
  const title = "Artificial Anisotropy Induced Bound States in the Continuum for Integrated Photonic Waveguide";
  const summary = "Bound states in the continuum (BICs) enable counterintuitive light confinement without radiation loss. Artificial optical anisotropy is introduced using subwavelength-grating (SWG) metamaterials.";
  const arxivLink = "https://arxiv.org/abs/2608.20992";
  const authors = "Jinzhao Wang, Kunrun Lu, Yuanlin Li";

  const article = generateScientificArticleFromArxiv(title, summary, arxivLink, authors, 101);

  assert.strictEqual(article.title, title);
  assert.ok(article.tags.includes("Bound States in Continuum"));
  assert.ok(article.tags.includes("Anisotropic Metamaterials"));
  assert.ok(article.content.includes("\\bar{\\bar{\\varepsilon}}")); // Anisotropic tensor
  assert.ok(article.content.includes("subwavelength-grating (SWG) metamaterials"));
  assert.ok(article.content.includes("Q(\\mathbf{k})")); // Q-factor divergence
  assert.ok(!article.content.includes("Strehl ratio")); // Guarantees NO misplaced Strehl ratio
});

test("generateScientificArticleFromArxiv generates topic-specific formulations for Vacuum Non-Linearity & QED", () => {
  const title = "Classical versus non-classical photon states for detecting vacuum non-linearity";
  const summary = "Quantum electrodynamics (QED) predicts that the vacuum should behave as a non-linear medium. We consider sending in a classical or non-classical squeezed photon state.";
  const arxivLink = "https://arxiv.org/abs/2608.21361";
  const authors = "N. Ahmadiniaz, C. Kohlfürst, R. Shaisultanov";

  const article = generateScientificArticleFromArxiv(title, summary, arxivLink, authors, 202);

  assert.strictEqual(article.title, title);
  assert.ok(article.tags.includes("Quantum Electrodynamics"));
  assert.ok(article.tags.includes("Vacuum Birefringence"));
  assert.ok(article.content.includes("\\mathcal{L}_{\\text{EH}}")); // Euler-Heisenberg Lagrangian
  assert.ok(article.content.includes("E_{\\text{Schwinger}}")); // Schwinger critical field
  assert.ok(article.content.includes("squeezed vacuum state"));
  assert.ok(!article.content.includes("biological scattering phantoms")); // Guarantees NO biophotonics boilerplate
});

test("generateScientificArticleFromArxiv generates topic-specific formulations for Two-Photon Deep Brain Imaging (DeepFOCUS)", () => {
  const title = "Intensity-based scattering correction enables in vivo two-photon imaging beyond 1 mm";
  const summary = "Here, we introduce deep-learning-enhanced Fourier-domain intensity coupling for scattering correction (DeepFOCUS), an intensity-based two-photon approach.";
  const arxivLink = "https://arxiv.org/abs/2608.20224";
  const authors = "Yucheng Li, Renzhi He, Yi Xue";

  const article = generateScientificArticleFromArxiv(title, summary, arxivLink, authors, 303);

  assert.ok(article.tags.includes("Two-Photon Microscopy"));
  assert.ok(article.tags.includes("Deep-Brain Imaging"));
  assert.ok(article.content.includes("DeepFOCUS"));
  assert.ok(article.content.includes("S_{\\text{2PEF}}"));
  assert.ok(article.content.includes("hippocampal"));
});

test("generateScientificArticleFromArxiv generates topic-specific formulations for Vanishing Distance Wavefront Shaping", () => {
  const title = "The vanishing distance: a practical range boundary for dynamic wavefront shaping";
  const summary = "Wavefront shaping is a powerful method to control light propagation through scattering media. We introduce the vanishing distance boundary.";
  const arxivLink = "https://arxiv.org/abs/2608.17551";
  const authors = "Hugo Lassiette, Léa Testé, Léa Krafft";

  const article = generateScientificArticleFromArxiv(title, summary, arxivLink, authors, 404);

  assert.ok(article.tags.includes("Wavefront Shaping"));
  assert.ok(article.tags.includes("Ballistic Boundary"));
  assert.ok(article.content.includes("z_{\\text{vanish}}"));
  assert.ok(article.content.includes("I_{\\text{ball}}(z)"));
  assert.ok(article.content.includes("\\ell_{\\text{scat}}"));
});

test("STRICT ANTI-DUPLICATION: Regenerating 2 different papers generates distinct content and ZERO shared boilerplate findings", () => {
  const paperA = generateScientificArticleFromArxiv(
    "Artificial Anisotropy Induced Bound States in the Continuum for Integrated Photonic Waveguide",
    "Bound states in the continuum (BICs) enable light confinement without radiation loss using SWG metamaterials.",
    "https://arxiv.org/abs/2608.20992",
    "Jinzhao Wang, Kunrun Lu, Yuanlin Li",
    123
  );

  const paperB = generateScientificArticleFromArxiv(
    "Classical versus non-classical photon states for detecting vacuum non-linearity",
    "Quantum electrodynamics (QED) predicts vacuum non-linearity using squeezed photon states.",
    "https://arxiv.org/abs/2608.21361",
    "N. Ahmadiniaz, C. Kohlfürst, R. Shaisultanov",
    456
  );

  // Both papers must NOT have the same Strehl ratio boilerplate
  assert.strictEqual(paperA.content.includes("Strehl ratio improvements $S > 0.88$"), false);
  assert.strictEqual(paperB.content.includes("Strehl ratio improvements $S > 0.88$"), false);

  // Both papers must have distinct mathematical formulas
  assert.ok(paperA.content.includes("\\bar{\\bar{\\varepsilon}}")); // BIC anisotropic permittivity tensor
  assert.strictEqual(paperB.content.includes("\\bar{\\bar{\\varepsilon}}"), false);

  assert.ok(paperB.content.includes("\\mathcal{L}_{\\text{EH}}")); // Euler-Heisenberg Lagrangian
  assert.strictEqual(paperA.content.includes("\\mathcal{L}_{\\text{EH}}"), false);

  // Assert tags and categories are completely distinct
  assert.notDeepStrictEqual(paperA.tags, paperB.tags);
});

test("countLatexFormulas accurately computes inline and display mathematical formulas", () => {
  const textWithMath = `
  Here is an inline formula $E = mc^2$ and another $\\hbar \\omega$.
  And a display equation:
  $$\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}$$
  And a second display equation:
  $$Q(\\mathbf{k}) = \\frac{Q_0}{|\\mathbf{k} - \\mathbf{k}_{\\text{BIC}}|^2}$$
  `;

  const count = countLatexFormulas(textWithMath);
  assert.strictEqual(count, 4);
});

test("auditArticleAgainstArxiv passes with high fidelity on aligned paper", () => {
  const genuineArticle: BlogPost = {
    id: "blog-bic-01",
    slug: "artificial-anisotropy-induced-bic-01",
    title: "Artificial Anisotropy Induced Bound States in the Continuum for Integrated Photonic Waveguide",
    excerpt: "Bound states in the continuum (BICs) enable counterintuitive light confinement without radiation loss.",
    readingTime: "8 min read",
    arxivLink: "https://arxiv.org/abs/2608.20992",
    date: "August 24, 2026",
    author: "Jinzhao Wang, Kunrun Lu, Yuanlin Li",
    tags: ["Bound States in Continuum", "Anisotropic Metamaterials", "Optics"],
    views: 500,
    bannerSvg: "<svg></svg>",
    content: `## Executive Abstract & Core Contributions
    Bound states in the continuum (BICs) enable counterintuitive light confinement without radiation loss using subwavelength-grating (SWG) metamaterials.
    
    ## Key Theoretical Formulations
    The anisotropic permittivity tensor $\\bar{\\bar{\\varepsilon}}$ dictates mode propagation:
    $$\\nabla \\times \\left( \\bar{\\bar{\\varepsilon}}^{-1} \\nabla \\times \\mathbf{H} \\right) = \\left( \\frac{\\omega}{c} \\right)^2 \\mathbf{H}$$
    Radiation quality factor diverges in wavevector space:
    $$Q(\\mathbf{k}) = \\frac{Q_0}{|\\mathbf{k} - \\mathbf{k}_{\\text{BIC}}|^2}$$
    $$\\kappa_{\\text{rad}} = \\int \\mathbf{E}^* \\cdot \\Delta \\bar{\\bar{\\varepsilon}} \\cdot \\mathbf{E}\\, dV = 0$$
    $$\\delta n_{\\text{eff}} < 0.15$$
    
    ## Methodological Paradigm
    Phase 1: Metamaterial Homogenization via RCWA.
    Phase 2: Topological charge tracking in k-space.
    
    ## Key Results & Findings
    Loaded quality factor $Q > 4.8 \\times 10^6$ demonstrated at $\\lambda = 1550\\,\\text{nm}$.`
  };

  const report = auditArticleAgainstArxiv(genuineArticle);

  assert.strictEqual(report.status, "PASS");
  assert.ok(report.fidelityScore >= 80, `Expected fidelityScore >= 80, got ${report.fidelityScore}`);
  assert.strictEqual(report.detectedBoilerplatePhrases.length, 0);
  assert.ok(report.latexFormulaCount >= 4);
});

test("auditArticleAgainstArxiv flags WARN/FAIL and detects mismatched boilerplate when canned phrases are present", () => {
  const flawedArticle: BlogPost = {
    id: "blog-flawed-01",
    slug: "blog-flawed-01",
    title: "Artificial Anisotropy Induced Bound States in the Continuum for Integrated Photonic Waveguide",
    excerpt: "Bound states in the continuum analysis.",
    readingTime: "8 min read",
    arxivLink: "https://arxiv.org/abs/2608.20992",
    date: "August 24, 2026",
    author: "Jinzhao Wang",
    tags: ["Physics"],
    views: 100,
    bannerSvg: "<svg></svg>",
    content: `## Executive Abstract
    Bound states in the continuum.
    ## Key Results
    1. Strehl ratio improvements $S > 0.88$
    2. Sustained ballistic focus beyond $1.2\\,\\text{mm}$ in biological scattering phantoms
    3. Peak-to-background ratio (PBR) enhancement exceeding $34.2\\,\\text{dB}$`
  };

  const report = auditArticleAgainstArxiv(flawedArticle);

  assert.ok(report.detectedBoilerplatePhrases.length >= 2);
  assert.ok(report.detectedBoilerplatePhrases.includes("Strehl ratio improvements $S > 0.88$"));
  assert.ok(report.detectedBoilerplatePhrases.includes("Sustained ballistic focus beyond $1.2\\,\\text{mm}$ in biological scattering phantoms"));
  assert.ok(report.status === "FAIL" || report.status === "WARN");
});

test("auditCatalogUniqueness detects duplicated boilerplate across multiple articles in catalog", () => {
  const article1: BlogPost = {
    id: "art-1",
    slug: "art-1",
    title: "Paper 1 on Quantum Gravity",
    excerpt: "Gravity study",
    readingTime: "5 min",
    arxivLink: "https://arxiv.org/abs/2608.00001",
    date: "August 2026",
    author: "Author 1",
    tags: ["Physics"],
    views: 10,
    bannerSvg: "<svg></svg>",
    content: "Content with Strehl ratio improvements $S > 0.88$ and some text."
  };

  const article2: BlogPost = {
    id: "art-2",
    slug: "art-2",
    title: "Paper 2 on Anisotropy BIC",
    excerpt: "BIC study",
    readingTime: "5 min",
    arxivLink: "https://arxiv.org/abs/2608.00002",
    date: "August 2026",
    author: "Author 2",
    tags: ["Physics"],
    views: 20,
    bannerSvg: "<svg></svg>",
    content: "Another article with Strehl ratio improvements $S > 0.88$ inappropriately copied."
  };

  const summary = auditCatalogUniqueness([article1, article2]);
  assert.ok(summary.duplicateFindingsDetected >= 1);
  assert.strictEqual(summary.crossArticleDuplicates[0].affectedArticleIds.length, 2);
});
