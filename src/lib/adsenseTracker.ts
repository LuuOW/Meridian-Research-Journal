/**
 * AdSense Revenue Tracker & Universal Interaction Telemetry Engine
 * 
 * Provides rigorous revenue modeling for academic & scientific publishing
 * and real-time reader interaction tracking across the journal.
 */

import { BlogPost } from "../types";

export type InteractionType =
  | "ad_impression"
  | "ad_click"
  | "page_view"
  | "scroll_depth"
  | "reading_dwell"
  | "audio_play"
  | "latex_inspect"
  | "toc_click"
  | "citation_copy"
  | "bookmark_toggle"
  | "share_click"
  | "arxiv_click"
  | "search_filter"
  | "raytrace_tilt"
  | "theme_toggle";

export interface InteractionEvent {
  id: string;
  type: InteractionType;
  timestamp: number;
  postId?: string;
  postTitle?: string;
  metadata?: Record<string, any>;
}

export interface AdSenseNicheBenchmark {
  nicheName: string;
  baseCpm: number; // Cost Per 1000 Ad Impressions ($)
  baseCpc: number; // Cost Per Ad Click ($)
  expectedCtr: number; // Ad Click-Through-Rate (e.g. 0.016 = 1.6%)
  adsPerArticle: number; // Visible ad units per article page
  avgViewabilityRate: number; // Active viewability percentage (e.g. 0.72 = 72%)
  academicSmartPricingMultiplier: number; // High-intent scholarly traffic premium (1.15x)
}

export const ACADEMIC_PHYSICS_BENCHMARK: AdSenseNicheBenchmark = {
  nicheName: "Quantum Physics & Theoretical Optics",
  baseCpm: 4.80,
  baseCpc: 1.05,
  expectedCtr: 0.0165, // 1.65% CTR
  adsPerArticle: 2, // Top Scholarly Digest + In-Article digest
  avgViewabilityRate: 0.74,
  academicSmartPricingMultiplier: 1.20
};

export const ADSENSE_CONFIG = {
  clientId: "ca-pub-7734562716191044",
  adSlotsPerArticle: 2,
  baselineRpm: 14.50,
  baselineCpc: 0.42,
  baselineCtr: 0.018,
  adFillRate: 0.88,
  nicheBenchmarkRpm: 12.00,
  highEngagementMultiplierCap: 1.45
};

export type AdSenseInteractionEvent = InteractionEvent;
export const getStoredTelemetry = getStoredTelemetryEvents;
export const clearTelemetry = resetTelemetry;



export interface TelemetrySummary {
  totalInteractions: number;
  adImpressions: number;
  adClicks: number;
  pageViews: number;
  dwellTimeSeconds: number;
  scrollMilestones: number;
  latexInspections: number;
  audioPlays: number;
  citationsCopied: number;
  bookmarksToggled: number;
  sharesExecuted: number;
  arxivClicks: number;
  searchQueries: number;
  otherEvents: number;
  lastUpdated: number;
}

export interface RevenueEstimation {
  todayEstimate: number;
  weeklyEstimate: number;
  monthlyEstimate: number;
  annualProjected: number;
  pageViews: number;
  adImpressions: number;
  estimatedClicks: number;
  pageRpm: number; // Revenue per 1,000 page views ($)
  effectiveCpm: number; // Effective Cost per 1,000 ad impressions ($)
  effectiveCpc: number; // Effective Cost per ad click ($)
  effectiveCtrPercent: number; // Active Click-Through-Rate (%)
  engagementMultiplier: number;
  topEarningArticles: Array<{
    id: string;
    title: string;
    views: number;
    estimatedRevenue: number;
    rpm: number;
  }>;
}

export type RevenueScenario = "conservative" | "baseline" | "optimistic";

// Storage Key
const TELEMETRY_STORAGE_KEY = "meridian_adsense_telemetry_v1";
const RECENT_EVENTS_MAX = 50;

// In-memory telemetry buffer
let inMemoryEvents: InteractionEvent[] = [];

/**
 * Initializes and retrieves persisted telemetry events from localStorage.
 */
export function getStoredTelemetryEvents(): InteractionEvent[] {
  if (typeof window === "undefined") return inMemoryEvents;
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return inMemoryEvents;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemoryEvents = parsed;
      return parsed;
    }
  } catch (err) {
    console.debug("[AdSense Tracker] Telemetry load fallback:", err);
  }
  return inMemoryEvents;
}

