import test from "node:test";
import assert from "node:assert";
import {
  ADSENSE_CONFIG,
  ACADEMIC_PHYSICS_BENCHMARK,
  trackInteraction,
  getStoredTelemetry,
  clearTelemetry,
  getInteractionSummary,
  computeEngagementMultiplier,
  calculateArticleRevenue,
  calculateCatalogRevenue,
  simulateRevenueScenarios,
  formatCurrency,
  AdSenseInteractionEvent
} from "./adsenseTracker";
import { BlogPost } from "../types";

// Mock localStorage if in Node environment without native window.localStorage
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage) {
  (globalThis as any).localStorage = new MockLocalStorage();
}

test("AdSense Config constants & academic physics benchmark parameters", () => {
  assert.strictEqual(ADSENSE_CONFIG.clientId, "ca-pub-7734562716191044");
  assert.strictEqual(ADSENSE_CONFIG.adSlotsPerArticle, 2);
  assert.strictEqual(ADSENSE_CONFIG.baselineRpm, 14.50);
  assert.strictEqual(ADSENSE_CONFIG.baselineCpc, 0.42);
  assert.strictEqual(ADSENSE_CONFIG.baselineCtr, 0.018);
  assert.strictEqual(ADSENSE_CONFIG.adFillRate, 0.88);
  assert.strictEqual(ADSENSE_CONFIG.highEngagementMultiplierCap, 1.45);

  assert.strictEqual(ACADEMIC_PHYSICS_BENCHMARK.baseCpm, 4.80);
  assert.strictEqual(ACADEMIC_PHYSICS_BENCHMARK.baseCpc, 1.05);
  assert.strictEqual(ACADEMIC_PHYSICS_BENCHMARK.expectedCtr, 0.0165);
  assert.strictEqual(ACADEMIC_PHYSICS_BENCHMARK.adsPerArticle, 2);
  assert.strictEqual(ACADEMIC_PHYSICS_BENCHMARK.academicSmartPricingMultiplier, 1.20);
});

test("Universal reader interaction telemetry tracking and storage lifecycle", () => {
  clearTelemetry();
  assert.deepStrictEqual(getStoredTelemetry(), []);

  // Record diverse reader interactions across the platform
  trackInteraction("page_view", { postId: "blog-1", postTitle: "Quantum Topological Phases" });
  trackInteraction("latex_inspect", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { formula: "H = \\sum" } });
  trackInteraction("audio_play", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { duration: 120 } });
  trackInteraction("scroll_depth", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { milestone: 75 } });
  trackInteraction("reading_dwell", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { seconds: 45 } });
  trackInteraction("ad_impression", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { slot: "in-article" } });
  trackInteraction("ad_click", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { slot: "sidebar" } });
  trackInteraction("citation_copy", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { format: "BibTeX" } });
  trackInteraction("bookmark_toggle", { postId: "blog-1", postTitle: "Quantum Topological Phases" });
  trackInteraction("share_click", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { network: "linkedin" } });
  trackInteraction("arxiv_click", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { url: "arxiv.org/abs/2401.00001" } });
  trackInteraction("search_filter", { details: { query: "polariton" } });

  const events = getStoredTelemetry();
  assert.strictEqual(events.length, 12);

  const summary = getInteractionSummary();
  assert.strictEqual(summary.pageViews, 1);
  assert.strictEqual(summary.latexInspections, 1);
  assert.strictEqual(summary.audioPlays, 1);
  assert.strictEqual(summary.scrollMilestones, 1);
  assert.strictEqual(summary.dwellTimeSeconds, 45);
  assert.strictEqual(summary.adImpressions, 1);
  assert.strictEqual(summary.adClicks, 1);
  assert.strictEqual(summary.citationsCopied, 1);
  assert.strictEqual(summary.bookmarksToggled, 1);
  assert.strictEqual(summary.sharesExecuted, 1);
  assert.strictEqual(summary.arxivClicks, 1);
  assert.strictEqual(summary.searchQueries, 1);
  assert.strictEqual(summary.totalInteractions, 12);

  // Clear telemetry
  clearTelemetry();
  assert.strictEqual(getStoredTelemetry().length, 0);
  const resetSummary = getInteractionSummary();
  assert.strictEqual(resetSummary.totalInteractions, 0);
});

