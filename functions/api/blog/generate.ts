import { CloudflareEnv, getExpectedPassword, isPasswordValid, jsonResponse } from "../_utils";
import { generateScientificArticleFromArxiv, createBespokeExcerpt } from "../../../src/lib/paperGenerationEngine";
import { generateCorpusBannerSvg } from "../../../src/lib/corpusBannerAlgorithm";

// Robust arXiv ID extractor
function extractArxivId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  const urlMatch = clean.match(/arxiv\.org\/(?:abs|pdf)\/([a-z-]+(?:\.[a-z]{2})?\/\d{7}|\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?/i);
  if (urlMatch) return urlMatch[1];
  const prefixMatch = clean.match(/(?:arxiv:\s*)([a-z-]+(?:\.[a-z]{2})?\/\d{7}|\d{4}\.\d{4,5})(?:v\d+)?/i);
  if (prefixMatch) return prefixMatch[1];
  const bareMatch = clean.match(/^([a-z-]+(?:\.[a-z]{2})?\/\d{7}|\d{4}\.\d{4,5})(?:v\d+)?$/i);
  if (bareMatch) return bareMatch[1];
  const generalMatch = clean.match(/([a-z-]+(?:\.[a-z]{2})?\/\d{7}|\d{4}\.\d{4,5})/i);
  if (generalMatch) return generalMatch[1];
  return null;
}

// Decode HTML entities commonly found in arXiv XML
function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Generates a URL-safe lowercase slug from paper title
function generateCleanSlug(title: string, fallbackId: string): string {
  if (!title) return fallbackId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  // Strip any URL prefix if inadvertently present
  const clean = title
    .replace(/https?:\/\/[^\s]+/gi, "")
    .replace(/arxiv\.org[^\s]+/gi, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 65)
    .replace(/^-+|-+$/g, "");
    
  return clean || `article-${fallbackId.replace(/[^a-z0-9]/gi, "-")}`;
}

