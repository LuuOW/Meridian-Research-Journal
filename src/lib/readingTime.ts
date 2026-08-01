/**
 * Utility functions for calculating and formatting reading time for research blog articles.
 */

/**
 * Calculates estimated reading time in minutes based on total word count and average reading speed.
 * @param content The text content of the article
 * @param wpm Words per minute (defaults to 200 wpm for scientific/technical material)
 * @returns Estimated reading time in minutes (minimum 1 minute)
 */
export function calculateReadingTimeMinutes(content: string, wpm: number = 200): number {
  if (!content || typeof content !== "string") {
    return 1;
  }

  // Strip LaTeX formulas and markdown formatting for a more accurate word count
  const cleanText = content
    .replace(/\$\$.*?\$\$/gs, " ")
    .replace(/\$.*?\$/g, " ")
    .replace(/#+\s+/g, " ")
    .replace(/[*_~`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;
  const minutes = Math.ceil(wordCount / Math.max(1, wpm));
  return Math.max(1, minutes);
}

/**
 * Formats a numeric minutes value into a clean, human-readable reading time string.
 * @param minutes Reading time in minutes
 * @returns Formatted string, e.g. "5 min read"
 */
export function formatReadingTime(minutes: number): string {
  const safeMinutes = Math.max(1, Math.round(Number.isFinite(minutes) ? minutes : 1));
  return `${safeMinutes} min read`;
}

/**
 * Estimates reading time directly from raw content string and returns formatted string.
 * @param content Raw markdown content
 * @param wpm Words per minute
 * @returns e.g. "8 min read"
 */
export function estimateAndFormatReadingTime(content: string, wpm: number = 200): string {
  const minutes = calculateReadingTimeMinutes(content, wpm);
  return formatReadingTime(minutes);
}
