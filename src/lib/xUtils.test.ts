import test from "node:test";
import assert from "node:assert";
import {
  buildXArticleUrl,
  countSentences,
  isWithinSentenceLimit,
  buildXSystemInstruction,
  buildXUserPrompt,
  sanitizeHashtags,
  generateFallbackXPost,
  getXPostCache,
  saveXPostCache,
  clearXPostCache
} from "./xUtils";

test("buildXArticleUrl creates sticky canonical short article URLs", () => {
  assert.strictEqual(
    buildXArticleUrl("quantum-sensing-123"),
    "https://ask-meridian.uk/blog/quantum-sensing-123"
  );
  assert.strictEqual(
    buildXArticleUrl("/optical-computing-456"),
    "https://ask-meridian.uk/blog/optical-computing-456"
  );
  assert.strictEqual(buildXArticleUrl(""), "https://ask-meridian.uk/blog");
  assert.strictEqual(buildXArticleUrl(undefined), "https://ask-meridian.uk/blog");
});

test("countSentences accurately measures sentence count excluding URLs and hashtags", () => {
  const text =
    "Quantum optics is revolutionizing computing. Novel topological invariants protect photon transport from scattering. Dive into the mathematical proofs on Ask Meridian: https://ask-meridian.uk/blog/test #Quantum #Physics";
  assert.strictEqual(countSentences(text), 3);
});

test("isWithinSentenceLimit confirms post text is <= 3 sentences", () => {
  const valid = "First visionary breakthrough. Second paradigm shift. Third call to action.";
  assert.strictEqual(isWithinSentenceLimit(valid, 3), true);
});

test("buildXSystemInstruction incorporates blog URL and Futuristic Vision constraint", () => {
  const blogUrl = "https://ask-meridian.uk/blog/test-slug";
  const instruction = buildXSystemInstruction(blogUrl);
  assert.ok(instruction.includes("FUTURISTIC VISION"));
  assert.ok(instruction.includes("EXACTLY 3 SENTENCES"));
  assert.ok(instruction.includes(blogUrl));
});

test("generateFallbackXPost produces futuristic post text strictly <= 3 sentences", () => {
  const fallback = generateFallbackXPost({
    title: "Quantum Reservoir Computing in Metasurfaces",
    excerpt: "Integrating non-linear wavefront shaping for sub-nanosecond matrix multiplication.",
    tags: ["Quantum Optics", "Metamaterials"],
    blogId: "reservoir-42"
  });

  assert.strictEqual(fallback.success, true);
  assert.strictEqual(fallback.tone, "future");
  assert.ok(fallback.postText.length > 0);
  assert.ok(isWithinSentenceLimit(fallback.postText, 3));
});

test("saveXPostCache and getXPostCache persist and retrieve futuristic vision posts", () => {
  const articleKey = "test-x-slug";
  clearXPostCache(articleKey);
  assert.strictEqual(getXPostCache(articleKey), null);

  const postData = {
    draftText: "Sentence one. Sentence two. Sentence three.",
    headline: "Futuristic Horizon",
    tone: "future"
  };

  saveXPostCache(articleKey, postData);
  const retrieved = getXPostCache(articleKey);
  assert.ok(retrieved !== null);
  assert.strictEqual(retrieved?.draftText, postData.draftText);

  clearXPostCache(articleKey);
  assert.strictEqual(getXPostCache(articleKey), null);
});
