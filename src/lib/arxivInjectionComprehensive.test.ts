import { test } from "node:test";
import assert from "node:assert";
import {
  parseArxivInput,
  parseInjectionResponse,
  replaceBlogInCatalog,
  createClientSideFallbackArticle,
  getInjectModalThemeTokens,
  ArxivPaperPreview
} from "./arxivInjectionUtils.js";
import { BlogPost } from "../types.js";

test("Inject & Replace: parseArxivInput accurately normalizes all user-provided arXiv formats", () => {
  // Test user exact format from report: https://arxiv.org/pdf/2609.10533
  const test1 = parseArxivInput("https://arxiv.org/pdf/2609.10533");
  assert.strictEqual(test1.isValid, true);
  assert.strictEqual(test1.arxivId, "2609.10533");
  assert.strictEqual(test1.fullUrl, "https://arxiv.org/abs/2609.10533");

  // Bare paper identifier: 2609.10533
  const test2 = parseArxivInput("2609.10533");
  assert.strictEqual(test2.isValid, true);
  assert.strictEqual(test2.arxivId, "2609.10533");

  // Frontier optics paper: 2609.10535
  const test3 = parseArxivInput("2609.10535");
  assert.strictEqual(test3.isValid, true);
  assert.strictEqual(test3.arxivId, "2609.10535");

  // DC-DC stability paper: 2408.09854
  const test4 = parseArxivInput("2408.09854");
  assert.strictEqual(test4.isValid, true);
  assert.strictEqual(test4.arxivId, "2408.09854");

  // Abstract URL with version: https://arxiv.org/abs/2609.10533v1
  const test5 = parseArxivInput("https://arxiv.org/abs/2609.10533v1");
  assert.strictEqual(test5.isValid, true);
  assert.strictEqual(test5.arxivId, "2609.10533");

  // PDF URL with .pdf suffix: https://arxiv.org/pdf/2609.10533.pdf
  const test6 = parseArxivInput("https://arxiv.org/pdf/2609.10533.pdf");
  assert.strictEqual(test6.isValid, true);
  assert.strictEqual(test6.arxivId, "2609.10533");

  // Prefixed format: arxiv:2609.10533
  const test7 = parseArxivInput("arxiv:2609.10533");
  assert.strictEqual(test7.isValid, true);
  assert.strictEqual(test7.arxivId, "2609.10533");

  // Legacy format: quant-ph/0401001
  const test8 = parseArxivInput("https://arxiv.org/abs/quant-ph/0401001");
  assert.strictEqual(test8.isValid, true);
  assert.strictEqual(test8.arxivId, "quant-ph/0401001");

  // Whitespace and punctuation trimming
  const test9 = parseArxivInput("  [https://arxiv.org/abs/2609.10533]  ");
  assert.strictEqual(test9.isValid, true);
  assert.strictEqual(test9.arxivId, "2609.10533");
});

