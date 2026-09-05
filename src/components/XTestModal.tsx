import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X as CloseIcon,
  Send,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Terminal,
  ShieldCheck,
  Key,
  HelpCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Cpu,
} from "lucide-react";
import { calculateNormalizedCursor, computeRayTracedLightState, getDefaultLightState } from "../lib/rayTracingUtils";

export interface XTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tweetUrl: string) => void;
}

export interface XStatusResponse {
  success: boolean;
  configured: boolean;
  connected: boolean;
  username?: string;
  name?: string;
  id?: string;
  missingKeys: string[];
  error?: string;
  httpStatus?: number;
  authMethod?: string;
  accessLevel?: string;
  hasWritePermission?: boolean;
  writePermissionWarning?: string;
  rawResponse?: any;
  keyPreviews?: {
    apiKey?: string;
    accessToken?: string;
    hasSecret?: boolean;
    hasTokenSecret?: boolean;
    hasBearer?: boolean;
  };
}

export interface XTestResult {
  success: boolean;
  mode: "live" | "unconfigured_simulation" | "error";
  tweetId?: string;
  tweetUrl?: string;
  text?: string;
  intentUrl?: string;
  message?: string;
  error?: string;
  timestamp: number;
  httpStatus?: number;
  username?: string;
  errorCode?: string;
  diagnosisTitle?: string;
  diagnosisDetail?: string;
  troubleshootingSteps?: string[];
  rawResponse?: any;
}

