/**
 * View Counter, Date Mathematics & Article Engagement Calculations
 * Provides deterministic hashing, view metrics, and publication date algorithms.
 */

import { BlogPost } from "../types";

/**
 * Formats raw view counts into clean, discrete human-readable strings.
 * - Under 1,000: raw number (e.g. 450)
 * - 1,000 to 9,999: localized with comma (e.g. 1,284)
 * - 10,000 to 999,999: rounded with "k" suffix (e.g. 15.4k)
 * - 1,000,000+: rounded with "M" suffix (e.g. 2.5M)
 */
export function formatViews(views: number): string {
  if (typeof views !== "number" || isNaN(views) || views < 0) {
    return "0";
  }
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (views >= 10000) {
    return (views / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return views.toLocaleString("en-US");
}

/**
 * Generates a deterministic base view count for an article ID or slug.
 * Generates a realistic baseline between 320 and 1,850 views.
 */
export function calculateBaseViews(idOrSlug: string): number {
  if (!idOrSlug || typeof idOrSlug !== "string") return 100;
  const cleanKey = idOrSlug.trim();
  if (!cleanKey) return 100;

  let hash = 0;
  for (let i = 0; i < cleanKey.length; i++) {
    hash = (hash << 5) - hash + cleanKey.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return 320 + (Math.abs(hash) % 1530);
}

/**
 * Calculates a deterministic active reader estimate between 2 and 18.
 */
export function calculateActiveReaders(idOrSlug: string, views: number = 0): number {
  if (!idOrSlug || typeof idOrSlug !== "string") {
    return 2 + (Math.abs(views) % 17);
  }
  let hash = 0;
  for (let i = 0; i < idOrSlug.length; i++) {
    hash = (hash << 5) - hash + idOrSlug.charCodeAt(i);
    hash |= 0;
  }
  const safeViews = Math.max(0, views);
  return 2 + (Math.abs(hash + safeViews) % 17);
}

/**
 * Safely parses any publication date string into a valid Date object.
 * Returns null if the date string is malformed or invalid.
 */
export function parsePublicationDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

/**
 * Validates that a date string represents a valid chronological publication date.
 */
export function isChronologicallyValidDate(dateStr?: string | null): boolean {
  const parsed = parsePublicationDate(dateStr);
  if (!parsed) return false;
  const year = parsed.getFullYear();
  return year >= 2020 && year <= 2030;
}

/**
 * Calculates the exact delta in full days between publication date and reference date (default: now).
 * Returns non-negative day delta, or 0 for invalid dates or future timestamps.
 */
export function calculateDaysSincePublication(
  dateStr: string,
  referenceDate: Date = new Date()
): number {
  const pubDate = parsePublicationDate(dateStr);
  if (!pubDate) return 0;

  const diffMs = referenceDate.getTime() - pubDate.getTime();
  if (diffMs <= 0) return 0;

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(diffMs / msPerDay);
}

/**
 * Formats a relative publication timestamp (e.g. "Today", "Yesterday", "4 days ago", "2 weeks ago", "1 month ago").
 */
export function formatRelativePublicationDate(
  dateStr: string,
  referenceDate: Date = new Date()
): string {
  const days = calculateDaysSincePublication(dateStr, referenceDate);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Computes the publication view velocity (views accumulated per day).
 */
export function calculateViewVelocity(
  views: number,
  publishDateStr: string,
  referenceDate: Date = new Date()
): number {
  const safeViews = Math.max(0, views);
  const days = Math.max(1, calculateDaysSincePublication(publishDateStr, referenceDate));
  return parseFloat((safeViews / days).toFixed(2));
}

/**
 * Chronologically sorts blog posts by publication date.
 */
export function sortBlogsByPublicationDate(
  blogs: BlogPost[],
  direction: "desc" | "asc" = "desc"
): BlogPost[] {
  return [...blogs].sort((a, b) => {
    const timeA = parsePublicationDate(a.date)?.getTime() || 0;
    const timeB = parsePublicationDate(b.date)?.getTime() || 0;
    return direction === "desc" ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Filters blog posts within an inclusive publication date range.
 */
export function filterBlogsByDateRange(
  blogs: BlogPost[],
  startDate: string | Date,
  endDate: string | Date
): BlogPost[] {
  const startTs = typeof startDate === "string" ? parsePublicationDate(startDate)?.getTime() || 0 : startDate.getTime();
  const endTs = typeof endDate === "string" ? parsePublicationDate(endDate)?.getTime() || Infinity : endDate.getTime();

  return blogs.filter((b) => {
    const postTs = parsePublicationDate(b.date)?.getTime() || 0;
    return postTs >= startTs && postTs <= endTs;
  });
}
