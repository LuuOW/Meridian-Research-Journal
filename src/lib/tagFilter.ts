import { BlogPost } from "../types";

export interface TagWithCount {
  tag: string;
  count: number;
}

/**
 * Normalizes tag strings by trimming whitespace and capitalizing words cleanly.
 */
export function normalizeTag(tag: string): string {
  if (!tag || typeof tag !== "string") return "";
  return tag
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ");
}

/**
 * Extracts all unique tags across blog posts along with their occurrence count, sorted by popularity.
 */
export function extractUniqueTags(blogs: BlogPost[]): TagWithCount[] {
  if (!Array.isArray(blogs)) return [];

  const countsMap = new Map<string, number>();

  for (const blog of blogs) {
    if (!Array.isArray(blog.tags)) continue;
    for (const rawTag of blog.tags) {
      const clean = normalizeTag(rawTag);
      if (clean) {
        countsMap.set(clean, (countsMap.get(clean) || 0) + 1);
      }
    }
  }

  return Array.from(countsMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Filters a list of blog posts so that returned posts match ALL or ANY selected tags.
 */
export function filterBlogsByTags(
  blogs: BlogPost[],
  selectedTags: string[],
  matchMode: "all" | "any" = "any"
): BlogPost[] {
  if (!Array.isArray(blogs)) return [];
  const cleanSelected = selectedTags
    .map(normalizeTag)
    .filter((t) => t.length > 0);

  if (cleanSelected.length === 0) return blogs;

  return blogs.filter((blog) => {
    if (!Array.isArray(blog.tags)) return false;
    const blogTagsNormalized = blog.tags.map(normalizeTag);

    if (matchMode === "all") {
      return cleanSelected.every((tag) => {
        const lowerTag = tag.toLowerCase();
        const matchesTag = blogTagsNormalized.some((bt) => bt.toLowerCase() === lowerTag);
        const matchesEditor = Boolean(blog.isEditorEdition && lowerTag.includes("editor"));
        return matchesTag || matchesEditor;
      });
    } else {
      return cleanSelected.some((tag) => {
        const lowerTag = tag.toLowerCase();
        const matchesTag = blogTagsNormalized.some((bt) => bt.toLowerCase() === lowerTag);
        const matchesEditor = Boolean(blog.isEditorEdition && lowerTag.includes("editor"));
        return matchesTag || matchesEditor;
      });
    }
  });
}

/**
 * Searches and ranks blog posts by title, excerpt, content, or tags.
 */
export function searchAndRankBlogs(
  blogs: BlogPost[],
  query: string,
  selectedTags: string[] = []
): BlogPost[] {
  let filtered = filterBlogsByTags(blogs, selectedTags, "any");

  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return filtered;

  const scored = filtered
    .map((blog) => {
      let score = 0;
      const titleLower = (blog.title || "").toLowerCase();
      const excerptLower = (blog.excerpt || "").toLowerCase();
      const contentLower = (blog.content || "").toLowerCase();
      const authorLower = (blog.author || "").toLowerCase();

      if (titleLower === cleanQuery) score += 100;
      else if (titleLower.includes(cleanQuery)) score += 50;

      if (excerptLower.includes(cleanQuery)) score += 20;
      if (authorLower.includes(cleanQuery)) score += 15;

      if (Array.isArray(blog.tags)) {
        if (blog.tags.some((t) => t.toLowerCase().includes(cleanQuery))) score += 25;
      }

      if (contentLower.includes(cleanQuery)) score += 10;

      return { blog, score };
    })
    .filter((item) => item.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.map((item) => item.blog);
}