export const XTestModal: React.FC<XTestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [status, setStatus] = useState<XStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [testResult, setTestResult] = useState<XTestResult | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [customText, setCustomText] = useState("");
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showEnvInspector, setShowEnvInspector] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const [lightState, setLightState] = useState(getDefaultLightState());

  // Raytraced optics
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current) return;
      const rect = modalRef.current.getBoundingClientRect();
      const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
      const computed = computeRayTracedLightState(normX, normY, 6, 20);
      setLightState(computed);
    };

    if (isOpen) {
      window.addEventListener("mousemove", handleMouseMove);
    }
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isOpen]);

  // Fetch connection status when modal opens
  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/x/status");
      const data: XStatusResponse = await res.json();
      setStatus(data);

      const username = data.username || "lk3mpe";
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const stamp = Date.now().toString().slice(-4);

      if (!customText) {
        setCustomText(
          `Meridian Journal [Pipeline Verification • ${timeStr} ART #${stamp}] — OAuth 1.0a User Context live test for @${username}. Autonomous frontier physics & quantum optics: https://ask-meridian.uk #QuantumOptics #arXiv`
        );
      }
    } catch (err: any) {
      console.error("Failed to fetch X status:", err);
      setStatus({
        success: false,
        configured: false,
        connected: false,
        missingKeys: [],
        error: err.message || "Failed to reach /api/x/status",
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setTestResult(null);
    }
  }, [isOpen]);

  // Execute the live X test tweet
  const handleRunTest = async () => {
    setIsPosting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/x/test-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customMessage: customText }),
      });
      const data: XTestResult = await res.json();
      setTestResult(data);

      if (data.success && data.tweetUrl && onSuccess) {
        onSuccess(data.tweetUrl);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        mode: "error",
        error: err.message || "Client network error contacting test endpoint",
        timestamp: Date.now(),
        diagnosisTitle: "Network Error",
        diagnosisDetail: err.message,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleResetDefaultText = () => {
    const username = status?.username || "lk3mpe";
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const stamp = Date.now().toString().slice(-4);
    setCustomText(
      `Meridian Journal [Pipeline Verification • ${timeStr} ART #${stamp}] — OAuth 1.0a User Context live test for @${username}. Autonomous frontier physics & quantum optics: https://ask-meridian.uk #QuantumOptics #arXiv`
    );
  };

  const handleCopyRaw = async () => {
    if (!testResult && !status) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify({ status, testResult }, null, 2));
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    } catch {}
  };

  if (!isOpen) return null;

  const charCount = customText.length;
  const isOverLimit = charCount > 280;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-950 text-slate-100 rounded-3xl border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 p-5 sm:p-7 z-10 space-y-5 my-8 overflow-hidden font-sans"
          style={{
            transform: `perspective(1200px) rotateX(${lightState.pitch}deg) rotateY(${lightState.yaw}deg)`,
          }}
        >
          {/* Specular Ambient Glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              background: `radial-gradient(circle 350px at ${lightState.lightX}% ${lightState.lightY}%, rgba(6, 182, 212, 0.4), transparent 70%)`,
            }}
          />

          {/* Top Shimmer Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 relative z-10 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black border border-slate-700 flex items-center justify-center shadow-md shrink-0">
                <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold font-serif italic text-white flex items-center gap-2">
                    X Context Test & Inspection
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Live Diagnostics
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Autonomous OAuth 1.0a User Context pipeline inspection & test posting
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Account Status Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-sm shrink-0">
                {status?.username ? `@${status.username.slice(0, 2).toUpperCase()}` : "X"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {status?.name || (status?.connected ? "Verified Account" : "Account Verification")}
                  </span>
                  {status?.username && (
                    <a
                      href={`https://x.com/${status.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-0.5"
                    >
                      @{status.username}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        status?.connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                      }`}
                    />
                    <strong className={status?.connected ? "text-emerald-300" : "text-amber-300"}>
                      {status?.connected ? "Connected & Authenticated" : "Verification in Progress"}
                    </strong>
                  </span>
                  {status?.accessLevel && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        status.accessLevel.includes("write")
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      Scope: {status.accessLevel}
                    </span>
                  )}
                  {status?.id && (
                    <span className="hidden sm:inline text-slate-500 font-mono">
                      (ID: {status.id})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchStatus}
                disabled={loadingStatus}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin text-cyan-400" : ""}`} />
                <span>Verify Status</span>
              </button>
            </div>
          </div>

          {/* Read-Only Permission Warning Banner (if access level is read or write permission is false) */}
          {status?.hasWritePermission === false && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2 relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Read-Only OAuth1 Permissions Detected</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 font-mono text-[10px] text-amber-300 font-bold">
                  x-access-level: read
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Your X Developer App is currently in <strong>Read-only</strong> mode. Twitter/X will reject tweet creation with HTTP 403 until the App permissions are set to &quot;Read and Write&quot; and your Access Token is regenerated.
              </p>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1.5 text-[11px] text-slate-300">
                <div className="font-semibold text-amber-300 text-[10px] uppercase tracking-wider">
                  How to Fix in 60 Seconds:
                </div>
                <ol className="space-y-1 pl-1 text-[11px] text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-mono font-bold shrink-0">1.</span>
                    <span>Open <a href="https://developer.x.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold">X Developer Portal</a> &rarr; Projects &amp; Apps &rarr; Your App.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-mono font-bold shrink-0">2.</span>
                    <span>Under &quot;User authentication settings&quot;, click <strong>Edit</strong> &rarr; Select <strong>Read and Write</strong> (and Bot/Automated App) &rarr; Save.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-mono font-bold shrink-0">3.</span>
                    <span><strong className="text-amber-300">CRITICAL:</strong> Go to the <strong>Keys and tokens</strong> tab and click <strong>Regenerate</strong> on <em>Access Token and Secret</em> (old tokens stay Read-only).</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-mono font-bold shrink-0">4.</span>
                    <span>Copy the newly regenerated values into AI Studio Settings under <code className="text-cyan-300 font-mono">X_ACCESS_TOKEN</code> and <code className="text-cyan-300 font-mono">X_ACCESS_TOKEN_SECRET</code>.</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Test Post Dispatch Area */}
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Tweet Payload</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaultText}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                >
                  Reset Text
                </button>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    isOverLimit
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-slate-900 text-slate-400 border border-slate-800"
                  }`}
                >
                  {charCount} / 280
                </span>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={4}
                disabled={isPosting}
                className={`w-full rounded-2xl bg-slate-900/90 text-slate-100 text-xs p-3.5 border outline-none transition-all resize-none leading-relaxed font-sans ${
                  isOverLimit
                    ? "border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                }`}
                placeholder="Enter test tweet content..."
              />
            </div>

            {/* Test Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleRunTest}
                disabled={isPosting || isOverLimit || !customText.trim()}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPosting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Posting to X API v2 (@{status?.username || "lk3mpe"})...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Post Test Tweet to X Account</span>
                  </>
                )}
              </button>

              <a
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(customText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer"
                title="Open directly in browser Twitter window"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Web Intent</span>
              </a>
            </div>
          </div>

          {/* Test Post Result & Diagnosis Section */}
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 space-y-3"
            >
              {testResult.success ? (
                /* Success Banner */
                <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-400" />
                      <strong className="text-sm font-bold text-white">
                        Test Tweet Posted Successfully!
                      </strong>
                    </div>
                    {testResult.httpStatus && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300">
                        HTTP {testResult.httpStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-300/90 leading-relaxed">
                    Live publication confirmed via OAuth 1.0a User Context. Your X account is
                    fully authorized for autonomous daily dispatches!
                  </p>
                  {testResult.tweetUrl && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={testResult.tweetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>View Live Tweet on X</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <span className="text-[11px] font-mono text-emerald-400/80">
                        ID: {testResult.tweetId}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Diagnostic & Remediation Card */
                <div className="p-4 sm:p-5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <div>
                        <strong className="text-sm font-bold text-white block">
                          {testResult.diagnosisTitle || "X API Request Failed"}
                        </strong>
                        <span className="text-[11px] font-mono text-red-300/80">
                          {testResult.errorCode || "API_ERROR"} • HTTP {testResult.httpStatus || 500}
                        </span>
                      </div>
                    </div>

                    <a
                      href={`https://x.com/intent/tweet?text=${encodeURIComponent(customText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold inline-flex items-center gap-1 transition-colors shrink-0"
                    >
                      <span>Share via Intent</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-xs text-red-300 leading-relaxed">
                    {testResult.diagnosisDetail || testResult.error}
                  </p>

                  {/* Step by Step Troubleshooting Guide */}
                  {testResult.troubleshootingSteps && testResult.troubleshootingSteps.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-slate-300 text-xs">
                      <div className="flex items-center justify-between font-bold text-amber-300 text-[11px] uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Recommended Solution Steps
                        </span>
                        <a
                          href="https://developer.x.com/en/portal/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline inline-flex items-center gap-1 normal-case"
                        >
                          Developer Portal
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <ol className="space-y-1.5 text-[11px] leading-relaxed pl-1 text-slate-300">
                        {testResult.troubleshootingSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-cyan-400 font-mono font-bold shrink-0">{idx + 1}.</span>
                            <span>{step.replace(/^\d+\.\s*/, "")}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Collapsible Inspectors: Keys & Protocol Telemetry */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2 relative z-10">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowEnvInspector(!showEnvInspector)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 font-mono cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Environment Credentials Status</span>
                {showEnvInspector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 font-mono cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>Raw Response Logs</span>
                {showRawJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Environment Key Inspector */}
            {showEnvInspector && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">X_API_KEY:</span>
                    <span className="text-emerald-400 font-semibold">
                      {status?.keyPreviews?.apiKey || "Configured"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">X_API_SECRET_KEY:</span>
                    <span className="text-emerald-400 font-semibold">
                      {status?.keyPreviews?.hasSecret ? "Configured (Hidden)" : "Missing"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">X_ACCESS_TOKEN:</span>
                    <span className="text-emerald-400 font-semibold">
                      {status?.keyPreviews?.accessToken || "Configured"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">X_ACCESS_TOKEN_SECRET:</span>
                    <span className="text-emerald-400 font-semibold">
                      {status?.keyPreviews?.hasTokenSecret ? "Configured (Hidden)" : "Missing"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    Protocol: OAuth 1.0a User Context (RFC 5849 / HMAC-SHA1)
                  </span>
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-purple-400" />
                    Target: @{status?.username || "lk3mpe"}
                  </span>
                </div>
              </div>
            )}

            {/* Raw JSON Inspector */}
            {showRawJson && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">Debug Payload &amp; Response</span>
                  <button
                    onClick={handleCopyRaw}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                  >
                    {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRaw ? "Copied" : "Copy JSON"}</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-slate-300 max-h-44 overflow-y-auto p-2 bg-black/60 rounded-lg border border-slate-900 whitespace-pre-wrap break-all">
                  {JSON.stringify({ status, testResult }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
