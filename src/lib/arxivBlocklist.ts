/**
 * ArXiv Blocklist & Scholarly Scope Enforcement
 * Meridian exclusively publishes research within physics.optics and quant-ph.
 * Any non-compliant, out-of-scope (e.g. CS/LLM benchmarks), or rejected papers
 * are permanently quarantined and banned from appearing in the journal.
 */

export const BLOCKED_ARXIV_IDS: readonly string[] = Object.freeze([
  "2608.12345", // Diagnostic Foundation for Evaluating LLMs' Research Integrity as Co-Scientists (CS / LLM)
  "2609.11042", // Terminal Agent Reinforcement Learning for Long-Horizon Tasks (CS / ML)
]);

export const BLOCKED_SLUGS: readonly string[] = Object.freeze([
  "diagnostic-foundation-for-evaluating-llms-39-research-integr",
  "diagnostic-foundation-for-evaluating-llms-research-integrity",
  "diagnostic-foundation-for-evaluating-llms",
  "terminal-agent-reinforcement-learning-for-long-horizon-tasks",
  "2609-11042-8694",
  "2609-11042",
  "2608-12345",
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
]);

export const BLOCKED_TITLE_KEYWORDS: readonly string[] = Object.freeze([
  "diagnostic foundation for evaluating llms",
  "terminal agent reinforcement learning",
  "integritybench",
]);

/**
 * Checks if a given paper, blog, ID, slug, or title is permanently blocked/quarantined.
 */
export function isArticleBlocked(item: any): boolean {
  if (!item) return false;

  // String check (ID, slug, or arXiv ID passed directly)
  if (typeof item === "string") {
    const s = item.trim().toLowerCase();
    if (BLOCKED_ARXIV_IDS.some(id => s.includes(id))) return true;
    if (BLOCKED_SLUGS.some(slug => s.includes(slug.toLowerCase()))) return true;
    if (BLOCKED_BLOG_IDS.some(id => s.includes(id.toLowerCase()))) return true;
    if (BLOCKED_TITLE_KEYWORDS.some(kw => s.includes(kw))) return true;
    return false;
  }

  // Check ID
  if (item.id && typeof item.id === "string") {
    const idLower = item.id.toLowerCase();
    if (BLOCKED_BLOG_IDS.some(bid => idLower === bid.toLowerCase())) return true;
    if (BLOCKED_ARXIV_IDS.some(aid => idLower.includes(aid))) return true;
  }

  // Check Slug
  if (item.slug && typeof item.slug === "string") {
    const slugLower = item.slug.toLowerCase();
    if (BLOCKED_SLUGS.some(bslug => slugLower.includes(bslug.toLowerCase()))) return true;
  }

  // Check ArxivLink / ArxivId
  const arxivStr = (item.arxivLink || item.arxivId || item.arxiv || item.link || "") as string;
  if (typeof arxivStr === "string") {
    if (BLOCKED_ARXIV_IDS.some(aid => arxivStr.includes(aid))) return true;
  }

  // Check Title
  if (item.title && typeof item.title === "string") {
    const titleLower = item.title.toLowerCase();
    if (BLOCKED_TITLE_KEYWORDS.some(kw => titleLower.includes(kw))) return true;
  }

  // Check Content / Excerpt for known quarantined signatures
  if (item.content && typeof item.content === "string") {
    if (item.content.includes("2608.12345") || item.content.includes("Diagnostic Foundation for Evaluating LLMs")) {
      return true;
    }
  }

  // Check categories: if strictly CS/ML/AI without any optics or quant-ph
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
    const isExclusivelyCS = allCats.every(c => 
      c.startsWith("cs.") || 
      c.startsWith("stat.") || 
      c.startsWith("econ.")
    );
    if (isExclusivelyCS && !hasAllowedPhysics) {
      return true;
    }
  }

  return false;
}

/**
 * Filters out all blocked/quarantined articles from an array.
 */
export function filterBlockedArticles<T>(articles: T[]): T[] {
  if (!Array.isArray(articles)) return [];
  return articles.filter(article => !isArticleBlocked(article));
}