/**
 * Tracks a reader interaction event and persists telemetry.
 */
export function trackInteraction(
  type: InteractionType,
  metadata?: {
    postId?: string;
    postTitle?: string;
    details?: Record<string, any>;
  }
): InteractionEvent {
  const event: InteractionEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    timestamp: Date.now(),
    postId: metadata?.postId,
    postTitle: metadata?.postTitle,
    metadata: metadata?.details
  };

  inMemoryEvents.unshift(event);
  if (inMemoryEvents.length > 200) {
    inMemoryEvents = inMemoryEvents.slice(0, 200);
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        TELEMETRY_STORAGE_KEY,
        JSON.stringify(inMemoryEvents.slice(0, 150))
      );
    } catch {
      // Storage full or sandboxed
    }
  }

  return event;
}

/**
 * Returns the recent live event stream for the UI ticker.
 */
export function getRecentInteractions(limit: number = RECENT_EVENTS_MAX): InteractionEvent[] {
  const all = getStoredTelemetryEvents();
  return all.slice(0, limit);
}

/**
 * Computes an aggregated count summary of all recorded interactions.
 */
export function getInteractionSummary(events?: InteractionEvent[]): TelemetrySummary {
  const list = events || getStoredTelemetryEvents();

  let adImpressions = 0;
  let adClicks = 0;
  let pageViews = 0;
  let dwellTimeSeconds = 0;
  let scrollMilestones = 0;
  let latexInspections = 0;
  let audioPlays = 0;
  let citationsCopied = 0;
  let bookmarksToggled = 0;
  let sharesExecuted = 0;
  let arxivClicks = 0;
  let searchQueries = 0;
  let otherEvents = 0;

  for (const evt of list) {
    switch (evt.type) {
      case "ad_impression":
        adImpressions++;
        break;
      case "ad_click":
        adClicks++;
        break;
      case "page_view":
        pageViews++;
        break;
      case "reading_dwell":
        dwellTimeSeconds += Number(evt.metadata?.seconds || 15);
        break;
      case "scroll_depth":
        scrollMilestones++;
        break;
      case "latex_inspect":
        latexInspections++;
        break;
      case "audio_play":
        audioPlays++;
        break;
      case "citation_copy":
        citationsCopied++;
        break;
      case "bookmark_toggle":
        bookmarksToggled++;
        break;
      case "share_click":
        sharesExecuted++;
        break;
      case "arxiv_click":
        arxivClicks++;
        break;
      case "search_filter":
        searchQueries++;
        break;
      default:
        otherEvents++;
        break;
    }
  }

  return {
    totalInteractions: list.length,
    adImpressions,
    adClicks,
    pageViews,
    dwellTimeSeconds,
    scrollMilestones,
    latexInspections,
    audioPlays,
    citationsCopied,
    bookmarksToggled,
    sharesExecuted,
    arxivClicks,
    searchQueries,
    otherEvents,
    lastUpdated: list.length > 0 ? list[0].timestamp : Date.now()
  };
}

/**
 * Clears recorded interaction telemetry.
 */
