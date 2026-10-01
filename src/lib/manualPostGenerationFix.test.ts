import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";
import { extractArxivId } from "./arxivUtils";
import { resolveBlogSlugOrId, extractArxivIdFromText, SLUG_LEGACY_ALIASES } from "./slugResolver";

const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");
const pubCustomBlogsPath = path.join(process.cwd(), "public", "custom_blogs.json");
const offlineRecordPath = path.join(process.cwd(), "offline_blog_record");
const functionsGenPath = path.join(process.cwd(), "functions", "api", "blog", "generate.ts");
const serverPath = path.join(process.cwd(), "server.ts");

test("Manual Post Generation Fix: 1. Extract arXiv ID from all URL variants and PDF paths", () => {
  const testCases = [
    { input: "https://arxiv.org/pdf/2609.35135", expected: "2609.35135" },
    { input: "https://arxiv.org/pdf/2609.35135.pdf", expected: "2609.35135" },
    { input: "https://arxiv.org/pdf/2609.35135v1.pdf", expected: "2609.35135" },
    { input: "https://arxiv.org/abs/2609.35135", expected: "2609.35135" },
    { input: "https://arxiv.org/abs/2609.35135v1", expected: "2609.35135" },
    { input: "arxiv:2609.35135", expected: "2609.35135" },
    { input: "2609.35135", expected: "2609.35135" },
    { input: "https://arxiv.org/pdf/hep-ex/0601234", expected: "hep-ex/0601234" }
  ];

  for (const { input, expected } of testCases) {
    const extracted = extractArxivId(input);
    assert.strictEqual(
      extracted,
      expected,
      `Failed to extract arXiv ID from ${input}: expected ${expected}, got ${extracted}`
    );
  }
});

test("Manual Post Generation Fix: 2. Zero raw URLs or 'Advanced Rigorous Analysis of https://' in catalog titles", () => {
  const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(customBlogsPath, "utf-8"));
  const pubBlogs: BlogPost[] = JSON.parse(fs.readFileSync(pubCustomBlogsPath, "utf-8"));

  const checkDataset = (articles: BlogPost[], name: string) => {
    for (const b of articles) {
      assert.ok(b.title, `Article ${b.id} must have a title in ${name}`);
      assert.ok(
        !b.title.includes("Advanced Rigorous Analysis of https"),
        `Article ${b.id} has forbidden title prefix 'Advanced Rigorous Analysis of https' in ${name}: "${b.title}"`
      );
      assert.ok(
        !b.title.includes("http://") && !b.title.includes("https://"),
        `Article ${b.id} title contains raw URL in ${name}: "${b.title}"`
      );
      assert.ok(
        !b.title.includes("arxiv.org"),
        `Article ${b.id} title contains raw domain name in ${name}: "${b.title}"`
      );

      // Check excerpt
      if (b.excerpt) {
        assert.ok(
          !b.excerpt.includes("Rigorous scholarly examination into http"),
          `Article ${b.id} excerpt contains raw URL in ${name}: "${b.excerpt}"`
        );
      }
    }
  };

  checkDataset(customBlogs, "custom_blogs.json");
  checkDataset(pubBlogs, "public/custom_blogs.json");
  checkDataset(PRELOADED_BLOGS, "PRELOADED_BLOGS");
});

test("Manual Post Generation Fix: 3. Zero canonical slugs starting with 'https-arxiv-org' or containing URL fragments", () => {
  const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(customBlogsPath, "utf-8"));

  for (const b of customBlogs) {
    assert.ok(b.slug, `Article ${b.id} must have a slug`);
    assert.ok(
      !b.slug.startsWith("https-") && !b.slug.startsWith("http-"),
      `Canonical slug must not start with http(s): "${b.slug}" in article "${b.title}"`
    );
    assert.ok(
      !b.slug.includes("arxiv-org"),
      `Canonical slug must not contain arxiv-org domain fragment: "${b.slug}"`
    );
  }
});

test("Manual Post Generation Fix: 4. Yesterday's Article (arXiv:2609.35135) is published for September 29, 2026", () => {
  const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(customBlogsPath, "utf-8"));
  
  const article35135 = customBlogs.find(b => 
    b.arxivLink?.includes("2609.35135") || 
    b.id.includes("35135") ||
    b.title.toLowerCase().includes("water cherenkov")
  );

  assert.ok(article35135, "Article for arXiv:2609.35135 must exist in custom_blogs.json");
  assert.strictEqual(
    article35135.date,
    "September 29, 2026",
    "Publication date must be yesterday: September 29, 2026"
  );
  assert.ok(
    article35135.title.includes("Muon Detection") && article35135.title.includes("Cherenkov"),
    `Title must reflect the true paper: "${article35135.title}"`
  );
  assert.ok(
    article35135.title.toLowerCase().includes("neutrino"),
    "Title must include 'Neutrino' to satisfy editorial mandate"
  );
  assert.ok(
    article35135.bannerSvg && article35135.bannerSvg.length > 500,
    "Must have a full SVG banner"
  );
  assert.ok(
    article35135.bannerSvg.includes("<svg") && article35135.bannerSvg.includes("</svg>"),
    "Banner must be valid SVG XML"
  );
  assert.ok(
    article35135.content.includes("Frank-Tamm") || article35135.content.includes("\\theta_c"),
    "Content must include Cherenkov mathematical formulation"
  );
});

