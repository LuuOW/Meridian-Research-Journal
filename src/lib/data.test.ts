import { test } from "node:test";
import assert from "node:assert";
import { PRELOADED_BLOGS } from "../data";
import { extractArxivId, cleanJsonText, generateSlug, parseArxivXml, parseArxivFeedXml } from "./arxivUtils";

test("PRELOADED_BLOGS contains valid articles", () => {
  assert.ok(Array.isArray(PRELOADED_BLOGS), "PRELOADED_BLOGS should be an array");
  assert.ok(PRELOADED_BLOGS.length > 0, "PRELOADED_BLOGS should have at least one element");
  
  const firstBlog = PRELOADED_BLOGS[0];
  assert.ok(firstBlog.id, "Each blog should have an id");
  assert.ok(firstBlog.title, "Each blog should have a title");
  assert.ok(firstBlog.slug, "Each blog should have a slug");
  assert.ok(firstBlog.content, "Each blog should have content");
  assert.ok(firstBlog.tags && firstBlog.tags.length > 0, "Each blog should have tags");
});

test("PRELOADED_BLOGS has no duplicate IDs or Slugs", () => {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const blog of PRELOADED_BLOGS) {
    assert.strictEqual(ids.has(blog.id), false, `Duplicate blog ID found: ${blog.id}`);
    assert.strictEqual(slugs.has(blog.slug), false, `Duplicate blog slug found: ${blog.slug}`);
    ids.add(blog.id);
    slugs.add(blog.slug);
  }
});

test("PRELOADED_BLOGS metadata is formatted properly", () => {
  for (const blog of PRELOADED_BLOGS) {
    assert.match(blog.readingTime, /^\d+ min read$/, `Reading time should match format like 'X min read': ${blog.readingTime}`);
    assert.ok(blog.tags.every(tag => tag.length > 0), "Tags should not contain empty strings");
  }
});

test("extractArxivId extracts correct paper IDs", () => {
  // Test standard abstract URL
  assert.strictEqual(
    extractArxivId("https://arxiv.org/abs/2403.12345"),
    "2403.12345",
    "Should extract ID from standard https abstract URL"
  );

  // Test pdf URL
  assert.strictEqual(
    extractArxivId("https://arxiv.org/pdf/2112.01234"),
    "2112.01234",
    "Should extract ID from standard pdf URL"
  );

  // Test case insensitivity and http
  assert.strictEqual(
    extractArxivId("http://ARXIV.org/abs/1904.5678"),
    "1904.5678",
    "Should extract ID from HTTP and uppercase URL"
  );

  // Test plain ID input
  assert.strictEqual(
    extractArxivId("2305.12345"),
    "2305.12345",
    "Should return plain ID as is"
  );

  // Test invalid URLs/IDs
  assert.strictEqual(
    extractArxivId("https://arxiv.org/abs/invalid-id"),
    null,
    "Should return null for non-numeric paper ID URL"
  );

  assert.strictEqual(
    extractArxivId("invalid-format"),
    null,
    "Should return null for plain invalid string"
  );

  assert.strictEqual(
    extractArxivId("https://google.com"),
    null,
    "Should return null for generic non-arxiv URLs"
  );
});

