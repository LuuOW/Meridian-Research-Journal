import { test } from "node:test";
import assert from "node:assert";
import {
  parseArxivInput,
  parseInjectionResponse,
  replaceBlogInCatalog,
  getInjectModalThemeTokens
} from "./arxivInjectionUtils.js";
import { BlogPost } from "../types.js";

test("parseArxivInput correctly extracts arXiv identifiers from varied inputs", () => {
  // Full abstract URL
  const res1 = parseArxivInput("https://arxiv.org/abs/2609.10535");
  assert.strictEqual(res1.isValid, true);
  assert.strictEqual(res1.arxivId, "2609.10535");
  assert.strictEqual(res1.fullUrl, "https://arxiv.org/abs/2609.10535");

  // PDF URL with version
  const res2 = parseArxivInput("https://arxiv.org/pdf/2408.09854v2.pdf");
  assert.strictEqual(res2.isValid, true);
  assert.strictEqual(res2.arxivId, "2408.09854");
  assert.strictEqual(res2.fullUrl, "https://arxiv.org/abs/2408.09854");

  // Bare identifier with leading/trailing whitespace
  const res3 = parseArxivInput("   2408.09854   ");
  assert.strictEqual(res3.isValid, true);
  assert.strictEqual(res3.arxivId, "2408.09854");

  // arXiv: prefix
  const res4 = parseArxivInput("arxiv:2609.10535");
  assert.strictEqual(res4.isValid, true);
  assert.strictEqual(res4.arxivId, "2609.10535");

  // Invalid inputs
  assert.strictEqual(parseArxivInput("").isValid, false);
  assert.strictEqual(parseArxivInput("   ").isValid, false);
  assert.strictEqual(parseArxivInput("https://google.com").isValid, false);
  assert.strictEqual(parseArxivInput("not-an-arxiv-id").isValid, false);
});

test("parseInjectionResponse safely handles successful responses", () => {
  const mockBlog: Partial<BlogPost> = {
    id: "blog-2408-09854-1234",
    title: "Qualitative properties and stability analysis",
    slug: "qualitative-properties-stability-analysis",
    content: "## Abstract\n$x = 1$",
    date: "Aug 15, 2026",
    readingTime: "8 min read",
    tags: ["Quantum", "Circuits"],
    author: "Dr. Elena Rostova"
  };

  const rawJson = JSON.stringify({
    success: true,
    blog: mockBlog,
    message: "Replaced successfully"
  });

  const parsed = parseInjectionResponse(rawJson, 200, "OK");
  assert.strictEqual(parsed.success, true);
  assert.strictEqual(parsed.blog?.id, "blog-2408-09854-1234");
  assert.strictEqual(parsed.blog?.title, "Qualitative properties and stability analysis");
  assert.strictEqual(parsed.error, undefined);
});

test("parseInjectionResponse handles server error payloads without masked messages", () => {
  // Explicit error in JSON
  const errorJson = JSON.stringify({
    success: false,
    error: "ArXiv ID 9999.99999 could not be found on export.arxiv.org"
  });

  const parsed1 = parseInjectionResponse(errorJson, 404, "Not Found");
  assert.strictEqual(parsed1.success, false);
  assert.ok(parsed1.error?.includes("9999.99999"));

  // Unauthorized 403 error
  const authErrJson = JSON.stringify({ error: "Unauthorized: Invalid editor password" });
  const parsed2 = parseInjectionResponse(authErrJson, 403, "Forbidden");
  assert.strictEqual(parsed2.success, false);
  assert.ok(parsed2.error?.includes("Unauthorized") || parsed2.error?.includes("password"));
});

test("parseInjectionResponse gracefully handles HTML/proxy errors instead of throwing", () => {
  const htmlError = `<!DOCTYPE html><html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center></body></html>`;
  const parsed = parseInjectionResponse(htmlError, 504, "Gateway Time-out");

  assert.strictEqual(parsed.success, false);
  assert.ok(parsed.error?.includes("504"));
  assert.ok(parsed.error?.includes("Gateway Time-out"));
  // Ensure it never returns undefined error
  assert.ok(typeof parsed.error === "string");
});

