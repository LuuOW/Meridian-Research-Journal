import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  ShieldCheck,
  Plus,
  Copy,
  Check,
  X,
  Search,
  RefreshCw,
  Sparkles,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Info,
  Terminal
} from "lucide-react";
import type { SecretDescriptor } from "../services/XaiCodingAgent";

export interface SecretsManagementSheetProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
  onAskGrokToIntegrate?: (secretKey: string, associatedFiles: string[]) => void;
}

type CategoryFilter = "all" | "ai" | "x_twitter" | "github" | "binance" | "smtp" | "security" | "custom";
type StatusFilter = "all" | "configured" | "missing";

export const SecretsManagementSheet: React.FC<SecretsManagementSheetProps> = ({
  isOpen,
  onClose,
  theme = "dark",
  onAskGrokToIntegrate,
}) => {
  const isLight = theme === "light";

  const [secrets, setSecrets] = useState<SecretDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Adding / Modifying Secret
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [formKey, setFormKey] = useState("");
  const [formCategory, setFormCategory] = useState<SecretDescriptor["category"]>("custom");
  const [formDescription, setFormDescription] = useState("");
  const [formAssociatedFiles, setFormAssociatedFiles] = useState("server.ts");
  const [formPlaceholder, setFormPlaceholder] = useState("");
  const [formRequired, setFormRequired] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSecrets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/xai/secrets");
      if (res.ok) {
        const data = await res.json();
        if (data.secrets) {
          setSecrets(data.secrets);
        }
      }
    } catch (err) {
      console.error("Failed to load secrets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSecrets();
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const copyToClipboard = (text: string, label: string, keyId?: string) => {
    navigator.clipboard.writeText(text);
    if (keyId) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    }
    showToast(`Copied ${label} to clipboard!`);
  };

  const handleCopyEnvTemplate = async () => {
    try {
      const res = await fetch("/api/xai/secrets/env-template");
      if (res.ok) {
        const data = await res.json();
        if (data.envContent) {
          copyToClipboard(data.envContent, ".env Configuration");
          return;
        }
      }
      // Fallback manual generation:
      const fallback = secrets.map((s) => `# ${s.description}\n${s.key}=${s.examplePlaceholder || ""}`).join("\n\n");
      copyToClipboard(fallback, ".env Configuration");
    } catch (err) {
      showToast("Error generating .env file");
    }
  };

  const handleCopyShellExports = () => {
    const exports = secrets
      .map((s) => `export ${s.key}="${s.isConfigured ? "configured" : s.examplePlaceholder || ""}"`)
      .join("\n");
    copyToClipboard(exports, "Shell Export Commands");
  };

  const handleOpenAddModal = () => {
    setFormKey("");
    setFormCategory("custom");
    setFormDescription("");
    setFormAssociatedFiles("server.ts");
    setFormPlaceholder("");
    setFormRequired(false);
    setFormError(null);
    setIsEditingModalOpen(true);
  };

  const handleOpenEditModal = (s: SecretDescriptor) => {
    setFormKey(s.key);
    setFormCategory(s.category);
    setFormDescription(s.description);
    setFormAssociatedFiles(s.associatedFiles.join(", "));
    setFormPlaceholder(s.examplePlaceholder || "");
    setFormRequired(s.required);
    setFormError(null);
    setIsEditingModalOpen(true);
  };

  const handleSaveSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = formKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!cleanKey) {
      setFormError("Secret key name is required (letters, numbers, and underscores).");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/xai/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: cleanKey,
          category: formCategory,
          description: formDescription.trim() || `Secret variable for ${cleanKey}`,
          required: formRequired,
          associatedFiles: formAssociatedFiles
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
          examplePlaceholder: formPlaceholder.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save secret");
      }

      await fetchSecrets();
      setIsEditingModalOpen(false);
      showToast(`Secret definition for ${cleanKey} saved.`);
    } catch (err: any) {
      setFormError(err.message || "Failed to save secret");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSecret = async (keyToDelete: string) => {
    if (!confirm(`Are you sure you want to remove custom secret '${keyToDelete}' from the agent registry?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/xai/secrets/${encodeURIComponent(keyToDelete)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchSecrets();
        showToast(`Secret '${keyToDelete}' removed.`);
      }
    } catch (err) {
      showToast("Failed to delete secret");
    }
  };

  // Filtered list of secrets
  const filteredSecrets = useMemo(() => {
    return secrets.filter((s) => {
      // Category filter
      if (selectedCategory !== "all" && s.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === "configured" && !s.isConfigured) return false;
      if (statusFilter === "missing" && s.isConfigured) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKey = s.key.toLowerCase().includes(q);
        const matchesDesc = s.description.toLowerCase().includes(q);
        const matchesFiles = s.associatedFiles.some((f) => f.toLowerCase().includes(q));
        if (!matchesKey && !matchesDesc && !matchesFiles) return false;
      }

      return true;
    });
  }, [secrets, selectedCategory, statusFilter, searchQuery]);

  const configuredCount = secrets.filter((s) => s.isConfigured).length;
  const totalCount = secrets.length;
  const requiredCount = secrets.filter((s) => s.required).length;
  const requiredConfiguredCount = secrets.filter((s) => s.required && s.isConfigured).length;

  const categoryLabels: Record<CategoryFilter, string> = {
    all: "All Secrets",
    ai: "AI & Models",
    x_twitter: "X (Twitter)",
    github: "GitHub",
    binance: "Binance Spot",
    smtp: "SMTP Digest",
    security: "Security",
    custom: "Custom",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="secrets-management-sheet-backdrop"
          className="fixed inset-0 z-[60] flex justify-end bg-slate-950/70 backdrop-blur-sm overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            id="secrets-management-sheet-container"
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={`relative flex flex-col w-full max-w-2xl h-full shadow-2xl border-l overflow-hidden ${
              isLight
                ? "bg-white text-slate-900 border-slate-200"
                : "bg-slate-950 text-slate-100 border-slate-800"
            }`}
          >
            {/* HEADER */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-b select-none ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/95 border-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold tracking-tight font-mono">
                      Environment Secrets
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md font-mono ${
                        requiredConfiguredCount >= requiredCount
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {configuredCount} / {totalCount} Active
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 font-mono">
                    Microservice runtime credentials &amp; Grok context awareness
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSecrets}
                  disabled={isLoading}
                  className={`p-2 rounded-lg text-xs font-mono transition-colors border ${
                    isLight
                      ? "text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
                      : "text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800/80"
                  }`}
                  title="Refresh status"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`p-2 rounded-lg text-xs font-mono transition-colors border ${
                    isLight
                      ? "text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
                      : "text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800/80"
                  }`}
                  title="Close Sheet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MANUAL HOSTING INSTRUCTION BANNER */}
            <div
              className={`px-6 py-3.5 border-b text-xs flex items-start gap-3 ${
                isLight
                  ? "bg-amber-50/70 border-amber-200 text-amber-900"
                  : "bg-amber-950/25 border-amber-900/40 text-amber-200"
              }`}
            >
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold">Manual Server Provisioning:</span> Because Meridian
                runs server-side in Cloud Run / container instances, actual API keys must be added to your
                server environment or platform Settings manually. This sheet lets you audit variables, define
                custom secrets for Grok to use in code generation, and export formatted configuration blocks.
              </div>
            </div>

            {/* TOOLBAR CONTROLS */}
            <div className="px-6 py-3.5 space-y-3 border-b border-slate-800/60 bg-slate-900/40">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search secrets by name or file..."
                    className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-mono focus:outline-none transition-all border ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                        : "bg-slate-900 border-slate-800 text-slate-200 focus:border-cyan-500"
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-900/20 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Setup Secret</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyEnvTemplate}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                      isLight
                        ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
                    }`}
                    title="Copy full .env template"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>.env</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShellExports}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                      isLight
                        ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
                    }`}
                    title="Copy bash export commands"
                  >
                    <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    <span>export</span>
                  </button>
                </div>
              </div>

              {/* Category Pills & Status Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(categoryLabels) as CategoryFilter[]).map((cat) => {
                    const count =
                      cat === "all" ? secrets.length : secrets.filter((s) => s.category === cat).length;
                    if (count === 0 && cat !== "all" && cat !== "custom") return null;
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                          isActive
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : isLight
                            ? "text-slate-600 hover:bg-slate-100"
                            : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                        }`}
                      >
                        {categoryLabels[cat]} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono">
                  {(["all", "configured", "missing"] as StatusFilter[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-0.5 rounded capitalize ${
                        statusFilter === st
                          ? "bg-slate-800 text-white font-bold"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECRETS LIST */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
              {filteredSecrets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 font-mono">
                  <Key className="w-10 h-10 mb-3 opacity-30 text-amber-400" />
                  <p className="text-sm font-semibold">No secrets found matching filter.</p>
                  <p className="text-xs mt-1 text-slate-400">
                    Try searching for another variable or click "Setup Secret" to register a new one.
                  </p>
                </div>
              ) : (
                filteredSecrets.map((secret) => {
                  const isCopied = copiedKey === secret.key;

                  return (
                    <div
                      key={secret.key}
                      className={`rounded-2xl border p-4 transition-all duration-200 ${
                        isLight
                          ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                          : "bg-slate-900/70 border-slate-800/90 hover:border-slate-700/80 shadow-md"
                      }`}
                    >
                      {/* Top row: Key Name, Category, Required, Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(secret.key, "Key Name", secret.key)}
                            className="group flex items-center gap-1.5 font-mono text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Click to copy key name"
                          >
                            <span>{secret.key}</span>
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-400" />
                            )}
                          </button>

                          {secret.required && (
                            <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              Required
                            </span>
                          )}

                          {secret.isCustom && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              Custom
                            </span>
                          )}

                          <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-slate-800 text-slate-400">
                            {secret.category}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {secret.isConfigured ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Configured</span>
                              {secret.maskedValue && (
                                <span className="text-[10px] text-emerald-300/70 font-mono">
                                  ({secret.maskedValue})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Not Set</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 font-sans leading-relaxed mb-3">
                        {secret.description}
                      </p>

                      {/* Associated Files and Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/40 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-500 font-mono">Used in:</span>
                          {secret.associatedFiles.map((f) => (
                            <span
                              key={f}
                              className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/70 text-slate-300 border border-slate-700/50"
                            >
                              {f}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Copy export command */}
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                `export ${secret.key}="${secret.examplePlaceholder || "your-value"}"`,
                                "Export Command"
                              )
                            }
                            className="px-2 py-1 rounded-lg font-mono text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
                            title="Copy export bash statement"
                          >
                            Copy Export
                          </button>

                          {/* Ask Grok to integrate */}
                          {onAskGrokToIntegrate && (
                            <button
                              type="button"
                              onClick={() => onAskGrokToIntegrate(secret.key, secret.associatedFiles)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/30 transition-colors"
                              title="Ask Grok to generate AST integration for this secret"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Integrate</span>
                            </button>
                          )}

                          {/* Edit definition */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(secret)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit secret descriptor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete if custom */}
                          {secret.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSecret(secret.key)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                              title="Delete custom secret definition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* TOAST NOTIFICATION */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-emerald-300 border border-emerald-500/40 shadow-xl font-mono text-xs font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{toastMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SETUP / MODIFY SECRET MODAL */}
            <AnimatePresence>
              {isEditingModalOpen && (
                <div
                  className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setIsEditingModalOpen(false);
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
                      isLight
                        ? "bg-white text-slate-900 border-slate-200"
                        : "bg-slate-900 text-slate-100 border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
                      <div className="flex items-center gap-2 font-mono text-sm font-bold">
                        <Key className="w-4 h-4 text-amber-400" />
                        <span>Setup Secret Definition</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingModalOpen(false)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveSecret} className="p-5 space-y-4 font-mono text-xs">
                      {formError && (
                        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
                          {formError}
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">
                          Secret Key Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={formKey}
                          onChange={(e) => setFormKey(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                          placeholder="e.g. DISCORD_WEBHOOK_URL"
                          required
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-cyan-300 font-bold"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Standard uppercase environment variable name (e.g. COINGECKO_API_KEY).
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                          <select
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-slate-200"
                          >
                            <option value="custom">Custom Integration</option>
                            <option value="ai">AI &amp; Models</option>
                            <option value="x_twitter">X (Twitter)</option>
                            <option value="github">GitHub</option>
                            <option value="binance">Binance Spot</option>
                            <option value="smtp">SMTP</option>
                            <option value="security">Security</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">Requirement</label>
                          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formRequired}
                              onChange={(e) => setFormRequired(e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                            />
                            <span className="text-slate-300 text-xs">Strictly Required</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Description &amp; Purpose</label>
                        <textarea
                          rows={2}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Describe what microservice uses this credential..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-slate-200"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">
                          Associated Target Files (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={formAssociatedFiles}
                          onChange={(e) => setFormAssociatedFiles(e.target.value)}
                          placeholder="server.ts, src/services/MyMicroservice.ts"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-slate-200"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">
                          Example Placeholder Value
                        </label>
                        <input
                          type="text"
                          value={formPlaceholder}
                          onChange={(e) => setFormPlaceholder(e.target.value)}
                          placeholder="e.g. sk_live_... or https://discord.com/api/..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-slate-200"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setIsEditingModalOpen(false)}
                          className="px-4 py-2 rounded-xl text-slate-400 hover:text-white border border-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors"
                        >
                          {isSaving ? "Saving..." : "Save Definition"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
