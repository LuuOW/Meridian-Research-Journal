import { test } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { PRELOADED_BLOGS } from "../data";
import { BlogPost } from "../types";
import {
  sortBlogsByPublicationDate,
  parsePublicationDate,
  getBlogTimestamp,
  isManualGeneratedBlog
} from "./viewCounter";
import {
  validateCategoryPolicy,
  validateEditorialKeywordsPolicy,
  validateDailyCadencePolicy,
  MANDATORY_HEP_DISCIPLINES
} from "./arxivAutonomousPipeline";
import {
  buildAdaptiveArxivQueryUrl,
  scoreArxivCandidate,
  HEP_KEYWORD_TAXONOMY
} from "./dailyEditorialEngine";
import { resolveBlogSlugOrId } from "./slugResolver";

test("1. Monotonic Chronological Order: All published articles are in strictly descending order with NO jumps", () => {
  const blogs = [...PRELOADED_BLOGS];
  assert.ok(blogs.length >= 100, `Expected at least 100 articles in corpus, found ${blogs.length}`);

  const sorted = sortBlogsByPublicationDate(blogs, "desc");
  assert.strictEqual(sorted.length, blogs.length, "Sorted array length must match input");

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const currentDate = parsePublicationDate(current.date);
    const nextDate = parsePublicationDate(next.date);

    assert.ok(currentDate, `Article ${current.id} must have a parseable date string: "${current.date}"`);
    assert.ok(nextDate, `Article ${next.id} must have a parseable date string: "${next.date}"`);

    const currentTs = currentDate.getTime();
    const nextTs = nextDate.getTime();

    // Must be descending: currentTs >= nextTs
    assert.ok(
      currentTs >= nextTs,
      `Chronological disorder detected at index ${i} (${current.date} -> ${next.date}): ` +
      `"${current.title}" (${current.id}) is placed before "${next.title}" (${next.id})`
    );

    // Verify there is no jump between August 24 and September 20:
    // If current is in September, next cannot jump backwards skipping all of late August/early September
    if (current.date.includes("September") && next.date.includes("August")) {
      const dayDiff = (currentTs - nextTs) / (1000 * 60 * 60 * 24);
      // Seamless bridge across months: between Sep 1 and Aug 29 is only ~3 days
      assert.ok(
        dayDiff <= 7,
        `Unexpected temporal jump of ${dayDiff.toFixed(1)} days between "${current.title}" (${current.date}) ` +
        `and "${next.title}" (${next.date})`
      );
    }
  }
});

test("2. Exhaustive Audit: Zero duplicate articles (no duplicate titles, IDs, or slugs)", () => {
  const customPath = path.join(process.cwd(), "custom_blogs.json");
  assert.ok(fs.existsSync(customPath), "custom_blogs.json must exist");
  const blogs: BlogPost[] = JSON.parse(fs.readFileSync(customPath, "utf-8"));

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenTitles = new Set<string>();

  for (const b of blogs) {
    assert.ok(b.id, "Article must have an ID");
    assert.ok(!seenIds.has(b.id), `Duplicate ID detected: "${b.id}" in article "${b.title}"`);
    seenIds.add(b.id);

    if (b.slug) {
      assert.ok(!seenSlugs.has(b.slug), `Duplicate slug detected: "${b.slug}" in article "${b.title}"`);
      seenSlugs.add(b.slug);
    }

    const normTitle = b.title.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    assert.ok(
      !seenTitles.has(normTitle),
      `Duplicate title detected: "${b.title}" (ID: ${b.id}) was already registered`
    );
    seenTitles.add(normTitle);
  }
});

test("3. Banners Audit: 100% of articles have valid, non-empty, rich SVG banners", () => {
  const customPath = path.join(process.cwd(), "custom_blogs.json");
  const blogs: BlogPost[] = JSON.parse(fs.readFileSync(customPath, "utf-8"));

  for (const b of blogs) {
    assert.ok(
      b.bannerSvg && typeof b.bannerSvg === "string" && b.bannerSvg.trim().length > 50,
      `Article "${b.title}" (${b.id}) is missing a valid SVG banner (length: ${b.bannerSvg?.length || 0})`
    );
    assert.ok(
      b.bannerSvg.includes("<svg") && b.bannerSvg.includes("</svg>"),
      `Article "${b.title}" banner must contain valid SVG tags`
    );
  }
});

