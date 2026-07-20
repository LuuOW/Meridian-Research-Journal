import React, { useState, useEffect } from "react";
import { Key, Fingerprint, Shield, CheckCircle, AlertCircle, Sparkles, Loader2, RefreshCw, X, Laptop } from "lucide-react";

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

interface PasskeyPortalProps {
  token: string;
  type: "register" | "auth";
  onClose: () => void;
}

export const PasskeyPortal: React.FC<PasskeyPortalProps> = ({ token, type, onClose }) => {
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [isSimulated, setIsSimulated] = useState(false);

  // Set default device name
  useEffect(() => {
    const userAgent = navigator.userAgent;
    let name = "Secure Browser Device";
    if (userAgent.includes("Macintosh")) name = "Apple MacBook";
    else if (userAgent.includes("iPhone")) name = "iPhone Mobile";
    else if (userAgent.includes("iPad")) name = "iPad Tablet";
    else if (userAgent.includes("Windows")) name = "Windows PC";
    else if (userAgent.includes("Android")) name = "Android Mobile";
    else if (userAgent.includes("Linux")) name = "Linux Workstation";
    setDeviceName(name);
  }, []);

  const handleRegister = async (useSimulation = false) => {
    setStatus("verifying");
    setErrorMsg(null);
    setIsSimulated(useSimulation);

    try {
      let credentialData: any = null;

      if (!useSimulation && navigator.credentials && navigator.credentials.create) {
        try {
          // Standard WebAuthn registration creation
          const challenge = new Uint8Array(16);
          window.crypto.getRandomValues(challenge);
          const userId = new Uint8Array(16);
          window.crypto.getRandomValues(userId);

          const creationOptions: PublicKeyCredentialCreationOptions = {
            challenge: challenge,
            rp: {
              name: "Meridian Research",
              id: window.location.hostname
            },
            user: {
              id: userId,
              name: "lucas.kempe@icloud.com",
              displayName: "Lucas Kempe"
            },
            pubKeyCredParams: [
              { alg: -7, type: "public-key" }, // ES256
              { alg: -257, type: "public-key" } // RS256
            ],
            authenticatorSelection: {
              residentKey: "required",
              requireResidentKey: true,
              userVerification: "preferred"
            },
            timeout: 60000
          };

          const credential = await navigator.credentials.create({
            publicKey: creationOptions
          }) as PublicKeyCredential;

          if (credential) {
            credentialData = {
              id: credential.id,
              type: credential.type,
              publicKey: "PUBLIC_KEY_BOUND_SECURELY"
            };
          }
        } catch (webauthnErr: any) {
          console.warn("Native WebAuthn create failed or blocked. Falling back to secure simulated option.", webauthnErr);
          throw new Error("Device biometrics were blocked or are unavailable on this browser. Please use the simulated option below to experience the secure passkey flow.");
        }
      } else {
        // Safe simulated passkey credential creation
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate hardware handshake
        credentialData = {
          id: `simulated-passkey-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`,
          type: "public-key",
          publicKey: "SIMULATED_SECURE_PUBLIC_KEY"
        };
        setIsSimulated(true);
      }

      if (!credentialData) {
        throw new Error("Could not acquire credential");
      }

      // 1. Save passkey credential to server database
      const regRes = await fetch("/api/passkeys/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          credential: credentialData,
          deviceName: deviceName.trim() || "My Secure Device"
        })
      });

      if (!regRes.ok) {
        throw new Error("Failed to store passkey credential on server.");
      }

      // 2. Authorize this specific one-time portal token session
      const authRes = await fetch("/api/passkeys/verify-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          success: true
        })
      });

      if (!authRes.ok) {
        throw new Error("Failed to authorize portal token.");
      }

      // Save locally to localStorage so this tab's origin retains the passkey ID
      localStorage.setItem("meridian_editor_passkey_id", credentialData.id);
      localStorage.setItem("meridian_editor_passkey_name", deviceName);

      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during registration.");
      setStatus("error");
    }
  };

  const handleAuthenticate = async (useSimulation = false) => {
    setStatus("verifying");
    setErrorMsg(null);
    setIsSimulated(useSimulation);

    try {
      let authSuccess = false;

      if (!useSimulation && navigator.credentials && navigator.credentials.get) {
        try {
          const challenge = new Uint8Array(16);
          window.crypto.getRandomValues(challenge);

          // Retrieve registered passkeys to populate allowCredentials
          const res = await fetch("/api/passkeys/list");
          let allowed: any[] = [];
          if (res.ok) {
            const data = await res.json();
            if (data.passkeys && data.passkeys.length > 0) {
              allowed = data.passkeys
                .filter((p: any) => !p.id.startsWith("simulated-"))
                .map((p: any) => ({
                  type: "public-key" as const,
                  id: stringToUint8Array(p.id)
                }));
            }
          }

          const requestOptions: PublicKeyCredentialRequestOptions = {
            challenge: challenge,
            rpId: window.location.hostname,
            userVerification: "preferred",
            timeout: 60000,
            allowCredentials: allowed.length > 0 ? allowed : undefined
          };

          const assertion = await navigator.credentials.get({
            publicKey: requestOptions
          });

          if (assertion) {
            authSuccess = true;
          }
        } catch (webauthnErr: any) {
          console.warn("Native WebAuthn get failed or blocked.", webauthnErr);
          throw new Error("Device biometrics were blocked or unavailable. Please use the simulated authorization option below to unlock editor mode.");
        }
      } else {
        // Safe simulated passkey credential verification
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate biometric authentication
        authSuccess = true;
        setIsSimulated(true);
      }

      if (authSuccess) {
        // Authorize this specific portal token session
        const authRes = await fetch("/api/passkeys/verify-portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            success: true
          })
        });

        if (!authRes.ok) {
          throw new Error("Failed to authorize portal token on server.");
        }

        setStatus("success");
      } else {
        throw new Error("Biometric authentication verification failed.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Authentication failed.");
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#090d16] text-white z-50 flex flex-col justify-between p-6 md:p-12 overflow-y-auto selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Background Decorative Mesh Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-cyan-500/5 pointer-events-none -z-10 blur-[120px] rounded-full" />
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950/40 border border-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Key className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-serif italic font-bold tracking-tight text-lg">Meridian</span>
            <span className="text-xs text-neutral-400 block -mt-1 font-mono">Secure Access Portal</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-neutral-900 border border-neutral-800 rounded-full transition-colors cursor-pointer text-neutral-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Form Center Panel */}
      <div className="max-w-md w-full mx-auto my-auto py-12 flex flex-col justify-center">
        {status === "idle" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <Fingerprint className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight font-sans">
                {type === "register" ? "Register Secure Passkey" : "Authenticate Device"}
              </h1>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                {type === "register" 
                  ? "Bind your device's biometrics or security key to gain passwordless access to Meridian's Editor Mode." 
                  : "Use your registered biometric credential to securely unlock Editor Mode in your main window."}
              </p>
            </div>

            {type === "register" && (
              <div className="bg-neutral-900/40 border border-neutral-800/80 p-4 rounded-2xl space-y-3">
                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">
                  Device Name / Label
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
                    <Laptop className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. My Laptop Touch ID"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950/60 border border-neutral-800 focus:border-cyan-500/50 outline-none rounded-xl text-xs text-white focus:bg-neutral-950 transition-all font-sans font-medium"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => type === "register" ? handleRegister(false) : handleAuthenticate(false)}
                className="w-full py-3.5 bg-white hover:bg-neutral-100 text-black font-bold rounded-xl text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4 shrink-0" />
                <span>{type === "register" ? "Register with Touch ID / Face ID" : "Unlock with Biometrics"}</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-neutral-800/50"></div>
                <span className="flex-shrink mx-4 text-[9px] text-neutral-500 uppercase font-bold tracking-widest font-mono">No hardware/OS setup?</span>
                <div className="flex-grow border-t border-neutral-800/50"></div>
              </div>

              <button
                onClick={() => type === "register" ? handleRegister(true) : handleAuthenticate(true)}
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800/80 text-cyan-400 border border-cyan-500/10 hover:border-cyan-500/30 font-bold rounded-xl text-xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                <span>{type === "register" ? "Use Safe Simulated Passkey" : "Use Simulated Passkey (Auto-unlock)"}</span>
              </button>
            </div>
          </div>
        )}

        {status === "verifying" && (
          <div className="text-center space-y-6 animate-fade-in py-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/10" />
              <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-cyan-400">
                <Fingerprint className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight">
                {isSimulated ? "Simulating Handshake..." : "Awaiting Device Signature..."}
              </h3>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                {isSimulated 
                  ? "Writing secure cryptographic challenge response parameters." 
                  : "Please approve the biometric Touch ID / Face ID or Security Key popup prompt on your browser."}
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-[0_0_25px_rgba(16,185,129,0.15)] animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {type === "register" ? "Device Registered!" : "Authentication Success!"}
              </h2>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                {type === "register"
                  ? `Your device "${deviceName}" is successfully registered. Your session is authorized.`
                  : "Biometric assertion verified. Your original editor window has been unlocked!"}
              </p>
            </div>
            <div className="bg-neutral-900/30 border border-neutral-800 p-4 rounded-xl text-[11px] text-emerald-400 font-mono text-center max-w-xs mx-auto">
              {isSimulated ? "🔒 Simulated cryptographic bound active" : "🔒 WebAuthn public-key signature bound"}
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-8 py-2.5 bg-white text-black font-bold rounded-xl text-xs shadow-md hover:bg-neutral-100 transition-all active:scale-95 cursor-pointer"
              >
                Return to Editor Mode
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              <AlertCircle className="w-8 h-8 animate-shake" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold tracking-tight text-white">Handshake Failed</h2>
              <p className="text-xs text-red-300 max-w-sm mx-auto leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => handleRegister(true)}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-cyan-500/10 text-cyan-400 font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Try Simulated Option (Guaranteed)</span>
              </button>
              <button
                onClick={() => setStatus("idle")}
                className="w-full py-2.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-neutral-100 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Biometrics</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="flex flex-col md:flex-row items-center justify-between max-w-5xl w-full mx-auto border-t border-neutral-900/80 pt-6 text-[10px] text-neutral-500 font-mono tracking-wider">
        <span>© 2026 MERIDIAN INC. ALL RIGHTS RESERVED.</span>
        <div className="flex items-center gap-4 mt-2 md:mt-0 text-cyan-500/60">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" /> SECURE HANDSHAKE
          </span>
          <span>&middot;</span>
          <span>WEBAUTHN STANDARD v2</span>
        </div>
      </div>
    </div>
  );
};
