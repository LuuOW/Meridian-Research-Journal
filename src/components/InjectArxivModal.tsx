import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ArrowLeftRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Copy
} from "lucide-react";
import { BlogPost } from "../types";
import { parseArxivInput, parseInjectionResponse, getInjectModalThemeTokens } from "../lib/arxivInjectionUtils";

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
}

const SAMPLE_PREPRINTS = [
  { id: "2609.10533", label: "2609.10533 (Noether Symmetries)" },
  { id: "2408.09854", label: "2408.09854 (DC-DC Stability)" }
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
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectionStatusMessage, setInjectionStatusMessage] = useState("");
  const [injectionError, setInjectionError] = useState<string | null>(null);

  const isLight = theme === "light";

  // Reset state on open or target change
  useEffect(() => {
    if (isOpen) {
      setArxivInput("");
      setDetectedId(null);
      setPreviewData(null);
      setPreviewError(null);
      setInjectionError(null);
      setIsInjecting(false);
      setInjectionStatusMessage("");
    }
  }, [isOpen, targetBlog?.id]);

  // Live arXiv ID detection and metadata preview
  useEffect(() => {
    const parsed = parseArxivInput(arxivInput);
    if (!parsed.isValid || !parsed.arxivId) {
      setDetectedId(null);
      setPreviewData(null);
      setPreviewError(null);
      return;
    }

    setDetectedId(parsed.arxivId);

    const timer = setTimeout(async () => {
      setIsPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await fetch(`/api/arxiv/preview?url=${encodeURIComponent(parsed.arxivId!)}`);
        const rawText = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          // Ignore parse errors, fallback will be used
        }

        if (res.ok && data?.metadata) {
          setPreviewData(data.metadata);
        } else {
          // Graceful fallback display so user is never blocked
          setPreviewData({
            title: `Preprint arXiv:${parsed.arxivId}`,
            summary: "Authoritative research preprint identified. Full synthesis and derivations will be generated upon injection.",
            authors: "arXiv Research Contributors",
            arxivLink: `https://arxiv.org/abs/${parsed.arxivId}`
          });
        }
      } catch {
        setPreviewData({
          title: `Preprint arXiv:${parsed.arxivId}`,
          summary: "Preprint identified. Full text and formulas will be synthesized automatically.",
          authors: "arXiv Research Contributors",
          arxivLink: `https://arxiv.org/abs/${parsed.arxivId}`
        });
      } finally {
        setIsPreviewLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [arxivInput]);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) setArxivInput(text.trim());
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleExecuteInjection = async () => {
    if (!targetBlog || !detectedId) return;

    setIsInjecting(true);
    setInjectionError(null);
    setInjectionStatusMessage("Resolving metadata & synthesis pipeline...");

    try {
      const activePassword =
        editorPassword ||
        sessionStorage.getItem("meridian_editor_pwd") ||
        localStorage.getItem("meridian_editor_pwd") ||
        "meridian";

      const timer1 = setTimeout(() => {
        setInjectionStatusMessage("Authoring mathematical derivations & LaTeX...");
      }, 1200);

      const timer2 = setTimeout(() => {
        setInjectionStatusMessage("Rendering vector banner & committing changes...");
      }, 3000);

      const res = await fetch("/api/blog/inject-arxiv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-editor-password": activePassword
        },
        body: JSON.stringify({
          targetBlogId: targetBlog.id,
          arxivInput: arxivInput.trim(),
          password: activePassword,
          updateSlug,
          preserveId: !updateSlug,
          seed: Date.now()
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const rawText = await res.text();
      const parsedResult = parseInjectionResponse(rawText, res.status, res.statusText);

      if (!parsedResult.success || !parsedResult.blog) {
        throw new Error(parsedResult.error || "Article injection failed.");
      }

      onArticleInjected(parsedResult.blog, targetBlog.id);
      onClose();
    } catch (err: any) {
      console.error("Injection error:", err);
      setInjectionError(err.message || "Article injection failed. Please check the arXiv URL or ID.");
      setIsInjecting(false);
    }
  };

  if (!isOpen || !targetBlog) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={`relative w-full max-w-lg rounded-2xl border ${
            isLight ? "bg-white border-neutral-200 text-neutral-900" : "bg-neutral-950 border-neutral-800 text-white"
          } p-6 shadow-2xl space-y-4`}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold leading-tight">
                  Inject &amp; Replace arXiv Paper
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  Replace publication slot with an arXiv preprint
                </p>
              </div>
            </div>

            {!isInjecting && (
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Current Target Slot (Minimalist) */}
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-mono">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Target Slot:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate block">
                {targetBlog.title}
              </span>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded-md border border-purple-200 dark:border-purple-800/60">
              In-Place
            </span>
          </div>

          {/* Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                arXiv URL or Paper ID
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Paste
              </button>
            </div>

            <div className="relative">
              <input
                id="input-arxiv-url-or-id"
                type="text"
                value={arxivInput}
                disabled={isInjecting}
                onChange={(e) => setArxivInput(e.target.value)}
                placeholder="e.g. 2609.10533 or https://arxiv.org/abs/2609.10533"
                autoFocus
                className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all pr-24"
              />
              {detectedId && (
                <div className="absolute right-2.5 top-2 flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/50">
                  <CheckCircle2 className="w-3 h-3" />
                  {detectedId}
                </div>
              )}
            </div>

            {/* Quick-test chips */}
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[10px] font-mono text-neutral-400">Quick Test:</span>
              {SAMPLE_PREPRINTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  disabled={isInjecting}
                  onClick={() => setArxivInput(sample.id)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 hover:border-purple-400 text-neutral-600 dark:text-neutral-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors cursor-pointer"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Preview Card */}
          {detectedId && (
            <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                <span>Preprint Preview</span>
                {isPreviewLoading && (
                  <span className="flex items-center gap-1 font-normal lowercase text-purple-600 dark:text-purple-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> fetching...
                  </span>
                )}
              </div>

              {previewData ? (
                <>
                  <div className="font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2">
                    {previewData.title}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    {previewData.authors}
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                    {previewData.summary}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <a
                      href={previewData.arxivLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on arXiv.org
                    </a>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready to Inject</span>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Slug Update Option */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-neutral-600 dark:text-neutral-400 select-none">
            <input
              type="checkbox"
              checked={updateSlug}
              disabled={isInjecting}
              onChange={(e) => setUpdateSlug(e.target.checked)}
              className="rounded border-neutral-300 dark:border-neutral-700 text-purple-600 focus:ring-purple-500"
            />
            <span>Update URL slug to reflect new paper</span>
          </label>

          {/* Error Message */}
          {injectionError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{injectionError}</span>
            </div>
          )}

          {/* In-Progress Status */}
          {isInjecting && (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs font-mono flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600 shrink-0" />
              <span>{injectionStatusMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              disabled={isInjecting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="btn-confirm-inject-arxiv"
              type="button"
              disabled={isInjecting || !detectedId}
              onClick={handleExecuteInjection}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-purple-600/20 active:scale-98"
            >
              {isInjecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Inject &amp; Regenerate</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
