import React, { useState } from "react";
import { X, Lock, Eye, EyeOff, AlertCircle, Sparkles, Loader2 } from "lucide-react";

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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-950/45 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 font-sans tracking-tight">{titleText}</h3>
              <p className="text-[10px] text-neutral-400 font-medium">Authentication required</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-950 rounded-lg transition-colors cursor-pointer"
            disabled={isVerifying}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider font-mono">
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
                className="w-full pl-3 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-sans"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isVerifying}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-red-600 text-[11px] font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="flex-1 py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white/80" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-white/80" />
                  <span>Verify</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
