import { BlogPost } from "../types";

export interface ArticleAnalytics {
  postId: string;
  wordCount: number;
  estimatedReadTimeMinutes: number;
  engagementScore: number;
  popularityTier: "Low" | "Medium" | "High" | "Trending";
}

/**
 * Calculates synthetic engagement score based on bookmarks, reading time, and view count.
 */
export function calculateEngagementScore(
  views: number = 0,
  bookmarksCount: number = 0,
  readingTimeMinutes: number = 5
): number {
  const safeViews = Math.max(0, views);
  const safeBookmarks = Math.max(0, bookmarksCount);
  const safeMinutes = Math.max(1, readingTimeMinutes);

  const viewWeight = safeViews * 0.4;
  const bookmarkWeight = safeBookmarks * 15;
  const depthWeight = safeMinutes * 2;

  return Math.round(viewWeight + bookmarkWeight + depthWeight);
}

/**
 * Determines popularity tier from calculated engagement score.
 */
export function getPopularityTier(score: number): "Low" | "Medium" | "High" | "Trending" {
  if (score >= 500) return "Trending";
  if (score >= 250) return "High";
  if (score >= 100) return "Medium";
  return "Low";
}

/**
 * Computes analytics overview for a blog post.
 */
export function computePostAnalytics(
  post: BlogPost,
  views: number = 150,
  bookmarksCount: number = 12
): ArticleAnalytics {
  const words = (post?.content || "").trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  const score = calculateEngagementScore(views, bookmarksCount, readingTimeMinutes);
  const tier = getPopularityTier(score);

  return {
    postId: post?.id || "unknown",
    wordCount: words,
    estimatedReadTimeMinutes: readingTimeMinutes,
    engagementScore: score,
    popularityTier: tier
  };
}