test("Manual Post Generation Fix: 5. Legacy URL 'https-arxiv-org-pdf-2609-35135' seamlessly resolves via slugResolver", () => {
  const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(customBlogsPath, "utf-8"));

  // 1. Resolve direct legacy slug
  const resolvedDirect = resolveBlogSlugOrId("https-arxiv-org-pdf-2609-35135", customBlogs);
  assert.ok(resolvedDirect, "Must resolve legacy slug 'https-arxiv-org-pdf-2609-35135'");
  assert.ok(resolvedDirect.arxivLink.includes("2609.35135"));

  // 2. Resolve advanced analysis prefix
  const resolvedAdvanced = resolveBlogSlugOrId("advanced-rigorous-analysis-of-https-arxiv-org-pdf-2609-35135", customBlogs);
  assert.ok(resolvedAdvanced, "Must resolve 'advanced-rigorous-analysis-of-https-arxiv-org-pdf-2609-35135'");
  assert.strictEqual(resolvedAdvanced.id, resolvedDirect.id);

  // 3. Resolve bare arXiv ID
  const resolvedId = resolveBlogSlugOrId("2609.35135", customBlogs);
  assert.ok(resolvedId, "Must resolve bare arXiv ID '2609.35135'");
  assert.strictEqual(resolvedId.id, resolvedDirect.id);

  // 4. Resolve hyphenated arXiv ID
  const resolvedHyphen = resolveBlogSlugOrId("2609-35135", customBlogs);
  assert.ok(resolvedHyphen, "Must resolve hyphenated arXiv ID '2609-35135'");
  assert.strictEqual(resolvedHyphen.id, resolvedDirect.id);
});

test("Manual Post Generation Fix: 6. Cloudflare Edge Function (functions/api/blog/generate.ts) enforces metadata extraction", () => {
  const content = fs.readFileSync(functionsGenPath, "utf-8");

  // Must import or define extractArxivId
  assert.ok(content.includes("extractArxivId"), "Edge generator must implement extractArxivId");
  assert.ok(content.includes("fetchArxivPaperMetadata"), "Edge generator must fetch arXiv metadata");
  assert.ok(
    content.includes("export.arxiv.org") || content.includes("arxiv.org/abs"),
    "Edge generator must query arXiv endpoints"
  );

  // Must never fall back to raw URL in title
  assert.ok(
    !content.includes("let generatedTitle = `Advanced Rigorous Analysis of ${inputClean"),
    "Must not generate title containing raw inputClean URL"
  );
  assert.ok(
    !content.includes("excerpt: `Rigorous scholarly examination into ${inputClean}"),
    "Must not generate excerpt containing raw inputClean URL"
  );
});

test("Manual Post Generation Fix: 7. server.ts /api/blog/generate sanitizes titles and prevents raw URL leaks", () => {
  const serverSrc = fs.readFileSync(serverPath, "utf-8");

  assert.ok(
    serverSrc.includes("finalTitle.includes(\"http://\")") || serverSrc.includes("paperTitle.includes(\"http://\")"),
    "server.ts must sanitize paperTitle and finalTitle against HTTP URLs"
  );
  assert.ok(
    !serverSrc.includes('paperTitle = "Pasted Paper Analysis";\n      paperSummary = rawText.slice(0, 2000);\n      arxivLink = arxivInput || "https://arxiv.org";\n    } else if (!paperTitle) {\n      paperTitle = arxivInput;'),
    "server.ts must not assign raw arxivInput URL directly to paperTitle without sanitization"
  );
});

test("Manual Post Generation Fix: 8. offline_blog_record records September 29 as Muon Detection / Cherenkov article", () => {
  const recordContent = fs.readFileSync(offlineRecordPath, "utf-8");

  assert.ok(recordContent.includes("29/09/2026"), "offline_blog_record must contain 29/09/2026");
  assert.ok(
    recordContent.includes("29/09/2026\nMuon Detection and Direction Reconstruction"),
    "29/09/2026 must be logged with the Muon Detection / Cherenkov article title"
  );
  assert.ok(
    !recordContent.includes("https://arxiv.org/pdf/2609.35135"),
    "offline_blog_record must never contain raw URLs as titles"
  );
});

test("Manual Post Generation Fix: 9. extractArxivIdFromText parses hyphenated arXiv slugs in URLs", () => {
  assert.strictEqual(extractArxivIdFromText("https-arxiv-org-pdf-2609-35135"), "2609.35135");
  assert.strictEqual(extractArxivIdFromText("article-2609-35135v1"), "2609.35135v1");
  assert.strictEqual(extractArxivIdFromText("muon-detector-2609-35135"), "2609.35135");
});
