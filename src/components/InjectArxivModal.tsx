import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ArrowLeftRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X as CloseIcon,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Zap,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { BlogPost } from "../types";
import { extractArxivId } from "../lib/arxivUtils";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState,
  LightState
} from "../lib/rayTracingUtils";

interface InjectArxivModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBlog: BlogPost | null;
  editorPassword?: string;
  onArticleInjected: (updatedBlog: BlogPost, previousBlogId: string) => void;
  theme?: "light" | "dark";
}

interface ArxivPreviewData {
  title: string;
  summary: string;
  authors: string;
  arxivLink: string;
  arxivId: string;
}

const PIPELINE_INJECTION_STEPS = [
  "1. Resolving authoritative arXiv metadata & citations",
  "2. Formulating LaTeX equations & theoretical derivations",
  "3. Synthesizing executive takeaways & scholarly prose",
  "4. Rendering bespoke vector SVG banner artwork",
  "5. Committing multi-tier persistence (JSON, TS, Sitemap)"
];

export const InjectArxivModal: React.FC<InjectArxivModalProps> = ({
  isOpen,
  onClose,
  targetBlog,
  editorPassword,
  onArticleInjected,
  theme = "dark"
}) => {
  const [arxivInput, setArxivInput] = useState("");
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ArxivPreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [updateSlug, setUpdateSlug] = useState(true);
  const [preserveOrder, setPreserveOrder] = useState(true);

  const [isInjecting, setIsInjecting] = useState(false);
  const [injectionStepIndex, setInjectionStepIndex] = useState(0);
  const [injectionError, setInjectionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const [lightState, setLightState] = useState<LightState>(getDefaultLightState());

  // Reset state when opening or when target changes
  useEffect(() => {
    if (isOpen) {
      setArxivInput("");
      setDetectedId(null);
      setPreviewData(null);
      setPreviewError(null);
      setInjectionError(null);
      setIsInjecting(false);
      setInjectionStepIndex(0);
    }
  }, [isOpen, targetBlog?.id]);

  // Live arXiv ID detection
  useEffect(() => {
    if (!arxivInput.trim()) {
      setDetectedId(null);
      setPreviewData(null);
      setPreviewError(null);
      return;
    }

    const parsed = extractArxivId(arxivInput);
    setDetectedId(parsed);

    if (parsed) {
      // Debounce auto-fetch preview
      const timer = setTimeout(() => {
        fetchPreview(parsed);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPreviewData(null);
      setPreviewError("Enter a valid arXiv URL (e.g., https://arxiv.org/abs/2609.10535) or paper ID (e.g., 2609.10535)");
    }
  }, [arxivInput]);

  // Ray-traced cursor tracking
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current) return;
      const rect = modalRef.current.getBoundingClientRect();
      const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
      const computed = computeRayTracedLightState(normX, normY, 4, 25);
      setLightState(computed);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isOpen]);

  // Progress step animation while injecting
  useEffect(() => {
    if (!isInjecting) return;
    const interval = setInterval(() => {
      setInjectionStepIndex((prev) => {
        if (prev < PIPELINE_INJECTION_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3800);
    return () => clearInterval(interval);
  }, [isInjecting]);

  const fetchPreview = async (idToFetch: string) => {
    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/arxiv/preview?url=${encodeURIComponent(idToFetch)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Could not retrieve paper metadata from arXiv.");
      }
      const data = await res.json();
      if (data.success && data.metadata) {
        setPreviewData(data.metadata);
      } else {
        throw new Error("Invalid preview payload received.");
      }
    } catch (err: any) {
      setPreviewError(err.message || "Failed to load arXiv preview");
      setPreviewData(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setArxivInput(text.trim());
      }
    } catch (_) {
      // Fallback if permission blocked
    }
  };

  const handleExecuteInjection = async () => {
    if (!targetBlog) return;
    if (!detectedId) {
      setInjectionError("Please provide a valid arXiv URL or identifier before injecting.");
      return;
    }

    setIsInjecting(true);
    setInjectionError(null);
    setInjectionStepIndex(0);

    const activePassword =
      editorPassword ||
      sessionStorage.getItem("meridian_editor_pwd") ||
      localStorage.getItem("meridian_editor_pwd") ||
      "meridian";

    try {
      const res = await fetch("/api/blog/inject-arxiv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetBlogId: targetBlog.id,
          arxivInput: arxivInput.trim(),
          password: activePassword,
          updateSlug,
          preserveId: !updateSlug,
          seed: Date.now()
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to inject and regenerate article.");
      }

      const data = await res.json();
      if (data.success && data.blog) {
        onArticleInjected(data.blog, targetBlog.id);
        onClose();
      } else {
        throw new Error("Invalid server response received.");
      }
    } catch (err: any) {
      console.error("Injection error:", err);
      setInjectionError(err.message || "Article injection failed.");
      setIsInjecting(false);
    }
  };

  if (!isOpen || !targetBlog) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isInjecting ? onClose : undefined}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-2xl rounded-2xl overflow-hidden p-[1.5px] z-10 shadow-2xl my-auto"
          style={{
            transform: `perspective(1000px) rotateX(${lightState.tiltX}deg) rotateY(${lightState.tiltY}deg)`,
            boxShadow: `${lightState.shadowX}px ${lightState.shadowY}px 35px -5px rgba(168, 85, 247, 0.3), 0 0 30px 2px rgba(147, 51, 234, 0.15)`
          }}
        >
          {/* Ray-traced ambient border */}
          <div
            className="absolute -inset-[150%] animate-[spin_12s_linear_infinite] opacity-80"
            style={{
              background: `conic-gradient(from ${lightState.angle}deg, #a855f7, #3b82f6, #06b6d4, #a855f7)`
            }}
          />

          {/* Modal Card Inner */}
          <div className="relative bg-neutral-950/95 backdrop-blur-2xl rounded-[15px] overflow-hidden border border-purple-900/50 p-6 sm:p-8 space-y-6 text-neutral-100 shadow-inner">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md shrink-0">
                  <ArrowLeftRight className="w-5 h-5 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-serif font-bold text-white tracking-tight">
                      Inject arXiv Paper
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-mono font-bold uppercase tracking-wider">
                      Editor Handpick
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Replace this publication in-place with a carefully selected arXiv research paper.
                  </p>
                </div>
              </div>

              {!isInjecting && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Target Article Card (Current slot) */}
            <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                <span>Current Slot Target</span>
                <span className="text-purple-400">Will Be Replaced</span>
              </div>
              <div className="font-serif font-bold text-sm text-neutral-200 line-clamp-1">
                {targetBlog.title}
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400 flex-wrap">
                {targetBlog.arxivLink && (
                  <span className="flex items-center gap-1 text-cyan-400 truncate max-w-xs">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {targetBlog.arxivLink}
                  </span>
                )}
                <span>Published: {targetBlog.date}</span>
                <span>{targetBlog.readingTime}</span>
              </div>
            </div>

            {/* New arXiv Input Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  New arXiv URL or Paper ID
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-[10px] font-mono text-purple-300 hover:text-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  Paste Clipboard
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={arxivInput}
                  disabled={isInjecting}
                  onChange={(e) => setArxivInput(e.target.value)}
                  placeholder="e.g. https://arxiv.org/abs/2609.10535 or 2408.09854"
                  className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl text-sm font-mono text-white placeholder-neutral-500 transition-all outline-none"
                />
                {detectedId && (
                  <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    arXiv:{detectedId}
                  </div>
                )}
              </div>
            </div>

            {/* Live Paper Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                <span>Authoritative Paper Metadata</span>
                {isPreviewLoading && (
                  <span className="flex items-center gap-1 text-purple-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Fetching arXiv...
                  </span>
                )}
              </div>

              {previewData ? (
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2 animate-fade-in">
                  <div className="text-xs font-mono font-bold text-purple-300">
                    {previewData.title}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400">
                    Authors: <span className="text-neutral-300">{previewData.authors}</span>
                  </div>
                  <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                    {previewData.summary}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                    <a
                      href={previewData.arxivLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on arXiv.org
                    </a>
                    <span className="text-emerald-400 font-bold">Metadata Verified</span>
                  </div>
                </div>
              ) : previewError && arxivInput.trim() ? (
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{previewError}</span>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/60 text-center text-xs text-neutral-500 font-mono">
                  Paste or introduce an arXiv link above to view live paper metadata preview.
                </div>
              )}
            </div>

            {/* Replacement Options */}
            <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-mono text-neutral-300 select-none">
                <input
                  type="checkbox"
                  checked={updateSlug}
                  disabled={isInjecting}
                  onChange={(e) => setUpdateSlug(e.target.checked)}
                  className="rounded border-neutral-700 text-purple-600 focus:ring-purple-500 bg-neutral-950 w-4 h-4"
                />
                <span>Update URL slug to reflect new handpicked paper</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-mono text-neutral-300 select-none">
                <input
                  type="checkbox"
                  checked={preserveOrder}
                  disabled={isInjecting}
                  onChange={(e) => setPreserveOrder(e.target.checked)}
                  className="rounded border-neutral-700 text-purple-600 focus:ring-purple-500 bg-neutral-950 w-4 h-4"
                />
                <span>Maintain slot position in catalog feed</span>
              </label>
            </div>

            {/* Error Message */}
            {injectionError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{injectionError}</span>
              </div>
            )}

            {/* In-Progress Pipeline View */}
            {isInjecting && (
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-mono text-purple-300 font-bold">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Regenerating Article with Handpicked Paper...</span>
                  </div>
                  <span>Step {injectionStepIndex + 1} / 5</span>
                </div>

                <div className="text-xs font-mono text-neutral-200">
                  {PIPELINE_INJECTION_STEPS[injectionStepIndex]}
                </div>

                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 h-full transition-all duration-500"
                    style={{ width: `${((injectionStepIndex + 1) / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isInjecting}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white font-mono text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isInjecting || !detectedId}
                onClick={handleExecuteInjection}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-600 text-white font-mono text-xs font-bold shadow-lg shadow-purple-900/30 border border-purple-400/40 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                {isInjecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Regenerating Paper...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-4 h-4 text-purple-200" />
                    <span>Inject &amp; Regenerate Article</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
