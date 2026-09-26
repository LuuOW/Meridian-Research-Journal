/**
 * Article Generation Date & ArXiv Submission Date Synchronizer
 * 
 * Ensures that whenever an article is generated from an arXiv preprint:
 * 1. The arXiv submission timestamp "[Submitted on DD Mon YYYY]" matches the article generation date.
 * 2. Every article in the corpus has an explicit, valid publication `date` string that
 *    strictly matches its generation `timestamp` and `createdAt` epoch values.
 */

import { BlogPost } from "../types";
import { calculateBaseViews } from "./viewCounter";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export interface ExtractedSubmissionDate {
  raw: string;
  date: Date;
  formattedFull: string;     // e.g. "September 21, 2026"
  formattedShort: string;    // e.g. "Sep 21, 2026"
  timestamp: number;         // UTC noon epoch
  isoDate: string;           // "YYYY-MM-DD"
}

/**
 * Extracts submission date from arXiv text such as:
 * - "[Submitted on 21 Sep 2026]"
 * - "[Submitted on 8 Sep 2026]"
 * - "[Submitted on September 21, 2026]"
 * - "Announced: September 23, 2026"
 */
export function extractSubmissionDateFromText(text?: string | null): ExtractedSubmissionDate | null {
  if (!text || typeof text !== "string") return null;

  // 1. Match [Submitted on DD Mon YYYY] or [Submitted on Mon DD, YYYY]
  const submittedMatch = text.match(/\[Submitted on\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})(?:v\d+)?\]/i) ||
    text.match(/\[Submitted on\s+([A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})(?:v\d+)?\]/i);

  if (submittedMatch && submittedMatch[1]) {
    const parsed = new Date(submittedMatch[1].trim() + " 12:00:00 UTC");
    if (!isNaN(parsed.getTime())) {
      return buildExtractedDate(submittedMatch[0], parsed);
    }
  }

  // 2. Match Submitted: DD Mon YYYY
  const altSubmitted = text.match(/Submitted:\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i) ||
    text.match(/Submitted:\s*([A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})/i);
  if (altSubmitted && altSubmitted[1]) {
    const parsed = new Date(altSubmitted[1].trim() + " 12:00:00 UTC");
    if (!isNaN(parsed.getTime())) {
      return buildExtractedDate(altSubmitted[0], parsed);
    }
  }

  // 3. Match (Announced: Month DD, YYYY)
  const announcedMatch = text.match(/\(?Announced:\s*([A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})\)?/i);
  if (announcedMatch && announcedMatch[1]) {
    const parsed = new Date(announcedMatch[1].trim() + " 12:00:00 UTC");
    if (!isNaN(parsed.getTime())) {
      return buildExtractedDate(announcedMatch[0], parsed);
    }
  }

  return null;
}

function buildExtractedDate(raw: string, date: Date): ExtractedSubmissionDate {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const formattedFull = `${MONTH_NAMES[month]} ${day}, ${year}`;
  const formattedShort = `${SHORT_MONTH_NAMES[month]} ${day}, ${year}`;
  const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timestamp = date.getTime();

  return {
    raw,
    date,
    formattedFull,
    formattedShort,
    timestamp,
    isoDate
  };
}

/**
 * Format any date object into canonical string.
 */
export function formatCanonicalDate(d: Date, useShortMonth = false): string {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const monthStr = useShortMonth ? SHORT_MONTH_NAMES[month] : MONTH_NAMES[month];
  return `${monthStr} ${day}, ${year}`;
}

/**
 * Synchronizes an individual article so its `date`, `timestamp`, and `createdAt` match 100%.
 * If an arXiv submission date is provided or detected in content, it aligns to it.
 */
