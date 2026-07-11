import React, { useState, useEffect } from "react";
import { X, Cpu, Sparkles, BookOpen, FileText, ArrowRight, CheckCircle2 } from "lucide-react";
import { BlogPost } from "../types";

interface ArxivGeneratorProps {
  onClose: () => void;
  onBlogGenerated: (blog: BlogPost) => void;
  editorPassword?: string;
}

const PRESET_EXAMPLES = [
  {
    title: "GNNs for Crystal Structures",
    id: "2403.15343",
    desc: "Graph Neural Networks predicting solid-state crystal chemistry properties."
  },
  {
    title: "Quantum Path Annealing",
    id: "2401.03152",
    desc: "Optimizing adiabatic path transitions inside perturbed quantum wells."
  },
  {
    title: "Astro-Particle Spectra",
    id: "2312.04351",
    desc: "Multi-modal analysis of high energy cosmic ray optical emission spectra."
  }
];

const LOADING_STEPS = [
  "Contacting arXiv open archives export server...",
  "Retrieving paper abstract, authors, and classification metadata...",
  "Analyzing scientific concepts and structural outline...",
  "Gemini is translating technical math models to elegant editorial prose...",
  "Rendering beautiful mathematical LaTeX equations...",
  "Generating responsive, vector-glowing concept SVG...",
  "Assembling publication-ready Markdown sections...",
  "Finalizing Meridian editorial polish..."
];

export const ArxivGenerator: React.FC<ArxivGeneratorProps> = ({ onClose, onBlogGenerated, editorPassword = "meridian" }) => {
  const [arxivInput, setArxivInput] = useState("");
  const [rawText, setRawText] = useState("");
  const [activeTab, setActiveTab] = useState<"arxiv" | "raw">("arxiv");
  
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

  const handlePresetClick = (id: string) => {
    setArxivInput(id);
    setActiveTab("arxiv");
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const inputVal = activeTab === "arxiv" ? arxivInput.trim() : "";
    const textVal = activeTab === "raw" ? rawText.trim() : "";

    if (!inputVal && !textVal) {
      setErrorMsg("Please provide an arXiv ID/Link or paste some research text.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arxivInput: inputVal,
          rawText: textVal,
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
              errMessage = "The generation server took too long to respond (upstream request timeout). The AI is currently experiencing high demand. Please try again in a few seconds.";
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
        throw new Error("Failed to parse server response. The generation server might have timed out. Please try again.");
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
    <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      
      {/* Modal Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-neutral-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black dark:bg-neutral-800 text-white rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white fill-white/20 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold italic tracking-tight text-black dark:text-neutral-100">Generate Research Blog</h3>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Transform any arXiv paper into a Meridian publication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full text-gray-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isGenerating ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Tabs */}
            <div className="flex bg-neutral-100 dark:bg-neutral-950 p-1 rounded-full">
              <button
                type="button"
                onClick={() => setActiveTab("arxiv")}
                className={`flex-1 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "arxiv"
                    ? "bg-black dark:bg-neutral-800 text-white shadow-sm"
                    : "text-gray-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                arXiv ID / Link
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("raw")}
                className={`flex-1 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "raw"
                    ? "bg-black dark:bg-neutral-800 text-white shadow-sm"
                    : "text-gray-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                Paste Text
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Form Input */}
              {activeTab === "arxiv" ? (
                <div className="space-y-2">
                  <label htmlFor="arxiv-input" className="block text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">
                    arXiv Link or Identifier
                  </label>
                  <input
                    id="arxiv-input"
                    type="text"
                    placeholder="e.g. 2303.02517 or https://arxiv.org/abs/2303.02517"
                    value={arxivInput}
                    onChange={(e) => setArxivInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-neutral-700 font-mono text-sm transition-all bg-neutral-50/50 dark:bg-neutral-950/40 text-neutral-800 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-neutral-500">
                    We will automatically fetch and extract the paper details directly from arXiv.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="raw-text" className="block text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">
                    Research Abstract or Body Text
                  </label>
                  <textarea
                    id="raw-text"
                    rows={6}
                    placeholder="Paste the abstract, outline, or main sections of your paper here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-neutral-700 text-sm transition-all bg-neutral-50/50 dark:bg-neutral-950/40 text-neutral-800 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 resize-none"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-neutral-500">
                    Useful for private drafts, preprints, or detailed sections of an unreleased article.
                  </p>
                </div>
              )}

              {/* Error Block */}
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl text-red-600 dark:text-red-400 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className={`w-full py-3.5 text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2 group active:scale-[0.98] ${
                  isGenerating 
                    ? "bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed opacity-75" 
                    : "bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 cursor-pointer"
                }`}
              >
                <span>{isGenerating ? "Generating..." : "Generate Brand New Blog"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Suggested Examples */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-black dark:text-white" />
                Suggested arXiv Papers
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRESET_EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handlePresetClick(ex.id)}
                    className="p-3 border border-gray-100 dark:border-neutral-800 hover:border-black dark:hover:border-neutral-400 hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20 rounded-2xl text-left transition-all group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-black dark:group-hover:text-white block">{ex.title}</span>
                    <span className="text-[9px] font-mono font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mt-1 block">{ex.id}</span>
                    <span className="text-[10px] text-gray-400 dark:text-neutral-400 leading-relaxed block mt-1 line-clamp-2">{ex.desc}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* Loading State Overlay */
          <div className="p-8 flex flex-col items-center justify-center text-center flex-1 space-y-6">
            {/* Spinning glowing loaders */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100 dark:border-neutral-800" />
              <div className="absolute inset-0 rounded-full border-4 border-black dark:border-white border-t-transparent animate-spin" />
            </div>

            <div className="space-y-2 max-w-md">
              <h4 className="text-lg font-serif font-bold italic text-black dark:text-neutral-100">Generating Scientific Review</h4>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Translating rigorous data coordinates to a stunning, human-readable editorial...</p>
            </div>

            {/* Active loading progress logs */}
            <div className="bg-neutral-50 dark:bg-neutral-950/30 border border-gray-100 dark:border-neutral-800 p-5 rounded-2xl w-full max-w-md">
              <div className="flex flex-col gap-3">
                {LOADING_STEPS.map((step, idx) => {
                  const isDone = idx < loadingStepIdx;
                  const isCurrent = idx === loadingStepIdx;
                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-3 text-left transition-all duration-300 ${
                        isDone ? "opacity-30" : isCurrent ? "opacity-100 scale-[1.01]" : "opacity-10"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-black dark:text-white flex-shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-black dark:border-white border-t-transparent animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-neutral-800 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${isCurrent ? "text-black dark:text-white font-extrabold" : "text-gray-500 dark:text-neutral-400"}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <p className="text-[9px] text-gray-400 dark:text-neutral-500 font-mono uppercase tracking-widest">
              ESTIMATED COMPLETION: ~25 SECONDS // NO CORRUPTED DATA SPOTS
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
