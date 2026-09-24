import { test } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { getSourceArxivBatch } from "./dailyEditorialEngine";
import { createClientSideFallbackArticle } from "./arxivInjectionUtils";
import { generateCorpusBannerSvg } from "./corpusBannerAlgorithm";
import { PRELOADED_BLOGS } from "../data";

test("Monday arXiv preprints scheduling rule", () => {
  // Monday is day 1 of the week
  const mondayBatch = getSourceArxivBatch(1);
  assert.strictEqual(
    mondayBatch.sourceBatchName,
    "Monday arXiv preprints",
    "Monday must draw from Monday arXiv preprints, not Friday weekend bridge"
  );
  assert.ok(
    mondayBatch.note.includes("Published on Monday from Monday's"),
    "Note must reflect Monday publication from Monday announcements"
  );

  // Weekends must bridge to Monday
  const saturdayBatch = getSourceArxivBatch(6);
  const sundayBatch = getSourceArxivBatch(0);
  assert.strictEqual(saturdayBatch.sourceBatchName, "Weekend bridge to Monday");
  assert.strictEqual(sundayBatch.sourceBatchName, "Weekend bridge to Monday");
});

test("isEditorEdition integrity: Weekday arXiv dispatches MUST NOT be Editor's Choice", () => {
  // Test synthesized arXiv paper record
  const mockTarget = {
    id: "blog-target",
    title: "Old Title",
    excerpt: "Old Excerpt",
    content: "Old Content",
    readingTime: "5 min read",
    date: "Sep 14, 2026",
    arxivLink: "https://arxiv.org/abs/2609.13109",
    bannerSvg: "<svg></svg>",
    author: "Meridian Research",
    tags: ["Optics"],
    slug: "target-slug"
  };

  const synthesized = createClientSideFallbackArticle(
    mockTarget,
    {
      title: "Unified light-matter metric of molecular and nanophotonic chirality",
      summary: "Abstract text...",
      authors: "Kevin N. Moser, Marc R. Bourgeois, David J. Masiello",
      arxivLink: "https://arxiv.org/abs/2609.13109"
    },
    "2609.13109"
  );

  assert.strictEqual(
    synthesized.isEditorEdition,
    false,
    "Daily weekday arXiv preprints must have isEditorEdition: false"
  );

  // Test SVG banner generation for a weekday preprint
  const svg = generateCorpusBannerSvg(
    {
      id: "blog-2609-13109-8421",
      title: "Unified light-matter metric of molecular and nanophotonic chirality",
      tags: ["Optics", "Chirality", "Nanophotonics"],
      isEditorEdition: false
    },
    []
  );

  assert.ok(
    !svg.includes("EDITOR'S SPECIAL EDITION"),
    "Weekday banner SVG must NEVER include 'EDITOR'S SPECIAL EDITION'"
  );
});

test("Corpus Sanitization: Disputed Friday & Hallucinated articles must be completely absent", () => {
  // Check in-memory preloaded blogs
  const has11809 = PRELOADED_BLOGS.some(
    (b) =>
      b.id.includes("11809") ||
      b.title.toLowerCase().includes("metallo-dielectric") ||
      (b.slug && b.slug.includes("11809"))
  );
  assert.strictEqual(
    has11809,
    false,
    "arXiv:2609.11809 (Designing metallo-dielectric antennas) must NOT exist in preloadedBlogs"
  );

  const has11042 = PRELOADED_BLOGS.some(
    (b) =>
      b.id.includes("11042") ||
      b.title.toLowerCase().includes("nonlinear topological waveguiding") ||
      (b.slug && b.slug.includes("11042"))
  );
  assert.strictEqual(
    has11042,
    false,
    "arXiv:2609.11042 (Nonlinear Topological Waveguiding) must NOT exist in preloadedBlogs"
  );

  // Check custom_blogs.json on disk
  const diskBlogs = JSON.parse(fs.readFileSync(path.join(process.cwd(), "custom_blogs.json"), "utf-8"));
  const diskHas11809 = diskBlogs.some(
    (b: any) =>
      b.id?.includes("11809") ||
      b.title?.toLowerCase().includes("metallo-dielectric") ||
      b.slug?.includes("11809")
  );
  assert.strictEqual(diskHas11809, false, "custom_blogs.json must NOT contain 11809");

  const diskHas11042 = diskBlogs.some(
    (b: any) =>
      b.id?.includes("11042") ||
      b.title?.toLowerCase().includes("nonlinear topological waveguiding") ||
      b.slug?.includes("11042")
  );
  assert.strictEqual(diskHas11042, false, "custom_blogs.json must NOT contain 11042");

  // Check offline_blog_record
  const offlineRecord = fs.readFileSync(path.join(process.cwd(), "offline_blog_record"), "utf-8");
  assert.ok(
    !offlineRecord.includes("Designing metallo-dielectric antennas"),
    "offline_blog_record must not contain Friday's metallo-dielectric paper"
  );
  assert.ok(
    !offlineRecord.includes("Nonlinear Topological Waveguiding"),
    "offline_blog_record must not contain Nonlinear Topological Waveguiding"
  );
  assert.ok(
    offlineRecord.includes("14/09/2026"),
    "offline_blog_record must contain Monday 14/09/2026 entry"
  );
  assert.ok(
    offlineRecord.includes("Unified light-matter metric of molecular and nanophotonic chirality"),
    "offline_blog_record must contain the genuine Monday paper title"
  );
});