export function syncArticleDates(
  article: BlogPost,
  options?: {
    arxivSubmissionDate?: string | Date | null;
    preferExistingDateFormat?: boolean;
  }
): BlogPost {
  let targetDate: Date | null = null;
  const preferShortMonth = article.date?.startsWith("Sep 14, 2026") || false;

  // Manual generated articles via this tool: chronological backdating to past arXiv dates DOES NOT apply.
  if (
    (article as any).isManual ||
    (article as any).isManualGeneration ||
    (article as any).source === "manual_tool" ||
    article.id === "generated-1790281414849" ||
    article.id === "generated-1790432374898"
  ) {
    if (article.date) {
      const p = new Date(article.date);
      if (!isNaN(p.getTime())) {
        targetDate = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate(), 12, 0, 0));
      }
    }
  }

  // 1. Explicit submission date parameter passed in
  if (!targetDate && options?.arxivSubmissionDate) {
    if (options.arxivSubmissionDate instanceof Date) {
      targetDate = options.arxivSubmissionDate;
    } else {
      const extracted = extractSubmissionDateFromText(options.arxivSubmissionDate);
      if (extracted) {
        targetDate = extracted.date;
      } else {
        const p = new Date(options.arxivSubmissionDate);
        if (!isNaN(p.getTime())) {
          targetDate = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate(), 12, 0, 0));
        }
      }
    }
  }

  // 2. Check article content for [Submitted on ...] or (Announced: ...)
  if (!targetDate && article.content) {
    const fromContent = extractSubmissionDateFromText(article.content);
    if (fromContent) {
      targetDate = fromContent.date;
    }
  }

  // 3. Known historical alignments
  if (!targetDate && article.arxivLink) {
    if (article.arxivLink.includes("2609.08748") || article.title.includes("Dynamic Chirality")) {
      targetDate = new Date(Date.UTC(2026, 8, 8, 12, 0, 0)); // September 8, 2026
    } else if (article.arxivLink.includes("2609.15200")) {
      targetDate = new Date(Date.UTC(2026, 8, 21, 12, 0, 0)); // September 21, 2026
    } else if (article.arxivLink.includes("2609.24017")) {
      targetDate = new Date(Date.UTC(2026, 8, 22, 12, 0, 0)); // September 22, 2026
    } else if (article.arxivLink.includes("2609.26674")) {
      targetDate = new Date(Date.UTC(2026, 8, 23, 12, 0, 0)); // September 23, 2026
    } else if (article.arxivLink.includes("2609.25232")) {
      targetDate = new Date(Date.UTC(2026, 8, 24, 12, 0, 0)); // September 24, 2026
    }
  }

  // 4. Use existing valid article.date
  if (!targetDate && article.date) {
    const p = new Date(article.date);
    if (!isNaN(p.getTime())) {
      targetDate = new Date(Date.UTC(p.getFullYear(), p.getMonth(), p.getDate(), 12, 0, 0));
    }
  }

  // 5. Use existing article.timestamp or createdAt if in year >= 2025
  if (!targetDate && (article.timestamp || article.createdAt)) {
    const ts = article.timestamp || article.createdAt;
    if (ts) {
      const p = new Date(ts);
      if (!isNaN(p.getTime()) && p.getUTCFullYear() >= 2025) {
        targetDate = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate(), 12, 0, 0));
      }
    }
  }

  // 6. Use ID embedded timestamp if present
  if (!targetDate && article.id) {
    const m = article.id.match(/(?:generated|draft)-(\d+)/);
    if (m) {
      const ts = Number(m[1]);
      if (!isNaN(ts) && ts > 1000000000000) {
        const p = new Date(ts);
        if (p.getUTCFullYear() >= 2025) {
          targetDate = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate(), 12, 0, 0));
        }
      }
    }
  }

  // Fallback to today if completely unresolvable
  if (!targetDate) {
    const now = new Date();
    targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  }

  // Format the date string
  let finalDateStr = formatCanonicalDate(targetDate, preferShortMonth);
  // Preserve Sep 14 format if it was originally Sep 14
  if (article.date === "Sep 14, 2026") {
    finalDateStr = "Sep 14, 2026";
  }

  const finalTs = targetDate.getTime();

  // If existing timestamp was on the exact same day, keep its original hours/minutes for fine ordering
  let resolvedTs = finalTs;
  if (article.timestamp) {
    const currD = new Date(article.timestamp);
    if (currD.toISOString().slice(0, 10) === targetDate.toISOString().slice(0, 10)) {
      resolvedTs = article.timestamp;
    }
  } else if (article.createdAt) {
    const currD = new Date(article.createdAt);
    if (currD.toISOString().slice(0, 10) === targetDate.toISOString().slice(0, 10)) {
      resolvedTs = article.createdAt;
    }
  }

  const views = typeof article.views === "number" && !isNaN(article.views) && article.views >= 320
    ? article.views
    : calculateBaseViews(article.id);

  return {
    ...article,
    date: finalDateStr,
    timestamp: resolvedTs,
    createdAt: resolvedTs,
    views
  };
}

