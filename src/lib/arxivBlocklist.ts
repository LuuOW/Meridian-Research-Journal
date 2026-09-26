/**
 * ArXiv Blocklist & Scholarly Scope Enforcement
 * Meridian exclusively publishes research within physics.optics and quant-ph.
 * Any non-compliant, out-of-scope (e.g. CS/LLM benchmarks, Cryptography), or rejected papers
 * are permanently quarantined and banned from appearing in the journal.
 */

export const BLOCKED_ARXIV_IDS: readonly string[] = Object.freeze([
  "2608.12345", // Diagnostic Foundation for Evaluating LLMs' Research Integrity as Co-Scientists (CS / LLM)
  "2609.11042", // Terminal Agent Reinforcement Learning for Long-Horizon Tasks (CS / ML)
  "2609.11809", // Designing metallo-dielectric antennas for cryogenic applications (disputed preprint)
  "2608.77777", // Synthetic test artifact
  "2608.11111", // Generic Spectral Determination of Semiclassical Schrödinger Operators (math.DS - Mathematics / Aug 11 stale)
  "2609.06542", // Recovering topological information of light by topological learning (Stale Sep 6 submission)
  "2609.20188", // Jay Barach ResumeShield indirect prompt injection benchmark (CS / Cryptography and Security, July 24 stale)
  "2407.20188", // ResumeShield: Channel Separation and an Open Benchmark (CS.CR - Cryptography and Security)
]);

export const BLOCKED_SLUGS: readonly string[] = Object.freeze([
  "diagnostic-foundation-for-evaluating-llms-39-research-integr",
  "diagnostic-foundation-for-evaluating-llms-research-integrity",
  "diagnostic-foundation-for-evaluating-llms",
  "terminal-agent-reinforcement-learning-for-long-horizon-tasks",
  "generic-spectral-determination-of-semiclassical-schr-dinger-",
  "generic-spectral-determination-of-semiclassical-schrodinger",
  "recovering-topological-information-of-light-by-topological-learning",
  "resumeshield-channel-separation-and-an-open-benchmark",
  "resumeshield",
  "2609-06542v1-5582",
  "2609-11042-8694",
  "2609-11042",
  "2608-12345",
  "2608-11111",
  "2609-20188",
  "2407-20188"
]);

export const BLOCKED_BLOG_IDS: readonly string[] = Object.freeze([
  "blog-1789419243318-3b68c",
  "blog-1789395581333-o2y84",
  "blog-1789325820912-zscyk",
  "blog-1788302817617-104kn",
  "blog-1788302181901-zhh6o",
  "blog-1788302160015-k0dkt",
  "blog-1788302136465-baot7",
  "blog-2609-11042-8694",
  "blog-2609-11809-3143",
  "blog-1789613391006-pwjbf",
  "blog-2609-06542v1-5582",
  "blog-2609-20188v1-3829",
  "blog-1790181898483-98vez",
  "blog-2609-08748v1-6870",
]);

export const BLOCKED_TITLE_KEYWORDS: readonly string[] = Object.freeze([
  "diagnostic foundation for evaluating llms",
  "terminal agent reinforcement learning",
  "integritybench",
  "generic spectral determination of semiclassical",
  "generic spectral determination of semiclassical schrödinger",
  "generic spectral determination of semiclassical schrodinger",
  "resumeshield",
  "channel separation and an open benchmark",
  "indirect prompt injection in ai resume screening",
  "indirect prompt injection",
  "resume screening",
  "jay barach",
]);

export interface BlockcheckResult {
  blocked: boolean;
  reason?: string;
  rule?: "ARXIV_ID" | "SLUG" | "BLOG_ID" | "TITLE_KEYWORD" | "AUTHOR" | "CONTENT_SIGNATURE" | "DISALLOWED_CATEGORY" | "STALE_SUBMISSION";
}

/**
 * Evaluates whether an article/candidate is blocked and provides an explicit diagnostic reason.
 */
