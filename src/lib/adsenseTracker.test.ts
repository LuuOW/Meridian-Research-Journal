import test from "node:test";
import assert from "node:assert";
import {
  ADSENSE_CONFIG,
  trackInteraction,
  getStoredTelemetry,
  clearTelemetry,
  getInteractionSummary,
  computeEngagementMultiplier,
  calculateArticleRevenue,
  calculateCatalogRevenue,
  formatCurrency,
  AdSenseInteractionEvent
} from "./adsenseTracker";
import { BlogPost } from "../types";

// Mock localStorage if in node environment without native window.localStorage
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

test("AdSense Config constants and benchmarks", () => {
  assert.strictEqual(ADSENSE_CONFIG.clientId, "ca-pub-7734562716191044");
  assert.strictEqual(ADSENSE_CONFIG.adSlotsPerArticle, 2);
  assert.strictEqual(ADSENSE_CONFIG.baselineRpm, 14.50);
  assert.strictEqual(ADSENSE_CONFIG.baselineCpc, 0.42);
  assert.strictEqual(ADSENSE_CONFIG.baselineCtr, 0.018);
  assert.strictEqual(ADSENSE_CONFIG.adFillRate, 0.88);
  assert.strictEqual(ADSENSE_CONFIG.nicheBenchmarkRpm, 12.00);
  assert.strictEqual(ADSENSE_CONFIG.highEngagementMultiplierCap, 1.45);
});

test("Telemetry Interaction tracking & storage lifecycle", () => {
  clearTelemetry();
  assert.deepStrictEqual(getStoredTelemetry(), []);

  // Record diverse interaction types
  trackInteraction("page_view", { postId: "blog-1", postTitle: "Quantum Topological Phases" });
  trackInteraction("latex_inspect", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { formula: "H = \\sum" } });
  trackInteraction("audio_play", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { duration: 120 } });
  trackInteraction("scroll_depth", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { milestone: 75 } });
  trackInteraction("ad_impression", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { slot: "in-article" } });
  trackInteraction("ad_click", { postId: "blog-1", postTitle: "Quantum Topological Phases", details: { slot: "sidebar" } });

  const events = getStoredTelemetry();
  assert.strictEqual(events.length, 6);

  const summary = getInteractionSummary();
  assert.strictEqual(summary.pageViews, 1);
  assert.strictEqual(summary.latexInspections, 1);
  assert.strictEqual(summary.audioPlays, 1);
  assert.strictEqual(summary.scrollDepthMilestones, 1);
  assert.strictEqual(summary.adImpressions, 1);
  assert.strictEqual(summary.adClicks, 1);
  assert.strictEqual(summary.totalInteractions, 6);

  // Clear telemetry
  clearTelemetry();
  assert.strictEqual(getStoredTelemetry().length, 0);
  const resetSummary = getInteractionSummary();
  assert.strictEqual(resetSummary.totalInteractions, 0);
});

test("computeEngagementMultiplier applies progressive interaction bonuses up to cap", () => {
  // Empty events list gives baseline 1.0
  assert.strictEqual(computeEngagementMultiplier([]), 1.0);

  // Test individual bonuses
  const mockEvents: AdSenseInteractionEvent[] = [
    { id: "1", type: "latex_inspect", timestamp: Date.now(), postId: "p1", postTitle: "T1" }, // +0.06
    { id: "2", type: "audio_play", timestamp: Date.now(), postId: "p1", postTitle: "T1" },    // +0.08
    { id: "3", type: "scroll_depth", timestamp: Date.now(), postId: "p1", postTitle: "T1" },  // +0.03
    { id: "4", type: "reading_dwell", timestamp: Date.now(), postId: "p1", postTitle: "T1" }, // +0.02
    { id: "5", type: "share_click", timestamp: Date.now(), postId: "p1", postTitle: "T1" },   // +0.05
    { id: "6", type: "raytrace_tilt", timestamp: Date.now(), postId: "p1", postTitle: "T1" }, // +0.01
  ];

  const calculated = computeEngagementMultiplier(mockEvents);
  const expected = 1.0 + 0.06 + 0.08 + 0.03 + 0.02 + 0.05 + 0.01;
  assert.ok(Math.abs(calculated - expected) < 0.0001, `Expected ~${expected}, got ${calculated}`);

  // Test cap at 1.45 with overwhelming interactions
  const heavyEvents: AdSenseInteractionEvent[] = Array.from({ length: 100 }, (_, i) => ({
    id: `ev-${i}`,
    type: "latex_inspect",
    timestamp: Date.now(),
    postId: "p1",
    postTitle: "Heavy Interactions"
  }));

  const capped = computeEngagementMultiplier(heavyEvents);
  assert.strictEqual(capped, ADSENSE_CONFIG.highEngagementMultiplierCap);
});

