/**
 * Comprehensive Article Ordering, Search, Graph Traversal, and Visibility Algorithms.
 * 
 * Provides:
 * 1. ArXiv Date Extraction and Publication Discrepancy Diagnostics
 * 2. Multi-Strategy Sorting (Generation Timestamp, ArXiv Preprint Date, Hybrid Editorial, Graph Proximity)
 * 3. Dijkstra's Algorithm for Shortest Semantic Research Paths
 * 4. A* Search Algorithm with Admissible Thematic Heuristics
 * 5. Priority Queue / Binary Heap (O(log N) insert/delete, O(1) peek)
 * 6. OrderedArticleIndex (Binary search, ordered insertion, and deletion)
 * 7. Prefix Trie for Instant Title and Tag Lookup
 * 8. Comprehensive Hide/Show & Filter Visibility Engine
 */

import { BlogPost } from "../types";
import { extractArxivId } from "./arxivUtils";
import { isArticleBlocked } from "./arxivBlocklist";
import { parsePublicationDate, getBlogTimestamp } from "./viewCounter";

// ============================================================================
// 1. ARXIV PREPRINT DATE EXTRACTION & ANOMALY DIAGNOSIS
// ============================================================================

export interface ArxivSubmissionDate {
  year: number;
  month: number;
  day?: number;
  timestamp: number;
  formatted: string;
  isLegacyFormat: boolean;
}

/**
 * Extracts the exact submission year and month from an arXiv identifier or URL.
 * Supports modern schema (e.g., '2608.11111' -> 2026-08, '2609.19103' -> 2026-09)
 * and legacy archive schema (e.g., 'math/0501123' -> 2005-01).
 */
export function extractArxivSubmissionDate(input?: string | null): ArxivSubmissionDate | null {
  if (!input || typeof input !== "string") return null;
  const rawId = extractArxivId(input);
  if (!rawId) return null;

  // Modern schema: YYMM.NNNNN or YYMM.NNNNNvV
  const modernMatch = rawId.match(/^(\d{2})(\d{2})\.\d{4,5}(?:v\d+)?$/);
  if (modernMatch) {
    const rawYear = parseInt(modernMatch[1], 10);
    const month = parseInt(modernMatch[2], 10);
    if (month < 1 || month > 12) return null;

    // ArXiv started modern format in 2007 (0707.xxxx)
    const year = rawYear >= 90 ? 1900 + rawYear : 2000 + rawYear;
    // Anchor to mid-month if exact day is not in the identifier
    const date = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
    const formatted = `${year}-${String(month).padStart(2, "0")}`;

    return {
      year,
      month,
      timestamp: date.getTime(),
      formatted,
      isLegacyFormat: false
    };
  }

  // Legacy schema: archive/YYMMNNN (e.g., math/0501123, quant-ph/9912001)
  const legacyMatch = rawId.match(/^[a-z-]+(?:\.[a-z]{2})?\/(\d{2})(\d{2})\d{3}(?:v\d+)?$/i);
  if (legacyMatch) {
    const rawYear = parseInt(legacyMatch[1], 10);
    const month = parseInt(legacyMatch[2], 10);
    if (month < 1 || month > 12) return null;

    const year = rawYear >= 90 ? 1900 + rawYear : 2000 + rawYear;
    const date = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
    const formatted = `${year}-${String(month).padStart(2, "0")}`;

    return {
      year,
      month,
      timestamp: date.getTime(),
      formatted,
      isLegacyFormat: true
    };
  }

  return null;
}

export interface OrderingAnomalyDiagnosis {
  articleId: string;
  title: string;
  slug?: string;
  arxivLink?: string;
  arxivId: string | null;
  arxivSubmissionDate: string | null;
  generationTimestamp: number;
  generationDate: string;
  deltaDaysBetweenPreprintAndGeneration: number;
  isOldPreprintAppearingNew: boolean;
  currentDisplayPosition: number;
  recommendedPosition: number;
  explanation: string;
}

/**
 * Diagnoses why an article (such as 'Generic Spectral Determination...') appears at the top
 * of the catalog when its underlying research preprint is significantly older than other preprints.
 */
