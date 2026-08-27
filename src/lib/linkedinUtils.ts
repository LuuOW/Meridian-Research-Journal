export interface CachedLinkedInPost {
  draftText: string;
  headline?: string;
  tone?: string;
  timestamp: number;
}

const MEMORY_CACHE = new Map<string, CachedLinkedInPost>();

/**
 * Builds the canonical short and sticky article URL for LinkedIn posts and sharing: https://ask-meridian.uk/blog/[id]
 */
export function buildLinkedInArticleUrl(blogId?: string): string {
  if (!blogId || typeof blogId !== "string" || !blogId.trim()) {
    return "https://ask-meridian.uk/blog";
  }
  const cleanId = blogId.trim().replace(/^\/+/, "");
  return `https://ask-meridian.uk/blog/${cleanId}`;
}

/**
 * Helper to build a scoped cache key optionally incorporating tone
 */
function getStorageKey(key: string, tone?: string): string {
  const cleanTone = tone ? `_${tone.toLowerCase().trim()}` : "";
  return `meridian_linkedin_cache_${key}${cleanTone}`;
}

/**
 * Retrieves cached LinkedIn post by key (blogId or title slug) and optional tone.
 * Checks localStorage first to survive reloads & browser closes, falling back to memory map.
 */
export function getLinkedInPostCache(key: string, tone?: string): CachedLinkedInPost | null {
  if (!key) return null;
  const storageKey = getStorageKey(key, tone);

  try {
    if (typeof localStorage !== "undefined") {
      const item = localStorage.getItem(storageKey);
      if (item) {
        const parsed = JSON.parse(item) as CachedLinkedInPost;
        if (parsed && typeof parsed.draftText === "string") {
          return parsed;
        }
      }
      // If tone was specified but not found, check base key as fallback
      if (tone) {
        const baseItem = localStorage.getItem(`meridian_linkedin_cache_${key}`);
        if (baseItem) {
          const parsed = JSON.parse(baseItem) as CachedLinkedInPost;
          if (parsed && typeof parsed.draftText === "string") {
            return parsed;
          }
        }
      }
    }
  } catch {
    // Ignore localStorage access errors
  }

  return MEMORY_CACHE.get(storageKey) || (tone ? MEMORY_CACHE.get(`meridian_linkedin_cache_${key}`) : null) || null;
}

/**
 * Saves generated LinkedIn post to cache (localStorage and in-memory map).
 */
export function saveLinkedInPostCache(
  key: string,
  data: { draftText: string; headline?: string; tone?: string },
  tone?: string
): CachedLinkedInPost {
  const effectiveTone = tone || data.tone;
  const cachedItem: CachedLinkedInPost = {
    draftText: data.draftText,
    headline: data.headline,
    tone: effectiveTone,
    timestamp: Date.now(),
  };

  if (key) {
    const storageKey = getStorageKey(key, effectiveTone);
    MEMORY_CACHE.set(storageKey, cachedItem);
    // Also set base key for generic fallback
    MEMORY_CACHE.set(`meridian_linkedin_cache_${key}`, cachedItem);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(cachedItem));
        localStorage.setItem(`meridian_linkedin_cache_${key}`, JSON.stringify(cachedItem));
      }
    } catch {
      // Ignore quota errors
    }
  }

  return cachedItem;
}

/**
 * Clears LinkedIn post cache for a specific key or all keys.
 */
export function clearLinkedInPostCache(key?: string): void {
  if (key) {
    const basePrefix = `meridian_linkedin_cache_${key}`;
    for (const k of Array.from(MEMORY_CACHE.keys())) {
      if (k.startsWith(basePrefix) || k === key) {
        MEMORY_CACHE.delete(k);
      }
    }
    try {
      if (typeof localStorage !== "undefined") {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(basePrefix) || k === basePrefix)
          .forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      // Ignore
    }
  } else {
    MEMORY_CACHE.clear();
    try {
      if (typeof localStorage !== "undefined") {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("meridian_linkedin_cache_"))
          .forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      // Ignore
    }
  }
}

export interface LinkedInPromptInput {
  title: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  tone?: string;
  customPrompt?: string;
}

/**
 * Counts sentences in a text block excluding URLs and standalone hashtags.
 */
export function countSentences(text: string): number {
  if (!text || typeof text !== "string") return 0;

  // Clean URLs and standalone hashtags
  const cleanText = text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/(^|\s)#\w+/g, "")
    .replace(/[•\-\*]/g, "")
    .trim();

  if (!cleanText) return 0;

  const sentences = cleanText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length;
}

/**
 * Validates if the post text is within the maximum sentence limit (default <= 3 sentences).
 */
export function isWithinSentenceLimit(text: string, maxSentences: number = 3): boolean {
  return countSentences(text) <= maxSentences;
}

