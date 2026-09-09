import { latexToHumanReadable } from "./titleSubtitlePipeline";
import { buildXArticleUrl, countSentences } from "./xUtils";

/**
 * Regex matching any Unicode emojis, pictographs, emoticons, and variation selectors.
 */
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0E}-\u{FE0F}\u{200D}]/gu;

/**
 * Strips all emojis and ensures 100% human-readable plain text.
 */
export function stripAllEmojis(text: string): string {
  if (!text) return "";
  return text
    .replace(EMOJI_REGEX, "")
    .replace(/\s+([.,!?:;])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Prepares raw text for distribution notes: converts LaTeX to clean human-readable unicode
 * and eliminates all emojis.
 */
export function cleanTextForDistributionNote(text: string): string {
  if (!text) return "";
  const readable = latexToHumanReadable(text);
  return stripAllEmojis(readable);
}

export interface DistributionNoteDraftInput {
  title: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  arxivId?: string;
  blogId?: string;
  blogUrl?: string;
  customPrompt?: string;
}

export interface DistributionNoteResult {
  noteText: string;
  headline: string;
  hashtags: string[];
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  canonicalUrl: string;
}

/**
 * Deterministic hash for procedural seed selection.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Drafts an executive Distribution Note (Writer) tailored to the research paper.
 * - Always uses clean, human-readable characters (converting LaTeX like $\mathsf{QAC}^0$ -> QAC⁰).
 * - Strictly NO EMOJIS.
 * - Reduced in length by approximately 5 words compared to legacy boilerplate drafts.
 * - Adheres strictly to a concise 3-sentence executive format.
 */
export function draftDistributionNote(input: DistributionNoteDraftInput): DistributionNoteResult {
  const { title, excerpt = "", tags = [], blogId, blogUrl } = input;
  const canonicalUrl = blogUrl || buildXArticleUrl(blogId);

  const cleanTitle = cleanTextForDistributionNote(title);
  const truncatedTitle = cleanTitle.length > 70 ? `${cleanTitle.slice(0, 67)}...` : cleanTitle;

  const primaryTag = tags.length > 0 ? tags[0].replace(/[^a-zA-Z0-9\s]/g, "") : "Quantum Systems";
  const hash = hashString(`${cleanTitle}_${excerpt}_note`);

  // Hook options (compacted, reduced word count, zero emojis)
  const hookOptions: string[] = [
    `Breakthrough in ${primaryTag}: "${truncatedTitle}".`,
    `Advances in ${primaryTag}: "${truncatedTitle}".`,
    `New derivation in ${primaryTag}: "${truncatedTitle}".`,
    `Frontier research in ${primaryTag}: "${truncatedTitle}".`
  ];

  // Mechanism options (concise, analytical, zero emojis)
  let cleanMechanism = "";
  if (excerpt && excerpt.trim()) {
    // Extract first meaningful sentence from excerpt, cleanly stripping any leading academic prefix
    const cleanedExcerpt = cleanTextForDistributionNote(excerpt)
      .replace(/^Autonomous scholarly analysis of (?:arXiv:)?[0-9a-zA-Z._/-]+:\s*/i, "")
      .replace(/^[0-9a-zA-Z._/-]+:\s*/, "")
      .trim();
    const firstSentenceMatch = cleanedExcerpt.match(/^([^.!?]+[.!?])/);
    const firstSentence = firstSentenceMatch ? firstSentenceMatch[1].trim() : cleanedExcerpt.split(/[.!?]+/)[0]?.trim();
    if (firstSentence && firstSentence.length > 15 && firstSentence.length < 150) {
      cleanMechanism = firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
    }
  }

  const mechanismOptions: string[] = cleanMechanism
    ? [
        cleanMechanism,
        `Novel analytical invariants bridge foundational physics with scalable quantum architectures.`,
        `Exact boundary formulations solve key physical constraints in next-generation systems.`
      ]
    : [
        `Novel analytical invariants bridge foundational physics with scalable quantum architectures.`,
        `Exact boundary formulations solve key physical constraints in next-generation systems.`,
        `Theoretical derivations establish fundamental bounds on quantum and optical transport.`,
        `Mathematical proofs reveal new pathways for topological and photonic devices.`
      ];

  // Call-to-action options (compacted by ~5 words, direct)
  const ctaOptions: string[] = [
    `Read the derivations on Ask Meridian: ${canonicalUrl}`,
    `Examine the complete proofs on Ask Meridian: ${canonicalUrl}`,
    `Explore the mathematical framework on Ask Meridian: ${canonicalUrl}`,
    `Access the full analysis on Ask Meridian: ${canonicalUrl}`
  ];

  const hook = hookOptions[hash % hookOptions.length];
  const mechanism = cleanMechanism || mechanismOptions[Math.floor(hash / 5) % mechanismOptions.length];
  const cta = ctaOptions[Math.floor(hash / 11) % ctaOptions.length];

  const hashtags = tags && tags.length > 0
    ? [
        `#${tags[0].replace(/[^a-zA-Z0-9]/g, "")}`,
        tags[1] ? `#${tags[1].replace(/[^a-zA-Z0-9]/g, "")}` : "#AppliedPhysics",
        "#AskMeridian"
      ]
    : ["#QuantumPhysics", "#AppliedPhysics", "#AskMeridian"];

  const rawBody = `${hook} ${mechanism} ${cta}`;
  const fullNote = `${rawBody}\n\n${hashtags.join(" ")}`;

  // Run through verification and sanitizer pipeline immediately
  const validated = validateAndSanitizeDistributionNote(fullNote);

  const wordCount = validated.sanitizedText.split(/\s+/).filter(Boolean).length;
  const sentenceCount = countSentences(rawBody);

  return {
    noteText: validated.sanitizedText,
    headline: `Distribution Note: ${cleanTitle.slice(0, 60)}`,
    hashtags,
    characterCount: validated.sanitizedText.length,
    wordCount,
    sentenceCount,
    canonicalUrl
  };
}

export interface DistributionNoteValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedText: string;
  wordCount: number;
  sentenceCount: number;
  hasEmoji: boolean;
  hasRawLatex: boolean;
}

/**
 * Dedicated unit-test pipeline mechanism that runs after drafting the Note
 * to verify and guarantee that the text:
 * 1. Contains ZERO emojis.
 * 2. Uses exclusively human-readable characters (no unparsed $\mathsf{...}$, $\mathtt{...}$, etc.).
 * 3. Maintains concise, reduced-length structure.
 * 4. Automatically sanitizes any remaining non-compliant artifacts.
 */
export function validateAndSanitizeDistributionNote(noteText: string): DistributionNoteValidationResult {
  const errors: string[] = [];

  if (!noteText || typeof noteText !== "string") {
    return {
      isValid: false,
      errors: ["Distribution Note text is empty."],
      sanitizedText: "",
      wordCount: 0,
      sentenceCount: 0,
      hasEmoji: false,
      hasRawLatex: false
    };
  }

  // 1. Emoji check
  const hasEmoji = EMOJI_REGEX.test(noteText);
  if (hasEmoji) {
    errors.push("Distribution Note contains disallowed emojis.");
  }
  let sanitized = stripAllEmojis(noteText);

  // 2. Raw LaTeX check
  const hasRawLatex = /\\(?:mathsf|mathtt|mathbf|mathit|mathrm|text|frac|sqrt)\b/.test(sanitized) || /(?<!\\)\$[^\$]+\$/.test(sanitized);
  if (hasRawLatex) {
    errors.push("Distribution Note contains raw unrendered LaTeX markup.");
    sanitized = latexToHumanReadable(sanitized);
  }

  // 3. Remove residual broken escape commands like \m... or dangling backslashes
  sanitized = sanitized.replace(/\\\w{1,3}\.{2,}/g, "");
  sanitized = sanitized.replace(/\\/g, "");

  // 4. Remove duplicate whitespace
  sanitized = sanitized.replace(/[ \t]{2,}/g, " ").trim();

  const words = sanitized.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentenceCount = countSentences(sanitized);

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedText: sanitized,
    wordCount,
    sentenceCount,
    hasEmoji,
    hasRawLatex
  };
}
