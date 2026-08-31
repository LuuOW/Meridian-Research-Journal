import test from "node:test";
import assert from "node:assert";
import {
  countLatexFormulas,
  auditArticleAgainstArxiv,
  auditCatalogUniqueness
} from "./arxivAuditor";
import { BlogPost } from "../types";

test("countLatexFormulas counts both display $$...$$ and inline $...$ LaTeX formulas", () => {
  const content = `
## Theoretical Formulations
Here is an inline formula $\\Delta x \\ge \\frac{\\hbar}{2}$ and another $\\omega = 2\\pi f$.
Here is display math:
$$\\mathcal{L} = \\bar{\\psi}(i\\gamma^\\mu D_\\mu - m)\\psi$$
And another display block:
$$E = mc^2$$
`;
  const count = countLatexFormulas(content);
  assert.strictEqual(count, 4);
  assert.strictEqual(countLatexFormulas(""), 0);
});

test("auditArticleAgainstArxiv scores high fidelity for grounded, formula-rich articles", () => {
  const article: BlogPost = {
    id: "bic-waveguide-101",
    title: "Anisotropic Bound States in the Continuum for Subwavelength Grating Waveguides",
    slug: "anisotropic-bound-states-continuum-subwavelength-grating",
    arxivLink: "https://arxiv.org/abs/2608.10001",
    author: "Dr. Elena Vance",
    date: "2026-08-30",
    readingTime: "10 min read",
    bannerSvg: "<svg></svg>",
    tags: ["Bound States in Continuum", "Anisotropic Metamaterials", "Integrated Photonics"],
    excerpt: "We present subwavelength grating metamaterials enabling polarization-engineered bound states in continuum with ultra-high quality factors.",
    content: `## Executive Abstract & Core Contributions
We present subwavelength grating (SWG) metamaterials enabling polarization-engineered bound states in continuum (BIC) with ultra-high quality factors.
This investigation presents a rigorous formulation addressing foundational dynamics in Photonics & Metamaterials.

## Key Theoretical Formulations & Anisotropic BIC Physics
$$\\bar{\\bar{\\varepsilon}} = \\begin{pmatrix} \\varepsilon_{xx} & 0 & 0 \\\\ 0 & \\varepsilon_{yy} & 0 \\\\ 0 & 0 & \\varepsilon_{zz} \\end{pmatrix}$$
$$\\nabla \\times \\left( \\bar{\\bar{\\varepsilon}}^{-1} \\nabla \\times \\mathbf{H}(\\mathbf{r}) \\right) = \\left( \\frac{\\omega}{c} \\right)^2 \\mathbf{H}(\\mathbf{r})$$
$$\\kappa_{\\text{rad}} = \\int_{\\text{unit cell}} \\mathbf{E}_{\\text{guided}}^* \\cdot \\Delta \\bar{\\bar{\\varepsilon}} \\cdot \\mathbf{E}_{\\text{cont}}\\, dV = 0$$
$$Q(\\mathbf{k}) = \\frac{Q_0}{|\\mathbf{k} - \\mathbf{k}_{\\text{BIC}}|^2} + \\mathcal{O}(|\\mathbf{k} - \\mathbf{k}_{\\text{BIC}}|^4)$$

## Architecture & Metamaterial Engineering Paradigm
Rigorous coupled-wave analysis and effective medium theory.

## Key Results & Empirical Findings
Deterministic BIC tuning and quality factor divergence $Q > 10^7$.
`
  };

  const report = auditArticleAgainstArxiv(article);

  assert.strictEqual(report.articleId, "bic-waveguide-101");
  assert.strictEqual(report.arxivId, "2608.10001");
  assert.ok(report.fidelityScore >= 80, `Expected fidelity score >= 80, got ${report.fidelityScore}`);
  assert.strictEqual(report.status, "PASS");
  assert.strictEqual(report.metrics.mathematicalPrecisionScore, 20);
  assert.strictEqual(report.metrics.antiBoilerplateScore, 20);
  assert.strictEqual(report.detectedBoilerplatePhrases.length, 0);
  assert.ok(report.domainIdentified.includes("BIC"));
});

test("auditArticleAgainstArxiv detects mismatched domain boilerplate and applies penalty", () => {
  const article: BlogPost = {
    id: "fault-tolerant-quantum-102",
    title: "Fault-Tolerant Quantum Circuits via 3D Subsystem Product Codes",
    slug: "fault-tolerant-quantum-circuits-3d-subsystem-product-codes",
    arxivLink: "https://arxiv.org/abs/2608.60006",
    author: "Quantum Group",
    date: "2026-08-28",
    readingTime: "9 min read",
    bannerSvg: "<svg></svg>",
    tags: ["Fault-Tolerant Computing", "Quantum Error Correction"],
    excerpt: "Fault tolerant quantum computing in adversarial regimes.",
    content: `## Executive Abstract
Fault tolerant quantum computing.
Sustained ballistic focus beyond $1.2\\,\\text{mm}$ in biological scattering phantoms.
Strehl ratio improvements $S > 0.88$.
`
  };

  const report = auditArticleAgainstArxiv(article);

  assert.ok(report.detectedBoilerplatePhrases.length >= 1);
  assert.ok(report.metrics.antiBoilerplateScore < 20);
  assert.ok(report.recommendations.some(r => r.includes("Detected mismatched boilerplate")));
});

test("auditCatalogUniqueness identifies duplicate findings across articles and computes portfolio metrics", () => {
  const articles: BlogPost[] = [
    {
      id: "art-1",
      title: "Paper One",
      slug: "paper-one",
      excerpt: "Excerpt one",
      date: "2026-08-30",
      readingTime: "5 min read",
      author: "Lucas Kempe",
      bannerSvg: "<svg></svg>",
      tags: ["Physics"],
      arxivLink: "https://arxiv.org/abs/2608.11111",
      content: "Peak-to-background ratio (PBR) enhancement exceeding $34.2\\,\\text{dB}$ in tissue phantoms. Executive abstract."
    },
    {
      id: "art-2",
      title: "Paper Two",
      slug: "paper-two",
      excerpt: "Excerpt two",
      date: "2026-08-30",
      readingTime: "5 min read",
      author: "Lucas Kempe",
      bannerSvg: "<svg></svg>",
      tags: ["Physics"],
      arxivLink: "https://arxiv.org/abs/2608.22222",
      content: "Peak-to-background ratio (PBR) enhancement exceeding $34.2\\,\\text{dB}$ in quantum optics. Executive abstract."
    }
  ];

  const summary = auditCatalogUniqueness(articles);

  assert.strictEqual(summary.totalArticles, 2);
  assert.ok(summary.duplicateFindingsDetected >= 1);
  assert.ok(summary.crossArticleDuplicates.some(d => d.phrase.includes("Peak-to-background ratio (PBR) enhancement")));
  assert.ok(typeof summary.averageFidelityScore === "number");
});
