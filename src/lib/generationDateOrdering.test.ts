import test from "node:test";
import assert from "node:assert";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";
import {
  getBlogTimestamp,
  parsePublicationDate,
  sortBlogsByPublicationDate,
  filterBlogsByDateRange
} from "./viewCounter";

test("getBlogTimestamp correctly resolves generation timestamp from all priority sources", () => {
  // 1. Explicit createdAt (highest priority)
  const blogWithCreatedAt = {
    id: "generated-1600000000000",
    createdAt: 1787570999000,
    timestamp: 1650000000000,
    date: "2026-08-01"
  };
  assert.strictEqual(getBlogTimestamp(blogWithCreatedAt), 1787570999000);

  // 2. Explicit timestamp field
  const blogWithTimestamp = {
    id: "blog-123",
    timestamp: 1787570888000,
    date: "2026-08-01"
  };
  assert.strictEqual(getBlogTimestamp(blogWithTimestamp), 1787570888000);

  // 3. ID-embedded timestamp pattern: generated-<timestamp>
  const blogWithGeneratedId = {
    id: "generated-1787570419854",
    date: "2026-08-30"
  };
  assert.strictEqual(getBlogTimestamp(blogWithGeneratedId), 1787570419854);

  // 4. ID-embedded timestamp pattern: draft-<timestamp>
  const blogWithDraftId = {
    id: "draft-1787560000123",
    date: "2026-08-29"
  };
  assert.strictEqual(getBlogTimestamp(blogWithDraftId), 1787560000123);

  // 5. Standard date string fallback
  const blogWithDate = {
    id: "custom-article-without-id-timestamp",
    date: "August 28, 2026"
  };
  const expectedDateTs = new Date("2026-08-28T00:00:00.000Z").getTime();
  assert.strictEqual(getBlogTimestamp(blogWithDate), expectedDateTs);

  // 6. Missing or invalid date fallback
  assert.strictEqual(getBlogTimestamp({ id: "unknown" }), 0);
  assert.strictEqual(getBlogTimestamp({}), 0);
});

test("sortBlogsByPublicationDate orders articles strictly in descending order of generation date", () => {
  const articles: BlogPost[] = [
    {
      id: "older-article-1",
      title: "Older Paper May 2026",
      slug: "older-paper",
      date: "May 4, 2026",
      excerpt: "...",
      content: "...",
      author: "Author A",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2605.00001",
      tags: ["Optics"]
    },
    {
      id: "generated-1787570419854", // 2026-08-30 generation timestamp
      title: "Generated Article August 30",
      slug: "generated-august-30",
      date: "August 30, 2026",
      excerpt: "...",
      content: "...",
      author: "Author B",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2608.00002",
      tags: ["Quantum"]
    },
    {
      id: "mid-article-2",
      title: "Middle Paper July 2026",
      slug: "middle-paper",
      date: "July 15, 2026",
      excerpt: "...",
      content: "...",
      author: "Author C",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2607.00003",
      tags: ["AI"]
    },
    {
      id: "brand-new-generated-1787580000000", // even newer timestamp
      title: "Brand New Generated Paper",
      slug: "brand-new-paper",
      date: "August 31, 2026",
      excerpt: "...",
      content: "...",
      author: "Author D",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2608.00004",
      tags: ["Physics"]
    }
  ];

  const sorted = sortBlogsByPublicationDate(articles, "desc");

  // Invariant: every element at index i must have timestamp >= element at index i + 1
  for (let i = 0; i < sorted.length - 1; i++) {
    const tsCurrent = getBlogTimestamp(sorted[i]);
    const tsNext = getBlogTimestamp(sorted[i + 1]);
    assert.ok(
      tsCurrent >= tsNext,
      `Expected sorted[${i}] (ts: ${tsCurrent}) >= sorted[${i + 1}] (ts: ${tsNext})`
    );
  }

  assert.strictEqual(sorted[0].id, "brand-new-generated-1787580000000");
  assert.strictEqual(sorted[1].id, "generated-1787570419854");
  assert.strictEqual(sorted[2].id, "mid-article-2");
  assert.strictEqual(sorted[3].id, "older-article-1");
});

