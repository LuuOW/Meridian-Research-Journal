import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";
import { computeArxivVsMeridianDates } from "./dailyEditorialEngine";
import { formatARTDate, isWeekendInART } from "./offlineBlogRecord";
import { getGitHubSyncConfig } from "./githubSync";

describe("Blog Consistency Suite: Latest Publication Dates (September 23 - 24, 2026)", () => {
  const rootCustomBlogsPath = path.join(process.cwd(), "custom_blogs.json");
  const pubCustomBlogsPath = path.join(process.cwd(), "public", "custom_blogs.json");
  const offlineRecordPath = path.join(process.cwd(), "offline_blog_record");

  test("Latest published article is dated September 23 or 24, 2026", () => {
    const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));
    const latestBlog = customBlogs[0];
    assert.ok(latestBlog, "There must be at least one blog entry");

    // Must match today's or yesterday's date
    assert.ok(
      latestBlog.date === "September 24, 2026" || latestBlog.date === "September 23, 2026",
      `Latest article must be dated September 23 or 24, 2026 (actual: ${latestBlog.date})`
    );

    if (latestBlog.date === "September 24, 2026") {
      assert.ok(
        latestBlog.title.includes("Strong coupling of a reconfigurable") ||
        latestBlog.arxivLink?.includes("2609.25232")
      );
    } else {
      assert.ok(
        latestBlog.title.includes("Fluctuation-Driven Nonlinear Amplification"),
        "Article title must match the September 23 headline"
      );
      assert.ok(
        latestBlog.arxivLink?.includes("2609.26674"),
        "Article must reference arXiv:2609.26674"
      );
    }
  });

  test("Dynamic Chirality in Photonic Time Crystals strictly matches arXiv submission date (September 8, 2026)", () => {
    const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));
    const dynamicChirality = customBlogs.find(
      (b) => b.arxivLink?.includes("2609.08748") || b.title.includes("Dynamic Chirality")
    );
    assert.ok(dynamicChirality, "Must find Dynamic Chirality article in dataset");
    assert.strictEqual(
      dynamicChirality.date,
      "September 8, 2026",
      "Dynamic Chirality date must strictly match arXiv submission date of [Submitted on 8 Sep 2026]"
    );
    assert.ok(dynamicChirality.arxivLink.includes("2609.08748"));
  });

  test("PRELOADED_BLOGS and public/custom_blogs.json reflect latest article consistently", () => {
    const pubBlogs: BlogPost[] = JSON.parse(fs.readFileSync(pubCustomBlogsPath, "utf-8"));
    assert.strictEqual(pubBlogs[0].date, PRELOADED_BLOGS[0].date);
    assert.strictEqual(pubBlogs[0].id, PRELOADED_BLOGS[0].id);
    assert.strictEqual(pubBlogs[0].title, PRELOADED_BLOGS[0].title);
  });

  test("offline_blog_record has an entry for 23/09/2026 matching Fluctuation-Driven Nonlinear Amplification", () => {
    const recordContent = fs.readFileSync(offlineRecordPath, "utf-8");
    assert.ok(
      recordContent.includes("23/09/2026"),
      "offline_blog_record must include date 23/09/2026"
    );
    assert.ok(
      recordContent.includes("23/09/2026\nFluctuation-Driven Nonlinear Amplification of Quantum Statistics"),
      "offline_blog_record must record Fluctuation-Driven Nonlinear Amplification for 23/09/2026"
    );
  });
});

