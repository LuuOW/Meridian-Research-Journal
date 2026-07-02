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
  const [syncStatus, setSyncStatus] = useState<{
    configured: boolean;
    repo: string;
    branch: string;
    hasToken: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const res = await fetch("/api/github-sync/status");
        if (res.ok) {
          const data = await res.json();
          setSyncStatus(data);
        }
      } catch (err) {
        console.error("Failed to fetch GitHub sync status:", err);
      }
    };
    fetchSyncStatus();
  }, []);

  // Cycle through reassuring loading messages during generation
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
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate blog. Please try another paper.");
      }

      const data = await response.json();
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

            {/* GitHub Sync Status Banner */}
            {syncStatus && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                syncStatus.configured 
                  ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100/80 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-300" 
                  : "bg-neutral-50 dark:bg-neutral-950/20 border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    syncStatus.configured ? "bg-emerald-500/10 text-emerald-600" : "bg-neutral-250 dark:bg-neutral-800 text-neutral-400"
                  }`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.024A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.293 2.747-1.024 2.747-1.024.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                      {syncStatus.configured ? "GitHub Auto-Sync Connected" : "GitHub Sync Ready"}
                    </h5>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      {syncStatus.configured 
                        ? `Automatic backup: ${syncStatus.repo} (${syncStatus.branch})`
                        : "Define GITHUB_SYNC_REPO in your Secrets panel to auto-sync generated blog posts (uses your existing GITHUB_TOKEN)!"
                      }
                    </p>
                  </div>
                </div>
                {syncStatus.configured && (
                  <span className="text-[9px] font-mono tracking-wider font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/80">
                    ACTIVE
                  </span>
                )}
              </div>
            )}

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
