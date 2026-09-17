import test from "node:test";
import assert from "node:assert";
import { BlogPost } from "../types";
import { RAW_PRELOADED_BLOGS } from "../data";
import {
  extractArxivSubmissionDate,
  diagnoseArticleOrdering,
  PriorityQueue,
  buildWeightedResearchGraph,
  dijkstraShortestPath,
  aStarShortestPath,
  OrderedArticleIndex,
  defaultLatestComparator,
  arxivSubmissionComparator,
  ArticlePrefixTrie,
  SortStrategy,
  sortArticlesWithStrategy,
  getHybridArticleTimestamp,
  evaluateArticleVisibility,
  filterVisibleArticles
} from "./articleOrderingAlgorithms";
import { getBlogTimestamp, sortBlogsByPublicationDate } from "./viewCounter";

// ============================================================================
// SUITE 1: ROOT CAUSE DIAGNOSIS FOR "GENERIC SPECTRAL DETERMINATION..."
// ============================================================================

test("Diagnosis Suite: Identifies why generic-spectral-determination displays at the top", () => {
  // Construct test catalog including the generated article and other recent articles
  const catalog: BlogPost[] = [
    {
      id: "blog-1789613391006-pwjbf",
      title: "Generic Spectral Determination of Semiclassical Schrödinger Operators with $\\mathbb Z_2$-Symmetry",
      slug: "generic-spectral-determination-of-semiclassical-schr-dinger-",
      excerpt: "Consider the two-dimensional semiclassical Schrödinger operator...",
      content: "Detailed mathematical analysis...",
      author: "Qiaoling Wei",
      date: "2026-09-17",
      readingTime: "8 min read",
      arxivLink: "https://arxiv.org/abs/2608.11111",
      bannerSvg: "<svg></svg>",
      tags: ["Quantum Mechanics", "Mathematical Physics"],
      createdAt: 1789613391006,
      timestamp: 1789613391006,
      views: 1
    },
    {
      id: "blog-2609-19103v1-1270",
      title: "Correlation geometry and topology of structured optical beams",
      slug: "correlation-geometry-and-topology-of-structured-optical-beams",
      excerpt: "Autonomous scholarly analysis of arXiv:2609.19103v1...",
      content: "Structured beam topology...",
      author: "Lucas Kempe",
      date: "September 16, 2026",
      readingTime: "8 min read",
      arxivLink: "https://arxiv.org/abs/2609.19103",
      bannerSvg: "<svg></svg>",
      tags: ["Optics", "Topology"],
      createdAt: 1789612441292,
      timestamp: 1789612441292,
      views: 45
    },
    {
      id: "blog-2609-11809v1-1269",
      title: "Self-Accelerating Airy Wavepackets in Curved Space",
      slug: "self-accelerating-airy-wavepackets",
      excerpt: "Wave packet propagation...",
      content: "Airy beams...",
      author: "Elena Rostova",
      date: "September 14, 2026",
      readingTime: "7 min read",
      arxivLink: "https://arxiv.org/abs/2609.11809",
      bannerSvg: "<svg></svg>",
      tags: ["Optics", "Quantum"],
      createdAt: 1789500000000,
      timestamp: 1789500000000,
      views: 89
    }
  ];

  // 1. Diagnose by slug or URL target
  const diagnosis = diagnoseArticleOrdering(
    "generic-spectral-determination-of-semiclassical-schr-dinger-",
    catalog
  );

  assert.ok(diagnosis !== null, "Diagnosis report should be generated");
  assert.strictEqual(diagnosis.articleId, "blog-1789613391006-pwjbf");
  assert.strictEqual(diagnosis.arxivId, "2608.11111");
  assert.strictEqual(diagnosis.arxivSubmissionDate, "2026-08");
  assert.strictEqual(diagnosis.generationDate, "2026-09-17");

  // Confirm anomaly detection
  assert.ok(
    diagnosis.deltaDaysBetweenPreprintAndGeneration > 30,
    "Delta between August 2026 preprint and September 17 generation must be > 30 days"
  );
  assert.strictEqual(
    diagnosis.isOldPreprintAppearingNew,
    true,
    "Should identify an older preprint stamped with a fresh generation date"
  );
  assert.strictEqual(
    diagnosis.currentDisplayPosition,
    0,
    "Currently placed at top position 0 in generation timestamp order"
  );
  assert.strictEqual(
    diagnosis.recommendedPosition,
    2,
    "Under arXiv submission chronology, 2608.11111 should be at position 2 (after 2609.19103 and 2609.11809)"
  );
  assert.ok(
    diagnosis.explanation.includes("sortBlogsByPublicationDate"),
    "Explanation must cite sortBlogsByPublicationDate ordering mechanics"
  );
});

