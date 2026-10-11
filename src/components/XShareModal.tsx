import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X as CloseIcon, Copy, Check } from "lucide-react";
import { getXPostCache, saveXPostCache, buildXArticleUrl } from "../lib/xUtils";
import {
  draftDistributionNote,
  validateAndSanitizeDistributionNote,
  cleanTextForDistributionNote
} from "../lib/distributionNotePipeline";

export interface XShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  excerpt: string;
  content?: string;
  tags?: string[];
  arxivLink?: string;
  blogId?: string;
  theme?: "light" | "dark";
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
  theme,
}) => {
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);

  // Synchronously compute initial high-quality draft or retrieve cache on modal open
  useEffect(() => {
    if (!isOpen || !title) return;
    setCopied(false);

    const cacheKey = blogId || title;
    if (cacheKey) {
      const cached = getXPostCache(cacheKey);
      if (cached && cached.draftText) {
        setDraftText(cached.draftText);
        return;
      }
    }

    const articleUrl = buildXArticleUrl(blogId);
    const localDraft = draftDistributionNote({
      title,
      excerpt,
      content,
      tags,
      blogId,
      blogUrl: articleUrl,
    });

    const validated = validateAndSanitizeDistributionNote(localDraft.noteText);
    const textReady = validated.sanitizedText;
    setDraftText(textReady);

    if (cacheKey) {
      saveXPostCache(cacheKey, {
        draftText: textReady,
        headline: localDraft.headline,
        tone: "future",
      });
    }

    // Optional lightweight background server refinement if available
    fetch("/api/x/generate-post", {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        excerpt,
        content,
        tags,
        arxivLink,
        blogId,
        articleUrl,
        tone: "future",
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.postText) {
          const validatedServer = validateAndSanitizeDistributionNote(data.postText);
          const serverReady = validatedServer.sanitizedText;
          setDraftText(serverReady);
          if (cacheKey) {
            saveXPostCache(cacheKey, {
              draftText: serverReady,
              headline: data.headline ? cleanTextForDistributionNote(data.headline) : localDraft.headline,
              tone: "future",
            });
          }
        }
      })
      .catch(() => {
        // Local deterministic pipeline is already active and set
      });
  }, [isOpen, title, excerpt, blogId]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(draftText);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = draftText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.warn("Clipboard copy blocked:", err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Subtle backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Clean minimal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 sm:p-6 space-y-4 z-10 text-neutral-900 dark:text-neutral-100 font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 tracking-tight">
                Distribution Note (Writer)
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Note text ready to copy */}
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={6}
              className="w-full text-xs sm:text-sm rounded-xl p-3.5 outline-none resize-none font-sans leading-relaxed bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-600"
              placeholder="Distribution note text..."
            />

            {/* Copy button only */}
            <button
              onClick={handleCopy}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Re-exports for backwards compatibility
export { XShareModal as LinkedInShareModal };
export { XShareModal as DistributionNoteModal };
