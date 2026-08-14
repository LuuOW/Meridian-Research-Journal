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
} from "./newsletterUtils";
import { BlogPost } from "../types";

const mockPost: BlogPost = {
  id: "test-post-1",
  title: "Quantum Entanglement & Superposition Dynamics",
  slug: "quantum-entanglement-superposition",
  excerpt: "A deep investigation into bipartite non-locality and teleportation fidelity in silicon nanophotonics.",
  content: "# Introduction\n\nQuantum state tomography proves high fidelity.",
  author: "Lucas Kempe",
  tags: ["Quantum", "Optics", "Information"],
  arxivLink: "https://arxiv.org/abs/2608.12345",
  date: "2026-08-14T10:00:00Z",
  readingTime: "5 min",
  bannerSvg: "<svg></svg>"
};

test("buildNewsletterSubject formats subject with primary tag and title", () => {
  const subject = buildNewsletterSubject(mockPost);
  assert.strictEqual(subject, "[Meridian // QUANTUM] Quantum Entanglement & Superposition Dynamics");

  const fallbackSubject = buildNewsletterSubject({} as BlogPost);
  assert.ok(fallbackSubject.includes("[Meridian // RESEARCH]"));
});

test("extractPreheader strips markdown and truncates cleanly", () => {
  const md = "# Title\n\n```python\nprint('hello')\n```\n\n$$\\hat{H} = E$$\n\nHere is a clean summary sentence of the research article.";
  const preheader = extractPreheader(md, 50);
  assert.ok(!preheader.includes("```"), "Should strip code blocks");
  assert.ok(!preheader.includes("$$"), "Should strip math blocks");
  assert.ok(preheader.length <= 50);
});

test("createUnsubscribeToken and verifyUnsubscribeToken manage secure unsubscription", () => {
  const email = "scholar.reader@oxford.edu";
  const token = createUnsubscribeToken(email);

  assert.ok(token.length > 10);
  assert.strictEqual(verifyUnsubscribeToken(email, token), true);
  assert.strictEqual(verifyUnsubscribeToken("wrong.email@cambridge.edu", token), false);
  assert.strictEqual(verifyUnsubscribeToken(email, "corrupted-token"), false);
  assert.strictEqual(verifyUnsubscribeToken("", token), false);
});

test("chunkEmailRecipients partitions large recipient arrays into sized sub-arrays", () => {
  const list = ["a@a.com", "b@b.com", "c@c.com", "d@d.com", "e@e.com"];
  const chunked = chunkEmailRecipients(list, 2);

  assert.strictEqual(chunked.length, 3);
  assert.deepStrictEqual(chunked[0], ["a@a.com", "b@b.com"]);
  assert.deepStrictEqual(chunked[1], ["c@c.com", "d@d.com"]);
  assert.deepStrictEqual(chunked[2], ["e@e.com"]);

  assert.deepStrictEqual(chunkEmailRecipients([]), []);
});

test("generateHtmlNewsletter creates responsive markup with metadata and CTA link", () => {
  const html = generateHtmlNewsletter(mockPost, "https://meridian-research.com", "https://meridian-research.com/unsub?id=123");

  assert.ok(html.includes("Quantum Entanglement &amp; Superposition Dynamics") || html.includes("Quantum Entanglement & Superposition Dynamics"));
  assert.ok(html.includes("arXiv:2608.12345"));
  assert.ok(html.includes("Lucas Kempe"));
  assert.ok(html.includes("https://meridian-research.com/#blog-test-post-1"));
  assert.ok(html.includes("https://meridian-research.com/unsub?id=123"));
  assert.ok(html.includes("QUANTUM") || html.includes("Quantum"));
});

test("generatePlainTextNewsletter produces clean plain text with links and ASCII headers", () => {
  const text = generatePlainTextNewsletter(mockPost, "https://meridian-research.com", "https://meridian-research.com/unsub?id=123");

  assert.ok(text.includes("MERIDIAN RESEARCH PUBLICATION DIGEST"));
  assert.ok(text.includes("Quantum Entanglement & Superposition Dynamics"));
  assert.ok(text.includes("arXiv ID: 2608.12345"));
  assert.ok(text.includes("https://meridian-research.com/#blog-test-post-1"));
  assert.ok(text.includes("https://meridian-research.com/unsub?id=123"));
});
