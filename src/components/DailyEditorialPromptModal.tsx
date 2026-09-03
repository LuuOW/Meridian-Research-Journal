import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  X,
  FileText,
  Binary,
  Layers,
  Eye,
  ShieldCheck,
  Check
} from "lucide-react";
import { BlogPost } from "../types";

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
    draftArticle: BlogPost;
    xPost: {
      postText: string;
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
}

export const DailyEditorialPromptModal: React.FC<DailyEditorialPromptModalProps> = ({
  isOpen,
  onClose,
  onArticlePublished,
  onOpenInEditor,
}) => {
  const [data, setData] = useState<StagedDispatchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [tweetText, setTweetText] = useState<string>("");
  const [publishSuccess, setPublishSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Fetch current daily dispatch
  const fetchDispatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-dispatch/current");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StagedDispatchResponse = await res.json();
      setData(json);
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

  // Handle Re-draft with alternate paper
  const handleRedraft = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-dispatch/redraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Re-drafting failed");
      }
      if (result.dispatch?.xPost?.postText) {
        setTweetText(result.dispatch.xPost.postText);
      }
      fetchDispatch();
    } catch (err: any) {
      setError(err.message || "Failed to re-draft article");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-8"
      >
        {/* Top Glowing Header Banner */}
        <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/80 px-6 py-5 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Daily Autonomous Editorial Pipeline
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  9:00 AM – 10:00 AM ART
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Next-Day Publishing Rule: {dispatch?.sourceArxivBatchDay || "arXiv Optics & Quant-ph Preprints"}
              </p>
            </div>
          </div>

          {/* ART Clock & Timeout Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-mono text-cyan-400 flex items-center justify-end gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {artInfo ? `${String(artInfo.hour).padStart(2, "0")}:${String(artInfo.minute).padStart(2, "0")} ART (UTC-3)` : "Calculating..."}
                </span>
              </div>
              {isPendingReview && remainingSeconds > 0 ? (
                <div className="text-xs text-amber-400 font-medium">
                  Auto-publishes to X in <span className="font-mono font-bold">{formatCountdown(remainingSeconds)}</span>
                </div>
              ) : isAlreadyPublished ? (
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Published & Shared
                </div>
              ) : (
                <div className="text-xs text-slate-400">Review Window Idle</div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {publishSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-sm space-y-2"
            >
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Publication Successful! Article Live & Dispatched to X</span>
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
                  View Live Companion Tweet on X
                </a>
              )}
            </motion.div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Loading daily staged dispatch and arXiv candidates...</p>
            </div>
          ) : !dispatch ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">No Staged Dispatch for Today Yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                  The automated arXiv crawler triggers at 9:00 AM ART (UTC-3). You can manually trigger the candidate crawl and draft generation now.
                </p>
              </div>
              <button
                onClick={handleManualCrawl}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Sparkles className="w-4 h-4" />
                {actionLoading ? "Crawling arXiv & Staging..." : "Trigger 9:00 AM Crawl & Stage Now"}
              </button>
            </div>
          ) : (
            <>
              {/* Section 1: AI Corpus Model Decision Box */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Binary className="w-4 h-4 text-purple-400" />
                    <span>Autonomous AI Model Selection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      dispatch.selectedCategory === "physics.optics"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    }`}>
                      {dispatch.selectedCategory}
                    </span>
                    <span className="text-xs text-slate-400">
                      Score: <strong className="text-white">{dispatch.candidatePaper.score} / 100</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {dispatch.corpusAnalysis.selectionRationale}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Corpus Analyzed: <strong className="text-slate-200">{dispatch.corpusAnalysis.totalArticlesAnalyzed} articles</strong></span>
                  <span>Optics Balance: <strong className="text-slate-200">{(dispatch.corpusAnalysis.opticsRatio * 100).toFixed(0)}%</strong></span>
                  <span>Quant-ph Balance: <strong className="text-slate-200">{(dispatch.corpusAnalysis.quantPhRatio * 100).toFixed(0)}%</strong></span>
                </div>
              </div>

              {/* Section 2: Selected arXiv Preprint & Article Draft Teaser */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Card: arXiv Preprint Details */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-cyan-400">arXiv:{dispatch.candidatePaper.id}</span>
                    <a
                      href={dispatch.candidatePaper.link || `https://arxiv.org/abs/${dispatch.candidatePaper.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-300"
                    >
                      <span>Preprint</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <h3 className="text-sm font-semibold text-white leading-snug">
                    {dispatch.candidatePaper.title}
                  </h3>

                  <p className="text-xs text-slate-400">
                    <strong>Authors:</strong> {dispatch.candidatePaper.authors}
                  </p>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    {dispatch.candidatePaper.summary}
                  </p>
                </div>

                {/* Right Card: Synthesized Banner & Draft Meta */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-purple-400">
                        <Layers className="w-3.5 h-3.5" /> Generated SVG Banner
                      </span>
                      <span className="text-emerald-400 font-mono text-[11px]">Dynamic Vectors ✓</span>
                    </div>

                    {/* SVG Banner Thumbnail */}
                    {dispatch.draftArticle?.bannerSvg && (
                      <div
                        className="w-full h-24 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: dispatch.draftArticle.bannerSvg }}
                      />
                    )}

                    <div className="text-xs text-slate-300 line-clamp-2">
                      {dispatch.draftArticle.excerpt}
                    </div>
                  </div>

                  {onOpenInEditor && (
                    <button
                      onClick={() => onOpenInEditor(dispatch.draftArticle)}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 self-start pt-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Inspect Complete Article in Markdown Editor</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: X (Twitter) Companion Post Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">
                      𝕏
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white">X Companion Thread Post</span>
                      <span className="text-[11px] text-slate-400 ml-1.5 font-mono">@ask_meridian</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                      {tweetText.length} chars
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                      3 Sentences ✓
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
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-sans leading-relaxed focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 disabled:opacity-60 resize-y"
                    placeholder="Drafted companion post for X..."
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                  <div className="flex items-center gap-1 text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>OAuth 1.0a User Context Ready</span>
                  </div>
                  <span className="font-mono text-cyan-400 truncate max-w-xs">
                    {dispatch.xPost.canonicalUrl}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isPendingReview && (
              <button
                onClick={handleRedraft}
                disabled={actionLoading}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                <span>Re-Draft / Next Candidate</span>
              </button>
            )}

            <button
              onClick={handleManualCrawl}
              disabled={actionLoading}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-300 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Refresh Crawl</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              Close
            </button>

            {isPendingReview ? (
              <button
                onClick={handleAcceptAndPublish}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publishing & Posting to X...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Accept & Share to X Now</span>
                  </>
                )}
              </button>
            ) : isAlreadyPublished ? (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Article Published</span>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
