import { BlogPost } from "../types";
import { extractArxivId } from "./arxivUtils";
import { generateScientificArticleFromArxiv } from "./paperGenerationEngine";
import { generateProceduralBannerSvg } from "./svgBannerGenerator";

export interface ArxivPaperPreview {
  title: string;
  summary: string;
  authors: string;
  arxivLink: string;
  arxivId?: string;
}

export interface ParsedArxivInput {
  raw: string;
  arxivId: string | null;
  fullUrl: string | null;
  isValid: boolean;
}

export interface InjectionServerResult {
  success: boolean;
  blog?: BlogPost;
  error?: string;
  message?: string;
  replacedBlogId?: string;
}

/**
 * Parses and validates an arXiv URL or paper identifier
 */
export function parseArxivInput(input: string): ParsedArxivInput {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    return { raw: trimmed, arxivId: null, fullUrl: null, isValid: false };
  }

  const arxivId = extractArxivId(trimmed);
  if (!arxivId) {
    return { raw: trimmed, arxivId: null, fullUrl: null, isValid: false };
  }

  const fullUrl = `https://arxiv.org/abs/${arxivId}`;
  return {
    raw: trimmed,
    arxivId,
    fullUrl,
    isValid: true
  };
}

/**
 * Safely parses the raw server response text from /api/blog/inject-arxiv,
 * preventing uninformative generic errors like "Invalid server response received."
 */
export function parseInjectionResponse(
  rawText: string,
  statusCode: number,
  statusText?: string
): InjectionServerResult {
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      error: `Empty response received from server (${statusCode} ${statusText || ""}).`
    };
  }

  let data: any = null;
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    // Response is HTML or plain text (e.g. gateway timeout, 502/504 proxy error, unhandled crash)
    const preview = rawText.slice(0, 150).replace(/\s+/g, " ");
    return {
      success: false,
      error: `Server returned non-JSON response (${statusCode} ${statusText || "Error"}). Preview: "${preview}..."`
    };
  }

  // Handle unauthorized / authentication errors
  if (statusCode === 403) {
    return {
      success: false,
      error: data?.error || "Unauthorized: Editor password is required or invalid. Please unlock editor mode."
    };
  }

  // Handle client/server errors
  if (statusCode >= 400) {
    return {
      success: false,
      error: data?.error || data?.message || `Request failed with status ${statusCode}`
    };
  }

  // Handle successful HTTP status but missing or failed application payload
  if (!data || typeof data !== "object") {
    return {
      success: false,
      error: "Malformed server response: expected JSON object."
    };
  }

  // If the server explicitly indicated an error without returning an article
  if (data.success === false && !data.blog && !data.article) {
    return {
      success: false,
      error: data.error || data.message || "Article injection failed."
    };
  }

  // Extract candidate blog object from any standard response envelope
  let candidateBlog: any =
    data.blog ||
    data.article ||
    data.post ||
    data.item ||
    data.data?.blog ||
    data.data?.article ||
    (data.data && typeof data.data === "object" && !Array.isArray(data.data) && data.data.title ? data.data : null) ||
    (Array.isArray(data) && data.length > 0 && data[0]?.title ? data[0] : null) ||
    (data.title && (data.content || data.id || data.slug) ? data : null);

  if (!candidateBlog || typeof candidateBlog !== "object") {
    const keys = typeof data === "object" && data ? Object.keys(data).join(", ") : "none";
    return {
      success: false,
      error: data.error || data.message || `Server response did not contain a valid article object (received payload keys: [${keys}]).`
    };
  }

  // Ensure ID and required fields are present on the article object
  if (!candidateBlog.id) {
    candidateBlog.id = candidateBlog.slug
      ? `blog-${candidateBlog.slug}`
      : `blog-${Date.now()}`;
  }

  if (!candidateBlog.title) {
    candidateBlog.title = "arXiv Scientific Publication";
  }

  if (!candidateBlog.content) {
    candidateBlog.content = candidateBlog.excerpt || "Scholarly publication analysis.";
  }

  return {
    success: true,
    blog: candidateBlog as BlogPost,
    message: data.message,
    replacedBlogId: data.replacedBlogId || candidateBlog.id
  };
}

/**
 * Pure function to replace or insert an article in a catalog list,
 * strictly preserving order when requested.
 */
export function replaceBlogInCatalog(
  catalog: BlogPost[],
  updatedBlog: BlogPost,
  targetId: string,
  preserveOrder: boolean = true
): BlogPost[] {
  if (!catalog || !Array.isArray(catalog)) {
    return [updatedBlog];
  }

  const targetIndex = catalog.findIndex(
    (b) => b.id === targetId || b.slug === targetId || (b.id && targetId && b.id.toString() === targetId.toString())
  );

  if (targetIndex === -1) {
    // Target was not found in catalog, prepend to top
    return [updatedBlog, ...catalog];
  }

  if (preserveOrder) {
    // Replace in-place at the exact same index
    const clone = [...catalog];
    clone[targetIndex] = updatedBlog;
    return clone;
  } else {
    // Remove from targetIndex and prepend
    const withoutTarget = catalog.filter((_, idx) => idx !== targetIndex);
    return [updatedBlog, ...withoutTarget];
  }
}

