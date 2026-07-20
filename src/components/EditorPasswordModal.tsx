import React, { useState, useEffect, useRef } from "react";
import { X, Lock, Eye, EyeOff, AlertCircle, Sparkles, Loader2, Fingerprint, ExternalLink, Key, Shield, Laptop } from "lucide-react";

function stringToUint8Array(str: string): Uint8Array {
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    return new TextEncoder().encode(str);
  }
}

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
  const [activeTab, setActiveTab] = useState<"passkey" | "password">("passkey");
  
  // Passkey workflow state
  const [passkeyStatus, setPasskeyStatus] = useState<"checking" | "register_needed" | "iframe_restricted" | "polling" | "success" | "error">("checking");
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [portalType, setPortalType] = useState<"register" | "auth">("register");
  const [registeredCount, setRegisteredCount] = useState(0);

  // Password fallback state
  const [password, setPassword] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setActiveTab("passkey");
      setRegisterPassword("");
      checkPasskeys();
    } else {
      stopPolling();
      setPortalToken(null);
      setRegisterPassword("");
    }
    return () => stopPolling();
  }, [isOpen]);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
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
            setPasskeyStatus("success");
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
      const res = await fetch("/api/passkeys/list");
      if (res.ok) {
        const data = await res.json();
        const count = data.passkeys?.length || 0;
        setRegisteredCount(count);

        if (count === 0) {
          // No passkeys registered yet, we need the user to register first
          setPasskeyStatus("register_needed");
        } else {
          // We have passkeys registered! Let's attempt native WebAuthn authentication in iframe first.
          // Since we are in an iframe, this might fail with a SecurityError, in which case we show the auth portal fallback.
          try {
            await attemptNativeAuth(data.passkeys);
          } catch (err: any) {
            console.warn("Iframe native WebAuthn blocked or failed, offering secure portal fallback.", err);
            setPasskeyStatus("iframe_restricted");
            setPortalType("auth");
          }
        }
      } else {
        setPasskeyStatus("register_needed");
      }
    } catch (err) {
      console.error("Error checking passkey list:", err);
      setPasskeyStatus("register_needed");
    }
  };

  const attemptNativeAuth = async (passkeysList?: any[]) => {
    if (!navigator.credentials || !navigator.credentials.get) {
      throw new Error("WebAuthn not supported");
    }

    const challenge = new Uint8Array(16);
    window.crypto.getRandomValues(challenge);

    let list = passkeysList;
    if (!list) {
      try {
        const res = await fetch("/api/passkeys/list");
        if (res.ok) {
          const data = await res.json();
          list = data.passkeys || [];
        }
      } catch (e) {
        console.error("Error fetching passkeys for native auth:", e);
      }
    }

    const allowed = (list || [])
      .filter((p: any) => !p.id.startsWith("simulated-"))
      .map((p: any) => ({
        type: "public-key" as const,
        id: stringToUint8Array(p.id)
      }));

    // This will trigger the browser's credential manager.
    // If we're inside a sandboxed iframe without proper permissions, it will throw an error immediately.
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        rpId: window.location.hostname,
        userVerification: "preferred",
        timeout: 10000,
        allowCredentials: allowed.length > 0 ? allowed : undefined
      }
    });

    if (assertion) {
      // For this demo context, if the browser successfully collects the credential, we authorize Editor Mode
      setPasskeyStatus("success");
      setTimeout(() => {
        onConfirm("meridian");
      }, 1000);
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
          setPassword("");
          setErrorMsg(null);
          onConfirm(matchedPassword);
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
        className="fixed inset-0 bg-neutral-950/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-neutral-800 rounded-[32px] w-full max-w-md shadow-2xl relative z-10 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/20">
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
        <div className="flex border-b border-neutral-100 dark:border-neutral-800/50 px-6 pt-2 bg-neutral-50/20 dark:bg-neutral-950/10">
          <button
            onClick={() => {
              setActiveTab("passkey");
              checkPasskeys();
            }}
            className={`pb-3 pt-2 text-xs font-bold transition-all border-b-2 px-4 cursor-pointer flex items-center gap-2 ${
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
            className={`pb-3 pt-2 text-xs font-bold transition-all border-b-2 px-4 cursor-pointer flex items-center gap-2 ${
              activeTab === "password"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Password Fallback</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {activeTab === "passkey" ? (
            <div className="space-y-5">
              {passkeyStatus === "checking" && (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                  <p className="text-xs text-neutral-400 font-mono">Initializing handshake parameters...</p>
                </div>
              )}

              {passkeyStatus === "register_needed" && (
                <div className="space-y-4 py-2 animate-fade-in">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 mx-auto mb-2">
                      <Laptop className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Register Device Passkey</h4>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed max-w-xs mx-auto">
                      To prevent unauthorized registrations, please enter the Editor Password to authorize before creating a registration link.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
                      Editor Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter editor password"
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-800 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-sans"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!registerPassword.trim()) {
                        setErrorMsg("Please enter the editor password to authorize registration.");
                        return;
                      }
                      generatePortal("register", registerPassword.trim());
                    }}
                    className="w-full py-3 bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-bold rounded-xl text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Key className="w-4 h-4" />
                    <span>Authorize & Create Portal</span>
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
                    <button
                      onClick={() => setPasskeyStatus("register_needed")}
                      className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-bold mt-2 cursor-pointer"
                    >
                      Register another device
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};