test("4. Title Hygiene Audit: Zero weird titles or synthetic test artifacts exist", () => {
  const customPath = path.join(process.cwd(), "custom_blogs.json");
  const blogs: BlogPost[] = JSON.parse(fs.readFileSync(customPath, "utf-8"));

  for (const b of blogs) {
    assert.ok(
      !b.title.toLowerCase().startsWith("arxiv paper 2608"),
      `Weird test title detected: "${b.title}" (${b.id})`
    );
    assert.ok(
      !b.title.includes("2608.99991"),
      `Synthetic arXiv paper artifact title detected: "${b.title}"`
    );
    assert.ok(
      !b.id.startsWith("blog-test-"),
      `Test mock article detected: "${b.id}"`
    );
    assert.ok(
      b.id !== "blog-device-new" && b.id !== "test-snapshot-blog-1",
      `Synthetic fixture ID detected: "${b.id}"`
    );
  }
});

test("5. Resonant Neutrino Article: Exactly ONE canonical copy published with full banner and URL slug 2945", () => {
  const customPath = path.join(process.cwd(), "custom_blogs.json");
  const blogs: BlogPost[] = JSON.parse(fs.readFileSync(customPath, "utf-8"));

  const neutrinoArticles = blogs.filter(b =>
    b.title.toLowerCase().includes("resonant neutrino flavor conversion")
  );

  assert.strictEqual(
    neutrinoArticles.length,
    1,
    `Resonant neutrino article must exist exactly once (zero duplicates). Found ${neutrinoArticles.length} copies.`
  );

  const neutrino = neutrinoArticles[0];
  assert.strictEqual(
    neutrino.slug,
    "resonant-neutrino-flavor-conversion-within-dark-matter-spikes-2945",
    "Slug must match canonical published URL ending in 2945"
  );
  assert.ok(
    neutrino.bannerSvg && neutrino.bannerSvg.length > 500,
    "Resonant neutrino article must have a full, high-fidelity SVG banner"
  );

  // Test slug resolution handles both -2945 and legacy -4898 seamlessly
  const resolved2945 = resolveBlogSlugOrId("resonant-neutrino-flavor-conversion-within-dark-matter-spikes-2945", blogs);
  assert.ok(resolved2945, "Must resolve slug ending in 2945");
  assert.strictEqual(resolved2945?.id, neutrino.id);

  const resolved4898 = resolveBlogSlugOrId("resonant-neutrino-flavor-conversion-within-dark-matter-spikes-4898", blogs);
  assert.ok(resolved4898, "Must resolve legacy slug ending in 4898 via alias");
  assert.strictEqual(resolved4898?.id, neutrino.id);
});

test("6. High Energy Physics Category Policy: Only hep-ex, hep-lat, hep-th, and hep-ph are allowed", () => {
  // Test each mandatory HEP category
  for (const cat of MANDATORY_HEP_DISCIPLINES) {
    const candidate = {
      id: "2609.55555",
      title: "Neutrino mass generation in electroweak theory",
      summary: "We analyze high-energy photons emitted during neutrino decay.",
      authors: "H. Bethe, W. Pauli",
      primaryCategory: cat,
      categories: [cat]
    };
    const result = validateCategoryPolicy(candidate);
    assert.strictEqual(result.allowed, true, `Category ${cat} must be approved`);
    assert.strictEqual(result.matchedCategory, cat);
  }

  // Optics and quant-ph are now rejected under the new category mandate
  const opticsCandidate = {
    id: "2609.11111",
    title: "Dielectric Metasurface Waveguides",
    summary: "Photonic bandgap calculations.",
    authors: "E. Yablonovitch",
    primaryCategory: "physics.optics",
    categories: ["physics.optics"]
  };
  const opticsResult = validateCategoryPolicy(opticsCandidate);
  assert.strictEqual(opticsResult.allowed, false, "physics.optics must be rejected under new HEP mandate");

  const quantPhCandidate = {
    id: "2609.22222",
    title: "Quantum State Tomography",
    summary: "Qubit Hamiltonian reconstruction.",
    authors: "A. Aspect",
    primaryCategory: "quant-ph",
    categories: ["quant-ph"]
  };
  const quantResult = validateCategoryPolicy(quantPhCandidate);
  assert.strictEqual(quantResult.allowed, false, "quant-ph must be rejected under new HEP mandate");
});

