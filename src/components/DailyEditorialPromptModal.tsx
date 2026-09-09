import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import {
  Clock,
  Send,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Binary,
  Layers,
  Eye,
  ShieldCheck,
  Check,
  Calendar,
  Compass,
  ArrowRight,
  ArrowLeft,
  Info,
  Flame,
  Zap,
  Sliders,
  Maximize2
} from "lucide-react";
import { BlogPost } from "../types";
import { EditorialCandidate } from "../lib/dailyEditorialEngine";
import {
  computeRayTracedLightState,
  calculateNormalizedCursor,
  getDefaultLightState,
  LightState
} from "../lib/rayTracingUtils";
import { ObservatoryTelemetryDeck } from "./ObservatoryTelemetryDeck";

export interface StagedDispatchResponse {
  success: boolean;
  dispatch: {
    id: string;
    dateArt: string;
    dayOfWeek: number;
    dayName: string;
    sourceArxivBatchDay: string;
    scheduledFor: number;
    autoPublishAt: number;
    status: "staged_pending_review" | "accepted_and_published" | "auto_published" | "redrafted";
    selectedCategory: "physics.optics" | "quant-ph";
    candidatePaper: {
      id: string;
      title: string;
      summary: string;
      authors: string;
      category: "physics.optics" | "quant-ph";
      score: number;
      relevanceReason: string;
      link?: string;
    };
    alternateCandidates: Array<{
      id: string;
      title: string;
      summary: string;
      authors: string;
      category: "physics.optics" | "quant-ph";
      score: number;
    }>;
    candidatesDeck?: EditorialCandidate[];
    activeCandidateIndex?: number;
    draftArticle: BlogPost;
    xPost: {
      postText: string;
      standardText?: string;
      headline: string;
      hashtags: string[];
      characterCount: number;
      sentenceCount: number;
      canonicalUrl: string;
    };
    publishedAt?: number;
    publishedVia?: "manual_editor_accept" | "auto_timeout_publish";
    xPostResult?: {
      success: boolean;
      mode: string;
      tweetId?: string;
      tweetUrl?: string;
      message?: string;
      error?: string;
    };
    corpusAnalysis: {
      totalArticlesAnalyzed: number;
      opticsRatio: number;
      quantPhRatio: number;
      selectionRationale: string;
    };
  } | null;
  artInfo: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    dayOfWeek: number;
    dayName: string;
    dateString: string;
    isReviewWindow: boolean;
    isPast10AmArt: boolean;
    millisUntil10Am: number;
  };
  countdownSeconds: number;
}

interface DailyEditorialPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArticlePublished?: (newBlog: BlogPost) => void;
  onOpenInEditor?: (draft: BlogPost) => void;
  onOpenXTest?: () => void;
  theme?: "light" | "dark";
}