export function resetTelemetry(): void {
  inMemoryEvents = [];
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(TELEMETRY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Computes an Engagement Quality Factor (1.0 to 1.45) based on real interactions.
 * Higher reader dwell time, scroll completion, and formula inspection indicates
 * premium academic traffic with high advertiser bidding value.
 */
export function computeEngagementMultiplier(input?: TelemetrySummary | InteractionEvent[]): number {
  if (!input) return 1.0;

  if (Array.isArray(input)) {
    if (input.length === 0) return 1.0;
    let multiplier = 1.0;
    for (const evt of input) {
      switch (evt.type) {
        case "latex_inspect":
          multiplier += 0.06;
          break;
        case "audio_play":
          multiplier += 0.08;
          break;
        case "scroll_depth":
          multiplier += 0.03;
          break;
        case "reading_dwell":
          multiplier += 0.02;
          break;
        case "share_click":
          multiplier += 0.05;
          break;
        case "citation_copy":
          multiplier += 0.04;
          break;
        case "raytrace_tilt":
          multiplier += 0.01;
          break;
        default:
          multiplier += 0.01;
          break;
      }
    }
    return Math.min(ADSENSE_CONFIG.highEngagementMultiplierCap, parseFloat(multiplier.toFixed(2)));
  }

  const summary = input;
  let multiplier = 1.0;

  // Dwell time bonus: readers staying longer produce higher viewability
  if (summary.dwellTimeSeconds > 300) multiplier += 0.10;
  else if (summary.dwellTimeSeconds > 60) multiplier += 0.05;

  // Scroll milestones bonus: deep article completion
  if (summary.scrollMilestones > 10) multiplier += 0.08;
  else if (summary.scrollMilestones > 3) multiplier += 0.04;

  // Interactive scientific engagement bonus (LaTeX, Audio, Citations)
  const technicalInteractions = summary.latexInspections + summary.audioPlays + summary.citationsCopied;
  if (technicalInteractions > 8) multiplier += 0.12;
  else if (technicalInteractions > 2) multiplier += 0.06;

  // Cap multiplier at realistic bounds
  return Math.min(ADSENSE_CONFIG.highEngagementMultiplierCap, Math.max(0.90, parseFloat(multiplier.toFixed(2))));
}

/**
 * Calculates estimated AdSense revenue for an individual article.
 */
export function calculateArticleRevenue(
  views: number,
  wordCountOrMultiplier: number = 800,
  benchmark: AdSenseNicheBenchmark = ACADEMIC_PHYSICS_BENCHMARK,
  explicitMultiplier?: number
): {
  estimatedRevenue: number;
  rpm: number;
  impressions: number;
  clicks: number;
  multiplier: number;
} {
  const safeViews = Math.max(0, views);
  if (safeViews === 0) {
    return { estimatedRevenue: 0, rpm: 0, impressions: 0, clicks: 0, multiplier: 1.0 };
  }

  // Allow flexible invocation: calculateArticleRevenue(views, 1.3) vs calculateArticleRevenue(views, 800, benchmark, 1.3)
  let wordCount = 800;
  let engagementMultiplier = explicitMultiplier ?? 1.15;

  if (typeof wordCountOrMultiplier === "number") {
    if (wordCountOrMultiplier <= 10 && typeof explicitMultiplier === "undefined") {
      // It was passed as a multiplier (e.g. 1.0 or 1.3)
      engagementMultiplier = wordCountOrMultiplier;
      wordCount = 800;
    } else {
      wordCount = wordCountOrMultiplier;
    }
  }

  // Articles over 1,200 words have more screen length, sustaining full dual-ad exposure
  const lengthFactor = wordCount >= 1000 ? 1.05 : wordCount <= 400 ? 0.85 : 1.0;
  
  // Total Ad Impressions = Views * (Ad Units: 2) * Viewability Rate
  const impressions = Math.round(
    safeViews * benchmark.adsPerArticle * benchmark.avgViewabilityRate * lengthFactor
  );

  const clicks = Math.round(impressions * benchmark.expectedCtr);

  // Revenue = (Impressions / 1000 * CPM) + (Clicks * CPC)
  const cpmRevenue = (impressions / 1000) * benchmark.baseCpm;
  const cpcRevenue = clicks * benchmark.baseCpc;
  const baseRevenue = cpmRevenue + cpcRevenue;

  const totalEstimatedRevenue = parseFloat(
    (baseRevenue * benchmark.academicSmartPricingMultiplier * engagementMultiplier).toFixed(2)
  );

  const rpm = parseFloat(((totalEstimatedRevenue / safeViews) * 1000).toFixed(2));

  return {
    estimatedRevenue: totalEstimatedRevenue,
    rpm,
    impressions,
    clicks,
    multiplier: engagementMultiplier
  };
}

/**
 * Computes full journal AdSense revenue estimation and metric breakdown.
 */
export function calculateCatalogRevenue(
  blogs: BlogPost[],
  telemetrySummary?: TelemetrySummary,
  scenario: RevenueScenario = "baseline",
  customBenchmark: Partial<AdSenseNicheBenchmark> = {}
): RevenueEstimation {
  const benchmark: AdSenseNicheBenchmark = {
    ...ACADEMIC_PHYSICS_BENCHMARK,
    ...customBenchmark
  };

  // Scenario multipliers
  let scenarioFactor = 1.0;
  if (scenario === "conservative") scenarioFactor = 0.70;
  if (scenario === "optimistic") scenarioFactor = 1.40;

  const summary = telemetrySummary || getInteractionSummary();
  const engagementMultiplier = computeEngagementMultiplier(summary) * scenarioFactor;

  let totalViews = 0;
  let totalAdImpressions = 0;
  let totalEstimatedClicks = 0;
  let totalGrossRevenue = 0;

  const articlePerformances: Array<{
    id: string;
    title: string;
    views: number;
    estimatedRevenue: number;
    rpm: number;
  }> = [];

  for (const blog of blogs) {
    const views = typeof blog.views === "number" && blog.views > 0 ? blog.views : 250;
    const words = (blog.content || "").trim().split(/\s+/).filter(Boolean).length || 650;
    
    const articleRev = calculateArticleRevenue(
      views,
      words,
      benchmark,
      engagementMultiplier
    );

    totalViews += views;
    totalAdImpressions += articleRev.impressions;
    totalEstimatedClicks += articleRev.clicks;
    totalGrossRevenue += articleRev.estimatedRevenue;

    articlePerformances.push({
      id: blog.id,
      title: blog.title,
      views,
      estimatedRevenue: articleRev.estimatedRevenue,
      rpm: articleRev.rpm
    });
  }

  // Include live tracked telemetry impressions and clicks if available
  if (summary.adImpressions > 0) {
    totalAdImpressions += summary.adImpressions;
    totalEstimatedClicks += summary.adClicks;
    const liveCpmRev = (summary.adImpressions / 1000) * benchmark.baseCpm;
    const liveCpcRev = summary.adClicks * benchmark.baseCpc;
    totalGrossRevenue += (liveCpmRev + liveCpcRev) * benchmark.academicSmartPricingMultiplier;
  }

  // Sort top earning articles
  articlePerformances.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

  const safeViews = Math.max(1, totalViews);
  const safeImpressions = Math.max(1, totalAdImpressions);

  // Page RPM ($ per 1,000 pageviews)
  const pageRpm = parseFloat(((totalGrossRevenue / safeViews) * 1000).toFixed(2));
  
  // Effective CPM ($ per 1,000 ad impressions)
  const effectiveCpm = parseFloat(((totalGrossRevenue / safeImpressions) * 1000).toFixed(2));

  // Effective CPC ($ per click)
  const effectiveCpc = totalEstimatedClicks > 0
    ? parseFloat((totalGrossRevenue / totalEstimatedClicks).toFixed(2))
    : benchmark.baseCpc;

  // Effective CTR
  const effectiveCtrPercent = parseFloat(
    ((totalEstimatedClicks / safeImpressions) * 100).toFixed(2)
  );

  // Timeframe projections
  // Lifetime catalog views accumulated over ~60 days average baseline
  const dailyEstimate = parseFloat((totalGrossRevenue / 45).toFixed(2));
  const weeklyEstimate = parseFloat((dailyEstimate * 7).toFixed(2));
  const monthlyEstimate = parseFloat((dailyEstimate * 30).toFixed(2));
  const annualProjected = parseFloat((dailyEstimate * 365).toFixed(2));

  return {
    todayEstimate: dailyEstimate,
    weeklyEstimate,
    monthlyEstimate,
    annualProjected,
    pageViews: totalViews,
    adImpressions: totalAdImpressions,
    estimatedClicks: totalEstimatedClicks,
    pageRpm,
    effectiveCpm,
    effectiveCpc,
    effectiveCtrPercent,
    engagementMultiplier: parseFloat(engagementMultiplier.toFixed(2)),
    topEarningArticles: articlePerformances.slice(0, 5)
  };
}

/**
 * Simulates 3 scenario projections for comparison.
 */
export function simulateRevenueScenarios(
  blogs: BlogPost[],
  summary?: TelemetrySummary
): {
  conservative: RevenueEstimation;
  baseline: RevenueEstimation;
  optimistic: RevenueEstimation;
} {
  return {
    conservative: calculateCatalogRevenue(blogs, summary, "conservative"),
    baseline: calculateCatalogRevenue(blogs, summary, "baseline"),
    optimistic: calculateCatalogRevenue(blogs, summary, "optimistic")
  };
}

/**
 * Currency formatter with decimal precision.
 */
export function formatCurrency(amount: number, minimumFractionDigits: number = 2): string {
  if (typeof amount !== "number" || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits: 2
  }).format(amount);
}