/**
 * Resolved Tailwind theme class definitions for Bright/Light Mode vs Dark Mode
 */
export function getInjectModalThemeTokens(theme?: string) {
  const isLight = theme === "light";

  return {
    isLight,
    // Backdrop
    backdrop: isLight ? "bg-black/40 backdrop-blur-sm" : "bg-black/80 backdrop-blur-md",
    // Dialog surface
    surface: isLight
      ? "bg-white border-neutral-200 text-neutral-900 shadow-2xl"
      : "bg-neutral-950 border-neutral-800 text-neutral-100 shadow-2xl shadow-purple-950/20",
    // Header
    headerTitle: isLight ? "text-neutral-900" : "text-white",
    headerSubtitle: isLight ? "text-neutral-600" : "text-neutral-400",
    headerBadge: isLight
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : "bg-purple-500/20 text-purple-300 border-purple-500/30",
    closeBtn: isLight
      ? "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
      : "text-neutral-400 hover:text-white hover:bg-neutral-800",
    // Current target card
    targetCard: isLight
      ? "bg-neutral-50 border-neutral-200 text-neutral-800"
      : "bg-neutral-900/90 border-neutral-800 text-neutral-200",
    targetLabel: isLight ? "text-neutral-500" : "text-neutral-400",
    targetTitle: isLight ? "text-neutral-900" : "text-neutral-100",
    // Inputs
    inputLabel: isLight ? "text-neutral-800" : "text-neutral-200",
    inputField: isLight
      ? "bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-purple-600 focus:ring-purple-600"
      : "bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-purple-500 focus:ring-purple-500",
    chipBtn: isLight
      ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300"
      : "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700",
    // Preview Card
    previewSuccess: isLight
      ? "bg-purple-50/70 border-purple-200 text-neutral-900"
      : "bg-purple-950/20 border-purple-800/40 text-neutral-100",
    previewTitle: isLight ? "text-purple-900" : "text-purple-300",
    previewText: isLight ? "text-neutral-700" : "text-neutral-300",
    previewPlaceholder: isLight
      ? "bg-neutral-50 border-neutral-200 text-neutral-500"
      : "bg-neutral-900/40 border-neutral-800/60 text-neutral-500",
    // Checkbox container
    optionsCard: isLight
      ? "bg-neutral-50 border-neutral-200 text-neutral-700"
      : "bg-neutral-900/50 border-neutral-800 text-neutral-300",
    checkbox: isLight
      ? "border-neutral-300 text-purple-600 focus:ring-purple-500 bg-white"
      : "border-neutral-700 text-purple-600 focus:ring-purple-500 bg-neutral-950",
    // Error banner
    errorBanner: isLight
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-red-950/40 border-red-800/60 text-red-300",
    // Progress card
    progressCard: isLight
      ? "bg-purple-50 border-purple-200 text-purple-900"
      : "bg-purple-950/30 border-purple-500/40 text-purple-300",
    // Cancel & Action buttons
    cancelBtn: isLight
      ? "border-neutral-300 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900"
      : "border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white hover:bg-neutral-900",
    actionBtn: "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
  };
}

/**
 * Resilient client-side article synthesis fallback when the server is unreachable
 * or returns non-standard payloads. Guarantees that paper injection succeeds.
 */
export function createClientSideFallbackArticle(
  targetBlog: BlogPost,
  previewData: ArxivPaperPreview,
  arxivId: string,
  updateSlug: boolean = true
): BlogPost {
  const seed = Date.now();
  const cleanId = (arxivId || "preprint").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const title = previewData?.title || `arXiv:${arxivId} Investigation`;
  const summary = previewData?.summary || "Authoritative research preprint identified from arXiv repository.";
  const link = previewData?.arxivLink || `https://arxiv.org/abs/${arxivId}`;
  const author = previewData?.authors || "arXiv Research Contributors";

  const generated = generateScientificArticleFromArxiv(title, summary, link, author, seed);
  const bannerTags = Array.isArray(generated.tags) && generated.tags.length > 0
    ? generated.tags.slice(0, 2).join(" & ")
    : "Optics & Quantum";
  const bannerSvg = generateProceduralBannerSvg(generated.title, bannerTags, seed);

  const newSlug = updateSlug
    ? `${cleanId}-${Math.floor(1000 + Math.random() * 9000)}`
    : targetBlog.slug || `arxiv-${cleanId}`;

  const newId = updateSlug
    ? `blog-${cleanId}-${Math.floor(1000 + Math.random() * 9000)}`
    : targetBlog.id;

  return {
    ...targetBlog,
    id: newId,
    title: generated.title || title,
    excerpt: generated.excerpt || summary,
    content: generated.content,
    readingTime: generated.readingTime || "8 min read",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    arxivLink: link,
    bannerSvg: bannerSvg || targetBlog.bannerSvg,
    author: generated.author || author,
    tags: generated.tags || ["arXiv", "Quantum", "Research"],
    slug: newSlug,
    isEditorEdition: true,
    updatedAt: new Date().toISOString()
  };
}

