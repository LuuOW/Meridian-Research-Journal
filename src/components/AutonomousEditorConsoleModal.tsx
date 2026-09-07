import React, { useState, useEffect, useRef } from "react";
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
  X as CloseIcon,
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
  Maximize2,
  Activity,
  CreditCard,
  Coins,
  Cpu,
  Terminal,
  Trash2,
  Plus,
  Loader2,
  Copy,
  HelpCircle,
  Key,
  Sun,
  CloudSun,
  Droplets,
  Wind
} from "lucide-react";
import { BlogPost, GenerationJob } from "../types";
import { EditorialCandidate } from "../lib/dailyEditorialEngine";
import {
  computeRayTracedLightState,
  calculateNormalizedCursor,
  getDefaultLightState,
  LightState
} from "../lib/rayTracingUtils";
import { ObservatoryTelemetryDeck } from "./ObservatoryTelemetryDeck";
import { formatElapsedTime, BANNER_PIPELINE_STEPS, PIPELINE_STEPS } from "../lib/pipelineUtils";
import { StagedDispatchResponse } from "./DailyEditorialPromptModal";
import { DEFAULT_X_PRICING, XPricingInfo } from "../lib/xApi";

export type ConsoleTab = "dispatch" | "climate" | "xtest" | "pipeline";

export interface AutonomousEditorConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ConsoleTab;
  onArticlePublished?: (newBlog: BlogPost) => void;
  onOpenInEditor?: (draft: BlogPost) => void;
  jobs?: GenerationJob[];
  onSelectBlog?: (blog: BlogPost) => void;
  onDismissJob?: (jobId: string) => void;
  onClearFinishedJobs?: () => void;
  onRetryJob?: (arxivInput: string) => void;
  onOpenCreate?: () => void;
  isEditorMode?: boolean;
  theme?: "light" | "dark";
}

export interface XStatusData {
  success: boolean;
  configured: boolean;
  connected: boolean;
  username?: string;
  name?: string;
  id?: string;
  missingKeys: string[];
  error?: string;
  httpStatus?: number;
  authMethod?: string;
  accessLevel?: string;
  hasWritePermission?: boolean;
  writePermissionWarning?: string;
  pricing?: XPricingInfo;
  rawResponse?: any;
  keyPreviews?: {
    apiKey?: string;
    accessToken?: string;
    hasSecret?: boolean;
    hasTokenSecret?: boolean;
    hasBearer?: boolean;
  };
}

export interface XPostResultData {
  success: boolean;
  mode: "live" | "unconfigured_simulation" | "error";
  tweetId?: string;
  tweetUrl?: string;
  text?: string;
  intentUrl?: string;
  message?: string;
  error?: string;
  timestamp: number;
  httpStatus?: number;
  username?: string;
  diagnosisTitle?: string;
  diagnosisDetail?: string;
  isCreditDepleted?: boolean;
  pricingDocUrl?: string;
  minCreditRequired?: string;
  rawResponse?: any;
}