test("computeEngagementMultiplier applies technical bonuses up to 1.45 cap", () => {
  // Empty array gives baseline 1.0
  assert.strictEqual(computeEngagementMultiplier([]), 1.0);

  // Array of specific interaction events
  const mockEvents: AdSenseInteractionEvent[] = [
    { id: "1", type: "latex_inspect", timestamp: Date.now(), postId: "p1", postTitle: "T1" }, // +0.06
    { id: "2", type: "audio_play", timestamp: Date.now(), postId: "p1", postTitle: "T1" },    // +0.08
    { id: "3", type: "scroll_depth", timestamp: Date.now(), postId: "p1", postTitle: "T1" },  // +0.03
    { id: "4", type: "reading_dwell", timestamp: Date.now(), postId: "p1", postTitle: "T1" }, // +0.02
    { id: "5", type: "share_click", timestamp: Date.now(), postId: "p1", postTitle: "T1" },   // +0.05
    { id: "6", type: "citation_copy", timestamp: Date.now(), postId: "p1", postTitle: "T1" }, // +0.04
    { id: "7", type: "raytrace_tilt", timestamp: Date.now(), postId: "p1", postTitle: "T1" }, // +0.01
  ];

  const calculated = computeEngagementMultiplier(mockEvents);
  const expected = 1.0 + 0.06 + 0.08 + 0.03 + 0.02 + 0.05 + 0.04 + 0.01;
  assert.ok(Math.abs(calculated - expected) < 0.0001, `Expected ~${expected}, got ${calculated}`);

  // Test cap enforcement
  const heavyEvents: AdSenseInteractionEvent[] = Array.from({ length: 50 }, (_, i) => ({
    id: `ev-${i}`,
    type: "latex_inspect",
    timestamp: Date.now(),
    postId: "p1",
    postTitle: "Heavy"
  }));
  const capped = computeEngagementMultiplier(heavyEvents);
  assert.strictEqual(capped, ADSENSE_CONFIG.highEngagementMultiplierCap);

  // Test TelemetrySummary object input
  const summaryMultiplier = computeEngagementMultiplier({
    totalInteractions: 20,
    adImpressions: 5,
    adClicks: 2,
    pageViews: 10,
    dwellTimeSeconds: 400, // +0.10
    scrollMilestones: 12,  // +0.08
    latexInspections: 5,
    audioPlays: 3,
    citationsCopied: 2,    // technical = 10 -> +0.12
    bookmarksToggled: 1,
    sharesExecuted: 1,
    arxivClicks: 2,
    searchQueries: 3,
    otherEvents: 0,
    lastUpdated: Date.now()
  });
  assert.strictEqual(summaryMultiplier, 1.30);
});

