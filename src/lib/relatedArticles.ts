import { BlogPost } from "../types";

/**
 * Calculates Jaccard similarity between two arrays of string tags (case-insensitive).
 */
export function calculateTagOverlapScore(tagsA: string[] = [], tagsB: string[] = []): number {
  if (!tagsA.length || !tagsB.length) return 0;

  const setA = new Set(tagsA.map((t) => t.replace(/^#+/, "").trim().toLowerCase()));
  const setB = new Set(tagsB.map((t) => t.replace(/^#+/, "").trim().toLowerCase()));

  let intersectionCount = 0;
  for (const tag of setA) {
    if (setB.has(tag)) intersectionCount++;
  }

  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

/**
 * Calculates simple word token overlap score between two titles or text strings.
 */
export function calculateTextSimilarity(textA: string = "", textB: string = ""): number {
  const tokenize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const wordsA = new Set(tokenize(textA));
  const wordsB = new Set(tokenize(textB));

  if (!wordsA.size || !wordsB.size) return 0;

  let common = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) common++;
  }

  return common / Math.max(wordsA.size, wordsB.size);
}

/**
 * Finds and ranks related articles for a given target post.
 */
export function findRelatedArticles(
  targetPost: BlogPost,
  allPosts: BlogPost[],
  maxResults: number = 3
): BlogPost[] {
  if (!targetPost || !Array.isArray(allPosts)) return [];

  const candidates = allPosts.filter((p) => p.id !== targetPost.id);

  const scored = candidates.map((post) => {
    const tagScore = calculateTagOverlapScore(targetPost.tags, post.tags) * 60;
    const titleScore = calculateTextSimilarity(targetPost.title, post.title) * 30;
    const authorBonus = targetPost.author && post.author === targetPost.author ? 10 : 0;

    return {
      post,
      score: tagScore + titleScore + authorBonus
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map((s) => s.post);
}

/**
 * Groups blog posts by primary category tag.
 */
export function groupArticlesByTopic(posts: BlogPost[]): Record<string, BlogPost[]> {
  if (!Array.isArray(posts)) return {};

  const groups: Record<string, BlogPost[]> = {};

  for (const post of posts) {
    const primaryTag =
      post.tags && post.tags.length > 0
        ? post.tags[0].replace(/^#+/, "").trim()
        : "General Science";

    if (!groups[primaryTag]) {
      groups[primaryTag] = [];
    }
    groups[primaryTag].push(post);
  }

  return groups;
}
