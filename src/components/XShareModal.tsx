import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X as CloseIcon,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Loader2,
  RefreshCw,
  Compass,
  Zap,
  ShieldCheck,
  FileText
} from "lucide-react";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState
} from "../lib/rayTracingUtils";
import {
  getXPostCache,
  saveXPostCache,
  buildXArticleUrl,
  countSentences
} from "../lib/xUtils";
import {
  draftDistributionNote,
  validateAndSanitizeDistributionNote,
  cleanTextForDistributionNote,
  DistributionNoteValidationResult
} from "../lib/distributionNotePipeline";
import { FormattedMathText } from "./FormattedMathText";

export interface XShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  excerpt: string;
  content?: string;
  tags?: string[];
  arxivLink?: string;
  blogId?: string;
  theme?: "light" | "dark";
}

export const XShareModal: React.FC<XShareModalProps> = ({
  isOpen,
  onClose,
  title,
  excerpt,
  content = "",
  tags = [],
  arxivLink = "https://arxiv.org",
  blogId,
  theme,
}) => {
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [headline, setHeadline] = useState<string | null>(null);
  const [isPublishingDirectly, setIsPublishingDirectly] = useState(false);
  const [publishResult, setPublishResult] = useState<any | null>(null);
  const [validationResult, setValidationResult] = useState<DistributionNoteValidationResult | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const [lightState, setLightState] = useState(getDefaultLightState());

  // Determine dark mode matching system settings or explicit app theme
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const isDark = theme ? theme === "dark" : systemPrefersDark;

  // Interactive Ray Tracing Pitch, Yaw, Roll & Hover Chasing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current) return;
      const rect = modalRef.current.getBoundingClientRect();
      const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
      const computed = computeRayTracedLightState(normX, normY, 8, 25);
      setLightState(computed);
    };

    if (isOpen) {
      window.addEventListener("mousemove", handleMouseMove);
    }
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isOpen]);

  // Run the unit test validation pipeline on the note text
  const runValidation = (text: string) => {
    const result = validateAndSanitizeDistributionNote(text);
    setValidationResult(result);
    return result;
  };

  // Generate / draft the Distribution Note using local pipeline + optional server AI enhancement
  const generateDistributionNote = async (forceRefresh: boolean = false) => {
    const cacheKey = blogId || title;

    // Check persistent cache first (survives reloads & browser close)
    if (!forceRefresh && cacheKey) {
      const cached = getXPostCache(cacheKey);
      if (cached && cached.draftText) {
        const validated = runValidation(cached.draftText);
        setDraftText(validated.sanitizedText);
        setHeadline(cached.headline || `Distribution Note: ${cleanTextForDistributionNote(title).slice(0, 50)}`);
        return;
      }
    }

    setIsGenerating(true);
    try {
      const articleUrl = buildXArticleUrl(blogId);
      const response = await fetch("/api/x/generate-post", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          tags,
          arxivLink,
          blogId,
          articleUrl,
          tone: "future"
        })
      });

      let finalDraft = "";
      let finalHeadline = `Distribution Note: ${cleanTextForDistributionNote(title).slice(0, 55)}`;

      if (response.ok) {
        const data = await response.json();
        if (data && data.postText) {
          finalDraft = data.postText;
          if (data.headline) {
            finalHeadline = cleanTextForDistributionNote(data.headline);
          }
        }
      }

      // If server response is empty or failed, generate deterministically via our local pipeline
      if (!finalDraft) {
        const localDraft = draftDistributionNote({
          title,
          excerpt,
          content,
          tags,
          blogId,
          blogUrl: articleUrl
        });
        finalDraft = localDraft.noteText;
        finalHeadline = localDraft.headline;
      }

      // Run through strict post-generation validation pipeline (0 emojis, human-readable Unicode, sentence length)
      const validated = runValidation(finalDraft);
      const readyText = validated.sanitizedText;

      setDraftText(readyText);
      setHeadline(finalHeadline);

      if (cacheKey) {
        saveXPostCache(cacheKey, {
          draftText: readyText,
          headline: finalHeadline,
          tone: "future"
        });
      }
    } catch (err) {
      console.warn("Server AI generation fallback engaged for Distribution Note:", err);
      const articleUrl = buildXArticleUrl(blogId);
      const localDraft = draftDistributionNote({
        title,
        excerpt,
        content,
        tags,
        blogId,
        blogUrl: articleUrl
      });
      const validated = runValidation(localDraft.noteText);
      setDraftText(validated.sanitizedText);
      setHeadline(localDraft.headline);

      if (cacheKey) {
        saveXPostCache(cacheKey, {
          draftText: validated.sanitizedText,
          headline: localDraft.headline,
          tone: "future"
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger generation when modal opens
  useEffect(() => {
    if (isOpen && title) {
      setCopied(false);
      setPublishResult(null);
      generateDistributionNote(false);
    }
  }, [isOpen, title, excerpt, blogId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setDraftText(text);
    runValidation(text);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDirectPostToX = async () => {
    setIsPublishingDirectly(true);
    setPublishResult(null);
    try {
      const res = await fetch("/api/x/publish-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draftText }),
      });
      const data = await res.json();
      setPublishResult(data);
    } catch (err: any) {
      setPublishResult({
        success: false,
        error: err.message || "Network error posting to X API",
      });
    } finally {
      setIsPublishingDirectly(false);
    }
  };

  const currentSentenceCount = countSentences(draftText);
  const isExactlyThreeSentences = currentSentenceCount === 3;
  const tweetIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(draftText)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay supporting dark / bright modes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`absolute inset-0 backdrop-blur-md transition-colors ${
              isDark ? "bg-black/85" : "bg-slate-900/40"
            }`}
          />

          {/* Modal Container with Pitch, Yaw, Roll 3D Chasing Optics */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className={`relative w-full max-w-lg group p-[2px] rounded-2xl overflow-hidden shadow-2xl z-10 font-sans transition-transform duration-150 ease-out ${
              isDark ? "text-white" : "text-slate-900"
            }`}
            style={{
              transform: `perspective(1000px) rotateX(${lightState.pitch}deg) rotateY(${lightState.yaw}deg) rotateZ(${lightState.roll}deg)`,
              boxShadow: isGenerating
                ? `${lightState.shadowX}px ${lightState.shadowY}px 35px -5px rgba(6, 182, 212, 0.45), 0 0 45px 5px rgba(168, 85, 247, 0.3)`
                : isDark
                ? `${lightState.shadowX}px ${lightState.shadowY}px 30px -5px rgba(255, 255, 255, 0.12), 0 0 35px 2px rgba(6, 182, 212, 0.2)`
                : `${lightState.shadowX}px ${lightState.shadowY}px 25px -4px rgba(14, 165, 233, 0.2), 0 10px 30px -5px rgba(0, 0, 0, 0.1)`
            }}
          >
            {/* Dynamic Ray Traced Conic Neon Light Ring */}
            <div
              className={`absolute -inset-[150%] animate-[spin_8s_linear_infinite] blur-xl group-hover:opacity-100 transition-opacity ${
                isDark ? "opacity-80" : "opacity-40"
              }`}
              style={{
                background: isGenerating
                  ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #6366f1, #ec4899, #ffffff)`
                  : isDark
                  ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #3b82f6, #64748b, #ffffff)`
                  : `conic-gradient(from ${lightState.angle}deg, #0284c7, #06b6d4, #38bdf8, #94a3b8, #0284c7)`
              }}
            />

            {/* Dynamic Neon Refraction Border */}
            <div
              className={`absolute -inset-[150%] animate-[spin_8s_linear_infinite] ${
                isDark ? "opacity-90" : "opacity-35"
              }`}
              style={{
                background: isGenerating
                  ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #6366f1, #ec4899, #ffffff)`
                  : isDark
                  ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #3b82f6, #64748b, #ffffff)`
                  : `conic-gradient(from ${lightState.angle}deg, #0284c7, #06b6d4, #38bdf8, #94a3b8, #0284c7)`
              }}
            />

            {/* Inner Metallic Card Panel */}
            <div
              className={`relative backdrop-blur-xl rounded-[14px] w-full overflow-hidden p-5 space-y-4 shadow-inner transition-colors ${
                isDark
                  ? "bg-neutral-950/95 border border-neutral-800/90 text-white"
                  : "bg-white/95 border border-slate-200/90 text-slate-900"
              }`}
            >
              {/* Specular Highlight Overlay */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-25 group-hover:opacity-50"
                style={{
                  background: isDark
                    ? `radial-gradient(circle 260px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.25), rgba(6, 182, 212, 0.15) 40%, transparent 70%)`
                    : `radial-gradient(circle 260px at ${lightState.lightX}% ${lightState.lightY}%, rgba(14, 165, 233, 0.15), rgba(56, 189, 248, 0.08) 40%, transparent 70%)`
                }}
              />

              {/* Top Shimmer Accent Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

              {/* Header & Badges */}
              <div
                className={`flex items-center justify-between pb-2 border-b relative z-10 ${
                  isDark ? "border-neutral-800/80" : "border-slate-200/80"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg border shadow-sm flex items-center justify-center ${
                      isDark
                        ? "bg-black text-white border-neutral-700/80"
                        : "bg-slate-900 text-white border-slate-700"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3
                      className={`font-serif font-bold italic text-sm flex items-center gap-1.5 leading-none ${
                        isDark ? "text-neutral-100" : "text-slate-900"
                      }`}
                    >
                      Distribution Note (Writer)
                      <span className="inline-flex items-center gap-1 text-[9px] font-sans font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full">
                        <Sparkles className="w-2.5 h-2.5" /> Pipeline
                      </span>
                    </h3>
                    {headline && (
                      <p
                        className={`text-[10px] font-mono font-medium truncate max-w-[260px] mt-0.5 ${
                          isDark ? "text-cyan-400" : "text-cyan-700 font-semibold"
                        }`}
                      >
                        {headline}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full border flex items-center gap-1 ${
                      isExactlyThreeSentences
                        ? isDark
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : isDark
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-amber-50 text-amber-800 border-amber-300"
                    }`}
                  >
                    {currentSentenceCount} sentences
                  </span>
                  <button
                    onClick={onClose}
                    className={`p-1 rounded-full transition-colors cursor-pointer ${
                      isDark
                        ? "hover:bg-neutral-800 text-neutral-400 hover:text-white"
                        : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Source Paper Title Banner with Human-Readable Math Rendering */}
              <div
                className={`relative z-10 px-3 py-2 rounded-xl border text-xs leading-relaxed flex flex-col gap-1 ${
                  isDark
                    ? "bg-neutral-900/90 border-neutral-800 text-neutral-300"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold">
                  <span>Source Research</span>
                  {arxivLink && (
                    <a
                      href={arxivLink}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      <span>arXiv</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <FormattedMathText
                  as="div"
                  text={title}
                  className="font-serif font-bold italic line-clamp-2 text-slate-900 dark:text-neutral-100"
                />
              </div>

              {/* Dedicated Perspective Banner: Futuristic Vision Only */}
              <div
                className={`relative z-10 flex items-center justify-between px-3 py-2 rounded-xl border shadow-inner ${
                  isDark
                    ? "bg-neutral-900/90 border-cyan-500/30 text-neutral-100"
                    : "bg-cyan-50/70 border-cyan-200 text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-1.5 rounded-lg border ${
                      isDark
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                        : "bg-cyan-100 text-cyan-800 border-cyan-300"
                    }`}
                  >
                    <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold flex items-center gap-1.5">
                      <span>Futuristic Vision</span>
                      <span
                        className={`text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          isDark
                            ? "bg-cyan-950/70 text-cyan-300 border-cyan-700/50"
                            : "bg-cyan-100 text-cyan-800 border-cyan-300"
                        }`}
                      >
                        Exclusive Perspective
                      </span>
                    </div>
                    <div
                      className={`text-[10px] font-sans leading-tight ${
                        isDark ? "text-neutral-400" : "text-slate-600"
                      }`}
                    >
                      Strict 3-sentence format • Zero emojis • Human-readable formulas
                    </div>
                  </div>
                </div>
                <div className="shrink-0 pl-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded-lg border ${
                      isDark
                        ? "bg-cyan-950/40 text-cyan-300 border-cyan-800/30"
                        : "bg-white text-cyan-800 border-cyan-200 shadow-sm"
                    }`}
                  >
                    <Zap className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> 3 Sentences
                  </span>
                </div>
              </div>

              {/* Generated 3-Sentence Note Text Area */}
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center justify-between">
                  <label
                    className={`text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                      isDark ? "text-neutral-400" : "text-slate-600"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                    Distribution Note Body
                  </label>
                  <button
                    type="button"
                    onClick={() => generateDistributionNote(true)}
                    disabled={isGenerating}
                    className={`text-[10px] flex items-center gap-1 font-mono cursor-pointer transition-colors px-2 py-0.5 rounded border ${
                      isDark
                        ? "text-cyan-400 hover:text-cyan-300 bg-cyan-950/50 border-cyan-800/40 hover:bg-cyan-900/60"
                        : "text-cyan-700 hover:text-cyan-800 bg-cyan-50 border-cyan-200 hover:bg-cyan-100"
                    }`}
                    title="Re-synthesize Note using pipeline"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isGenerating ? "animate-spin" : ""}`} />
                    <span>Re-synthesize</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    value={draftText}
                    onChange={handleTextChange}
                    rows={6}
                    disabled={isGenerating}
                    className={`w-full text-xs rounded-xl p-3.5 outline-none transition-all resize-none font-sans leading-relaxed disabled:opacity-60 shadow-inner ${
                      isDark
                        ? "bg-neutral-900/90 hover:bg-neutral-900 focus:bg-neutral-950 text-neutral-100 border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                        : "bg-slate-50 hover:bg-slate-50 focus:bg-white text-slate-900 border border-slate-300 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30"
                    }`}
                    placeholder="Drafting executive 3-sentence Distribution Note..."
                  />
                  {isGenerating && (
                    <div
                      className={`absolute inset-0 backdrop-blur-[2px] flex items-center justify-center rounded-xl gap-2 text-xs font-medium ${
                        isDark ? "bg-neutral-950/85 text-cyan-300" : "bg-white/85 text-cyan-700"
                      }`}
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                      <span>Synthesizing note via verified pipeline...</span>
                    </div>
                  )}
                </div>

                {/* Live Unit-Test Pipeline Verification Indicator */}
                <div
                  className={`flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded-lg border ${
                    validationResult && !validationResult.hasEmoji && !validationResult.hasRawLatex
                      ? isDark
                        ? "bg-emerald-950/30 text-emerald-400 border-emerald-800/40"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : isDark
                      ? "bg-amber-950/30 text-amber-300 border-amber-800/40"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Unit Test Pipeline:</span>
                    <span className="font-bold">
                      {validationResult && !validationResult.hasEmoji && !validationResult.hasRawLatex
                        ? "Verified (0 Emojis • Human-Readable)"
                        : "Sanitizing Artifacts..."}
                    </span>
                  </div>
                  <span>{draftText.length} chars</span>
                </div>
              </div>

              {publishResult && (
                <div
                  className={`p-3 rounded-xl text-xs space-y-1 relative z-10 ${
                    publishResult.success
                      ? isDark
                        ? "bg-emerald-950/50 border border-emerald-500/40 text-emerald-200"
                        : "bg-emerald-50 border border-emerald-300 text-emerald-900"
                      : isDark
                      ? "bg-red-950/50 border border-red-500/40 text-red-200"
                      : "bg-red-50 border border-red-300 text-red-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {publishResult.success ? "Published to X (@lk3mpe)!" : "X Direct Dispatch Notice"}
                    </span>
                    {publishResult.tweetUrl && (
                      <a
                        href={publishResult.tweetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-600 dark:text-cyan-300 hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>View Tweet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {!publishResult.success && (
                    <p className="text-[11px] opacity-90">
                      {publishResult.error || "Requires attention. Use Share on X Intent as fallback."}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1 relative z-10">
                <button
                  onClick={handleDirectPostToX}
                  disabled={isPublishingDirectly || !draftText.trim()}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isPublishingDirectly ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Posting to @lk3mpe...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span>Post Directly to @lk3mpe</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopy}
                  className={`px-4 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 ${
                    isDark
                      ? "bg-white hover:bg-neutral-200 text-black"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <a
                  href={tweetIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md text-center cursor-pointer active:scale-95 border ${
                    isDark
                      ? "bg-black hover:bg-neutral-900 text-white border-neutral-700/80 hover:border-cyan-500/40"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 hover:border-cyan-600"
                  }`}
                >
                  <span>Intent</span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Re-export as alias for backwards compatibility if needed
export { XShareModal as LinkedInShareModal };
export { XShareModal as DistributionNoteModal };
