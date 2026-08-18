/**
 * Advanced search query parser and ranking engine.
 * Supports tokenized search queries with field filters:
 * - tag:quantum
 * - author:"Lucas Kempe"
 * - year:2026
 * - minread:5
 * - "exact phrase matching"
 * - -excluded (negative term filtering)
 */

import { BlogPost } from "../types";

export interface ParsedSearchQuery {
  raw: string;
  terms: string[];
  exactPhrases: string[];
  excludedTerms: string[];
  tagFilters: string[];
  authorFilter?: string;
  yearFilter?: number;
  minReadTime?: number;
}

export interface SearchResult {
  post: BlogPost;
  score: number;
  matchedFields: string[];
}

/**
 * Parses a rich search query string into structured query tokens.
 */
export function parseAdvancedQuery(queryString: string): ParsedSearchQuery {
  if (!queryString || typeof queryString !== "string") {
    return {
      raw: "",
      terms: [],
      exactPhrases: [],
      excludedTerms: [],
      tagFilters: []
    };
  }

  const raw = queryString.trim();
  const exactPhrases: string[] = [];
  const excludedTerms: string[] = [];
  const tagFilters: string[] = [];
  const terms: string[] = [];
  let authorFilter: string | undefined;
  let yearFilter: number | undefined;
  let minReadTime: number | undefined;

  // Extract key:"quoted value" or key:value modifiers first
  let processed = raw;

  // 1. Author with quotes or simple value: author:"Lucas Kempe" or author:Kempe
  processed = processed.replace(/\bauthor:(?:"([^"]+)"|(\S+))/gi, (_, quoted, simple) => {
    const val = (quoted || simple || "").trim();
    if (val) authorFilter = val;
    return " ";
  });

  // 2. Tag with quotes or simple value: tag:"Silicon Photonics"
  processed = processed.replace(/\btag:(?:"([^"]+)"|(\S+))/gi, (_, quoted, simple) => {
    const val = (quoted || simple || "").trim().toLowerCase();
    if (val) tagFilters.push(val);
    return " ";
  });

  // 3. Year: year:2026
  processed = processed.replace(/\byear:(\d{4})\b/gi, (_, y) => {
    const yVal = parseInt(y, 10);
    if (!isNaN(yVal)) yearFilter = yVal;
    return " ";
  });

  // 4. Minread: minread:5
  processed = processed.replace(/\bminread:(\d+)\b/gi, (_, m) => {
    const mVal = parseInt(m, 10);
    if (!isNaN(mVal)) minReadTime = mVal;
    return " ";
  });

  // 5. Extract remaining standalone exact phrases wrapped in double quotes
  processed = processed.replace(/"([^"]+)"/g, (_, phrase) => {
    if (phrase.trim()) {
      exactPhrases.push(phrase.trim().toLowerCase());
    }
    return " ";
  });

  // Split remaining tokens
  const rawTokens = processed.split(/\s+/).filter(Boolean);

  for (const token of rawTokens) {
    const lower = token.toLowerCase();

    if (lower.startsWith("tag:") || lower.startsWith("#")) {
      const tagVal = lower.replace(/^(tag:|#)/, "").trim();
      if (tagVal) tagFilters.push(tagVal);
    } else if (lower.startsWith("author:")) {
      const authorVal = token.slice(7).trim();
      if (authorVal) authorFilter = authorVal;
    } else if (lower.startsWith("year:")) {
      const yearVal = parseInt(lower.slice(5), 10);
      if (!isNaN(yearVal)) yearFilter = yearVal;
    } else if (lower.startsWith("minread:")) {
      const minVal = parseInt(lower.slice(8), 10);
      if (!isNaN(minVal)) minReadTime = minVal;
    } else if (lower.startsWith("-") && lower.length > 1) {
      const excluded = lower.slice(1).trim();
      if (excluded) excludedTerms.push(excluded);
    } else {
      terms.push(lower);
    }
  }

  return {
    raw,
    terms,
    exactPhrases,
    excludedTerms,
    tagFilters,
    authorFilter,
    yearFilter,
    minReadTime
  };
}

/**
 * Evaluates whether a post matches all structured criteria of a query and calculates its relevance score.
 */
export function evaluatePostMatch(post: BlogPost, query: ParsedSearchQuery): { matches: boolean; score: number; matchedFields: string[] } {
  if (!post) return { matches: false, score: 0, matchedFields: [] };

  const titleLower = (post.title || "").toLowerCase();
  const contentLower = (post.content || "").toLowerCase();
  const excerptLower = (post.excerpt || "").toLowerCase();
  const tagsLower = (post.tags || []).map(t => t.toLowerCase());
  const authorLower = (post.author || "Lucas Kempe").toLowerCase();

  // 1. Excluded terms filter (Hard negative filter)
  for (const excluded of query.excludedTerms) {
    if (
      titleLower.includes(excluded) ||
      contentLower.includes(excluded) ||
      tagsLower.some(t => t.includes(excluded))
    ) {
      return { matches: false, score: 0, matchedFields: [] };
    }
  }

  // 2. Exact phrases match (All exact phrases must appear in title, excerpt, or content)
  for (const phrase of query.exactPhrases) {
    const found =
      titleLower.includes(phrase) ||
      excerptLower.includes(phrase) ||
      contentLower.includes(phrase);
    if (!found) {
      return { matches: false, score: 0, matchedFields: [] };
    }
  }

  // 3. Tag filter
  if (query.tagFilters.length > 0) {
    const hasMatchingTag = query.tagFilters.some(filterTag =>
      tagsLower.some(t => t.includes(filterTag))
    );
    if (!hasMatchingTag) {
      return { matches: false, score: 0, matchedFields: [] };
    }
  }

  // 4. Author filter
  if (query.authorFilter) {
    if (!authorLower.includes(query.authorFilter.toLowerCase())) {
      return { matches: false, score: 0, matchedFields: [] };
    }
  }

  // 5. Year filter
  if (query.yearFilter) {
    const postYear = new Date(post.date || "").getFullYear();
    if (!isNaN(postYear) && postYear !== query.yearFilter) {
      return { matches: false, score: 0, matchedFields: [] };
    }
  }

  // 6. Minimum read time filter
  if (query.minReadTime) {
    const words = (post.content || "").trim().split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.ceil(words / 200));
    if (readMinutes < query.minReadTime) {
      return { matches: false, score: 0, matchedFields: [] };
    }
  }

  // Calculate score & matched fields
  let score = 0;
  const matchedFields: string[] = [];

  // Exact phrase bonuses
  if (query.exactPhrases.length > 0) {
    score += query.exactPhrases.length * 50;
    matchedFields.push("exact_phrase");
  }

  // Regular search terms
  for (const term of query.terms) {
    let termMatched = false;
    if (titleLower.includes(term)) {
      score += 40;
      if (!matchedFields.includes("title")) matchedFields.push("title");
      termMatched = true;
    }
    if (tagsLower.some(t => t.includes(term))) {
      score += 25;
      if (!matchedFields.includes("tags")) matchedFields.push("tags");
      termMatched = true;
    }
    if (excerptLower.includes(term)) {
      score += 15;
      if (!matchedFields.includes("excerpt")) matchedFields.push("excerpt");
      termMatched = true;
    }
    if (contentLower.includes(term)) {
      score += 5;
      if (!matchedFields.includes("content")) matchedFields.push("content");
      termMatched = true;
    }

    if (!termMatched && query.terms.length > 0) {
      // In AND mode, all terms must match at least one field
      return { matches: false, score: 0, matchedFields: [] };
    }
  }

  // Base score for filter-only matches
  if (score === 0 && (query.tagFilters.length > 0 || query.authorFilter || query.yearFilter || query.exactPhrases.length > 0)) {
    score = 10;
    matchedFields.push("filter_match");
  }

  return {
    matches: score > 0 || (query.terms.length === 0 && query.exactPhrases.length === 0),
    score,
    matchedFields
  };
}

/**
 * Executes advanced search across a list of blog posts, returning ranked results.
 */
export function executeAdvancedSearch(posts: BlogPost[], queryString: string): SearchResult[] {
  if (!Array.isArray(posts) || posts.length === 0) return [];

  const parsed = parseAdvancedQuery(queryString);

  const results: SearchResult[] = [];

  for (const post of posts) {
    const evaluation = evaluatePostMatch(post, parsed);
    if (evaluation.matches) {
      results.push({
        post,
        score: evaluation.score,
        matchedFields: evaluation.matchedFields
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