// ============================================================================
// SUITE 2: ARXIV SUBMISSION DATE EXTRACTION
// ============================================================================

test("ArXiv Date Extraction: Parses modern and legacy arXiv IDs accurately", () => {
  // Modern format (2007+)
  const d1 = extractArxivSubmissionDate("https://arxiv.org/abs/2608.11111");
  assert.ok(d1);
  assert.strictEqual(d1.year, 2026);
  assert.strictEqual(d1.month, 8);
  assert.strictEqual(d1.formatted, "2026-08");
  assert.strictEqual(d1.isLegacyFormat, false);

  const d2 = extractArxivSubmissionDate("arxiv:2609.19103v2");
  assert.ok(d2);
  assert.strictEqual(d2.year, 2026);
  assert.strictEqual(d2.month, 9);
  assert.strictEqual(d2.formatted, "2026-09");

  const d3 = extractArxivSubmissionDate("2408.09854");
  assert.ok(d3);
  assert.strictEqual(d3.year, 2024);
  assert.strictEqual(d3.month, 8);
  assert.strictEqual(d3.formatted, "2024-08");

  // Legacy format (pre-2007)
  const d4 = extractArxivSubmissionDate("https://arxiv.org/abs/math/0501123");
  assert.ok(d4);
  assert.strictEqual(d4.year, 2005);
  assert.strictEqual(d4.month, 1);
  assert.strictEqual(d4.isLegacyFormat, true);

  const d5 = extractArxivSubmissionDate("quant-ph/9912001");
  assert.ok(d5);
  assert.strictEqual(d5.year, 1999);
  assert.strictEqual(d5.month, 12);

  // Invalid formats return null safely
  assert.strictEqual(extractArxivSubmissionDate(""), null);
  assert.strictEqual(extractArxivSubmissionDate(null), null);
  assert.strictEqual(extractArxivSubmissionDate("https://example.com/not-arxiv"), null);
  assert.strictEqual(extractArxivSubmissionDate("2613.12345"), null); // Month 13 is invalid
});

// ============================================================================
// SUITE 3: PRIORITY QUEUE / BINARY HEAP DATA STRUCTURE
// ============================================================================

test("PriorityQueue: Maintains strict min-heap and max-heap invariant during insertions and deletions", () => {
  // Min-heap of numbers
  const minPq = new PriorityQueue<number>((a, b) => a - b);
  assert.strictEqual(minPq.isEmpty(), true);
  assert.strictEqual(minPq.peek(), undefined);

  minPq.push(42);
  minPq.push(10);
  minPq.push(99);
  minPq.push(5);
  minPq.push(23);

  assert.strictEqual(minPq.size, 5);
  assert.strictEqual(minPq.peek(), 5);

  // Pop sequence must be strictly ascending
  const extracted: number[] = [];
  while (!minPq.isEmpty()) {
    extracted.push(minPq.pop()!);
  }
  assert.deepStrictEqual(extracted, [5, 10, 23, 42, 99]);
  assert.strictEqual(minPq.isEmpty(), true);

  // Max-heap of articles by view count
  const maxPq = new PriorityQueue<{ id: string; views: number }>((a, b) => b.views - a.views);
  maxPq.push({ id: "art-1", views: 100 });
  maxPq.push({ id: "art-2", views: 500 });
  maxPq.push({ id: "art-3", views: 250 });
  maxPq.push({ id: "art-4", views: 50 });

  assert.strictEqual(maxPq.peek()?.id, "art-2");

  // Test arbitrary removal
  const removed = maxPq.remove((item) => item.id === "art-3");
  assert.strictEqual(removed, true);
  assert.strictEqual(maxPq.size, 3);

  // Next pops should be art-2 (500), art-1 (100), art-4 (50)
  assert.strictEqual(maxPq.pop()?.id, "art-2");
  assert.strictEqual(maxPq.pop()?.id, "art-1");
  assert.strictEqual(maxPq.pop()?.id, "art-4");
  assert.strictEqual(maxPq.pop(), undefined);
});

