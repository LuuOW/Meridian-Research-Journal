import test from "node:test";
import assert from "node:assert";
import {
  buildNewsletterSubject,
  extractPreheader,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  chunkEmailRecipients,
  generateHtmlNewsletter,
  generatePlainTextNewsletter
} from "./newsletterUtils.js";
import { BlogPost } from "../types.js";

const samplePost: BlogPost = {
  id: "photon-crystal-waveguide",
  title: "Silicon Photonic Crystal Waveguides with Near-Zero Dispersion",
  slug: "silicon-photonic-crystal-waveguides",
  excerpt: "Engineered slow-light dispersion in planar photonic crystal membranes.",
  content: "### Introduction\nWe demonstrate anomalous dispersion engineering.\n$$ D = -\\frac{\\lambda}{c} \\frac{d^2 n}{d\\lambda^2} $$\nExperimental measurements show 40 Gbps pulse transmission.",
  author: "Dr. Elena Vance",
  tags: ["Photonics", "Nanotechnology", "Optics"],
  date: "2026-08-18T10:00:00Z",
  readingTime: "6 min read",
  arxivLink: "https://arxiv.org/abs/2608.14468",
  bannerSvg: "<svg></svg>"
};

test("buildNewsletterSubject creates formatted academic subject with tag and title", () => {
  const subject = buildNewsletterSubject(samplePost);
  assert.strictEqual(subject, "[Meridian // PHOTONICS] Silicon Photonic Crystal Waveguides with Near-Zero Dispersion");

  const fallbackPost = { ...samplePost, tags: [] };
  assert.strictEqual(buildNewsletterSubject(fallbackPost), "[Meridian // RESEARCH] Silicon Photonic Crystal Waveguides with Near-Zero Dispersion");
});

test("extractPreheader cleanly removes markdown syntax and truncates to max length", () => {
  const markdownText = "### Abstract\n```rust\nlet x = 1;\n```\nHere is our key equation: $$ E = \\hbar\\omega $$. *Significant* progress has been achieved in quantum entanglement.";
  const preheader = extractPreheader(markdownText, 80);

  assert.ok(!preheader.includes("```"));
  assert.ok(!preheader.includes("$$"));
  assert.ok(!preheader.includes("###"));
  assert.ok(preheader.length <= 80);
  assert.ok(preheader.endsWith("..."));
});

test("createUnsubscribeToken and verifyUnsubscribeToken guarantee token authenticity", () => {
  const email = "researcher@oxford.ac.uk";
  const token = createUnsubscribeToken(email);

  assert.strictEqual(verifyUnsubscribeToken(email, token), true);
  assert.strictEqual(verifyUnsubscribeToken("other@oxford.ac.uk", token), false);
  assert.strictEqual(verifyUnsubscribeToken(email, "invalid-token"), false);
  assert.strictEqual(verifyUnsubscribeToken("", token), false);
  assert.strictEqual(verifyUnsubscribeToken(email, ""), false);
});

test("chunkEmailRecipients partitions recipients into fixed batch sizes", () => {
  const recipients = ["a@test.com", "b@test.com", "c@test.com", "d@test.com", "e@test.com"];
  const batches = chunkEmailRecipients(recipients, 2);

  assert.strictEqual(batches.length, 3);
  assert.deepStrictEqual(batches[0], ["a@test.com", "b@test.com"]);
  assert.deepStrictEqual(batches[1], ["c@test.com", "d@test.com"]);
  assert.deepStrictEqual(batches[2], ["e@test.com"]);

  assert.deepStrictEqual(chunkEmailRecipients([]), []);
});

test("generateHtmlNewsletter creates responsive HTML email with inline styling", () => {
  const html = generateHtmlNewsletter(samplePost, "https://meridian-journal.org");

  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("Silicon Photonic Crystal Waveguides"));
  assert.ok(html.includes("Dr. Elena Vance"));
  assert.ok(html.includes("arXiv:2608.14468"));
  assert.ok(html.includes("https://meridian-journal.org/#blog-photon-crystal-waveguide"));
  assert.ok(html.includes("Unsubscribe from this newsletter"));
});

test("generatePlainTextNewsletter produces clear ASCII formatted digest", () => {
  const text = generatePlainTextNewsletter(samplePost, "https://meridian-journal.org");

  assert.ok(text.includes("MERIDIAN RESEARCH PUBLICATION DIGEST"));
  assert.ok(text.includes("Silicon Photonic Crystal Waveguides"));
  assert.ok(text.includes("arXiv ID: 2608.14468"));
  assert.ok(text.includes("https://meridian-journal.org/#blog-photon-crystal-waveguide"));
});
