import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";

describe("Latest Changes Integrity: Navbar Config Minimalist Dropdown", () => {
  const navbarPath = path.join(process.cwd(), "src", "components", "Navbar.tsx");

  test("Navbar component source exists and is readable", () => {
    assert.ok(fs.existsSync(navbarPath), "src/components/Navbar.tsx must exist");
  });

  test("Navbar config dropdown menu renders only arXiv and X switches", () => {
    const navbarSrc = fs.readFileSync(navbarPath, "utf-8");

    // Dropdown flyout container
    assert.ok(
      navbarSrc.includes('role="menu"') && navbarSrc.includes('aria-label="Configuration Switches"'),
      "Navbar must contain the Configuration Switches menu container"
    );

    // Switches present
    assert.ok(
      navbarSrc.includes('id="navbar-switch-arxiv"'),
      "Navbar dropdown must have arXiv toggle switch with id navbar-switch-arxiv"
    );
    assert.ok(
      navbarSrc.includes('id="navbar-switch-x"'),
      "Navbar dropdown must have X toggle switch with id navbar-switch-x"
    );

    // Icons only next to switches
    assert.ok(
      navbarSrc.includes('<ArxivLogoIcon className="w-8 h-8" />'),
      "arXiv switch row must render ArxivLogoIcon"
    );
    assert.ok(
      navbarSrc.includes('<XLogoIcon className="w-8 h-8" />'),
      "X switch row must render XLogoIcon"
    );

    // xAI Agent (Grok) button is hidden from dropdown
    assert.ok(
      !navbarSrc.includes('id="dropdown-grok-btn"'),
      "xAI Agent grok button must be hidden/removed from the dropdown"
    );
    assert.ok(
      !navbarSrc.includes('id="navbar-grok-agent-btn"'),
      "Navbar Grok agent button must not be present in the dropdown"
    );
  });

  test("Navbar switch count inside dropdown flyout is exactly 2 elements", () => {
    const navbarSrc = fs.readFileSync(navbarPath, "utf-8");
    
    // Extract dropdown menu snippet
    const menuStartIndex = navbarSrc.indexOf('role="menu"');
    assert.ok(menuStartIndex !== -1, "Dropdown menu must exist");
    
    const menuSnippet = navbarSrc.substring(menuStartIndex, menuStartIndex + 1500);
    
    // Count <Switch instances inside the dropdown menu
    const switchMatches = menuSnippet.match(/<Switch/g) || [];
    assert.strictEqual(
      switchMatches.length,
      2,
      "Dropdown flyout must contain exactly 2 switches (arXiv and X)"
    );

    // Check that there are no additional buttons inside the dropdown menu
    const buttonMatches = menuSnippet.match(/<button/g) || [];
    assert.strictEqual(
      buttonMatches.length,
      0,
      "Dropdown flyout must contain 0 extra buttons (only the 2 switch rows)"
    );
  });
});

