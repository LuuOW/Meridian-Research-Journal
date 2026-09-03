export interface CachedXPost {
  draftText: string;
  headline?: string;
  tone?: string;
  timestamp: number;
}

const MEMORY_CACHE = new Map<string, CachedXPost>();

/**
 * Builds the canonical short and sticky article URL for X posts and sharing: https://ask-meridian.uk/blog/[id]
 */
export function buildXArticleUrl(blogId?: string): string {
  if (!blogId || typeof blogId !== "string" || !blogId.trim()) {
    return "https://ask-meridian.uk/blog";
  }
  const cleanId = blogId.trim().replace(/^\/+/, "");
  return `https://ask-meridian.uk/blog/${cleanId}`;
}

/**
 * Helper to build a scoped cache key for X futuristic vision
 */
function getStorageKey(key: string): string {
  return `meridian_x_cache_${key}_future`;
}

/**
 * Retrieves cached X futuristic vision post by key (blogId or title slug).
 * Checks localStorage first to survive reloads & browser closes, falling back to memory map.
 */
export function getXPostCache(key: string): CachedXPost | null {
  if (!key) return null;
  const storageKey = getStorageKey(key);

  try {
    if (typeof localStorage !== "undefined") {
      const item = localStorage.getItem(storageKey);
      if (item) {
        const parsed = JSON.parse(item) as CachedXPost;
        if (parsed && typeof parsed.draftText === "string") {
          return parsed;
        }
      }
      // Check legacy linkedin cache as migration fallback if available
      const legacyItem = localStorage.getItem(`meridian_linkedin_cache_${key}_future`) || localStorage.getItem(`meridian_linkedin_cache_${key}`);
      if (legacyItem) {
        const parsed = JSON.parse(legacyItem) as CachedXPost;
        if (parsed && typeof parsed.draftText === "string") {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore localStorage access errors
  }

  return MEMORY_CACHE.get(storageKey) || null;
}

/**
 * Saves generated X post to cache (localStorage and in-memory map).
 */
export function saveXPostCache(
  key: string,
  data: { draftText: string; headline?: string; tone?: string }
): CachedXPost {
  const cachedItem: CachedXPost = {
    draftText: data.draftText,
    headline: data.headline || "Futuristic Vision Synthesis",
    tone: "future",
    timestamp: Date.now(),
  };

  if (key) {
    const storageKey = getStorageKey(key);
    MEMORY_CACHE.set(storageKey, cachedItem);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(cachedItem));
      }
    } catch {
      // Ignore quota errors
    }
  }

  return cachedItem;
}

/**
 * Clears X post cache for a specific key or all keys.
 */
