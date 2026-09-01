/**
 * Article Keyword Directory, Inventory & Scholarly Dictionary Engine
 * 
 * Provides automated extraction, TF-IDF / BM25 weighting, mathematical formula
 * symbol indexing, scientific phrase mining, and alphabetical inverted indexing
 * across all research publications and custom articles.
 */

import { BlogPost } from "../types";

export type KeywordCategory =
  | "tag"
  | "title_term"
  | "scientific_concept"
  | "mathematical_symbol"
  | "acronym"
  | "domain_topic"
  | "methodology";

export interface KeywordPosting {
  articleId: string;
  slug: string;
  title: string;
  termFrequency: number;
  normalizedTf: number;
  tfIdfScore: number;
  bm25Score: number;
  inTitle: boolean;
  inTags: boolean;
  inHeadings: boolean;
  inLatex: boolean;
  firstSeenSection?: string;
}

export interface KeywordDictionaryEntry {
  term: string;
  normalizedTerm: string;
  category: KeywordCategory;
  corpusFrequency: number;
  documentFrequency: number;
  idfScore: number;
  averageTfIdf: number;
  maxTfIdf: number;
  postings: KeywordPosting[];
  relatedKeywords: Array<{ term: string; similarity: number }>;
}

export interface ArticleKeywordItem {
  term: string;
  normalizedTerm: string;
  category: KeywordCategory;
  score: number;
  frequency: number;
  inTitle: boolean;
  inTags: boolean;
  inLatex: boolean;
}

export interface ArticleKeywordInventory {
  articleId: string;
  slug: string;
  title: string;
  totalWordCount: number;
  uniqueKeywordCount: number;
  latexSymbolCount: number;
  primaryDomain: string;
  topKeywords: ArticleKeywordItem[];
  tags: string[];
  mathematicalSymbols: string[];
  acronyms: string[];
  scientificPhrases: string[];
}

export interface GlobalKeywordDictionary {
  generatedAt: number;
  totalArticles: number;
  totalCorpusWords: number;
  totalUniqueKeywords: number;
  averageDocumentLength: number;
  entries: Record<string, KeywordDictionaryEntry>;
  articlesInventory: Record<string, ArticleKeywordInventory>;
  alphabeticalIndex: Record<string, string[]>; // "A" -> ["anisotropic", "amplitude", ...]
  domainKeywords: Record<string, string[]>; // "Quantum Optics" -> [...]
  topKeywordsByScore: string[];
}

/**
 * Stopwords list optimized for scientific literature and general prose
 */
export const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
  "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
  "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into",
  "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's",
  "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs",
  "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't",
  "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
  "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't",
  "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
  "yourselves", "also", "using", "via", "paper", "presents", "study", "results", "demonstrate",
  "shows", "show", "well", "within", "based", "approach", "new", "two", "one", "three", "first"
]);

/**
 * Domain-specific scientific multi-word phrase patterns
 */
export const KNOWN_SCIENTIFIC_PHRASES = [
  "bound states in the continuum",
  "bound states in continuum",
  "surface lattice resonances",
  "quantum error correction",
  "wavefront shaping",
  "two-photon microscopy",
  "vacuum birefringence",
  "quantum electrodynamics",
  "pseudoangular momentum",
  "subwavelength grating",
  "euler-heisenberg lagrangian",
  "topological photonics",
  "non-hermitian photonics",
  "scattering matrix",
  "subsystem product codes",
  "valley polarization",
  "high quality factor",
  "heisenberg bound",
  "squeezed light",
  "optical neural networks",
  "ballistic transmission",
  "phase conjugation",
  "fresnel reflection",
  "poynting vector",
  "density functional theory",
  "state frame potential",
  "quantum state tomography",
  "metamaterial waveguides",
  "berry curvature",
  "chern number"
];

/**
 * Normalizes term string into clean lowercase key
 */
export function normalizeKeywordTerm(term: string): string {
  if (!term) return "";
  return term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^\w\s\-$\\]/g, "")
    .trim();
}

/**
 * Extracts raw tokens from markdown or plain text
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  // Remove markdown code blocks and urls
  const clean = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#*`_~\[\]()<>:;,"'?!|\/\\{}+=]/g, " ");

  return clean
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * Extracts LaTeX mathematical symbols and command keywords
 */
