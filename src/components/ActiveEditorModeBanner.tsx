import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Unlock, Sparkles, ShieldCheck, Clock, Layers, LogOut, ChevronRight, Zap, GitBranch } from "lucide-react";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState
} from "../lib/rayTracingUtils";

interface ActiveEditorModeBannerProps {
  onOpenCreate: () => void;
  onToggleEditorMode: () => void;
  activeBlogTitle?: string;
  onRegenerateBanner?: () => void;
  isRegeneratingBanner?: boolean;
  onOpenGitHubSync?: () => void;
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
    {/* Blinding White-Cyan Flash Orb */}
    <motion.div
      initial={{ scale: 0.1, opacity: 0 }}
      animate={{
        scale: [0.1, 3.2, 4.5],
        opacity: [0, 1, 0],
        filter: ["brightness(1) blur(0px)", "brightness(3) blur(4px)", "brightness(6) blur(16px)"],
      }}
      transition={{ duration: 0.65, ease: "easeOut" }}
      className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-white via-cyan-300 to-purple-400 shadow-[0_0_80px_35px_rgba(255,255,255,0.95)]"
    />

    {/* Primary 4-Point Lens Flare Beams */}
    <motion.div
      initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
      animate={{ scale: [0.2, 4.2], rotate: [0, 90], opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-48 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_25px_#06b6d4]"
    />
    <motion.div
      initial={{ scale: 0.2, rotate: 90, opacity: 0 }}
      animate={{ scale: [0.2, 4.2], rotate: [90, 180], opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-48 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_25px_#a855f7]"
    />
    <motion.div
      initial={{ scale: 0.1, rotate: 45, opacity: 0 }}
      animate={{ scale: [0.1, 3.5], rotate: [45, 135], opacity: [0, 0.8, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-40 h-0.5 bg-gradient-to-r from-transparent via-cyan-200 to-transparent"
    />

    {/* Radial Stardust Particles */}
    {STAR_PARTICLES.map((pt) => (
      <motion.div
        key={pt.id}
        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
        animate={{
          x: pt.x,
          y: pt.y,
          scale: [0, 2.5, 0],
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

export const ActiveEditorModeBanner: React.FC<ActiveEditorModeBannerProps> = ({
  onOpenCreate,
  onToggleEditorMode,
  activeBlogTitle,
  onRegenerateBanner,
  isRegeneratingBanner,
  onOpenGitHubSync,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [lightState, setLightState] = useState(getDefaultLightState());
  const [showExitExplosion, setShowExitExplosion] = useState(false);
  const [showIntroBurst, setShowIntroBurst] = useState(true);

  // Play intro flash on mount
  useEffect(() => {
    const timer = setTimeout(() => setShowIntroBurst(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
    const computed = computeRayTracedLightState(normX, normY, 4, 18);
    setLightState(computed);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setLightState(getDefaultLightState());
  };

  const handleExitWithExplosion = () => {
    setShowExitExplosion(true);
    setTimeout(() => {
      onToggleEditorMode();
    }, 550);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2">
      <AnimatePresence>
        {showExitExplosion && <StarExplosionBurst />}
        {showIntroBurst && <StarExplosionBurst />}
      </AnimatePresence>

      <motion.div
        animate={
          showExitExplosion
            ? {
                scale: [1, 1.04, 0.95],
                opacity: [1, 0.8, 0],
                filter: [
                  "brightness(1) blur(0px)",
                  "brightness(3) blur(6px)",
                  "brightness(6) blur(20px)",
                ],
              }
            : { scale: 1, opacity: 1, filter: "brightness(1) blur(0px)" }
        }
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative w-full"
      >
        {/* Ray Traced Interactive Container */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="relative group p-[2px] rounded-2xl overflow-hidden transition-all duration-300 ease-out shadow-xl"
          style={{
            transform: isHovered
              ? `perspective(1000px) rotateX(${lightState.tiltX}deg) rotateY(${lightState.tiltY}deg) translateZ(4px)`
              : "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)",
            boxShadow: isHovered
              ? `${lightState.shadowX}px ${lightState.shadowY}px 35px -5px rgba(6, 182, 212, 0.45), 0 0 35px 5px rgba(168, 85, 247, 0.25)`
              : `${lightState.shadowX * 0.5}px ${lightState.shadowY * 0.5}px 20px -5px rgba(6, 182, 212, 0.2)`
          }}
        >
          {/* Ambient Ray-Traced Caustic Backsplash */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500 blur-2xl opacity-50 group-hover:opacity-100 -z-10"
            style={{
              background: `radial-gradient(circle 300px at ${lightState.lightX}% ${lightState.lightY}%, rgba(6, 182, 212, 0.35), rgba(168, 85, 247, 0.2), transparent 70%)`
            }}
          />

          {/* Dynamic Spinning Ray Traced Conic Neon Light Ring */}
          <div
            className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-75 blur-xl group-hover:opacity-100 transition-opacity"
            style={{
              background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
            }}
          />

          {/* Crisp Dynamic Neon Refraction Border */}
          <div
            className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-90"
            style={{
              background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #06b6d4)`
            }}
          />

          {/* Inner Metallic Dark Card Body */}
          <div className="relative bg-neutral-950/95 dark:bg-neutral-950/95 backdrop-blur-xl rounded-[14px] w-full p-3.5 sm:p-4 border border-neutral-800/90 shadow-2xl transition-all overflow-hidden">
            
            {/* Ray Traced Specular Light Reflection Overlay */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-80 z-10"
              style={{
                background: `radial-gradient(circle 350px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.25), rgba(6, 182, 212, 0.1) 45%, transparent 75%)`
              }}
            />

            {/* Optical Ray Angle Sheen Sweep */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-20 group-hover:opacity-40 z-10"
              style={{
                background: `linear-gradient(${lightState.angle}deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%)`
              }}
            />

            {/* Top Shimmer Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

            {/* Banner Layout Content */}
            <div className="relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              
              {/* Left Info Column */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                  <Unlock className="w-5 h-5 text-cyan-300" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-neutral-950 flex items-center justify-center">
                    <Zap className="w-2 h-2 text-black fill-black" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 font-serif italic">
                      Active Editor Mode
                    </span>
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                      Passkey Authorized
                    </span>
                    <span className="px-2 py-0.5 bg-neutral-800/80 text-neutral-300 border border-neutral-700/60 text-[9px] font-mono font-medium rounded-full hidden sm:flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-amber-400" />
                      5m Auto-Lock Active
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 dark:text-neutral-300 font-light truncate mt-0.5">
                    {activeBlogTitle ? (
                      <>
                        Currently Editing: <span className="text-cyan-300 font-medium italic">"{activeBlogTitle}"</span>
                      </>
                    ) : (
                      "Full administrative permissions unlocked. Ingest arXiv papers, regenerate SVG banners, or manage feed visibility."
                    )}
                  </p>
                </div>
              </div>

              {/* Right Action Column */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto w-full md:w-auto justify-end">
                {/* Generate Blog Button with Ray-traced Hover glow */}
                <button
                  onClick={onOpenCreate}
                  className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95 border border-cyan-400/40 group/btn"
                  title="Generate Blog from arXiv"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200 fill-cyan-200/20 group-hover/btn:rotate-12 transition-transform" />
                  <span>Generate Blog from arXiv</span>
                </button>

                {/* Optional Regenerate Banner Shortcut */}
                {onRegenerateBanner && (
                  <button
                    onClick={onRegenerateBanner}
                    disabled={isRegeneratingBanner}
                    className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Regenerate SVG banner for current article"
                  >
                    <Layers className={`w-3.5 h-3.5 text-cyan-400 ${isRegeneratingBanner ? "animate-spin" : ""}`} />
                    <span className="hidden lg:inline">{isRegeneratingBanner ? "Regenerating..." : "Regenerate Banner"}</span>
                  </button>
                )}

                {/* Discrete GitHub Mirror Icon-only Button */}
                {onOpenGitHubSync && (
                  <button
                    onClick={onOpenGitHubSync}
                    className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-cyan-400 border border-neutral-800 hover:border-neutral-700 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                    title="GitHub Repository Mirror Status & Sync"
                    aria-label="GitHub Mirror Status"
                  >
                    <GitBranch className="w-4 h-4" />
                  </button>
                )}

                {/* Exit Editor Mode Button */}
                <button
                  onClick={handleExitWithExplosion}
                  className="px-3 py-2 bg-neutral-900/90 hover:bg-red-950/60 text-neutral-300 hover:text-red-300 border border-neutral-800 hover:border-red-800/50 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Lock and exit Editor Mode"
                >
                  <LogOut className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-400" />
                  <span>Exit</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
