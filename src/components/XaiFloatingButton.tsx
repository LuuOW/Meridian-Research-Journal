import React, { useState } from "react";
import { Terminal, Sparkles, Cpu, Code2 } from "lucide-react";

interface XaiFloatingButtonProps {
  onClick: () => void;
  theme?: "light" | "dark";
}

export const XaiFloatingButton: React.FC<XaiFloatingButtonProps> = ({
  onClick,
  theme = "dark",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isLight = theme === "light";

  return (
    <div
      id="xai-floating-action-button"
      className="fixed bottom-5 left-5 z-40 select-none print:hidden transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label="Open xAI Coding Agent"
        className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer border ${
          isLight
            ? "bg-white/95 text-slate-900 border-slate-200/90 hover:border-cyan-500/50 shadow-slate-900/15 hover:shadow-cyan-500/20"
            : "bg-slate-950/95 text-white border-cyan-500/30 hover:border-cyan-400 shadow-cyan-950/40 hover:shadow-cyan-500/30"
        } backdrop-blur-md`}
      >
        {/* Animated Horizon Gradient Glow */}
        <div
          className={`absolute -inset-0.5 rounded-full blur-xs opacity-40 group-hover:opacity-100 transition-opacity duration-300 -z-10 ${
            isLight
              ? "bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400"
              : "bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500"
          }`}
        />

        {/* Core Icon Badge */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-black shadow-inner border transition-transform duration-300 group-hover:scale-105 ${
            isLight
              ? "bg-gradient-to-tr from-cyan-600 to-emerald-600 text-white border-cyan-500/30"
              : "bg-gradient-to-tr from-cyan-500 to-emerald-500 text-slate-950 border-cyan-400/40"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
        </div>

        {/* Button Label with Grok Badge */}
        <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
          <span className="tracking-tight">xAI Agent</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase tracking-wider border ${
              isLight
                ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
            }`}
          >
            Grok
          </span>
        </div>

        {/* Live Indicator Dot */}
        <span className="relative flex h-2 w-2 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </button>

      {/* Tooltip on Hover */}
      {isHovered && (
        <div
          className={`absolute bottom-full left-0 mb-2 px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap shadow-xl border animate-in fade-in zoom-in-95 duration-150 pointer-events-none ${
            isLight
              ? "bg-slate-900 text-white border-slate-800 shadow-slate-900/20"
              : "bg-slate-900 text-slate-200 border-cyan-500/30 shadow-black/50"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>xAI Coding Agent · Autonomous Self-Healing &amp; Tasks</span>
          </div>
        </div>
      )}
    </div>
  );
};
