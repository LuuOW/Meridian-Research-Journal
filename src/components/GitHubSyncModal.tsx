import React, { useState, useEffect } from "react";
import { 
  GitBranch, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ExternalLink, 
  X 
} from "lucide-react";

interface GitHubStatusData {
  configured: boolean;
  connected: boolean;
  repo: string;
  branch: string;
  user?: string | null;
  message: string;
  totalArticles: number;
}

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<GitHubStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string; commitUrl?: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/github/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to check GitHub status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setFeedback(null);
    }
  }, [isOpen]);

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setFeedback(null);
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Manual sync from editor" })
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          text: `Mirrored ${status?.totalArticles || "all"} articles to GitHub!`,
          commitUrl: data.commitUrls?.[0]
        });
      } else {
        setFeedback({
          type: "error",
          text: data.error || data.message || "Failed to push to GitHub"
        });
      }
      fetchStatus();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Network error syncing to GitHub"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch("/api/export/repo-bundle");
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.customBlogsJson, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "custom_blogs.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  if (!isOpen) return null;

  const repoName = status?.repo || "LuuOW/Meridian-Research-Journal";
  const branchName = status?.branch || "main";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-5 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-black dark:hover:text-white p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
              GitHub Mirror
            </h3>
            <a 
              href={`https://github.com/${repoName}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 font-mono inline-flex items-center gap-1 mt-0.5"
            >
              <span>{repoName}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-neutral-500 font-mono">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Checking status...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Status Pill */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {status?.connected 
                    ? `Connected (@${status.user})` 
                    : "Add GITHUB_TOKEN in Secrets"}
                </span>
              </div>
              <span className="font-mono text-neutral-400 text-[11px]">
                {status?.totalArticles || 0} articles • {branchName}
              </span>
            </div>

            {/* Feedback alert */}
            {feedback && (
              <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                feedback.type === "success" 
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
              }`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  {feedback.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{feedback.text}</span>
                </div>
                {feedback.commitUrl && (
                  <a 
                    href={feedback.commitUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline text-[11px] shrink-0 hover:opacity-80"
                  >
                    Commit
                  </a>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleDownload}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Download local JSON snapshot"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex-1 px-3 py-2 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span>{syncing ? "Pushing..." : "Sync Now"}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