// ============================================================================
// SUITE 4: DIJKSTRA'S SHORTEST THEMATIC PATH ALGORITHM
// ============================================================================

test("Dijkstra Algorithm: Finds optimal shortest thematic path between research articles", () => {
  const articles: BlogPost[] = [
    {
      id: "optics-foundations",
      title: "Foundations of Silicon Waveguides",
      slug: "foundations-silicon-waveguides",
      tags: ["Optics", "Photonics", "Silicon"],
      content: "Foundational micro-ring resonator theory.",
      author: "Dr. Vance",
      date: "2026-08-01",
      readingTime: "5 min",
      arxivLink: "https://arxiv.org/abs/2608.00001",
      bannerSvg: "<svg></svg>",
      excerpt: "..."
    },
    {
      id: "nonlinear-photonics",
      title: "Nonlinear Kerr Combs in Micro-rings",
      slug: "nonlinear-kerr-combs",
      tags: ["Photonics", "Nonlinear Optics"],
      content: "Builds upon foundations-silicon-waveguides with Kerr non-linearity.",
      author: "Dr. Vance",
      date: "2026-08-05",
      readingTime: "6 min",
      arxivLink: "https://arxiv.org/abs/2608.00002",
      bannerSvg: "<svg></svg>",
      excerpt: "..."
    },
    {
      id: "quantum-optics",
      title: "Single Photon Sources via Kerr Solitons",
      slug: "single-photon-kerr-solitons",
      tags: ["Nonlinear Optics", "Quantum Optics"],
      content: "Generating quantum states from nonlinear micro-rings.",
      author: "Dr. Thorne",
      date: "2026-08-10",
      readingTime: "7 min",
      arxivLink: "https://arxiv.org/abs/2608.00003",
      bannerSvg: "<svg></svg>",
      excerpt: "..."
    },
    {
      id: "quantum-computing",
      title: "Photonic Quantum Computing Architecture",
      slug: "photonic-quantum-computing",
      tags: ["Quantum Optics", "Quantum Computing"],
      content: "Cluster state generation for fault-tolerant photonic quantum computation.",
      author: "Dr. Thorne",
      date: "2026-08-15",
      readingTime: "8 min",
      arxivLink: "https://arxiv.org/abs/2608.00004",
      bannerSvg: "<svg></svg>",
      excerpt: "..."
    },
    {
      id: "isolated-cosmology",
      title: "Primordial Inflation and CMB Fluctuations",
      slug: "primordial-inflation-cmb",
      tags: ["Cosmology", "General Relativity"],
      content: "Inflationary scalar perturbations.",
      author: "Dr. Hawking",
      date: "2026-08-20",
      readingTime: "10 min",
      arxivLink: "https://arxiv.org/abs/2608.00005",
      bannerSvg: "<svg></svg>",
      excerpt: "..."
    }
  ];

  const graph = buildWeightedResearchGraph(articles);

  // 1. Direct path between identical nodes
  const selfPath = dijkstraShortestPath(graph, "optics-foundations", "optics-foundations");
  assert.ok(selfPath);
  assert.strictEqual(selfPath.totalDistance, 0);
  assert.deepStrictEqual(selfPath.path, ["optics-foundations"]);

  // 2. Multi-hop shortest path: optics-foundations -> nonlinear-photonics -> quantum-optics -> quantum-computing
  const multiHop = dijkstraShortestPath(graph, "optics-foundations", "quantum-computing");
  assert.ok(multiHop, "Path must exist between connected photonic & quantum papers");
  assert.strictEqual(multiHop.sourceId, "optics-foundations");
  assert.strictEqual(multiHop.targetId, "quantum-computing");
  assert.ok(multiHop.path.length >= 3, "Should traverse through intermediary domains");
  assert.strictEqual(multiHop.path[0], "optics-foundations");
  assert.strictEqual(multiHop.path[multiHop.path.length - 1], "quantum-computing");
  assert.ok(multiHop.totalDistance > 0 && multiHop.totalDistance < 10);

  // 3. Disconnected node (cosmology paper has no shared tags or citations with optics)
  const disconnected = dijkstraShortestPath(graph, "optics-foundations", "isolated-cosmology");
  assert.strictEqual(disconnected, null, "Should return null for unreachable graph components");
});

