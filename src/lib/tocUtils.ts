/**
 * Table of Contents (TOC) extraction utilities for research blog articles.
 */

export interface TocHeading {
  id: string;
  text: string;
  level: number; // 1 for H1 (#), 2 for H2 (##), 3 for H3 (###)
}

/**
 * Converts heading text into a URL-friendly anchor ID.
 */
export function slugifyHeading(headingText: string): string {
  if (!headingText || typeof headingText !== "string") return "";
  return headingText
    .toLowerCase()
    .trim()
    .replace(/[$_`*~]/g, "") // strip markdown/latex formatting
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Extracts markdown headings (#, ##, ###) from raw article content.
 */
export function extractTableOfContents(markdownContent: string): TocHeading[] {
  if (!markdownContent || typeof markdownContent !== "string") return [];

  const lines = markdownContent.split("\n");
  const headings: TocHeading[] = [];
  const seenSlugs = new Set<string>();

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const rawText = match[2].trim();
      const cleanText = rawText.replace(/[$_`*~]/g, "").trim();

      let slug = slugifyHeading(cleanText);
      if (!slug) slug = "section";

      // Ensure unique anchor IDs
      let uniqueSlug = slug;
      let counter = 1;
      while (seenSlugs.has(uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      seenSlugs.add(uniqueSlug);

      headings.push({
        id: uniqueSlug,
        text: cleanText,
        level
      });
    }
  }

  return headings;
}

/**
 * Filters Table of Contents items down to H2 and H3 headings for cleaner navigation.
 */
export function filterNavHeadings(headings: TocHeading[]): TocHeading[] {
  if (!Array.isArray(headings)) return [];
  return headings.filter((h) => h.level === 2 || h.level === 3);
}