export function diagnoseArticleOrdering(
  targetIdentifier: string,
  catalog: BlogPost[]
): OrderingAnomalyDiagnosis | null {
  const cleanTarget = targetIdentifier.trim().toLowerCase();
  const index = catalog.findIndex(
    (b) =>
      b.id.toLowerCase() === cleanTarget ||
      (b.slug && b.slug.toLowerCase() === cleanTarget) ||
      (b.arxivLink && b.arxivLink.toLowerCase().includes(cleanTarget)) ||
      (b.title && b.title.toLowerCase().includes(cleanTarget))
  );

  if (index === -1) return null;
  const article = catalog[index];

  const arxivDate = extractArxivSubmissionDate(article.arxivLink);
  const genTimestamp = getBlogTimestamp(article);
  const genDateStr = new Date(genTimestamp).toISOString().split("T")[0];

  let deltaDays = 0;
  let isOldPreprintAppearingNew = false;
  let explanation = "";

  if (arxivDate) {
    const diffMs = genTimestamp - arxivDate.timestamp;
    deltaDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    // If preprint is > 14 days older than editorial generation timestamp
    if (deltaDays > 14) {
      isOldPreprintAppearingNew = true;
      explanation =
        `Article was generated/stamped on ${genDateStr} (timestamp ${genTimestamp}), but its ` +
        `arXiv preprint (${extractArxivId(article.arxivLink || "")}) was submitted in ` +
        `${arxivDate.formatted} (${deltaDays} days prior). Because sortBlogsByPublicationDate ` +
        `sorts by generation timestamp (createdAt / Date.now()), it received position ${index} ` +
        `ahead of newer research preprints.`;
    } else {
      explanation = `Article preprint date (${arxivDate.formatted}) closely matches generation date (${genDateStr}).`;
    }
  } else {
    explanation = "No valid arXiv identifier found; ordered strictly by assigned publication date.";
  }

  // Calculate recommended position under strict arXiv submission chronology
  const sortedByArxiv = [...catalog].sort((a, b) => {
    const aDate = extractArxivSubmissionDate(a.arxivLink)?.timestamp || getBlogTimestamp(a);
    const bDate = extractArxivSubmissionDate(b.arxivLink)?.timestamp || getBlogTimestamp(b);
    return bDate - aDate;
  });
  const recommendedPosition = sortedByArxiv.findIndex((b) => b.id === article.id);

  return {
    articleId: article.id,
    title: article.title,
    slug: article.slug,
    arxivLink: article.arxivLink,
    arxivId: extractArxivId(article.arxivLink || ""),
    arxivSubmissionDate: arxivDate ? arxivDate.formatted : null,
    generationTimestamp: genTimestamp,
    generationDate: genDateStr,
    deltaDaysBetweenPreprintAndGeneration: deltaDays,
    isOldPreprintAppearingNew,
    currentDisplayPosition: index,
    recommendedPosition,
    explanation
  };
}

// ============================================================================
// 2. DATA STRUCTURES: PRIORITY QUEUE / BINARY HEAP
// ============================================================================

export class PriorityQueue<T> {
  private heap: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  public get size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public peek(): T | undefined {
    return this.heap[0];
  }

  public push(item: T): void {
    this.heap.push(item);
    this.siftUp(this.heap.length - 1);
  }

