export interface CachedLinkedInPost {
  draftText: string;
  headline?: string;
  timestamp: number;
}

const MEMORY_CACHE = new Map<string, CachedLinkedInPost>();

/**
 * Retrieves cached LinkedIn post by key (blogId or title slug).
 * Checks localStorage first to survive reloads & browser closes, falling back to memory map.
 */
export function getLinkedInPostCache(key: string): CachedLinkedInPost | null {
  if (!key) return null;
  const storageKey = `meridian_linkedin_cache_${key}`;

  try {
    if (typeof localStorage !== "undefined") {
      const item = localStorage.getItem(storageKey);
      if (item) {
        const parsed = JSON.parse(item) as CachedLinkedInPost;
        if (parsed && typeof parsed.draftText === "string") {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore localStorage access errors
  }

  return MEMORY_CACHE.get(key) || null;
}

/**
 * Saves generated LinkedIn post to cache (localStorage and in-memory map).
 */
export function saveLinkedInPostCache(
  key: string,
  data: { draftText: string; headline?: string }
): CachedLinkedInPost {
  const cachedItem: CachedLinkedInPost = {
    draftText: data.draftText,
    headline: data.headline,
    timestamp: Date.now(),
  };

  if (key) {
    MEMORY_CACHE.set(key, cachedItem);
    const storageKey = `meridian_linkedin_cache_${key}`;
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
 * Clears LinkedIn post cache for a specific key or all keys.
 */
export function clearLinkedInPostCache(key?: string): void {
  if (key) {
    MEMORY_CACHE.delete(key);
    const storageKey = `meridian_linkedin_cache_${key}`;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(storageKey);
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
  return `You are a world-class scientific communications officer and LinkedIn strategist for "Ask Meridian", a premier optics and quantum physics research journal.
Your task is to craft an incredible, highly engaging, authentic, and scannable LinkedIn post that highlights a scientific research paper or blog article.

CRITICAL LENGTH CONSTRAINT:
- The generated LinkedIn post body MUST BE EXACTLY 3 SENTENCES IN TOTAL LENGTH (excluding hashtags and the paper URL).

TONE STYLES:
- "future": Forward-looking, visionary angle exploring long-term quantum, optical, and computing paradigm shifts in EXACTLY 3 sentences. (Default preferred tone)
- "technical": Deep-dive into physical mechanisms, equations, mathematical innovations, and key quantitative findings in EXACTLY 3 sentences.
- "executive": Concise, high-impact summary focusing on technological breakthroughs, bandwidth/efficiency metrics, and industry transformations in EXACTLY 3 sentences.
- "punchy": Snappy, crisp 3-sentence summary designed for maximum viral engagement.
- "custom": Adapt strictly to the user's custom instructions provided while strictly honoring the 3-sentence maximum length constraint.

POST STRUCTURE REQUIREMENTS (EXACTLY 3 SENTENCES):
1. Sentence 1 (Hook & Core Breakthrough): Stop the scroll with the primary quantum/optics discovery or paper novelty.
2. Sentence 2 (Technical Impact & Future Vision): Highlight the fundamental mechanism, mathematical advantage, or future paradigm shift enabled by this research.
3. Sentence 3 (Call to Action): Invite optics and physics researchers to read the full paper breakdown on Ask Meridian (${blogUrl}).
4. Hashtags: 3-5 relevant, highly targeted hashtags (e.g., #QuantumPhysics #Optics #SiliconPhotonics #MeridianResearch).`;
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
 * Generates structured fallback post when AI generation is unavailable
 */
export const generateFallbackLinkedInPost = (params: { title: string; excerpt?: string; blogUrl: string }) => {
  const { title, excerpt, blogUrl } = params;
  const cleanTitle = title.length > 80 ? `${title.slice(0, 77)}...` : title;
  let rawExcerpt = excerpt ? excerpt.trim() : "New theoretical and experimental insights in quantum optics and photonics.";
  if (!rawExcerpt.endsWith(".")) rawExcerpt += ".";

  const fallbackText = `🔬 Breakthrough research on Meridian: "${cleanTitle}". ${rawExcerpt} Read the complete peer-reviewed paper breakdown here: ${blogUrl}\n\n#Optics #QuantumPhysics #SiliconPhotonics #MeridianResearch`;

  return {
    success: true,
    postText: fallbackText,
    headline: `Research Highlight: ${cleanTitle}`,
    hashtags: ["#Optics", "#QuantumPhysics", "#SiliconPhotonics", "#MeridianResearch"],
    tone: "fallback"
  };
};
