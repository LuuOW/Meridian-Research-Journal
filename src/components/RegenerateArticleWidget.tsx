import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, CheckCircle2, FileText, BookOpen } from "lucide-react";
import { calculateNormalizedCursor, computeRayTracedLightState, getDefaultLightState } from "../lib/rayTracingUtils";

interface RegenerateArticleWidgetProps {
  onRegenerate: () => void;
  isGenerating: boolean;
}

const STAR_PARTICLES = Array.from({ length: 18 }).map((_, i) => {
  const angle = (i * 360) / 18;
  const rad = (angle * Math.PI) / 180;
  const distance = 95 + (i % 3) * 35;
  return {
    id: i,
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
    size: 3 + (i % 4) * 2.5,
    color: i % 4 === 0 ? "#10b981" : i % 4 === 1 ? "#06b6d4" : i % 4 === 2 ? "#34d399" : "#ffffff",
    delay: (i % 4) * 0.02,
  };
});

const StarExplosionBurst: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-visible">
    {/* Central Flash Orb */}
    <motion.div
      initial={{ scale: 0.1, opacity: 0 }}
      animate={{
        scale: [0.1, 2.8, 3.8],
        opacity: [0, 1, 0],
        filter: ["brightness(1) blur(0px)", "brightness(3) blur(4px)", "brightness(6) blur(16px)"],
      }}
      transition={{ duration: 0.65, ease: "easeOut" }}
      className="absolute w-28 h-28 rounded-full bg-gradient-to-r from-white via-emerald-300 to-teal-400 shadow-[0_0_70px_30px_rgba(255,255,255,0.95)]"
    />

    {/* Primary 4-Point Lens Flare Cross Beams */}
    <motion.div
      initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
      animate={{ scale: [0.2, 3.8], rotate: [0, 90], opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-40 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_25px_#10b981]"
    />
    <motion.div
      initial={{ scale: 0.2, rotate: 90, opacity: 0 }}
      animate={{ scale: [0.2, 3.8], rotate: [90, 180], opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-40 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_25px_#059669]"
    />

    {/* Radial Stardust Particles */}
    {STAR_PARTICLES.map((pt) => (
      <motion.div
        key={pt.id}
        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
        animate={{
          x: pt.x,
          y: pt.y,
          scale: [0, 2.2, 0],
          opacity: [1, 1, 0],
        }}
        transition={{ duration: 0.65, delay: pt.delay, ease: "easeOut" }}
        className="absolute rounded-full shadow-[0_0_14px_currentcolor]"
        style={{
          width: `${pt.size}px`,
          height: `${pt.size}px`,
          backgroundColor: pt.color,
          color: pt.color,
        }}
      />
    ))}
  </div>
);

export const RegenerateArticleWidget: React.FC<RegenerateArticleWidgetProps> = ({
  onRegenerate,
  isGenerating,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightState, setLightState] = useState(getDefaultLightState());
  const [showExplosion, setShowExplosion] = useState(false);
  const prevGeneratingRef = useRef(isGenerating);

  useEffect(() => {
    if (prevGeneratingRef.current && !isGenerating) {
      setShowExplosion(true);
      const timer = setTimeout(() => {
        setShowExplosion(false);
      }, 800);
      return () => clearTimeout(timer);
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
      const computed = computeRayTracedLightState(normX, normY, 4, 20);
      setLightState(computed);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div
      id="regenerate-article-widget"
      animate={
        showExplosion
          ? {
              scale: [1, 1.03, 1],
              filter: [
                "brightness(1) blur(0px)",
                "brightness(2.2) blur(1px)",
                "brightness(1) blur(0px)",
              ],
            }
          : { scale: 1, filter: "brightness(1) blur(0px)" }
      }
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative w-full"
    >
      <AnimatePresence>
        {showExplosion && <StarExplosionBurst />}
      </AnimatePresence>

      <div
        ref={containerRef}
        className="relative group p-[1.5px] rounded-2xl overflow-hidden transition-transform duration-200 ease-out shadow-lg w-full"
        style={{
          transform: `perspective(1000px) rotateX(${lightState.tiltX}deg) rotateY(${lightState.tiltY}deg)`,
          boxShadow: showExplosion
            ? `${lightState.shadowX}px ${lightState.shadowY}px 40px -5px rgba(255, 255, 255, 0.9), 0 0 50px 8px rgba(16, 185, 129, 0.6)`
            : isGenerating
            ? `${lightState.shadowX}px ${lightState.shadowY}px 30px -5px rgba(16, 185, 129, 0.35), 0 0 35px 4px rgba(5, 150, 105, 0.2)`
            : `${lightState.shadowX}px ${lightState.shadowY}px 20px -5px rgba(16, 185, 129, 0.2), 0 0 20px 2px rgba(16, 185, 129, 0.1)`
        }}
      >
        {/* Dynamic Ray Traced Conic Light Ring (Emerald / Forest Theme) */}
        <div
          className="absolute -inset-[150%] animate-[spin_10s_linear_infinite] opacity-75 blur-xl group-hover:opacity-95 transition-opacity"
          style={{
            background: showExplosion
              ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #10b981, #059669, #ffffff)`
              : isGenerating
              ? `conic-gradient(from ${lightState.angle}deg, #10b981, #059669, #34d399, #10b981)`
              : `conic-gradient(from ${lightState.angle}deg, #10b981, #047857, #10b981)`
          }}
        />

        {/* Dynamic Refraction Border */}
        <div
          className="absolute -inset-[150%] animate-[spin_10s_linear_infinite] opacity-90"
          style={{
            background: showExplosion
              ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #10b981, #059669, #ffffff)`
              : isGenerating
              ? `conic-gradient(from ${lightState.angle}deg, #10b981, #059669, #34d399, #10b981)`
              : `conic-gradient(from ${lightState.angle}deg, #10b981, #047857, #10b981)`
          }}
        />

        {/* Inner Metallic Card Panel */}
        <div className="relative bg-neutral-950/95 backdrop-blur-xl rounded-[14px] w-full overflow-hidden border border-emerald-900/60 shadow-inner p-3.5 space-y-2.5">
          
          {/* Specular Highlight Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-75"
            style={{
              background: `radial-gradient(circle 220px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.3), rgba(16, 185, 129, 0.12) 45%, transparent 70%)`
            }}
          />

          {/* Top Emerald Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

          {/* Header with Pipeline Status & Editor Badges */}
          <div className="relative z-10 flex items-center justify-between pb-2 border-b border-neutral-800/80 text-white">
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6 rounded-lg bg-emerald-950/90 text-emerald-300 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/50">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-serif font-bold italic tracking-tight text-neutral-100">
                    Article Text & Math
                  </span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[8px] font-mono font-bold uppercase tracking-wider rounded border border-emerald-500/30">
                    Prose
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isGenerating ? (
                <span className="px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 text-[9px] font-mono font-bold rounded-full flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-400" />
                  Synthesizing
                </span>
              ) : (
                <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full flex items-center gap-1 ${
                  showExplosion
                    ? "bg-emerald-500 text-black border border-white font-black animate-pulse"
                    : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                }`}>
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {showExplosion ? "Published!" : "Ready"}
                </span>
              )}
            </div>
          </div>

          {/* Action Button Area */}
          <div className="relative z-10 pt-0.5">
            {isGenerating ? (
              <div className="py-2.5 px-3 bg-neutral-900/95 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 text-xs font-mono text-emerald-300">
                <div className="flex items-center gap-2 truncate">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                  <span className="truncate text-[11px]">Re-synthesizing full paper analysis...</span>
                </div>
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[8px] font-mono font-bold rounded shrink-0">
                  Step AI
                </span>
              </div>
            ) : (
              <button
                id="btn-regenerate-article-action"
                onClick={onRegenerate}
                className="w-full py-2.5 px-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-emerald-400/40 transition-all cursor-pointer shadow-md active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-200" />
                <span>Regenerate Scholarly Article</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