describe("Latest Changes Integrity: Blog Datasets Synchronization", () => {
  const rootCustomBlogsPath = path.join(process.cwd(), "custom_blogs.json");
  const pubCustomBlogsPath = path.join(process.cwd(), "public", "custom_blogs.json");

  test("custom_blogs.json and public/custom_blogs.json both exist and parse as valid JSON arrays", () => {
    assert.ok(fs.existsSync(rootCustomBlogsPath), "custom_blogs.json must exist in root");
    assert.ok(fs.existsSync(pubCustomBlogsPath), "public/custom_blogs.json must exist in public directory");

    const rootData = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));
    const pubData = JSON.parse(fs.readFileSync(pubCustomBlogsPath, "utf-8"));

    assert.ok(Array.isArray(rootData), "custom_blogs.json must be an array");
    assert.ok(Array.isArray(pubData), "public/custom_blogs.json must be an array");
    assert.strictEqual(rootData.length, pubData.length, "Both custom_blogs.json files must have identical article counts");
    assert.strictEqual(rootData.length, PRELOADED_BLOGS.length, "custom_blogs.json count must match PRELOADED_BLOGS in src/data.ts");
  });

  test("No duplicate article IDs exist across custom_blogs.json, public/custom_blogs.json, and PRELOADED_BLOGS", () => {
    const rootData: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));
    const pubData: BlogPost[] = JSON.parse(fs.readFileSync(pubCustomBlogsPath, "utf-8"));

    const checkDuplicates = (articles: BlogPost[], name: string) => {
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const a of articles) {
        if (seen.has(a.id)) {
          duplicates.push(a.id);
        }
        seen.add(a.id);
      }
      assert.strictEqual(
        duplicates.length,
        0,
        `Found duplicate IDs in ${name}: ${duplicates.join(", ")}`
      );
    };

    checkDuplicates(rootData, "custom_blogs.json");
    checkDuplicates(pubData, "public/custom_blogs.json");
    checkDuplicates(PRELOADED_BLOGS, "PRELOADED_BLOGS");
  });

  test("Article 'Towards Optimal Quantum Estimators for State Frame Potential' has complete, verified metadata", () => {
    const rootData: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));
    const pubData: BlogPost[] = JSON.parse(fs.readFileSync(pubCustomBlogsPath, "utf-8"));

    const targetId = "generated-1787570419854";
    const rootArticle = rootData.find((b) => b.id === targetId);
    const pubArticle = pubData.find((b) => b.id === targetId);
    const preloadedArticle = PRELOADED_BLOGS.find((b) => b.id === targetId);

    assert.ok(rootArticle, `Article ${targetId} must exist in custom_blogs.json`);
    assert.ok(pubArticle, `Article ${targetId} must exist in public/custom_blogs.json`);
    assert.ok(preloadedArticle, `Article ${targetId} must exist in PRELOADED_BLOGS`);

    // Verify Title
    assert.ok(
      rootArticle!.title.includes("Towards Optimal Quantum Estimators for State Frame Potential"),
      "Title must match the paper topic"
    );
    assert.strictEqual(rootArticle!.title, pubArticle!.title);
    assert.strictEqual(rootArticle!.title, preloadedArticle!.title);

    // Verify Slug
    assert.strictEqual(rootArticle!.slug, "towards-optimal-quantum-estimators-for-state-frame-potential-9854");
    assert.strictEqual(pubArticle!.slug, rootArticle!.slug);
    assert.strictEqual(preloadedArticle!.slug, rootArticle!.slug);

    // Verify arXiv link
    assert.ok(rootArticle!.arxivLink.includes("2408.09854"));
    assert.strictEqual(pubArticle!.arxivLink, rootArticle!.arxivLink);
    assert.strictEqual(preloadedArticle!.arxivLink, rootArticle!.arxivLink);

    // Verify Views and Timestamps
    assert.strictEqual(rootArticle!.views, 1542);
    assert.strictEqual(pubArticle!.views, 1542);
    assert.strictEqual(preloadedArticle!.views, 1542);
    assert.strictEqual(rootArticle!.timestamp, 1787570419854);
    assert.strictEqual(pubArticle!.timestamp, 1787570419854);
    assert.strictEqual(preloadedArticle!.timestamp, 1787570419854);

    // Verify SVG Banner
    assert.ok(rootArticle!.bannerSvg.startsWith("<svg"));
    assert.ok(rootArticle!.bannerSvg.endsWith("</svg>"));
    assert.ok(rootArticle!.bannerSvg.includes("Towards Optimal Quantum Estimators"));

    // Verify Content has LaTeX and Markdown headings
    assert.ok(rootArticle!.content.includes("##"));
    assert.ok(rootArticle!.content.includes("$$"));
    assert.ok(rootArticle!.content.includes("Haar"));
  });

  test("Article 'blog-2609-05052v1-0029' reflects updated timestamp and views consistently", () => {
    const rootData: BlogPost[] = JSON.parse(fs.readFileSync(rootCustomBlogsPath, "utf-8"));
    const pubData: BlogPost[] = JSON.parse(fs.readFileSync(pubCustomBlogsPath, "utf-8"));

    const targetId = "blog-2609-05052v1-0029";
    const rootArticle = rootData.find((b) => b.id === targetId);
    const pubArticle = pubData.find((b) => b.id === targetId);
    const preloadedArticle = PRELOADED_BLOGS.find((b) => b.id === targetId);

    assert.ok(rootArticle, `Article ${targetId} must exist in custom_blogs.json`);
    assert.ok(pubArticle, `Article ${targetId} must exist in public/custom_blogs.json`);
    assert.ok(preloadedArticle, `Article ${targetId} must exist in PRELOADED_BLOGS`);

    // Verify Timestamp
    assert.strictEqual(rootArticle!.timestamp, 1788823182684);
    assert.strictEqual(pubArticle!.timestamp, 1788823182684);
    assert.strictEqual(preloadedArticle!.timestamp, 1788823182684);

    // Verify Views
    assert.strictEqual(rootArticle!.views, 432);
    assert.strictEqual(pubArticle!.views, 432);
    assert.strictEqual(preloadedArticle!.views, 432);
  });
});

describe("Latest Changes Integrity: Authoritative Sitemap Sync", () => {
  const rootSitemapPath = path.join(process.cwd(), "sitemap.xml");
  const pubSitemapPath = path.join(process.cwd(), "public", "sitemap.xml");

  test("sitemap.xml and public/sitemap.xml are identical in content", () => {
    assert.ok(fs.existsSync(rootSitemapPath), "root sitemap.xml must exist");
    assert.ok(fs.existsSync(pubSitemapPath), "public/sitemap.xml must exist");

    const rootContent = fs.readFileSync(rootSitemapPath, "utf-8").trim();
    const pubContent = fs.readFileSync(pubSitemapPath, "utf-8").trim();

    assert.strictEqual(
      rootContent,
      pubContent,
      "sitemap.xml and public/sitemap.xml must be strictly identical"
    );
  });

  test("Sitemaps contain entries for all 102 articles in the publication dataset", () => {
    const sitemapContent = fs.readFileSync(pubSitemapPath, "utf-8");

    for (const blog of PRELOADED_BLOGS) {
      const expectedUrl = `https://ask-meridian.uk/blog/${blog.slug}`;
      assert.ok(
        sitemapContent.includes(expectedUrl),
        `Sitemap is missing expected URL: ${expectedUrl}`
      );
    }
  });

  test("Sitemap contains the latest state frame potential article entry", () => {
    const sitemapContent = fs.readFileSync(pubSitemapPath, "utf-8");
    const expectedUrl = "https://ask-meridian.uk/blog/towards-optimal-quantum-estimators-for-state-frame-potential-9854";
    assert.ok(
      sitemapContent.includes(expectedUrl),
      "Sitemap must contain towards-optimal-quantum-estimators-for-state-frame-potential-9854"
    );
  });
});
