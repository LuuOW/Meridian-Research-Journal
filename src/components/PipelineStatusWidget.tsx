import React, { useState } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, X, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { GenerationJob, BlogPost } from "../types";

interface PipelineStatusWidgetProps {
  jobs: GenerationJob[];
  onSelectBlog: (blog: BlogPost) => void;
  onDismissJob: (jobId: string) => void;
  onRetryJob: (arxivInput: string) => void;
  isEditorMode: boolean;
}

export const PipelineStatusWidget: React.FC<PipelineStatusWidgetProps> = ({
  jobs,
  onSelectBlog,
  onDismissJob,
  onRetryJob,
  isEditorMode
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter out dismissed jobs
  const activeJobs = jobs.filter((j) => !j.dismissed);

  if (activeJobs.length === 0) {
    return null;
  }

  const runningCount = activeJobs.filter((j) => j.status === "generating").length;
  const completedCount = activeJobs.filter((j) => j.status === "completed").length;
  const failedCount = activeJobs.filter((j) => j.status === "failed").length;

  return (
    <aside aria-label="Generation Pipeline Status" className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] font-sans transition-all duration-300">
      <div className="relative group p-[1.5px] rounded-2xl overflow-hidden shadow-2xl bg-neutral-900/90 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 dark:border-neutral-750">
        
        {/* Ray-traced ambient neon background highlight */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40 transition-opacity"
          style={{
            background: runningCount > 0 
              ? "radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.25), rgba(99, 102, 241, 0.15) 50%, transparent 80%)"
              : completedCount > 0
              ? "radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.25), transparent 70%)"
              : "radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.25), transparent 70%)"
          }}
        />

        {/* Top Header Bar */}
        <div className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-neutral-800/80 bg-black/40 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              runningCount > 0 
                ? "bg-cyan-400 animate-ping" 
                : completedCount > 0 
                ? "bg-emerald-400" 
                : "bg-red-400"
            }`} />
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

            {/* Collapse/Expand Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={isCollapsed ? "Expand pipeline panel" : "Minimize pipeline panel"}
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
            {activeJobs.map((job) => (
              <div 
                key={job.id} 
                className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800/80 space-y-2 relative transition-all"
              >
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
                    onClick={() => onDismissJob(job.id)}
                    className="p-1 text-neutral-500 hover:text-neutral-300 rounded hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                    title="Dismiss notification"
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
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
