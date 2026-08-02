import { BlogPost } from "../types";

/**
 * Toggles a blog post ID in the array of bookmarked IDs.
 */
export function toggleBookmark(currentIds: string[] = [], targetId: string): string[] {
  if (!targetId || typeof targetId !== "string") return currentIds;

  const exists = currentIds.includes(targetId);
  if (exists) {
    return currentIds.filter((id) => id !== targetId);
  } else {
    return [...currentIds, targetId];
  }
}

/**
 * Checks if a blog post ID is bookmarked.
 */
export function isBookmarked(currentIds: string[] = [], targetId: string): boolean {
  if (!targetId || typeof targetId !== "string") return false;
  return currentIds.includes(targetId);
}

/**
 * Filters a list of posts to return only bookmarked posts.
 */
export function filterBookmarkedPosts(posts: BlogPost[] = [], bookmarkedIds: string[] = []): BlogPost[] {
  if (!Array.isArray(posts) || !Array.isArray(bookmarkedIds)) return [];
  const set = new Set(bookmarkedIds);
  return posts.filter((p) => set.has(p.id));
}

/**
 * Calculates total estimated reading time in minutes for a collection of bookmarked posts.
 */
export function calculateTotalBookmarkReadingTime(bookmarkedPosts: BlogPost[] = []): number {
  if (!Array.isArray(bookmarkedPosts)) return 0;

  let totalMinutes = 0;
  for (const post of bookmarkedPosts) {
    if (!post.readingTime) continue;
    const match = post.readingTime.match(/(\d+)/);
    if (match) {
      totalMinutes += parseInt(match[1], 10);
    }
  }
  return totalMinutes;
}

/**
 * Exports bookmarked posts into a clean JSON backup payload.
 */
export function exportBookmarksJSON(posts: BlogPost[] = [], bookmarkedIds: string[] = []): string {
  const saved = filterBookmarkedPosts(posts, bookmarkedIds);
  const payload = {
    exportedAt: new Date().toISOString(),
    count: saved.length,
    bookmarks: saved.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      author: p.author,
      date: p.date,
      arxivLink: p.arxivLink
    }))
  };

  return JSON.stringify(payload, null, 2);
}