test("cleanJsonText sanitizes raw LLM output and LaTeX correctly", () => {

  // 1. Test markdown wrapping removal
  const rawMarkdownJson = "```json\n{\n  \"title\": \"Quantum Gravity\"\n}\n```";
  const cleaned1 = cleanJsonText(rawMarkdownJson);
  assert.deepStrictEqual(JSON.parse(cleaned1), { title: "Quantum Gravity" });

  // 2. Test standard invalid LaTeX escape sequences (e.g., \alpha, \partial, \sigma)
  const latexJson = `{"content": "Let \\alpha be the angle, and \\partial^2 f is the derivative."}`;
  // Wait, let's represent the single backslashes properly in JS string template literal
  const badLatexJson = '{"content": "Let \\alpha be the angle, and \\partial^2 f is the derivative."}';
  const cleanedLatex = cleanJsonText(badLatexJson);
  const parsedLatex = JSON.parse(cleanedLatex);
  assert.strictEqual(parsedLatex.content, "Let \\alpha be the angle, and \\partial^2 f is the derivative.");

  // 3. Test LaTeX starting with JSON escapes (e.g., \theta, \beta, \frac)
  const trickyLatexJson = '{"formula": "Let \\theta be the angle, \\beta be the scale, and \\frac{1}{2} be the fraction."}';
  const cleanedTricky = cleanJsonText(trickyLatexJson);
  const parsedTricky = JSON.parse(cleanedTricky);
  assert.strictEqual(parsedTricky.formula, "Let \\theta be the angle, \\beta be the scale, and \\frac{1}{2} be the fraction.");

  // 4. Test distinguishing true JSON newlines (\n followed by space/caps) vs \nabla / \nu / \nearrow
  const newlineVsNablaJson = '{"text": "Line 1\\nLine 2\\n Let \\nabla be the gradient and \\nu be the frequency."}';
  const cleanedNewline = cleanJsonText(newlineVsNablaJson);
  const parsedNewline = JSON.parse(cleanedNewline);
  // Expect standard \\n to parse as a real newline character, and \\nabla/\\nu to parse as \nabla and \nu
  assert.strictEqual(parsedNewline.text, "Line 1\nLine 2\n Let \\nabla be the gradient and \\nu be the frequency.");

  // 5. Test literal newlines inside JSON string values
  const literalNewlineJson = '{"content": "This is line 1\nThis is line 2"}';
  const cleanedLiteral = cleanJsonText(literalNewlineJson);
  const parsedLiteral = JSON.parse(cleanedLiteral);
  assert.strictEqual(parsedLiteral.content, "This is line 1\nThis is line 2");

  // 6. Test invalid Unicode escape sequences vs LaTeX underline (e.g., \underline, \upsilon)
  const unicodeVsUnderlineJson = '{"text": "Look at \\underline{this} and \\upsilon."}';
  const cleanedUnicode = cleanJsonText(unicodeVsUnderlineJson);
  const parsedUnicode = JSON.parse(cleanedUnicode);
  assert.strictEqual(parsedUnicode.text, "Look at \\underline{this} and \\upsilon.");
});

test("generateSlug generates clean URL slugs", () => {
  assert.strictEqual(generateSlug("Hello World!"), "hello-world", "Should convert spaces to hyphens and lowercase");
  assert.strictEqual(generateSlug("Quantum Mechanics (Part 1)"), "quantum-mechanics-part-1", "Should replace non-alphanumeric chars");
  assert.strictEqual(generateSlug("---Amazing---Title---"), "amazing-title", "Should strip leading and trailing hyphens");
  assert.strictEqual(generateSlug(""), "", "Should handle empty string");
});

test("parseArxivXml parses standard arXiv query result XML properly", () => {
  const xmlSample = `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <title type="text">Arxiv Query: search_query=all&amp;id_list=2403.12345</title>
    <entry>
      <title>  Attention Is All   You Need  </title>
      <summary>
        This paper proposes a new simple network architecture, the Transformer.
        It is based solely on attention mechanisms.
      </summary>
      <author>
        <name>Ashish Vaswani</name>
      </author>
      <author>
        <name>Noam Shazeer</name>
      </author>
      <author>
        <name>Niki Parmar</name>
      </author>
      <author>
        <name>Jakob Uszkoreit</name>
      </author>
    </entry>
  </feed>`;

  const parsed = parseArxivXml(xmlSample);

  assert.strictEqual(parsed.title, "Attention Is All You Need", "Should parse and format title, collapsing inner whitespace");
  assert.strictEqual(
    parsed.summary,
    "This paper proposes a new simple network architecture, the Transformer. It is based solely on attention mechanisms.",
    "Should parse and format summary, collapsing inner whitespace"
  );
  assert.strictEqual(parsed.authors, "Ashish Vaswani, Noam Shazeer, Niki Parmar", "Should parse authors and limit to top 3 names, joined by commas");
});