// Fetches paper metadata from arXiv XML API with CDN fallback
async function fetchArxivPaperMetadata(arxivId: string): Promise<{
  title: string;
  summary: string;
  authors: string;
  arxivLink: string;
  category: string;
} | null> {
  const cleanId = arxivId.trim();
  
  // 1. Try export.arxiv.org API
  try {
    const apiUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(cleanId)}`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "AskMeridian-Edge/1.0" },
      signal: AbortSignal.timeout(4500)
    });
    if (res.ok) {
      const xml = await res.text();
      const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/gi);
      // The first <title> is feed title, second is entry title
      let entryTitle = "";
      if (titleMatch && titleMatch.length > 1) {
        entryTitle = titleMatch[1].replace(/<\/?title>/gi, "").replace(/[\r\n\t]+/g, " ").trim();
      } else if (titleMatch && titleMatch.length === 1) {
        entryTitle = titleMatch[0].replace(/<\/?title>/gi, "").replace(/[\r\n\t]+/g, " ").trim();
      }

      const summaryMatch = xml.match(/<summary>([\s\S]*?)<\/summary>/i);
      const entrySummary = summaryMatch ? summaryMatch[1].replace(/[\r\n\t]+/g, " ").trim() : "";

      const authorMatches = [...xml.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi)];
      const authors = authorMatches.map(m => m[1].trim()).slice(0, 5).join(", ");

      const catMatch = xml.match(/<arxiv:primary_category[^>]*term="([^"]+)"/i) || xml.match(/<category[^>]*term="([^"]+)"/i);
      const category = catMatch ? catMatch[1].trim() : "Physics";

      if (entryTitle && !entryTitle.toLowerCase().includes("arxiv query")) {
        return {
          title: decodeHtmlEntities(entryTitle),
          summary: decodeHtmlEntities(entrySummary),
          authors: decodeHtmlEntities(authors) || "arXiv Contributors",
          arxivLink: `https://arxiv.org/abs/${cleanId}`,
          category
        };
      }
    }
  } catch (_e) {
    // Proceed to CDN fallback
  }

  // 2. Try arXiv abstract HTML page
  try {
    const absUrl = `https://arxiv.org/abs/${encodeURIComponent(cleanId)}`;
    const res = await fetch(absUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<h1 class="title[^"]*">([\s\S]*?)<\/h1>/i);
      const rawTitle = titleMatch
        ? titleMatch[1].replace(/<span class="descriptor">[\s\S]*?<\/span>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : "";
      const absMatch = html.match(/<blockquote class="abstract[^"]*">([\s\S]*?)<\/blockquote>/i);
      const rawSummary = absMatch
        ? absMatch[1].replace(/<span class="descriptor">[\s\S]*?<\/span>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : "";
      const authMatch = html.match(/<div class="authors">([\s\S]*?)<\/div>/i);
      const rawAuthors = authMatch
        ? authMatch[1].replace(/<span class="descriptor">[\s\S]*?<\/span>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : "";

      if (rawTitle) {
        return {
          title: decodeHtmlEntities(rawTitle),
          summary: decodeHtmlEntities(rawSummary),
          authors: decodeHtmlEntities(rawAuthors) || "arXiv Contributors",
          arxivLink: `https://arxiv.org/abs/${cleanId}`,
          category: "High Energy Physics"
        };
      }
    }
  } catch (_e) {
    // Fall through
  }

  return null;
}

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as {
      arxivInput?: string;
      rawText?: string;
      password?: string;
      jobId?: string;
    };

    const { arxivInput, rawText, password, jobId } = body;

    if (!password || !isPasswordValid(password, env)) {
      return jsonResponse(
        { error: "Unauthorized: Incorrect editor password." },
        403
      );
    }

    if (!arxivInput && !rawText) {
      return jsonResponse(
        { error: "Missing arXiv input or raw text" },
        400
      );
    }

    const inputClean = (arxivInput || rawText || "").trim();
    const arxivId = extractArxivId(inputClean);

    // 1. Fetch real arXiv metadata if ID is present
    let paperTitle = "";
    let paperSummary = "";
    let paperAuthors = "arXiv Contributors";
    let fullArxivUrl = inputClean.startsWith("http") ? inputClean : (arxivId ? `https://arxiv.org/abs/${arxivId}` : "https://arxiv.org");
    let paperCategory = "High Energy Physics";

    if (arxivId) {
      const meta = await fetchArxivPaperMetadata(arxivId);
      if (meta) {
        paperTitle = meta.title;
        paperSummary = meta.summary;
        paperAuthors = meta.authors;
        fullArxivUrl = meta.arxivLink;
        paperCategory = meta.category;
      }
    }

    // Fallbacks that NEVER output raw URLs as titles
    if (!paperTitle && rawText) {
      // Extract first line or heading if available
      const firstLine = rawText.split("\n")[0].replace(/^#+\s*/, "").trim();
      paperTitle = firstLine.length > 5 && firstLine.length < 120 ? firstLine : "Scholarly Paper Analysis";
      paperSummary = rawText.slice(0, 2000);
    } else if (!paperTitle) {
      if (arxivId) {
        paperTitle = `Scholarly Analysis of arXiv:${arxivId}`;
      } else {
        paperTitle = "Frontier Physical & Mathematical Analysis";
      }
      paperSummary = rawText || "Comprehensive examination into mathematical physics and particle dynamics.";
    }

    // Sanitization: Ensure paperTitle NEVER contains raw URLs
    if (paperTitle.includes("http://") || paperTitle.includes("https://") || paperTitle.includes("arxiv.org")) {
      paperTitle = arxivId ? `Scholarly Analysis of arXiv:${arxivId}` : "Frontier Physical & Mathematical Analysis";
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const timestampSuffix = arxivId ? arxivId.replace(/[^0-9]/g, "").slice(-4) : Date.now().toString().slice(-4);
    const baseSlug = generateCleanSlug(paperTitle, arxivId || "article");
    const canonicalSlug = `${baseSlug}-${timestampSuffix}`;
    const legacyUrlSlug = inputClean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);

    let generatedTitle = paperTitle;
    let generatedContent = "";
    let generatedExcerpt = paperSummary.length > 250
      ? paperSummary.slice(0, 247).trim() + "..."
      : (paperSummary || `A rigorous scholarly analysis exploring the fundamental mathematical physics, particle dynamics, and transformative implications of ${paperTitle}.`);
    let provider = "procedural";

    const githubToken = env.GITHUB_TOKEN || (typeof process !== "undefined" ? process.env?.GITHUB_TOKEN : "");
    const xaiKey = env.XAI_API_KEY || (typeof process !== "undefined" ? process.env?.XAI_API_KEY : "");

    // 2. AI Inference with fallback
    if (githubToken) {
      try {
        const ghUrl = "https://models.github.ai/inference/chat/completions";
        const prompt = `You are a world-class academic science blogger writing for Ask Meridian (https://ask-meridian.uk).
Translate this paper into an in-depth, rigorous scholarly article with LaTeX math, structured sections, and deep insights.
Paper Title: ${paperTitle}
arXiv Link: ${fullArxivUrl}
Authors: ${paperAuthors}
Summary / Abstract: ${paperSummary.slice(0, 3000)}

Requirements:
- NEVER use a raw URL as the title.
- Make the title academically rigorous, captivating, and publication-ready.
- Provide a clear 2-sentence scholarly abstract.
- Content must contain detailed LaTeX formulas ($...$ and $$...$$), structured headers (## Executive Summary & Physical Breakthrough, ## Mathematical Formulation, ## Empirical Results & Observations, ## Horizon & Implications).

Respond strictly in JSON format with two keys:
"title": "A captivating, scientifically rigorous, publication-ready title",
"excerpt": "A two-sentence scholarly abstract",
"content": "The full markdown article with LaTeX formulas ($...$ and $$...$$)"`;

        const resp = await fetch(ghUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${githubToken}`,
            "User-Agent": "AskMeridian-Edge/1.0"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
          }),
        });

        if (resp.ok) {
          const data = (await resp.json()) as any;
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.title && !parsed.title.includes("http://") && !parsed.title.includes("https://")) {
              generatedTitle = parsed.title;
            }
            if (parsed.excerpt && !parsed.excerpt.includes("http://") && !parsed.excerpt.includes("https://")) {
              generatedExcerpt = parsed.excerpt;
            }
            if (parsed.content) generatedContent = parsed.content;
            provider = "github_models";
          }
        }
      } catch (ghErr) {
        console.warn("[Cloudflare Backend] GitHub Models call fallback:", ghErr);
      }
    }

    if (!generatedContent && xaiKey) {
      try {
        const prompt = `You are a world-class academic science blogger writing for Ask Meridian (https://ask-meridian.uk).
Translate this paper into an in-depth, rigorous scholarly article with LaTeX math, structured sections, and deep insights.
Paper Title: ${paperTitle}
arXiv Link: ${fullArxivUrl}
Summary: ${paperSummary.slice(0, 3000)}

Respond strictly in JSON format with keys "title", "excerpt", and "content". Never use URLs in title or excerpt.`;

        const xaiResp = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${xaiKey}`,
          },
          body: JSON.stringify({
            model: "grok-2-latest",
            messages: [
              { role: "system", content: "You are an expert academic research writer. Always output valid JSON." },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (xaiResp.ok) {
          const data = (await xaiResp.json()) as any;
          const contentStr = data?.choices?.[0]?.message?.content;
          if (contentStr) {
            const parsed = JSON.parse(contentStr);
            if (parsed.title && !parsed.title.includes("http://") && !parsed.title.includes("https://")) {
              generatedTitle = parsed.title;
            }
            if (parsed.excerpt && !parsed.excerpt.includes("http://") && !parsed.excerpt.includes("https://")) {
              generatedExcerpt = parsed.excerpt;
            }
            if (parsed.content) generatedContent = parsed.content;
            provider = "xai";
          }
        }
      } catch (xaiErr) {
        console.warn("[Cloudflare Backend] xAI call fallback:", xaiErr);
      }
    }

    // 3. Guaranteed High-Fidelity Procedural Scholarly Article Fallback
    let generatedTags: string[] = [paperCategory, "Theoretical Physics"];
    if (!generatedContent) {
      const proceduralResult = generateScientificArticleFromArxiv(
        paperTitle || generatedTitle,
        paperSummary,
        fullArxivUrl,
        paperAuthors || "Meridian Research Collaboration",
        Date.now()
      );
      generatedTitle = proceduralResult.title;
      generatedExcerpt = proceduralResult.excerpt;
      generatedContent = proceduralResult.content;
      generatedTags = proceduralResult.tags;
      provider = "procedural";
    }

    if (!generatedExcerpt || generatedExcerpt.includes("http://") || generatedExcerpt.includes("https://") || generatedExcerpt.includes("transformative implications of")) {
      generatedExcerpt = createBespokeExcerpt(generatedTitle, paperSummary || generatedContent);
    }

    const candidateBlogForBanner = {
      id: canonicalSlug,
      title: generatedTitle,
      excerpt: generatedExcerpt,
      content: generatedContent,
      tags: generatedTags && generatedTags.length > 0 ? generatedTags : [paperCategory, "Theoretical Physics"]
    };

    const bannerSvg = generateCorpusBannerSvg(candidateBlogForBanner, [], Date.now());

    const newBlog = {
      id: `generated-${Date.now()}`,
      title: generatedTitle,
      slug: canonicalSlug,
      aliasSlugs: [
        legacyUrlSlug,
        `https-arxiv-org-pdf-${arxivId || ""}`,
        `advanced-rigorous-analysis-of-https-arxiv-org-pdf-${arxivId || ""}`,
        arxivId || ""
      ].filter(Boolean),
      excerpt: generatedExcerpt,
      date: formattedDate,
      readingTime: `${Math.min(14, Math.max(7, Math.round((generatedContent.length) / 500)))} min read`,
      arxivLink: fullArxivUrl,
      author: paperAuthors || "Meridian Research Collaboration",
      tags: generatedTags && generatedTags.length > 0 ? generatedTags : [paperCategory, "Theoretical Physics"],
      content: generatedContent,
      views: Math.floor(Math.random() * 200) + 250,
      bannerSvg
    };

    return jsonResponse({
      success: true,
      jobId: jobId || `job-${Date.now()}`,
      provider,
      source: "cloudflare-backend",
      blog: newBlog,
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Generation error" }, 500);
  }
};