test("sortBlogsByPublicationDate tie-breaks identical generation timestamps alphabetically by title", () => {
  const sameDateArticles: BlogPost[] = [
    {
      id: "art-z",
      title: "Zeta Function Waveguides",
      slug: "zeta-waveguides",
      date: "August 30, 2026",
      excerpt: "...",
      content: "...",
      author: "Author",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2608.10001",
      tags: ["Physics"]
    },
    {
      id: "art-a",
      title: "Alpha Centauri Metasurfaces",
      slug: "alpha-metasurfaces",
      date: "August 30, 2026",
      excerpt: "...",
      content: "...",
      author: "Author",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2608.10002",
      tags: ["Optics"]
    },
    {
      id: "art-b",
      title: "Beta Decay Polaritons",
      slug: "beta-polaritons",
      date: "August 30, 2026",
      excerpt: "...",
      content: "...",
      author: "Author",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2608.10003",
      tags: ["Quantum"]
    }
  ];

  const sorted = sortBlogsByPublicationDate(sameDateArticles, "desc");

  assert.strictEqual(sorted[0].title, "Alpha Centauri Metasurfaces");
  assert.strictEqual(sorted[1].title, "Beta Decay Polaritons");
  assert.strictEqual(sorted[2].title, "Zeta Function Waveguides");
});

test("Newly generated article dynamically prepends and sorts to position 0 (top of display list)", () => {
  const currentCatalog = [...PRELOADED_BLOGS];
  const sortedCatalog = sortBlogsByPublicationDate(currentCatalog, "desc");

  const newGeneratedBlog: BlogPost = {
    id: `generated-${Date.now() + 100000}`,
    title: "Breakthrough Discovery in Non-Hermitian Photonic Lattices",
    slug: "breakthrough-non-hermitian-photonic-lattices",
    date: "August 31, 2026",
    excerpt: "New dynamic synthesis article",
    content: "## Formulas\n$$\\mathcal{H} \\ne \\mathcal{H}^\\dagger$$",
    author: "Lucas Kempe",
    readingTime: "8 min read",
    bannerSvg: "<svg></svg>",
    arxivLink: "https://arxiv.org/abs/2608.99999",
    tags: ["Photonics", "Non-Hermitian"]
  };

  // Simulating state update in App.tsx: sortBlogsByPublicationDate([newBlog, ...prev])
  const updatedCatalog = sortBlogsByPublicationDate([
    newGeneratedBlog,
    ...sortedCatalog.filter(b => b.id !== newGeneratedBlog.id)
  ], "desc");

  assert.strictEqual(updatedCatalog[0].id, newGeneratedBlog.id);
  assert.strictEqual(updatedCatalog[0].title, newGeneratedBlog.title);
  assert.strictEqual(updatedCatalog.length, sortedCatalog.length + 1);
});

test("All PRELOADED_BLOGS verify monotonic non-increasing ordering when sorted by publication date", () => {
  const sorted = sortBlogsByPublicationDate(PRELOADED_BLOGS, "desc");

  assert.strictEqual(sorted.length, PRELOADED_BLOGS.length);

  for (let i = 0; i < sorted.length - 1; i++) {
    const tsA = getBlogTimestamp(sorted[i]);
    const tsB = getBlogTimestamp(sorted[i + 1]);
    assert.ok(
      tsA >= tsB,
      `PRELOADED_BLOGS sorting invariant broken at index ${i}: tsA (${tsA}) < tsB (${tsB}) for "${sorted[i].id}" vs "${sorted[i + 1].id}"`
    );
  }
});

test("filterBlogsByDateRange respects generation date boundaries", () => {
  const articles: BlogPost[] = [
    {
      id: "may-article",
      title: "May Article",
      slug: "may-article",
      date: "2026-05-10",
      excerpt: "...",
      content: "...",
      author: "A",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2605.00001",
      tags: []
    },
    {
      id: "july-article",
      title: "July Article",
      slug: "july-article",
      date: "2026-07-20",
      excerpt: "...",
      content: "...",
      author: "B",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2607.00001",
      tags: []
    },
    {
      id: "august-article",
      title: "August Article",
      slug: "august-article",
      date: "2026-08-30",
      excerpt: "...",
      content: "...",
      author: "C",
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2608.00001",
      tags: []
    }
  ];

  const filteredJuly = filterBlogsByDateRange(articles, "2026-07-01", "2026-07-31");
  assert.strictEqual(filteredJuly.length, 1);
  assert.strictEqual(filteredJuly[0].id, "july-article");

  const filteredSummer = filterBlogsByDateRange(articles, "2026-06-01", "2026-08-31");
  assert.strictEqual(filteredSummer.length, 2);
  assert.strictEqual(filteredSummer[0].id, "july-article");
  assert.strictEqual(filteredSummer[1].id, "august-article");
});