export function extractLatexSymbols(content: string): string[] {
  if (!content) return [];
  const symbols = new Set<string>();

  // Extract from display math $$...$$ and inline $...$
  const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^\$\n]+)\$/g;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(content)) !== null) {
    const mathCode = match[1] || match[2] || "";
    // Match LaTeX commands like \mathcal{H}, \varepsilon, \psi, \nabla, \hbar
    const cmdRegex = /\\([a-zA-Z]+)(?:\{([a-zA-Z0-9_\^\-]+)\})?/g;
    let cmdMatch: RegExpExecArray | null;
    while ((cmdMatch = cmdRegex.exec(mathCode)) !== null) {
      const cmd = cmdMatch[1];
      const arg = cmdMatch[2];
      if (cmd && cmd.length > 1 && !["frac", "text", "left", "right", "begin", "end", "pmatrix", "bmatrix"].includes(cmd)) {
        symbols.add(arg ? `\\${cmd}{${arg}}` : `\\${cmd}`);
      }
    }
  }

  return Array.from(symbols);
}

/**
 * Extracts uppercase scientific acronyms (e.g. BIC, QED, SWG, PAM, PBR, SLRs)
 */
export function extractAcronyms(text: string): string[] {
  if (!text) return [];
  const acronyms = new Set<string>();
  const regex = /\b([A-Z]{2,6}s?)\b/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const term = match[1];
    if (!["THE", "AND", "FOR", "NOT", "YES", "PDF", "HTTP", "URL", "HTML", "USA", "UK"].includes(term)) {
      acronyms.add(term);
    }
  }

  return Array.from(acronyms);
}

/**
 * Extracts multi-word scientific phrases from text
 */
export function extractScientificPhrases(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matchedPhrases = new Set<string>();

  for (const phrase of KNOWN_SCIENTIFIC_PHRASES) {
    if (lower.includes(phrase)) {
      matchedPhrases.add(phrase);
    }
  }

  // Also extract capitalized multi-word phrases (e.g., "Euler-Heisenberg Lagrangian", "DeepFOCUS Microscopy")
  const capPhraseRegex = /\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?\s+(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?))\b/g;
  let match: RegExpExecArray | null;
  while ((match = capPhraseRegex.exec(text)) !== null) {
    const phrase = match[1].trim();
    if (phrase.length > 5 && !phrase.startsWith("The ") && !phrase.startsWith("This ")) {
      matchedPhrases.add(phrase);
    }
  }

  return Array.from(matchedPhrases);
}

/**
 * Calculates IDF (Inverse Document Frequency) using smoothed standard formulation
 * IDF = ln(1 + (N - DF + 0.5) / (DF + 0.5))
 */
export function calculateIdf(df: number, totalDocs: number): number {
  if (totalDocs <= 0 || df <= 0) return 0;
  return Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
}

/**
 * Calculates BM25 score for a term in a document
 */
export function calculateBM25(
  tf: number,
  docLength: number,
  avgDocLength: number,
  df: number,
  totalDocs: number,
  k1: number = 1.2,
  b: number = 0.75
): number {
  if (tf <= 0 || totalDocs <= 0) return 0;
  const idf = calculateIdf(df, totalDocs);
  const tfComponent = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / (avgDocLength || 1))));
  return idf * tfComponent;
}

/**
 * Builds the complete Keyword Inventory and Dictionary for a single article
 */