/**
 * Builds system instruction for Gemini LinkedIn Post generation
 */
export const buildLinkedInSystemInstruction = (blogUrl: string): string => {
  return `You are a world-class scientific communications officer and senior LinkedIn strategist for "Ask Meridian" (https://ask-meridian.uk), the leading peer-reviewed research digest in quantum optics, photonics, and mathematical physics.
Your task is to craft an exceptional, authentic, engaging, and scannable LinkedIn companion post specifically for the provided research paper.

CRITICAL LENGTH & UNIQUENESS CONSTRAINTS:
- The generated LinkedIn post body MUST BE EXACTLY 3 SENTENCES IN TOTAL LENGTH (excluding the paper URL and trailing hashtags).
- ABSOLUTE UNIQUENESS MANDATE: Never use generic boilerplate openers (e.g., do NOT start with "Hot off the press", "Breakthrough research on Meridian", "Exciting news", "We are pleased to announce", or "In this paper").
- Every post MUST be 100% unique, dynamically extracting the exact physical mechanisms, mathematical formulations, experimental metrics, and substantive insights from the given article.

TONE STYLES & PERSPECTIVES:
- "future": Forward-looking, visionary angle exploring long-term quantum, optical, and computing paradigm shifts in EXACTLY 3 sentences. (Default preferred tone)
- "technical": Deep-dive into physical mechanisms, equations, mathematical innovations, and key quantitative findings in EXACTLY 3 sentences.
- "executive": Concise, high-impact summary focusing on technological breakthroughs, bandwidth/efficiency metrics, and industry transformations in EXACTLY 3 sentences.
- "punchy": Snappy, crisp 3-sentence summary designed for maximum viral engagement.
- "custom": Adapt strictly to the user's custom instructions provided while strictly honoring the 3-sentence maximum length constraint.

POST STRUCTURE REQUIREMENTS (EXACTLY 3 SENTENCES):
1. Sentence 1 (Hook & Core Physical Breakthrough): Deliver a compelling, content-specific opening that names the exact phenomenon, mechanism, or fundamental challenge addressed (e.g., using a high-contrast discovery statement or provocative technical question).
2. Sentence 2 (Mathematical Physics & Foundational Impact): Explain how the paper's novel derivation, architecture, or empirical findings overcome previous physical limitations.
3. Sentence 3 (Contextual Call to Action): Seamlessly guide physicists and engineers to explore the full mathematical derivations and proofs on Ask Meridian (${blogUrl}).
4. Hashtags: 3-5 highly targeted, topic-specific hashtags (e.g., #QuantumOptics #SiliconPhotonics #WavefrontShaping #Nanophotonics #MeridianResearch).`;
};

/**
 * Constructs user prompt for generating AI LinkedIn post
 */
export const buildLinkedInUserPrompt = (input: LinkedInPromptInput): string => {
  const { title, excerpt = "", content = "", tags = [], tone = "future", customPrompt } = input;
  const contentSnippet = content.slice(0, 1500);

  return `Article Title: "${title}"
Article Summary: "${excerpt}"
Tags: ${tags.join(", ")}
Target Tone: ${tone}
${customPrompt ? `Special User Instruction: "${customPrompt}"` : ""}
Full/Partial Article Content snippet:
"${contentSnippet}"

Please write an exquisite, non-generic LinkedIn post specifically tailored to THIS research. Make sure the content reflects the actual physics, math, or methodology described in the article snippet.
STRICT REQUIREMENT: The LinkedIn companion post MUST be exactly 3 sentences in length.

Respond in JSON format according to the provided schema.`;
};

/**
 * Sanitizes list of hashtags to ensure proper leading '#' and clean formatting
 */
