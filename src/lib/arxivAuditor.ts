import { BlogPost } from "../types";
import { extractArxivId, ArxivMetadata } from "./arxivUtils";

export interface ArxivAuditReport {
  articleId: string;
  articleTitle: string;
  arxivLink: string;
  arxivId: string | null;
  fidelityScore: number; // 0 to 100
  status: "PASS" | "WARN" | "FAIL";
  metrics: {
    referenceMatchScore: number; // 0-30
    abstractGroundingScore: number; // 0-30
    mathematicalPrecisionScore: number; // 0-20
    antiBoilerplateScore: number; // 0-20
  };
  matchedKeywords: string[];
  missingKeyConcepts: string[];
  latexFormulaCount: number;
  detectedBoilerplatePhrases: string[];
  domainIdentified: string;
  recommendations: string[];
  auditedAt: number;
}

export interface CatalogAuditSummary {
  totalArticles: number;
  passedCount: number;
  warnCount: number;
  failCount: number;
  averageFidelityScore: number;
  duplicateFindingsDetected: number;
  crossArticleDuplicates: {
    phrase: string;
    affectedArticleIds: string[];
  }[];
  reports: ArxivAuditReport[];
}

/**
 * Common known boilerplate phrases that should NEVER be blindly copied across unrelated papers
 */
const KNOWN_BOILERPLATE_PATTERNS = [
  {
    phrase: "Strehl ratio improvements $S > 0.88$",
    domain: "optical_wavefront",
    description: "Specific wavefront Strehl ratio finding"
  },
  {
    phrase: "Sustained ballistic focus beyond $1.2\\,\\text{mm}$ in biological scattering phantoms",
    domain: "scattering_biophotonics",
    description: "Tissue scattering penetration metric"
  },
  {
    phrase: "Peak-to-background ratio (PBR) enhancement exceeding $34.2\\,\\text{dB}$",
    domain: "scattering_biophotonics",
    description: "PBR enhancement metric"
  },
  {
    phrase: "Lindblad master equation for open quantum dissipative systems",
    domain: "open_quantum_systems",
    description: "Generic Lindblad master equation fallback"
  },
  {
    phrase: "The primary state transitions are governed by unitary transformations over complex Hilbert space",
    domain: "generic_quantum",
    description: "Generic Hilbert space template"
  },
  {
    phrase: "High-dimensional tensor network contractions",
    domain: "tensor_networks",
    description: "Generic tensor network template"
  }
];

/**
 * Extract meaningful terms from text
 */
function extractSignificantTerms(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  
  const stopWords = new Set([
    "this", "that", "with", "from", "have", "been", "were", "which", "their", "there",
    "these", "those", "about", "into", "through", "after", "before", "under", "where",
    "using", "based", "presents", "demonstrate", "paper", "study", "work", "novel", "here",
    "article", "recent", "within", "between", "both", "such", "than", "then", "more", "most"
  ]);

  return [...new Set(words.filter((w) => !stopWords.has(w)))];
}

/**
 * Count valid LaTeX formula blocks in markdown content
 */
export function countLatexFormulas(content: string): number {
  if (!content) return 0;
  // Match display math $$...$$ and inline math $...$
  const displayMatches = content.match(/\$\$[\s\S]*?\$\$/g) || [];
  const inlineMatches = content.match(/(?<!\$)\$([^$\n]+)\$(?!\$)/g) || [];
  return displayMatches.length + inlineMatches.length;
}

/**
 * Audits a single article against an authoritative arXiv reference or parsed paper content
 */
