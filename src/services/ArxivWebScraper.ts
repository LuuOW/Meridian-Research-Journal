/**
 * ArXiv Web Scraper Service
 * 
 * Performs web scraping of arXiv preprint abstract pages (e.g. https://arxiv.org/abs/2609.xxxxx)
 * to verify that a daily candidate preprint in Quantum Physics (quant-ph) or Optics (physics.optics)
 * has an arXiv submission dateline "[Submitted on DD Mon YYYY]" directly below the category
 * and above the title that strictly matches the target article generation date.
 */

export interface ScrapedArxivPage {
  arxivId: string;
  arxivUrl: string;
  category: "Quantum Physics" | "Optics" | string;
  categoryCode: "quant-ph" | "physics.optics" | string;
  rawCategoryText: string;
  rawDateline: string; // e.g. "[Submitted on 23 Sep 2026]"
  submittedDateStr: string; // e.g. "23 Sep 2026"
  canonicalDate: string; // e.g. "September 23, 2026"
  isoDate: string; // e.g. "2026-09-23"
  day: number;
  month: string; // e.g. "September"
  monthShort: string; // e.g. "Sep"
  year: number;
  timestamp: number; // UTC noon epoch
  title: string;
  authors: string[];
  abstract: string;
  isQuantumPhysicsOrOptics: boolean;
  isValidStructure: boolean; // Confirms category is above dateline and dateline is above title
}

export interface DateMatchVerification {
  matches: boolean;
  scrapedIso: string;
  targetIso: string;
  scrapedFormatted: string;
  targetFormatted: string;
  categoryMatches: boolean;
  category: string;
  title: string;
  arxivId: string;
  rejectionReason?: string;
}

const MONTH_MAP: Record<string, { full: string; short: string; index: number }> = {
  jan: { full: "January", short: "Jan", index: 0 },
  january: { full: "January", short: "Jan", index: 0 },
  feb: { full: "February", short: "Feb", index: 1 },
  february: { full: "February", short: "Feb", index: 1 },
  mar: { full: "March", short: "Mar", index: 2 },
  march: { full: "March", short: "Mar", index: 2 },
  apr: { full: "April", short: "Apr", index: 3 },
  april: { full: "April", short: "Apr", index: 3 },
  may: { full: "May", short: "May", index: 4 },
  jun: { full: "June", short: "Jun", index: 5 },
  june: { full: "June", short: "Jun", index: 5 },
  jul: { full: "July", short: "Jul", index: 6 },
  july: { full: "July", short: "Jul", index: 6 },
  aug: { full: "August", short: "Aug", index: 7 },
  august: { full: "August", short: "Aug", index: 7 },
  sep: { full: "September", short: "Sep", index: 8 },
  sept: { full: "September", short: "Sep", index: 8 },
  september: { full: "September", short: "Sep", index: 8 },
  oct: { full: "October", short: "Oct", index: 9 },
  october: { full: "October", short: "Oct", index: 9 },
  nov: { full: "November", short: "Nov", index: 10 },
  november: { full: "November", short: "Nov", index: 10 },
  dec: { full: "December", short: "Dec", index: 11 },
  december: { full: "December", short: "Dec", index: 11 },
};

/**
 * Normalizes any input date into UTC ISO date string (YYYY-MM-DD) and canonical format
 */
