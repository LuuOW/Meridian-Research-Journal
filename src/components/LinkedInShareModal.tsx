import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, ExternalLink, MessageSquare, Sparkles, Loader2, RefreshCw, Wand2 } from "lucide-react";
import { generateLinkedInDraft } from "../lib/shareUtils";

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

type TonePreset = "technical" | "executive" | "future" | "punchy";

export const LinkedInShareModal: React.FC<LinkedInShareModalProps> = ({
  isOpen,
  onClose,
  title,
  excerpt,
  content = "",
  tags = [],
  arxivLink = "https://arxiv.org",
  blogId,
  onDownloadPng
}) => {
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedTone, setSelectedTone] = useState<TonePreset>("technical");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiHeadline, setAiHeadline] = useState<string | null>(null);

  // Function to call AI generation endpoint
  const generateAiPost = async (toneToUse: TonePreset, extraInstructions: string = "") => {
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
          tone: toneToUse,
          customPrompt: extraInstructions
        })
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      if (data && data.postText) {
        setDraftText(data.postText);
        if (data.headline) {
          setAiHeadline(data.headline);
        }
      } else {
        // Fallback to local draft
        setDraftText(generateLinkedInDraft(title, excerpt, blogId, window.location.origin));
      }
    } catch (err) {
      console.error("AI post generation error, using fallback:", err);
      setDraftText(generateLinkedInDraft(title, excerpt, blogId, window.location.origin));
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger AI generation whenever modal opens or article changes
  useEffect(() => {
    if (isOpen && title) {
      setCopied(false);
      setCustomPrompt("");
      setAiHeadline(null);
      // Auto-generate AI post with default tone
      generateAiPost("technical");
    }
  }, [isOpen, title, excerpt, blogId]);

  const handleToneChange = (tone: TonePreset) => {
    setSelectedTone(tone);
    generateAiPost(tone, customPrompt);
  };

  const handleCustomGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateAiPost(selectedTone, customPrompt);
  };

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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-neutral-800 shadow-2xl p-6 sm:p-8 space-y-5 overflow-hidden z-10 rounded-2xl"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-gray-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1.5 pr-6">
              <div className="flex items-center gap-2 text-[#0077b5]">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="font-serif font-bold italic text-md text-gray-900 dark:text-neutral-100 flex items-center gap-1.5">
                  AI-Enhanced LinkedIn Companion
                  <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full">
                    <Sparkles className="w-2.5 h-2.5" /> Gemini
                  </span>
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                Custom-synthesized for this paper's specific scientific breakthrough, math framework, and key findings.
              </p>
            </div>

            {/* AI Preset Tone Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Select Tone & Perspective</span>
                {isGenerating && (
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 normal-case font-sans">
                    <Loader2 className="w-3 h-3 animate-spin" /> Synthesizing custom post...
                  </span>
                )}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: "technical", label: "🔬 Technical", desc: "Equations & Math" },
                  { id: "executive", label: "💼 Executive", desc: "High-level metrics" },
                  { id: "future", label: "🚀 Future Vision", desc: "Quantum & Optics" },
                  { id: "punchy", label: "⚡ Punchy", desc: "Fast & Snappy" },
                ].map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => handleToneChange(tone.id as TonePreset)}
                    disabled={isGenerating}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      selectedTone === tone.id
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500/50 text-indigo-950 dark:text-indigo-200 ring-1 ring-indigo-500/30"
                        : "bg-neutral-50/50 dark:bg-neutral-900/50 border-gray-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-gray-300 dark:hover:border-neutral-700"
                    }`}
                  >
                    <div className="text-xs font-bold">{tone.label}</div>
                    <div className="text-[10px] text-gray-400 dark:text-neutral-500">{tone.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Post Draft Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Generated LinkedIn Post
                </label>
                {aiHeadline && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[200px]" title={aiHeadline}>
                    {aiHeadline}
                  </span>
                )}
              </div>

              <div className="relative">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={7}
                  disabled={isGenerating}
                  className="w-full bg-neutral-50 dark:bg-neutral-950/40 hover:bg-neutral-100/75 dark:hover:bg-neutral-900/40 focus:bg-white dark:focus:bg-neutral-900 text-xs border border-gray-200 dark:border-neutral-800 rounded-xl p-4 outline-none transition-all resize-none font-sans leading-relaxed focus:border-black dark:focus:border-neutral-700 text-neutral-850 dark:text-neutral-100 disabled:opacity-60"
                  placeholder="Generating custom AI LinkedIn post..."
                />
                {isGenerating && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-[2px] flex items-center justify-center rounded-xl gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini is generating article post...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Custom AI Instruction Input */}
            <form onSubmit={handleCustomGenerate} className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ask Gemini: e.g. 'Emphasize the experimental setup' or 'Add emojis'"
                className="flex-1 bg-neutral-50 dark:bg-neutral-950/50 text-xs border border-gray-200 dark:border-neutral-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-neutral-800 dark:text-neutral-200"
              />
              <button
                type="submit"
                disabled={isGenerating || !customPrompt.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Refine</span>
              </button>
            </form>

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={handleCopy}
                className="flex-1 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold text-xs py-3 rounded-full transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white dark:text-black" />
                    <span>Copy Post to Clipboard</span>
                  </>
                )}
              </button>

              <a
                href="https://www.linkedin.com/feed/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#0077b5] hover:bg-[#006297] text-white font-bold text-xs py-3 rounded-full transition-all flex items-center justify-center gap-2 shadow-sm text-center cursor-pointer active:scale-95"
              >
                <span>Go to LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5 text-white/80" />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

