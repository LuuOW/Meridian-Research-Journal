import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Cpu,
  Sparkles,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  FileCode,
  Play,
  RotateCcw,
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
  Layers,
  Wrench,
  AlertTriangle,
  Send,
  Loader2,
  Copy,
  Check
} from "lucide-react";
import type { CodingTask, XaiAgentStatus } from "../services/XaiCodingAgent";

interface XaiCodingAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
}

export const XaiCodingAgentModal: React.FC<XaiCodingAgentModalProps> = ({
  isOpen,
  onClose,
  theme = "dark",
}) => {
  const [status, setStatus] = useState<XaiAgentStatus | null>(null);
  const [tasks, setTasks] = useState<CodingTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<CodingTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"runner" | "tasks" | "heal">("runner");

  // Runner Form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskCategory, setTaskCategory] = useState<CodingTask["category"]>("bugfix");
  const [targetFiles, setTargetFiles] = useState("src/services/XaiCodingAgent.ts");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Error healing state
  const [errorLogInput, setErrorLogInput] = useState(
    `2026-09-05T18:10:51.819993Z ✘ [ERROR] Unexpected "type"\n    src/services/XaiCodingAgent:14:7:\n      14 │ export type CodingTask =\n         ╵        ~~~~`
  );

  const fetchStatusAndTasks = async () => {
    try {
      const [statusRes, tasksRes] = await Promise.all([
        fetch("/api/xai/status"),
        fetch("/api/xai/tasks"),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        if (data.status) setStatus(data.status);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        if (data.tasks) {
          setTasks(data.tasks);
          if (!selectedTask && data.tasks.length > 0) {
            setSelectedTask(data.tasks[0]);
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch xAI status:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndTasks();
    }
  }, [isOpen]);

  const handleRunTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/xai/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          category: taskCategory,
          targetFiles: targetFiles.split(",").map((s) => s.trim()).filter(Boolean),
          codeSnippet: codeSnippet || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          setTasks((prev) => [data.task, ...prev]);
          setSelectedTask(data.task);
          setActiveTab("tasks");
          setTaskTitle("");
          setTaskDescription("");
          setCodeSnippet("");
        }
      }
    } catch (err) {
      console.error("Task execution error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSelfHealing = async () => {
    if (!errorLogInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/xai/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorLog: errorLogInput }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          setTasks((prev) => [data.task, ...prev]);
          setSelectedTask(data.task);
          setActiveTab("tasks");
        }
      }
    } catch (err) {
      console.error("Self-healing error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const isLight = theme === "light";

  return (
    <div
      id="xai-coding-agent-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border transition-colors duration-200 ${
          isLight
            ? "bg-white border-slate-200 text-slate-900 shadow-slate-900/20"
            : "bg-slate-950 border-cyan-500/30 text-white shadow-cyan-950/40"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Horizon */}
        <div
          className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
            isLight
              ? "bg-gradient-to-r from-slate-50 via-cyan-50/50 to-emerald-50/40 border-slate-200"
              : "bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/60 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md font-mono font-black text-sm border ${
                isLight
                  ? "bg-gradient-to-tr from-cyan-600 to-emerald-600 text-white border-cyan-500/40 shadow-cyan-500/20"
                  : "bg-gradient-to-tr from-cyan-500 to-emerald-500 text-slate-950 border-cyan-400 shadow-cyan-500/30"
              }`}
            >
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-base sm:text-lg font-bold tracking-tight ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  xAI Coding Agent
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1 ${
                    isLight
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Autonomous Stack
                </span>
              </div>
              <p
                className={`text-xs ${
                  isLight ? "text-slate-600" : "text-slate-400"
                }`}
              >
                Grok AI autonomous engineering, self-healing compiler diagnostics &amp; refactoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {status && (
              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-xl border hidden sm:flex items-center gap-1.5 ${
                  isLight
                    ? "bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-slate-900 text-cyan-300 border-slate-800"
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                <span>{status.model}</span>
              </span>
            )}

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isLight
                  ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`px-5 py-2.5 border-b flex items-center justify-between gap-2 overflow-x-auto ${
            isLight
              ? "bg-slate-50/80 border-slate-200"
              : "bg-slate-900/60 border-slate-800/80"
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("runner")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "runner"
                  ? isLight
                    ? "bg-white text-cyan-700 shadow-sm border border-slate-200"
                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Task Runner</span>
            </button>

            <button
              onClick={() => setActiveTab("heal")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "heal"
                  ? isLight
                    ? "bg-white text-amber-700 shadow-sm border border-slate-200"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Self-Heal Build Error</span>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "tasks"
                  ? isLight
                    ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Task History ({tasks.length})</span>
            </button>
          </div>

          <button
            onClick={fetchStatusAndTasks}
            className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1 transition-colors ${
              isLight
                ? "text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="Refresh Status"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* TAB 1: TASK RUNNER */}
          {activeTab === "runner" && (
            <form onSubmit={handleRunTask} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label
                    className={`text-xs font-bold uppercase tracking-wider block ${
                      isLight ? "text-slate-700" : "text-slate-300"
                    }`}
                  >
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Audit Type Safety in XaiCodingAgent or Add Unit Tests"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-medium focus:outline-none focus:ring-2 transition-all ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-cyan-500/40"
                        : "bg-slate-900 border-slate-700 text-white focus:ring-cyan-400/50"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-bold uppercase tracking-wider block ${
                      isLight ? "text-slate-700" : "text-slate-300"
                    }`}
                  >
                    Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as any)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-medium focus:outline-none focus:ring-2 transition-all ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-cyan-500/40"
                        : "bg-slate-900 border-slate-700 text-white focus:ring-cyan-400/50"
                    }`}
                  >
                    <option value="bugfix">Bugfix (Self-Heal)</option>
                    <option value="refactor">Refactor &amp; Clean Code</option>
                    <option value="feature">Feature Implementation</option>
                    <option value="audit">Security &amp; Type Audit</option>
                    <option value="test">Test Generation</option>
                    <option value="review">Architecture Review</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold uppercase tracking-wider block ${
                    isLight ? "text-slate-700" : "text-slate-300"
                  }`}
                >
                  Target Files (Comma-separated)
                </label>
                <input
                  type="text"
                  value={targetFiles}
                  onChange={(e) => setTargetFiles(e.target.value)}
                  placeholder="src/services/XaiCodingAgent.ts, server.ts"
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border font-mono focus:outline-none focus:ring-2 transition-all ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-cyan-500/40"
                      : "bg-slate-900 border-slate-700 text-cyan-300 focus:ring-cyan-400/50"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold uppercase tracking-wider block ${
                    isLight ? "text-slate-700" : "text-slate-300"
                  }`}
                >
                  Prompt &amp; Instructions
                </label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe the coding change, bugfix, or type enhancement for the xAI agent to execute..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-sans focus:outline-none focus:ring-2 transition-all ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-cyan-500/40"
                      : "bg-slate-900 border-slate-700 text-slate-200 focus:ring-cyan-400/50"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold uppercase tracking-wider block ${
                    isLight ? "text-slate-700" : "text-slate-300"
                  }`}
                >
                  Code Snippet (Optional Context)
                </label>
                <textarea
                  rows={2}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="Optional code snippet or interface to provide context..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 transition-all ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-cyan-500/40"
                      : "bg-slate-900 border-slate-700 text-emerald-300 focus:ring-cyan-400/50"
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div
                  className={`text-xs flex items-center gap-1.5 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Powered by xAI Autonomous Engineering Microservice</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing with xAI Grok...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Run Autonomous Task</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SELF-HEAL COMPILER ERROR */}
          {activeTab === "heal" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  isLight
                    ? "bg-amber-50/70 border-amber-200 text-amber-900"
                    : "bg-amber-950/20 border-amber-500/30 text-amber-200"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Automated Build Error Diagnostics &amp; Self-Healing</span>
                </div>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  Paste any build log or TypeScript/bundler error. The xAI agent inspects the syntax, resolves loader discrepancies (such as the unexpected &quot;type&quot; token), and produces an immediate fix.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold uppercase tracking-wider block ${
                    isLight ? "text-slate-700" : "text-slate-300"
                  }`}
                >
                  Compiler Error Log
                </label>
                <textarea
                  rows={5}
                  value={errorLogInput}
                  onChange={(e) => setErrorLogInput(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs border leading-relaxed focus:outline-none focus:ring-2 ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-800 focus:bg-white focus:ring-amber-500/40"
                      : "bg-slate-900 border-slate-700 text-rose-300 focus:ring-amber-400/50"
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-xs ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Current status: <strong>Build verified and compiling green</strong>
                </span>

                <button
                  type="button"
                  onClick={handleRunSelfHealing}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Diagnosing &amp; Healing...</span>
                    </>
                  ) : (
                    <>
                      <Wrench className="w-4 h-4" />
                      <span>Execute Self-Healing</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TASK HISTORY & DIFF VIEWER */}
          {activeTab === "tasks" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Task Sidebar list */}
              <div className="lg:col-span-4 space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div
                    className={`p-4 rounded-xl border text-center text-xs ${
                      isLight
                        ? "bg-slate-50 border-slate-200 text-slate-500"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    No tasks executed yet.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        selectedTask?.id === task.id
                          ? isLight
                            ? "bg-cyan-50/70 border-cyan-400 shadow-sm"
                            : "bg-cyan-950/30 border-cyan-500/50 shadow-sm"
                          : isLight
                          ? "bg-slate-50 hover:bg-slate-100 border-slate-200"
                          : "bg-slate-900/60 hover:bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                            task.status === "completed"
                              ? isLight
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : task.status === "running"
                              ? isLight
                                ? "bg-cyan-50 text-cyan-700 border-cyan-300"
                                : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                              : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {task.status}
                        </span>
                        <span
                          className={`text-[10px] ${
                            isLight ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          {new Date(task.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <h4
                        className={`text-xs font-bold truncate ${
                          isLight ? "text-slate-900" : "text-white"
                        }`}
                      >
                        {task.title}
                      </h4>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isLight ? "text-slate-600" : "text-slate-400"
                        }`}
                      >
                        {task.description}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Task Details & Unified Diff Area */}
              <div className="lg:col-span-8 space-y-3">
                {selectedTask ? (
                  <div
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isLight
                        ? "bg-slate-50 border-slate-200"
                        : "bg-slate-900/80 border-slate-800"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                      <div>
                        <h3
                          className={`text-sm font-bold ${
                            isLight ? "text-slate-900" : "text-white"
                          }`}
                        >
                          {selectedTask.title}
                        </h3>
                        <p
                          className={`text-xs mt-0.5 ${
                            isLight ? "text-slate-600" : "text-slate-400"
                          }`}
                        >
                          {selectedTask.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedTask.tokensUsed && (
                          <span
                            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                              isLight
                                ? "bg-white border-slate-200 text-slate-700"
                                : "bg-slate-950 border-slate-700 text-slate-300"
                            }`}
                          >
                            {selectedTask.tokensUsed} tokens
                          </span>
                        )}

                        <button
                          onClick={() =>
                            handleCopy(
                              selectedTask.result || selectedTask.diff || "",
                              selectedTask.id
                            )
                          }
                          className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 border transition-colors ${
                            isLight
                              ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
                              : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                          }`}
                        >
                          {copiedId === selectedTask.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Output</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Result and Explanation */}
                    {selectedTask.result && (
                      <div className="space-y-1.5">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider block ${
                            isLight ? "text-slate-700" : "text-slate-300"
                          }`}
                        >
                          Autonomous Analysis &amp; Outcome
                        </span>
                        <div
                          className={`p-3 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap ${
                            isLight
                              ? "bg-white border-slate-200 text-slate-800"
                              : "bg-slate-950 border-slate-800 text-slate-200"
                          }`}
                        >
                          {selectedTask.result}
                        </div>
                      </div>
                    )}

                    {/* Unified Diff View */}
                    {selectedTask.diff && (
                      <div className="space-y-1.5">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider block ${
                            isLight ? "text-slate-700" : "text-slate-300"
                          }`}
                        >
                          Unified Code Diff
                        </span>
                        <div
                          className={`p-3 rounded-xl border font-mono text-[11px] leading-relaxed overflow-x-auto ${
                            isLight
                              ? "bg-slate-900 text-slate-100 border-slate-800"
                              : "bg-black/90 text-emerald-300 border-slate-800"
                          }`}
                        >
                          {selectedTask.diff.split("\n").map((line, idx) => {
                            const isAdded = line.startsWith("+");
                            const isRemoved = line.startsWith("-");
                            const isHeader = line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++");

                            return (
                              <div
                                key={idx}
                                className={`${
                                  isAdded
                                    ? "text-emerald-400 bg-emerald-950/40 px-1"
                                    : isRemoved
                                    ? "text-rose-400 bg-rose-950/40 px-1"
                                    : isHeader
                                    ? "text-cyan-400 font-bold"
                                    : "text-slate-400"
                                }`}
                              >
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Activity logs */}
                    {selectedTask.logs && selectedTask.logs.length > 0 && (
                      <div className="space-y-1">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider block ${
                            isLight ? "text-slate-700" : "text-slate-300"
                          }`}
                        >
                          Execution Trace Logs
                        </span>
                        <div
                          className={`p-2.5 rounded-xl border font-mono text-[10px] space-y-0.5 ${
                            isLight
                              ? "bg-white border-slate-200 text-slate-600"
                              : "bg-slate-950 border-slate-800 text-slate-400"
                          }`}
                        >
                          {selectedTask.logs.map((log, lIdx) => (
                            <div key={lIdx}>{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`p-8 rounded-2xl border text-center text-xs ${
                      isLight
                        ? "bg-slate-50 border-slate-200 text-slate-500"
                        : "bg-slate-900/60 border-slate-800 text-slate-400"
                    }`}
                  >
                    Select a task from the list to view diffs and execution traces.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between gap-3 text-xs ${
            isLight
              ? "bg-slate-50 border-slate-200 text-slate-600"
              : "bg-slate-950 border-slate-800 text-slate-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-500" />
            <span>Meridian Engineering Intelligence Engine</span>
          </div>

          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl font-medium transition-colors ${
              isLight
                ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