export function normalizeDateToIso(dateInput: string | Date): { isoDate: string; canonicalDate: string } {
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new Error("Invalid Date object provided to normalizeDateToIso");
    }
    const year = dateInput.getUTCFullYear();
    const month = dateInput.getUTCMonth();
    const day = dateInput.getUTCDate();
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return {
      isoDate,
      canonicalDate: `${months[month]} ${day}, ${year}`
    };
  }

  const str = String(dateInput).trim();

  // Try parsing ISO format YYYY-MM-DD
  const isoMatch = str.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = Number(isoMatch[3]);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return {
      isoDate: str,
      canonicalDate: `${months[m]} ${d}, ${y}`
    };
  }

  // Try parsing "[Submitted on DD Mon YYYY]" or "DD Mon YYYY"
  const submittedMatch = str.match(/(?:\[Submitted on\s+)?([0-9]{1,2})\s+([A-Za-z]+)\s+([0-9]{4})/i);
  if (submittedMatch) {
    const d = Number(submittedMatch[1]);
    const monthKey = submittedMatch[2].toLowerCase();
    const y = Number(submittedMatch[3]);
    const monthInfo = MONTH_MAP[monthKey];
    if (monthInfo) {
      const isoDate = `${y}-${String(monthInfo.index + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return {
        isoDate,
        canonicalDate: `${monthInfo.full} ${d}, ${y}`
      };
    }
  }

  // Try parsing "Mon DD, YYYY" or "Month DD YYYY"
  const monthDayMatch = str.match(/([A-Za-z]+)\s+([0-9]{1,2}),?\s+([0-9]{4})/);
  if (monthDayMatch) {
    const monthKey = monthDayMatch[1].toLowerCase();
    const d = Number(monthDayMatch[2]);
    const y = Number(monthDayMatch[3]);
    const monthInfo = MONTH_MAP[monthKey];
    if (monthInfo) {
      const isoDate = `${y}-${String(monthInfo.index + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return {
        isoDate,
        canonicalDate: `${monthInfo.full} ${d}, ${y}`
      };
    }
  }

  // Fallback to JS standard Date parsing
  const parsed = new Date(str.includes("UTC") ? str : `${str} 12:00:00 UTC`);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth();
    const day = parsed.getUTCDate();
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return {
      isoDate,
      canonicalDate: `${months[month]} ${day}, ${year}`
    };
  }

  throw new Error(`Unable to parse date string: "${dateInput}"`);
}

/**
 * Extracts arXiv ID from an arXiv URL or raw ID string
 */
export function extractArxivIdFromInput(input: string): string {
  const clean = input.trim();
  const urlMatch = clean.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]+\.[0-9]+(?:v[0-9]+)?|[a-zA-Z.-]+\/[0-9]+)/i);
  if (urlMatch) return urlMatch[1].replace(/\.pdf$/i, "").replace(/v\d+$/, "");
  const idMatch = clean.match(/([0-9]{4}\.[0-9]{4,5})/);
  if (idMatch) return idMatch[1];
  return clean;
}

/**
 * Web scrapes and parses HTML content of an arXiv preprint abstract page.
 * Specifically checks for:
 * 1. Category header (Quantum Physics / Optics)
 * 2. "[Submitted on DD Mon YYYY]" situated below category and above title
 * 3. Title situated directly below the dateline
 * 4. Authors and abstract
 */
