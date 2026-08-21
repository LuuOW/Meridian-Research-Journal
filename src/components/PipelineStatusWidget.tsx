import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, X, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { GenerationJob, BlogPost } from "../types";
import { calculateNormalizedCursor, computeRayTracedLightState, getDefaultLightState } from "../lib/rayTracingUtils";

interface PipelineStatusWidgetProps {
  jobs: GenerationJob[];
  onSelectBlog: (blog: BlogPost) => void;
  onDismissJob: (jobId: string) => void;
  onRetryJob: (arxivInput: string) => void;
  onOpenPipelineConsole?: () => void;
  isEditorMode: boolean;
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
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="absolute w-24 h-24 rounded-full bg-gradient-to-r from-white via-cyan-300 to-purple-400 shadow-[0_0_60px_25px_rgba(255,255,255,0.95)]"
    />

    {/* Primary 4-Point Lens Flare Cross Beams */}
    <motion.div
      initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
      animate={{ scale: [0.2, 3.5], rotate: [0, 90], opacity: [0, 1, 0] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute w-36 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_20px_#06b6d4]"
    />
    <motion.div
      initial={{ scale: 0.2, rotate: 90, opacity: 0 }}
      animate={{ scale: [0.2, 3.5], rotate: [90, 180], opacity: [0, 1, 0] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute w-36 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_20px_#a855f7]"
    />
    <motion.div
      initial={{ scale: 0.1, rotate: 45, opacity: 0 }}
      animate={{ scale: [0.1, 2.8], rotate: [45, 135], opacity: [0, 0.8, 0] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute w-32 h-0.5 bg-gradient-to-r from-transparent via-cyan-200 to-transparent"
    />

    {/* Radial Stardust Particles */}
    {STAR_PARTICLES.map((pt) => (
      <motion.div
        key={pt.id}
        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
        animate={{
          x: pt.x,
          y: pt.y,
          scale: [0, 2, 0],
          opacity: [1, 1, 0],
        }}
        transition={{ duration: 0.55, delay: pt.delay, ease: "easeOut" }}
        className="absolute rounded-full shadow-[0_0_12px_currentcolor]"
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

export const PipelineStatusWidget: React.FC<PipelineStatusWidgetProps> = ({
  jobs,
  onSelectBlog,
  onDismissJob,
  onRetryJob,
  onOpenPipelineConsole,
  isEditorMode
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [explodingJobIds, setExplodingJobIds] = useState<Set<string>>(new Set());
  const [isExplodingWidget, setIsExplodingWidget] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Simulated Ray Tracing Light State
  const [lightState, setLightState] = useState(getDefaultLightState());

  // Handle Ray Tracing pointer light tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
      const computed = computeRayTracedLightState(normX, normY, 4, 20);
      setLightState(computed);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Filter out dismissed jobs
  const activeJobs = jobs.filter((j) => !j.dismissed);

  const handleDismissJobWithExplosion = (jobId: string) => {
    setExplodingJobIds((prev) => new Set(prev).add(jobId));
    setTimeout(() => {
      onDismissJob(jobId);
      setExplodingJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }, 550);
  };

  const handleDismissWidgetWithExplosion = () => {
    setIsExplodingWidget(true);
    setTimeout(() => {
      activeJobs.forEach((job) => onDismissJob(job.id));
      setIsExplodingWidget(false);
    }, 550);
  };

  if (activeJobs.length === 0 && !isExplodingWidget) {
    return null;
  }

  const runningCount = activeJobs.filter((j) => j.status === "generating").length;
  const completedCount = activeJobs.filter((j) => j.status === "completed").length;
  const failedCount = activeJobs.filter((j) => j.status === "failed").length;

  return (
    <aside aria-label="Generation Pipeline Status" className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] font-sans transition-all duration-300">
      <AnimatePresence>
        <motion.div
          animate={
            isExplodingWidget
              ? {
                  scale: [1, 1.08, 0.2],
                  opacity: [1, 0.9, 0],
                  filter: [
                    "brightness(1) blur(0px)",
                    "brightness(2.5) blur(4px)",
                    "brightness(6) blur(16px)",
                  ],
                }
              : { scale: 1, opacity: 1, filter: "brightness(1) blur(0px)" }
          }
          transition={{ duration: isExplodingWidget ? 0.55 : 0.2 }}
          className="relative"
        >
          {isExplodingWidget && <StarExplosionBurst />}

          {/* Dynamic Ray Traced Shadow & 3D Perspective Modal Frame */}
          <div 
            ref={cardRef}
            className="relative group p-[2px] rounded-2xl overflow-hidden transition-transform duration-200 ease-out shadow-2xl"
            style={{
              transform: `perspective(1000px) rotateX(${lightState.tiltX}deg) rotateY(${lightState.tiltY}deg)`,
              boxShadow: runningCount > 0
                ? `${lightState.shadowX}px ${lightState.shadowY}px 35px -5px rgba(6, 182, 212, 0.4), 0 0 45px 5px rgba(168, 85, 247, 0.2)`
                : completedCount > 0
                ? `${lightState.shadowX}px ${lightState.shadowY}px 35px -5px rgba(16, 185, 129, 0.4), 0 0 35px 5px rgba(6, 182, 212, 0.2)`
                : `${lightState.shadowX}px ${lightState.shadowY}px 35px -5px rgba(239, 68, 68, 0.4), 0 0 35px 5px rgba(249, 115, 22, 0.2)`
            }}
          >
            
            {/* Dynamic Ray Traced Conic Neon Light Ring */}
            <div 
              className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-80 blur-xl group-hover:opacity-100 transition-opacity"
              style={{
                background: runningCount > 0
                  ? `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
                  : completedCount > 0
                  ? `conic-gradient(from ${lightState.angle}deg, #10b981, #06b6d4, #3b82f6, #10b981)`
                  : `conic-gradient(from ${lightState.angle}deg, #ef4444, #f97316, #a855f7, #ef4444)`
              }}
            />

            {/* Crisp Dynamic Neon Refraction Border */}
            <div 
              className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-95"
              style={{
                background: runningCount > 0
                  ? `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
                  : completedCount > 0
                  ? `conic-gradient(from ${lightState.angle}deg, #10b981, #06b6d4, #3b82f6, #10b981)`
                  : `conic-gradient(from ${lightState.angle}deg, #ef4444, #f97316, #a855f7, #ef4444)`
              }}
            />

            {/* Inner Metallic Card with Specular Optics & Glass Refraction */}
            <div className="relative bg-neutral-950/95 backdrop-blur-xl rounded-[14px] w-full overflow-hidden border border-neutral-800/90 transition-all shadow-inner">
              
              {/* Simulated Ray Traced Specular Highlight Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-75"
                style={{
                  background: `radial-gradient(circle 250px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.35), rgba(6, 182, 212, 0.12) 40%, transparent 70%)`
                }}
              />

              {/* Dynamic Optical Light Sheen Angle Sweep */}
              <div 
                className="absolute inset-0 pointer-events-none transition-all duration-300 opacity-25"
                style={{
                  background: `linear-gradient(${lightState.angle}deg, transparent 40%, rgba(255, 255, 255, 0.4) 50%, transparent 60%)`
                }}
              />

              {/* Top Gradient Metallic Shimmer Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

              {/* Top Header Bar */}
              <div className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-neutral-800/80 bg-black/50 text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative w-5 h-5 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 ring-1 ring-cyan-500/40">
                    <Sparkles className="w-3 h-3 text-cyan-400 fill-cyan-400/20 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-serif font-bold italic tracking-tight text-neutral-100">
                      Pipeline Status
                    </span>
                    {isEditorMode && (
                      <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-[8px] font-mono font-bold uppercase tracking-wider rounded border border-cyan-500/30">
                        Editor
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Status Summary Pills */}
                  {runningCount > 0 && (
                    <span className="px-2 py-0.5 bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 text-[9px] font-mono font-bold rounded-full flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                      {runningCount} Generating
                    </span>
                  )}
                  {completedCount > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 text-[9px] font-mono font-bold rounded-full">
                      {completedCount} Ready
                    </span>
                  )}

                  {/* Open Full Pipeline Console */}
                  {onOpenPipelineConsole && (
                    <button
                      onClick={onOpenPipelineConsole}
                      className="px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-cyan-300 text-[10px] font-mono font-bold transition-colors cursor-pointer border border-neutral-700/60"
                      title="Open full Pipeline Status Mode console"
                    >
                      Console
                    </button>
                  )}

                  {/* Collapse/Expand Toggle */}
                  <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title={isCollapsed ? "Expand pipeline panel" : "Minimize pipeline panel"}
                  >
                    {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Dismiss All Button with Star Explosion Effect */}
                  <button
                    onClick={handleDismissWidgetWithExplosion}
                    className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Dismiss pipeline notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Collapsed Compact Preview Bar */}
              {isCollapsed && (
                <div className="relative z-10 px-4 py-2.5 flex items-center justify-between text-xs text-neutral-300">
                  <span className="text-[11px] font-mono text-neutral-400 truncate">
                    {runningCount > 0 
                      ? `${runningCount} async job${runningCount > 1 ? "s" : ""} in progress...` 
                      : completedCount > 0 
                      ? `${completedCount} new article${completedCount > 1 ? "s" : ""} generated!` 
                      : `${failedCount} job${failedCount > 1 ? "s" : ""} failed.`}
                  </span>
                  <button
                    onClick={() => setIsCollapsed(false)}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline ml-2 shrink-0 cursor-pointer"
                  >
                    Expand
                  </button>
                </div>
              )}

              {/* Expanded Job List */}
              {!isCollapsed && (
                <div className="relative z-10 p-3 space-y-3 max-h-80 overflow-y-auto no-scrollbar">
                  <AnimatePresence>
                    {activeJobs.map((job) => {
                      const isExploding = explodingJobIds.has(job.id);
                      return (
                        <motion.div 
                          key={job.id} 
                          layout
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={
                            isExploding
                              ? {
                                  scale: [1, 1.06, 0.3],
                                  opacity: [1, 0.9, 0],
                                  filter: [
                                    "brightness(1) blur(0px)",
                                    "brightness(2.5) blur(3px)",
                                    "brightness(5) blur(12px)",
                                  ],
                                }
                              : { opacity: 1, y: 0, scale: 1, filter: "brightness(1) blur(0px)" }
                          }
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: isExploding ? 0.55 : 0.2 }}
                          className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800/80 space-y-2 relative transition-all shadow-sm overflow-hidden"
                        >
                          {isExploding && <StarExplosionBurst />}

                          {/* Job Title / Paper ID */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-mono text-neutral-400 truncate">
                                arXiv: <span className="text-neutral-200 font-bold">{job.arxivInput}</span>
                              </p>
                              {job.resultBlog && (
                                <h4 className="text-xs font-serif font-bold italic text-white line-clamp-1 mt-0.5">
                                  {job.resultBlog.title}
                                </h4>
                              )}
                            </div>

                            <button
                              onClick={() => handleDismissJobWithExplosion(job.id)}
                              className="p-1 text-neutral-500 hover:text-neutral-300 rounded hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                              title="Dismiss notification with star explosion"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Job Status Body */}
                          {job.status === "generating" && (
                            <div className="space-y-1.5 pt-1">
                              {/* Progress Bar */}
                              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden relative">
                                <div 
                                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                                  style={{ width: `${job.progressPercent}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                                <span className="truncate pr-2">{job.currentStepMessage}</span>
                                <span className="text-cyan-400 font-bold shrink-0">{job.progressPercent}%</span>
                              </div>
                            </div>
                          )}

                          {job.status === "completed" && job.resultBlog && (
                            <div className="pt-1 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                Ready to Read
                              </span>

                              <button
                                onClick={() => onSelectBlog(job.resultBlog!)}
                                className="px-3 py-1 bg-white text-black hover:bg-neutral-200 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm"
                              >
                                <span>View Article</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {job.status === "failed" && (
                            <div className="pt-1 space-y-2">
                              <p className="text-[10px] text-red-400 font-mono bg-red-950/50 p-1.5 rounded border border-red-900/40">
                                <AlertTriangle className="w-3 h-3 inline mr-1 text-red-400" />
                                {job.error || "Generation failed"}
                              </p>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => onRetryJob(job.arxivInput)}
                                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Retry
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
};