test("parseInjectionResponse handles empty or malformed server output", () => {
  const emptyRes = parseInjectionResponse("", 500, "Internal Server Error");
  assert.strictEqual(emptyRes.success, false);
  assert.ok(emptyRes.error?.includes("Empty response"));

  const malformedObj = JSON.stringify({ success: true, somethingElse: 123 });
  const parsedMalformed = parseInjectionResponse(malformedObj, 200, "OK");
  assert.strictEqual(parsedMalformed.success, false);
  assert.ok(parsedMalformed.error?.includes("valid article object"));
});

test("replaceBlogInCatalog replaces target article in-place preserving slot position", () => {
  const initialCatalog: BlogPost[] = [
    { id: "blog-1", title: "Article 1", slug: "article-1" } as BlogPost,
    { id: "blog-2", title: "Article 2", slug: "article-2" } as BlogPost,
    { id: "blog-3", title: "Article 3", slug: "article-3" } as BlogPost
  ];

  const updatedBlog: BlogPost = {
    id: "blog-injected",
    title: "Handpicked New Article",
    slug: "handpicked-new-article"
  } as BlogPost;

  // Replace blog-2 preserving order
  const updatedCatalog = replaceBlogInCatalog(initialCatalog, updatedBlog, "blog-2", true);

  assert.strictEqual(updatedCatalog.length, 3);
  assert.strictEqual(updatedCatalog[0].id, "blog-1");
  assert.strictEqual(updatedCatalog[1].id, "blog-injected");
  assert.strictEqual(updatedCatalog[1].title, "Handpicked New Article");
  assert.strictEqual(updatedCatalog[2].id, "blog-3");

  // Ensure original catalog array was not mutated
  assert.strictEqual(initialCatalog[1].id, "blog-2");
});

test("replaceBlogInCatalog prepends when target does not exist or preserveOrder is false", () => {
  const initialCatalog: BlogPost[] = [
    { id: "blog-1", title: "Article 1", slug: "article-1" } as BlogPost,
    { id: "blog-2", title: "Article 2", slug: "article-2" } as BlogPost
  ];

  const newBlog: BlogPost = {
    id: "blog-fresh",
    title: "Fresh Article",
    slug: "fresh-article"
  } as BlogPost;

  // Target not found -> prepends to index 0
  const resultNotFound = replaceBlogInCatalog(initialCatalog, newBlog, "blog-unknown", true);
  assert.strictEqual(resultNotFound.length, 3);
  assert.strictEqual(resultNotFound[0].id, "blog-fresh");
  assert.strictEqual(resultNotFound[1].id, "blog-1");

  // preserveOrder = false -> moves replaced item to index 0
  const resultUnpreserved = replaceBlogInCatalog(initialCatalog, newBlog, "blog-2", false);
  assert.strictEqual(resultUnpreserved.length, 2);
  assert.strictEqual(resultUnpreserved[0].id, "blog-fresh");
  assert.strictEqual(resultUnpreserved[1].id, "blog-1");
});

test("getInjectModalThemeTokens produces distinct accessible themes for light and dark modes", () => {
  const lightTokens = getInjectModalThemeTokens("light");
  const darkTokens = getInjectModalThemeTokens("dark");

  assert.strictEqual(lightTokens.isLight, true);
  assert.strictEqual(darkTokens.isLight, false);

  // Light mode uses white surface and dark text
  assert.ok(lightTokens.surface.includes("bg-white"));
  assert.ok(lightTokens.surface.includes("text-neutral-900"));
  assert.ok(lightTokens.headerTitle.includes("text-neutral-900"));
  assert.ok(lightTokens.inputField.includes("bg-white"));
  assert.ok(lightTokens.inputField.includes("text-neutral-900"));

  // Dark mode uses neutral-950 surface and light text
  assert.ok(darkTokens.surface.includes("bg-neutral-950"));
  assert.ok(darkTokens.surface.includes("text-neutral-100"));
  assert.ok(darkTokens.headerTitle.includes("text-white"));
  assert.ok(darkTokens.inputField.includes("bg-neutral-900"));
  assert.ok(darkTokens.inputField.includes("text-white"));

  // Action button has vibrant purple branding
  assert.ok(lightTokens.actionBtn.includes("bg-purple-600"));
  assert.ok(darkTokens.actionBtn.includes("bg-purple-600"));
});