export function clearXPostCache(key?: string): void {
  if (key) {
    const storageKey = getStorageKey(key);
    MEMORY_CACHE.delete(storageKey);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(storageKey);
      }
    } catch {}
  } else {
    MEMORY_CACHE.clear();
    try {
      if (typeof localStorage !== "undefined") {
        const keysToRemove = Object.keys(localStorage).filter((k) =>
          k.startsWith("meridian_x_cache_")
        );
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch {}
  }
}

export interface XPromptInput {
  title: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  tone?: string;
  customPrompt?: string;
}

/**
 * Counts sentences in a post text excluding URLs and hashtags.
 */
export function countSentences(text: string): number {
  if (!text || typeof text !== "string") return 0;

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
 * Builds system instruction for Gemini X Companion Post generation (Futuristic Vision only).
 */
export const buildXSystemInstruction = (blogUrl: string): string => {
  return `You are a visionary scientific communications officer and leading technology futurist for "Ask Meridian" (https://ask-meridian.uk), the premier research digest in quantum optics, photonics, and mathematical physics.
Your task is to craft an exceptional, visionary, forward-looking X (formerly Twitter) companion post specifically for the provided research paper.

EXCLUSIVE PERSPECTIVE: FUTURISTIC VISION
- Your focus is exclusively on FUTURISTIC VISION: explore the radical long-term paradigm shifts, next-generation computing architectures, revolutionary quantum applications, and profound physical horizons unlocked by this research.
- Emphasize how today's mathematical derivations pave the way for tomorrow's quantum networks, photonic supercomputing, non-linear metamaterials, and cosmological or quantum discoveries.

CRITICAL LENGTH & FORMATTING CONSTRAINTS:
- The generated X post body MUST BE EXACTLY 3 SENTENCES IN TOTAL LENGTH (excluding the paper URL and trailing hashtags).
- ABSOLUTE UNIQUENESS MANDATE: Never use generic boilerplate openers (e.g., do NOT start with "Hot off the press", "Exciting news", "We are pleased to announce", or "In this paper").
- Every post MUST be 100% unique, dynamically extracting the exact physical mechanisms, mathematical formulations, and transformative visionary implications from the given paper.

POST STRUCTURE (EXACTLY 3 SENTENCES):
1. Sentence 1 (The Visionary Frontier & Hook): Deliver an electrifying, specific opening naming the future paradigm or physical boundary being reimagined.
2. Sentence 2 (The Core Breakthrough & Horizon): Explain how the paper's mathematical framework or physics architecture fundamentally transforms what is physically achievable.
3. Sentence 3 (Call to Action to Explore the Frontier): Seamlessly direct researchers and engineers to examine the derivations on Ask Meridian (${blogUrl}).
4. Hashtags: 3-4 precise, cutting-edge hashtags (e.g., #QuantumOptics #PhotonicsFrontier #FuturePhysics #AskMeridian).`;
};

/**
 * Constructs user prompt for generating AI X post with Futuristic Vision.
 */
export const buildXUserPrompt = (input: XPromptInput): string => {
  const { title, excerpt = "", content = "", tags = [], customPrompt } = input;
  const contentSnippet = content.slice(0, 1500);

  return `Article Title: "${title}"
Article Summary: "${excerpt}"
Tags: ${tags.join(", ")}
Target Perspective: Futuristic Vision (long-term paradigm shifts, next-gen technologies, quantum horizons)
${customPrompt ? `Special User Instruction: "${customPrompt}"` : ""}
Full/Partial Article Content snippet:
"${contentSnippet}"

Please write a brilliant, non-generic X companion post in the FUTURISTIC VISION style specifically tailored to THIS research.
STRICT REQUIREMENT: The X companion post MUST be exactly 3 sentences in length (plus link & hashtags).

Respond in JSON format with schema: {"postText": string, "headline": string, "hashtags": string[]}.`;
};

/**
 * Sanitizes list of hashtags to ensure proper leading '#' and clean formatting.
 */
export const sanitizeHashtags = (hashtags: string[]): string[] => {
  if (!Array.isArray(hashtags) || hashtags.length === 0) {
    return ["#QuantumOptics", "#FuturePhysics", "#AppliedPhotonics"];
  }
  const cleaned = hashtags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/[^a-zA-Z0-9]/g, "")}`));

  return cleaned.length > 0 ? cleaned : ["#QuantumOptics", "#FuturePhysics", "#AppliedPhotonics"];
};

/**
 * Simple deterministic string hashing helper for procedural fallback generation.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generates an intelligent, high-diversity structured fallback post in Futuristic Vision style.
 */
export const generateFallbackXPost = (params: {
  title: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  blogUrl?: string;
  blogId?: string;
}) => {
  const { title, excerpt, content = "", tags = [], blogUrl, blogId } = params;
  const targetUrl = blogUrl || buildXArticleUrl(blogId);
  const cleanTitle = title.length > 80 ? `${title.slice(0, 77)}...` : title;

  const primaryTag = tags.length > 0 ? tags[0] : "Quantum Systems";
  const secondaryTag = tags.length > 1 ? tags[1] : "Photonic Frontiers";
  const hash = hashString(`${title}_${excerpt || ""}_future_${blogId || ""}`);

  let cleanExcerpt = (excerpt || "").trim();
  if (!cleanExcerpt) {
    cleanExcerpt = "Charting next-generation physical architectures and paradigm shifts.";
  } else if (cleanExcerpt.toLowerCase().includes("a rigorous scholarly analysis")) {
    const contentSentenceMatch =
      content.match(/## Executive Abstract[^\n]*\n+([^\n.]+)\./i) ||
      content.match(/This investigation presents ([^\n.]+)\./i);
    if (contentSentenceMatch && contentSentenceMatch[1]) {
      cleanExcerpt = contentSentenceMatch[1].trim();
    } else {
      cleanExcerpt = `Pioneering foundational breakthroughs across ${primaryTag} and ${secondaryTag}.`;
    }
  }
  if (!cleanExcerpt.endsWith(".")) cleanExcerpt += ".";

  // Extract first sentence of excerpt to strictly control sentence count
  const firstExcerptSentence = cleanExcerpt.split(/[.!?]+/)[0]?.trim() || "Groundbreaking physical formulations chart new quantum boundaries";
  const cleanMechanism = firstExcerptSentence.endsWith(".") ? firstExcerptSentence : `${firstExcerptSentence}.`;

  const hookOptions: string[] = [
    `🌌 The future of ${primaryTag} is accelerating: "${cleanTitle}".`,
    `A transformative horizon for ${secondaryTag}: "${cleanTitle}".`,
    `What will next-generation physical architectures look like? "${cleanTitle}" rewrites foundational limits.`,
    `Glimpsing the frontier of ${primaryTag}: "${cleanTitle}" unlocks unchartered quantum capabilities.`,
    `Mapping the future of ${secondaryTag}: "${cleanTitle}" delivers the blueprints for next-era physical systems.`,
    `Redefining what is possible in ${primaryTag}: "${cleanTitle}" establishes a visionary new formulation.`
  ];

  const mechanismOptions: string[] = [
    `By deriving novel analytical invariants, this research bridges foundational physics with scalable future technologies.`,
    `${cleanMechanism}`,
    `This analytical framework uncovers profound pathways for next-generation quantum and optical networks.`,
    `These findings establish the theoretical groundwork for tomorrow's photonic superstructures.`
  ];

  const ctaOptions: string[] = [
    `Explore the full mathematical derivation and futuristic implications on Ask Meridian: ${targetUrl}`,
    `Examine the complete equations and physical proofs at Ask Meridian: ${targetUrl}`,
    `Dive into the full research architecture on Ask Meridian: ${targetUrl}`,
    `Access the complete mathematical analysis and open-access discussion here: ${targetUrl}`
  ];

  const hook = hookOptions[hash % hookOptions.length];
  const mechanism = mechanismOptions[Math.floor(hash / 7) % mechanismOptions.length];
  const cta = ctaOptions[Math.floor(hash / 13) % ctaOptions.length];

  const postText = `${hook} ${mechanism} ${cta}`;

  const sampleTags: string[][] = [
    ["#QuantumPhysics", "#FuturisticVision", "#Photonics"],
    ["#NextGenPhysics", "#QuantumTech", "#AskMeridian"],
    ["#DeepTech", "#AppliedOptics", "#FutureFrontiers"],
    ["#QuantumComputing", "#MathematicalPhysics", "#Meridian"]
  ];

  const chosenTags = sampleTags[hash % sampleTags.length];

  return {
    success: true,
    postText: `${postText} ${chosenTags.join(" ")}`,
    headline: "Futuristic Vision Synthesis",
    hashtags: chosenTags,
    tone: "future"
  };
};
