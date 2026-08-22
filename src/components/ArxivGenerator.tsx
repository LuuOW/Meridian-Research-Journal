import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, ArrowRight, ExternalLink, Minimize2, CheckCircle2 } from "lucide-react";
import { BlogPost, GenerationJob } from "../types";
import { PIPELINE_STEPS } from "../lib/pipelineUtils";

interface ArxivGeneratorProps {
  onClose: () => void;
  onBlogGenerated?: (blog: BlogPost) => void;
  onStartAsyncGeneration?: (arxivInput: string) => void;
  editorPassword?: string;
  initialArxivId?: string;
  historyCount?: number;
  activeJobs?: GenerationJob[];
}

export const ArxivGenerator: React.FC<ArxivGeneratorProps> = ({ 
  onClose, 
  onBlogGenerated, 
  onStartAsyncGeneration,
  editorPassword = "meridian", 
  initialArxivId = "",
  activeJobs = []
}) => {
  const [arxivInput, setArxivInput] = useState(initialArxivId);
  const cardRef = useRef<HTMLDivElement>(null);

  const runningJob = activeJobs.find((j) => j.status === "generating" && !j.dismissed);

  // Simulated Ray Tracing Light State
  const [lightState, setLightState] = useState({
    lightX: 50, // %
    lightY: 30, // %
    angle: 45,  // deg
    tiltX: 0,   // deg
    tiltY: 0,   // deg
    shadowX: 0, // px
    shadowY: 15,// px
  });

  useEffect(() => {
    if (initialArxivId) {
      setArxivInput(initialArxivId);
    }
  }, [initialArxivId]);

  // Handle Ray Tracing pointer light tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
      const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));

      const lightX = Math.round(((normX + 1) / 2) * 100);
      const lightY = Math.round(((normY + 1) / 2) * 100);
      const angle = Math.round((Math.atan2(normY, normX) * 180) / Math.PI + 90);

      const tiltX = Math.round(-normY * 5); // max 5deg tilt
      const tiltY = Math.round(normX * 5);  // max 5deg tilt

      const shadowX = Math.round(-normX * 30);
      const shadowY = Math.round(-normY * 30 + 10);

      setLightState({
        lightX,
        lightY,
        angle,
        tiltX,
        tiltY,
        shadowX,
        shadowY
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  
  const [isLocalGenerating, setIsLocalGenerating] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isGenerating = isLocalGenerating || Boolean(runningJob);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % PIPELINE_STEPS.length);
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

    if (onStartAsyncGeneration) {
      // Direct trigger in background pipeline
      onStartAsyncGeneration(inputVal);
      // Close modal smoothly so user can see live progress in the status widget
      onClose();
      return;
    }

    setIsLocalGenerating(true);

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
        if (onBlogGenerated) onBlogGenerated(data.blog);
      } else {
        throw new Error("Invalid response format received from generation engine.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during generation.");
      setIsLocalGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-hidden">
      
      {/* Dynamic Ray Traced Light Caustic / Backsplash Glow */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-300 ease-out opacity-40 dark:opacity-60"
        style={{
          background: `radial-gradient(circle 600px at ${lightState.lightX}% ${lightState.lightY}%, rgba(6, 182, 212, 0.25), rgba(99, 102, 241, 0.15) 50%, transparent 80%)`
        }}
      />

      {/* Ray Traced Dynamic Shadow & 3D Perspective Modal Frame */}
      <div 
        ref={cardRef}
        className="relative w-full max-w-md group p-[2px] rounded-3xl overflow-hidden transition-transform duration-200 ease-out"
        style={{
          transform: `perspective(1000px) rotateX(${lightState.tiltX}deg) rotateY(${lightState.tiltY}deg)`,
          boxShadow: `
            ${lightState.shadowX}px ${lightState.shadowY}px 45px -10px rgba(0, 0, 0, 0.6),
            ${lightState.shadowX * 0.5}px ${lightState.shadowY * 0.5}px 25px -5px rgba(6, 182, 212, 0.35),
            0 0 80px 10px rgba(168, 85, 247, 0.15)
          `
        }}
      >
        
        {/* Dynamic Ray Traced Conic Neon Light Ring */}
        <div 
          className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-75 dark:opacity-90 blur-xl group-hover:opacity-100 transition-opacity"
          style={{
            background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
          }}
        />

        {/* Crisp Dynamic Neon Refraction Border */}
        <div 
          className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-90 dark:opacity-100"
          style={{
            background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
          }}
        />
        
        {/* Inner Modal Card with Specular Optics & Glass Refraction */}
        <div className="relative bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-[22px] w-full overflow-hidden border border-white/40 dark:border-neutral-800 p-5 sm:p-6 transition-all shadow-inner">
          
          {/* Simulated Ray Traced Specular Highlight overlay */}
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-60 dark:opacity-40 group-hover:opacity-90"
            style={{
              background: `radial-gradient(circle 350px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.4), rgba(6, 182, 212, 0.1) 40%, transparent 70%)`
            }}
          />

          {/* Dynamic Optical Light Sheen Angle Sweep */}
          <div 
            className="absolute inset-0 pointer-events-none transition-all duration-300 opacity-30 dark:opacity-20"
            style={{
              background: `linear-gradient(${lightState.angle}deg, transparent 40%, rgba(255, 255, 255, 0.5) 50%, transparent 60%)`
            }}
          />

          {/* Top Gradient Accent Bar with Ray Motion */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite]" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between pb-4 border-b border-gray-100 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-xl bg-black dark:bg-neutral-800 text-white flex items-center justify-center shadow-md shrink-0 ring-2 ring-cyan-500/30 dark:ring-cyan-400/40">
                <Sparkles className="w-4 h-4 text-cyan-400 dark:text-cyan-300 fill-cyan-400/20 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold italic tracking-tight text-black dark:text-neutral-100">
                  Async Research Generator
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-neutral-400 font-mono">
                  Background article compilation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg text-gray-400 hover:text-black dark:hover:text-white transition-all cursor-pointer"
              title="Close or minimize modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          {!isGenerating ? (
            <form onSubmit={handleGenerate} className="relative z-10 pt-4 space-y-4">
              <div>
                <label htmlFor="arxiv-input" className="block text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest font-mono mb-1.5">
                  arXiv Identifier or Link
                </label>
                <div className="relative">
                  <input
                    id="arxiv-input"
                    type="text"
                    placeholder="e.g. 2303.02517 or https://arxiv.org/abs/2303.02517"
                    value={arxivInput}
                    onChange={(e) => setArxivInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-cyan-500/30 dark:focus:ring-cyan-400/30 focus:border-cyan-500 dark:focus:border-cyan-400 font-mono text-xs transition-all bg-neutral-50/90 dark:bg-neutral-950/90 text-neutral-800 dark:text-neutral-100 shadow-inner"
                  />
                </div>
              </div>

              {/* Quick Preset Samples */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-gray-400 dark:text-neutral-500 font-mono text-[10px]">Presets:</span>
                <button
                  type="button"
                  onClick={() => setArxivInput("2303.02517")}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800 text-neutral-600 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-300 font-mono text-[10px] transition-colors cursor-pointer"
                >
                  2303.02517
                </button>
                <button
                  type="button"
                  onClick={() => setArxivInput("2401.08765")}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800 text-neutral-600 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-300 font-mono text-[10px] transition-colors cursor-pointer"
                >
                  2401.08765
                </button>
              </div>

              {/* Async Info Callout */}
              <div className="p-3 bg-cyan-950/20 dark:bg-cyan-950/40 border border-cyan-800/30 rounded-xl text-cyan-300 text-[11px] font-sans flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  Articles generate asynchronously in the background. You can close this modal and continue navigating, reading, and filtering other publications anytime!
                </p>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white dark:text-black text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer relative overflow-hidden group/btn bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-[0_0_20px_rgba(6,182,212,0.35)]"
                >
                  <span>Generate in Background</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </form>
          ) : (
            /* Generating / Active Pipeline State in Modal */
            <div className="relative z-10 py-5 space-y-4">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 dark:border-cyan-400/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 dark:border-t-cyan-400 animate-spin" />
                  <div className="absolute -inset-1 rounded-full bg-cyan-500/10 dark:bg-cyan-400/20 blur-sm animate-pulse" />
                  <Sparkles className="w-5 h-5 text-cyan-500 dark:text-cyan-400 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-serif font-bold italic text-black dark:text-neutral-100">
                    Background Pipeline Active
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-neutral-400 font-mono">
                    {runningJob ? runningJob.currentStepMessage : PIPELINE_STEPS[loadingStepIdx]}
                  </p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${runningJob ? runningJob.progressPercent : Math.round(((loadingStepIdx + 1) / PIPELINE_STEPS.length) * 100)}%` }}
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-400 font-mono">
                  You can dismiss this window anytime.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-lg text-xs font-bold transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Dismiss &amp; Navigate</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


