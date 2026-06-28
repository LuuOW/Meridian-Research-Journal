import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, ExternalLink, MessageSquare, AlertCircle, Sparkles } from "lucide-react";

interface LinkedInShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  excerpt: string;
  arxivLink?: string;
  blogId?: string;
  onDownloadPng?: () => void;
}

export const LinkedInShareModal: React.FC<LinkedInShareModalProps> = ({
  isOpen,
  onClose,
  title,
  excerpt,
  arxivLink = "https://arxiv.org",
  blogId,
  onDownloadPng
}) => {
  // Safe default post draft generator
  const generateInitialDraft = () => {
    // Clean up the title slightly if it is extremely long
    const cleanTitle = title.length > 80 ? `${title.slice(0, 77)}...` : title;
    const blogUrl = blogId ? `${window.location.origin}/?blog=${blogId}` : window.location.origin;
    return `${cleanTitle} just got a major upgrade. New inverse-design techniques deliver 10× greater bandwidth, up to 4× lower loss, and 100× faster design cycles—opening the door to more efficient optical communications, quantum photonics, and light-matter interaction engineering. #Photonics #Optics #QuantumTech\n\nRead on Meridian: ${blogUrl}\nJournal Paper: ${arxivLink}`;
  };

  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);

  // Update draft whenever title/excerpt/isOpen changes
  useEffect(() => {
    if (isOpen) {
      setDraftText(generateInitialDraft());
      setCopied(false);
    }
  }, [isOpen, title, excerpt, arxivLink, blogId]);

  const characterCount = draftText.length;
  const isOverLimit = characterCount > 600;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const getCounterColor = () => {
    if (characterCount > 600) return "text-red-500 font-bold";
    if (characterCount > 500) return "text-amber-500 font-semibold";
    return "text-emerald-500 font-medium";
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
            className="relative w-full max-w-lg bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden z-10"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 hover:bg-neutral-100 rounded-full text-gray-400 hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2 text-[#0077b5]">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="font-serif font-bold italic text-md text-gray-900">LinkedIn Share Companion</span>
              </div>
              <p className="text-xs text-gray-500">
                Meridian drafts a scannable, engaging post within your requested limit.
              </p>
            </div>

            {/* Input / Post Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Your Post Draft
                </label>
                <span className={`text-xs font-mono ${getCounterColor()}`}>
                  {characterCount} / 600 characters
                </span>
              </div>
              
              <div className="relative">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={6}
                  className={`w-full bg-neutral-50 hover:bg-neutral-100/75 focus:bg-white text-xs border rounded-2xl p-4 outline-none transition-all resize-none font-sans leading-relaxed ${
                    isOverLimit ? "border-red-300 focus:border-red-400 ring-2 ring-red-500/10" : "border-gray-200 focus:border-black"
                  }`}
                  placeholder="Draft your LinkedIn post..."
                />
              </div>

              {isOverLimit && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Post exceeds the requested limit!</span>
                </div>
              )}
            </div>

            {/* Helper Steps Card */}
            <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 space-y-3">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Recommended Workflow
              </h4>
              
              <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside leading-relaxed pl-1">
                <li>
                  {onDownloadPng ? (
                    <button
                      onClick={onDownloadPng}
                      className="text-black font-bold underline hover:text-neutral-700 transition-colors cursor-pointer text-left inline-flex items-center gap-1"
                    >
                      Download modern PNG Banner
                    </button>
                  ) : (
                    <span>Download your PNG banner image</span>
                  )}
                </li>
                <li>
                  <button
                    onClick={handleCopy}
                    className="text-black font-bold underline hover:text-neutral-700 transition-colors cursor-pointer text-left inline-flex items-center gap-1"
                  >
                    Copy your 300-char draft text
                  </button>
                </li>
                <li>
                  <span>Open LinkedIn to upload the banner and paste your draft</span>
                </li>
              </ol>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleCopy}
                className="flex-1 bg-black hover:bg-neutral-800 text-white font-bold text-xs py-3 rounded-full transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied successfully!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white" />
                    <span>Copy Draft to Clipboard</span>
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