test("7. Editorial Keyword Validation: Neutrino in title AND Photon in body/description", () => {
  // Valid candidate: Neutrino in title, Photon in description
  const valid = {
    title: "Resonant Neutrino Flavor Conversion in Extreme Magnetic Fields",
    summary: "Loop-induced photon couplings mediate electromagnetic energy dissipation.",
    content: "Full derivations of the neutrino-photon vertex."
  };
  const validResult = validateEditorialKeywordsPolicy(valid);
  assert.strictEqual(validResult.allowed, true);
  assert.strictEqual(validResult.hasNeutrinoInTitle, true);
  assert.strictEqual(validResult.hasPhotonInBodyOrDescription, true);

  // Missing neutrino in title -> REJECTED
  const missingNeutrino = {
    title: "Lepton Flavor Violation in Grand Unified Theories",
    summary: "Secondary photon emission provides observational signatures.",
    content: "Photon cross-section calculations."
  };
  const missingNeutrinoResult = validateEditorialKeywordsPolicy(missingNeutrino);
  assert.strictEqual(missingNeutrinoResult.allowed, false);
  assert.strictEqual(missingNeutrinoResult.hasNeutrinoInTitle, false);
  assert.ok(missingNeutrinoResult.rejectedReason?.includes("neutrino"));

  // Missing photon in body/description -> REJECTED
  const missingPhoton = {
    title: "Sterile Neutrino Oscillations at Short Baselines",
    summary: "Measurement of mass squared splittings using muon disappearance.",
    content: "Neutrino flux parameters and covariance matrices."
  };
  const missingPhotonResult = validateEditorialKeywordsPolicy(missingPhoton);
  assert.strictEqual(missingPhotonResult.allowed, false);
  assert.strictEqual(missingPhotonResult.hasPhotonInBodyOrDescription, false);
  assert.ok(missingPhotonResult.rejectedReason?.includes("photon"));
});

test("8. Daily Cadence Policy: Exactly 1 article allowed per day", () => {
  const existingList: BlogPost[] = [
    {
      id: "blog-today-1",
      slug: "neutrino-oscillation-parameters-precision-photon-limits",
      title: "Neutrino Oscillation Parameters: Precision Photon Limits",
      date: "September 28, 2026",
      bannerSvg: "<svg></svg>",
      excerpt: "Description with photon keyword",
      content: "Content",
      author: "Meridian",
      readingTime: "5 min",
      arxivLink: "https://arxiv.org/abs/2609.11111",
      tags: ["hep-ph"]
    }
  ];

  // Attempting to publish another article for the same day (September 28, 2026) -> REJECTED
  const sameDayCheck = validateDailyCadencePolicy("September 28, 2026", existingList);
  assert.strictEqual(sameDayCheck.allowed, false, "Must reject second article on the same date");
  assert.strictEqual(sameDayCheck.publishedTodayCount, 1);
  assert.ok(sameDayCheck.rejectedReason?.includes("cadence limit"));

  // Attempting for tomorrow (September 29, 2026) -> ALLOWED
  const nextDayCheck = validateDailyCadencePolicy("September 29, 2026", existingList);
  assert.strictEqual(nextDayCheck.allowed, true, "Must allow dispatch on fresh date");
  assert.strictEqual(nextDayCheck.publishedTodayCount, 0);
});

test("9. arXiv Adaptive Query URL targets all 4 HEP disciplines with neutrino keyword", () => {
  const queryUrl = buildAdaptiveArxivQueryUrl("hep-ph", 2);
  assert.ok(queryUrl.includes("cat:hep-ex"), "Query must include cat:hep-ex");
  assert.ok(queryUrl.includes("cat:hep-lat"), "Query must include cat:hep-lat");
  assert.ok(queryUrl.includes("cat:hep-th"), "Query must include cat:hep-th");
  assert.ok(queryUrl.includes("cat:hep-ph"), "Query must include cat:hep-ph");
  assert.ok(queryUrl.includes("neutrino"), "Query must target neutrino keyword");
});

test("10. scoreArxivCandidate scores HEP papers with neutrino title and photon body highest", () => {
  const mockCorpus: any = { recommendedCategory: "hep-ph", recentTopics: [] };
  const existingIds = new Set<string>();

  // Optimal candidate: HEP category + Neutrino title + Photon text
  const optimalPaper: any = {
    id: "2609.88881",
    title: "Resonant Neutrino Oscillation in Galactic Halo Environments",
    summary: "Cherenkov photons produced by secondary relativistic electrons establish detection thresholds.",
    primaryCategory: "hep-ph",
    categories: ["hep-ph"]
  };
  const optimalScore = scoreArxivCandidate(optimalPaper, mockCorpus, existingIds);
  assert.ok(optimalScore.score >= 100, `Expected high score for optimal candidate, got ${optimalScore.score}`);
  assert.strictEqual(optimalScore.category, "hep-ph");

  // Non-HEP paper: Disqualified
  const nonHepPaper: any = {
    id: "2609.88882",
    title: "Silicon Photonic Waveguide Arrays",
    summary: "Optics simulation.",
    primaryCategory: "physics.optics",
    categories: ["physics.optics"]
  };
  const nonHepScore = scoreArxivCandidate(nonHepPaper, mockCorpus, existingIds);
  assert.ok(nonHepScore.score <= -500, "Non-HEP candidate must be disqualified with negative score");
});