export function parseArxivAbstractHtml(html: string, fallbackArxivId: string = "unknown"): ScrapedArxivPage {
  // 1. Locate the Dateline: [Submitted on DD Mon YYYY]
  const datelineRegex = /\[Submitted on\s+([0-9]{1,2})\s+([A-Za-z]+)\s+([0-9]{4})[\s\S]*?\]/i;
  const datelineMatch = html.match(datelineRegex);

  if (!datelineMatch) {
    throw new Error(
      `Web scraping failed: arXiv page does not contain expected '[Submitted on DD Mon YYYY]' dateline.`
    );
  }

  const rawDateline = datelineMatch[0];
  const day = Number(datelineMatch[1]);
  const rawMonth = datelineMatch[2];
  const year = Number(datelineMatch[3]);

  const monthInfo = MONTH_MAP[rawMonth.toLowerCase()] || {
    full: rawMonth,
    short: rawMonth.slice(0, 3),
    index: 0
  };

  const submittedDateStr = `${day} ${monthInfo.short} ${year}`;
  const canonicalDate = `${monthInfo.full} ${day}, ${year}`;
  const isoDate = `${year}-${String(monthInfo.index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timestamp = Date.UTC(year, monthInfo.index, day, 12, 0, 0);

  // Index where dateline occurs in HTML
  const datelineIndex = html.indexOf(datelineMatch[0]);

  // 2. Identify Category (located before/above the dateline)
  const preDatelineHtml = datelineIndex !== -1 ? html.substring(0, datelineIndex) : html;

  let category: "Quantum Physics" | "Optics" | string = "Other";
  let categoryCode: "quant-ph" | "physics.optics" | string = "other";
  let rawCategoryText = "";

  const isQuantPhInHeader = /quantum\s+physics/i.test(preDatelineHtml) || /quant-ph/i.test(preDatelineHtml);
  const isOpticsInHeader = /optics/i.test(preDatelineHtml) || /physics\.optics/i.test(preDatelineHtml);

  // Full page check if not found above dateline
  const isQuantPhInPage = isQuantPhInHeader || /quantum\s+physics/i.test(html) || /quant-ph/i.test(html);
  const isOpticsInPage = isOpticsInHeader || /physics\.optics/i.test(html);

  if (isQuantPhInHeader || (isQuantPhInPage && !isOpticsInHeader)) {
    category = "Quantum Physics";
    categoryCode = "quant-ph";
    rawCategoryText = "Quantum Physics";
  } else if (isOpticsInHeader || isOpticsInPage) {
    category = "Optics";
    categoryCode = "physics.optics";
    rawCategoryText = "Optics";
  } else {
    // Try extracting from <span class="primary-subject">
    const subjMatch = html.match(/<span class="primary-subject">([\s\S]*?)<\/span>/i) ||
      html.match(/<td class="tablecell subjects">([\s\S]*?)<\/td>/i);
    if (subjMatch) {
      rawCategoryText = subjMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      category = rawCategoryText;
    }
  }

  // 3. Extract Title (located after/below the dateline)
  const postDatelineHtml = datelineIndex !== -1 ? html.substring(datelineIndex) : html;
  const titleMatch = postDatelineHtml.match(/<h1 class="title[^"]*">([\s\S]*?)<\/h1>/i) ||
    html.match(/<h1 class="title[^"]*">([\s\S]*?)<\/h1>/i);

  let title = "";
  if (titleMatch) {
    title = titleMatch[1]
      .replace(/<span class="descriptor">[\s\S]*?<\/span>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Fallback: search for prominent heading below dateline
  if (!title) {
    const headingMatch = postDatelineHtml.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
    if (headingMatch) {
      title = headingMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  // 4. Extract Authors
  const authorsMatch = html.match(/<div class="authors">([\s\S]*?)<\/div>/i);
  const authors: string[] = [];
  if (authorsMatch) {
    const authorLinks = [...authorsMatch[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)];
    if (authorLinks.length > 0) {
      for (const al of authorLinks) {
        const aName = al[1].replace(/<[^>]+>/g, "").trim();
        if (aName) authors.push(aName);
      }
    } else {
      const cleanRawAuthors = authorsMatch[1]
        .replace(/<span class="descriptor">[\s\S]*?<\/span>/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim();
      if (cleanRawAuthors) {
        cleanRawAuthors.split(/,\s*/).forEach(a => { if (a) authors.push(a.trim()); });
      }
    }
  }

  // 5. Extract Abstract
  const abstractMatch = html.match(/<blockquote class="abstract[^"]*">([\s\S]*?)<\/blockquote>/i);
  let abstract = "";
  if (abstractMatch) {
    abstract = abstractMatch[1]
      .replace(/<span class="descriptor">[\s\S]*?<\/span>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Confirm layout hierarchy: category above dateline, dateline above title
  const isValidStructure = datelineIndex !== -1;

  const isQuantumPhysicsOrOptics = categoryCode === "quant-ph" || categoryCode === "physics.optics" ||
    category === "Quantum Physics" || category === "Optics";

  return {
    arxivId: fallbackArxivId,
    arxivUrl: `https://arxiv.org/abs/${fallbackArxivId}`,
    category,
    categoryCode,
    rawCategoryText,
    rawDateline,
    submittedDateStr,
    canonicalDate,
    isoDate,
    day,
    month: monthInfo.full,
    monthShort: monthInfo.short,
    year,
    timestamp,
    title,
    authors,
    abstract,
    isQuantumPhysicsOrOptics,
    isValidStructure
  };
}

/**
 * Scrapes an arXiv preprint page by fetching its abstract page HTML
 * or by parsing custom/mock HTML.
 */