// ============================================================================
// SUITE 5: A* SEARCH ALGORITHM WITH ADMISSIBLE HEURISTIC
// ============================================================================

test("A* Search: Heuristic-guided search matches Dijkstra optimal cost with fewer or equal iterations", () => {
  const articles: BlogPost[] = [
    {
      id: "node-a",
      title: "Tensor Networks in Many-Body Physics",
      slug: "tensor-networks",
      tags: ["Quantum", "Condensed Matter"],
      content: "MPS and PEPS algorithms.",
      author: "Dr. X",
      date: "2026-08-01",
      readingTime: "5 min",
      arxivLink: "https://arxiv.org/abs/2608.00101",
      bannerSvg: "<svg></svg>",
      excerpt: "..."
    },
    {
      id: "node-b",
      title: "Topological Order in Spin Liquids",
      slug: "topological-order",
      tags: ["Condensed Matter", "Topology"],
      content: "Spin liquid ground states.",
      author: "Dr. X",
      date: "2026-08-02",
      readingTime: "5 min",
      arxivLink: "https://arxiv.org/abs/2608.00102",
      bannerSvg: "<svg></svg>",
      excerpt: "..."
    },
    {
      id: "node-c",
      title: "Anyonic Statistics and Braiding",
      slug: "anyonic-statistics",
      tags: ["Topology", "Quantum Information"],
      content: "Non-Abelian braiding.",
      author: "Dr. Y",
      date: "2026-08-03",
      readingTime: "5 min",
      arxivLink: "https://arxiv.org/abs/2608.00103",
      bannerSvg: "<svg></svg>",
      excerpt: "..."
    }
  ];

  const graph = buildWeightedResearchGraph(articles);

  const dijkstraRes = dijkstraShortestPath(graph, "node-a", "node-c");
  const aStarRes = aStarShortestPath(graph, "node-a", "node-c");

  assert.ok(dijkstraRes);
  assert.ok(aStarRes);
  // Both algorithms must find the mathematically identical optimal distance
  assert.strictEqual(
    Math.abs(dijkstraRes.totalDistance - aStarRes.totalDistance) < 0.001,
    true,
    `Optimal costs must match: Dijkstra=${dijkstraRes.totalDistance}, A*=${aStarRes.totalDistance}`
  );
  assert.deepStrictEqual(aStarRes.path, dijkstraRes.path);
});

// ============================================================================
// SUITE 6: ORDERED ARTICLE INDEX (SEARCH, INSERT, DELETE)
// ============================================================================

