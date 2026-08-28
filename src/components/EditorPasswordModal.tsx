import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Lock, Eye, EyeOff, AlertCircle, Sparkles, Loader2, Fingerprint, ExternalLink, Key, Shield, Laptop, RefreshCw, Activity, CheckCircle, Clock } from "lucide-react";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState
} from "../lib/rayTracingUtils";
import { getEffectiveRpId, base64UrlToUint8Array, extractClientFingerprint, PasskeyAuditEvent } from "../lib/passkeyManager";

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

interface EditorPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  titleText: string;
}

export const EditorPasswordModal: React.FC<EditorPasswordModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  titleText,
}) => {
  const [activeTab, setActiveTab] = useState<"passkey" | "password" | "audit">("passkey");
  
  // Passkey workflow state
  const [passkeyStatus, setPasskeyStatus] = useState<"checking" | "ready" | "verifying" | "register_needed" | "iframe_restricted" | "polling" | "success" | "error">("checking");
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [portalType, setPortalType] = useState<"register" | "auth">("register");
  const [registeredCount, setRegisteredCount] = useState(0);
  const [restorableSession, setRestorableSession] = useState<{ sessionId: string; deviceName: string } | null>(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<PasskeyAuditEvent[]>([]);
  const [auditSummary, setAuditSummary] = useState<any>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Password fallback state
  const [password, setPassword] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [lightState, setLightState] = useState(getDefaultLightState());
  const [showSuccessExplosion, setShowSuccessExplosion] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
    const computed = computeRayTracedLightState(normX, normY, 5, 20);
    setLightState(computed);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setLightState(getDefaultLightState());
  };

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setActiveTab("passkey");
      setRegisterPassword("");
      setShowSuccessExplosion(false);
      checkPasskeys();
    } else {
      stopPolling();
      setPortalToken(null);
      setRegisterPassword("");
      setShowSuccessExplosion(false);
    }
    return () => stopPolling();
  }, [isOpen]);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const loadAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const [logsRes, sumRes] = await Promise.all([
        fetch("/api/passkeys/audit-logs?limit=50"),
        fetch("/api/passkeys/audit-summary")
      ]);
      if (logsRes.ok) {
        const data = await logsRes.json();
        setAuditLogs(data.logs || []);
      }
      if (sumRes.ok) {
        const sData = await sumRes.json();
        setAuditSummary(sData);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleRestoreSession = async (sessionId: string) => {
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/passkeys/session-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.password) {
          try {
            sessionStorage.setItem("meridian_editor_pwd", data.password);
            sessionStorage.setItem("meridian_passkey_session_id", sessionId);
          } catch {}
          setPasskeyStatus("success");
          setShowSuccessExplosion(true);
          setTimeout(() => {
            onConfirm(data.password);
          }, 600);
          return;
        }
      }
      // Session has expired, but passkeys are STILL enrolled!
      setRestorableSession(null);
      try {
        sessionStorage.removeItem("meridian_passkey_session_id");
        localStorage.removeItem("meridian_passkey_session_id");
      } catch {}

      // Re-evaluate passkey status so user can immediately 1-click authenticate
      const isInIframe = typeof window !== "undefined" && window.self !== window.top;
      if (registeredCount > 0) {
        if (isInIframe) {
          setPasskeyStatus("iframe_restricted");
          setPortalType("auth");
        } else {
          setPasskeyStatus("ready");
        }
        setErrorMsg("Your temporary session expired. Tap below to authenticate with your biometric passkey.");
      } else {
        // Fallback: check passkeys again
        await checkPasskeys();
        setErrorMsg("Session expired. Please authenticate with your passkey.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to restore session.");
    } finally {
      setIsVerifying(false);
    }
  };

  const startPolling = (token: string) => {
    stopPolling();
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/passkeys/poll-auth?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          if (data.authorized && data.password) {
            stopPolling();
            try {
              sessionStorage.setItem("meridian_editor_pwd", data.password);
              if (data.session?.sessionId) {
                sessionStorage.setItem("meridian_passkey_session_id", data.session.sessionId);
                localStorage.setItem("meridian_passkey_session_id", data.session.sessionId);
              }
            } catch {}
            setPasskeyStatus("success");
            setShowSuccessExplosion(true);
            setTimeout(() => {
              onConfirm(data.password);
            }, 1000);
          }
        }
      } catch (err) {
        console.error("Error polling auth status:", err);
      }
    }, 2000);
  };

  const checkPasskeys = async () => {
    setPasskeyStatus("checking");
    setErrorMsg(null);
    try {
      // 1. Read local storage enrolled passkeys
      let localPasskeys: any[] = [];
      try {
        const rawLocal = localStorage.getItem("meridian_enrolled_passkeys");
        if (rawLocal) {
          localPasskeys = JSON.parse(rawLocal);
        }
        const legacyId = localStorage.getItem("meridian_editor_passkey_id");
        if (legacyId && (!Array.isArray(localPasskeys) || localPasskeys.length === 0)) {
          const legacyName = localStorage.getItem("meridian_editor_passkey_name") || "Registered Biometric Device";
          localPasskeys = [{ id: legacyId, deviceName: legacyName, createdAt: Date.now() }];
        }
      } catch {}

      // 2. Check for restorable active session
      const storedSessId = sessionStorage.getItem("meridian_passkey_session_id") || localStorage.getItem("meridian_passkey_session_id");
      if (storedSessId) {
        try {
          const sRes = await fetch("/api/passkeys/session-restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: storedSessId })
          });
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.valid && sData.session) {
              setRestorableSession({
                sessionId: storedSessId,
                deviceName: sData.session.deviceName || "Registered Biometric Device"
              });
            } else {
              setRestorableSession(null);
              sessionStorage.removeItem("meridian_passkey_session_id");
              localStorage.removeItem("meridian_passkey_session_id");
            }
          } else {
            setRestorableSession(null);
          }
        } catch (_) {}
      }

      // 3. Fetch server passkeys list
      let serverPasskeys: any[] = [];
      try {
        const res = await fetch("/api/passkeys/list");
        if (res.ok) {
          const data = await res.json();
          serverPasskeys = data.passkeys || [];
        }
      } catch (err) {
        console.warn("Could not fetch server passkeys directly:", err);
      }

      // 4. Two-way reconciliation: if local has passkeys not on server, sync them
      let effectivePasskeys = serverPasskeys;
      if (localPasskeys.length > 0) {
        const serverHasAll = localPasskeys.every(lp => serverPasskeys.some(sp => sp.id === lp.id));
        if (!serverHasAll || serverPasskeys.length === 0) {
          try {
            const syncRes = await fetch("/api/passkeys/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ passkeys: localPasskeys })
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.passkeys) {
                effectivePasskeys = syncData.passkeys;
              }
            }
          } catch (syncErr) {
            console.warn("Sync failed, falling back to merged client set:", syncErr);
            effectivePasskeys = [...localPasskeys, ...serverPasskeys.filter(sp => !localPasskeys.some(lp => lp.id === sp.id))];
          }
        }
      }

      // 5. Update local storage with full synced set
      if (effectivePasskeys.length > 0) {
        try {
          localStorage.setItem("meridian_enrolled_passkeys", JSON.stringify(effectivePasskeys));
        } catch {}
      }

      const count = effectivePasskeys.length;
      setRegisteredCount(count);

      if (count === 0) {
        // No passkeys registered anywhere
        setPasskeyStatus("register_needed");
      } else {
        // Passkeys ARE enrolled!
        const isInIframe = typeof window !== "undefined" && window.self !== window.top;
        if (isInIframe) {
          // Preview iframe requires portal link
          setPasskeyStatus("iframe_restricted");
          setPortalType("auth");
        } else {
          // Top-level window: ready for 1-click Touch ID / Face ID
          setPasskeyStatus("ready");
        }
      }
    } catch (err) {
      console.error("Error checking passkey list:", err);
      // Even if network failed, check local storage fallback
      try {
        const rawLocal = localStorage.getItem("meridian_enrolled_passkeys");
        if (rawLocal) {
          const list = JSON.parse(rawLocal);
          if (Array.isArray(list) && list.length > 0) {
            setRegisteredCount(list.length);
            const isInIframe = typeof window !== "undefined" && window.self !== window.top;
            setPasskeyStatus(isInIframe ? "iframe_restricted" : "ready");
            setPortalType("auth");
            return;
          }
        }
      } catch {}
      setPasskeyStatus("register_needed");
    }
  };

  const handleNativeAuthClick = async () => {
    setPasskeyStatus("verifying");
    setErrorMsg(null);

    try {
      if (!navigator.credentials || !navigator.credentials.get) {
        throw new Error("WebAuthn is not supported on this browser.");
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      let list: any[] = [];
      try {
        const res = await fetch("/api/passkeys/list");
        if (res.ok) {
          const data = await res.json();
          list = data.passkeys || [];
        }
      } catch (e) {
        console.error("Error fetching passkeys for native auth:", e);
      }

      const allowed = (list || [])
        .filter((p: any) => !p.id.startsWith("simulated-"))
        .map((p: any) => ({
          type: "public-key" as const,
          id: base64UrlToUint8Array(p.id)
        }));

      const effectiveRpId = typeof window !== "undefined" ? getEffectiveRpId(window.location.hostname) : undefined;
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          rpId: effectiveRpId,
          userVerification: "preferred",
          timeout: 60000,
          allowCredentials: allowed.length > 0 ? allowed : undefined
        }
      });

      if (assertion) {
        const clientFp = extractClientFingerprint();
        // Authenticate assertion against server to verify credential and get the authorized session password
        const authRes = await fetch("/api/passkeys/authenticate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credentialId: assertion.id,
            fingerprint: clientFp
          })
        });

        if (!authRes.ok) {
          const errData = await authRes.json().catch(() => ({}));
          throw new Error(errData.error || "Biometric authentication failed on server.");
        }

        const authData = await authRes.json();
        if (authData.authorized && authData.password) {
          try {
            sessionStorage.setItem("meridian_editor_pwd", authData.password);
            if (authData.session?.sessionId) {
              sessionStorage.setItem("meridian_passkey_session_id", authData.session.sessionId);
              localStorage.setItem("meridian_passkey_session_id", authData.session.sessionId);
            }
          } catch {}
          setPasskeyStatus("success");
          setShowSuccessExplosion(true);
          setTimeout(() => {
            onConfirm(authData.password);
          }, 800);
        } else {
          throw new Error("Device authorization was rejected by the server.");
        }
      } else {
        throw new Error("No biometric assertion received.");
      }
    } catch (err: any) {
      console.warn("Passkey authentication issue:", err);
      const isInIframe = typeof window !== "undefined" && window.self !== window.top;
      
      if (isInIframe && (err.name === "SecurityError" || err.name === "NotAllowedError")) {
        setPasskeyStatus("iframe_restricted");
        setPortalType("auth");
      } else if (err.name === "NotAllowedError") {
        setErrorMsg("Biometric prompt was canceled or timed out.");
        setPasskeyStatus("ready");
      } else {
        setErrorMsg(err.message || "Passkey authentication failed.");
        setPasskeyStatus("ready");
      }
    }
  };

  const generatePortal = async (type: "register" | "auth", password?: string) => {
    setPasskeyStatus("checking");
    try {
      const res = await fetch("/api/passkeys/generate-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, password })
      });

      if (res.ok) {
        const data = await res.json();
        setPortalToken(data.token);
        setPortalType(type);
        setPasskeyStatus("polling");
        startPolling(data.token);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || "Failed to initialize secure portal.");
        setPasskeyStatus(type === "register" ? "register_needed" : "iframe_restricted");
      }
    } catch (err: any) {
      setErrorMsg(`Portal creation failed: ${err.message || err}`);
      setPasskeyStatus(type === "register" ? "register_needed" : "iframe_restricted");
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg("Please enter the editor password.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/verify-editor-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const matchedPassword = password.trim();
          try {
            sessionStorage.setItem("meridian_editor_pwd", matchedPassword);
          } catch {}
          setPassword("");
          setErrorMsg(null);
          setShowSuccessExplosion(true);
          setTimeout(() => {
            onConfirm(matchedPassword);
          }, 600);
        } else {
          setErrorMsg("Incorrect editor password. Access denied.");
        }
      } else {
        setErrorMsg("Incorrect editor password. Access denied.");
      }
    } catch (err: any) {
      setErrorMsg(`Connection error: ${err.message || err}`);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      <AnimatePresence>
        {showSuccessExplosion && <StarExplosionBurst />}
      </AnimatePresence>

      {/* Modal Card with Interactive Ray-Tracing & 3D Tilt */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative group p-[2px] rounded-[34px] overflow-hidden transition-transform duration-200 ease-out w-full max-w-md z-10"
        style={{
          transform: isHovered
            ? `perspective(1000px) rotateX(${lightState.tiltX}deg) rotateY(${lightState.tiltY}deg) translateZ(8px)`
            : "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)",
          boxShadow: isHovered
            ? `${lightState.shadowX}px ${lightState.shadowY}px 45px -5px rgba(6, 182, 212, 0.5), 0 0 50px 10px rgba(168, 85, 247, 0.3)`
            : `${lightState.shadowX * 0.5}px ${lightState.shadowY * 0.5}px 30px -5px rgba(6, 182, 212, 0.25)`
        }}
      >
        {/* Dynamic Ray Traced Conic Neon Light Ring */}
        <div
          className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-80 blur-xl group-hover:opacity-100 transition-opacity"
          style={{
            background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
          }}
        />

        {/* Dynamic Neon Refraction Border */}
        <div
          className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-95"
          style={{
            background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #06b6d4)`
          }}
        />

        {/* Inner Card Panel */}
        <div className="relative bg-white dark:bg-neutral-950/95 border border-neutral-200/80 dark:border-neutral-800/90 rounded-[32px] w-full shadow-2xl relative overflow-hidden flex flex-col">
          {/* Specular Highlight Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-75 z-10"
            style={{
              background: `radial-gradient(circle 320px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.3), rgba(6, 182, 212, 0.12) 45%, transparent 75%)`
            }}
          />

          {/* Optical Ray Angle Sheen Sweep */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-20 group-hover:opacity-40 z-10"
            style={{
              background: `linear-gradient(${lightState.angle}deg, transparent 40%, rgba(255, 255, 255, 0.35) 50%, transparent 60%)`
            }}
          />

          {/* Top Shimmer Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

          {/* Header */}
          <div className="relative z-20 p-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-sans tracking-tight">{titleText}</h3>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium font-mono uppercase tracking-widest">WebAuthn Secure Access</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 rounded-full transition-colors cursor-pointer"
            disabled={isVerifying}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="relative z-20 flex border-b border-neutral-100 dark:border-neutral-800/50 px-6 pt-2 bg-neutral-50/20 dark:bg-neutral-950/10">
          <button
            onClick={() => {
              setActiveTab("passkey");
              checkPasskeys();
            }}
            className={`pb-3 pt-2 text-xs font-bold transition-all border-b-2 px-3.5 cursor-pointer flex items-center gap-2 ${
              activeTab === "passkey"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            <span>Biometric Passkey</span>
          </button>
          <button
            onClick={() => {
              stopPolling();
              setActiveTab("password");
            }}
            className={`pb-3 pt-2 text-xs font-bold transition-all border-b-2 px-3.5 cursor-pointer flex items-center gap-2 ${
              activeTab === "password"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Password</span>
          </button>
          <button
            onClick={() => {
              stopPolling();
              setActiveTab("audit");
              loadAuditLogs();
            }}
            className={`pb-3 pt-2 text-xs font-bold transition-all border-b-2 px-3.5 cursor-pointer flex items-center gap-2 ${
              activeTab === "audit"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Journal</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-20 p-6">
          {activeTab === "passkey" ? (
            <div className="space-y-5">
              {/* Active Session Restoration Banner */}
              {restorableSession && (
                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/50 rounded-2xl flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-cyan-900 dark:text-cyan-200 truncate">
                        Active Biometric Session Found
                      </p>
                      <p className="text-[9px] text-cyan-600 dark:text-cyan-400 font-mono truncate">
                        Bound to: {restorableSession.deviceName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreSession(restorableSession.sessionId)}
                    disabled={isVerifying}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-bold shrink-0 shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${isVerifying ? "animate-spin" : ""}`} />
                    <span>Restore</span>
                  </button>
                </div>
              )}

              {passkeyStatus === "checking" && (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                  <p className="text-xs text-neutral-400 font-mono">Initializing handshake parameters...</p>
                </div>
              )}

              {passkeyStatus === "ready" && (
                <div className="space-y-5 py-2 text-center animate-fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 mx-auto shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <Fingerprint className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-sans">
                      Unlock with Biometrics
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                      {registeredCount} biometric device{registeredCount > 1 ? "s" : ""} registered. Touch ID, Face ID, or Windows Hello will verify your identity.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={handleNativeAuthClick}
                      className="w-full py-3.5 bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold rounded-xl text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span>Unlock with Touch ID / Face ID</span>
                    </button>

                    <button
                      onClick={() => setPasskeyStatus("register_needed")}
                      className="w-full py-2 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>Register a New Device</span>
                    </button>
                  </div>
                </div>
              )}

              {passkeyStatus === "verifying" && (
                <div className="space-y-4 py-6 text-center animate-fade-in">
                  <div className="relative w-14 h-14 mx-auto mb-2">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-cyan-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-cyan-500">
                      <Fingerprint className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Awaiting Biometric Prompt...
                    </h4>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed max-w-xs mx-auto">
                      Please complete the Touch ID, Face ID, or Security Key verification on your device.
                    </p>
                  </div>
                </div>
              )}

              {passkeyStatus === "register_needed" && (
                <div className="space-y-4 py-2 text-center animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 mx-auto mb-2">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 font-sans">
                    {registeredCount > 0 ? `${registeredCount} Passkey(s) Enrolled` : "No Biometric Passkey Enrolled"}
                  </h4>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed max-w-xs mx-auto">
                    Register your Touch ID, Face ID, or Security Key to enable instant biometric login.
                  </p>

                  <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 space-y-2 text-left">
                    <label className="block text-[10px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-mono">
                      Editor Password (to Authorize Registration)
                    </label>
                    <input
                      type="password"
                      placeholder="Enter editor password"
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => generatePortal("register", registerPassword)}
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>Register This Device</span>
                    </button>
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800/50"></div>
                    <span className="flex-shrink mx-3 text-[9px] text-neutral-400 uppercase font-bold tracking-widest font-mono">or</span>
                    <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800/50"></div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab("password");
                    }}
                    className="w-full py-2.5 bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold rounded-xl text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Use Password Fallback</span>
                  </button>
                </div>
              )}

              {passkeyStatus === "iframe_restricted" && (
                <div className="space-y-4 text-center py-2 animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
                    <Shield className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Iframe Sandboxing Detected</h4>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed max-w-xs mx-auto">
                      Browser security policies restrict direct biometric prompts within the preview pane. Generate a secure, one-time authorization link to bypass the sandbox.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => generatePortal("auth")}
                      className="w-full py-3 bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold rounded-xl text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span>Generate One-Time Auth Portal</span>
                    </button>
                  </div>
                </div>
              )}

              {passkeyStatus === "polling" && portalToken && (
                <div className="space-y-6 text-center py-2 animate-fade-in">
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/10" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-cyan-400">
                      <Fingerprint className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Portal Open & Polling</h4>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-xs mx-auto leading-relaxed">
                      Please open the link below in a **new tab** to securely verify your biometric credentials on a first-party page, then return here.
                    </p>
                  </div>

                  <a
                    href={`/?portal_token=${portalToken}&portal_type=${portalType}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold rounded-xl text-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      <span>{portalType === "register" ? "Open Registration Portal" : "Open Authentication Portal"}</span>
                    </span>
                    <span className="text-[9px] bg-cyan-500/10 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400">New Tab</span>
                  </a>

                  <p className="text-[10px] text-neutral-400 font-mono tracking-wider animate-pulse uppercase">
                    &bull; Awaiting biometric signature from portal tab...
                  </p>
                </div>
              )}

              {passkeyStatus === "success" && (
                <div className="py-6 text-center space-y-3 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto animate-bounce">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Device Authorized Successfully!</h4>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">Unlocking Editor Mode controls...</p>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-[11px] font-semibold bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/40">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : activeTab === "password" ? (
            /* Traditional Password Form Fallback */
            <form onSubmit={handleSubmitPassword} className="space-y-4 animate-fade-in">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
                  Editor Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    disabled={isVerifying}
                    className="w-full pl-3 pr-10 py-2.5 bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-800 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-1.5 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-sans"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isVerifying}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-[11px] font-semibold bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/40 animate-shake">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isVerifying}
                  className="flex-1 py-2.5 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 py-2.5 bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white/80 dark:text-black/85" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-white/80 dark:text-black/80" />
                      <span>Verify Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Audit Journal & Pipeline Diagnostics Tab */
            <div className="space-y-4 text-left animate-fade-in">
              {/* Diagnostic Top Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                  <div className="text-[9px] font-mono uppercase text-neutral-400">Total Events</div>
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {auditSummary?.totalAuditRecords ?? auditLogs.length}
                  </div>
                </div>
                <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <div className="text-[9px] font-mono uppercase text-emerald-600 dark:text-emerald-400">Auth Passes</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {auditSummary?.successfulAuthentications ?? 0}
                  </div>
                </div>
                <div className="p-2.5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                  <div className="text-[9px] font-mono uppercase text-cyan-600 dark:text-cyan-400">Active Sessions</div>
                  <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                    {auditSummary?.activeSessionsCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Header and Refresh Button */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-bold text-xs">
                  <Activity className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Immutable Pipeline Events</span>
                </div>
                <button
                  onClick={loadAuditLogs}
                  disabled={isLoadingAudit}
                  className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingAudit ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Log Event Stream */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {isLoadingAudit && auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400 font-mono flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                    <span>Loading audit records...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400 font-mono">
                    No passkey audit events recorded yet.
                  </div>
                ) : (
                  auditLogs.map((log) => {
                    const isSuccess = log.status === "success";
                    const isError = log.status === "error" || log.status === "failure";
                    const isWarn = log.status === "warning";
                    return (
                      <div
                        key={log.eventId}
                        className="p-2.5 bg-neutral-50/80 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/70 rounded-xl text-xs space-y-1 transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isSuccess
                                  ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                                  : isError
                                  ? "bg-red-500"
                                  : isWarn
                                  ? "bg-amber-500"
                                  : "bg-cyan-500"
                              }`}
                            />
                            <span className="font-mono text-[10px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
                              {log.eventType}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-neutral-400 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {log.deviceName && (
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                            <Laptop className="w-3 h-3 text-neutral-400 shrink-0" />
                            <span className="truncate">{log.deviceName}</span>
                          </div>
                        )}

                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-950/60 p-1.5 rounded-lg overflow-x-auto truncate">
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};
