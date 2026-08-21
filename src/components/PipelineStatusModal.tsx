import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Trash2,
  Plus,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { GenerationJob, BlogPost } from "../types";
import { formatElapsedTime, BANNER_PIPELINE_STEPS, PIPELINE_STEPS } from "../lib/pipelineUtils";
import { calculateNormalizedCursor, computeRayTracedLightState, getDefaultLightState } from "../lib/rayTracingUtils";

interface PipelineStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: GenerationJob[];
  onSelectBlog: (blog: BlogPost) => void;
  onDismissJob: (jobId: string) => void;
  onClearFinishedJobs: () => void;
  onRetryJob: (arxivInput: string) => void;
  onOpenCreate: () => void;
  isEditorMode: boolean;
}

export const PipelineStatusModal: React.FC<PipelineStatusModalProps> = ({
  isOpen,
  onClose,
  jobs,
  onSelectBlog,
  onDismissJob,
  onClearFinishedJobs,
  onRetryJob,
  onOpenCreate,
  isEditorMode
}) => {
  const [expandedLogJobIds, setExpandedLogJobIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());
  const cardRef = useRef<HTMLDivElement>(null);
  const [lightState, setLightState] = useState(getDefaultLightState());

  // Live timer tick for active jobs
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Ray-tracing hover lighting
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
      const computed = computeRayTracedLightState(normX, normY, 4, 18);
      setLightState(computed);
    };

    if (isOpen) {
      window.addEventListener("mousemove", handleMouseMove);
    }
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleLogExpand = (jobId: string) => {
    setExpandedLogJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const activeJobs = jobs.filter((j) => !j.dismissed);
  const runningJobs = activeJobs.filter((j) => j.status === "generating");
  const completedJobs = activeJobs.filter((j) => j.status === "completed");
  const failedJobs = activeJobs.filter((j) => j.status === "failed");

  return (
    <div
      id="pipeline-status-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden relative"
        style={{
          boxShadow: `0 20px 45px -15px rgba(0, 0, 0, 0.35), ${lightState.boxShadow}`
        }}
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-600/10 dark:bg-cyan-400/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-serif italic text-neutral-900 dark:text-neutral-100">
                  Generation Pipeline Status Mode
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                  Live Monitor
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">
                Real-time execution telemetry for arXiv translations and banner synthesis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditorMode && (
              <button
                id="pipeline-new-job-btn"
                onClick={onOpenCreate}
                className="px-3.5 py-1.5 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Pipeline</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close Pipeline Console"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-neutral-100/60 dark:bg-neutral-950/60 border-b border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="font-mono text-neutral-600 dark:text-neutral-300">
              Active: <strong className="text-cyan-600 dark:text-cyan-400">{runningJobs.length}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-neutral-600 dark:text-neutral-300">
              Completed: <strong className="text-emerald-600 dark:text-emerald-400">{completedJobs.length}</strong>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-mono text-neutral-600 dark:text-neutral-300">
                Failed: <strong className="text-red-600 dark:text-red-400">{failedJobs.length}</strong>
              </span>
            </div>
            {activeJobs.length > 0 && (
              <button
                onClick={onClearFinishedJobs}
                className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors underline cursor-pointer"
                title="Clear all completed and failed runs from view"
              >
                Clear finished
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Pipeline Jobs Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active / In-Progress Pipelines */}
          {runningJobs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Active In-Progress Pipelines ({runningJobs.length})
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Editor lock protected during active runs
                </span>
              </div>

              <div className="space-y-3">
                {runningJobs.map((job) => {
                  const elapsed = formatElapsedTime(job.startTime, now);
                  const isLogExpanded = expandedLogJobIds.has(job.id);
                  const isBannerJob = job.jobType === "banner_regen";

                  return (
                    <div
                      key={job.id}
                      className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-cyan-500/30 dark:border-cyan-500/20 shadow-sm relative overflow-hidden transition-all"
                    >
                      {/* Ambient corner light */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
                            {isBannerJob ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                {job.targetTitle || job.arxivInput}
                              </h4>
                              <span className="px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-widest rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                                {isBannerJob ? "Banner Vector" : "Full Article"}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5 truncate">
                              Target: {job.arxivInput}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 border border-cyan-200 dark:border-cyan-800/40">
                            <Clock className="w-3 h-3" />
                            {elapsed}
                          </div>
                          <button
                            onClick={() => onDismissJob(job.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                            title="Dismiss from active monitor"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar & Current Step */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium truncate flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
                            {job.currentStepMessage}
                          </span>
                          <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {job.progressPercent}%
                          </span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${job.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Execution Step Logs Toggle */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between text-xs">
                        <button
                          onClick={() => toggleLogExpand(job.id)}
                          className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 font-mono text-[11px] cursor-pointer"
                        >
                          <Terminal className="w-3 h-3" />
                          {isLogExpanded ? "Hide Execution Logs" : `View Logs (${job.stepLogs?.length || 1})`}
                          {isLogExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        <span className="text-[10px] text-neutral-400 font-mono">
                          ID: {job.id.slice(0, 16)}
                        </span>
                      </div>

                      {/* Expanded Log Output */}
                      {isLogExpanded && (
                        <div className="mt-2 p-3 rounded-xl bg-neutral-900 text-neutral-300 font-mono text-[11px] space-y-1 max-h-40 overflow-y-auto">
                          {job.stepLogs && job.stepLogs.length > 0 ? (
                            job.stepLogs.map((log, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-neutral-500 shrink-0">
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </span>
                                <span className="text-cyan-300 shrink-0">&gt;</span>
                                <span className="text-neutral-200">{log.message}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-neutral-400">&gt; Pipeline executing background AI generation...</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed / Historical Pipelines */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Pipeline History &amp; Completed Outputs ({completedJobs.length + failedJobs.length})
            </h3>

            {completedJobs.length === 0 && failedJobs.length === 0 && runningJobs.length === 0 ? (
              <div className="p-10 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
                <Activity className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-serif italic text-neutral-700 dark:text-neutral-300">
                  No generation pipelines logged in this session.
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Trigger an article from arXiv or regenerate a banner to monitor progress here.
                </p>
                {isEditorMode && (
                  <button
                    onClick={onOpenCreate}
                    className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Start ArXiv Pipeline
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Completed Jobs */}
                {completedJobs.map((job) => {
                  const duration = job.completedTime
                    ? `${Math.round((job.completedTime - job.startTime) / 1000)}s`
                    : "completed";
                  const isLogExpanded = expandedLogJobIds.has(job.id);

                  return (
                    <div
                      key={job.id}
                      className="p-3.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800/80 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                              {job.targetTitle || job.arxivInput}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                              <span>Duration: {duration}</span>
                              <span>•</span>
                              <span>
                                {new Date(job.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {job.resultBlog && (
                            <button
                              onClick={() => {
                                onSelectBlog(job.resultBlog!);
                                onClose();
                              }}
                              className="px-3 py-1 bg-neutral-900 hover:bg-black dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-black rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                            >
                              <span>View Post</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => onDismissJob(job.id)}
                            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                            title="Remove from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Log details toggle */}
                      {job.stepLogs && job.stepLogs.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleLogExpand(job.id)}
                            className="text-[10px] font-mono text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center gap-1"
                          >
                            <Terminal className="w-2.5 h-2.5" />
                            {isLogExpanded ? "Hide Logs" : `Logs (${job.stepLogs.length})`}
                          </button>
                          {isLogExpanded && (
                            <div className="mt-1.5 p-2 rounded-lg bg-neutral-900 text-neutral-300 font-mono text-[10px] space-y-0.5 max-h-32 overflow-y-auto">
                              {job.stepLogs.map((log, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <span className="text-neutral-500">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                  </span>
                                  <span className="text-neutral-200">{log.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Failed Jobs */}
                {failedJobs.map((job) => {
                  return (
                    <div
                      key={job.id}
                      className="p-3.5 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                              {job.targetTitle || job.arxivInput}
                            </h4>
                            <p className="text-xs text-red-600 dark:text-red-400 font-mono mt-0.5">
                              {job.error || "Generation pipeline failed"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              onRetryJob(job.arxivInput);
                              onClose();
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                          <button
                            onClick={() => onDismissJob(job.id)}
                            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                            title="Remove from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px]">Persistence Engine: Local + Server Sync</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
