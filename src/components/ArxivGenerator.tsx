import React, { useState, useEffect } from "react";
import { X, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { BlogPost } from "../types";

interface ArxivGeneratorProps {
  onClose: () => void;
  onBlogGenerated: (blog: BlogPost) => void;
  editorPassword?: string;
  initialArxivId?: string;
  historyCount?: number;
}

const LOADING_STEPS = [
  "Contacting arXiv open archives export server...",
  "Retrieving paper abstract & metadata...",
  "Analyzing scientific concepts & equations...",
  "Gemini is generating editorial prose...",
  "Finalizing publication-ready Markdown..."
];

export const ArxivGenerator: React.FC<ArxivGeneratorProps> = ({ onClose, onBlogGenerated, editorPassword = "meridian", initialArxivId = "" }) => {
  const [arxivInput, setArxivInput] = useState(initialArxivId);

  useEffect(() => {
    if (initialArxivId) {
      setArxivInput(initialArxivId);
    }
  }, [initialArxivId]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 3500);
    } else {
      setLoadingStepIdx(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async (e?: React.FormEvent, forcedArxivId?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const inputVal = forcedArxivId ? forcedArxivId.trim() : arxivInput.trim();

    if (!inputVal) {
      setErrorMsg("Please provide an arXiv ID or link.");
      return;
    }

    if (forcedArxivId) {
      setArxivInput(forcedArxivId);
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arxivInput: inputVal,
          rawText: "",
          password: editorPassword
        }),
      });

      if (!response.ok) {
        let errMessage = "Failed to generate blog. Please try another paper.";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await response.json();
            errMessage = errData.error || errMessage;
          } else {
            const text = await response.text();
            if (text.toLowerCase().includes("upstream request timeout") || text.toLowerCase().includes("timeout")) {
              errMessage = "The generation server took too long to respond. Please try again.";
            } else {
              errMessage = `Server error (${response.status}): ${text.slice(0, 150)}`;
            }
          }
        } catch (parseErr) {
          errMessage = `Server returned an error (${response.status})`;
        }
        throw new Error(errMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error("Failed to parse server response. Please try again.");
      }

      if (data.blog) {
        onBlogGenerated(data.blog);
      } else {
        throw new Error("Invalid response format received from generation engine.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during generation.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      {/* Modal Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 dark:border-neutral-800 p-5 sm:p-6 transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black dark:bg-neutral-800 text-white rounded-xl flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-4 h-4 text-white fill-white/20 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold italic tracking-tight text-black dark:text-neutral-100">
                Generate Research Blog
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-neutral-400 font-mono">
                arXiv paper to Meridian blog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg text-gray-400 hover:text-black dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!isGenerating ? (
          <form onSubmit={handleGenerate} className="pt-4 space-y-4">
            <div>
              <label htmlFor="arxiv-input" className="block text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest font-mono mb-1.5">
                arXiv Identifier or Link
              </label>
              <input
                id="arxiv-input"
                type="text"
                placeholder="e.g. 2303.02517 or https://arxiv.org/abs/2303.02517"
                value={arxivInput}
                onChange={(e) => setArxivInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-neutral-700 font-mono text-xs transition-all bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100"
              />
            </div>

            {/* Quick Preset Samples */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-gray-400 dark:text-neutral-500 font-mono text-[10px]">Presets:</span>
              <button
                type="button"
                onClick={() => setArxivInput("2303.02517")}
                className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-mono text-[10px] transition-colors cursor-pointer"
              >
                2303.02517
              </button>
              <button
                type="button"
                onClick={() => setArxivInput("2401.08765")}
                className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-mono text-[10px] transition-colors cursor-pointer"
              >
                2401.08765
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className={`px-5 py-2.5 rounded-xl text-white dark:text-black text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isGenerating 
                    ? "bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed opacity-75" 
                    : "bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100"
                }`}
              >
                <span>Generate Blog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          /* Loading State */
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-3 border-gray-100 dark:border-neutral-800" />
              <div className="absolute inset-0 rounded-full border-3 border-black dark:border-white border-t-transparent animate-spin" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-serif font-bold italic text-black dark:text-neutral-100">
                Generating Review
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-neutral-400 font-mono">
                {LOADING_STEPS[loadingStepIdx]}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