describe("Blog Consistency Suite: Full Chronological Audit Leading to September 23-24", () => {
  const rootCustomBlogsPath = path.join(process.cwd(), "custom_blogs.json");
  const offlineRecordPath = path.join(process.cwd(), "offline_blog_record");

  test("All articles published in September 2026 have valid, parseable calendar dates", () => {
    const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));

    customBlogs.forEach((blog) => {
      assert.ok(blog.date, `Blog ${blog.id} must have a non-empty date string`);
      const parsedTime = new Date(blog.date).getTime();
      assert.ok(
        !isNaN(parsedTime),
        `Blog ${blog.id} date "${blog.date}" must be a valid date format parseable by JavaScript Date`
      );
    });
  });

  test("Consecutive weekday publishing sequence is preserved from September 14 to September 23/24", () => {
    const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));
    
    // Top articles corresponding to the daily dispatches
    const offset = customBlogs[0].date === "September 24, 2026" ? 1 : 0;
    const expectedSequence = [
      { date: "September 23, 2026", titlePart: "Fluctuation-Driven Nonlinear Amplification" },
      { date: "September 22, 2026", titlePart: "Square-Root Higher-Order Exceptional Points" },
      { date: "September 21, 2026", titlePart: "Subwavelength exceptional points" },
      { date: "September 18, 2026", titlePart: "Topological Argument for Robustness" },
      { date: "September 17, 2026", titlePart: "Universal Non-Abelian Holonomic" },
      { date: "September 16, 2026", titlePart: "Correlation geometry and topology" },
      { date: "September 15, 2026", titlePart: "Measurement Bases are Sufficient" },
    ];

    expectedSequence.forEach((expected, index) => {
      const blog = customBlogs[index + offset];
      assert.ok(blog, `Expected blog at index ${index + offset} for ${expected.date}`);
      assert.strictEqual(blog.date, expected.date, `Index ${index + offset} date must match ${expected.date}`);
      assert.ok(
        blog.title.includes(expected.titlePart),
        `Index ${index + offset} title "${blog.title}" must contain "${expected.titlePart}"`
      );
    });
  });

  test("offline_blog_record strictly maps every date from 14/09/2026 to 23/09/2026 with correct weekend markers", () => {
    const recordContent = fs.readFileSync(offlineRecordPath, "utf-8");

    // Verify weekends are marked correctly
    assert.ok(
      recordContent.includes("19/09/2026\n- Weekend"),
      "Saturday 19/09/2026 must be marked - Weekend"
    );
    assert.ok(
      recordContent.includes("20/09/2026\n- Weekend"),
      "Sunday 20/09/2026 must be marked - Weekend"
    );

    // Verify weekdays have title entries
    assert.ok(recordContent.includes("14/09/2026"));
    assert.ok(recordContent.includes("15/09/2026"));
    assert.ok(recordContent.includes("16/09/2026"));
    assert.ok(recordContent.includes("17/09/2026"));
    assert.ok(recordContent.includes("18/09/2026"));
    assert.ok(recordContent.includes("21/09/2026"));
    assert.ok(recordContent.includes("22/09/2026"));
    assert.ok(recordContent.includes("23/09/2026"));
  });
});

describe("Blog Consistency Suite: arXiv Identifier & Cadence Alignment", () => {
  const rootCustomBlogsPath = path.join(process.cwd(), "custom_blogs.json");

  test("Every blog with an arxivLink has a well-formed URL and extractable arXiv identifier or editorial URL", () => {
    const customBlogs: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));

    customBlogs.forEach((blog) => {
      if (blog.arxivLink) {
        if (blog.arxivLink.includes("arxiv.org")) {
          assert.ok(
            blog.arxivLink.startsWith("https://arxiv.org/abs/") ||
            blog.arxivLink.startsWith("https://arxiv.org/pdf/"),
            `Blog ${blog.id} has malformed arxivLink: ${blog.arxivLink}`
          );

          const idMatch = blog.arxivLink.match(/(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[a-z]{2})?\/\d{7})/i);
          assert.ok(
            idMatch,
            `Blog ${blog.id} arxivLink must contain an identifiable arXiv ID: ${blog.arxivLink}`
          );
        } else {
          // Self-hosted or internal editorial link
          assert.ok(
            blog.arxivLink.startsWith("https://ask-meridian.uk/blog/"),
            `Blog ${blog.id} has invalid non-arxiv link: ${blog.arxivLink}`
          );
        }
      }
    });
  });

  test("Recent September 2026 articles adhere to arXiv daily announcement schedule", () => {
    // Test Tuesday arXiv announcement mapped to Wednesday dispatch
    const dateComp = computeArxivVsMeridianDates("2609.08748", "September 22, 2026");
    assert.strictEqual(dateComp.meridianPubDate, "September 23, 2026");
    assert.strictEqual(dateComp.meridianDayOfWeekName, "Wednesday");
    assert.strictEqual(dateComp.isDateAligned, true);

    // Test Friday arXiv announcement bridged over weekend to Monday dispatch
    const fridayComp = computeArxivVsMeridianDates("2609.15200", "September 18, 2026");
    assert.strictEqual(fridayComp.meridianPubDate, "September 21, 2026");
    assert.strictEqual(fridayComp.meridianDayOfWeekName, "Monday");
    assert.strictEqual(fridayComp.isDateAligned, true);
  });
});