test("parseArxivXml handles missing fields gracefully", () => {
  const emptyXml = `<feed></feed>`;
  const parsedEmpty = parseArxivXml(emptyXml);

  assert.strictEqual(parsedEmpty.title, "Unknown Paper Title");
  assert.strictEqual(parsedEmpty.summary, "");
  assert.strictEqual(parsedEmpty.authors, "");
});

test("extractArxivId handles version suffixes and query parameters", () => {
  // Version suffix
  assert.strictEqual(extractArxivId("2403.12345v2"), "2403.12345");
  assert.strictEqual(extractArxivId("https://arxiv.org/abs/2403.12345v1"), "2403.12345");
  assert.strictEqual(extractArxivId("https://arxiv.org/pdf/2403.12345v12"), "2403.12345");

  // Query parameters
  assert.strictEqual(
    extractArxivId("https://arxiv.org/abs/2403.12345?context=cs.AI"),
    "2403.12345"
  );
  assert.strictEqual(
    extractArxivId("https://arxiv.org/pdf/1706.03762v5?utm_source=test"),
    "1706.03762"
  );

  // Spaced input
  assert.strictEqual(extractArxivId("  https://arxiv.org/abs/2112.01234  "), "2112.01234");
});

test("generateSlug handles advanced punctuation and non-ASCII cases", () => {
  // Non-ASCII characters replaced with hyphen
  assert.strictEqual(generateSlug("Schrödinger's Cat"), "schr-dinger-s-cat");
  
  // Mixed specials and duplicates
  assert.strictEqual(generateSlug("A & B - C @ D !"), "a-b-c-d");
  
  // Empty result for entirely punctuation
  assert.strictEqual(generateSlug("@#$%^&*()_+"), "");
  
  // Numbers-only title
  assert.strictEqual(generateSlug("404"), "404");
});

test("cleanJsonText handles advanced LaTeX sequences and mathematical symbols", () => {
  // Escape sequences of multiple popular math symbols that are invalid as JSON escapes
  const rawMathJson = '{"formula": "Let \\\\pi, \\\\tau, \\\\lambda, \\\\epsilon, \\\\Delta, \\\\theta represent our variables."}';
  const cleanedMath = cleanJsonText(rawMathJson);
  const parsedMath = JSON.parse(cleanedMath);
  assert.strictEqual(parsedMath.formula, "Let \\pi, \\tau, \\lambda, \\epsilon, \\Delta, \\theta represent our variables.");

  // Test deeply nested double/triple backslashes
  const nestedEscapes = '{"text": "Double \\\\\\\\ escape and single \\\\rho."}';
  const cleanedNested = cleanJsonText(nestedEscapes);
  const parsedNested = JSON.parse(cleanedNested);
  assert.strictEqual(parsedNested.text, "Double \\\\ escape and single \\rho.");
});