export function getArticleKeywordInventory(
  article: BlogPost,
  globalDict?: GlobalKeywordDictionary
): ArticleKeywordInventory {
  const fullText = `${article.title}\n\n${article.excerpt || ""}\n\n${article.tags?.join(" ") || ""}\n\n${article.content || ""}`;
  const tokens = tokenizeText(fullText);
  const totalWordCount = tokens.length;

  const latexSymbols = extractLatexSymbols(article.content || "");
  const acronyms = extractAcronyms(fullText);
  const scientificPhrases = extractScientificPhrases(fullText);
  const tags = article.tags || [];

  // Determine term frequencies
  const tfMap = new Map<string, { term: string; count: number; category: KeywordCategory; inTitle: boolean; inTags: boolean; inLatex: boolean }>();

  // Helper to record term
  const recordTerm = (
    rawTerm: string,
    category: KeywordCategory,
    inTitle: boolean = false,
    inTags: boolean = false,
    inLatex: boolean = false
  ) => {
    const norm = normalizeKeywordTerm(rawTerm);
    if (!norm || norm.length < 2 || STOPWORDS.has(norm)) return;

    const existing = tfMap.get(norm);
    if (existing) {
      existing.count += 1;
      if (inTitle) existing.inTitle = true;
      if (inTags) existing.inTags = true;
      if (inLatex) existing.inLatex = true;
    } else {
      tfMap.set(norm, {
        term: rawTerm,
        count: 1,
        category,
        inTitle,
        inTags,
        inLatex
      });
    }
  };

  // 1. Tags
  for (const tag of tags) {
    recordTerm(tag, "tag", false, true, false);
  }

  // 2. Title tokens
  const titleTokens = tokenizeText(article.title);
  for (const t of titleTokens) {
    recordTerm(t, "title_term", true, tags.some((tg) => tg.toLowerCase().includes(t)), false);
  }

  // 3. Body tokens
  for (const t of tokens) {
    recordTerm(t, "scientific_concept", titleTokens.includes(t), tags.some((tg) => tg.toLowerCase().includes(t)), false);
  }

  // 4. Acronyms
  for (const acr of acronyms) {
    recordTerm(acr, "acronym", article.title.includes(acr), false, false);
  }

  // 5. Scientific phrases
  for (const phrase of scientificPhrases) {
    recordTerm(phrase, "scientific_concept", article.title.toLowerCase().includes(phrase.toLowerCase()), false, false);
  }

  // 6. LaTeX symbols
  for (const sym of latexSymbols) {
    recordTerm(sym, "mathematical_symbol", false, false, true);
  }

  // Calculate scores
  const topKeywords: ArticleKeywordItem[] = [];
  const totalDocs = globalDict ? globalDict.totalArticles : 64;
  const avgLength = globalDict ? globalDict.averageDocumentLength : 800;

  for (const [norm, data] of tfMap.entries()) {
    const df = globalDict?.entries[norm]?.documentFrequency || 1;
    const idf = calculateIdf(df, totalDocs);
    const bm25 = calculateBM25(data.count, totalWordCount, avgLength, df, totalDocs);

    // Weighted composite relevance score
    let weight = 1.0;
    if (data.inTitle) weight += 3.0;
    if (data.inTags) weight += 2.5;
    if (data.inLatex) weight += 1.5;
    if (data.category === "acronym") weight += 1.2;

    const score = (bm25 + idf * (data.count / (totalWordCount || 1)) * 100) * weight;

    topKeywords.push({
      term: data.term,
      normalizedTerm: norm,
      category: data.category,
      score: Number(score.toFixed(3)),
      frequency: data.count,
      inTitle: data.inTitle,
      inTags: data.inTags,
      inLatex: data.inLatex
    });
  }

  // Sort descending by score
  topKeywords.sort((a, b) => b.score - a.score);

  // Primary domain inference
  const primaryDomain = tags[0] || "Physics & Mathematical Sciences";

  return {
    articleId: article.id,
    slug: article.slug,
    title: article.title,
    totalWordCount,
    uniqueKeywordCount: topKeywords.length,
    latexSymbolCount: latexSymbols.length,
    primaryDomain,
    topKeywords: topKeywords.slice(0, 40),
    tags,
    mathematicalSymbols: latexSymbols,
    acronyms,
    scientificPhrases
  };
}

/**
 * Builds the Master Global Keyword Dictionary across an entire catalog of articles
 */