export interface SynchronizationReport {
  total: number;
  synchronizedCount: number;
  alreadyCompliantCount: number;
  auditDetails: Array<{
    id: string;
    title: string;
    date: string;
    timestamp: number;
    isoDate: string;
    status: "updated" | "compliant";
  }>;
}

/**
 * Reviews and audits ALL articles in the given collection, ensuring 100% compliance.
 */
export function auditAndSynchronizeAllArticles(articles: BlogPost[]): {
  articles: BlogPost[];
  report: SynchronizationReport;
} {
  let synchronizedCount = 0;
  let alreadyCompliantCount = 0;
  const auditDetails: SynchronizationReport["auditDetails"] = [];

  // Filter out known test artifacts and disputed/hallucinated preprints
  const sanitizedInput = articles.filter((b) => {
    if (b.id === "blog-2609-08748v1-6870") return false;
    if (b.id === "blog-1790181898483-98vez" || b.id.includes("77777") || b.title?.includes("2608.77777")) return false;
    if (b.id.includes("11809") || b.title?.toLowerCase().includes("metallo-dielectric") || b.slug?.includes("11809")) return false;
    if (b.id.includes("11042") || b.title?.toLowerCase().includes("nonlinear topological waveguiding") || b.slug?.includes("11042")) return false;
    return true;
  });

  const updatedArticles = sanitizedInput.map((article) => {
    const originalDate = article.date;
    const originalTs = article.timestamp;
    const originalCr = article.createdAt;

    const synced = syncArticleDates(article);

    const isMatchDate = originalDate && originalDate.trim() === synced.date.trim();
    const isMatchTs = originalTs === synced.timestamp;
    const isMatchCr = originalCr === synced.createdAt;

    const isCompliant = isMatchDate && isMatchTs && isMatchCr;

    if (!isCompliant) {
      synchronizedCount++;
      auditDetails.push({
        id: synced.id,
        title: synced.title,
        date: synced.date,
        timestamp: synced.timestamp || 0,
        isoDate: new Date(synced.timestamp || 0).toISOString().slice(0, 10),
        status: "updated"
      });
    } else {
      alreadyCompliantCount++;
    }

    return synced;
  });

  // Manual generated articles via this tool are prioritized at the top of the feed;
  // others are sorted strictly chronologically.
  const manual = updatedArticles.filter(
    (b) =>
      (b as any).isManual ||
      (b as any).isManualGeneration ||
      (b as any).source === "manual_tool" ||
      b.id === "generated-1790281414849" ||
      b.id === "generated-1790432374898"
  );
  const standard = updatedArticles.filter(
    (b) =>
      !(
        (b as any).isManual ||
        (b as any).isManualGeneration ||
        (b as any).source === "manual_tool" ||
        b.id === "generated-1790281414849" ||
        b.id === "generated-1790432374898"
      )
  );

  manual.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  standard.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const sortedArticles = [...manual, ...standard];

  return {
    articles: sortedArticles,
    report: {
      total: articles.length,
      synchronizedCount,
      alreadyCompliantCount,
      auditDetails
    }
  };
}