test("parseArxivXml successfully scopes to entry block", () => {
  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
  <feed>
    <title>ArXiv Feed Level Title Search</title>
    <summary>Feed Level Summary description</summary>
    <entry>
      <title>True Paper Title Inside Entry</title>
      <summary>True summary details inside entry.</summary>
      <author><name>Author One</name></author>
    </entry>
  </feed>`;

  const parsed = parseArxivXml(feedXml);
  assert.strictEqual(parsed.title, "True Paper Title Inside Entry", "Should ignore the outer feed-level title");
  assert.strictEqual(parsed.summary, "True summary details inside entry.", "Should ignore the outer feed-level summary");
  assert.strictEqual(parsed.authors, "Author One");
});

test("parseArxivFeedXml parses multi-entry feeds and structures them correctly", () => {
  const multiFeedXml = `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <id>http://arxiv.org/abs/2403.00001v1</id>
      <title>Paper One: A Deep Dive into Transformers</title>
      <summary>This is summary of Paper One.</summary>
      <author><name>Alice Smith</name></author>
      <author><name>Bob Jones</name></author>
    </entry>
    <entry>
      <id>http://arxiv.org/abs/2403.00002v3</id>
      <title>Paper Two: Scaling Laws for Large Models</title>
      <summary>This is summary of Paper Two.</summary>
      <author><name>Charlie Brown</name></author>
      <author><name>Diana Prince</name></author>
      <author><name>Ethan Hunt</name></author>
      <author><name>Frank Castle</name></author>
    </entry>
  </feed>`;

  const papers = parseArxivFeedXml(multiFeedXml);
  assert.strictEqual(papers.length, 2, "Should parse exactly 2 papers");

  // Verify first entry
  assert.strictEqual(papers[0].id, "2403.00001v1");
  assert.strictEqual(papers[0].title, "Paper One: A Deep Dive into Transformers");
  assert.strictEqual(papers[0].summary, "This is summary of Paper One.");
  assert.strictEqual(papers[0].authors, "Alice Smith, Bob Jones");
  assert.strictEqual(papers[0].link, "https://arxiv.org/abs/2403.00001");

  // Verify second entry (author list truncated to 3 names)
  assert.strictEqual(papers[1].id, "2403.00002v3");
  assert.strictEqual(papers[1].title, "Paper Two: Scaling Laws for Large Models");
  assert.strictEqual(papers[1].summary, "This is summary of Paper Two.");
  assert.strictEqual(papers[1].authors, "Charlie Brown, Diana Prince, Ethan Hunt");
  assert.strictEqual(papers[1].link, "https://arxiv.org/abs/2403.00002");
});

test("parseArxivFeedXml handles empty input or malformed entries gracefully", () => {
  // Empty XML
  const emptyFeed = parseArxivFeedXml("");
  assert.deepStrictEqual(emptyFeed, [], "Empty XML should return empty array");

  // Entry without ID (should be skipped)
  const malformedFeedXml = `<feed>
    <entry>
      <title>Paper Without ID</title>
      <summary>Some summary</summary>
      <author><name>John Doe</name></author>
    </entry>
  </feed>`;
  const result = parseArxivFeedXml(malformedFeedXml);
  assert.deepStrictEqual(result, [], "Entries without valid IDs should be excluded");
});

test("cleanJsonText handles unclosed markdown tags and excessive trailing backslashes", () => {
  // Markdown json without closing block
  const unclosedMarkdown = "```json\n{\"status\": \"active\"";
  const cleaned = cleanJsonText(unclosedMarkdown);
  assert.strictEqual(cleaned, "{\"status\": \"active\"", "Should strip opening markdown block and return remainder");

  // Trailing backslash inside string value
  const trailingBackslash = '{"text": "this is a trailing slash\\\\"}';
  const cleanedSlash = cleanJsonText(trailingBackslash);
  const parsed = JSON.parse(cleanedSlash);
  assert.strictEqual(parsed.text, "this is a trailing slash\\");
});

test("extractArxivId handles strange whitespace, prefix variants, and non-arxiv paths", () => {
  assert.strictEqual(extractArxivId("   arxiv:1706.03762   "), null, "Prefix with 'arxiv:' is not standard, should return null");
  assert.strictEqual(extractArxivId("https://arxiv.org/abs/1212.56789"), "1212.56789", "Should match 5-digit suffixes");
  assert.strictEqual(extractArxivId("https://arxiv.org/abs/9912.1234"), "9912.1234", "Should match 4-digit suffixes");
});

test("generateSlug handles international characters and diacritics", () => {
  assert.strictEqual(generateSlug("Clément's Theorem"), "cl-ment-s-theorem", "Should clean accents or non-ascii characters");
  assert.strictEqual(generateSlug("Café & Resumé"), "caf-resum", "Should handle special characters gracefully");
  assert.strictEqual(generateSlug("  ---  Multiple ---   Spaces   "), "multiple-spaces", "Should collapse whitespace and multiple hyphens");
});



