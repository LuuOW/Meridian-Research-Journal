import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ArrowLeftRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X as CloseIcon,
  Copy,
  BookOpen
} from "lucide-react";
import { BlogPost } from "../types";
import { extractArxivId } from "../lib/arxivUtils";
import {
  parseArxivInput,
  parseInjectionResponse,
  getInjectModalThemeTokens
} from "../lib/arxivInjectionUtils";

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

const SAMPLE_PREPRINTS = [
  { id: "2609.10535", label: "2609.10535 (Frontier Optics)" },
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

  const tokens = getInjectModalThemeTokens(theme);

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

  // Live arXiv ID detection and debounced metadata preview
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
          throw new Error("Could not parse arXiv preview from server.");
        }

        if (res.ok && data?.success && data?.metadata) {
          setPreviewData(data.metadata);
        } else {
          setPreviewError(data?.error || data?.message || "Could not retrieve preview for this paper.");
        }
      } catch (err: any) {
        setPreviewError(err.message || "Failed to load live paper preview from arXiv.");
      } finally {
        setIsPreviewLoading(false);
      }
    }, 400);

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
    setInjectionStatusMessage("1/3 Resolving authoritative arXiv metadata & citations...");

    try {
      const activePassword =
        editorPassword ||
        sessionStorage.getItem("meridian_editor_pwd") ||
        localStorage.getItem("meridian_editor_pwd") ||
        "meridian";

      const timer1 = setTimeout(() => {
        setInjectionStatusMessage("2/3 Synthesizing mathematical derivations, LaTeX formulas & takeaways...");
      }, 1500);

      const timer2 = setTimeout(() => {
        setInjectionStatusMessage("3/3 Rendering bespoke vector banner artwork & committing persistence...");
      }, 3500);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isInjecting ? onClose : undefined}
          className={`fixed inset-0 ${tokens.backdrop} transition-opacity`}
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`relative w-full max-w-xl rounded-2xl overflow-hidden z-10 my-auto border ${tokens.surface} p-6 sm:p-7 space-y-5`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shadow-sm shrink-0">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-lg font-serif font-bold ${tokens.headerTitle}`}>
                    Inject &amp; Replace arXiv Paper
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold uppercase ${tokens.headerBadge}`}>
                    Editor
                  </span>
                </div>
                <p className={`text-xs ${tokens.headerSubtitle} mt-0.5`}>
                  Replace this publication in-place with a handpicked arXiv preprint.
                </p>
              </div>
            </div>

            {!isInjecting && (
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${tokens.closeBtn}`}
                title="Close"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Target Article Card (Current slot) */}
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${tokens.targetCard}`}>
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider">
              <span className={tokens.targetLabel}>Target Slot to Replace</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">In-Place Replacement</span>
            </div>
            <div className={`font-serif font-bold text-sm line-clamp-1 ${tokens.targetTitle}`}>
              {targetBlog.title}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-500 dark:text-neutral-400 flex-wrap">
              {targetBlog.arxivLink && (
                <span className="flex items-center gap-1 text-purple-600 dark:text-cyan-400 truncate max-w-xs">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {targetBlog.arxivLink}
                </span>
              )}
              <span>Published: {targetBlog.date}</span>
            </div>
          </div>

          {/* New arXiv Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${tokens.inputLabel}`}>
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                New arXiv URL or Paper ID
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[10px] font-mono text-purple-600 dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
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
                placeholder="e.g. https://arxiv.org/abs/2609.10535 or 2408.09854"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono transition-all outline-none border focus:ring-2 ${tokens.inputField}`}
              />
              {detectedId && (
                <div className="absolute right-2.5 top-2 flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  arXiv:{detectedId}
                </div>
              )}
            </div>

            {/* Quick-test Paper Chips */}
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Quick Test:</span>
              {SAMPLE_PREPRINTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  disabled={isInjecting}
                  onClick={() => setArxivInput(sample.id)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all cursor-pointer ${tokens.chipBtn}`}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Paper Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <span>Authoritative Paper Preview</span>
              {isPreviewLoading && (
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-normal">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching from arXiv...
                </span>
              )}
            </div>

            {previewData ? (
              <div className={`p-3.5 rounded-xl border space-y-1.5 animate-fade-in ${tokens.previewSuccess}`}>
                <div className={`text-xs font-mono font-bold ${tokens.previewTitle}`}>
                  {previewData.title}
                </div>
                <div className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                  Authors: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{previewData.authors}</span>
                </div>
                <p className={`text-xs line-clamp-2 leading-relaxed ${tokens.previewText}`}>
                  {previewData.summary}
                </p>
                <div className="pt-0.5 flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                  <a
                    href={previewData.arxivLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on arXiv.org
                  </a>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Metadata Verified</span>
                </div>
              </div>
            ) : previewError && arxivInput.trim() ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>{previewError}</span>
              </div>
            ) : (
              <div className={`p-3 rounded-xl border text-center text-xs font-mono ${tokens.previewPlaceholder}`}>
                Paste or introduce an arXiv link or ID above to view live paper details.
              </div>
            )}
          </div>

          {/* Options */}
          <div className={`p-3 rounded-xl border ${tokens.optionsCard}`}>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-mono select-none">
              <input
                id="checkbox-update-slug"
                type="checkbox"
                checked={updateSlug}
                disabled={isInjecting}
                onChange={(e) => setUpdateSlug(e.target.checked)}
                className={`rounded w-4 h-4 ${tokens.checkbox}`}
              />
              <span>Update URL slug to reflect new handpicked paper</span>
            </label>
          </div>

          {/* Error Message */}
          {injectionError && (
            <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${tokens.errorBanner}`}>
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="leading-snug">{injectionError}</span>
            </div>
          )}

          {/* In-Progress Pipeline View */}
          {isInjecting && (
            <div className={`p-3.5 rounded-xl border space-y-2 animate-fade-in ${tokens.progressCard}`}>
              <div className="flex items-center gap-2 text-xs font-mono font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Regenerating Article with Handpicked arXiv Paper...</span>
              </div>
              <p className="text-xs font-mono text-neutral-600 dark:text-neutral-300">
                {injectionStatusMessage}
              </p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              disabled={isInjecting}
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border font-mono text-xs font-bold transition-all disabled:opacity-50 cursor-pointer ${tokens.cancelBtn}`}
            >
              Cancel
            </button>

            <button
              id="btn-confirm-inject-arxiv"
              type="button"
              disabled={isInjecting || !detectedId}
              onClick={handleExecuteInjection}
              className={`px-5 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 ${tokens.actionBtn}`}
            >
              {isInjecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Regenerating Paper...</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Inject &amp; Regenerate Article</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