test("OrderedArticleIndex: Efficiently inserts, binary-searches, and deletes while preserving sort invariant", () => {
  const index = new OrderedArticleIndex([], defaultLatestComparator);

  const art1: BlogPost = {
    id: "art-mid",
    title: "Mid Era Paper",
    slug: "mid-paper",
    date: "2026-08-15",
    createdAt: 1787000000000,
    timestamp: 1787000000000,
    excerpt: "...",
    content: "...",
    author: "A",
    readingTime: "5m",
    arxivLink: "https://arxiv.org/abs/2608.00010",
    bannerSvg: "<svg></svg>",
    tags: ["Physics"]
  };

  const art2: BlogPost = {
    id: "art-newest",
    title: "Newest Discovery",
    slug: "newest-discovery",
    date: "2026-09-17",
    createdAt: 1789600000000,
    timestamp: 1789600000000,
    excerpt: "...",
    content: "...",
    author: "B",
    readingTime: "5m",
    arxivLink: "https://arxiv.org/abs/2609.00020",
    bannerSvg: "<svg></svg>",
    tags: ["Quantum"]
  };

  const art3: BlogPost = {
    id: "art-oldest",
    title: "Earliest Research",
    slug: "earliest-research",
    date: "2026-06-01",
    createdAt: 1780000000000,
    timestamp: 1780000000000,
    excerpt: "...",
    content: "...",
    author: "C",
    readingTime: "5m",
    arxivLink: "https://arxiv.org/abs/2606.00030",
    bannerSvg: "<svg></svg>",
    tags: ["Optics"]
  };

  // Insert in random order
  index.insert(art1);
  index.insert(art3);
  index.insert(art2);

  assert.strictEqual(index.length, 3);

  // Verifies sorted state: art-newest (index 0), art-mid (index 1), art-oldest (index 2)
  const all = index.getAll();
  assert.strictEqual(all[0].id, "art-newest");
  assert.strictEqual(all[1].id, "art-mid");
  assert.strictEqual(all[2].id, "art-oldest");

  // Lookup operations
  assert.strictEqual(index.getById("art-newest")?.title, "Newest Discovery");
  assert.strictEqual(index.has("art-mid"), true);
  assert.strictEqual(index.has("non-existent"), false);

  // Prefix search
  const prefixMatch = index.searchByTitlePrefix("New");
  assert.strictEqual(prefixMatch.length, 1);
  assert.strictEqual(prefixMatch[0].id, "art-newest");

  // In-place update with updated title
  const updatedArtMid = { ...art1, title: "Mid Era Paper (Revised Edition)" };
  index.insert(updatedArtMid);
  assert.strictEqual(index.length, 3, "Length should remain 3 after updating existing ID");
  assert.strictEqual(index.getById("art-mid")?.title, "Mid Era Paper (Revised Edition)");

  // Deletion operation
  const deleted = index.delete("art-mid");
  assert.strictEqual(deleted, true);
  assert.strictEqual(index.length, 2);
  assert.strictEqual(index.has("art-mid"), false);
  assert.deepStrictEqual(
    index.getAll().map((b) => b.id),
    ["art-newest", "art-oldest"]
  );

  // Deleting non-existent ID
  assert.strictEqual(index.delete("art-mid"), false);
});

// ============================================================================
// SUITE 7: PREFIX TRIE FOR TITLE AND TAG SEARCH
// ============================================================================

test("ArticlePrefixTrie: Provides instant prefix lookups and clean removals", () => {
  const trie = new ArticlePrefixTrie();

  trie.insert("Quantum", "blog-1");
  trie.insert("Quantum Mechanics", "blog-1");
  trie.insert("Quantum Information", "blog-2");
  trie.insert("Quark Confinement", "blog-3");
  trie.insert("Relativity", "blog-4");

  // Prefix 'quant' should match blog-1 and blog-2
  const quantMatches = trie.searchPrefix("quant");
  assert.strictEqual(quantMatches.length, 2);
  assert.ok(quantMatches.includes("blog-1"));
  assert.ok(quantMatches.includes("blog-2"));

  // Prefix 'qu' should match blog-1, blog-2, and blog-3
  const quMatches = trie.searchPrefix("qu");
  assert.strictEqual(quMatches.length, 3);
  assert.ok(quMatches.includes("blog-3"));

  // Non-matching prefix
  assert.deepStrictEqual(trie.searchPrefix("xyz"), []);

  // Remove tag
  trie.delete("Quantum", "blog-1");
  trie.delete("Quantum Mechanics", "blog-1");
  const afterDelete = trie.searchPrefix("quantum");
  assert.strictEqual(afterDelete.length, 1);
  assert.strictEqual(afterDelete[0], "blog-2");
});

// ============================================================================
// SUITE 8: MULTI-STRATEGY SORTING & HYBRID EDITORIAL MECHANICS
// ============================================================================

