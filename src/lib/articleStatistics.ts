/**
 * Article statistics and linguistic text analysis utilities.
 */

export interface WordFrequency {
  word: string;
  count: number;
}

export interface ParagraphMetrics {
  paragraphCount: number;
  avgWordsPerParagraph: number;
  avgWordsPerSentence: number;
}

const COMMON_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with",
  "by", "about", "against", "between", "into", "through", "during", "before",
  "after", "above", "below", "from", "up", "down", "in", "out", "of", "off",
  "over", "under", "again", "further", "then", "once", "here", "there", "when",
  "where", "why", "how", "all", "any", "both", "each", "few", "more", "most",
  "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
  "than", "too", "very", "s", "t", "can", "will", "just", "don", "should",
  "now", "is", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "having", "do", "does", "did", "doing", "this", "that", "these",
  "those", "it", "its", "we", "our", "us", "they", "them", "their"
]);

/**
 * Tokenizes text and extracts word frequencies, ignoring common stop words.
 */
export function getWordFrequencyMap(text: string, topN: number = 10): WordFrequency[] {
  if (!text || typeof text !== "string") return [];

  const cleanText = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

  const tokens = cleanText.split(/\s+/).filter((w) => w.length > 2 && !COMMON_STOP_WORDS.has(w));
  const counts = new Map<string, number>();

  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  const sorted = Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));

  return sorted.slice(0, topN);
}

/**
 * Computes Type-Token Ratio (TTR) as a measure of vocabulary richness (0% - 100%).
 */
export function calculateVocabularyDensity(text: string): number {
  if (!text || typeof text !== "string") return 0;

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return 0;

  const uniqueWords = new Set(words);
  const ratio = (uniqueWords.size / words.length) * 100;
  return Math.round(ratio * 10) / 10;
}

/**
 * Computes structural paragraph and sentence length metrics.
 */
export function calculateParagraphMetrics(text: string): ParagraphMetrics {
  if (!text || typeof text !== "string") {
    return { paragraphCount: 0, avgWordsPerParagraph: 0, avgWordsPerSentence: 0 };
  }

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return { paragraphCount: 0, avgWordsPerParagraph: 0, avgWordsPerSentence: 0 };
  }

  let totalWords = 0;
  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter((w) => w.length > 0).length;
    totalWords += words;
  }

  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const totalSentenceWords = sentences.reduce((sum, s) => {
    return sum + s.split(/\s+/).filter((w) => w.length > 0).length;
  }, 0);

  const avgWordsPerParagraph = Math.round(totalWords / paragraphs.length);
  const avgWordsPerSentence = sentences.length > 0
    ? Math.round((totalSentenceWords / sentences.length) * 10) / 10
    : 0;

  return {
    paragraphCount: paragraphs.length,
    avgWordsPerParagraph,
    avgWordsPerSentence
  };
}

/**
 * Extracts key two-word or three-word phrases (collocations) from article text.
 */
export function extractKeyPhrases(text: string, maxPhrases: number = 5): string[] {
  if (!text || typeof text !== "string") return [];

  const cleanText = text
    .replace(/[$_`*~]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase();

  const words = cleanText.split(/\s+/).filter((w) => w.length > 1);
  const bigramCounts = new Map<string, number>();

  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];

    if (COMMON_STOP_WORDS.has(w1) || COMMON_STOP_WORDS.has(w2)) continue;

    const bigram = `${w1} ${w2}`;
    bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1);
  }

  const sortedBigrams = Array.from(bigramCounts.entries())
    .filter(([_, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([phrase]) => phrase);

  return sortedBigrams.slice(0, maxPhrases);
}