export function auditArticleAgainstArxiv(
  article: BlogPost,
  arxivMeta?: ArxivMetadata | null
): ArxivAuditReport {
  const content = article.content || "";
  const title = article.title || "";
  const excerpt = article.excerpt || "";
  const arxivLink = article.arxivLink || "";
  const arxivId = extractArxivId(arxivLink);

  const matchedKeywords: string[] = [];
  const missingKeyConcepts: string[] = [];
  const detectedBoilerplatePhrases: string[] = [];
  const recommendations: string[] = [];

  // 1. Reference Match Audit (0-30 pts)
  let referenceMatchScore = 0;
  if (arxivId) {
    referenceMatchScore += 15; // Valid arXiv ID
  } else {
    recommendations.push("Add a valid arXiv URL (e.g. https://arxiv.org/abs/2608.xxxxx) to verify provenance.");
  }

  // If arXiv metadata is provided, evaluate title and abstract alignment
  const referenceTitle = (arxivMeta?.title || title).toLowerCase();
  const referenceSummary = (arxivMeta?.summary || excerpt).toLowerCase();
  const combinedReference = referenceTitle + " " + referenceSummary;

  const refTerms = extractSignificantTerms(combinedReference);
  const contentTerms = new Set(extractSignificantTerms(content));

  let matchedTermCount = 0;
  for (const term of refTerms.slice(0, 20)) {
    if (contentTerms.has(term)) {
      matchedKeywords.push(term);
      matchedTermCount++;
    } else {
      missingKeyConcepts.push(term);
    }
  }

  const termMatchRatio = refTerms.length > 0 ? matchedTermCount / Math.min(refTerms.length, 20) : 0.8;
  referenceMatchScore += Math.round(termMatchRatio * 15);

  // 2. Abstract Grounding & Semantic Coverage (0-30 pts)
  let abstractGroundingScore = 0;
  if (content.length > 1000) abstractGroundingScore += 10;
  if (content.toLowerCase().includes("executive abstract") || content.toLowerCase().includes("introduction")) {
    abstractGroundingScore += 5;
  }
  if (termMatchRatio >= 0.5) {
    abstractGroundingScore += 15;
  } else if (termMatchRatio >= 0.3) {
    abstractGroundingScore += 10;
  } else {
    abstractGroundingScore += 5;
    recommendations.push("Article prose has low semantic overlap with the arXiv abstract. Ground synthesis with specific paper methodologies.");
  }

  // 3. Mathematical Precision & LaTeX Formulations (0-20 pts)
  let mathematicalPrecisionScore = 0;
  const latexCount = countLatexFormulas(content);
  if (latexCount >= 4) {
    mathematicalPrecisionScore = 20;
  } else if (latexCount >= 2) {
    mathematicalPrecisionScore = 14;
    recommendations.push("Incorporate more domain-specific LaTeX derivations ($$...$$) to enhance mathematical rigor.");
  } else if (latexCount >= 1) {
    mathematicalPrecisionScore = 8;
    recommendations.push("Only 1 formula detected. Expand theoretical formulations with explicit equations.");
  } else {
    mathematicalPrecisionScore = 0;
    recommendations.push("No LaTeX formulas found. Scholarly articles should include formal mathematical formulations.");
  }

  // 4. Anti-Boilerplate Integrity (0-20 pts)
  let antiBoilerplateScore = 20;

  // Check for misplaced domain boilerplate
  const isOpticalWavefrontPaper = combinedReference.includes("wavefront") || combinedReference.includes("adaptive optics") || combinedReference.includes("strehl");
  const isBiophotonicTissuePaper = combinedReference.includes("two-photon") || combinedReference.includes("scattering media") || combinedReference.includes("deep-brain") || combinedReference.includes("in vivo");
  const isOpenQuantumDissipativePaper = combinedReference.includes("lindblad") || combinedReference.includes("dissipative") || combinedReference.includes("open quantum");

  for (const bp of KNOWN_BOILERPLATE_PATTERNS) {
    if (content.includes(bp.phrase)) {
      let isLegitimate = false;
      if (bp.domain === "optical_wavefront" && isOpticalWavefrontPaper) isLegitimate = true;
      if (bp.domain === "scattering_biophotonics" && isBiophotonicTissuePaper) isLegitimate = true;
      if (bp.domain === "open_quantum_systems" && isOpenQuantumDissipativePaper) isLegitimate = true;

      if (!isLegitimate) {
        detectedBoilerplatePhrases.push(bp.phrase);
        antiBoilerplateScore = Math.max(0, antiBoilerplateScore - 10);
        recommendations.push(`Detected mismatched boilerplate: "${bp.phrase.slice(0, 45)}...". Replace with paper-specific empirical findings.`);
      }
    }
  }

  // Calculate final composite fidelity score
  const fidelityScore = Math.min(100, Math.max(0,
    referenceMatchScore +
    abstractGroundingScore +
    mathematicalPrecisionScore +
    antiBoilerplateScore
  ));

  let status: "PASS" | "WARN" | "FAIL" = "PASS";
  if (fidelityScore < 60 || detectedBoilerplatePhrases.length >= 2) {
    status = "FAIL";
  } else if (fidelityScore < 80 || detectedBoilerplatePhrases.length >= 1) {
    status = "WARN";
  }

  // Detect domain
  let domainIdentified = "Theoretical & Mathematical Physics";
  if (combinedReference.includes("bound state") || combinedReference.includes("bic") || combinedReference.includes("anisotrop")) {
    domainIdentified = "Anisotropic Photonic Waveguides & BICs";
  } else if (combinedReference.includes("vacuum") || combinedReference.includes("qed") || combinedReference.includes("non-linear")) {
    domainIdentified = "Quantum Electrodynamics & Vacuum Non-Linearity";
  } else if (combinedReference.includes("two-photon") || combinedReference.includes("scattering correction")) {
    domainIdentified = "Biophotonics & Deep Tissue Two-Photon Imaging";
  } else if (combinedReference.includes("vanishing distance") || combinedReference.includes("wavefront shaping")) {
    domainIdentified = "Dynamic Wavefront Shaping & Optical Boundaries";
  } else if (combinedReference.includes("pseudoangular") || combinedReference.includes("lattice resonance")) {
    domainIdentified = "Topological Nanophotonics & SLR Resonances";
  } else if (combinedReference.includes("fault-tolerant") || combinedReference.includes("subsystem product")) {
    domainIdentified = "Fault-Tolerant Quantum Circuits";
  }

  return {
    articleId: article.id,
    articleTitle: title,
    arxivLink,
    arxivId,
    fidelityScore,
    status,
    metrics: {
      referenceMatchScore,
      abstractGroundingScore,
      mathematicalPrecisionScore,
      antiBoilerplateScore
    },
    matchedKeywords: matchedKeywords.slice(0, 10),
    missingKeyConcepts: missingKeyConcepts.slice(0, 6),
    latexFormulaCount: latexCount,
    detectedBoilerplatePhrases,
    domainIdentified,
    recommendations,
    auditedAt: Date.now()
  };
}