export const DailyEditorialPromptModal: React.FC<DailyEditorialPromptModalProps> = ({
  isOpen,
  onClose,
  onArticlePublished,
  onOpenInEditor,
  onOpenXTest,
  theme = "dark",
}) => {
  const isLight = theme === "light";
  const [data, setData] = useState<StagedDispatchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [tweetText, setTweetText] = useState<string>("");
  const [tweetMode, setTweetMode] = useState<"standard" | "full">("full");
  const [publishSuccess, setPublishSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Tinder Card Stack State
  const [currentDeckIndex, setCurrentDeckIndex] = useState<number>(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [dragProgress, setDragProgress] = useState<number>(0); // -1 (left) to +1 (right)

  // Raytracing lighting state
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [lightState, setLightState] = useState<LightState>(getDefaultLightState());
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Motion values for swipe gesture
  const dragX = useMotionValue(0);
  const cardRotate = useTransform(dragX, [-250, 0, 250], [-18, 0, 18]);
  const cardOpacity = useTransform(dragX, [-300, -180, 0, 180, 300], [0.3, 0.9, 1, 0.9, 0.3]);
  const approveOpacity = useTransform(dragX, [30, 120], [0, 1]);
  const rejectOpacity = useTransform(dragX, [-30, -120], [0, 1]);

  // Raytracing mouse movement tracker
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
    const calculatedLight = computeRayTracedLightState(normX, normY, 6, 24);
    setLightState(calculatedLight);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setLightState(getDefaultLightState());
  };

  // Real-time live ART (Argentina Time, UTC-3) clock ticker
  const [liveArtClock, setLiveArtClock] = useState<string>("");

  useEffect(() => {
    const updateArt = () => {
      try {
        const now = new Date();
        const timeStr = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);
        setLiveArtClock(`${timeStr} ART (UTC-3)`);
      } catch {
        setLiveArtClock("09:00:00 ART (UTC-3)");
      }
    };
    updateArt();
    const interval = setInterval(updateArt, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic next-day cadence label
  const dynamicCadenceLabel = useMemo(() => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `Next-Day Cadence: 4 Articles queued for tomorrow (${dateStr}) 09:00 AM ART`;
    } catch {
      return "Next-Day Cadence: 4 Articles queued for tomorrow 09:00 AM ART";
    }
  }, []);

  // Fetch current daily dispatch
  const fetchDispatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-dispatch/current");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StagedDispatchResponse = await res.json();
      setData(json);

      const activeCandidateIdx = json.dispatch?.activeCandidateIndex ?? 0;
      setCurrentDeckIndex(activeCandidateIdx);

      if (json.dispatch?.xPost?.postText) {
        setTweetText(json.dispatch.xPost.postText);
      }
      setRemainingSeconds(json.countdownSeconds || 0);
    } catch (err: any) {
      console.error("Failed to load daily dispatch:", err);
      setError(err.message || "Failed to load staged dispatch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDispatch();
    }
  }, [isOpen]);

  // Countdown timer to 10:00 AM ART
  useEffect(() => {
    if (!isOpen || remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          fetchDispatch(); // Refresh state upon 10 AM timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, remainingSeconds]);

  // Filter for candidate deck: Default to "sep3" (showing all 4 September 3 candidates) with option for "all"
  const [deckFilter, setDeckFilter] = useState<"sep3" | "all">("sep3");

  // Collapsible UI show/hide toggles for sleek uncluttered editing
  const [showTelemetry, setShowTelemetry] = useState<boolean>(false);
  const [showCandidateDeck, setShowCandidateDeck] = useState<boolean>(false);
  const [showCorpusAnalysis, setShowCorpusAnalysis] = useState<boolean>(false);
  const [showArticleDraftPreview, setShowArticleDraftPreview] = useState<boolean>(false);

  // Check if current date or dispatch is weekend
  const isWeekend = Boolean(data?.artTime?.isWeekend ?? (data?.dispatch?.dayOfWeek === 0 || data?.dispatch?.dayOfWeek === 6));

  // Candidate deck from response
  const candidatesDeck: EditorialCandidate[] = data?.dispatch?.candidatesDeck || [];

  // Filtered deck: defaults to the 4 September 3 candidates
  const displayedDeck: EditorialCandidate[] = useMemo(() => {
    if (deckFilter === "sep3") {
      const sep3List = candidatesDeck.filter((c) => {
        const arxivDate = c.dateComparison?.arxivPubDate || "";
        const isSep3Date = arxivDate.includes("September 3") || arxivDate.includes("Sep 3");
        const isSep3Id = ["2609.02603", "2609.02698", "2609.02741", "2609.02815"].some(
          (id) => (c.arxivId && c.arxivId.includes(id)) || (c.id && c.id.includes(id))
        );
        const isPipeline = c.source === "meridian_pipeline";
        return isSep3Date || isSep3Id || isPipeline;
      });
      return sep3List.length > 0 ? sep3List : candidatesDeck;
    }
    return candidatesDeck;
  }, [candidatesDeck, deckFilter]);

  // Safe index clamping when filter toggles
  const safeDeckIndex = Math.min(currentDeckIndex, Math.max(0, displayedDeck.length - 1));
  const currentCandidate: EditorialCandidate | null = displayedDeck[safeDeckIndex] || displayedDeck[0] || null;

  // Reset index when filter changes
  useEffect(() => {
    setCurrentDeckIndex(0);
    dragX.set(0);
  }, [deckFilter]);

  // Sync tweet text when selecting a candidate or toggling mode
  useEffect(() => {
    if (currentCandidate) {
      if (tweetMode === "standard" && currentCandidate.xPost.standardText) {
        setTweetText(currentCandidate.xPost.standardText);
      } else {
        setTweetText(currentCandidate.xPost.postText);
      }
    }
  }, [safeDeckIndex, tweetMode, currentCandidate]);

  // Select candidate action (communicates with backend)
  const handleSelectCandidate = async (candidate: EditorialCandidate) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-dispatch/select-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id || candidate.arxivId }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to select candidate");
      }
      setData((prev) => (prev ? { ...prev, dispatch: result.dispatch } : prev));
      if (result.dispatch?.xPost?.postText) {
        setTweetText(
          tweetMode === "standard" && result.dispatch.xPost.standardText
            ? result.dispatch.xPost.standardText
            : result.dispatch.xPost.postText
        );
      }
    } catch (err: any) {
      console.error("Failed to select candidate:", err);
      setError(err.message || "Failed to select candidate");
    } finally {
      setActionLoading(false);
    }
  };

  // Tinder Swipe Handlers
  const handleSwipe = (direction: "left" | "right") => {
    if (displayedDeck.length === 0) return;
    setSwipeDirection(direction);

    if (direction === "right" && currentCandidate) {
      // Right swipe = APPROVE & SELECT candidate
      handleSelectCandidate(currentCandidate);
    } else {
      // Left swipe = PASS to next candidate
      setTimeout(() => {
        setCurrentDeckIndex((prev) => (prev + 1) % displayedDeck.length);
        setSwipeDirection(null);
        dragX.set(0);
      }, 250);
    }
  };

  // Keyboard navigation for Tinder deck: ArrowLeft = Pass, ArrowRight = Select
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSwipe("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSwipe("right");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, displayedDeck, safeDeckIndex, currentCandidate]);

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > 120 || velocity > 400) {
      handleSwipe("right");
    } else if (offset < -120 || velocity < -400) {
      handleSwipe("left");
    } else {
      dragX.set(0);
      setDragProgress(0);
    }
  };

  // Handle Accept & Publish to X
  const handleAcceptAndPublish = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-dispatch/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedTweetText: tweetText }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Publication failed");
      }
      setPublishSuccess(result);
      if (onArticlePublished && result.blog) {
        onArticlePublished(result.blog);
      }
      fetchDispatch();
    } catch (err: any) {
      setError(err.message || "Failed to publish article");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle retry of distribution note to X without recreating or republishing the blog
  const handleRetryXPost = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-dispatch/retry-x-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTweetText: tweetText }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || result.xResult?.error || "Retry failed");
      }
      setPublishSuccess({ success: true, xResult: result.xResult, blog: null as any });
      fetchDispatch();
    } catch (err: any) {
      setError(err.message || "Failed to retry distribution note to X");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle manual trigger / crawl
  const handleManualCrawl = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-dispatch/trigger-crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Crawl failed");
      }
      if (result.dispatch?.xPost?.postText) {
        setTweetText(result.dispatch.xPost.postText);
      }
      fetchDispatch();
    } catch (err: any) {
      setError(err.message || "Failed to trigger crawl");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const dispatch = data?.dispatch;
  const artInfo = data?.artInfo;
  const isPendingReview = dispatch?.status === "staged_pending_review";
  const isAlreadyPublished = dispatch?.status === "accepted_and_published" || dispatch?.status === "auto_published";

  // Formatter for countdown
  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${String(s).padStart(2, "0")}s`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto ${
        isLight ? "bg-slate-900/40 backdrop-blur-md" : "bg-black/90 backdrop-blur-xl"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-5xl rounded-3xl overflow-hidden my-6 border transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-900 shadow-2xl shadow-slate-900/15"
            : "bg-slate-950 border-cyan-500/40 text-slate-100 shadow-[0_25px_80px_-15px_rgba(6,182,212,0.25)]"
        }`}
      >
        {/* Dynamic Raytraced Refractive Rim Shader (Top Edge) */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none transition-all duration-300 z-30"
          style={{
            background: `linear-gradient(${lightState.angle}deg, #06b6d4 0%, #8b5cf6 40%, #10b981 75%, #38bdf8 100%)`,
            boxShadow: `0 0 16px rgba(6, 182, 212, 0.8)`,
          }}
        />

        {/* Top Header Banner */}
        <div
          className={`relative px-6 py-4 sm:py-5 border-b flex flex-wrap items-center justify-between gap-4 transition-colors ${
            isLight
              ? "bg-gradient-to-r from-slate-50 via-cyan-50/40 to-emerald-50/30 border-slate-200"
              : "bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/70 border-cyan-500/20"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`relative w-11 h-11 rounded-2xl border flex items-center justify-center overflow-hidden shadow-inner ${
                isLight
                  ? "bg-cyan-50 border-cyan-300 text-cyan-700"
                  : "bg-cyan-500/10 border-cyan-400/40 text-cyan-400"
              }`}
            >
              <Sparkles className="w-5 h-5 animate-pulse" />
              {/* Raytracing Beam Glint */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  background: `radial-gradient(circle at ${lightState.lightX}% ${lightState.lightY}%, rgba(56,189,248,0.8) 0%, transparent 65%)`,
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className={`text-base sm:text-lg font-bold tracking-wide flex items-center gap-2 ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  Daily Autonomous Editorial Pipeline
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${
                      isLight
                        ? "bg-cyan-100 text-cyan-800 border-cyan-300"
                        : "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                    }`}
                  >
                    Candidate Deck
                  </span>
                </h2>
              </div>
              <p
                className={`text-xs flex items-center gap-1.5 mt-0.5 ${
                  isLight ? "text-slate-600" : "text-slate-400"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{dynamicCadenceLabel}</span>
              </p>
            </div>
          </div>

          {/* ART Clock & Timeout Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div
                className={`text-xs font-mono flex items-center justify-end gap-1.5 font-semibold ${
                  isLight ? "text-cyan-800" : "text-cyan-400"
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${isLight ? "text-cyan-700" : "text-cyan-300"}`} />
                <span>
                  {liveArtClock || (artInfo ? `${String(artInfo.hour).padStart(2, "0")}:${String(artInfo.minute).padStart(2, "0")} ART (UTC-3)` : "09:00:00 ART (UTC-3)")}
                </span>
              </div>
              {isPendingReview && remainingSeconds > 0 ? (
                <div
                  className={`text-xs font-medium flex items-center justify-end gap-1 mt-0.5 ${
                    isLight ? "text-amber-800" : "text-amber-400"
                  }`}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  Auto-publish in{" "}
                  <span
                    className={`font-mono font-bold ${
                      isLight ? "text-amber-900" : "text-amber-300"
                    }`}
                  >
                    {formatCountdown(remainingSeconds)}
                  </span>
                </div>
              ) : isAlreadyPublished ? (
                <div
                  className={`text-xs font-medium flex items-center justify-end gap-1 mt-0.5 ${
                    isLight ? "text-emerald-700" : "text-emerald-400"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Published &amp; Dispatched
                </div>
              ) : (
                <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Review Window Idle
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-700/50"
              }`}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          className={`p-4 sm:p-6 space-y-5 max-h-[76vh] overflow-y-auto ${
            isLight ? "bg-white" : "bg-slate-950"
          }`}
        >
          {error && (
            <div
              className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
                isLight
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {publishSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-sm space-y-2 shadow-lg shadow-emerald-950/40"
            >
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Publication Dispatched! Article Live & Dispatched to X</span>
              </div>
              <p className="text-xs text-emerald-200/90">
                {publishSuccess.xResult?.message || "Post published successfully."}
              </p>
              {publishSuccess.xResult?.tweetUrl && (
                <a
                  href={publishSuccess.xResult.tweetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:underline pt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Live Distribution Note on X
                </a>
              )}
              {publishSuccess.xResult && !publishSuccess.xResult.success && (
                <div className="pt-2.5 space-y-2 border-t border-emerald-500/20">
                  <div className="flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>
                      Distribution Note: {publishSuccess.xResult.error || "OAuth 1.0a permission limit (Read-only token)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    The blog is live on Meridian. Your X token currently has Read-only scope. You can share immediately via 1-click Web Intent while updating app permissions in the X Developer Portal.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {publishSuccess.xResult.intentUrl && (
                      <a
                        href={publishSuccess.xResult.intentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Share via Web Intent (1-Click)</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleRetryXPost}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin text-cyan-400" : ""}`} />
                      <span>Retry X Auto-Post</span>
                    </button>
                    {onOpenXTest && (
                      <button
                        type="button"
                        onClick={onOpenXTest}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Open X Diagnostics</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-9 h-9 text-cyan-500 animate-spin mx-auto" />
              <p className={`text-sm ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Loading daily staged dispatch and candidate deck...
              </p>
            </div>
          ) : !dispatch && candidatesDeck.length === 0 ? (
            <div className="py-14 text-center space-y-4">
              <div
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-lg ${
                  isLight
                    ? "bg-cyan-50 border-cyan-300 text-cyan-700"
                    : "bg-slate-900 border-cyan-500/30 text-cyan-400"
                }`}
              >
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h3 className={`text-base font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                  No Staged Dispatch for Today Yet
                </h3>
                <p className={`text-sm max-w-md mx-auto mt-1 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  The automated arXiv crawler triggers at 9:00 AM ART (UTC-3). You can initialize the 4 September 3 candidates or crawl arXiv now.
                </p>
              </div>
              <button
                onClick={handleManualCrawl}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {actionLoading ? "Crawling arXiv & Staging..." : "Initialize 9:00 AM Candidate Deck Now"}
              </button>
            </div>
          ) : (
            <>
              {/* PRIMARY VIEW: FOCUSED ACTIVE STAGED PAPER OR INTERACTIVE DECK SWIPER */}
              {!showCandidateDeck ? (
                /* Sleek, Focused Active Candidate Card */
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    isLight
                      ? "bg-slate-50/90 border-slate-200 text-slate-900 shadow-sm"
                      : "bg-slate-900/80 border-cyan-500/30 text-slate-100 shadow-inner"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                        arXiv:{currentCandidate?.arxivId || dispatch?.candidatePaper?.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {currentCandidate?.category || dispatch?.selectedCategory || "quant-ph"}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Score: <strong className="text-cyan-600 dark:text-cyan-400">{currentCandidate?.score ?? 85}/100</strong>
                      </span>
                      {isPendingReview && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                          Staged for {dispatch?.dateArt ? dispatch.dateArt : "Upcoming Dispatch"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCandidateDeck(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isLight
                            ? "bg-white hover:bg-slate-100 text-cyan-800 border-slate-300 shadow-xs"
                            : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30"
                        }`}
                        title="Browse and swipe through alternative arXiv candidate preprints"
                      >
                        <Layers className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Swap Candidate ({displayedDeck.length})</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {currentCandidate?.arxivLink && (
                        <a
                          href={currentCandidate.arxivLink}
                          target="_blank"
                          rel="noreferrer"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isLight
                              ? "text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
                              : "text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800"
                          }`}
                          title="Open preprint on arXiv"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pt-3.5 space-y-2.5">
                    <h3 className="text-base sm:text-lg font-bold leading-snug">
                      {currentCandidate?.title || dispatch?.candidatePaper?.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span><strong>Authors:</strong> {currentCandidate?.authors || dispatch?.candidatePaper?.authors}</span>
                      {currentCandidate?.dateComparison?.arxivPubDate && (
                        <span className="font-mono text-cyan-600 dark:text-cyan-400">• Released {currentCandidate.dateComparison.arxivPubDate}</span>
                      )}
                    </div>

                    {/* Excerpt + banner preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 items-center">
                      {currentCandidate?.bannerSvg ? (
                        <div
                          className={`sm:col-span-4 h-24 rounded-xl overflow-hidden border flex items-center justify-center [&>svg]:w-full [&>svg]:h-full shadow-inner ${
                            isLight ? "border-slate-200 bg-slate-100" : "border-slate-700 bg-slate-950"
                          }`}
                        >
                          <div dangerouslySetInnerHTML={{ __html: currentCandidate.bannerSvg }} />
                        </div>
                      ) : null}
                      <div className={currentCandidate?.bannerSvg ? "sm:col-span-8 space-y-1.5" : "sm:col-span-12 space-y-1.5"}>
                        <p className="text-xs leading-relaxed line-clamp-3 text-slate-600 dark:text-slate-300">
                          {currentCandidate?.excerpt || dispatch?.candidatePaper?.summary}
                        </p>
                        {currentCandidate?.relevanceReason && (
                          <div className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400">
                            <Zap className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                            <span>{currentCandidate.relevanceReason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags and markdown inspector */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {currentCandidate?.tags?.slice(0, 4).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              isLight
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-slate-800/80 text-slate-400 border-slate-700"
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {onOpenInEditor && currentCandidate?.fullDraft && (
                        <button
                          type="button"
                          onClick={() => onOpenInEditor(currentCandidate.fullDraft!)}
                          className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Inspect Full Article Markdown</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* TINDER CARDS STACK WITH SWIPE & RAYTRACING */
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-500 animate-bounce" />
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isLight ? "text-slate-900" : "text-white"
                        }`}
                      >
                        Candidate Deck: Swipe to Choose Tomorrow's Dispatch
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowCandidateDeck(false)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                        }`}
                      >
                        <ChevronUp className="w-3.5 h-3.5 inline mr-1" />
                        Keep Selected
                      </button>

                      {/* Filter Pill Toggle between 09.3 batch (4) and All candidates */}
                      <div
                        className={`flex items-center gap-1 p-1 rounded-xl border ${
                          isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800"
                        }`}
                      >
                        <button
                          onClick={() => setDeckFilter("sep3")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            deckFilter === "sep3"
                              ? isLight
                                ? "bg-white text-cyan-900 border border-slate-300 shadow-xs"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                              : isLight
                              ? "text-slate-600 hover:text-slate-900"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          ★ Sept 3 Batch (4)
                        </button>
                        <button
                          onClick={() => setDeckFilter("all")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            deckFilter === "all"
                              ? isLight
                                ? "bg-white text-cyan-900 border border-slate-300 shadow-xs"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                              : isLight
                              ? "text-slate-600 hover:text-slate-900"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          All Candidates ({candidatesDeck.length})
                        </button>
                      </div>
                    </div>
                  </div>

                <div
                  className={`flex items-center justify-between text-xs px-1 ${
                    isLight ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  <span>
                    Keyboard shortcut:{" "}
                    <kbd
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
                        isLight
                          ? "bg-slate-200 text-slate-800 border-slate-300"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      ←
                    </kbd>{" "}
                    Pass &nbsp;|&nbsp;{" "}
                    <kbd
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
                        isLight
                          ? "bg-slate-200 text-slate-800 border-slate-300"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      →
                    </kbd>{" "}
                    Select
                  </span>
                  <span className="font-mono">
                    Candidate <strong className="text-cyan-600 dark:text-cyan-400">{safeDeckIndex + 1}</strong> of{" "}
                    <strong className={isLight ? "text-slate-900" : "text-white"}>{displayedDeck.length}</strong>
                  </span>
                </div>

                {/* Card Stack Stage */}
                <div className="relative h-[420px] sm:h-[400px] w-full flex items-center justify-center select-none">
                  {/* Background Stack Cards (visual depth) */}
                  {displayedDeck.slice(safeDeckIndex + 1, safeDeckIndex + 3).map((bgCandidate, idx) => {
                    const depth = idx + 1;
                    return (
                      <div
                        key={`bg-${bgCandidate.id || bgCandidate.arxivId}-${depth}`}
                        className={`absolute inset-x-4 sm:inset-x-8 top-4 rounded-3xl pointer-events-none transition-all duration-300 border ${
                          isLight
                            ? "bg-slate-100 border-slate-200"
                            : "bg-slate-900/60 border-slate-800"
                        }`}
                        style={{
                          transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.05})`,
                          opacity: 0.6 / depth,
                          zIndex: 10 - depth,
                        }}
                      >
                        <div className="p-6 opacity-30">
                          <div
                            className={`h-4 w-1/3 rounded mb-3 ${
                              isLight ? "bg-slate-300" : "bg-slate-700"
                            }`}
                          />
                          <div
                            className={`h-6 w-3/4 rounded ${
                              isLight ? "bg-slate-300" : "bg-slate-700"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* ACTIVE TOP TINDER CARD (Interactive with Draggable Physics & Raytracing) */}
                  {currentCandidate ? (
                    <motion.div
                      ref={cardRef}
                      style={{
                        x: dragX,
                        rotate: cardRotate,
                        opacity: cardOpacity,
                        zIndex: 20,
                        boxShadow: isHovered
                          ? `${lightState.shadowX}px ${lightState.shadowY}px 40px rgba(6, 182, 212, 0.25)`
                          : `0 20px 35px -10px rgba(0, 0, 0, 0.7)`,
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.65}
                      onDrag={(_, info) => {
                        setDragProgress(Math.max(-1, Math.min(1, info.offset.x / 180)));
                      }}
                      onDragEnd={handleDragEnd}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      className={`absolute inset-x-0 top-0 bottom-0 rounded-3xl p-5 sm:p-6 flex flex-col justify-between cursor-grab active:cursor-grabbing overflow-hidden shadow-2xl transition-all ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900"
                          : "bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 text-slate-100"
                      } ${
                        data?.dispatch?.candidatePaper?.id &&
                        (currentCandidate.arxivId.includes(data.dispatch.candidatePaper.id) ||
                          data.dispatch.candidatePaper.id.includes(currentCandidate.arxivId))
                          ? "border-2 border-emerald-500 ring-2 ring-emerald-500/20"
                          : isLight
                          ? "border border-slate-300"
                          : "border border-cyan-500/50"
                      }`}
                    >
                      {/* Raytraced Specular Glint & Dynamic Caustic Light Overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-200"
                        style={{
                          background: `radial-gradient(circle 350px at ${lightState.lightX}% ${lightState.lightY}%, rgba(56, 189, 248, 0.25), transparent 70%)`,
                        }}
                      />

                      {/* Optical Ray Beam Lines (Simulated Laser Trace) */}
                      <div
                        className="absolute top-0 bottom-0 w-[1.5px] pointer-events-none opacity-30 transition-all duration-150"
                        style={{
                          left: `${lightState.lightX}%`,
                          background: `linear-gradient(to bottom, transparent, #38bdf8, transparent)`,
                        }}
                      />

                      {/* SWIPE OVERLAY LABELS */}
                      {/* Swipe Right Overlay: SELECT */}
                      <motion.div
                        style={{ opacity: approveOpacity }}
                        className="absolute top-6 right-6 z-30 px-4 py-1.5 rounded-2xl bg-emerald-500/90 text-slate-950 font-black text-sm uppercase tracking-wider border-2 border-white shadow-xl rotate-12 flex items-center gap-1.5"
                      >
                        <Check className="w-5 h-5 stroke-[3]" />
                        <span>Select Article</span>
                      </motion.div>

                      {/* Swipe Left Overlay: PASS */}
                      <motion.div
                        style={{ opacity: rejectOpacity }}
                        className="absolute top-6 left-6 z-30 px-4 py-1.5 rounded-2xl bg-amber-500/90 text-slate-950 font-black text-sm uppercase tracking-wider border-2 border-white shadow-xl -rotate-12 flex items-center gap-1.5"
                      >
                        <X className="w-5 h-5 stroke-[3]" />
                        <span>Pass Candidate</span>
                      </motion.div>

                      {/* Card Content Top Header */}
                      <div className="relative z-10 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-bold ${
                                isLight
                                  ? "bg-cyan-100 text-cyan-800 border-cyan-300"
                                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              }`}
                            >
                              arXiv:{currentCandidate.arxivId}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                currentCandidate.category === "physics.optics"
                                  ? isLight
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : isLight
                                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              {currentCandidate.category}
                            </span>
                            <span className={`text-[11px] font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                              Match Score: <strong className={isLight ? "text-slate-900" : "text-white"}>{currentCandidate.score}/100</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {data?.dispatch?.candidatePaper?.id &&
                            (currentCandidate.arxivId.includes(data.dispatch.candidatePaper.id) ||
                              data.dispatch.candidatePaper.id.includes(currentCandidate.arxivId)) ? (
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-sm border ${
                                  isLight
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                }`}
                              >
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                Active Selection
                              </span>
                            ) : currentCandidate.dateComparison?.arxivPubDate?.includes("September 3") ||
                              currentCandidate.source === "meridian_pipeline" ? (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
                                  isLight
                                    ? "bg-cyan-100 text-cyan-800 border-cyan-300"
                                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                }`}
                              >
                                September 3 Batch
                              </span>
                            ) : null}
                            <a
                              href={currentCandidate.arxivLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLight
                                  ? "text-slate-500 hover:text-cyan-700 hover:bg-slate-100"
                                  : "text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                              }`}
                              title="Open in arXiv"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        {/* Title */}
                        <h3
                          className={`text-base sm:text-lg font-bold leading-snug transition-colors ${
                            isLight
                              ? "text-slate-900 hover:text-cyan-700"
                              : "text-white hover:text-cyan-200"
                          }`}
                        >
                          {currentCandidate.title}
                        </h3>

                        {/* Authors & Announcement date */}
                        <div
                          className={`flex flex-wrap items-center justify-between text-xs gap-1 ${
                            isLight ? "text-slate-600" : "text-slate-400"
                          }`}
                        >
                          <p>
                            <strong className={isLight ? "text-slate-800" : "text-slate-300"}>Authors:</strong> {currentCandidate.authors}
                          </p>
                          {currentCandidate.dateComparison?.arxivPubDate && (
                            <span className="font-mono text-cyan-600 dark:text-cyan-400 text-[11px]">
                              Released: {currentCandidate.dateComparison.arxivPubDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content Middle: SVG banner & Excerpt */}
                      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-3 my-2 items-center">
                        {currentCandidate.bannerSvg ? (
                          <div
                            className={`sm:col-span-4 h-28 rounded-xl overflow-hidden border flex items-center justify-center [&>svg]:w-full [&>svg]:h-full shadow-inner ${
                              isLight
                                ? "border-slate-200 bg-slate-50"
                                : "border-slate-700 bg-slate-950"
                            }`}
                          >
                            <div dangerouslySetInnerHTML={{ __html: currentCandidate.bannerSvg }} />
                          </div>
                        ) : (
                          <div
                            className={`sm:col-span-4 h-28 rounded-xl border border-dashed flex flex-col items-center justify-center text-xs p-2 text-center ${
                              isLight
                                ? "border-slate-300 bg-slate-50 text-slate-600"
                                : "border-slate-700 bg-slate-950/60 text-slate-500"
                            }`}
                          >
                            <Layers className="w-5 h-5 text-cyan-500 mb-1" />
                            <span>Generative KaTeX &amp; SVG Ready</span>
                          </div>
                        )}

                        <div className="sm:col-span-8 space-y-1.5">
                          <p
                            className={`text-xs leading-relaxed line-clamp-3 ${
                              isLight ? "text-slate-700" : "text-slate-300"
                            }`}
                          >
                            {currentCandidate.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-cyan-600 dark:text-cyan-400 pt-1">
                            <Zap className="w-3 h-3 text-cyan-500" />
                            <span>{currentCandidate.relevanceReason}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Content Bottom: Quick Tinder Action Controls */}
                      <div
                        className={`relative z-10 pt-3 border-t flex flex-wrap items-center justify-between gap-2 ${
                          isLight ? "border-slate-200" : "border-slate-800/90"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {currentCandidate.tags?.slice(0, 3).map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                isLight
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {onOpenInEditor && currentCandidate.fullDraft && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenInEditor(currentCandidate.fullDraft!);
                            }}
                            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Inspect Markdown</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </div>

                {/* TINDER SWIPE ACTION BUTTONS & INDICATOR DOTS */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  {/* Left: Quick Pass button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSwipe("left")}
                      disabled={actionLoading || displayedDeck.length <= 1}
                      className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 cursor-pointer border ${
                        isLight
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700"
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pass / Next</span>
                    </button>

                    <button
                      onClick={() => {
                        if (currentCandidate) handleSelectCandidate(currentCandidate);
                      }}
                      disabled={actionLoading || !currentCandidate}
                      className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all active:scale-95 cursor-pointer border ${
                        isLight
                          ? "bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border-cyan-300"
                          : "bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/40"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Choose This Article</span>
                    </button>
                  </div>

                  {/* Center: Interactive Carousel Navigation Dots */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {displayedDeck.map((c, idx) => (
                      <button
                        key={c.id || c.arxivId || idx}
                        onClick={() => {
                          setCurrentDeckIndex(idx);
                          dragX.set(0);
                        }}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          idx === safeDeckIndex
                            ? "w-7 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                            : isLight
                            ? "w-2 bg-slate-300 hover:bg-slate-400"
                            : "w-2 bg-slate-700 hover:bg-slate-500"
                        }`}
                        title={`Candidate ${idx + 1}: ${c.title}`}
                      />
                    ))}
                  </div>

                  {/* Right: Swipe Right Select button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSwipe("right")}
                      disabled={actionLoading || !currentCandidate}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      <span>Swipe Right (Select)</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}

              {/* SECTION: X (TWITTER) AUTONOMOUS DISTRIBUTION NOTE (WRITER) EDITOR */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-3 shadow-inner ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-900"
                    : "bg-slate-900/90 border-cyan-500/30 text-slate-100"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-black shadow-sm ${
                        isLight
                          ? "bg-cyan-100 text-cyan-800 border-cyan-300"
                          : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                      }`}
                    >
                      𝕏
                    </div>
                    <div>
                      <span className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                        Distribution Note (Writer)
                      </span>
                      <span className="text-[11px] text-cyan-600 dark:text-cyan-400 ml-1.5 font-mono">
                        @lk3mpe
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {/* X Test Diagnostic Button */}
                    {onOpenXTest && (
                      <button
                        type="button"
                        onClick={onOpenXTest}
                        className={`px-2.5 py-1 rounded-md border text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isLight
                            ? "bg-cyan-100 hover:bg-cyan-200 text-cyan-800 border-cyan-300"
                            : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                        }`}
                        title="Run test tweet and inspect OAuth 1.0a permissions"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>X Test &amp; Inspect</span>
                      </button>
                    )}

                    {/* Mode Toggle: Standard 280-char vs Full 3-Sentence */}
                    <div
                      className={`flex rounded-lg p-0.5 border ${
                        isLight ? "bg-white border-slate-300" : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <button
                        onClick={() => setTweetMode("full")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                          tweetMode === "full"
                            ? isLight
                              ? "bg-cyan-100 text-cyan-800 border border-cyan-300"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : isLight
                            ? "text-slate-600 hover:text-slate-900"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        3-Sentence Full
                      </button>
                      <button
                        onClick={() => setTweetMode("standard")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                          tweetMode === "standard"
                            ? isLight
                              ? "bg-cyan-100 text-cyan-800 border border-cyan-300"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : isLight
                            ? "text-slate-600 hover:text-slate-900"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Standard ≤280
                      </button>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold border ${
                        tweetText.length > 280 && tweetMode === "standard"
                          ? isLight
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                          : isLight
                          ? "bg-white text-slate-700 border-slate-300"
                          : "bg-slate-950 text-slate-300 border border-slate-800"
                      }`}
                    >
                      {tweetText.length} chars
                    </span>
                  </div>
                </div>

                {/* Editable Tweet Textarea */}
                <div className="relative">
                  <textarea
                    value={tweetText}
                    onChange={(e) => setTweetText(e.target.value)}
                    disabled={actionLoading || isAlreadyPublished}
                    rows={4}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-sans leading-relaxed focus:outline-none transition-all disabled:opacity-60 resize-y shadow-inner ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30"
                        : "bg-slate-950 border-slate-700/80 text-slate-200 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    }`}
                    placeholder="Drafted distribution note for X..."
                  />
                </div>

                <div
                  className={`flex flex-wrap items-center justify-between text-[11px] gap-2 ${
                    isLight ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>OAuth 1.0a User Context Ready</span>
                  </div>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 truncate max-w-xs sm:max-w-md">
                    {dispatch?.xPost.canonicalUrl || (currentCandidate ? currentCandidate.xPost.canonicalUrl : "")}
                  </span>
                </div>
              </div>

              {/* COLLAPSIBLE ACCORDION 1: OBSERVATORY TELEMETRY & SKY CONDITIONS */}
              <div
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowTelemetry(!showTelemetry)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs font-bold">Observatory Celestial &amp; Atmosphere Telemetry</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      Lat -34.6° • {liveArtClock}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-medium">{showTelemetry ? "Hide" : "Show Telemetry"}</span>
                    {showTelemetry ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                <AnimatePresence>
                  {showTelemetry && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200 dark:border-slate-800/80 p-4"
                    >
                      <ObservatoryTelemetryDeck
                        artTimeStr={liveArtClock}
                        isPendingReview={isPendingReview}
                        remainingSeconds={remainingSeconds}
                        formatCountdown={formatCountdown}
                        isAlreadyPublished={isAlreadyPublished}
                        scheduledTimeLabel={isWeekend ? "Monday 09:00 AM ART" : "Tomorrow 09:00 AM ART"}
                        theme={theme}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* COLLAPSIBLE ACCORDION 2: SOURCE DATE VERIFICATION & CADENCE RULES */}
              <div
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowCorpusAnalysis(!showCorpusAnalysis)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Binary className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold">Source Date Verification &amp; Autonomous Cadence Rules</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      arXiv Mon–Fri Policy
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-medium">{showCorpusAnalysis ? "Hide" : "Show Rules"}</span>
                    {showCorpusAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                <AnimatePresence>
                  {showCorpusAnalysis && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200 dark:border-slate-800/80 p-4 space-y-3"
                    >
                      {currentCandidate?.dateComparison && (
                        <div
                          className={`relative rounded-xl p-3.5 border overflow-hidden shadow-inner ${
                            isLight
                              ? "bg-white border-slate-200 text-slate-900"
                              : "bg-slate-950/80 border-cyan-500/30 text-slate-100"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">Date Alignment Verification:</span>
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  ✓ Verified
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                {currentCandidate.dateComparison.dateAlignmentReason}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div className="text-[10px] text-slate-500">arXiv Canonical</div>
                                <div className="font-bold">{currentCandidate.dateComparison.arxivPubDate}</div>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-cyan-500" />
                              <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800">
                                <div className="text-[10px] text-cyan-600 dark:text-cyan-400">Meridian Cadence</div>
                                <div className="font-bold">{currentCandidate.dateComparison.meridianPubDate}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Autonomous arXiv Editorial Cadence Specification</span>
                        </div>
                        <p className="leading-relaxed text-[11px]">
                          arXiv runs releases Monday through Friday nights. Friday night preprints are staged for publication on Monday 9:00 AM ART. The 10:00 AM ART auto-publish timeout is active on weekdays only.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 transition-colors ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualCrawl}
              disabled={actionLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                isLight
                  ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-300 border-slate-800"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
              <span>Refresh arXiv Crawl</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Close
            </button>

            {isPendingReview ? (
              <button
                onClick={handleAcceptAndPublish}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publishing &amp; Dispatching to X...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Accept &amp; Share Selected to X Now</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 ${
                    isLight
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Article Published Live</span>
                </div>

                {dispatch?.xPostResult?.tweetUrl && (
                  <a
                    href={dispatch.xPostResult.tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                      isLight
                        ? "bg-cyan-100 hover:bg-cyan-200 text-cyan-800 border-cyan-300"
                        : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30"
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Tweet on X</span>
                  </a>
                )}

                {dispatch?.xPostResult && !dispatch.xPostResult.success && dispatch.xPostResult.intentUrl && (
                  <a
                    href={dispatch.xPostResult.intentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Share to X (1-Click Web Intent)</span>
                  </a>
                )}

                {(!dispatch?.xPostResult || !dispatch.xPostResult.success) && (
                  <button
                    onClick={handleRetryXPost}
                    disabled={actionLoading}
                    className={`px-4 py-2 rounded-xl font-semibold text-xs inline-flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer border ${
                      isLight
                        ? "bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                        <span>Retrying Post...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Retry X Auto-Post</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
