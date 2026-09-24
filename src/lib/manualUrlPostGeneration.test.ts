import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { extractSubmissionDateFromText, syncArticleDates, auditAndSynchronizeAllArticles } from "./dateGenerationSync";
import { extractArxivId } from "./arxivUtils";
import { BlogPost } from "../types";

describe("Manual URL Post Generation Inside Autonomous Switches Suite", () => {
  const navbarPath = path.join(process.cwd(), "src", "components", "Navbar.tsx");
  const appPath = path.join(process.cwd(), "src", "App.tsx");
  const navbarContent = fs.readFileSync(navbarPath, "utf-8");
  const appContent = fs.readFileSync(appPath, "utf-8");

  test("Navbar config menu contains both autonomous switches (arXiv and X)", () => {
    assert.ok(navbarContent.includes('id="navbar-switch-arxiv"'), "arXiv switch must exist");
    assert.ok(navbarContent.includes('id="navbar-switch-x"'), "X posting switch must exist");
  });

  test("Navbar contains WiFi-password style URL field with unmasked visible typing", () => {
    // Must contain input with specific ID
    assert.ok(navbarContent.includes('id="navbar-manual-url-input"'), "URL input field must exist");

    // Must be type="text" - NOT type="password" (URL must not be hidden when typing)
    assert.ok(
      navbarContent.includes('type="text"'),
      "Manual URL field must use type='text' to ensure the URL remains visible while typing"
    );
    assert.ok(
      !navbarContent.includes('type="password"'),
      "Manual URL field must never hide user typing behind password mask"
    );

    // Must contain generate button with trigger ID
    assert.ok(navbarContent.includes('id="navbar-manual-generate-btn"'), "Generate button must exist");

    // Must support Enter key submission
    assert.ok(navbarContent.includes('e.key === "Enter"'), "Must handle Enter key for quick tactile submission");
  });

  test("App.tsx integrates onStartManualGeneration into Navbar", () => {
    assert.ok(
      appContent.includes("onStartManualGeneration={handleStartAsyncGeneration}"),
      "App.tsx must connect handleStartAsyncGeneration to Navbar onStartManualGeneration prop"
    );
  });

  test("extractArxivId properly parses diverse arXiv URL formats for manual generation", () => {
    const urls = [
      { input: "https://arxiv.org/abs/2609.25232", expected: "2609.25232" },
      { input: "http://arxiv.org/pdf/2609.25232v1.pdf", expected: "2609.25232" },
      { input: "arxiv.org/abs/2609.15200v2", expected: "2609.15200" },
      { input: "2609.08748", expected: "2609.08748" },
      { input: "arXiv:2609.26674v1", expected: "2609.26674" },
    ];

    for (const { input, expected } of urls) {
      const extracted = extractArxivId(input);
      assert.strictEqual(extracted, expected, `Failed to extract arXiv ID from ${input}`);
    }
  });

  test("Submission date matching mechanism parses [Submitted on 21 Sep 2026] and aligns article date", () => {
    const rawText = "Preprint abstract block [Submitted on 21 Sep 2026] for quantum optics paper.";
    const extracted = extractSubmissionDateFromText(rawText);

    assert.ok(extracted !== null, "Must extract submission date");
    assert.strictEqual(extracted!.formattedFull, "September 21, 2026");
    assert.strictEqual(extracted!.isoDate, "2026-09-21");

    const sampleBlog: BlogPost = {
      id: "manual-gen-test",
      title: "Sample Generated Post",
      slug: "sample-generated-post-1234",
      excerpt: "Sample excerpt for test.",
      date: "September 1, 2026",
      arxivLink: "https://arxiv.org/abs/2609.15200",
      content: rawText,
      author: "Test Author",
      tags: ["Quantum", "Optics"],
      readingTime: "5 min read",
      bannerSvg: "<svg></svg>",
      views: 350
    };

    const synced = syncArticleDates(sampleBlog, { arxivSubmissionDate: "[Submitted on 21 Sep 2026]" });
    assert.strictEqual(synced.date, "September 21, 2026");
    const genDay = new Date(synced.timestamp!).toISOString().slice(0, 10);
    assert.strictEqual(genDay, "2026-09-21");
  });

  test("ALL articles in database have a publication date that matches their generation date", () => {
    const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");
    const blogs: BlogPost[] = JSON.parse(fs.readFileSync(customBlogsPath, "utf-8"));
    assert.ok(blogs.length >= 60, "Must have substantial article corpus");

    const { articles: verifiedArticles } = auditAndSynchronizeAllArticles(blogs);
    assert.strictEqual(verifiedArticles.length, blogs.length, "All articles must be accounted for");

    for (const b of verifiedArticles) {
      assert.ok(b.date && b.date.trim().length > 0, `Article ${b.id} must have a date`);
      assert.ok(typeof b.timestamp === "number" && !isNaN(b.timestamp), `Article ${b.id} must have timestamp`);
      assert.ok(typeof b.createdAt === "number" && !isNaN(b.createdAt), `Article ${b.id} must have createdAt`);

      const dateParsed = new Date(b.date);
      assert.ok(!isNaN(dateParsed.getTime()), `Article ${b.id} has invalid date ${b.date}`);

      const dateDay = dateParsed.toISOString().slice(0, 10);
      const tsDay = new Date(b.timestamp).toISOString().slice(0, 10);
      assert.strictEqual(
        tsDay,
        dateDay,
        `Article ${b.id} generation date (${tsDay}) must match publication date string (${dateDay})`
      );
    }
  });
});