export const AutonomousEditorConsoleModal: React.FC<AutonomousEditorConsoleModalProps> = ({
  isOpen,
  onClose,
  initialTab = "dispatch",
  onArticlePublished,
  onOpenInEditor,
  jobs = [],
  onSelectBlog,
  onDismissJob,
  onClearFinishedJobs,
  onRetryJob,
  onOpenCreate,
  isEditorMode = true,
  theme = "dark",
}) => {
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<ConsoleTab>(initialTab);

  // Sync initialTab on reopen
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Argentina Live Clock Ticker
  const [liveArtClock, setLiveArtClock] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const dateParts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
          month: "short",
          day: "numeric",
          weekday: "short",
        }).format(now);
        setLiveArtClock(`${timeFormatter.format(now)} ART • ${dateParts}`);
      } catch {
        setLiveArtClock("09:00:00 ART");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- DISPATCH STATE ---
  const [dispatchData, setDispatchData] = useState<StagedDispatchResponse | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [tweetText, setTweetText] = useState<string>("");
  const [tweetMode, setTweetMode] = useState<"standard" | "full">("full");
  const [publishSuccess, setPublishSuccess] = useState<any | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [currentDeckIndex, setCurrentDeckIndex] = useState<number>(0);
  const [previewMarkdown, setPreviewMarkdown] = useState<boolean>(false);
  const [showDeckDrawer, setShowDeckDrawer] = useState<boolean>(false);

  // Swipe motion values
  const dragX = useMotionValue(0);
  const cardRotate = useTransform(dragX, [-250, 0, 250], [-18, 0, 18]);
  const cardOpacity = useTransform(dragX, [-300, -180, 0, 180, 300], [0.3, 0.9, 1, 0.9, 0.3]);
  const approveOpacity = useTransform(dragX, [30, 120], [0, 1]);
  const rejectOpacity = useTransform(dragX, [-30, -120], [0, 1]);

  // Card raytracing
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [lightState, setLightState] = useState<LightState>(getDefaultLightState());
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
    const calculatedLight = computeRayTracedLightState(normX, normY, 6, 24);
    setLightState(calculatedLight);
  };
  const handleMouseLeave = () => {
    setLightState(getDefaultLightState());
  };

  // --- X DIAGNOSTICS & TEST STATE ---
  const [xStatus, setXStatus] = useState<XStatusData | null>(null);
  const [loadingXStatus, setLoadingXStatus] = useState<boolean>(false);
  const [testTweetResult, setTestTweetResult] = useState<XPostResultData | null>(null);
  const [isPostingTest, setIsPostingTest] = useState<boolean>(false);
  const [testPayloadText, setTestPayloadText] = useState<string>("");
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [showEnvInspector, setShowEnvInspector] = useState<boolean>(false);

  // --- PIPELINE LOG STATE ---
  const [expandedLogJobIds, setExpandedLogJobIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Fetch Staged Dispatch
  const fetchStagedDispatch = async () => {
    setDispatchLoading(true);
    setDispatchError(null);
    try {
      const res = await fetch("/api/pipeline/staged-dispatch");
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch staged dispatch`);
      const json: StagedDispatchResponse = await res.json();
      setDispatchData(json);
      if (json.dispatch?.xPost?.postText) {
        setTweetText(json.dispatch.xPost.postText);
      }
      setRemainingSeconds(json.countdownSeconds || 0);
      setCurrentDeckIndex(json.dispatch?.activeCandidateIndex || 0);
    } catch (err: any) {
      setDispatchError(err.message || "Failed to load staged editorial dispatch");
    } finally {
      setDispatchLoading(false);
    }
  };

  // Fetch X Status
  const fetchXStatus = async () => {
    setLoadingXStatus(true);
    try {
      const res = await fetch("/api/x/status");
      const data: XStatusData = await res.json();
      setXStatus(data);
      const username = data.username || "lk3mpe";
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setTestPayloadText(
        `Meridian Journal [Pipeline Verification • ${timeStr} ART #${randNum}] — Autonomous OAuth 2.0 User Context live test for @${username}. Autonomous frontier physics & quantum optics: https://ask-meridian.uk #QuantumOptics #arXiv`
      );
    } catch (err) {
      console.warn("Failed to load X status:", err);
    } finally {
      setLoadingXStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStagedDispatch();
      fetchXStatus();
    }
  }, [isOpen]);

  // Countdown timer for review window
  useEffect(() => {
    if (!isOpen || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, remainingSeconds]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const dispatch = dispatchData?.dispatch;
  const isAlreadyPublished = dispatch?.status === "accepted_and_published" || dispatch?.status === "auto_published";
  const candidatesDeck = dispatch?.candidatesDeck || [];
  const currentCandidate: EditorialCandidate | null =
    candidatesDeck.length > 0 && currentDeckIndex < candidatesDeck.length
      ? candidatesDeck[currentDeckIndex]
      : null;

  // Candidate selection / Tinder swipe
  const handleSelectCandidate = async (index: number) => {
    if (actionLoading || isAlreadyPublished || !candidatesDeck[index]) return;
    setActionLoading(true);
    try {
      const selected = candidatesDeck[index];
      const res = await fetch("/api/editorial/select-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selected.id,
          deckIndex: index,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to switch staged candidate`);
      setCurrentDeckIndex(index);
      await fetchStagedDispatch();
    } catch (err: any) {
      setDispatchError(err.message || "Failed to switch candidate preprint");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwipe = (direction: "left" | "right") => {
    if (actionLoading || isAlreadyPublished || candidatesDeck.length === 0) return;
    if (direction === "right") {
      handleSelectCandidate(currentDeckIndex);
    } else {
      const nextIdx = (currentDeckIndex + 1) % candidatesDeck.length;
      handleSelectCandidate(nextIdx);
    }
  };

  // Publish active staged article
  const handleAcceptAndPublish = async () => {
    if (!dispatch || actionLoading) return;
    setActionLoading(true);
    setDispatchError(null);
    try {
      const res = await fetch("/api/editorial/accept-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId: dispatch.id,
          editedXPostText: tweetText,
          postMode: tweetMode,
          candidateId: currentCandidate ? currentCandidate.id : dispatch.candidatePaper.id,
        }),
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP ${res.status}: Failed to publish staged dispatch`);
      }
      const result = await res.json();
      setPublishSuccess(result);
      if (onArticlePublished && result.publishedArticle) {
        onArticlePublished(result.publishedArticle);
      }
      await fetchStagedDispatch();
    } catch (err: any) {
      setDispatchError(err.message || "Failed to publish staged dispatch");
    } finally {
      setActionLoading(false);
    }
  };

  // Run Test Tweet via Direct API
  const handleRunTestTweet = async () => {
    setIsPostingTest(true);
    setTestTweetResult(null);
    try {
      const res = await fetch("/api/x/test-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customMessage: testPayloadText }),
      });
      const data: XPostResultData = await res.json();
      setTestTweetResult(data);
    } catch (err: any) {
      setTestTweetResult({
        success: false,
        mode: "error",
        error: err.message || "Failed to execute test tweet",
        timestamp: Date.now(),
        diagnosisTitle: "X API Execution Exception",
        diagnosisDetail: err.message || "Check network connection or credentials.",
        isCreditDepleted: true,
        pricingDocUrl: "https://docs.x.com/x-api/getting-started/pricing",
        minCreditRequired: "$5.00 Pay-As-You-Go",
      });
    } finally {
      setIsPostingTest(false);
    }
  };

  if (!isOpen) return null;

  const activeJobs = jobs.filter((j) => !j.dismissed);
  const runningJobs = activeJobs.filter((j) => j.status === "generating");

  return (
    <div
      id="autonomous-editor-console-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-5xl my-auto rounded-3xl border shadow-2xl flex flex-col max-h-[94vh] overflow-hidden transition-all ${
          isLight
            ? "bg-slate-50 border-slate-300 text-slate-900 shadow-slate-400/20"
            : "bg-slate-950 border-cyan-500/30 text-slate-100 shadow-cyan-950/40"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- TOP CONSOLE HEADER & PERSISTENT ATMOSPHERIC STRIP --- */}
        <div
          className={`p-4 sm:p-5 border-b shrink-0 ${
            isLight
              ? "bg-white/90 border-slate-200"
              : "bg-slate-900/90 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center border shadow-xs ${
                  isLight
                    ? "bg-cyan-100 border-cyan-300 text-cyan-800"
                    : "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                }`}
              >
                <Sparkles className="w-5 h-5 animate-pulse text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight font-mono flex items-center gap-2">
                    <span>Editor Console</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-sans font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      Autonomous Stack
                    </span>
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                  arXiv Next-Day Cadence • BA Atmospheric Telemetry • X Broadcast Engine
                </p>
              </div>
            </div>

            {/* Quick Actions & Close */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchStagedDispatch();
                  fetchXStatus();
                }}
                disabled={dispatchLoading || loadingXStatus}
                title="Refresh Autonomous Stack"
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${dispatchLoading || loadingXStatus ? "animate-spin text-cyan-500" : ""}`} />
              </button>

              <button
                onClick={onClose}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Persistent Icon-First Telemetry Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Location Station */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400">
                <Compass className="w-3.5 h-3.5 text-cyan-500" />
                <span>BA Observatory (-34.6°S)</span>
              </div>

              {/* Seeing / Atmospheric Conditions */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono text-emerald-600 dark:text-emerald-400">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Seeing: 0.85&quot; (Optimal)</span>
              </div>

              {/* Live ART Ticker */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                <Clock className="w-3.5 h-3.5 text-cyan-500" />
                <span>{liveArtClock || "09:00:00 ART"}</span>
              </div>
            </div>

            {/* X Transparent Credits Warning Strip */}
            <a
              href="https://docs.x.com/x-api/getting-started/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono transition-colors group cursor-pointer"
              title="X API v2 requires $5.00 Pay-As-You-Go Credits for direct posting. Click to view official pricing docs."
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-bold">𝕏 Credits: $0.00</span>
              <span className="text-[10px] opacity-80">(Req. ≥$5)</span>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>

          {/* --- PRIMARY 4 TABS (ICONS OVER TEXT) --- */}
          <div className="flex items-center gap-1.5 mt-3 pt-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("dispatch")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "dispatch"
                  ? isLight
                    ? "bg-cyan-600 text-white border-cyan-700 shadow-sm"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>arXiv Next-Day</span>
              {dispatch?.status === "staged_pending_review" && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("climate")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "climate"
                  ? isLight
                    ? "bg-cyan-600 text-white border-cyan-700 shadow-sm"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400"
              }`}
            >
              <CloudSun className="w-4 h-4" />
              <span>Observatory Climate</span>
            </button>

            <button
              onClick={() => setActiveTab("xtest")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "xtest"
                  ? isLight
                    ? "bg-cyan-600 text-white border-cyan-700 shadow-sm"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400"
              }`}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center font-black">𝕏</div>
              <span>X Live Diagnostics</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                $0 Balance
              </span>
            </button>

            <button
              onClick={() => setActiveTab("pipeline")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "pipeline"
                  ? isLight
                    ? "bg-cyan-600 text-white border-cyan-700 shadow-sm"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Pipeline Queue</span>
              {runningJobs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono">
                  {runningJobs.length} active
                </span>
              )}
            </button>
          </div>
        </div>

        {/* --- MAIN TAB CONTENT AREA (SCROLLABLE) --- */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* ======================================================== */}
          {/* TAB 1: ARXIV NEXT-DAY DISPATCH & CANDIDATE DECK          */}
          {/* ======================================================== */}
          {activeTab === "dispatch" && (
            <div className="space-y-6">
              {/* Cadence Status Notice */}
              <div
                className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                  isAlreadyPublished
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-cyan-500/10 border-cyan-500/30 text-cyan-800 dark:text-cyan-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isAlreadyPublished
                        ? "bg-emerald-500 text-white"
                        : "bg-cyan-600 text-white"
                    }`}
                  >
                    {isAlreadyPublished ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                      <span>
                        {isAlreadyPublished
                          ? "Today's Edition Published to Meridian Journal"
                          : "arXiv Next-Day Cadence: Staged for 09:00 AM ART"}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-80">
                      Friday arXiv releases bridge through to Monday 09:00 AM ART • Autonomous quality control
                    </div>
                  </div>
                </div>

                {!isAlreadyPublished && remainingSeconds > 0 && (
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span>Review Window: {formatCountdown(remainingSeconds)}</span>
                  </div>
                )}
              </div>

              {/* Active Staged Preprint Card */}
              {dispatchLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                  <span className="text-xs font-mono">Synthesizing next-day staged candidate...</span>
                </div>
              ) : dispatch ? (
                <div className="space-y-5">
                  {/* Candidate Raytraced Card */}
                  <div
                    ref={cardRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className={`p-5 sm:p-6 rounded-3xl border relative overflow-hidden transition-all ${
                      isLight
                        ? "bg-white border-slate-200 text-slate-900 shadow-md"
                        : "bg-slate-900/80 border-slate-700/60 text-slate-100 shadow-xl"
                    }`}
                    style={{
                      boxShadow: lightState.boxShadow,
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 uppercase">
                          {currentCandidate?.category || dispatch.candidatePaper.category}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                          arXiv: {currentCandidate?.id || dispatch.candidatePaper.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          Score: {currentCandidate?.score || dispatch.candidatePaper.score}/100
                        </span>
                        {candidatesDeck.length > 1 && (
                          <span className="text-[10px] font-mono text-slate-500">
                            Deck {currentDeckIndex + 1} of {candidatesDeck.length}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold leading-snug mb-2">
                      {currentCandidate?.title || dispatch.candidatePaper.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed">
                      {currentCandidate?.excerpt || dispatch.candidatePaper.summary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                      <div className="text-slate-500 dark:text-slate-400 truncate max-w-sm">
                        {currentCandidate?.authors || dispatch.candidatePaper.authors}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewMarkdown(!previewMarkdown)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                            previewMarkdown
                              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                              : isLight
                              ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                              : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{previewMarkdown ? "Hide Preview" : "Article Preview"}</span>
                        </button>

                        <a
                          href={`https://arxiv.org/abs/${currentCandidate?.id || dispatch.candidatePaper.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <span>arXiv Link</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    </div>

                    {/* Markdown Article Preview Drawer */}
                    {previewMarkdown && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-72 overflow-y-auto font-sans text-xs space-y-3 leading-relaxed"
                      >
                        <div className="font-bold text-sm text-cyan-600 dark:text-cyan-400">
                          {dispatch.draftArticle.title}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                          {dispatch.draftArticle.excerpt}
                        </div>
                        <div className="text-slate-500 text-[11px] pt-2 border-t border-slate-200 dark:border-slate-800">
                          Full synthesized manuscript contains {dispatch.draftArticle.content.length} characters with 3 structured analytical sections.
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Candidate Deck Swipe / Selector */}
                  {candidatesDeck.length > 1 && (
                    <div
                      className={`p-4 rounded-2xl border ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-cyan-500" />
                          <span className="text-xs font-bold">Alternate arXiv Candidates in Deck</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSwipe("left")}
                            disabled={actionLoading || isAlreadyPublished}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer disabled:opacity-40"
                            title="Previous candidate"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSwipe("right")}
                            disabled={actionLoading || isAlreadyPublished}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer disabled:opacity-40"
                            title="Next candidate"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {candidatesDeck.map((candidate, idx) => (
                          <button
                            key={candidate.id}
                            onClick={() => handleSelectCandidate(idx)}
                            disabled={actionLoading || isAlreadyPublished}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              idx === currentDeckIndex
                                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                                : isLight
                                ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                : "bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-400"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                              <span>arXiv:{candidate.id}</span>
                              <span className="text-emerald-500 font-bold">{candidate.score} pts</span>
                            </div>
                            <div className="text-xs font-bold line-clamp-1">{candidate.title}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Companion X Post Section */}
                  <div
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center text-xs font-bold">
                          𝕏
                        </div>
                        <span className="text-xs font-bold">Companion Post Payload</span>
                        <span className="text-[10px] font-mono text-cyan-500">@lk3mpe</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            tweetText.length > 280
                              ? "bg-red-500/10 text-red-500 border-red-500/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {tweetText.length}/280 chars
                        </span>
                      </div>
                    </div>

                    <textarea
                      value={tweetText}
                      onChange={(e) => setTweetText(e.target.value)}
                      disabled={actionLoading || isAlreadyPublished}
                      rows={3}
                      className={`w-full p-3 rounded-xl border text-xs leading-relaxed focus:outline-none resize-y ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900"
                          : "bg-slate-950 border-slate-800 text-slate-200 focus:border-cyan-500"
                      }`}
                      placeholder="Companion post text..."
                    />

                    {/* Quick Web Intent Fallback */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-500">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Direct API requires $5 credit. Use Web Intent for 1-click free publish.</span>
                      </div>

                      <a
                        href={`https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-2 border border-slate-700 transition-colors"
                      >
                        <span>𝕏 Web Intent Post</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Primary Editorial Publish Action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="text-xs text-slate-500">
                      {isAlreadyPublished
                        ? "Edition is already live in the journal database."
                        : "Accepting publishes the drafted analysis immediately to Meridian Journal."}
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenInEditor && (
                        <button
                          onClick={() => onOpenInEditor(dispatch.draftArticle)}
                          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Open in Custom Editor
                        </button>
                      )}

                      {!isAlreadyPublished && (
                        <button
                          onClick={handleAcceptAndPublish}
                          disabled={actionLoading}
                          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {actionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          <span>Accept &amp; Publish Edition</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No staged dispatch currently in queue.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: OBSERVATORY CLIMATE & SKY TELEMETRY               */}
          {/* ======================================================== */}
          {activeTab === "climate" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-800 dark:text-cyan-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-500" />
                  <span className="font-bold">Astronomical Weather &amp; Seeing Conditions</span>
                </div>
                <div className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
                  Station: Buenos Aires Observatory (-34.6037° S, -58.3816° W)
                </div>
              </div>

              {/* Dedicated Full Observatory Deck */}
              <ObservatoryTelemetryDeck
                artTimeStr={liveArtClock}
                isPendingReview={dispatch?.status === "staged_pending_review"}
                remainingSeconds={remainingSeconds}
                formatCountdown={formatCountdown}
                isAlreadyPublished={isAlreadyPublished}
                scheduledTimeLabel="Tomorrow 09:00 AM ART"
                theme={theme}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: X BROADCAST & TRANSPARENT $5 CREDIT DIAGNOSTICS   */}
          {/* ======================================================== */}
          {activeTab === "xtest" && (
            <div className="space-y-5">
              {/* TRANSPARENT $5 DEVELOPER CREDITS NOTICE BANNER */}
              <div
                className={`p-5 rounded-3xl border relative overflow-hidden ${
                  isLight
                    ? "bg-amber-50/80 border-amber-300 text-amber-950"
                    : "bg-amber-950/30 border-amber-500/40 text-amber-100"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-500">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold tracking-tight">
                          X API Balance: $0.00 (Minimum $5 Pay-As-You-Go Required)
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                          HTTP 402/403 Depleted
                        </span>
                      </div>

                      <a
                        href="https://docs.x.com/x-api/getting-started/pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>X API Pricing Docs</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <p className="text-xs leading-relaxed opacity-90">
                      The X Developer Platform requires an active Pay-As-You-Go balance of at least <strong>$5.00</strong> to execute programmatic API calls (<code className="font-mono text-[11px] px-1 py-0.5 rounded bg-amber-500/20">POST /2/tweets</code>). With a $0.00 balance, the API returns insufficient credits.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <a
                        href={`https://x.com/intent/tweet?text=${encodeURIComponent(testPayloadText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer border border-slate-700"
                      >
                        <div className="w-3.5 h-3.5 flex items-center justify-center font-black">𝕏</div>
                        <span>1-Click Web Intent (Free &amp; Instant)</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>

                      <a
                        href="https://console.x.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                        <span>Add Credits at console.x.com</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Connection Status Badge */}
              <div
                className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                  isLight ? "bg-white border-slate-200" : "bg-slate-900/70 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-sm font-bold border border-slate-700">
                    𝕏
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span>Verified Account: @{xStatus?.username || "lk3mpe"}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      OAuth 2.0 User Context • Connected &amp; Authenticated
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchXStatus}
                    disabled={loadingXStatus}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingXStatus ? "animate-spin text-cyan-500" : ""}`} />
                    <span>Verify Status</span>
                  </button>
                </div>
              </div>

              {/* Test Tweet Payload Editor */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                  isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs font-bold">Test Tweet Payload</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        testPayloadText.length > 280
                          ? "bg-red-500/10 text-red-500 border-red-500/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {testPayloadText.length}/280
                    </span>

                    <button
                      onClick={() => {
                        const now = new Date();
                        const timeStr = now.toLocaleTimeString("en-US", {
                          timeZone: "America/Argentina/Buenos_Aires",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        });
                        const randNum = Math.floor(1000 + Math.random() * 9000);
                        setTestPayloadText(
                          `Meridian Journal [Pipeline Verification • ${timeStr} ART #${randNum}] — Autonomous OAuth 2.0 User Context live test for @${xStatus?.username || "lk3mpe"}. Autonomous frontier physics & quantum optics: https://ask-meridian.uk #QuantumOptics #arXiv`
                        );
                      }}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Reset Text
                    </button>
                  </div>
                </div>

                <textarea
                  value={testPayloadText}
                  onChange={(e) => setTestPayloadText(e.target.value)}
                  disabled={isPostingTest}
                  rows={3}
                  className={`w-full p-3 rounded-xl border text-xs leading-relaxed focus:outline-none resize-y ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-slate-950 border-slate-800 text-slate-200 focus:border-cyan-500"
                  }`}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunTestTweet}
                      disabled={isPostingTest}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-2 border border-slate-600 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isPostingTest ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>Post Test Tweet to X Account</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                        $5 Credit Req
                      </span>
                    </button>

                    <a
                      href={`https://x.com/intent/tweet?text=${encodeURIComponent(testPayloadText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-2 border border-slate-700 transition-colors"
                    >
                      <span>Web Intent</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-xs text-slate-500 hover:text-slate-300 underline cursor-pointer"
                    >
                      {showRawJson ? "Hide Raw Response" : "View Raw Logs"}
                    </button>
                  </div>
                </div>

                {/* Diagnostics Result Card */}
                {testTweetResult && (
                  <div
                    className={`mt-4 p-4 rounded-2xl border text-xs space-y-2 ${
                      testTweetResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {testTweetResult.success ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Coins className="w-4 h-4 text-amber-400" />
                        )}
                        <span>{testTweetResult.diagnosisTitle || "X Test Execution Result"}</span>
                      </div>
                      <span className="font-mono text-[10px] opacity-70">
                        HTTP {testTweetResult.httpStatus || 402}
                      </span>
                    </div>

                    <div className="opacity-90 leading-relaxed text-[11px]">
                      {testTweetResult.diagnosisDetail || testTweetResult.error}
                    </div>

                    {testTweetResult.isCreditDepleted && (
                      <div className="pt-2 flex items-center gap-3">
                        <a
                          href="https://docs.x.com/x-api/getting-started/pricing"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold inline-flex items-center gap-1.5"
                        >
                          <span>Review $5 Pay-As-You-Go Tier</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <a
                          href={`https://x.com/intent/tweet?text=${encodeURIComponent(testPayloadText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Post with 1-Click Web Intent instead</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Raw JSON viewer */}
                {showRawJson && (
                  <div className="mt-3 p-3 rounded-xl bg-black border border-slate-800 text-[10px] font-mono text-cyan-400 max-h-48 overflow-y-auto">
                    <pre>{JSON.stringify(testTweetResult || xStatus, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: PIPELINE QUEUE & ARXIV SYNTHESIS                  */}
          {/* ======================================================== */}
          {activeTab === "pipeline" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-500" />
                  <span className="font-bold">arXiv Synthesis Engine Status</span>
                </div>

                <div className="flex items-center gap-2">
                  {onClearFinishedJobs && (
                    <button
                      onClick={onClearFinishedJobs}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Clear Finished
                    </button>
                  )}
                  {onOpenCreate && (
                    <button
                      onClick={onOpenCreate}
                      className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      + New Synthesis
                    </button>
                  )}
                </div>
              </div>

              {activeJobs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No active generation jobs in queue.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeJobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        job.status === "generating"
                          ? "bg-cyan-500/10 border-cyan-500/30"
                          : job.status === "completed"
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-red-500/10 border-red-500/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold">
                            {job.arxivId ? `arXiv:${job.arxivId}` : job.title || "Paper Synthesis"}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase bg-black/20">
                            {job.status}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono opacity-80">
                          {formatElapsedTime(job.startedAt, now)}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-black/20 overflow-hidden mb-3">
                        <div
                          className="h-full bg-cyan-500 transition-all duration-300"
                          style={{ width: `${job.progress || 0}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="opacity-80">
                          {job.currentStep || "Processing synthesis pipeline..."}
                        </div>

                        <div className="flex items-center gap-2">
                          {job.status === "completed" && job.resultBlog && onSelectBlog && (
                            <button
                              onClick={() => {
                                onSelectBlog(job.resultBlog!);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer"
                            >
                              View Article
                            </button>
                          )}

                          {job.status === "failed" && onRetryJob && (
                            <button
                              onClick={() => onRetryJob(job.arxivId || job.title || "")}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors cursor-pointer"
                            >
                              Retry
                            </button>
                          )}

                          {onDismissJob && (
                            <button
                              onClick={() => onDismissJob(job.id)}
                              className="p-1 rounded-lg hover:bg-black/20 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                              title="Dismiss"
                            >
                              <CloseIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