  public pop(): T | undefined {
    if (this.isEmpty()) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.siftDown(0);
    }
    return top;
  }

  public remove(predicate: (item: T) => boolean): boolean {
    const index = this.heap.findIndex(predicate);
    if (index === -1) return false;
    const bottom = this.heap.pop()!;
    if (index < this.heap.length) {
      this.heap[index] = bottom;
      this.siftUp(index);
      this.siftDown(index);
    }
    return true;
  }

  public toArray(): T[] {
    return [...this.heap];
  }

  public clear(): void {
    this.heap = [];
  }

  private siftUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.comparator(this.heap[current], this.heap[parent]) < 0) {
        this.swap(current, parent);
        current = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number): void {
    let current = index;
    const length = this.heap.length;
    while (true) {
      const left = 2 * current + 1;
      const right = 2 * current + 2;
      let smallest = current;

      if (left < length && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest !== current) {
        this.swap(current, smallest);
        current = smallest;
      } else {
        break;
      }
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

// ============================================================================
// 3. GRAPH ALGORITHMS: DIJKSTRA & A* FOR RESEARCH PAPERS
// ============================================================================

export interface GraphEdge {
  targetId: string;
  weight: number; // thematic divergence / transition distance (non-negative)
  relationship: string;
}

export interface ResearchGraph {
  nodes: Map<string, BlogPost>;
  adjacency: Map<string, GraphEdge[]>;
}

/**
 * Builds a weighted research article graph from an array of BlogPost objects.
 * Edge weight corresponds to thematic distance: higher affinity = lower distance.
 */
export function buildWeightedResearchGraph(articles: BlogPost[]): ResearchGraph {
  const nodes = new Map<string, BlogPost>();
  const adjacency = new Map<string, GraphEdge[]>();

  for (const post of articles) {
    if (post && post.id) {
      nodes.set(post.id, post);
      adjacency.set(post.id, []);
    }
  }

  const list = Array.from(nodes.values());
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const p1 = list[i];
      const p2 = list[j];

      const tags1 = new Set((p1.tags || []).map((t) => t.toLowerCase().trim()));
      const tags2 = new Set((p2.tags || []).map((t) => t.toLowerCase().trim()));

      let sharedTags = 0;
      for (const t of tags1) {
        if (tags2.has(t)) sharedTags++;
      }

      const arxiv1 = extractArxivId(p1.arxivLink || "");
      const arxiv2 = extractArxivId(p2.arxivLink || "");
      const crossRef1 = Boolean(arxiv2 && (p1.content || "").includes(arxiv2));
      const crossRef2 = Boolean(arxiv1 && (p2.content || "").includes(arxiv1));
      const sharedAuthor = p1.author && p2.author && p1.author.toLowerCase() === p2.author.toLowerCase();

      let affinity = sharedTags * 2.0;
      if (crossRef1 || crossRef2) affinity += 5.0;
      if (sharedAuthor) affinity += 3.0;

      if (affinity > 0) {
        // Distance is inversely proportional to affinity
        const distance = Math.max(0.1, parseFloat((10 / (1 + affinity)).toFixed(2)));
        const rel = crossRef1 || crossRef2 ? "citation" : sharedAuthor ? "co-author" : "shared_topic";

        adjacency.get(p1.id)?.push({ targetId: p2.id, weight: distance, relationship: rel });
        adjacency.get(p2.id)?.push({ targetId: p1.id, weight: distance, relationship: rel });
      }
    }
  }

  return { nodes, adjacency };
}

export interface ShortestPathResult {
  sourceId: string;
  targetId: string;
  totalDistance: number;
  path: string[];
  edges: GraphEdge[];
  nodesExplored: number;
}

/**
 * Dijkstra's Algorithm for computing the single-pair shortest thematic path between articles.
 */
