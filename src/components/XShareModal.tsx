import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X as CloseIcon, Copy, Check, ExternalLink, MessageSquare, Sparkles, Loader2, RefreshCw, Compass, Zap } from "lucide-react";
import { calculateNormalizedCursor, computeRayTracedLightState, getDefaultLightState } from "../lib/rayTracingUtils";
import { getXPostCache, saveXPostCache, buildXArticleUrl, countSentences } from "../lib/xUtils";
import { generateXCompanionDraft } from "../lib/shareUtils";

export interface XShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  excerpt: string;
  content?: string;
  tags?: string[];
  arxivLink?: string;
  blogId?: string;
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
}) => {
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiHeadline, setAiHeadline] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const [lightState, setLightState] = useState(getDefaultLightState());

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

  // Function to generate futuristic vision post with persistent caching
  const generateAiPost = async (forceRefresh: boolean = false) => {
    const cacheKey = blogId || title;

    // Check persistent cache first (survives reloads & browser close)
    if (!forceRefresh && cacheKey) {
      const cached = getXPostCache(cacheKey);
      if (cached) {
        setDraftText(cached.draftText);
        setAiHeadline(cached.headline || "Futuristic Vision Synthesis");
        return;
      }
    }

    setIsGenerating(true);
    try {
      const articleUrl = buildXArticleUrl(blogId);
      const response = await fetch("/api/x/generate-post", {
        method: "POST",
        signal: AbortSignal.timeout(18000),
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

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      let finalDraft = "";
      let finalHeadline = "Futuristic Vision Synthesis";

      if (data && data.postText) {
        finalDraft = data.postText;
        if (data.headline) {
          finalHeadline = data.headline;
        }
      } else {
        finalDraft = generateXCompanionDraft(title, excerpt, blogId);
      }

      setDraftText(finalDraft);
      setAiHeadline(finalHeadline);

      if (cacheKey) {
        saveXPostCache(cacheKey, {
          draftText: finalDraft,
          headline: finalHeadline,
          tone: "future"
        });
      }
    } catch (err) {
      console.warn("AI X post generation timed out or fallback engaged:", err);
      const fallbackText = generateXCompanionDraft(title, excerpt, blogId);
      setDraftText(fallbackText);
      setAiHeadline("Futuristic Vision Horizon");

      if (cacheKey) {
        saveXPostCache(cacheKey, {
          draftText: fallbackText,
          headline: "Futuristic Vision Horizon",
          tone: "future"
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger cache check / generation when modal opens
  useEffect(() => {
    if (isOpen && title) {
      setCopied(false);
      generateAiPost(false);
    }
  }, [isOpen, title, excerpt, blogId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const currentSentenceCount = countSentences(draftText);
  const tweetIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(draftText)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container with Pitch, Yaw, Roll 3D Chasing Optics */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-lg group p-[2px] rounded-2xl overflow-hidden shadow-2xl z-10 font-sans transition-transform duration-150 ease-out"
            style={{
              transform: `perspective(1000px) rotateX(${lightState.pitch}deg) rotateY(${lightState.yaw}deg) rotateZ(${lightState.roll}deg)`,
              boxShadow: isGenerating
                ? `${lightState.shadowX}px ${lightState.shadowY}px 35px -5px rgba(6, 182, 212, 0.45), 0 0 45px 5px rgba(168, 85, 247, 0.3)`
                : `${lightState.shadowX}px ${lightState.shadowY}px 30px -5px rgba(255, 255, 255, 0.15), 0 0 35px 2px rgba(6, 182, 212, 0.25)`
            }}
          >
            {/* Dynamic Ray Traced Conic Neon Light Ring */}
            <div
              className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-80 blur-xl group-hover:opacity-100 transition-opacity"
              style={{
                background: isGenerating
                  ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #6366f1, #ec4899, #ffffff)`
                  : `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #3b82f6, #64748b, #ffffff)`
              }}
            />

            {/* Dynamic Neon Refraction Border */}
            <div
              className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-90"
              style={{
                background: isGenerating
                  ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #6366f1, #ec4899, #ffffff)`
                  : `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #3b82f6, #64748b, #ffffff)`
              }}
            />

            {/* Inner Metallic Card Panel */}
            <div className="relative bg-neutral-950/95 backdrop-blur-xl rounded-[14px] w-full overflow-hidden border border-neutral-800/90 p-5 space-y-4 text-white shadow-inner">
              
              {/* Specular Highlight Overlay - Chases Cursor Position */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-30 group-hover:opacity-60"
                style={{
                  background: `radial-gradient(circle 260px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.3), rgba(6, 182, 212, 0.15) 40%, transparent 70%)`
                }}
              />

              {/* Top Shimmer Accent Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neutral-200 via-cyan-400 to-purple-500 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

              {/* Header & Badges */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-black text-white border border-neutral-700/80 shadow-sm flex items-center justify-center">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-serif font-bold italic text-sm text-neutral-100 flex items-center gap-1.5 leading-none">
                      X Companion
                      <span className="inline-flex items-center gap-1 text-[9px] font-sans font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full">
                        <Sparkles className="w-2.5 h-2.5" /> Gemini
                      </span>
                    </h3>
                    {aiHeadline && (
                      <p className="text-[10px] text-cyan-400 font-mono font-medium truncate max-w-[260px] mt-0.5">
                        {aiHeadline}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 text-[9px] font-mono font-bold rounded-full border border-cyan-500/30 flex items-center gap-1">
                    {currentSentenceCount} sentences
                  </span>
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dedicated Perspective Banner: Futuristic Vision Only */}
              <div className="relative z-10 flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-900/90 border border-cyan-500/30 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Compass className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-neutral-100 flex items-center gap-1.5">
                      <span>Futuristic Vision</span>
                      <span className="text-[9px] font-mono font-semibold text-cyan-300 uppercase tracking-wider bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-700/50">
                        Exclusive Perspective
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-sans leading-tight">
                      Visionary paradigm shifts, quantum horizons & long-term technologies
                    </div>
                  </div>
                </div>
                <div className="shrink-0 pl-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-300/90 font-semibold bg-cyan-950/40 px-2 py-1 rounded-lg border border-cyan-800/30">
                    <Zap className="w-3 h-3 text-cyan-400" /> 3 Sentences
                  </span>
                </div>
              </div>

              {/* Generated 3-Sentence Futuristic Vision Post Area */}
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    Futuristic Vision Post
                  </label>
                  <button
                    type="button"
                    onClick={() => generateAiPost(true)}
                    disabled={isGenerating}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer transition-colors px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/40 hover:bg-cyan-900/60"
                    title="Re-synthesize futuristic perspective"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isGenerating ? "animate-spin" : ""}`} />
                    <span>Re-synthesize</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={6}
                    disabled={isGenerating}
                    className="w-full bg-neutral-900/90 hover:bg-neutral-900 focus:bg-neutral-950 text-xs border border-neutral-800 focus:border-cyan-500 rounded-xl p-3.5 outline-none transition-all resize-none font-sans leading-relaxed text-neutral-100 disabled:opacity-60 focus:ring-1 focus:ring-cyan-500/30 shadow-inner"
                    placeholder="Generating visionary 3-sentence X companion post..."
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-[2px] flex items-center justify-center rounded-xl gap-2 text-xs font-medium text-cyan-300">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Synthesizing futuristic vision post...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1 relative z-10">
                <button
                  onClick={handleCopy}
                  className="flex-1 bg-white hover:bg-neutral-200 text-black font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-black" />
                      <span>Copy Post</span>
                    </>
                  )}
                </button>

                <a
                  href={tweetIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-black hover:bg-neutral-900 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md text-center cursor-pointer active:scale-95 border border-neutral-700/80 hover:border-cyan-500/40"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>Share on X</span>
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