test("calculateArticleRevenue calculates accurate impressions, clicks, RPM, and earnings", () => {
  // Zero views
  const zero = calculateArticleRevenue(0);
  assert.strictEqual(zero.views, 0);
  assert.strictEqual(zero.impressions, 0);
  assert.strictEqual(zero.clicks, 0);
  assert.strictEqual(zero.estimatedRevenue, 0);

  // Standard 1000 views with default multiplier 1.0
  // Ad slots per article = 2, fill rate = 0.88 -> 1000 * 2 * 0.88 = 1760 impressions
  // CTR = 0.018 -> round(1760 * 0.018) = round(31.68) = 32 clicks
  // CPM Revenue = (1760 / 1000) * 4.80 = $8.448
  // CPC Revenue = 32 * 0.42 = $13.44
  // Total = 8.448 + 13.44 = $21.888
  // RPM = (21.888 / 1000) * 1000 = $21.89
  const rev1000 = calculateArticleRevenue(1000, 1.0);
  assert.strictEqual(rev1000.views, 1000);
  assert.strictEqual(rev1000.impressions, 1760);
  assert.strictEqual(rev1000.clicks, 32);
  assert.ok(rev1000.estimatedRevenue > 21 && rev1000.estimatedRevenue < 22, `Estimated revenue: ${rev1000.estimatedRevenue}`);
  assert.ok(rev1000.rpm > 21 && rev1000.rpm < 22, `RPM: ${rev1000.rpm}`);

  // Test higher engagement multiplier boosts RPM & revenue proportionally
  const revBoosted = calculateArticleRevenue(1000, 1.30);
  assert.ok(revBoosted.estimatedRevenue > rev1000.estimatedRevenue);
  assert.strictEqual(revBoosted.multiplier, 1.30);
});

test("calculateCatalogRevenue aggregates portfolio performance across blog collection", () => {
  clearTelemetry();

  const mockBlogs: BlogPost[] = [
    {
      id: "blog-1",
      title: "Topological Metamaterials",
      excerpt: "A study on photonic spin hall effect",
      content: "Deep math derivations",
      author: "Dr. Meridian",
      date: "2026-03-01",
      readingTime: "6 min read",
      tags: ["Physics", "Topology"],
      bannerSvg: "<svg></svg>",
      arxivId: "2401.00001",
      views: 1200
    },
    {
      id: "blog-2",
      title: "Superconducting Qubits",
      excerpt: "Josephson junction noise decoherence",
      content: "Quantum electrodynamics",
      author: "Dr. Meridian",
      date: "2026-03-02",
      readingTime: "8 min read",
      tags: ["Quantum", "Hardware"],
      bannerSvg: "<svg></svg>",
      arxivId: "2401.00002",
      views: 800
    }
  ];

  const catalog = calculateCatalogRevenue(mockBlogs);

  assert.strictEqual(catalog.totalArticles, 2);
  assert.strictEqual(catalog.totalViews, 2000);
  assert.strictEqual(catalog.totalImpressions, Math.round(2000 * 2 * 0.88));
  assert.ok(catalog.totalEstimatedRevenue > 0);
  assert.ok(catalog.todayEstimate > 0);
  assert.ok(catalog.thirtyDayProjection > catalog.todayEstimate);
  assert.strictEqual(catalog.articles.length, 2);
  assert.strictEqual(catalog.articles[0].title, "Topological Metamaterials");
});

test("formatCurrency outputs polished financial strings", () => {
  assert.strictEqual(formatCurrency(0), "$0.00");
  assert.strictEqual(formatCurrency(0.004), "$0.00");
  assert.strictEqual(formatCurrency(0.05), "$0.05");
  assert.strictEqual(formatCurrency(14.5), "$14.50");
  assert.strictEqual(formatCurrency(1240.75), "$1,240.75");
});