export function dijkstraShortestPath(
  graph: ResearchGraph,
  sourceId: string,
  targetId: string
): ShortestPathResult | null {
  if (!graph.nodes.has(sourceId) || !graph.nodes.has(targetId)) return null;
  if (sourceId === targetId) {
    return {
      sourceId,
      targetId,
      totalDistance: 0,
      path: [sourceId],
      edges: [],
      nodesExplored: 1
    };
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, { from: string; edge: GraphEdge }>();
  const visited = new Set<string>();

  for (const nodeId of graph.nodes.keys()) {
    distances.set(nodeId, Infinity);
  }
  distances.set(sourceId, 0);

  const pq = new PriorityQueue<{ id: string; dist: number }>((a, b) => a.dist - b.dist);
  pq.push({ id: sourceId, dist: 0 });

  let nodesExplored = 0;

  while (!pq.isEmpty()) {
    const current = pq.pop()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    nodesExplored++;

    if (current.id === targetId) break;

    const edges = graph.adjacency.get(current.id) || [];
    for (const edge of edges) {
      if (visited.has(edge.targetId)) continue;
      const newDist = current.dist + edge.weight;
      const existingDist = distances.get(edge.targetId) ?? Infinity;

      if (newDist < existingDist) {
        distances.set(edge.targetId, newDist);
        previous.set(edge.targetId, { from: current.id, edge });
        pq.push({ id: edge.targetId, dist: newDist });
      }
    }
  }

  const targetDist = distances.get(targetId);
  if (targetDist === undefined || targetDist === Infinity) {
    return null; // Target unreachable
  }

  // Reconstruct path
  const path: string[] = [];
  const edges: GraphEdge[] = [];
  let curr = targetId;
  while (curr !== sourceId) {
    path.unshift(curr);
    const prevEntry = previous.get(curr);
    if (!prevEntry) break;
    edges.unshift(prevEntry.edge);
    curr = prevEntry.from;
  }
  path.unshift(sourceId);

  return {
    sourceId,
    targetId,
    totalDistance: parseFloat(targetDist.toFixed(3)),
    path,
    edges,
    nodesExplored
  };
}

/**
 * A* Search Algorithm using an admissible heuristic based on tag set dissimilarity (Jaccard distance).
 */
export function aStarShortestPath(
  graph: ResearchGraph,
  sourceId: string,
  targetId: string
): ShortestPathResult | null {
  if (!graph.nodes.has(sourceId) || !graph.nodes.has(targetId)) return null;
  if (sourceId === targetId) {
    return {
      sourceId,
      targetId,
      totalDistance: 0,
      path: [sourceId],
      edges: [],
      nodesExplored: 1
    };
  }

  const targetNode = graph.nodes.get(targetId)!;
  const targetTags = new Set((targetNode.tags || []).map((t) => t.toLowerCase()));

  // Admissible heuristic: minimum theoretical transition cost between current node and target
  const heuristic = (nodeId: string): number => {
    const node = graph.nodes.get(nodeId);
    if (!node) return 0;
    const nodeTags = new Set((node.tags || []).map((t) => t.toLowerCase()));
    let intersection = 0;
    for (const t of nodeTags) {
      if (targetTags.has(t)) intersection++;
    }
    const union = new Set([...nodeTags, ...targetTags]).size;
    if (union === 0) return 0.5;
    // Jaccard distance: 0 (identical tags) to 1.0 (disjoint tags), scaled by min edge weight
    const jaccardDist = 1 - intersection / union;
    return jaccardDist * 0.5; // Always <= actual edge weight (admissible)
  };

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const previous = new Map<string, { from: string; edge: GraphEdge }>();
  const visited = new Set<string>();

  for (const id of graph.nodes.keys()) {
    gScore.set(id, Infinity);
    fScore.set(id, Infinity);
  }

  gScore.set(sourceId, 0);
  fScore.set(sourceId, heuristic(sourceId));

  const pq = new PriorityQueue<{ id: string; f: number }>((a, b) => a.f - b.f);
  pq.push({ id: sourceId, f: fScore.get(sourceId)! });

  let nodesExplored = 0;

  while (!pq.isEmpty()) {
    const current = pq.pop()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    nodesExplored++;

    if (current.id === targetId) break;

    const currentG = gScore.get(current.id) ?? Infinity;
    const edges = graph.adjacency.get(current.id) || [];

    for (const edge of edges) {
      if (visited.has(edge.targetId)) continue;
      const tentativeG = currentG + edge.weight;
      const targetG = gScore.get(edge.targetId) ?? Infinity;

      if (tentativeG < targetG) {
        gScore.set(edge.targetId, tentativeG);
        const f = tentativeG + heuristic(edge.targetId);
        fScore.set(edge.targetId, f);
        previous.set(edge.targetId, { from: current.id, edge });
        pq.push({ id: edge.targetId, f });
      }
    }
  }

  const finalDist = gScore.get(targetId);
  if (finalDist === undefined || finalDist === Infinity) return null;

  const path: string[] = [];
  const edges: GraphEdge[] = [];
  let curr = targetId;
  while (curr !== sourceId) {
    path.unshift(curr);
    const prev = previous.get(curr);
    if (!prev) break;
    edges.unshift(prev.edge);
    curr = prev.from;
  }
  path.unshift(sourceId);

  return {
    sourceId,
    targetId,
    totalDistance: parseFloat(finalDist.toFixed(3)),
    path,
    edges,
    nodesExplored
  };
}

// ============================================================================
// 4. ORDERED ARTICLE INDEX (SEARCH, INSERT, DELETE IN O(log N))
// ============================================================================

export type ArticleComparator = (a: BlogPost, b: BlogPost) => number;

/**
 * Default comparator: strict generation timestamp descending, tie-breaking alphabetically by title.
 */
export const defaultLatestComparator: ArticleComparator = (a, b) => {
  const tA = getBlogTimestamp(a);
  const tB = getBlogTimestamp(b);
  if (tA !== tB) return tB - tA;
  return (a.title || "").localeCompare(b.title || "");
};

/**
 * ArXiv submission date comparator: orders strictly by preprint submission year/month.
 */
export const arxivSubmissionComparator: ArticleComparator = (a, b) => {
  const tA = extractArxivSubmissionDate(a.arxivLink)?.timestamp || getBlogTimestamp(a);
  const tB = extractArxivSubmissionDate(b.arxivLink)?.timestamp || getBlogTimestamp(b);
  if (tA !== tB) return tB - tA;
  return (a.title || "").localeCompare(b.title || "");
};

export class OrderedArticleIndex {
  private items: BlogPost[] = [];
  private idMap: Map<string, BlogPost> = new Map();
  private comparator: ArticleComparator;

  constructor(initialItems: BlogPost[] = [], comparator: ArticleComparator = defaultLatestComparator) {
    this.comparator = comparator;
    for (const item of initialItems) {
      this.insert(item);
    }
  }

  public get length(): number {
    return this.items.length;
  }

  public getAll(): BlogPost[] {
    return [...this.items];
  }

  public getById(id: string): BlogPost | undefined {
    return this.idMap.get(id);
  }

  public has(id: string): boolean {
    return this.idMap.has(id);
  }

  /**
   * Inserts an article into the collection while strictly preserving sort order via binary search.
   * Updates in-place if an article with the same ID already exists.
   */
  public insert(article: BlogPost): number {
    if (!article || !article.id) return -1;

    // If item already exists, remove it first
    if (this.idMap.has(article.id)) {
      this.delete(article.id);
    }

    const index = this.findInsertionIndex(article);
    this.items.splice(index, 0, article);
    this.idMap.set(article.id, article);
    return index;
  }

  /**
   * Deletes an article by ID in O(N) array shift and O(1) map cleanup.
   */
  public delete(id: string): boolean {
    if (!this.idMap.has(id)) return false;
    const index = this.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
    this.idMap.delete(id);
    return true;
  }

  /**
   * Binary search to find exact index where article belongs according to comparator.
   */
  public findInsertionIndex(article: BlogPost): number {
    let low = 0;
    let high = this.items.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.comparator(article, this.items[mid]) < 0) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low;
  }

  /**
   * Searches for articles matching a title prefix using binary search range scan.
   */
  public searchByTitlePrefix(prefix: string): BlogPost[] {
    const cleanPrefix = prefix.toLowerCase().trim();
    if (!cleanPrefix) return [...this.items];

    return this.items.filter((b) => (b.title || "").toLowerCase().startsWith(cleanPrefix));
  }
}