/**
 * Runs a cross-catalog uniqueness audit to catch duplicate sections or canned findings across all articles
 */
export function auditCatalogUniqueness(articles: BlogPost[]): CatalogAuditSummary {
  const reports = articles.map((article) => auditArticleAgainstArxiv(article));
  
  // Track sentence & formula cross-occurrences
  const phraseMap = new Map<string, string[]>();
  
  for (const article of articles) {
    const text = article.content || "";
    for (const bp of KNOWN_BOILERPLATE_PATTERNS) {
      if (text.includes(bp.phrase)) {
        const existing = phraseMap.get(bp.phrase) || [];
        existing.push(article.id);
        phraseMap.set(bp.phrase, existing);
      }
    }
  }

  const crossArticleDuplicates: { phrase: string; affectedArticleIds: string[] }[] = [];
  let duplicateFindingsDetected = 0;

  for (const [phrase, ids] of phraseMap.entries()) {
    if (ids.length > 1) {
      duplicateFindingsDetected++;
      crossArticleDuplicates.push({ phrase, affectedArticleIds: ids });
    }
  }

  const totalArticles = articles.length;
  const passedCount = reports.filter((r) => r.status === "PASS").length;
  const warnCount = reports.filter((r) => r.status === "WARN").length;
  const failCount = reports.filter((r) => r.status === "FAIL").length;
  const averageFidelityScore = totalArticles > 0
    ? Math.round(reports.reduce((acc, r) => acc + r.fidelityScore, 0) / totalArticles)
    : 100;

  return {
    totalArticles,
    passedCount,
    warnCount,
    failCount,
    averageFidelityScore,
    duplicateFindingsDetected,
    crossArticleDuplicates,
    reports
  };
}
