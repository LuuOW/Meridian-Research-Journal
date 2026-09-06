import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Terminal,
  Sparkles,
  Send,
  Loader2,
  Check,
  Copy,
  X,
  FileCode,
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Code2,
  ShieldCheck,
  CheckCheck,
  Key
} from "lucide-react";
import type { CodingTask, XaiAgentStatus, GitChangeSummary, CodeSnippetItem } from "../services/XaiCodingAgent";
import { SecretsManagementSheet } from "./SecretsManagementSheet";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  gitSummary?: GitChangeSummary;
  snippets?: CodeSnippetItem[];
  fullDiff?: string;
  taskId?: string;
  status?: "pending_approval" | "accepted" | "declined";
  expandedDiff?: boolean;
}

interface XaiCodingAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
}

// Tokenizer & Syntax Colorizer for code snippets and unified diffs
export const HighlightedCode: React.FC<{
  code: string;
  isDiff?: boolean;
  maxHeight?: string;
}> = ({ code, isDiff = false, maxHeight = "320px" }) => {
  const lines = code.split("\n");

  return (
    <div
      className="font-mono text-[12px] leading-relaxed overflow-x-auto overflow-y-auto select-text rounded-lg bg-slate-950 p-3.5 border border-slate-800/80 shadow-inner"
      style={{ maxHeight }}
    >
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, idx) => {
            const lineNum = idx + 1;
            const isAdd = isDiff && (line.startsWith("+") && !line.startsWith("+++"));
            const isDel = isDiff && (line.startsWith("-") && !line.startsWith("---"));
            const isMeta = isDiff && (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++"));

            return (
              <tr
                key={idx}
                className={`group transition-colors ${
                  isAdd
                    ? "bg-emerald-950/40 text-emerald-300"
                    : isDel
                    ? "bg-rose-950/40 text-rose-300 line-through opacity-80"
                    : isMeta
                    ? "bg-indigo-950/30 text-indigo-300 font-semibold"
                    : "text-slate-300 hover:bg-slate-900/60"
                }`}
              >
                <td className="w-10 pr-3 text-right select-none text-[10px] text-slate-600 font-mono align-top py-0.5 border-r border-slate-800/60 group-hover:text-slate-400">
                  {lineNum}
                </td>
                <td className="pl-3.5 whitespace-pre font-mono align-top py-0.5">
                  {renderFormattedLine(line, isAdd, isDel, isMeta)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Formats a single line with syntax colors for keywords, strings, comments, types
function renderFormattedLine(
  line: string,
  isAdd: boolean,
  isDel: boolean,
  isMeta: boolean
): React.ReactNode {
  if (isMeta) {
    return <span className="text-cyan-400 font-bold">{line}</span>;
  }
  if (isAdd) {
    return <span className="text-emerald-300 font-medium">{line}</span>;
  }
  if (isDel) {
    return <span className="text-rose-400">{line}</span>;
  }

  // Simple syntax color highlights for TS/JS
  if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
    return <span className="text-zinc-500 italic">{line}</span>;
  }

  const keywordRegex = /\b(import|export|from|const|let|var|function|return|if|else|switch|case|break|try|catch|throw|finally|class|interface|type|extends|implements|async|await|new|public|private|protected|readonly|typeof|instanceof|default)\b/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = keywordRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="text-purple-400 font-bold">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return <>{parts}</>;
}

export const XaiCodingAgentModal: React.FC<XaiCodingAgentModalProps> = ({
  isOpen,
  onClose,
  theme = "dark",
}) => {
  const isLight = theme === "light";
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "msg-welcome",
      role: "assistant",
      content:
        "Hello! I am your xAI Grok Autonomous Coding Agent. What would you like to modify, refactor, or build in the codebase?",
      timestamp: Date.now(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [targetFile, setTargetFile] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<XaiAgentStatus | null>(null);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [isSecretsSheetOpen, setIsSecretsSheetOpen] = useState(false);
  const [secretsStats, setSecretsStats] = useState<{ configured: number; total: number } | null>(null);

  // Dedicated Review Window Modal state
  const [reviewModalData, setReviewModalData] = useState<{
    isOpen: boolean;
    taskId: string;
    gitSummary: GitChangeSummary;
    snippets: CodeSnippetItem[];
    fullDiff: string;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadSecretsStats = () => {
    fetch("/api/xai/secrets")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && typeof data.configuredCount === "number") {
          setSecretsStats({
            configured: data.configuredCount,
            total: data.totalCount,
          });
        }
      })
      .catch(() => {});
  };

  // Auto scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing, isOpen]);

  // Fetch status and secrets on open
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/xai/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.status) setStatus(data.status);
      })
      .catch(() => {});

    loadSecretsStats();
  }, [isOpen]);

  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isProcessing) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsProcessing(true);

    try {
      const res = await fetch("/api/xai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          targetFiles: targetFile ? [targetFile] : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent returned status ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `assist-${Date.now()}`,
        role: "assistant",
        content: data.assistantMessage || "I've applied the changes you asked for. Here is what has been modified:",
        timestamp: Date.now(),
        gitSummary: data.gitSummary,
        snippets: data.snippets,
        fullDiff: data.fullDiff,
        taskId: data.taskId,
        status: "pending_approval",
        expandedDiff: false,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Automatically open the Review Window for confirmation
      if (data.gitSummary && data.snippets) {
        setReviewModalData({
          isOpen: true,
          taskId: data.taskId,
          gitSummary: data.gitSummary,
          snippets: data.snippets,
          fullDiff: data.fullDiff,
        });
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "system",
          content: `⚠️ Failed to execute prompt: ${err.message || "Unknown error"}. Please retry.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecision = async (taskId: string, decision: "accepted" | "declined") => {
    try {
      const res = await fetch("/api/xai/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, decision }),
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.taskId === taskId
              ? {
                  ...msg,
                  status: decision,
                }
              : msg
          )
        );

        const confirmationMsg: ChatMessage = {
          id: `sys-${Date.now()}`,
          role: "system",
          content:
            decision === "accepted"
              ? "✅ Changes accepted! The modifications have been staged and merged into your active branch."
              : "❌ Changes declined. The proposed diff was discarded and no files were modified.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, confirmationMsg]);
      }
    } catch (e) {
      console.error("Failed to submit decision:", e);
    } finally {
      setReviewModalData(null);
    }
  };

  const toggleExpandDiff = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, expandedDiff: !m.expandedDiff } : m))
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="xai-coding-agent-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="xai-coding-agent-modal-container"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`relative flex flex-col w-full max-w-4xl h-[88vh] rounded-2xl shadow-2xl border overflow-hidden ${
            isLight
              ? "bg-white text-slate-900 border-slate-200"
              : "bg-slate-950 text-slate-100 border-slate-800"
          }`}
        >
          {/* HEADER BAR */}
          <div
            className={`flex items-center justify-between px-5 py-3.5 border-b select-none ${
              isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-slate-900/90 border-slate-800/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md">
                <Terminal className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight font-mono">
                    xAI Grok Coding Agent
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Autonomous Code Generation, AST Refactoring &amp; Git Patching
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSecretsSheetOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
                  isLight
                    ? "text-slate-700 hover:text-slate-900 border-slate-300 bg-white hover:bg-slate-50"
                    : "text-slate-200 hover:text-white border-slate-700 bg-slate-900 hover:bg-slate-800"
                }`}
                title="Manage Environment Secrets & Credentials"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Secrets</span>
                {secretsStats && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                    {secretsStats.configured}/{secretsStats.total}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMessages([
                    {
                      id: "msg-welcome-reset",
                      role: "assistant",
                      content:
                        "Chat cleared. Ready for your next coding task or repository refactoring prompt.",
                      timestamp: Date.now(),
                    },
                  ]);
                }}
                className={`p-1.5 rounded-lg text-xs font-mono transition-colors border ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
                    : "text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800/70"
                }`}
                title="Clear Chat History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors border ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
                    : "text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800/70"
                }`}
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CHAT CONVERSATION FEED */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* Assistant Avatar */}
                {msg.role !== "user" && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1 bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-mono text-xs shadow">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {/* User Bubble */}
                  {msg.role === "user" && (
                    <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-cyan-600 text-white shadow-md text-sm font-sans leading-relaxed">
                      {msg.content}
                    </div>
                  )}

                  {/* System Notification Bubble */}
                  {msg.role === "system" && (
                    <div className="px-4 py-2 rounded-xl text-xs font-mono bg-slate-800/70 text-slate-300 border border-slate-700/60 shadow-sm">
                      {msg.content}
                    </div>
                  )}

                  {/* Assistant Message with Code, Git Summary & Prompts */}
                  {msg.role === "assistant" && (
                    <div
                      className={`p-4 rounded-2xl rounded-tl-xs border shadow-sm space-y-3.5 w-full ${
                        isLight
                          ? "bg-slate-50/90 text-slate-900 border-slate-200"
                          : "bg-slate-900/80 text-slate-100 border-slate-800/90"
                      }`}
                    >
                      {/* Main Assistant Statement */}
                      <p className="text-sm font-sans leading-relaxed text-slate-200">
                        {msg.content}
                      </p>

                      {/* SECRETS MANAGEMENT ACTION SHORTCUT */}
                      {(msg.content.toLowerCase().includes("secret") ||
                        msg.content.toLowerCase().includes("environment variable") ||
                        msg.content.toLowerCase().includes(".env") ||
                        msg.content.toLowerCase().includes("credential")) && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setIsSecretsSheetOpen(true)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 transition-all cursor-pointer shadow-sm"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-400" />
                            <span>Open Environment Secrets Sheet</span>
                            {secretsStats && (
                              <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 text-[10px]">
                                {secretsStats.configured}/{secretsStats.total}
                              </span>
                            )}
                          </button>
                        </div>
                      )}

                      {/* GIT CHANGES & MODIFIED FILES SUMMARY BAR */}
                      {msg.gitSummary && (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-3 shadow-inner">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="text-cyan-400 font-semibold">
                                {msg.gitSummary.gitBranch}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400">commit</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
                                {msg.gitSummary.commitHash}
                              </span>
                            </div>

                            {/* Lines of Code Changes Summary Badges */}
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                +{msg.gitSummary.linesAdded} lines
                              </span>
                              <span className="px-2 py-0.5 rounded-md font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                -{msg.gitSummary.linesDeleted} lines
                              </span>
                            </div>
                          </div>

                          {/* Files Modified Tags */}
                          <div>
                            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold block mb-1.5">
                              Files Modified:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.gitSummary.filesModified.map((f, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-slate-700 text-slate-200"
                                >
                                  <FileCode className="w-3 h-3 text-cyan-400" />
                                  <span>{f}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Impact description */}
                          <p className="text-xs text-slate-400 italic">
                            {msg.gitSummary.impactSummary}
                          </p>
                        </div>
                      )}

                      {/* CODE SNIPPETS WITH SPECIAL SYNTAX COLORING */}
                      {msg.snippets && msg.snippets.length > 0 && (
                        <div className="space-y-3">
                          {msg.snippets.map((snippet, sIdx) => (
                            <div
                              key={sIdx}
                              className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md"
                            >
                              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-xs font-mono">
                                <div className="flex items-center gap-2 text-slate-300">
                                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                                  <span className="font-semibold text-cyan-300">
                                    {snippet.fileName}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(snippet.code, `${msg.id}-${sIdx}`)
                                  }
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
                                >
                                  {copiedSnippetId === `${msg.id}-${sIdx}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <HighlightedCode code={snippet.code} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* CLICK OR TAP TO SEE ALL THE CHANGES BANNER */}
                      {msg.fullDiff && (
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleExpandDiff(msg.id)}
                            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all border bg-slate-950/60 hover:bg-slate-900 border-cyan-500/30 text-cyan-400 hover:text-cyan-300"
                          >
                            <span className="flex items-center gap-2">
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>(Click or tap to see all the changes)</span>
                            </span>
                            {msg.expandedDiff ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {/* EXPANDED FULL UNIFIED DIFF */}
                          {msg.expandedDiff && (
                            <div className="mt-2 animate-in fade-in duration-200">
                              <HighlightedCode
                                code={msg.fullDiff}
                                isDiff={true}
                                maxHeight="420px"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* CONFIRMATION / DECISION WINDOW PROMPT */}
                      {msg.taskId && (
                        <div
                          className={`mt-3 p-3.5 rounded-xl border transition-all ${
                            msg.status === "accepted"
                              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                              : msg.status === "declined"
                              ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
                              : "bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border-cyan-500/30 text-slate-200"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold font-mono">
                                {msg.status === "accepted"
                                  ? "Changes Accepted & Merged to Workspace"
                                  : msg.status === "declined"
                                  ? "Changes Declined & Reverted"
                                  : "Accept these modifications to your codebase?"}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {msg.status === "pending_approval"
                                  ? "Review the generated diff above before approving to disk."
                                  : `Status: ${msg.status?.toUpperCase()}`}
                              </p>
                            </div>

                            {msg.status === "pending_approval" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDecision(msg.taskId!, "accepted")
                                  }
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Accept Changes</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDecision(msg.taskId!, "declined")
                                  }
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white shadow transition-all cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Decline</span>
                                </button>
                              </div>
                            ) : msg.status === "accepted" ? (
                              <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold">
                                <CheckCheck className="w-4 h-4" />
                                <span>Applied</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-mono text-rose-400 font-bold">
                                <XCircle className="w-4 h-4" />
                                <span>Discarded</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 font-mono mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}

            {/* PROCESSING PULSE */}
            {isProcessing && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-600 text-white font-mono text-xs shadow animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl rounded-tl-xs border text-xs font-mono ${
                    isLight
                      ? "bg-slate-100 text-slate-700 border-slate-200"
                      : "bg-slate-900 text-cyan-300 border-cyan-500/30"
                  }`}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>
                    Grok analyzing repository &amp; generating syntax-highlighted diff...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* SUGGESTION PROMPT PILLS */}
          <div
            className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto select-none no-scrollbar ${
              isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-slate-900/60 border-slate-800/80"
            }`}
          >
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">
              Suggestions:
            </span>
            {[
              "View & configure environment secrets",
              "Audit missing API keys and tokens",
              "Add backoff retry jitter to ArxivPipeline",
              "Audit TypeScript type safety in services",
              "Refactor Navbar with memoized action buttons",
            ].map((sug, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => handleSendPrompt(sug)}
                disabled={isProcessing}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                  isLight
                    ? "bg-white text-slate-700 border-slate-200 hover:border-cyan-500 hover:text-cyan-700"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300"
                }`}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* INPUT & SEND FORM */}
          <div
            className={`p-3 sm:p-4 border-t ${
              isLight
                ? "bg-white border-slate-200"
                : "bg-slate-950 border-slate-800"
            }`}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetFile}
                  onChange={(e) => setTargetFile(e.target.value)}
                  placeholder="Optional target file (e.g. src/services/ArxivPipelineMicroservice.ts)"
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                    isLight
                      ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                      : "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50"
                  } outline-hidden`}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Ask Grok to edit code, fix bugs, refactor, or generate unified diffs..."
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-sans border transition-colors ${
                    isLight
                      ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                      : "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50"
                  } outline-hidden`}
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isProcessing}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* DEDICATED ACCEPTANCE / REVIEW CONFIRMATION WINDOW */}
        {reviewModalData && (
          <div
            id="xai-review-acceptance-dialog"
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${
                isLight
                  ? "bg-white text-slate-900 border-slate-200"
                  : "bg-slate-950 text-white border-cyan-500/40"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold font-mono text-white">
                      Review &amp; Accept Proposed Changes
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      Target branch: {reviewModalData.gitSummary.gitBranch}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModalData(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Review Content */}
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block">Staged Commit:</span>
                    <span className="text-white font-bold">
                      {reviewModalData.gitSummary.commitMessage}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      +{reviewModalData.gitSummary.linesAdded}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                      -{reviewModalData.gitSummary.linesDeleted}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-mono text-slate-400 block mb-1.5">
                    Modified Files:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {reviewModalData.gitSummary.filesModified.map((file, fIdx) => (
                      <span
                        key={fIdx}
                        className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-900 border border-slate-800 text-cyan-300 flex items-center gap-1.5"
                      >
                        <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                        {file}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-mono text-slate-400 block mb-1.5">
                    Unified Diff Preview:
                  </span>
                  <HighlightedCode
                    code={reviewModalData.fullDiff}
                    isDiff={true}
                    maxHeight="240px"
                  />
                </div>
              </div>

              {/* Action Buttons: Accept / Decline */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-800 bg-slate-900/80">
                <button
                  type="button"
                  onClick={() =>
                    handleDecision(reviewModalData.taskId, "declined")
                  }
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Decline &amp; Discard
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDecision(reviewModalData.taskId, "accepted")
                  }
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Changes</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ENVIRONMENT SECRETS MANAGEMENT SHEET */}
        <SecretsManagementSheet
          isOpen={isSecretsSheetOpen}
          onClose={() => {
            setIsSecretsSheetOpen(false);
            loadSecretsStats();
          }}
          theme={theme}
          onAskGrokToIntegrate={(secretKey, files) => {
            setIsSecretsSheetOpen(false);
            const target = files && files.length > 0 ? files[0] : "server.ts";
            setTargetFile(target);
            handleSendPrompt(
              `Integrate environment secret ${secretKey} into ${target} with safe error handling and fallback.`
            );
          }}
        />
      </div>
    </AnimatePresence>
  );
};