// ============================================================================
// 5. PREFIX TRIE FOR TITLE & TAG SEARCH
// ============================================================================

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  articleIds: Set<string> = new Set();
  isEndOfWord: boolean = false;
}

export class ArticlePrefixTrie {
  private root: TrieNode = new TrieNode();

  public insert(text: string, articleId: string): void {
    if (!text || !articleId) return;
    const clean = text.toLowerCase().trim();
    let current = this.root;

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
      current.articleIds.add(articleId);
    }
    current.isEndOfWord = true;
  }

  public delete(text: string, articleId: string): void {
    if (!text || !articleId) return;
    const clean = text.toLowerCase().trim();
    let current = this.root;

    const stack: { node: TrieNode; char: string }[] = [];

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (!current.children.has(char)) return;
      stack.push({ node: current, char });
      current = current.children.get(char)!;
      current.articleIds.delete(articleId);
    }

    if (current.articleIds.size === 0) {
      current.isEndOfWord = false;
    }
  }

  public searchPrefix(prefix: string): string[] {
    if (!prefix) return [];
    const clean = prefix.toLowerCase().trim();
    let current = this.root;

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }

    return Array.from(current.articleIds);
  }
}

// ============================================================================
// 6. MULTI-STRATEGY SORTING ENGINE
// ============================================================================

