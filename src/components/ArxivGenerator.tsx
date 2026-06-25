import React, { useState, useEffect } from "react";
import { X, Cpu, Sparkles, BookOpen, FileText, ArrowRight, CheckCircle2 } from "lucide-react";
import { BlogPost } from "../types";

interface ArxivGeneratorProps {
  onClose: () => void;
  onBlogGenerated: (blog: BlogPost) => void;
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

export const ArxivGenerator: React.FC<ArxivGeneratorProps> = ({ onClose, onBlogGenerated }) => {
  const [arxivInput, setArxivInput] = useState("");
  const [rawText, setRawText] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"arxiv" | "raw">("arxiv");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    if (!password.trim()) {
      setErrorMsg("Please provide the generation security password.");
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
          password: password.trim()
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
      <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white fill-white/20 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold italic tracking-tight text-black">Generate Research Blog</h3>
              <p className="text-xs text-gray-500">Transform any arXiv paper into a Meridian publication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isGenerating ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Tabs */}
            <div className="flex bg-neutral-100 p-1 rounded-full">
              <button
                type="button"
                onClick={() => setActiveTab("arxiv")}
                className={`flex-1 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "arxiv"
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-500 hover:text-black"
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
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-500 hover:text-black"
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
                  <label htmlFor="arxiv-input" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    arXiv Link or Identifier
                  </label>
                  <input
                    id="arxiv-input"
                    type="text"
                    placeholder="e.g. 2303.02517 or https://arxiv.org/abs/2303.02517"
                    value={arxivInput}
                    onChange={(e) => setArxivInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-black/5 focus:border-black font-mono text-sm transition-all bg-neutral-50/50 focus:bg-white"
                  />
                  <p className="text-[11px] text-gray-400">
                    We will automatically fetch and extract the paper details directly from arXiv.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="raw-text" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Research Abstract or Body Text
                  </label>
                  <textarea
                    id="raw-text"
                    rows={6}
                    placeholder="Paste the abstract, outline, or main sections of your paper here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-black/5 focus:border-black text-sm transition-all bg-neutral-50/50 focus:bg-white resize-none"
                  />
                  <p className="text-[11px] text-gray-400">
                    Useful for private drafts, preprints, or detailed sections of an unreleased article.
                  </p>
                </div>
              )}

              {/* Password Input Block */}
              <div className="space-y-2">
                <label htmlFor="gen-password" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Generation Password
                </label>
                <input
                  id="gen-password"
                  type="password"
                  placeholder="Enter security password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-black/5 focus:border-black font-mono text-sm transition-all bg-neutral-50/50 focus:bg-white"
                  required
                />
                <p className="text-[11px] text-gray-400">
                  Password is required for security. (Default is <code className="bg-neutral-100 px-1 rounded text-black font-bold">meridian</code>).
                </p>
              </div>

              {/* Error Block */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
              >
                <span>Generate Brand New Blog</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Suggested Examples */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-black" />
                Suggested arXiv Papers
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRESET_EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handlePresetClick(ex.id)}
                    className="p-3 border border-gray-100 hover:border-black hover:bg-neutral-50/50 rounded-2xl text-left transition-all group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-neutral-800 group-hover:text-black block">{ex.title}</span>
                    <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1 block">{ex.id}</span>
                    <span className="text-[10px] text-gray-400 leading-relaxed block mt-1 line-clamp-2">{ex.desc}</span>
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
              <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
              <div className="absolute inset-0 rounded-full border-4 border-black border-t-transparent animate-spin" />
            </div>

            <div className="space-y-2 max-w-md">
              <h4 className="text-lg font-serif font-bold italic text-black">Generating Scientific Review</h4>
              <p className="text-xs text-gray-500">Translating rigorous data coordinates to a stunning, human-readable editorial...</p>
            </div>

            {/* Active loading progress logs */}
            <div className="bg-neutral-50 border border-gray-100 p-5 rounded-2xl w-full max-w-md">
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
                        <CheckCircle2 className="w-4 h-4 text-black flex-shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${isCurrent ? "text-black font-extrabold" : "text-gray-500"}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <p className="text-[9px] text-gray-400 font-mono uppercase tracking-widest">
              ESTIMATED COMPLETION: ~25 SECONDS // NO CORRUPTED DATA SPOTS
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