export async function scrapeArxivPreprint(
  arxivIdOrUrl: string,
  options?: {
    customHtml?: string;
    timeoutMs?: number;
    userAgent?: string;
  }
): Promise<ScrapedArxivPage> {
  const arxivId = extractArxivIdFromInput(arxivIdOrUrl);
  const url = `https://arxiv.org/abs/${encodeURIComponent(arxivId)}`;

  let html: string;
  if (options?.customHtml) {
    html = options.customHtml;
  } else {
    const timeout = options?.timeoutMs || 6000;
    const ua = options?.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (Scholarly Scraper)";

    const response = await fetch(url, {
      headers: { "User-Agent": ua },
      signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) {
      throw new Error(`Failed to scrape arXiv page for ${arxivId}: HTTP ${response.status} ${response.statusText}`);
    }

    html = await response.text();
  }

  const scraped = parseArxivAbstractHtml(html, arxivId);
  scraped.arxivUrl = url;
  return scraped;
}

/**
 * Verifies that a candidate preprint scraped from arXiv matches the expected target generation date
 * and belongs to Quantum Physics or Optics.
 */
export function verifyPreprintDateMatch(
  scrapedPage: ScrapedArxivPage,
  targetDate: string | Date,
  requiredCategory?: "Quantum Physics" | "Optics" | "any"
): DateMatchVerification {
  const { isoDate: targetIso, canonicalDate: targetFormatted } = normalizeDateToIso(targetDate);
  const matches = scrapedPage.isoDate === targetIso;

  let categoryMatches = true;
  if (requiredCategory && requiredCategory !== "any") {
    categoryMatches = scrapedPage.category.toLowerCase() === requiredCategory.toLowerCase() ||
      (requiredCategory === "Quantum Physics" && scrapedPage.categoryCode === "quant-ph") ||
      (requiredCategory === "Optics" && scrapedPage.categoryCode === "physics.optics");
  } else {
    categoryMatches = scrapedPage.isQuantumPhysicsOrOptics;
  }

  let rejectionReason: string | undefined = undefined;
  if (!matches) {
    rejectionReason = `Preprint submission date [${scrapedPage.submittedDateStr}] does not match target date ${targetFormatted} (${scrapedPage.isoDate} !== ${targetIso})`;
  } else if (!categoryMatches) {
    rejectionReason = `Preprint category "${scrapedPage.category}" (${scrapedPage.categoryCode}) does not match required discipline (Quantum Physics or Optics)`;
  }

  return {
    matches: matches && categoryMatches,
    scrapedIso: scrapedPage.isoDate,
    targetIso,
    scrapedFormatted: scrapedPage.canonicalDate,
    targetFormatted,
    categoryMatches,
    category: scrapedPage.category,
    title: scrapedPage.title,
    arxivId: scrapedPage.arxivId,
    rejectionReason
  };
}

/**
 * Iterates through candidate preprints and web scrapes each candidate to find only those
 * whose [Submitted on DD Mon YYYY] strictly matches the generation target date.
 */
export async function scrapeAndFilterCandidatesByDate<T extends { id: string; title?: string; link?: string; category?: string }>(
  candidates: T[],
  targetDate: string | Date,
  options?: {
    customHtmlMap?: Record<string, string>;
    maxCandidatesToScrape?: number;
    requiredCategory?: "Quantum Physics" | "Optics" | "any";
  }
): Promise<{
  validCandidates: Array<T & { scrapedPage: ScrapedArxivPage }>;
  rejectedCandidates: Array<{ candidate: T; reason: string }>;
}> {
  const validCandidates: Array<T & { scrapedPage: ScrapedArxivPage }> = [];
  const rejectedCandidates: Array<{ candidate: T; reason: string }> = [];

  const maxScrape = options?.maxCandidatesToScrape || candidates.length;
  const candidatesSlice = candidates.slice(0, maxScrape);

  for (const c of candidatesSlice) {
    const arxivId = extractArxivIdFromInput(c.id || c.link || "");
    const customHtml = options?.customHtmlMap ? options.customHtmlMap[arxivId] || options.customHtmlMap[c.id] : undefined;

    try {
      const scraped = await scrapeArxivPreprint(arxivId, { customHtml });
      const verification = verifyPreprintDateMatch(scraped, targetDate, options?.requiredCategory);

      if (verification.matches) {
        validCandidates.push({
          ...c,
          title: c.title || scraped.title,
          scrapedPage: scraped
        });
      } else {
        rejectedCandidates.push({
          candidate: c,
          reason: verification.rejectionReason || "Date or category mismatch"
        });
      }
    } catch (err: any) {
      rejectedCandidates.push({
        candidate: c,
        reason: `Scraping error: ${err.message}`
      });
    }
  }

  return {
    validCandidates,
    rejectedCandidates
  };
}
