import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { calculateNormalizedCursor, computeRayTracedLightState, getDefaultLightState } from "../lib/rayTracingUtils";

interface RegenerateBannerWidgetProps {
  onRegenerate: () => void;
  isGenerating: boolean;
}

const STAR_PARTICLES = Array.from({ length: 16 }).map((_, i) => {
  const angle = (i * 360) / 16;
  const rad = (angle * Math.PI) / 180;
  const distance = 90 + (i % 3) * 35;
  return {
    id: i,
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
    size: 3 + (i % 4) * 2.5,
    color: i % 4 === 0 ? "#06b6d4" : i % 4 === 1 ? "#a855f7" : i % 4 === 2 ? "#38bdf8" : "#ffffff",
    delay: (i % 4) * 0.02,
  };
});

const StarExplosionBurst: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-visible">
    {/* Brilliant Central Flash Orb */}
    <motion.div
      initial={{ scale: 0.1, opacity: 0 }}
      animate={{
        scale: [0.1, 2.8, 3.8],
        opacity: [0, 1, 0],
        filter: ["brightness(1) blur(0px)", "brightness(3) blur(4px)", "brightness(6) blur(16px)"],
      }}
      transition={{ duration: 0.65, ease: "easeOut" }}
      className="absolute w-28 h-28 rounded-full bg-gradient-to-r from-white via-cyan-300 to-purple-400 shadow-[0_0_70px_30px_rgba(255,255,255,0.95)]"
    />

    {/* Primary 4-Point Lens Flare Cross Beams */}
    <motion.div
      initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
      animate={{ scale: [0.2, 3.8], rotate: [0, 90], opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-40 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_25px_#06b6d4]"
    />
    <motion.div
      initial={{ scale: 0.2, rotate: 90, opacity: 0 }}
      animate={{ scale: [0.2, 3.8], rotate: [90, 180], opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-40 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_25px_#a855f7]"
    />
    <motion.div
      initial={{ scale: 0.1, rotate: 45, opacity: 0 }}
      animate={{ scale: [0.1, 3.0], rotate: [45, 135], opacity: [0, 0.8, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-36 h-0.5 bg-gradient-to-r from-transparent via-cyan-200 to-transparent"
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

export const RegenerateBannerWidget: React.FC<RegenerateBannerWidgetProps> = ({
  onRegenerate,
  isGenerating,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightState, setLightState] = useState(getDefaultLightState());
  const [showExplosion, setShowExplosion] = useState(false);
  const prevGeneratingRef = useRef(isGenerating);

  // Trigger Star Explosion effect when banner finishes regenerating and is ready
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
      animate={
        showExplosion
          ? {
              scale: [1, 1.05, 1],
              filter: [
                "brightness(1) blur(0px)",
                "brightness(2.5) blur(2px)",
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
        className="relative group p-[2px] rounded-2xl overflow-hidden transition-transform duration-200 ease-out shadow-xl w-full"
        style={{
          transform: `perspective(1000px) rotateX(${lightState.tiltX}deg) rotateY(${lightState.tiltY}deg)`,
          boxShadow: showExplosion
            ? `${lightState.shadowX}px ${lightState.shadowY}px 45px -5px rgba(255, 255, 255, 0.9), 0 0 55px 10px rgba(6, 182, 212, 0.7)`
            : isGenerating
            ? `${lightState.shadowX}px ${lightState.shadowY}px 35px -5px rgba(6, 182, 212, 0.4), 0 0 45px 5px rgba(168, 85, 247, 0.2)`
            : `${lightState.shadowX}px ${lightState.shadowY}px 25px -5px rgba(99, 102, 241, 0.3), 0 0 25px 2px rgba(6, 182, 212, 0.15)`
        }}
      >
        {/* Dynamic Ray Traced Conic Neon Light Ring */}
        <div
          className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-80 blur-xl group-hover:opacity-100 transition-opacity"
          style={{
            background: showExplosion
              ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #a855f7, #ffffff)`
              : isGenerating
              ? `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
              : `conic-gradient(from ${lightState.angle}deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4)`
          }}
        />

        {/* Dynamic Neon Refraction Border */}
        <div
          className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-95"
          style={{
            background: showExplosion
              ? `conic-gradient(from ${lightState.angle}deg, #ffffff, #06b6d4, #a855f7, #ffffff)`
              : isGenerating
              ? `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
              : `conic-gradient(from ${lightState.angle}deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4)`
          }}
        />

        {/* Inner Metallic Card Panel */}
        <div className="relative bg-neutral-950/95 backdrop-blur-xl rounded-[14px] w-full overflow-hidden border border-neutral-800/90 shadow-inner p-3 space-y-2.5">
          
          {/* Specular Highlight Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-75"
            style={{
              background: `radial-gradient(circle 250px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.35), rgba(6, 182, 212, 0.12) 40%, transparent 70%)`
            }}
          />

          {/* Top Shimmer Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

          {/* Header with Pipeline Status & Editor Badges */}
          <div className="relative z-10 flex items-center justify-between pb-1.5 border-b border-neutral-800/80 text-white">
            <div className="flex items-center gap-2">
              <div className="relative w-5 h-5 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 ring-1 ring-cyan-500/40">
                <Sparkles className="w-3 h-3 text-cyan-400 fill-cyan-400/20 animate-pulse" />
              </div>
              <span className="text-xs font-serif font-bold italic tracking-tight text-neutral-100">
                Pipeline Status
              </span>
              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-[8px] font-mono font-bold uppercase tracking-wider rounded border border-cyan-500/30">
                Editor
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isGenerating ? (
                <span className="px-2 py-0.5 bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 text-[9px] font-mono font-bold rounded-full flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                  1 Generating
                </span>
              ) : (
                <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full flex items-center gap-1 ${
                  showExplosion
                    ? "bg-cyan-500 text-black border border-white animate-pulse"
                    : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                }`}>
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {showExplosion ? "Banner Ready!" : "Ready"}
                </span>
              )}
            </div>
          </div>

          {/* Action Button Area */}
          <div className="relative z-10 pt-1">
            {isGenerating ? (
              <div className="py-2 px-3 bg-neutral-900/90 border border-cyan-500/30 rounded-xl flex items-center justify-between gap-2 text-xs font-mono text-cyan-300">
                <div className="flex items-center gap-2 truncate">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span className="truncate">AI Vector Engine Generating Banner...</span>
                </div>
                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold rounded shrink-0">
                  Processing
                </span>
              </div>
            ) : (
              <button
                onClick={onRegenerate}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-cyan-400/40 transition-all cursor-pointer shadow-lg active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Regenerate Article Banner</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