test("calculateArticleRevenue calculates accurate impressions, clicks, RPM, and earnings", () => {
  // Zero views edge case
  const zero = calculateArticleRevenue(0);
  assert.strictEqual(zero.impressions, 0);
  assert.strictEqual(zero.clicks, 0);
  assert.strictEqual(zero.estimatedRevenue, 0);
  assert.strictEqual(zero.rpm, 0);

  // Standard 1000 views with default multiplier 1.0 and 800-word article
  // adsPerArticle = 2, avgViewabilityRate = 0.74, lengthFactor = 1.0
  // impressions = round(1000 * 2 * 0.74 * 1.0) = 1480 impressions
  // clicks = round(1480 * 0.0165) = round(24.42) = 24 clicks
  // cpmRevenue = (1480 / 1000) * 4.80 = $7.104
  // cpcRevenue = 24 * 1.05 = $25.20
  // base = 7.104 + 25.20 = 32.304
  // with academic multiplier 1.20 and engagement 1.0 -> 32.304 * 1.20 * 1.0 = $38.76
  // rpm = (38.76 / 1000) * 1000 = $38.76
  const rev1000 = calculateArticleRevenue(1000, 1.0);
  assert.strictEqual(rev1000.impressions, 1480);
  assert.strictEqual(rev1000.clicks, 24);
  assert.ok(rev1000.estimatedRevenue >= 38 && rev1000.estimatedRevenue <= 39, `Got: ${rev1000.estimatedRevenue}`);
  assert.ok(rev1000.rpm >= 38 && rev1000.rpm <= 39, `Got RPM: ${rev1000.rpm}`);

  // Test higher engagement multiplier boosts RPM & revenue proportionally
  const revBoosted = calculateArticleRevenue(1000, 1.30);
  assert.ok(revBoosted.estimatedRevenue > rev1000.estimatedRevenue);
  assert.strictEqual(revBoosted.multiplier, 1.30);
});

test("calculateCatalogRevenue aggregates portfolio performance and projections across journal", () => {
  clearTelemetry();

  const mockBlogs: BlogPost[] = [
    {
      id: "blog-1",
      title: "Topological Metamaterials and Photonic Hall Dynamics",
      slug: "topological-metamaterials-and-photonic-hall-dynamics",
      excerpt: "A study on photonic spin hall effect",
      content: "Deep math derivations with extensive technical formulation and analysis.",
      author: "Dr. Meridian",
      date: "2026-03-01",
      readingTime: "6 min read",
      tags: ["Physics", "Topology"],
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2401.00001",
      views: 1200
    },
    {
      id: "blog-2",
      title: "Superconducting Qubits and Josephson Junction Noise",
      slug: "superconducting-qubits-and-josephson-junction-noise",
      excerpt: "Josephson junction noise decoherence",
      content: "Quantum electrodynamics Hamiltonian derivations in superconducting circuits.",
      author: "Dr. Meridian",
      date: "2026-03-02",
      readingTime: "8 min read",
      tags: ["Quantum", "Hardware"],
      bannerSvg: "<svg></svg>",
      arxivLink: "https://arxiv.org/abs/2401.00002",
      views: 800
    }
  ];

  const catalog = calculateCatalogRevenue(mockBlogs);

  assert.strictEqual(catalog.pageViews, 2000);
  assert.ok(catalog.adImpressions > 0);
  assert.ok(catalog.estimatedClicks > 0);
  assert.ok(catalog.todayEstimate > 0);
  assert.ok(catalog.weeklyEstimate > catalog.todayEstimate);
  assert.ok(catalog.monthlyEstimate > catalog.weeklyEstimate);
  assert.ok(catalog.annualProjected > catalog.monthlyEstimate);
  assert.strictEqual(catalog.topEarningArticles.length, 2);
  assert.strictEqual(catalog.topEarningArticles[0].title, "Topological Metamaterials and Photonic Hall Dynamics");

  // Verify scenario simulation
  const scenarios = simulateRevenueScenarios(mockBlogs);
  assert.ok(scenarios.optimistic.todayEstimate > scenarios.baseline.todayEstimate);
  assert.ok(scenarios.baseline.todayEstimate > scenarios.conservative.todayEstimate);
});

test("formatCurrency formats US Dollar financial representations cleanly", () => {
  assert.strictEqual(formatCurrency(0), "$0.00");
  assert.strictEqual(formatCurrency(0.004), "$0.00");
  assert.strictEqual(formatCurrency(0.05), "$0.05");
  assert.strictEqual(formatCurrency(14.5), "$14.50");
  assert.strictEqual(formatCurrency(1240.75), "$1,240.75");
  assert.strictEqual(formatCurrency(15000, 0), "$15,000");
});