describe("Blog Consistency Suite: Zero Duplication & Source Parity", () => {
  const rootCustomBlogsPath = path.join(process.cwd(), "custom_blogs.json");
  const pubCustomBlogsPath = path.join(process.cwd(), "public", "custom_blogs.json");
  const sitemapPath = path.join(process.cwd(), "sitemap.xml");

  test("Zero duplicate article IDs across all data representations", () => {
    const rootData: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));
    const pubData: BlogPost[] = JSON.parse(fs.readFileSync(pubCustomBlogsPath, "utf-8"));

    const checkNoDuplicates = (articles: BlogPost[], name: string) => {
      const seenIds = new Set<string>();
      const duplicates: string[] = [];
      for (const a of articles) {
        if (seenIds.has(a.id)) {
          duplicates.push(a.id);
        }
        seenIds.add(a.id);
      }
      assert.strictEqual(
        duplicates.length,
        0,
        `Duplicate IDs found in ${name}: ${duplicates.join(", ")}`
      );
    };

    checkNoDuplicates(rootData, "custom_blogs.json");
    checkNoDuplicates(pubData, "public/custom_blogs.json");
    checkNoDuplicates(PRELOADED_BLOGS, "PRELOADED_BLOGS");
  });

  test("Zero duplicate arXiv IDs among the active September 2026 editorial dispatches", () => {
    const rootData: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));
    // Inspect top 10 articles (September active sequence)
    const recent = rootData.slice(0, 10);
    const seenArxiv = new Set<string>();
    const duplicateArxiv: string[] = [];

    for (const b of recent) {
      const match = (b.arxivLink || "").match(/(\d{4}\.\d{4,5})/);
      if (match) {
        const aid = match[1];
        if (seenArxiv.has(aid)) {
          duplicateArxiv.push(`${aid} (in ${b.id})`);
        }
        seenArxiv.add(aid);
      }
    }

    assert.strictEqual(
      duplicateArxiv.length,
      0,
      `Duplicate arXiv papers found in recent dispatches: ${duplicateArxiv.join(", ")}`
    );
  });

  test("Sitemap includes today's September 23 article and has zero duplicate entries", () => {
    const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");
    
    // Check today's article URL
    assert.ok(
      sitemapContent.includes("blog-2609-26674v1-9821") ||
      sitemapContent.includes("fluctuation-driven-nonlinear-amplification-quantum-statistics"),
      "Sitemap must contain today's article URL (September 23, 2026)"
    );

    // Verify no duplicate loc tags
    const locMatches = [...sitemapContent.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    const seenLocs = new Set<string>();
    const dupes: string[] = [];
    for (const loc of locMatches) {
      if (seenLocs.has(loc)) {
        dupes.push(loc);
      }
      seenLocs.add(loc);
    }
    assert.strictEqual(
      dupes.length,
      0,
      `Sitemap has duplicate URLs: ${dupes.join(", ")}`
    );
  });

  test("GitHub sync author configuration is registered as Lucas Kempe", () => {
    const config = getGitHubSyncConfig();
    assert.strictEqual(config.authorName, "Lucas Kempe");
    assert.strictEqual(config.authorEmail, "lucas.kempe@icloud.com");
  });
});