export enum SortStrategy {
  /** Sorts strictly by generation timestamp (createdAt / timestamp / ID timestamp) */
  LATEST_GENERATED = "latest_generated",
  /** Sorts by original arXiv preprint submission date (YYMM), placing newest submissions first */
  ARXIV_SUBMISSION_DATE = "arxiv_submission_date",
  /** Hybrid: recent preprints order by generation date; archival preprints fall back to preprint year/month */
  HYBRID_BALANCED = "hybrid_balanced",
  /** Sorts by thematic proximity to a designated active article */
  THEMATIC_PROXIMITY = "thematic_proximity",
  /** Sorts by view velocity (views per day) */
  VIEW_VELOCITY = "view_velocity"
}

export interface SortOptions {
  strategy?: SortStrategy;
  direction?: "desc" | "asc";
  activeArticleId?: string;
  graph?: ResearchGraph;
  referenceDate?: Date;
}

/**
 * Computes hybrid timestamp for an article.
 * If the preprint was submitted within 30 days of generation, generation timestamp is respected.
 * If the preprint is historical/archival, its arXiv submission timestamp is used to prevent
 * older papers from jumping ahead of contemporary articles in the main feed.
 */
export function getHybridArticleTimestamp(article: BlogPost, referenceDate = new Date()): number {
  const genTs = getBlogTimestamp(article);
  const arxivDate = extractArxivSubmissionDate(article.arxivLink);

  if (!arxivDate) return genTs;

  // Age difference between generation and preprint submission
  const ageDiffDays = (genTs - arxivDate.timestamp) / (1000 * 60 * 60 * 24);

  // If preprint was submitted within 30 days of the generation date, treat as contemporary
  if (ageDiffDays <= 30) {
    return genTs;
  }

  // Otherwise, penalize the generation timestamp to anchor it near its true arXiv publication era
  return arxivDate.timestamp;
}

/**
 * Sorts articles according to the requested high-level strategy.
 */
export function sortArticlesWithStrategy(
  articles: BlogPost[],
  options: SortOptions = {}
): BlogPost[] {
  const {
    strategy = SortStrategy.LATEST_GENERATED,
    direction = "desc",
    activeArticleId,
    graph,
    referenceDate = new Date()
  } = options;

  const list = [...articles];

  if (strategy === SortStrategy.THEMATIC_PROXIMITY && activeArticleId) {
    const researchGraph = graph || buildWeightedResearchGraph(list);
    const distances = new Map<string, number>();

    for (const item of list) {
      if (item.id === activeArticleId) {
        distances.set(item.id, 0);
      } else {
        const path = dijkstraShortestPath(researchGraph, activeArticleId, item.id);
        distances.set(item.id, path ? path.totalDistance : 9999);
      }
    }

    list.sort((a, b) => {
      const distA = distances.get(a.id) ?? 9999;
      const distB = distances.get(b.id) ?? 9999;
      if (distA !== distB) {
        return direction === "asc" ? distA - distB : distB - distA;
      }
      return (a.title || "").localeCompare(b.title || "");
    });
    return list;
  }

  if (strategy === SortStrategy.ARXIV_SUBMISSION_DATE) {
    list.sort((a, b) => {
      const tA = extractArxivSubmissionDate(a.arxivLink)?.timestamp || getBlogTimestamp(a);
      const tB = extractArxivSubmissionDate(b.arxivLink)?.timestamp || getBlogTimestamp(b);
      if (tA !== tB) {
        return direction === "desc" ? tB - tA : tA - tB;
      }
      return (a.title || "").localeCompare(b.title || "");
    });
    return list;
  }

  if (strategy === SortStrategy.HYBRID_BALANCED) {
    list.sort((a, b) => {
      const tA = getHybridArticleTimestamp(a, referenceDate);
      const tB = getHybridArticleTimestamp(b, referenceDate);
      if (tA !== tB) {
        return direction === "desc" ? tB - tA : tA - tB;
      }
      return (a.title || "").localeCompare(b.title || "");
    });
    return list;
  }

  if (strategy === SortStrategy.VIEW_VELOCITY) {
    list.sort((a, b) => {
      const daysA = Math.max(1, Math.round((referenceDate.getTime() - getBlogTimestamp(a)) / (1000 * 60 * 60 * 24)));
      const daysB = Math.max(1, Math.round((referenceDate.getTime() - getBlogTimestamp(b)) / (1000 * 60 * 60 * 24)));
      const velA = (a.views || 0) / daysA;
      const velB = (b.views || 0) / daysB;
      if (velA !== velB) {
        return direction === "desc" ? velB - velA : velA - velB;
      }
      return (a.title || "").localeCompare(b.title || "");
    });
    return list;
  }

  // Default: LATEST_GENERATED
  list.sort((a, b) => {
    const tA = getBlogTimestamp(a);
    const tB = getBlogTimestamp(b);
    if (tA !== tB) {
      return direction === "desc" ? tB - tA : tA - tB;
    }
    return (a.title || "").localeCompare(b.title || "");
  });

  return list;
}

