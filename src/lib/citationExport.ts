import { BlogPost } from "../types";

/**
 * Extracts publication year from a date string (e.g., "July 15, 2026" -> "2026").
 * Defaults to current year if invalid/missing.
 */
export function extractYear(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return new Date().getFullYear().toString();
  const match = dateStr.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : new Date().getFullYear().toString();
}

/**
 * Generates a clean BibTeX citation string for a research blog article.
 */
export function generateBibTeX(blog: BlogPost): string {
  if (!blog) return "";

  const citeKey = (blog.slug || blog.id || "article").replace(/[^a-zA-Z0-9_-]/g, "");
  const year = extractYear(blog.date);
  const title = (blog.title || "").replace(/[{}]/g, "");
  const author = blog.author || "Meridian Research Journal";
  const url = blog.arxivLink || `https://meridian-journal.org/post/${blog.slug || blog.id}`;

  return `@article{${citeKey},
  author    = {${author}},
  title     = {${title}},
  journal   = {Meridian Research Journal},
  year      = {${year}},
  url       = {${url}}
}`;
}

/**
 * Generates an APA 7th edition formatted citation string.
 */
export function generateAPA(blog: BlogPost): string {
  if (!blog) return "";

  const author = blog.author || "Meridian Research Journal";
  const year = extractYear(blog.date);
  const title = blog.title || "Untitled Article";
  const url = blog.arxivLink || `https://meridian-journal.org/post/${blog.slug || blog.id}`;

  return `${author}. (${year}). ${title}. Meridian Research Journal. ${url}`;
}

/**
 * Generates an MLA 9th edition formatted citation string.
 */
export function generateMLA(blog: BlogPost): string {
  if (!blog) return "";

  const author = blog.author || "Meridian Research Journal";
  const title = blog.title || "Untitled Article";
  const year = extractYear(blog.date);
  const url = blog.arxivLink || `https://meridian-journal.org/post/${blog.slug || blog.id}`;

  return `${author}. "${title}." Meridian Research Journal, ${year}, ${url}.`;
}

/**
 * Generates a RIS format export string for reference managers (EndNote, Zotero, Mendeley).
 */
export function generateRIS(blog: BlogPost): string {
  if (!blog) return "";

  const year = extractYear(blog.date);
  const author = blog.author || "Meridian Research Journal";
  const title = blog.title || "Untitled Article";
  const url = blog.arxivLink || `https://meridian-journal.org/post/${blog.slug || blog.id}`;

  return [
    "TY  - JOUR",
    `TI  - ${title}`,
    `AU  - ${author}`,
    "JO  - Meridian Research Journal",
    `PY  - ${year}`,
    `UR  - ${url}`,
    "ER  -"
  ].join("\n");
}