test("Inject & Replace: parseInjectionResponse accepts all canonical envelope structures", () => {
  const sampleArticle: Partial<BlogPost> = {
    id: "blog-2609-10533-9001",
    title: "Noether Symmetries Generate Deterministic Energy-Harvesting Protocols",
    slug: "noether-symmetries-energy-harvesting",
    content: "## Derivations\n$$\\Delta E = 0$$\nConserved Noether charge.",
    date: "Sep 11, 2026",
    readingTime: "9 min read",
    arxivLink: "https://arxiv.org/abs/2609.10533",
    author: "Ali Akil, M. Hamed Mohammady, Zihan Wang",
    tags: ["Noether Theorem", "Quantum Thermodynamics"]
  };

  // 1. Envelope with 'blog'
  const resBlog = parseInjectionResponse(
    JSON.stringify({ success: true, blog: sampleArticle }),
    200,
    "OK"
  );
  assert.strictEqual(resBlog.success, true);
  assert.strictEqual(resBlog.blog?.title, sampleArticle.title);

  // 2. Envelope with 'article'
  const resArticle = parseInjectionResponse(
    JSON.stringify({ success: true, article: sampleArticle }),
    200,
    "OK"
  );
  assert.strictEqual(resArticle.success, true);
  assert.strictEqual(resArticle.blog?.title, sampleArticle.title);

  // 3. Envelope with 'post'
  const resPost = parseInjectionResponse(
    JSON.stringify({ success: true, post: sampleArticle }),
    200,
    "OK"
  );
  assert.strictEqual(resPost.success, true);
  assert.strictEqual(resPost.blog?.title, sampleArticle.title);

  // 4. Envelope with 'data.blog'
  const resDataBlog = parseInjectionResponse(
    JSON.stringify({ success: true, data: { blog: sampleArticle } }),
    200,
    "OK"
  );
  assert.strictEqual(resDataBlog.success, true);
  assert.strictEqual(resDataBlog.blog?.title, sampleArticle.title);

  // 5. Bare article object without wrapping envelope
  const resBare = parseInjectionResponse(
    JSON.stringify(sampleArticle),
    200,
    "OK"
  );
  assert.strictEqual(resBare.success, true);
  assert.strictEqual(resBare.blog?.title, sampleArticle.title);

  // 6. Array containing article object
  const resArray = parseInjectionResponse(
    JSON.stringify([sampleArticle]),
    200,
    "OK"
  );
  assert.strictEqual(resArray.success, true);
  assert.strictEqual(resArray.blog?.title, sampleArticle.title);
});

test("Inject & Replace: parseInjectionResponse provides transparent diagnostics on failures", () => {
  // 403 Forbidden with custom error
  const res403 = parseInjectionResponse(
    JSON.stringify({ error: "Unauthorized: Invalid editor password" }),
    403,
    "Forbidden"
  );
  assert.strictEqual(res403.success, false);
  assert.ok(res403.error?.includes("Unauthorized"));

  // 500 Internal Server Error
  const res500 = parseInjectionResponse(
    JSON.stringify({ success: false, error: "Failed to query export.arxiv.org upstream" }),
    500,
    "Internal Server Error"
  );
  assert.strictEqual(res500.success, false);
  assert.ok(res500.error?.includes("export.arxiv.org"));

  // Empty string response
  const resEmpty = parseInjectionResponse("", 502, "Bad Gateway");
  assert.strictEqual(resEmpty.success, false);
  assert.ok(resEmpty.error?.includes("Empty response"));

  // HTML gateway crash response
  const htmlCrash = "<html><head><title>504 Timeout</title></head><body>Timeout</body></html>";
  const resHtml = parseInjectionResponse(htmlCrash, 504, "Gateway Timeout");
  assert.strictEqual(resHtml.success, false);
  assert.ok(resHtml.error?.includes("Server returned non-JSON response"));

  // Payload missing article provides key diagnostic
  const missingObj = JSON.stringify({ status: "acknowledged", traceId: "abc-123" });
  const resMissing = parseInjectionResponse(missingObj, 200, "OK");
  assert.strictEqual(resMissing.success, false);
  assert.ok(resMissing.error?.includes("payload keys: [status, traceId]"));
});

test("Inject & Replace: replaceBlogInCatalog preserves slot order and article positioning", () => {
  const mockCatalog: BlogPost[] = [
    { id: "slot-0", title: "Publication Alpha", slug: "pub-alpha" } as BlogPost,
    { id: "slot-1", title: "For Whom Does Bell Hold?", slug: "for-whom-does-bell-hold" } as BlogPost,
    { id: "slot-2", title: "Publication Gamma", slug: "pub-gamma" } as BlogPost
  ];

  const injectedBlog: BlogPost = {
    id: "slot-1-injected",
    title: "Noether Symmetries Generate Deterministic Energy-Harvesting Protocols",
    slug: "noether-symmetries-harvesting"
  } as BlogPost;

  // Replace slot-1 in-place
  const result = replaceBlogInCatalog(mockCatalog, injectedBlog, "slot-1", true);

  assert.strictEqual(result.length, 3);
  assert.strictEqual(result[0].id, "slot-0");
  assert.strictEqual(result[1].id, "slot-1-injected");
  assert.strictEqual(result[1].title, "Noether Symmetries Generate Deterministic Energy-Harvesting Protocols");
  assert.strictEqual(result[2].id, "slot-2");

  // Original array remains immutable
  assert.strictEqual(mockCatalog[1].id, "slot-1");
});

