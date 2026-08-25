import { BlogPost } from "../types";
import { executeAdvancedSearch } from "./advancedSearch";

export interface AutocompleteSuggestion {
  type: "tag" | "article" | "concept" | "author";
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  queryValue: string; // The text to place in the search bar or filter
  blogId?: string; // Optional blogId if this navigates directly to an article
}

export interface SearchAutocompleteResults {
  suggestions: AutocompleteSuggestion[];
  totalMatches: number;
}

/**
 * Common scientific domain concepts extracted from quantum informatics, photonics & chemistry literature
 */
const CURATED_SCIENTIFIC_CONCEPTS = [
  "Bound States in the Continuum",
  "Two-Photon Imaging",
  "Vacuum Non-Linearity",
  "Wavefront Shaping",
  "Quantum Metamaterials",
  "Silicon Photonics",
  "Topological Insulators",
  "Tensor Networks",
  "Schrödinger Wave Dynamics",
  "Scattering Correction",
  "Photon States",
  "Quantum Coherence",
  "Integrated Waveguides",
  "Lindblad Master Equation"
];

/**
 * Extracts intelligent autocomplete suggestions given the user's active search query.
 */
export function getSearchSuggestions(
  posts: BlogPost[],
  query: string,
  maxSuggestions = 6
): SearchAutocompleteResults {
  if (!posts || !Array.isArray(posts)) {
    return { suggestions: [], totalMatches: 0 };
  }

  const cleanQuery = (query || "").trim().toLowerCase();
  if (!cleanQuery) {
    // Return curated popular concepts and top tags when query is blank/focused
    const allTags = Array.from(new Set(posts.flatMap(p => p.tags || []))).slice(0, 3);
    const topSuggestions: AutocompleteSuggestion[] = [
      ...allTags.map(tag => ({
        type: "tag" as const,
        id: `tag-${tag}`,
        title: tag,
        subtitle: "Filter by topic",
        badge: "Topic",
        queryValue: tag
      })),
      ...CURATED_SCIENTIFIC_CONCEPTS.slice(0, 3).map(concept => ({
        type: "concept" as const,
        id: `concept-${concept}`,
        title: concept,
        subtitle: "Research domain",
        badge: "Concept",
        queryValue: concept
      }))
    ];
    return { suggestions: topSuggestions.slice(0, maxSuggestions), totalMatches: posts.length };
  }

  const suggestions: AutocompleteSuggestion[] = [];
  const seenIds = new Set<string>();

  // 1. Matching Tags
  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || [])));
  for (const tag of allTags) {
    if (tag.toLowerCase().includes(cleanQuery)) {
      const matchCount = posts.filter(p => (p.tags || []).includes(tag)).length;
      suggestions.push({
        type: "tag",
        id: `tag-${tag}`,
        title: tag,
        subtitle: `${matchCount} publication${matchCount === 1 ? "" : "s"}`,
        badge: "Tag",
        queryValue: tag
      });
      seenIds.add(`tag-${tag}`);
      if (suggestions.length >= maxSuggestions) break;
    }
  }

  // 2. Matching Curated Concepts
  for (const concept of CURATED_SCIENTIFIC_CONCEPTS) {
    if (concept.toLowerCase().includes(cleanQuery) && !seenIds.has(`concept-${concept}`)) {
      suggestions.push({
        type: "concept",
        id: `concept-${concept}`,
        title: concept,
        subtitle: "Scientific concept",
        badge: "Domain",
        queryValue: concept
      });
      seenIds.add(`concept-${concept}`);
      if (suggestions.length >= maxSuggestions) break;
    }
  }

  // 3. Matching Top Articles
  for (const post of posts) {
    const titleMatch = post.title.toLowerCase().includes(cleanQuery);
    const excerptMatch = (post.excerpt || "").toLowerCase().includes(cleanQuery);
    const arxivMatch = (post.arxivLink || "").toLowerCase().includes(cleanQuery);

    if (titleMatch || excerptMatch || arxivMatch) {
      const shortTitle = post.title.length > 65 ? `${post.title.slice(0, 62)}...` : post.title;
      suggestions.push({
        type: "article",
        id: `article-${post.id}`,
        title: shortTitle,
        subtitle: post.author || post.readingTime || "Research Publication",
        badge: post.readingTime || "Article",
        queryValue: post.title,
        blogId: post.id
      });
      seenIds.add(`article-${post.id}`);
      if (suggestions.length >= maxSuggestions) break;
    }
  }

  // 4. Matching Authors
  const allAuthors = Array.from(new Set(posts.map(p => p.author).filter(Boolean))) as string[];
  for (const author of allAuthors) {
    if (author.toLowerCase().includes(cleanQuery) && !seenIds.has(`author-${author}`)) {
      suggestions.push({
        type: "author",
        id: `author-${author}`,
        title: author,
        subtitle: "Research Author",
        badge: "Author",
        queryValue: `author:"${author}"`
      });
      seenIds.add(`author-${author}`);
      if (suggestions.length >= maxSuggestions) break;
    }
  }

  // Compute total matching posts
  const searchResults = executeAdvancedSearch(posts, cleanQuery);

  return {
    suggestions: suggestions.slice(0, maxSuggestions),
    totalMatches: searchResults.length
  };
}

/**
 * Intelligent filter and rank function for the publication corpus.
 */
export function filterBlogsIntelligently(
  posts: BlogPost[],
  query: string,
  selectedTag: string | null = null,
  hiddenBlogIds: string[] = [],
  isEditorMode = false
): BlogPost[] {
  if (!posts || !Array.isArray(posts)) return [];

  // Filter out hidden blogs unless editor mode
  const basePosts = posts.filter(b => {
    if (!isEditorMode && hiddenBlogIds.includes(b.id)) return false;
    if (b.status === "draft_option") return false;
    return true;
  });

  const cleanQuery = (query || "").trim();

  // If no search query, apply tag filter or return full list
  if (!cleanQuery) {
    if (!selectedTag) return basePosts;
    return basePosts.filter(b => (b.tags || []).includes(selectedTag));
  }

  // Advanced search with tokenization, fuzzy keywords, and scoring
  const ranked = executeAdvancedSearch(basePosts, cleanQuery);
  let matchedPosts = ranked.map(r => r.post);

  // If tag is also selected, filter within results
  if (selectedTag) {
    matchedPosts = matchedPosts.filter(b => (b.tags || []).includes(selectedTag));
  }

  return matchedPosts;
}
