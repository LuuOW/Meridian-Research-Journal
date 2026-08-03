/**
 * Utility functions for measuring article readability and text statistics for research journal publications.
 */

/**
 * Estimates syllable count for a single English word.
 */
export function countSyllables(word: string): number {
  if (!word || typeof word !== "string") return 0;
  const cleanWord = word.toLowerCase().trim().replace(/[^a-z]/g, "");
  if (!cleanWord) return 0;
  if (cleanWord.length <= 3) return 1;

  const strippedWord = cleanWord
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");

  const matches = strippedWord.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Calculates Flesch Reading Ease score and maps it to an academic/general readability grade level.
 * Formula: 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
 */
export function calculateFleschKincaidScore(text: string): { score: number; level: string } {
  if (!text || typeof text !== "string" || !text.trim()) {
    return { score: 100, level: "Very Easy" };
  }

  // Strip markdown formatting & formulas
  const cleanText = text
    .replace(/\$\$.*?\$\$/gs, " ")
    .replace(/\$.*?\$/g, " ")
    .replace(/#+\s+/g, " ")
    .replace(/[*_~`]/g, " ")
    .trim();

  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return { score: 100, level: "Very Easy" };

  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = words.length;

  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  const scoreRaw = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (totalSyllables / wordCount);
  const score = Math.max(0, Math.min(100, Math.round(scoreRaw)));

  let level = "Academic / Research Level";
  if (score >= 90) level = "Very Easy";
  else if (score >= 80) level = "Easy";
  else if (score >= 70) level = "Fairly Easy";
  else if (score >= 60) level = "Standard Plain English";
  else if (score >= 50) level = "Fairly Difficult";
  else if (score >= 30) level = "Difficult (College Level)";
  else level = "Extremely Dense / Academic";

  return { score, level };
}

export interface TextMetrics {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  readabilityScore: number;
  readabilityLevel: string;
}

/**
 * Computes full text metrics breakdown for an article.
 */
export function analyzeTextMetrics(text: string): TextMetrics {
  if (!text || typeof text !== "string") {
    return {
      characterCount: 0,
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      readabilityScore: 100,
      readabilityLevel: "Very Easy"
    };
  }

  const characterCount = text.length;
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length;

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  const { score, level } = calculateFleschKincaidScore(text);

  return {
    characterCount,
    wordCount,
    sentenceCount,
    paragraphCount,
    readabilityScore: score,
    readabilityLevel: level
  };
}
