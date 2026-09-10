import React from "react";
import { ArrowLeftRight, Sparkles } from "lucide-react";

interface InjectArxivWidgetProps {
  onOpenModal: () => void;
  currentArxivLink?: string;
  theme?: "light" | "dark";
}

export const InjectArxivWidget: React.FC<InjectArxivWidgetProps> = ({
  onOpenModal,
  currentArxivLink,
  theme = "dark"
}) => {
  const isLight = theme === "light";

  return (
    <div
      className={`rounded-2xl p-4 my-3 border transition-all ${
        isLight
          ? "bg-white border-purple-200 shadow-sm hover:shadow-md text-neutral-900"
          : "bg-neutral-950/90 border-purple-900/40 shadow-md text-neutral-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200 dark:border-neutral-800/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/90 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-500/30">
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-serif font-bold italic tracking-tight">
              Inject arXiv Source
            </span>
            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 text-[8px] font-mono font-bold uppercase tracking-wider rounded border border-purple-200 dark:border-purple-500/30">
              Handpick
            </span>
          </div>
        </div>

        <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          Replace Slot
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed my-2.5">
        Introduce a new arXiv URL or paper ID to replace this publication with your handpicked research paper.
      </p>

      {/* Action Button */}
      <button
        id="btn-open-inject-arxiv-modal"
        type="button"
        onClick={onOpenModal}
        className="w-full py-2.5 px-3.5 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-purple-600/20"
      >
        <ArrowLeftRight className="w-3.5 h-3.5 text-purple-200" />
        <span>Introduce New arXiv URL</span>
      </button>
    </div>
  );
};
