import { extractArxivId, decodeHtmlEntities, generateSlug } from "./arxivUtils.js";
import { checkArticleBlocked, BlockcheckResult } from "./arxivBlocklist.js";

export const ALLOWED_QUERY_CATEGORIES = ["quant-ph", "physics.optics"] as const;
export type AllowedQueryCategory = (typeof ALLOWED_QUERY_CATEGORIES)[number];

export interface ArxivCalendarSchedule {
  queryDate: Date;
  isoDateString: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  isWeekend: boolean;
  isArxivPublishingDay: boolean;
  latestArxivPublishDate: Date;
  nextArxivPublishDate: Date;
  scheduleNotice: string;
}

export interface CategoryAudit {
  allowed: boolean;
  matchedDiscipline?: AllowedQueryCategory;
  rawCategories: string[];
  isCrossListed: boolean;
  rejectedReason?: string;
}

export interface DateFreshnessAudit {
  isFresh: boolean;
  submissionDate: Date;
  queryDate: Date;
  calendarDaysLag: number;
  businessDaysLag: number;
  isSundayQuery: boolean;
  lagAcceptable: boolean;
  rejectedReason?: string;
}

export interface TitleAudit {
  valid: boolean;
  sanitizedTitle: string;
  containsLaTeX: boolean;
  generatedSlug: string;
  detectedBlockKeywords: string[];
  rejectedReason?: string;
}

export interface ArticleQueryInput {
  queryOrId: string;
  title?: string;
  summary?: string;
  authors?: string;
  categories?: string[];
  primaryCategory?: string;
  submittedDate?: string | Date;
  referenceDate?: string | Date; // e.g. Sunday Sep 20, 2026
  maxBusinessLagDays?: number; // default 3 business days
}

