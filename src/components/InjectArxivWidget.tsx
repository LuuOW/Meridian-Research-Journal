import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowLeftRight, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState,
  LightState
} from "../lib/rayTracingUtils";

interface InjectArxivWidgetProps {
  onOpenModal: () => void;
  currentArxivLink?: string;
}

export const InjectArxivWidget: React.FC<InjectArxivWidgetProps> = ({
  onOpenModal,
  currentArxivLink
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightState, setLightState] = useState<LightState>(getDefaultLightState());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
      const computed = computeRayTracedLightState(normX, normY, 3, 20);
      setLightState(computed);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl overflow-hidden p-[1.2px] group my-2"
      style={{
        transform: `perspective(800px) rotateX(${lightState.tiltX}deg) rotateY(${lightState.tiltY}deg)`,
        boxShadow: `${lightState.shadowX}px ${lightState.shadowY}px 25px -4px rgba(168, 85, 247, 0.25)`
      }}
    >
      {/* Ray-traced Dynamic Border Ring */}
      <div
        className="absolute -inset-[150%] animate-[spin_10s_linear_infinite] opacity-75 group-hover:opacity-100 transition-opacity"
        style={{
          background: `conic-gradient(from ${lightState.angle}deg, #a855f7, #6366f1, #3b82f6, #a855f7)`
        }}
      />

      {/* Main Glass Card */}
      <div className="relative bg-neutral-950/95 backdrop-blur-xl rounded-[15px] p-3.5 space-y-3 overflow-hidden border border-purple-900/40">
        {/* Top Accent Shimmer */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-600 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

        {/* Header with Title & Badge */}
        <div className="relative z-10 flex items-center justify-between pb-2 border-b border-neutral-800/80 text-white">
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 rounded-lg bg-purple-950/90 text-purple-300 flex items-center justify-center shrink-0 ring-1 ring-purple-500/50">
              <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-serif font-bold italic tracking-tight text-neutral-100">
                  Inject arXiv Source
                </span>
                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[8px] font-mono font-bold uppercase tracking-wider rounded border border-purple-500/30">
                  Handpick
                </span>
              </div>
            </div>
          </div>

          <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
            Replace Slot
          </span>
        </div>

        {/* Info & Current Reference */}
        <p className="relative z-10 text-[11px] text-neutral-300 font-sans leading-relaxed">
          Introduce a new arXiv URL or paper ID to replace this publication with your handpicked research paper.
        </p>

        {/* Action Button */}
        <div className="relative z-10 pt-0.5">
          <button
            id="btn-open-inject-arxiv-modal"
            onClick={onOpenModal}
            className="w-full py-2.5 px-3.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-600 hover:from-purple-600 hover:via-indigo-600 hover:to-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-purple-400/40 transition-all cursor-pointer shadow-md active:scale-[0.98]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-purple-200" />
            <span>Introduce New arXiv URL</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
