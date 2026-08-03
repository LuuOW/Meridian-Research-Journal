/**
 * Helper utilities for search query matching, snippet extraction, and text highlighting.
 */

export interface TextMatchChunk {
  text: string;
  match: boolean;
}

/**
 * Splits plain text into chunks indicating matching search terms for React highlight rendering.
 */
export function highlightQueryMatches(text: string, query: string): TextMatchChunk[] {
  if (!text || typeof text !== "string") return [];
  const cleanQuery = query ? query.trim() : "";
  if (!cleanQuery) return [{ text, match: false }];

  const regex = new RegExp(`(${cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      match: part.toLowerCase() === cleanQuery.toLowerCase()
    }));
}

/**
 * Generates a contextual text snippet around the first occurrence of a search query.
 */
export function generateSearchExcerpt(
  content: string,
  query: string,
  maxLength: number = 140
): string {
  if (!content || typeof content !== "string") return "";

  const cleanContent = content
    .replace(/\$\$.*?\$\$/gs, " ")
    .replace(/\$.*?\$/g, " ")
    .replace(/#+\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!query || !query.trim()) {
    return cleanContent.length > maxLength
      ? cleanContent.slice(0, maxLength).trim() + "..."
      : cleanContent;
  }

  const queryLower = query.trim().toLowerCase();
  const index = cleanContent.toLowerCase().indexOf(queryLower);

  if (index === -1) {
    return cleanContent.length > maxLength
      ? cleanContent.slice(0, maxLength).trim() + "..."
      : cleanContent;
  }

  const half = Math.floor(maxLength / 2);
  let start = Math.max(0, index - half);
  let end = Math.min(cleanContent.length, index + query.length + half);

  let snippet = cleanContent.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < cleanContent.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Computes a simple relevance score based on query occurrences in title vs content.
 */
export function calculateQueryRelevanceScore(title: string = "", content: string = "", query: string = ""): number {
  if (!query || !query.trim()) return 0;
  const q = query.trim().toLowerCase();
  let score = 0;

  const t = title.toLowerCase();
  const c = content.toLowerCase();

  if (t === q) score += 100;
  else if (t.includes(q)) score += 50;

  const contentMatches = (c.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  score += Math.min(contentMatches * 10, 50);

  return score;
}
