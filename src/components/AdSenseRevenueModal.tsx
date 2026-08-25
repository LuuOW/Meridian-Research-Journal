import React, { useState, useEffect } from "react";
import {
  X,
  TrendingUp,
  DollarSign,
  MousePointer,
  Eye,
  Activity,
  Zap,
  BookOpen,
  Share2,
  Bookmark,
  Volume2,
  FileText,
  RotateCcw,
  Sparkles,
  BarChart3,
  Layers
} from "lucide-react";
import { BlogPost } from "../types";
import {
  calculateCatalogRevenue,
  getInteractionSummary,
  getRecentInteractions,
  resetTelemetry,
  formatCurrency,
  TelemetrySummary,
  InteractionEvent,
  RevenueScenario,
  RevenueEstimation,
  ACADEMIC_PHYSICS_BENCHMARK
} from "../lib/adsenseTracker";

interface AdSenseRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  blogs: BlogPost[];
}

export const AdSenseRevenueModal: React.FC<AdSenseRevenueModalProps> = ({
  isOpen,
  onClose,
  blogs
}) => {
  const [scenario, setScenario] = useState<RevenueScenario>("baseline");
  const [telemetry, setTelemetry] = useState<TelemetrySummary>(getInteractionSummary());
  const [recentEvents, setRecentEvents] = useState<InteractionEvent[]>(getRecentInteractions(12));
  const [activeTab, setActiveTab] = useState<"overview" | "articles" | "telemetry">("overview");

  // Refresh telemetry when modal opens or polls
  useEffect(() => {
    if (!isOpen) return;
    const updateMetrics = () => {
      setTelemetry(getInteractionSummary());
      setRecentEvents(getRecentInteractions(12));
    };
    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const revenueData: RevenueEstimation = calculateCatalogRevenue(blogs, telemetry, scenario);

  const handleResetTelemetry = () => {
    resetTelemetry();
    setTelemetry(getInteractionSummary());
    setRecentEvents([]);
  };

  return (
    <div
      id="adsense-revenue-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white font-sans">
                  AdSense Revenue &amp; Reader Telemetry
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-full bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  Editor Suite
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                ca-pub-7734562716191044 • {ACADEMIC_PHYSICS_BENCHMARK.nicheName}
              </p>
            </div>
          </div>

          <button
            id="close-adsense-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-800 px-6 pt-2 bg-neutral-50/50 dark:bg-neutral-950/30 gap-6 text-xs font-mono font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 transition-colors border-b-2 ${
              activeTab === "overview"
                ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
          >
            Earnings Overview
          </button>
          <button
            onClick={() => setActiveTab("articles")}
            className={`pb-3 transition-colors border-b-2 ${
              activeTab === "articles"
                ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
          >
            Top Earning Papers ({revenueData.topEarningArticles.length})
          </button>
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "telemetry"
                ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
          >
            <span>Live Telemetry</span>
            {telemetry.totalInteractions > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-neutral-800 dark:text-neutral-200">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Scenario Toggle */}
              <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-mono">
                <span className="text-neutral-500 dark:text-neutral-400 pl-2 font-bold uppercase text-[10px]">
                  Model Projection:
                </span>
                <div className="flex gap-1">
                  {(["conservative", "baseline", "optimistic"] as RevenueScenario[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setScenario(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                        scenario === s
                          ? "bg-black text-white dark:bg-white dark:text-black font-bold shadow-sm"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Timeframe Revenue Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Est. Today
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {formatCurrency(revenueData.todayEstimate)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1 font-mono">
                    24h run rate
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    7-Day (Weekly)
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {formatCurrency(revenueData.weeklyEstimate)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1 font-mono">
                    trailing 7d
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    30-Day (Monthly)
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(revenueData.monthlyEstimate)}
                  </div>
                  <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 mt-1 font-mono">
                    monthly recurring
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Projected Annual
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {formatCurrency(revenueData.annualProjected, 0)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1 font-mono">
                    12-mo forward
                  </div>
                </div>
              </div>

              {/* Core Unit Economics Grid */}
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                    Unit Economics &amp; Publishing Performance
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Multiplier: {revenueData.engagementMultiplier}x
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <div className="text-neutral-400 dark:text-neutral-500 text-[10px]">PAGE RPM</div>
                    <div className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                      ${revenueData.pageRpm.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-neutral-400">per 1,000 views</div>
                  </div>

                  <div>
                    <div className="text-neutral-400 dark:text-neutral-500 text-[10px]">IMPRESSION CPM</div>
                    <div className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                      ${revenueData.effectiveCpm.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-neutral-400">per 1,000 ad units</div>
                  </div>

                  <div>
                    <div className="text-neutral-400 dark:text-neutral-500 text-[10px]">EFFECTIVE CPC</div>
                    <div className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                      ${revenueData.effectiveCpc.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-neutral-400">per ad click</div>
                  </div>

                  <div>
                    <div className="text-neutral-400 dark:text-neutral-500 text-[10px]">ESTIMATED CTR</div>
                    <div className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                      {revenueData.effectiveCtrPercent}%
                    </div>
                    <div className="text-[9px] text-neutral-400">click-through rate</div>
                  </div>
                </div>
              </div>

              {/* Volume & Impressions Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">Catalog Pageviews</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {revenueData.pageViews.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">Ad Impressions</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {revenueData.adImpressions.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">Est. Clicks</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {revenueData.estimatedClicks.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOP ARTICLES */}
          {activeTab === "articles" && (
            <div className="space-y-3">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                Articles ranked by estimated AdSense earnings contribution based on readership and content length:
              </div>
              <div className="space-y-2">
                {revenueData.topEarningArticles.map((art, idx) => (
                  <div
                    key={art.id}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[11px] font-mono font-bold flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {art.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{art.views.toLocaleString()} views</span>
                          <span>•</span>
                          <span>RPM: ${art.rpm.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(art.estimatedRevenue)}
                      </div>
                      <div className="text-[9px] text-neutral-400 font-mono">est. lifetime</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE TELEMETRY */}
          {activeTab === "telemetry" && (
            <div className="space-y-6">
              {/* Interaction Matrix */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Tracked Interaction Matrix ({telemetry.totalInteractions} events)
                  </h3>
                  <button
                    onClick={handleResetTelemetry}
                    className="text-[10px] font-mono text-red-500 hover:text-red-600 dark:text-red-400 flex items-center gap-1 cursor-pointer"
                    title="Reset Telemetry Cache"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-neutral-400">Ad Impressions</div>
                      <div className="font-bold text-neutral-900 dark:text-white">{telemetry.adImpressions}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-neutral-400">Ad Clicks</div>
                      <div className="font-bold text-neutral-900 dark:text-white">{telemetry.adClicks}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-neutral-400">Dwell (Engaged)</div>
                      <div className="font-bold text-neutral-900 dark:text-white">{Math.round(telemetry.dwellTimeSeconds / 60)}m {telemetry.dwellTimeSeconds % 60}s</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-neutral-400">Scroll Milestones</div>
                      <div className="font-bold text-neutral-900 dark:text-white">{telemetry.scrollMilestones}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-neutral-400">LaTeX Inspects</div>
                      <div className="font-bold text-neutral-900 dark:text-white">{telemetry.latexInspections}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-pink-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-neutral-400">Audio Plays</div>
                      <div className="font-bold text-neutral-900 dark:text-white">{telemetry.audioPlays}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-orange-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-neutral-400">Bookmarks</div>
                      <div className="font-bold text-neutral-900 dark:text-white">{telemetry.bookmarksToggled}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="text-[9px] text-neutral-400">Shares &amp; Citations</div>
                      <div className="font-bold text-neutral-900 dark:text-white">{telemetry.sharesExecuted + telemetry.citationsCopied}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Interaction Event Ticker */}
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                  Recent Event Stream
                </h3>
                {recentEvents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-400 font-mono border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                    No recent events captured in current session.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {recentEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-850 flex items-center justify-between text-[11px] font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                          <span className="font-bold uppercase text-neutral-700 dark:text-neutral-300">
                            {evt.type.replace(/_/g, " ")}
                          </span>
                          {evt.postTitle && (
                            <span className="text-neutral-400 truncate max-w-xs">
                              {evt.postTitle}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-neutral-400 shrink-0 ml-2">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 flex items-center justify-between text-xs font-mono">
          <div className="text-neutral-400 text-[10px]">
            Live calculations reflect academic niche benchmarks &amp; active viewer telemetry.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-bold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
