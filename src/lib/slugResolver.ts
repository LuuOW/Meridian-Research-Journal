import { BlogPost } from "../types";

/**
 * Normalizes a string into a URL-safe lowercase alphanumeric slug
 */
export function normalizeSlug(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^\w\s-]/g, "") // remove non-alphanumeric except whitespace and hyphen
    .trim()
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Strips terminal numeric / hexadecimal hashes (e.g. "-9854", "-4879", "-1787570419854") from a slug
 */
export function stripSlugTimestampSuffix(slug: string): string {
  if (!slug) return "";
  return slug.replace(/-[0-9a-fA-F]{4,16}$/, "");
}

/**
 * Extracts arXiv ID if present in string (e.g. "2408.09854", "2608.20992", "arxiv:2408.09854")
 */
export function extractArxivIdFromText(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/i);
  return match ? match[1] : null;
}

/**
 * Multi-Tier Resilient Slug & ID Resolver
 *
 * Checks in order:
 * 1. Exact ID match (e.g., "generated-1787570419854")
 * 2. Exact slug match (e.g., "towards-optimal-quantum-estimators-for-state-frame-potential-9854")
 * 3. Base slug match without timestamp suffix (e.g. "towards-optimal-quantum-estimators-for-state-frame-potential")
 * 4. Normalized title match
 * 5. arXiv ID match across arxivLink, title, tags, or raw text
 * 6. Suffix 4-digit ID match (e.g. matching "9854" at the end of id or timestamp)
 * 7. Substring / High Jaccard similarity fallback
 */
export function resolveBlogSlugOrId(
  query: string,
  blogList: BlogPost[]
): BlogPost | null {
  if (!query || !Array.isArray(blogList) || blogList.length === 0) {
    return null;
  }

  const cleanQuery = decodeURIComponent(query).trim().toLowerCase();
  const normalizedQuery = normalizeSlug(cleanQuery);
  const strippedQuery = stripSlugTimestampSuffix(normalizedQuery);
  const queryArxivId = extractArxivIdFromText(cleanQuery);

  // 1. Exact ID match
  for (const blog of blogList) {
    if (blog && blog.id && blog.id.toLowerCase() === cleanQuery) {
      return blog;
    }
  }

  // 2. Exact slug match
  for (const blog of blogList) {
    if (blog && blog.slug && blog.slug.toLowerCase() === normalizedQuery) {
      return blog;
    }
  }

  // 3. Match without 4-digit timestamp suffix
  for (const blog of blogList) {
    if (blog && blog.slug) {
      const blogBaseSlug = stripSlugTimestampSuffix(normalizeSlug(blog.slug));
      if (blogBaseSlug && (blogBaseSlug === strippedQuery || blogBaseSlug === normalizedQuery)) {
        return blog;
      }
    }
  }

  // 4. Normalized title match
  for (const blog of blogList) {
    if (blog && blog.title) {
      const titleSlug = normalizeSlug(blog.title);
      if (titleSlug === normalizedQuery || titleSlug === strippedQuery) {
        return blog;
      }
      if (titleSlug.startsWith(strippedQuery) || strippedQuery.startsWith(titleSlug)) {
        return blog;
      }
    }
  }

  // 5. arXiv ID match
  if (queryArxivId) {
    for (const blog of blogList) {
      if (blog.arxivLink && blog.arxivLink.includes(queryArxivId)) {
        return blog;
      }
      if (blog.id && blog.id.includes(queryArxivId)) {
        return blog;
      }
      if (blog.title && blog.title.includes(queryArxivId)) {
        return blog;
      }
    }
  }

  // 6. Suffix 4-digit ID match (e.g. "9854" in "towards-optimal-...-9854")
  const suffixMatch = cleanQuery.match(/-(\d{4})$/);
  if (suffixMatch && suffixMatch[1]) {
    const digits = suffixMatch[1];
    for (const blog of blogList) {
      if (blog.id && blog.id.endsWith(digits)) {
        return blog;
      }
      if (blog.slug && blog.slug.endsWith(digits)) {
        return blog;
      }
      if (blog.arxivLink && blog.arxivLink.endsWith(digits)) {
        return blog;
      }
    }
  }

  // 7. Substring inclusion match with high confidence
  for (const blog of blogList) {
    const titleLower = (blog.title || "").toLowerCase();
    const slugLower = (blog.slug || "").toLowerCase();
    if (cleanQuery.length > 8) {
      if (slugLower.includes(strippedQuery) || strippedQuery.includes(slugLower)) {
        return blog;
      }
      // Check if majority of words match
      const queryWords = cleanQuery.split(/[-_\s]+/).filter(w => w.length > 3);
      if (queryWords.length >= 2) {
        const matches = queryWords.filter(w => titleLower.includes(w) || slugLower.includes(w));
        if (matches.length / queryWords.length >= 0.7) {
          return blog;
        }
      }
    }
  }

  return null;
}