export interface ArticleQueryResult {
  approved: boolean;
  status:
    | "APPROVED"
    | "REJECTED_CATEGORY"
    | "REJECTED_STALE_DATE"
    | "REJECTED_BLOCKLIST"
    | "REJECTED_TITLE"
    | "REJECTED_INVALID_ID";
  arxivId?: string;
  canonicalUrl?: string;
  calendar: ArxivCalendarSchedule;
  categoryAudit: CategoryAudit;
  dateAudit: DateFreshnessAudit;
  titleAudit: TitleAudit;
  blocklistAudit: BlockcheckResult;
  summaryReason: string;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

/**
 * Returns arXiv publishing calendar status for any given date.
 * Crucial arXiv rule: arXiv operates on a Sun-Thu announcement schedule (20:00 ET).
 * On Saturday and Sunday, arXiv does NOT publish new preprints or mailings.
 * For Sunday Sep 20, 2026:
 * - isArxivPublishingDay: false
 * - latestArxivPublishDate: Friday Sep 18, 2026
 * - nextArxivPublishDate: Monday Sep 21, 2026
 */
export function getArxivCalendarSchedule(referenceDate?: Date | string): ArxivCalendarSchedule {
  const queryDate = referenceDate ? new Date(referenceDate) : new Date();
  const dayOfWeek = queryDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isArxivPublishingDay = !isWeekend;

  // Calculate latest active arXiv publishing date
  let daysBackToLatest = 0;
  if (dayOfWeek === 0) {
    // Sunday -> Friday was 2 days ago
    daysBackToLatest = 2;
  } else if (dayOfWeek === 6) {
    // Saturday -> Friday was 1 day ago
    daysBackToLatest = 1;
  }

  const latestPublish = new Date(queryDate);
  latestPublish.setUTCDate(latestPublish.getUTCDate() - daysBackToLatest);
  latestPublish.setUTCHours(12, 0, 0, 0);

  // Calculate next active arXiv publishing date
  let daysForwardToNext = 0;
  if (dayOfWeek === 0) {
    // Sunday -> Monday is 1 day ahead
    daysForwardToNext = 1;
  } else if (dayOfWeek === 6) {
    // Saturday -> Monday is 2 days ahead
    daysForwardToNext = 2;
  } else {
    // Weekdays -> next weekday
    daysForwardToNext = dayOfWeek === 5 ? 3 : 1;
  }

  const nextPublish = new Date(queryDate);
  nextPublish.setUTCDate(nextPublish.getUTCDate() + daysForwardToNext);
  nextPublish.setUTCHours(12, 0, 0, 0);

  const isoDateString = queryDate.toISOString().split("T")[0];
  let scheduleNotice = "";
  if (dayOfWeek === 0) {
    scheduleNotice = `Sunday (${isoDateString}) is an arXiv non-publishing day. arXiv does not publish weekend mailings. The active baseline publication date is Friday ${latestPublish.toISOString().split("T")[0]}.`;
  } else if (dayOfWeek === 6) {
    scheduleNotice = `Saturday (${isoDateString}) is an arXiv non-publishing day. The active baseline publication date is Friday ${latestPublish.toISOString().split("T")[0]}.`;
  } else {
    scheduleNotice = `Active arXiv publishing weekday: ${DAY_NAMES[dayOfWeek]} (${isoDateString}).`;
  }

  return {
    queryDate,
    isoDateString,
    dayOfWeek,
    dayName: DAY_NAMES[dayOfWeek],
    isWeekend,
    isArxivPublishingDay,
    latestArxivPublishDate: latestPublish,
    nextArxivPublishDate: nextPublish,
    scheduleNotice
  };
}

/**
 * Calculates business days lag (skipping Saturdays and Sundays) between submissionDate and queryDate.
 * If queryDate is Sunday Sep 20 and submissionDate is Friday Sep 18:
 * - Saturday is skipped
 * - Sunday is skipped
 * - Business days lag = 0! (Paper is effectively same-cycle).
 */
export function calculateArxivBusinessLag(submissionDate: Date, queryDate: Date): number {
  if (submissionDate.getTime() >= queryDate.getTime()) {
    return 0;
  }

  let businessDays = 0;
  const current = new Date(submissionDate);
  current.setUTCHours(12, 0, 0, 0);

  const end = new Date(queryDate);
  end.setUTCHours(12, 0, 0, 0);

  // Advance day by day up to queryDate
  while (current.getTime() < end.getTime()) {
    current.setUTCDate(current.getUTCDate() + 1);
    const day = current.getUTCDay();
    // Only count if it's Monday through Friday
    if (day !== 0 && day !== 6) {
      businessDays++;
    }
  }

  return businessDays;
}

/**
 * Extracts submission date from explicit date string or arXiv ID (YYMM.NNNNN).
 */
export function parseSubmissionDateFromCandidate(
  submittedDate?: string | Date,
  arxivId?: string
): Date {
  if (submittedDate) {
    const d = new Date(submittedDate);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  if (arxivId) {
    const match = arxivId.match(/(\d{2})(\d{2})\.(\d{4,5})/);
    if (match) {
      const year = 2000 + parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const num = parseInt(match[3], 10);
      // Approximate day within month
      const estimatedDay = Math.min(28, Math.max(1, Math.ceil(num / 400)));
      return new Date(Date.UTC(year, month, estimatedDay, 12, 0, 0));
    }
  }

  return new Date();
}

/**
 * Validates that categories match 'quant-ph' or 'physics.optics'.
 * Allows cross-lists if at least one discipline is quant-ph or physics.optics.
 * Rejects pure computer science, pure mathematics, biology, economy, or stats.
 */
export function validateCategoryForQuery(
  categories: string[] = [],
  primaryCategory?: string
): CategoryAudit {
  const allCats = Array.from(
    new Set(
      [
        ...categories,
        primaryCategory || ""
      ]
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  let matchedDiscipline: AllowedQueryCategory | undefined;

  for (const cat of allCats) {
    if (cat === "quant-ph" || cat.startsWith("quant-ph")) {
      matchedDiscipline = "quant-ph";
      break;
    }
    if (cat === "physics.optics" || cat.startsWith("physics.optics")) {
      matchedDiscipline = "physics.optics";
      break;
    }
  }

  if (matchedDiscipline) {
    const isCrossListed = allCats.length > 1;
    return {
      allowed: true,
      matchedDiscipline,
      rawCategories: allCats,
      isCrossListed
    };
  }

  return {
    allowed: false,
    rawCategories: allCats,
    isCrossListed: false,
    rejectedReason: `Strict category violation: preprint categories [${allCats.join(
      ", "
    )}] do not match mandatory journal disciplines ('quant-ph' or 'physics.optics').`
  };
}

/**
 * Sanitizes and audits title for queries.
 * Decodes HTML entities, preserves mathematical formulas, and detects blocked keywords.
 */
export function validateTitleForQuery(rawTitle?: string): TitleAudit {
  if (!rawTitle || !rawTitle.trim()) {
    return {
      valid: false,
      sanitizedTitle: "",
      containsLaTeX: false,
      generatedSlug: "",
      detectedBlockKeywords: [],
      rejectedReason: "Title is missing or empty"
    };
  }

  const sanitized = decodeHtmlEntities(rawTitle.replace(/\s+/g, " ").trim());
  const containsLaTeX = /\$.*?\$|\\\(.*?\\\)|\$\$.*?\$\$/.test(sanitized);
  const slug = generateSlug(sanitized);

  // Prohibited keywords in titles
  const lower = sanitized.toLowerCase();
  const prohibitedWords = [
    "resumeshield",
    "prompt injection",
    "jay barach",
    "resume screening",
    "generic spectral determination",
    "terminal agent reinforcement learning"
  ];

  const detected = prohibitedWords.filter((w) => lower.includes(w));

  if (detected.length > 0) {
    return {
      valid: false,
      sanitizedTitle: sanitized,
      containsLaTeX,
      generatedSlug: slug,
      detectedBlockKeywords: detected,
      rejectedReason: `Title contains quarantined keyword(s): ${detected.join(", ")}`
    };
  }

  return {
    valid: true,
    sanitizedTitle: sanitized,
    containsLaTeX,
    generatedSlug: slug,
    detectedBlockKeywords: []
  };
}

/**
 * Unified Comprehensive Article Query Auditor
 * Audits category, date freshness (with Sunday non-publishing schedule awareness),
 * title integrity, and blocklist quarantines when querying an article.
 */
export function auditArticleQuery(input: ArticleQueryInput): ArticleQueryResult {
  const calendar = getArxivCalendarSchedule(input.referenceDate);
  const arxivId = extractArxivId(input.queryOrId) || undefined;
  const canonicalUrl = arxivId ? `https://arxiv.org/abs/${arxivId}` : undefined;

  // 1. Check ID validity
  if (!arxivId) {
    return {
      approved: false,
      status: "REJECTED_INVALID_ID",
      calendar,
      categoryAudit: { allowed: false, rawCategories: [], isCrossListed: false },
      dateAudit: {
        isFresh: false,
        submissionDate: new Date(),
        queryDate: calendar.queryDate,
        calendarDaysLag: 0,
        businessDaysLag: 0,
        isSundayQuery: calendar.dayOfWeek === 0,
        lagAcceptable: false,
        rejectedReason: "Could not parse valid arXiv ID from query"
      },
      titleAudit: validateTitleForQuery(input.title),
      blocklistAudit: { blocked: false },
      summaryReason: `Invalid arXiv query identifier: "${input.queryOrId}"`
    };
  }

  // 2. Check blocklist quarantines (ID, URL, title, author, slug)
  const blockCandidate = {
    id: arxivId,
    title: input.title,
    summary: input.summary,
    authors: input.authors,
    arxivLink: canonicalUrl,
    primaryCategory: input.primaryCategory,
    categories: input.categories
  };

  const blockCheck = checkArticleBlocked(blockCandidate);
  if (blockCheck.blocked) {
    return {
      approved: false,
      status: "REJECTED_BLOCKLIST",
      arxivId,
      canonicalUrl,
      calendar,
      categoryAudit: validateCategoryForQuery(input.categories, input.primaryCategory),
      dateAudit: {
        isFresh: false,
        submissionDate: parseSubmissionDateFromCandidate(input.submittedDate, arxivId),
        queryDate: calendar.queryDate,
        calendarDaysLag: 0,
        businessDaysLag: 0,
        isSundayQuery: calendar.dayOfWeek === 0,
        lagAcceptable: false
      },
      titleAudit: validateTitleForQuery(input.title),
      blocklistAudit: blockCheck,
      summaryReason: `Quarantined by blocklist policy: ${blockCheck.reason}`
    };
  }

  // 3. Category Validation
  const categoryAudit = validateCategoryForQuery(input.categories, input.primaryCategory);
  if (input.categories && input.categories.length > 0 && !categoryAudit.allowed) {
    return {
      approved: false,
      status: "REJECTED_CATEGORY",
      arxivId,
      canonicalUrl,
      calendar,
      categoryAudit,
      dateAudit: {
        isFresh: true,
        submissionDate: parseSubmissionDateFromCandidate(input.submittedDate, arxivId),
        queryDate: calendar.queryDate,
        calendarDaysLag: 0,
        businessDaysLag: 0,
        isSundayQuery: calendar.dayOfWeek === 0,
        lagAcceptable: true
      },
      titleAudit: validateTitleForQuery(input.title),
      blocklistAudit: blockCheck,
      summaryReason: categoryAudit.rejectedReason || "Strict category policy violation"
    };
  }

  // 4. Title Validation
  const titleAudit = validateTitleForQuery(input.title);
  if (input.title && !titleAudit.valid) {
    return {
      approved: false,
      status: "REJECTED_TITLE",
      arxivId,
      canonicalUrl,
      calendar,
      categoryAudit,
      dateAudit: {
        isFresh: true,
        submissionDate: parseSubmissionDateFromCandidate(input.submittedDate, arxivId),
        queryDate: calendar.queryDate,
        calendarDaysLag: 0,
        businessDaysLag: 0,
        isSundayQuery: calendar.dayOfWeek === 0,
        lagAcceptable: true
      },
      titleAudit,
      blocklistAudit: blockCheck,
      summaryReason: titleAudit.rejectedReason || "Title validation failed"
    };
  }

  // 5. Date Freshness with Sunday Non-Publishing Schedule Awareness
  const submissionDate = parseSubmissionDateFromCandidate(input.submittedDate, arxivId);
  const maxBusinessLag = input.maxBusinessLagDays ?? 3;
  const calendarDiffMs = calendar.queryDate.getTime() - submissionDate.getTime();
  const calendarDaysLag = Math.floor(calendarDiffMs / (1000 * 60 * 60 * 24));
  const businessDaysLag = calculateArxivBusinessLag(submissionDate, calendar.queryDate);

  const isSundayQuery = calendar.dayOfWeek === 0;
  const lagAcceptable = businessDaysLag <= maxBusinessLag;

  const dateAudit: DateFreshnessAudit = {
    isFresh: lagAcceptable,
    submissionDate,
    queryDate: calendar.queryDate,
    calendarDaysLag,
    businessDaysLag,
    isSundayQuery,
    lagAcceptable
  };

  if (!lagAcceptable) {
    dateAudit.rejectedReason = `REJECTED_STALE_DATE: Submission date ${
      submissionDate.toISOString().split("T")[0]
    } has ${businessDaysLag} business days lag (${calendarDaysLag} calendar days lag) relative to ${
      calendar.isoDateString
    } (exceeds max allowed ${maxBusinessLag} business days).`;

    return {
      approved: false,
      status: "REJECTED_STALE_DATE",
      arxivId,
      canonicalUrl,
      calendar,
      categoryAudit,
      dateAudit,
      titleAudit,
      blocklistAudit: blockCheck,
      summaryReason: dateAudit.rejectedReason
    };
  }

  return {
    approved: true,
    status: "APPROVED",
    arxivId,
    canonicalUrl,
    calendar,
    categoryAudit,
    dateAudit,
    titleAudit,
    blocklistAudit: blockCheck,
    summaryReason: `Preprint arXiv:${arxivId} fully approved across category, title, and Sunday-aware date freshness schedule.`
  };
}