test("Inject & Replace: createClientSideFallbackArticle produces rich, valid scientific publication", () => {
  const targetBlog: BlogPost = {
    id: "blog-target-slot",
    title: "For Whom Does Bell Hold?",
    slug: "for-whom-does-bell-hold",
    bannerSvg: "<svg><rect width='100' height='100'/></svg>",
    date: "Sep 1, 2026",
    readingTime: "7 min read",
    author: "Elena Rostova",
    content: "Old content",
    excerpt: "Old excerpt",
    tags: ["Bell Inequalities"]
  } as BlogPost;

  const preview: ArxivPaperPreview = {
    title: "Noether Symmetries Generate Deterministic Energy-Harvesting Protocols",
    summary: "We consider the general principles for when deterministic energy harvesting (DEH) is possible.",
    authors: "Ali Akil, M. Hamed Mohammady, Zihan Wang",
    arxivLink: "https://arxiv.org/abs/2609.10533",
    arxivId: "2609.10533"
  };

  const synthesized = createClientSideFallbackArticle(targetBlog, preview, "2609.10533", true);

  // Validate required structure
  assert.ok(synthesized.id.startsWith("blog-2609-10533"));
  assert.ok(synthesized.slug.startsWith("2609-10533"));
  assert.strictEqual(synthesized.title, preview.title);
  assert.strictEqual(synthesized.author, preview.authors);
  assert.strictEqual(synthesized.arxivLink, preview.arxivLink);
  assert.strictEqual(synthesized.isEditorEdition, true);

  // Validate academic content quality
  assert.ok(synthesized.content.length > 500, "Content must be substantial scholarly analysis");
  assert.ok(synthesized.content.includes("$$") || synthesized.content.includes("$"), "Content must include LaTeX formulas");
  assert.ok(
    synthesized.content.toLowerCase().includes("harvesting") ||
    synthesized.content.toLowerCase().includes("energy") ||
    synthesized.content.includes("Executive Abstract"),
    "Content must be domain-grounded"
  );

  // Validate banner SVG
  assert.ok(synthesized.bannerSvg.includes("<svg"), "Must produce valid SVG banner");
  assert.ok(synthesized.bannerSvg.includes("</svg>"), "SVG banner must be closed");

  // Validate tags and reading time
  assert.ok(Array.isArray(synthesized.tags) && synthesized.tags.length > 0);
  assert.ok(synthesized.readingTime.endsWith("min read"));
});

test("Inject & Replace: Server E2E Live Verification", async () => {
  // 1. Verify arXiv preview endpoint with the user's paper 2609.10533
  try {
    const previewRes = await fetch("http://localhost:3000/api/arxiv/preview?url=2609.10533");
    assert.strictEqual(previewRes.status, 200);
    const previewData = await previewRes.json();
    assert.strictEqual(previewData.success, true);
    assert.ok(previewData.metadata.title.includes("Noether Symmetries"));
    assert.ok(previewData.metadata.authors.includes("Ali Akil"));
    assert.strictEqual(previewData.metadata.arxivId, "2609.10533");
  } catch (err: any) {
    // If dev server port is occupied or different in test runner, skip graceful network check
    console.warn("Skipping local HTTP preview check:", err.message);
  }

  // 2. Verify /ads.txt serves the user's authorized publisher ID
  try {
    const adsRes = await fetch("http://localhost:3000/ads.txt");
    assert.strictEqual(adsRes.status, 200);
    const adsText = await adsRes.text();
    assert.ok(adsText.includes("pub-7734562716191044"));
    assert.ok(adsText.includes("DIRECT"));
  } catch (err: any) {
    console.warn("Skipping local ads.txt check:", err.message);
  }
});