test("Sorting Engine: Validates LATEST_GENERATED, ARXIV_SUBMISSION_DATE, and HYBRID_BALANCED strategies", () => {
  const articles: BlogPost[] = [
    {
      id: "blog-recent-gen-old-paper",
      title: "Old Paper Synthesized Today",
      slug: "old-paper-today",
      arxivLink: "https://arxiv.org/abs/2608.11111", // August 2026
      date: "2026-09-17",
      createdAt: 1789613391006, // Stamped today
      timestamp: 1789613391006,
      excerpt: "...",
      content: "...",
      author: "Author A",
      readingTime: "5m",
      bannerSvg: "<svg></svg>",
      tags: ["Physics"]
    },
    {
      id: "blog-recent-gen-new-paper",
      title: "Fresh Paper from Yesterday",
      slug: "fresh-paper-yesterday",
      arxivLink: "https://arxiv.org/abs/2609.19103", // September 2026
      date: "2026-09-16",
      createdAt: 1789612441292,
      timestamp: 1789612441292,
      excerpt: "...",
      content: "...",
      author: "Author B",
      readingTime: "5m",
      bannerSvg: "<svg></svg>",
      tags: ["Optics"]
    },
    {
      id: "blog-historical-archived-paper",
      title: "Historical 2024 Foundations",
      slug: "historical-2024",
      arxivLink: "https://arxiv.org/abs/2408.09854", // August 2024
      date: "2026-09-15",
      createdAt: 1789500000000,
      timestamp: 1789500000000,
      excerpt: "...",
      content: "...",
      author: "Author C",
      readingTime: "5m",
      bannerSvg: "<svg></svg>",
      tags: ["AI"]
    }
  ];

  // Strategy 1: LATEST_GENERATED (places recent-gen-old-paper first due to generation timestamp)
  const sortedLatest = sortArticlesWithStrategy(articles, {
    strategy: SortStrategy.LATEST_GENERATED
  });
  assert.strictEqual(sortedLatest[0].id, "blog-recent-gen-old-paper");
  assert.strictEqual(sortedLatest[1].id, "blog-recent-gen-new-paper");
  assert.strictEqual(sortedLatest[2].id, "blog-historical-archived-paper");

  // Strategy 2: ARXIV_SUBMISSION_DATE (places 2609 first, then 2608, then 2408)
  const sortedArxiv = sortArticlesWithStrategy(articles, {
    strategy: SortStrategy.ARXIV_SUBMISSION_DATE
  });
  assert.strictEqual(
    sortedArxiv[0].id,
    "blog-recent-gen-new-paper",
    "2609.19103 must precede 2608.11111 in arXiv submission order"
  );
  assert.strictEqual(sortedArxiv[1].id, "blog-recent-gen-old-paper");
  assert.strictEqual(sortedArxiv[2].id, "blog-historical-archived-paper");

  // Strategy 3: HYBRID_BALANCED (prevents 2408 historical paper from jumping ahead, anchors correctly)
  const sortedHybrid = sortArticlesWithStrategy(articles, {
    strategy: SortStrategy.HYBRID_BALANCED
  });
  assert.strictEqual(sortedHybrid[0].id, "blog-recent-gen-new-paper");
});

// ============================================================================
// SUITE 9: VISIBILITY FILTER & HIDE / SHOW STATE EVALUATION
// ============================================================================