export function buildKeywordInventory(articles: BlogPost[]): GlobalKeywordDictionary {
  const totalArticles = articles.length;
  const entries: Record<string, KeywordDictionaryEntry> = {};
  const articlesInventory: Record<string, ArticleKeywordInventory> = {};
  const alphabeticalIndex: Record<string, string[]> = {};
  const domainKeywords: Record<string, string[]> = {};

  let totalCorpusWords = 0;

  // First pass: extract per-article counts and term occurrences
  const articleTermMaps: Array<{
    article: BlogPost;
    tokens: string[];
    termCounts: Map<string, { term: string; count: number; inTitle: boolean; inTags: boolean; inHeadings: boolean; inLatex: boolean; category: KeywordCategory }>;
  }> = [];

  for (const article of articles) {
    const fullText = `${article.title}\n\n${article.excerpt || ""}\n\n${article.tags?.join(" ") || ""}\n\n${article.content || ""}`;
    const tokens = tokenizeText(fullText);
    totalCorpusWords += tokens.length;

    const titleTokens = tokenizeText(article.title);
    const tags = article.tags || [];
    const latexSymbols = extractLatexSymbols(article.content || "");
    const acronyms = extractAcronyms(fullText);
    const scientificPhrases = extractScientificPhrases(fullText);

    const termCounts = new Map<string, { term: string; count: number; inTitle: boolean; inTags: boolean; inHeadings: boolean; inLatex: boolean; category: KeywordCategory }>();

    const record = (
      term: string,
      category: KeywordCategory,
      inTitle: boolean = false,
      inTags: boolean = false,
      inHeadings: boolean = false,
      inLatex: boolean = false
    ) => {
      const norm = normalizeKeywordTerm(term);
      if (!norm || norm.length < 2 || STOPWORDS.has(norm)) return;

      const curr = termCounts.get(norm);
      if (curr) {
        curr.count += 1;
        if (inTitle) curr.inTitle = true;
        if (inTags) curr.inTags = true;
        if (inHeadings) curr.inHeadings = true;
        if (inLatex) curr.inLatex = true;
      } else {
        termCounts.set(norm, {
          term,
          count: 1,
          category,
          inTitle,
          inTags,
          inHeadings,
          inLatex
        });
      }
    };

    // Record tags
    for (const tag of tags) record(tag, "tag", false, true, false, false);
    // Record title terms
    for (const t of titleTokens) record(t, "title_term", true, tags.some((tg) => tg.toLowerCase().includes(t)), false, false);
    // Record body tokens
    for (const t of tokens) record(t, "scientific_concept", titleTokens.includes(t), tags.some((tg) => tg.toLowerCase().includes(t)), false, false);
    // Record acronyms
    for (const acr of acronyms) record(acr, "acronym", article.title.includes(acr), false, false, false);
    // Record phrases
    for (const phr of scientificPhrases) record(phr, "scientific_concept", article.title.toLowerCase().includes(phr.toLowerCase()), false, false, false);
    // Record LaTeX symbols
    for (const sym of latexSymbols) record(sym, "mathematical_symbol", false, false, false, true);

    articleTermMaps.push({ article, tokens, termCounts });
  }

  const averageDocumentLength = totalArticles > 0 ? totalCorpusWords / totalArticles : 0;

  // Second pass: compute Document Frequency (DF) and Corpus Frequency
  for (const { termCounts } of articleTermMaps) {
    for (const [norm, data] of termCounts.entries()) {
      if (!entries[norm]) {
        entries[norm] = {
          term: data.term,
          normalizedTerm: norm,
          category: data.category,
          corpusFrequency: 0,
          documentFrequency: 0,
          idfScore: 0,
          averageTfIdf: 0,
          maxTfIdf: 0,
          postings: [],
          relatedKeywords: []
        };
      }
      entries[norm].corpusFrequency += data.count;
      entries[norm].documentFrequency += 1;
    }
  }

  // Third pass: compute IDF, BM25, and postings for each term
  for (const [norm, entry] of Object.entries(entries)) {
    entry.idfScore = Number(calculateIdf(entry.documentFrequency, totalArticles).toFixed(4));
  }

  for (const { article, tokens, termCounts } of articleTermMaps) {
    const docLength = tokens.length;

    for (const [norm, data] of termCounts.entries()) {
      const entry = entries[norm];
      if (!entry) continue;

      const normalizedTf = docLength > 0 ? data.count / docLength : 0;
      const tfIdfScore = Number((normalizedTf * entry.idfScore * 100).toFixed(4));
      const bm25Score = Number(calculateBM25(data.count, docLength, averageDocumentLength, entry.documentFrequency, totalArticles).toFixed(4));

      entry.postings.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        termFrequency: data.count,
        normalizedTf: Number(normalizedTf.toFixed(4)),
        tfIdfScore,
        bm25Score,
        inTitle: data.inTitle,
        inTags: data.inTags,
        inHeadings: data.inHeadings,
        inLatex: data.inLatex
      });
    }
  }

  // Fourth pass: compute stats and alphabetical grouping
  for (const [norm, entry] of Object.entries(entries)) {
    const totalTfIdf = entry.postings.reduce((sum, p) => sum + p.tfIdfScore, 0);
    entry.averageTfIdf = Number((entry.postings.length > 0 ? totalTfIdf / entry.postings.length : 0).toFixed(4));
    entry.maxTfIdf = Number(Math.max(...entry.postings.map((p) => p.tfIdfScore), 0).toFixed(4));

    // Sort postings by BM25 score descending
    entry.postings.sort((a, b) => b.bm25Score - a.bm25Score);

    // Alphabetical index key (A-Z or "#" for symbols/numbers)
    const firstChar = norm.charAt(0).toUpperCase();
    const alphaKey = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
    if (!alphabeticalIndex[alphaKey]) {
      alphabeticalIndex[alphaKey] = [];
    }
    alphabeticalIndex[alphaKey].push(norm);
  }

  // Sort alphabetical index arrays
  for (const key of Object.keys(alphabeticalIndex)) {
    alphabeticalIndex[key].sort();
  }

  // Build partial dictionary for article inventory construction
  const partialDict: GlobalKeywordDictionary = {
    generatedAt: Date.now(),
    totalArticles,
    totalCorpusWords,
    totalUniqueKeywords: Object.keys(entries).length,
    averageDocumentLength: Number(averageDocumentLength.toFixed(2)),
    entries,
    articlesInventory: {},
    alphabeticalIndex,
    domainKeywords,
    topKeywordsByScore: []
  };

  // Build individual article inventories
  for (const article of articles) {
    const inv = getArticleKeywordInventory(article, partialDict);
    articlesInventory[article.id] = inv;

    // Track domain keywords
    const domain = inv.primaryDomain;
    if (!domainKeywords[domain]) {
      domainKeywords[domain] = [];
    }
    for (const kw of inv.topKeywords.slice(0, 10)) {
      if (!domainKeywords[domain].includes(kw.normalizedTerm)) {
        domainKeywords[domain].push(kw.normalizedTerm);
      }
    }
  }

  // Top global keywords by corpus importance
  const topKeywordsByScore = Object.values(entries)
    .sort((a, b) => b.maxTfIdf * Math.log(b.documentFrequency + 1) - a.maxTfIdf * Math.log(a.documentFrequency + 1))
    .slice(0, 100)
    .map((e) => e.normalizedTerm);

  // Compute co-occurring related keywords for top entries
  for (const entry of Object.values(entries).slice(0, 200)) {
    const articleIds = new Set(entry.postings.map((p) => p.articleId));
    const cooccurringCounts = new Map<string, number>();

    for (const p of entry.postings) {
      const artInv = articlesInventory[p.articleId];
      if (artInv) {
        for (const kw of artInv.topKeywords.slice(0, 15)) {
          if (kw.normalizedTerm !== entry.normalizedTerm) {
            cooccurringCounts.set(kw.normalizedTerm, (cooccurringCounts.get(kw.normalizedTerm) || 0) + 1);
          }
        }
      }
    }

    const related = Array.from(cooccurringCounts.entries())
      .map(([term, count]) => {
        const otherEntry = entries[term];
        const otherDocCount = otherEntry ? otherEntry.documentFrequency : count;
        // Jaccard similarity: |A ∩ B| / |A ∪ B|
        const jaccard = count / (articleIds.size + otherDocCount - count);
        return {
          term: otherEntry?.term || term,
          similarity: Number(jaccard.toFixed(3))
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);

    entry.relatedKeywords = related;
  }

  partialDict.articlesInventory = articlesInventory;
  partialDict.topKeywordsByScore = topKeywordsByScore;

  return partialDict;
}

/**
 * Searches the keyword dictionary by exact term or substring prefix
 */
export function lookupKeyword(
  term: string,
  dictionary: GlobalKeywordDictionary
): KeywordDictionaryEntry | null {
  if (!term || !dictionary) return null;
  const norm = normalizeKeywordTerm(term);
  return dictionary.entries[norm] || null;
}

/**
 * Performs prefix and fuzzy search over dictionary keywords
 */
export function searchKeywords(
  query: string,
  dictionary: GlobalKeywordDictionary,
  limit: number = 20
): KeywordDictionaryEntry[] {
  if (!query || !dictionary) return [];
  const norm = normalizeKeywordTerm(query);
  if (!norm) return [];

  const results: Array<{ entry: KeywordDictionaryEntry; matchRank: number }> = [];

  for (const entry of Object.values(dictionary.entries)) {
    if (entry.normalizedTerm === norm) {
      results.push({ entry, matchRank: 100 + entry.documentFrequency });
    } else if (entry.normalizedTerm.startsWith(norm)) {
      results.push({ entry, matchRank: 50 + entry.documentFrequency });
    } else if (entry.normalizedTerm.includes(norm)) {
      results.push({ entry, matchRank: 20 + entry.documentFrequency });
    }
  }

  return results
    .sort((a, b) => b.matchRank - a.matchRank)
    .slice(0, limit)
    .map((r) => r.entry);
}

/**
 * Finds and ranks articles matching a collection of keywords
 */
export function findArticlesByKeywords(
  terms: string[],
  dictionary: GlobalKeywordDictionary,
  options?: { matchAll?: boolean; minScore?: number; limit?: number }
): Array<{
  articleId: string;
  title: string;
  slug: string;
  matchedKeywords: string[];
  totalScore: number;
}> {
  if (!terms || terms.length === 0 || !dictionary) return [];

  const normalizedTerms = terms.map(normalizeKeywordTerm).filter(Boolean);
  if (normalizedTerms.length === 0) return [];

  const articleScores = new Map<
    string,
    {
      articleId: string;
      title: string;
      slug: string;
      matchedKeywords: Set<string>;
      totalScore: number;
    }
  >();

  for (const term of normalizedTerms) {
    const entry = dictionary.entries[term];
    if (!entry) continue;

    for (const posting of entry.postings) {
      const existing = articleScores.get(posting.articleId);
      if (existing) {
        existing.matchedKeywords.add(entry.term);
        existing.totalScore += posting.bm25Score + posting.tfIdfScore;
      } else {
        articleScores.set(posting.articleId, {
          articleId: posting.articleId,
          title: posting.title,
          slug: posting.slug,
          matchedKeywords: new Set([entry.term]),
          totalScore: posting.bm25Score + posting.tfIdfScore
        });
      }
    }
  }

  let results = Array.from(articleScores.values()).map((r) => ({
    articleId: r.articleId,
    title: r.title,
    slug: r.slug,
    matchedKeywords: Array.from(r.matchedKeywords),
    totalScore: Number(r.totalScore.toFixed(3))
  }));

  if (options?.matchAll) {
    results = results.filter((r) => r.matchedKeywords.length === normalizedTerms.length);
  }

  if (options?.minScore !== undefined) {
    results = results.filter((r) => r.totalScore >= options.minScore!);
  }

  results.sort((a, b) => b.totalScore - a.totalScore);

  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Returns grouped A-Z keyword dictionary entries
 */
export function getKeywordAlphabeticalDirectory(
  dictionary: GlobalKeywordDictionary
): Record<string, KeywordDictionaryEntry[]> {
  const directory: Record<string, KeywordDictionaryEntry[]> = {};

  for (const [letter, termList] of Object.entries(dictionary.alphabeticalIndex)) {
    directory[letter] = termList
      .map((term) => dictionary.entries[term])
      .filter(Boolean);
  }

  return directory;
}

/**
 * Exports complete inventory serializable JSON
 */
export function exportKeywordDictionaryJson(dictionary: GlobalKeywordDictionary): string {
  return JSON.stringify(dictionary, null, 2);
}