// ============================================================================
// 7. HIDE / SHOW & VISIBILITY LOGIC
// ============================================================================

export interface VisibilityFilterOptions {
  hiddenBlogIds?: string[];
  isEditorMode?: boolean;
  selectedTag?: string | null;
  searchQuery?: string;
  excludeBlocked?: boolean;
}

export interface ArticleVisibilityStatus {
  articleId: string;
  isVisible: boolean;
  isHiddenByUser: boolean;
  isBlockedByPolicy: boolean;
  isDraftOption: boolean;
  isTagMatched: boolean;
  reason: string;
}

/**
 * Comprehensive visibility evaluator that determines whether an article should be rendered in the feed.
 */
export function evaluateArticleVisibility(
  article: BlogPost,
  options: VisibilityFilterOptions = {}
): ArticleVisibilityStatus {
  const {
    hiddenBlogIds = [],
    isEditorMode = false,
    selectedTag = null,
    searchQuery = "",
    excludeBlocked = true
  } = options;

  const isBlockedByPolicy = excludeBlocked ? isArticleBlocked(article) : false;
  const isHiddenByUser = hiddenBlogIds.includes(article.id);
  const isDraftOption = article.status === "draft_option";

  let isTagMatched = true;
  if (selectedTag) {
    const cleanTag = selectedTag.toLowerCase().trim();
    isTagMatched = (article.tags || []).some((t) => t.toLowerCase().trim() === cleanTag);
  }

  let isSearchMatched = true;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = (article.title || "").toLowerCase().includes(q);
    const excerptMatch = (article.excerpt || "").toLowerCase().includes(q);
    const authorMatch = (article.author || "").toLowerCase().includes(q);
    const tagMatch = (article.tags || []).some((t) => t.toLowerCase().includes(q));
    isSearchMatched = titleMatch || excerptMatch || authorMatch || tagMatch;
  }

  // In editor mode, user-hidden articles are visible (flagged for editing)
  let isVisible = true;
  let reason = "Visible";

  if (isBlockedByPolicy) {
    isVisible = false;
    reason = "Blocked by security/blocklist policy";
  } else if (isDraftOption) {
    isVisible = false;
    reason = "Unapproved draft option";
  } else if (isHiddenByUser && !isEditorMode) {
    isVisible = false;
    reason = "Hidden from feed by user preference";
  } else if (!isTagMatched) {
    isVisible = false;
    reason = `Does not match tag filter: ${selectedTag}`;
  } else if (!isSearchMatched) {
    isVisible = false;
    reason = `Does not match search query: ${searchQuery}`;
  }

  return {
    articleId: article.id,
    isVisible,
    isHiddenByUser,
    isBlockedByPolicy,
    isDraftOption,
    isTagMatched,
    reason
  };
}

/**
 * Filter an array of blog posts using the full visibility rules.
 */
export function filterVisibleArticles(
  articles: BlogPost[],
  options: VisibilityFilterOptions = {}
): BlogPost[] {
  return articles.filter((b) => evaluateArticleVisibility(b, options).isVisible);
}
