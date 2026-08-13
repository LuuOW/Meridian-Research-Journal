import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, ExternalLink, MessageSquare, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { generateLinkedInDraft } from "../lib/shareUtils";
import { calculateNormalizedCursor, computeRayTracedLightState, getDefaultLightState } from "../lib/rayTracingUtils";
import { getLinkedInPostCache, saveLinkedInPostCache } from "../lib/linkedinUtils";

interface LinkedInShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  excerpt: string;
  content?: string;
  tags?: string[];
  arxivLink?: string;
  blogId?: string;
  onDownloadPng?: () => void;
}

export const LinkedInShareModal: React.FC<LinkedInShareModalProps> = ({
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

  // Function to generate post with persistent caching
  const generateAiPost = async (forceRefresh: boolean = false) => {
    const cacheKey = blogId || title;

    // Check persistent cache first (survives reloads & browser close)
    if (!forceRefresh && cacheKey) {
      const cached = getLinkedInPostCache(cacheKey);
      if (cached) {
        setDraftText(cached.draftText);
        setAiHeadline(cached.headline || "Future Vision Synthesis");
        return;
      }
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/linkedin/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          tags,
          arxivLink,
          blogId,
          tone: "future",
        })
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      let finalDraft = "";
      let finalHeadline = "Future Vision Synthesis";

      if (data && data.postText) {
        finalDraft = data.postText;
        if (data.headline) {
          finalHeadline = data.headline;
        }
      } else {
        // Fallback to local draft
        finalDraft = generateLinkedInDraft(title, excerpt, blogId, window.location.origin);
      }

      setDraftText(finalDraft);
      setAiHeadline(finalHeadline);

      // Save to persistent storage cache
      if (cacheKey) {
        saveLinkedInPostCache(cacheKey, {
          draftText: finalDraft,
          headline: finalHeadline,
        });
      }
    } catch (err) {
      console.error("AI post generation error, using fallback:", err);
      const fallbackText = generateLinkedInDraft(title, excerpt, blogId, window.location.origin);
      setDraftText(fallbackText);
      setAiHeadline("Future Vision Synthesis");

      if (cacheKey) {
        saveLinkedInPostCache(cacheKey, {
          draftText: fallbackText,
          headline: "Future Vision Synthesis",
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
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container with Pitch, Yaw, Roll 3D Chasing Optics */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-md group p-[2px] rounded-2xl overflow-hidden shadow-2xl z-10 font-sans transition-transform duration-150 ease-out"
            style={{
              transform: `perspective(1000px) rotateX(${lightState.pitch}deg) rotateY(${lightState.yaw}deg) rotateZ(${lightState.roll}deg)`,
              boxShadow: isGenerating
                ? `${lightState.shadowX}px ${lightState.shadowY}px 35px -5px rgba(6, 182, 212, 0.45), 0 0 45px 5px rgba(168, 85, 247, 0.3)`
                : `${lightState.shadowX}px ${lightState.shadowY}px 30px -5px rgba(0, 119, 181, 0.4), 0 0 35px 2px rgba(99, 102, 241, 0.25)`
            }}
          >
            {/* Dynamic Ray Traced Conic Neon Light Ring */}
            <div
              className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-85 blur-xl group-hover:opacity-100 transition-opacity"
              style={{
                background: isGenerating
                  ? `conic-gradient(from ${lightState.angle}deg, #0077b5, #06b6d4, #6366f1, #a855f7, #ec4899, #0077b5)`
                  : `conic-gradient(from ${lightState.angle}deg, #0077b5, #06b6d4, #3b82f6, #8b5cf6, #0077b5)`
              }}
            />

            {/* Dynamic Neon Refraction Border */}
            <div
              className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-95"
              style={{
                background: isGenerating
                  ? `conic-gradient(from ${lightState.angle}deg, #0077b5, #06b6d4, #6366f1, #a855f7, #ec4899, #0077b5)`
                  : `conic-gradient(from ${lightState.angle}deg, #0077b5, #06b6d4, #3b82f6, #8b5cf6, #0077b5)`
              }}
            />

            {/* Inner Metallic Card Panel */}
            <div className="relative bg-neutral-950/95 backdrop-blur-xl rounded-[14px] w-full overflow-hidden border border-neutral-800/90 p-5 space-y-4 text-white shadow-inner">
              
              {/* Specular Highlight Overlay - Chases Cursor Position */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-75"
                style={{
                  background: `radial-gradient(circle 260px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.35), rgba(0, 119, 181, 0.18) 40%, transparent 70%)`
                }}
              />

              {/* Top Shimmer Accent Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0077b5] via-cyan-500 to-purple-500 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

              {/* Header & Badges */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-[#0077b5]/20 text-[#0077b5] border border-[#0077b5]/30">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-serif font-bold italic text-sm text-neutral-100 flex items-center gap-1.5 leading-none">
                      LinkedIn Companion
                      <span className="inline-flex items-center gap-1 text-[9px] font-sans font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full">
                        <Sparkles className="w-2.5 h-2.5" /> Gemini
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-mono font-bold rounded-full border border-indigo-500/30 flex items-center gap-1">
                    🚀 Future Vision
                  </span>
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Generated 3-Sentence Post Area */}
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    Generated 3-Sentence Post
                  </label>
                  <button
                    type="button"
                    onClick={() => generateAiPost(true)}
                    disabled={isGenerating}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer transition-colors"
                    title="Re-synthesize post"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isGenerating ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={5}
                    disabled={isGenerating}
                    className="w-full bg-neutral-900/90 hover:bg-neutral-900 focus:bg-neutral-950 text-xs border border-neutral-800 focus:border-cyan-500 rounded-xl p-3.5 outline-none transition-all resize-none font-sans leading-relaxed text-neutral-100 disabled:opacity-60 focus:ring-1 focus:ring-cyan-500/30 shadow-inner"
                    placeholder="Generating 3-sentence Future Vision LinkedIn post..."
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-[2px] flex items-center justify-center rounded-xl gap-2 text-xs font-medium text-cyan-300">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Synthesizing 3-sentence post...</span>
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
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-black" />
                      <span>Copy 3-Sentence Post</span>
                    </>
                  )}
                </button>

                <a
                  href="https://www.linkedin.com/feed/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#0077b5] hover:bg-[#006297] text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md text-center cursor-pointer active:scale-95 border border-cyan-400/20"
                >
                  <span>Go to LinkedIn</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white/80" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