export function checkArticleBlocked(item: any): BlockcheckResult {
  if (!item) return { blocked: false };

  // 1. String check (ID, slug, or arXiv ID passed directly)
  if (typeof item === "string") {
    const s = item.trim().toLowerCase();
    for (const aid of BLOCKED_ARXIV_IDS) {
      if (s.includes(aid.toLowerCase())) {
        return {
          blocked: true,
          reason: `ArXiv ID ${aid} is permanently quarantined on the blocklist (out-of-scope or stale preprint).`,
          rule: "ARXIV_ID"
        };
      }
    }
    for (const slug of BLOCKED_SLUGS) {
      if (s.includes(slug.toLowerCase())) {
        return {
          blocked: true,
          reason: `Slug '${slug}' matches permanently quarantined article blocklist.`,
          rule: "SLUG"
        };
      }
    }
    for (const bid of BLOCKED_BLOG_IDS) {
      if (s === bid.toLowerCase()) {
        return {
          blocked: true,
          reason: `Blog ID '${bid}' matches permanently quarantined publication blocklist.`,
          rule: "BLOG_ID"
        };
      }
    }
    for (const kw of BLOCKED_TITLE_KEYWORDS) {
      if (s.includes(kw)) {
        return {
          blocked: true,
          reason: `Input text contains quarantined keyword phrase: "${kw}".`,
          rule: "TITLE_KEYWORD"
        };
      }
    }
    return { blocked: false };
  }

  // 2. Check Blog ID
  if (item.id && typeof item.id === "string") {
    const idLower = item.id.toLowerCase();
    for (const bid of BLOCKED_BLOG_IDS) {
      if (idLower === bid.toLowerCase()) {
        return {
          blocked: true,
          reason: `Publication ID '${item.id}' is permanently quarantined on the blocklist.`,
          rule: "BLOG_ID"
        };
      }
    }
    for (const aid of BLOCKED_ARXIV_IDS) {
      if (idLower.includes(aid.toLowerCase())) {
        return {
          blocked: true,
          reason: `Publication ID '${item.id}' contains quarantined arXiv ID: ${aid}.`,
          rule: "ARXIV_ID"
        };
      }
    }
  }

  // 3. Check Slug
  if (item.slug && typeof item.slug === "string") {
    const slugLower = item.slug.toLowerCase();
    for (const bslug of BLOCKED_SLUGS) {
      if (slugLower.includes(bslug.toLowerCase())) {
        return {
          blocked: true,
          reason: `Article slug '${item.slug}' matches quarantined slug: ${bslug}.`,
          rule: "SLUG"
        };
      }
    }
  }

  // 4. Check ArxivLink / ArxivId
  const arxivStr = (item.arxivLink || item.arxivId || item.arxiv || item.link || "") as string;
  if (typeof arxivStr === "string" && arxivStr.trim()) {
    for (const aid of BLOCKED_ARXIV_IDS) {
      if (arxivStr.toLowerCase().includes(aid.toLowerCase())) {
        return {
          blocked: true,
          reason: `arXiv link (${arxivStr}) references quarantined paper ID: ${aid}.`,
          rule: "ARXIV_ID"
        };
      }
    }
  }

  // 5. Check Title
  if (item.title && typeof item.title === "string") {
    const titleLower = item.title.toLowerCase();
    for (const kw of BLOCKED_TITLE_KEYWORDS) {
      if (titleLower.includes(kw)) {
        return {
          blocked: true,
          reason: `Article title contains prohibited phrase: "${kw}" (editorial policy violation).`,
          rule: "TITLE_KEYWORD"
        };
      }
    }
  }

  // 6. Check Authors
  const authorsStr = (item.authors || item.author || "") as string;
  if (typeof authorsStr === "string" && authorsStr.trim()) {
    const authorsLower = authorsStr.toLowerCase();
    if (authorsLower.includes("jay barach")) {
      return {
        blocked: true,
        reason: "Author 'Jay Barach' is associated with quarantined CS.CR benchmark (ResumeShield).",
        rule: "AUTHOR"
      };
    }
  }

  // 7. Check Content / Excerpt for known quarantined signatures
  const fullText = `${item.content || ""} ${item.excerpt || ""} ${item.summary || ""}`.toLowerCase();
  if (fullText.includes("2608.12345") || fullText.includes("diagnostic foundation for evaluating llms")) {
    return {
      blocked: true,
      reason: "Content matches quarantined Diagnostic Foundation LLM evaluation benchmark signature.",
      rule: "CONTENT_SIGNATURE"
    };
  }
  if (fullText.includes("resumeshield") || fullText.includes("indirect prompt injection in ai resume")) {
    return {
      blocked: true,
      reason: "Content matches quarantined ResumeShield CS prompt injection benchmark signature.",
      rule: "CONTENT_SIGNATURE"
    };
  }

  // 8. Check Categories: if strictly CS/ML/AI/math/stat without any optics or quant-ph
  const allCats = [
    item.primaryCategory,
    ...(Array.isArray(item.categories) ? item.categories : [])
  ].filter(Boolean).map(c => String(c).toLowerCase());

  if (allCats.length > 0) {
    const hasAllowedPhysics = allCats.some(c => 
      c === "physics.optics" || 
      c.includes("optics") || 
      c === "quant-ph" || 
      c.includes("quant-ph")
    );
    const isDisallowedDiscipline = allCats.every(c => 
      c.startsWith("cs.") || 
      c.startsWith("stat.") || 
      c.startsWith("econ.") ||
      c.startsWith("math.") ||
      c.startsWith("q-bio.") ||
      c.startsWith("q-fin.")
    );
    if (isDisallowedDiscipline && !hasAllowedPhysics) {
      return {
        blocked: true,
        reason: `Article categories [${allCats.join(", ")}] are out-of-scope for Meridian ('quant-ph' or 'physics.optics' required).`,
        rule: "DISALLOWED_CATEGORY"
      };
    }
  }

  return { blocked: false };
}

/**
 * Checks if a given paper, blog, ID, slug, or title is permanently blocked/quarantined.
 */
export function isArticleBlocked(item: any): boolean {
  return checkArticleBlocked(item).blocked;
}

/**
 * Logs a blocked article with a descriptive diagnostic reason to telemetry/console.
 */
export function logBlockedArticle(item: any, context: string = "Pipeline"): BlockcheckResult {
  const result = checkArticleBlocked(item);
  if (result.blocked) {
    console.warn(`[ArXiv Blocklist Policy Guard][${context}] QUARANTINED: ${result.reason} (Rule: ${result.rule})`);
  }
  return result;
}

/**
 * Filters out all blocked/quarantined articles from an array.
 */
export function filterBlockedArticles<T>(articles: T[]): T[] {
  if (!Array.isArray(articles)) return [];
  return articles.filter(article => {
    const check = checkArticleBlocked(article);
    if (check.blocked) {
      console.warn(`[Filter Blocked Articles] Filtering out item: ${check.reason}`);
      return false;
    }
    return true;
  });
}

