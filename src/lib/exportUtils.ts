/**
 * Scientific citation and export utilities for BibTeX, RIS, APA, IEEE, ACM,
 * and JSON import/export validation.
 */

import { BlogPost } from "../types";
import { extractArxivId } from "./arxivUtils";

/**
 * Generates an APA 7th edition academic citation string.
 */
export function generateApaCitation(post: BlogPost): string {
  const author = post.author || "Kempe, L.";
  const year = post.date ? new Date(post.date).getFullYear() : new Date().getFullYear();
  const title = post.title || "Untitled publication";
  const arxivId = extractArxivId(post.arxivLink || "");
  const arxivPart = arxivId ? ` arXiv preprint arXiv:${arxivId}.` : "";
  const urlPart = post.arxivLink ? ` ${post.arxivLink}` : "";

  return `${author} (${year}). ${title}.${arxivPart}${urlPart}`;
}

/**
 * Generates an IEEE style citation string.
 */
export function generateIeeeCitation(post: BlogPost): string {
  const author = post.author || "L. Kempe";
  const title = post.title || "Untitled publication";
  const year = post.date ? new Date(post.date).getFullYear() : new Date().getFullYear();
  const arxivId = extractArxivId(post.arxivLink || "");
  const arxivPart = arxivId ? ` arXiv:${arxivId}` : "";

  return `${author}, "${title}," Meridian Research Preprint${arxivPart}, ${year}.`;
}

/**
 * Generates an ACM reference string.
 */
export function generateAcmCitation(post: BlogPost): string {
  const author = post.author || "Lucas Kempe";
  const year = post.date ? new Date(post.date).getFullYear() : new Date().getFullYear();
  const title = post.title || "Untitled publication";
  const arxivId = extractArxivId(post.arxivLink || "");
  const arxivPart = arxivId ? ` arXiv:${arxivId}` : "";

  return `${author}. ${year}. ${title}. Meridian Research Publications.${arxivPart}`;
}

/**
 * Generates a standard BibTeX entry formatted for LaTeX bibliographies.
 */
export function generateBibTeXEntry(post: BlogPost): string {
  const citeKey = (post.slug || post.id || "meridian_paper")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 30);
  const author = post.author || "Lucas Kempe";
  const title = (post.title || "").replace(/[{}]/g, "");
  const year = post.date ? new Date(post.date).getFullYear() : new Date().getFullYear();
  const month = post.date ? new Date(post.date).toLocaleString("en-US", { month: "short" }).toLowerCase() : "aug";
  const arxivId = extractArxivId(post.arxivLink || "");

  let entry = `@article{${citeKey},\n`;
  entry += `  author    = {${author}},\n`;
  entry += `  title     = {{${title}}},\n`;
  entry += `  journal   = {Meridian Research Preprints},\n`;
  entry += `  year      = {${year}},\n`;
  entry += `  month     = {${month}},\n`;
  if (arxivId) {
    entry += `  eprint    = {${arxivId}},\n`;
    entry += `  archivePrefix = {arXiv},\n`;
    entry += `  primaryClass  = {quant-ph},\n`;
  }
  entry += `  url       = {https://meridian-research.com/#blog-${post.id}}\n`;
  entry += `}`;

  return entry;
}

/**
 * Generates an RIS format text block for import into Mendeley, EndNote, and Zotero.
 */
export function generateRISReference(post: BlogPost): string {
  const year = post.date ? new Date(post.date).getFullYear() : new Date().getFullYear();
  const author = post.author || "Kempe, Lucas";
  const arxivId = extractArxivId(post.arxivLink || "");
  
  const lines: string[] = [
    "TY  - RPRT",
    `TI  - ${post.title || "Research Publication"}`,
    `AU  - ${author}`,
    `PY  - ${year}`,
    `PB  - Meridian Research`,
    `AB  - ${(post.excerpt || "").replace(/\n/g, " ")}`
  ];

  if (arxivId) {
    lines.push(`UR  - https://arxiv.org/abs/${arxivId}`);
    lines.push(`M3  - arXiv:${arxivId}`);
  }

  if (post.tags && post.tags.length > 0) {
    for (const tag of post.tags) {
      lines.push(`KW  - ${tag}`);
    }
  }

  lines.push("ER  - ");
  return lines.join("\n");
}

/**
 * Exports a blog post into a standardized, validated JSON backup object.
 */
export function exportPostToJson(post: BlogPost): string {
  const exportObject = {
    schemaVersion: "1.0.0",
    exportedAt: new Date().toISOString(),
    blogPost: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      tags: post.tags,
      arxivLink: post.arxivLink,
      date: post.date,
      readingTime: post.readingTime,
      bannerSvg: post.bannerSvg
    }
  };

  return JSON.stringify(exportObject, null, 2);
}

/**
 * Validates whether an imported JSON string matches the BlogPost schema.
 */
export function validateImportedPostJson(jsonString: string): { valid: boolean; error?: string; post?: BlogPost } {
  if (!jsonString || typeof jsonString !== "string") {
    return { valid: false, error: "Input must be a non-empty string" };
  }

  try {
    const parsed = JSON.parse(jsonString);
    const postData = parsed.blogPost || parsed;

    if (!postData.id || typeof postData.id !== "string") {
      return { valid: false, error: "Missing or invalid required field 'id'" };
    }
    if (!postData.title || typeof postData.title !== "string") {
      return { valid: false, error: "Missing or invalid required field 'title'" };
    }
    if (!postData.content || typeof postData.content !== "string") {
      return { valid: false, error: "Missing or invalid required field 'content'" };
    }

    const cleanPost: BlogPost = {
      id: String(postData.id).trim(),
      title: String(postData.title).trim(),
      slug: postData.slug ? String(postData.slug).trim() : "post",
      excerpt: postData.excerpt ? String(postData.excerpt).trim() : "",
      content: String(postData.content),
      author: postData.author ? String(postData.author).trim() : "Lucas Kempe",
      tags: Array.isArray(postData.tags) ? postData.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [],
      arxivLink: postData.arxivLink ? String(postData.arxivLink).trim() : "",
      date: postData.date ? String(postData.date).trim() : new Date().toISOString(),
      readingTime: postData.readingTime ? String(postData.readingTime).trim() : "5 min",
      bannerSvg: postData.bannerSvg ? String(postData.bannerSvg) : ""
    };

    return { valid: true, post: cleanPost };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "JSON parse failure";
    return { valid: false, error: `Invalid JSON format: ${message}` };
  }
}