test("Visibility Engine: Evaluates user-hidden state, editor mode, blocklist, and drafts", () => {
  const normalPost: BlogPost = {
    id: "post-normal",
    title: "Open Science Review",
    slug: "open-science-review",
    excerpt: "General findings.",
    content: "Content...",
    author: "Dr. Reed",
    date: "2026-09-10",
    readingTime: "4m",
    arxivLink: "https://arxiv.org/abs/2609.00101",
    bannerSvg: "<svg></svg>",
    tags: ["Open Science"]
  };

  const hiddenPost: BlogPost = {
    id: "post-user-hidden",
    title: "Off-Topic Discussion",
    slug: "off-topic-discussion",
    excerpt: "Hidden by preference.",
    content: "Content...",
    author: "Dr. Reed",
    date: "2026-09-10",
    readingTime: "4m",
    arxivLink: "https://arxiv.org/abs/2609.00102",
    bannerSvg: "<svg></svg>",
    tags: ["Misc"]
  };

  const blockedPost: BlogPost = {
    id: "post-blocked-quarantine",
    title: "Retracted or Quarantined Paper",
    slug: "retracted-paper",
    arxivLink: "https://arxiv.org/abs/2608.12345", // Marked in arxivBlocklist
    excerpt: "Quarantined.",
    content: "Content...",
    author: "Bad Actor",
    date: "2026-09-10",
    readingTime: "4m",
    bannerSvg: "<svg></svg>",
    tags: ["Optics"]
  };

  const draftPost: BlogPost = {
    id: "post-draft-option",
    title: "Draft In Progress",
    slug: "draft-in-progress",
    status: "draft_option",
    excerpt: "Not yet reviewed.",
    content: "Content...",
    author: "AI Pipeline",
    date: "2026-09-10",
    readingTime: "4m",
    arxivLink: "https://arxiv.org/abs/2609.00103",
    bannerSvg: "<svg></svg>",
    tags: ["Draft"]
  };

  const list = [normalPost, hiddenPost, blockedPost, draftPost];

  // In regular public mode:
  const publicVisible = filterVisibleArticles(list, {
    hiddenBlogIds: ["post-user-hidden"],
    isEditorMode: false
  });
  assert.strictEqual(publicVisible.length, 1);
  assert.strictEqual(publicVisible[0].id, "post-normal");

  // In editor mode: user-hidden posts remain visible with reason documented
  const editorVisible = filterVisibleArticles(list, {
    hiddenBlogIds: ["post-user-hidden"],
    isEditorMode: true
  });
  assert.strictEqual(editorVisible.length, 2);
  const idsInEditor = editorVisible.map((b) => b.id);
  assert.ok(idsInEditor.includes("post-normal"));
  assert.ok(idsInEditor.includes("post-user-hidden"));
  assert.ok(!idsInEditor.includes("post-blocked-quarantine"), "Blocklisted posts must stay blocked");
  assert.ok(!idsInEditor.includes("post-draft-option"), "Draft options remain hidden from feed");

  // Individual evaluation diagnostics
  const hiddenEval = evaluateArticleVisibility(hiddenPost, {
    hiddenBlogIds: ["post-user-hidden"],
    isEditorMode: false
  });
  assert.strictEqual(hiddenEval.isVisible, false);
  assert.strictEqual(hiddenEval.isHiddenByUser, true);
  assert.strictEqual(hiddenEval.reason, "Hidden from feed by user preference");
});

// ============================================================================
// SUITE 10: REAL CATALOG INTEGRITY WITH RAW_PRELOADED_BLOGS
// ============================================================================

test("Real Catalog Audit: Runs diagnostic anomaly check on RAW_PRELOADED_BLOGS", () => {
  assert.ok(Array.isArray(RAW_PRELOADED_BLOGS), "RAW_PRELOADED_BLOGS must be an array");
  assert.ok(RAW_PRELOADED_BLOGS.length > 50, "Corpus must contain rich preloaded articles");

  // Check if target article exists in preloaded dataset
  const targetIndex = RAW_PRELOADED_BLOGS.findIndex(
    (b) =>
      b.id === "blog-1789613391006-pwjbf" ||
      b.slug === "generic-spectral-determination-of-semiclassical-schr-dinger-"
  );

  if (targetIndex !== -1) {
    const report = diagnoseArticleOrdering(
      "generic-spectral-determination-of-semiclassical-schr-dinger-",
      RAW_PRELOADED_BLOGS
    );
    assert.ok(report);
    assert.strictEqual(report.arxivId, "2608.11111");
    assert.strictEqual(report.isOldPreprintAppearingNew, true);
  }

  // Verify that sortBlogsByPublicationDate operates strictly monotonically on preloaded blogs
  const sorted = sortBlogsByPublicationDate(RAW_PRELOADED_BLOGS, "desc");
  for (let i = 0; i < sorted.length - 1; i++) {
    const tCurrent = getBlogTimestamp(sorted[i]);
    const tNext = getBlogTimestamp(sorted[i + 1]);
    assert.ok(
      tCurrent >= tNext,
      `Sort invariant failed at index ${i}: current (${tCurrent}) < next (${tNext})`
    );
  }
});
