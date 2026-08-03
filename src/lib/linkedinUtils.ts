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
 * Validates if the post text is within the maximum sentence limit (default <= 5 sentences).
 */
export function isWithinSentenceLimit(text: string, maxSentences: number = 5): boolean {
  return countSentences(text) <= maxSentences;
}

/**
 * Builds system instruction for Gemini LinkedIn Post generation
 */
export const buildLinkedInSystemInstruction = (blogUrl: string): string => {
  return `You are a world-class scientific communications officer and LinkedIn strategist for "Ask Meridian", a premier optics and quantum physics research journal.
Your task is to craft an incredible, highly engaging, authentic, and scannable LinkedIn post that highlights a scientific research paper or blog article.

CRITICAL LENGTH CONSTRAINT:
- The generated LinkedIn post body MUST BE NO LONGER THAN 5 SENTENCES IN TOTAL LENGTH (excluding hashtags and the paper URL).

TONE STYLES:
- "technical": Deep-dive into physical mechanisms, equations, mathematical innovations, and key quantitative findings in <= 5 sentences.
- "executive": Concise, high-impact summary focusing on technological breakthroughs, bandwidth/efficiency metrics, and industry transformations in <= 5 sentences.
- "future": Forward-looking, visionary angle exploring long-term quantum, optical, and computing paradigm shifts in <= 5 sentences.
- "punchy": Snappy, crisp 3 to 5 sentence summary designed for maximum viral engagement.
- "custom": Adapt strictly to the user's custom instructions provided while strictly honoring the maximum 5 sentence length constraint.

POST STRUCTURE REQUIREMENTS:
1. Hook & Core Novelty: 1-2 sentences that stop the scroll with the core scientific novelty or breakthrough.
2. Technical Impact: 1-2 sentences highlighting technical features, experimental/theoretical metrics, or math frameworks.
3. Call to Action: 1 sentence directing readers to read the full paper breakdown on Ask Meridian with the URL (${blogUrl}).
4. Hashtags: 3-5 relevant, highly targeted hashtags (e.g., #QuantumPhysics #Optics #SiliconPhotonics #MeridianResearch).`;
};

/**
 * Constructs user prompt for generating AI LinkedIn post
 */
export const buildLinkedInUserPrompt = (input: LinkedInPromptInput): string => {
  const { title, excerpt = "", content = "", tags = [], tone = "technical", customPrompt } = input;
  const contentSnippet = content.slice(0, 1500);

  return `Article Title: "${title}"
Article Summary: "${excerpt}"
Tags: ${tags.join(", ")}
Target Tone: ${tone}
${customPrompt ? `Special User Instruction: "${customPrompt}"` : ""}
Full/Partial Article Content snippet:
"${contentSnippet}"

Please write an exquisite, non-generic LinkedIn post specifically tailored to THIS research. Make sure the content reflects the actual physics, math, or methodology described in the article snippet.
STRICT REQUIREMENT: The LinkedIn companion post MUST be no longer than 5 sentences in length.

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
  const cleanExcerpt = excerpt ? excerpt.trim() : "New theoretical and experimental insights in quantum optics and photonics.";

  const fallbackText = `🔬 Hot Off the Press on Meridian: "${cleanTitle}". ${cleanExcerpt} Read the full peer-reviewed paper breakdown: ${blogUrl}\n\n#Optics #QuantumPhysics #SiliconPhotonics #MeridianResearch`;

  return {
    success: true,
    postText: fallbackText,
    headline: `Research Highlight: ${cleanTitle}`,
    hashtags: ["#Optics", "#QuantumPhysics", "#SiliconPhotonics", "#MeridianResearch"],
    tone: "fallback"
  };
};