test("Monday Sep 14, 2026 Lead Article Validation", () => {
  const leadBlog = PRELOADED_BLOGS.find((b) => b.id === "blog-2609-13109-8421");
  assert.ok(leadBlog, "Must find Monday Sep 14 blog 2609.13109");
  assert.strictEqual(
    leadBlog.id,
    "blog-2609-13109-8421",
    "Lead blog must be Monday paper 2609.13109"
  );
  assert.strictEqual(
    leadBlog.title,
    "Unified light-matter metric of molecular and nanophotonic chirality"
  );
  assert.strictEqual(leadBlog.date, "Sep 14, 2026");
  assert.strictEqual(
    leadBlog.isEditorEdition,
    false,
    "Monday lead paper must not be marked isEditorEdition: true"
  );
  assert.strictEqual(
    leadBlog.arxivLink,
    "https://arxiv.org/abs/2609.13109"
  );
  assert.ok(
    leadBlog.content.includes("Maxwell-Bloch") || leadBlog.content.includes("pseudoscalar"),
    "Content must contain theoretical electrodynamic formulations"
  );
});

test("arXiv Day Separation: Distinguishes Mon Sep 14 from Fri Sep 11", () => {
  // Synthetic sample representing arXiv listing HTML with multiple days
  const sampleHtml = `
    <h3>Mon, 14 Sep 2026 (showing 22 of 22 entries )</h3>
    <dl>
      <dt><a href="/abs/2609.13109">arXiv:2609.13109</a></dt>
      <dd>
        <div class="meta">
          <div class="list-title mathjax"><span class="descriptor">Title:</span>Unified light-matter metric of molecular and nanophotonic chirality</div>
          <div class="list-authors">Kevin N. Moser, Marc R. Bourgeois, David J. Masiello</div>
        </div>
      </dd>
    </dl>
    <h3>Fri, 11 Sep 2026 (showing 14 of 14 entries )</h3>
    <dl>
      <dt><a href="/abs/2609.11809">arXiv:2609.11809</a></dt>
      <dd>
        <div class="meta">
          <div class="list-title mathjax"><span class="descriptor">Title:</span>Designing metallo-dielectric antennas for cryogenic applications</div>
          <div class="list-authors">Siwei Luo, Tim Hebenstreit, Alexey Shkarin</div>
        </div>
      </dd>
    </dl>
  `;

  const daySections = sampleHtml.split(/<h3>/g).slice(1);
  assert.strictEqual(daySections.length, 2);

  // Monday section
  const mondaySection = daySections[0];
  assert.ok(mondaySection.includes("Mon, 14 Sep 2026"));
  assert.ok(mondaySection.includes("2609.13109"));
  assert.ok(!mondaySection.includes("2609.11809"));

  // Friday section
  const fridaySection = daySections[1];
  assert.ok(fridaySection.includes("Fri, 11 Sep 2026"));
  assert.ok(fridaySection.includes("2609.11809"));
  assert.ok(!fridaySection.includes("2609.13109"));
});