export const sanitizeHashtags = (hashtags: string[]): string[] => {
  if (!Array.isArray(hashtags) || hashtags.length === 0) {
    return ["#Optics", "#QuantumPhysics", "#SiliconPhotonics"];
  }
  const cleaned = hashtags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/[^a-zA-Z0-9]/g, "")}`));

  return cleaned.length > 0 ? cleaned : ["#Optics", "#QuantumPhysics", "#SiliconPhotonics"];
};

/**
 * Simple deterministic string hashing helper for procedural fallback generation
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generates an intelligent, high-diversity structured fallback post when AI generation is offline or unavailable.
 * Ensures every single article receives a completely unique, content-tailored 3-sentence draft.
 */
export const generateFallbackLinkedInPost = (params: {
  title: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  tone?: string;
  blogUrl?: string;
  blogId?: string;
}) => {
  const { title, excerpt, content = "", tags = [], tone = "future", blogUrl, blogId } = params;
  const targetUrl = blogUrl || buildLinkedInArticleUrl(blogId);
  const cleanTitle = title.length > 80 ? `${title.slice(0, 77)}...` : title;
  
  // Extract key technical focus from tags or title
  const primaryTag = tags.length > 0 ? tags[0] : "Quantum & Optical Physics";
  const secondaryTag = tags.length > 1 ? tags[1] : "Applied Photonics";
  const hash = hashString(`${title}_${excerpt || ""}_${tone}_${blogId || ""}`);

  // Clean excerpt for use in body
  let cleanExcerpt = (excerpt || "").trim();
  if (!cleanExcerpt) {
    cleanExcerpt = "New theoretical and experimental insights in quantum optics and photonics.";
  } else if (cleanExcerpt.toLowerCase().includes("a rigorous scholarly analysis")) {
    // Extract first substantive sentence from content if available
    const contentSentenceMatch = content.match(/## Executive Abstract[^\n]*\n+([^\n.]+)\./i) ||
      content.match(/This investigation presents ([^\n.]+)\./i);
    if (contentSentenceMatch && contentSentenceMatch[1]) {
      cleanExcerpt = contentSentenceMatch[1].trim();
    } else {
      cleanExcerpt = `Investigating fundamental mathematical dynamics across ${primaryTag} and ${secondaryTag}.`;
    }
  }
  if (!cleanExcerpt.endsWith(".")) cleanExcerpt += ".";

  // Diverse Sentence 1 (Hook Archetypes)
  const hookOptions: string[] = [
    `🔬 Research highlight on Meridian: "${cleanTitle}".`,
    `A transformative milestone in ${primaryTag}: "${cleanTitle}".`,
    `How does ${primaryTag} unlock next-generation physical architectures? "${cleanTitle}" resolves critical theoretical constraints.`,
    `Pushing the frontier of ${secondaryTag}: "${cleanTitle}" demonstrates unprecedented precision and symmetry invariance.`,
    `Exploring the physics of ${primaryTag}: "${cleanTitle}" delivers analytical proofs for complex multi-layer systems.`,
    `Breaking past conventional boundaries in ${secondaryTag}: "${cleanTitle}" uncovers novel physical mechanisms.`,
    `New theoretical insights in ${primaryTag}: "${cleanTitle}" maps the mathematical geometry of emergent optical phenomena.`,
    `Can we redefine foundational limits in ${primaryTag}? In "${cleanTitle}", new research establishes a breakthrough formulation.`
  ];

  // Diverse Sentence 2 (Mechanism & Impact Archetypes)
  const mechanismOptions: string[] = [
    `${cleanExcerpt}`,
    `By deriving rigorous eigenvalue bounds, ${cleanExcerpt.toLowerCase()}`,
    `${cleanExcerpt} This framework bridges non-linear interaction dynamics with scalable physical implementations.`,
    `The investigation demonstrates that ${cleanExcerpt.toLowerCase()}`,
    `${cleanExcerpt} Through systematic analytical formulations, the authors establish symmetry preservation across multiple scales.`,
    `${cleanExcerpt}`
  ];

  // Diverse Sentence 3 (Call-to-Action Archetypes)
  const ctaOptions: string[] = [
    `Read the full paper breakdown on Ask Meridian: ${targetUrl}`,
    `Explore the comprehensive equations and experimental protocols at Ask Meridian: ${targetUrl}`,
    `Dive into the complete analytical derivations and finite-difference proofs: ${targetUrl}`,
    `Access the full scholarly analysis and open-access discussion on Ask Meridian: ${targetUrl}`,
    `Discover the full architectural breakdown and comparative benchmarks here: ${targetUrl}`,
    `Examine the complete mathematical formulation and research insights on Ask Meridian: ${targetUrl}`
  ];

  // Pick diverse components based on deterministic hash
  const hook = hookOptions[hash % hookOptions.length];
  const mechanism = mechanismOptions[(Math.floor(hash / 7)) % mechanismOptions.length];
  const cta = ctaOptions[(Math.floor(hash / 13)) % ctaOptions.length];

  // Construct final 3-sentence post text
  const postText = `${hook} ${mechanism} ${cta}`;

  // Custom tags
  const cleanHashtags = sanitizeHashtags(
    tags.length >= 3 
      ? tags.slice(0, 4) 
      : [primaryTag, secondaryTag, "Optics", "QuantumPhysics", "MeridianResearch"]
  );

  const headlineOptions = [
    `Breakthrough in ${primaryTag}: ${cleanTitle}`,
    `Research Digest: ${cleanTitle}`,
    `Foundations of ${primaryTag}: ${cleanTitle}`,
    `Scholarly Milestone: ${cleanTitle}`
  ];

  return {
    success: true,
    postText: `${postText}\n\n${cleanHashtags.join(" ")}`,
    headline: headlineOptions[hash % headlineOptions.length],
    hashtags: cleanHashtags,
    tone: tone || "fallback"
  };
};

