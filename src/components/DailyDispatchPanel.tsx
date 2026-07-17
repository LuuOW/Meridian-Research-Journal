import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Settings,
  Clock,
  Plus,
  Check,
  Loader2,
  AlertCircle,
  Database,
  RefreshCw,
  Sigma,
  Inbox,
  MessageSquare,
  Smartphone,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Send
} from "lucide-react";
import { MathRenderer } from "./MathRenderer";
import { BlogPost } from "../types";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  recipient: string;
  twilioSid?: string;
  twilioToken?: string;
  twilioFrom?: string;
  whatsappRecipient?: string;
}

interface DispatchLog {
  id: string;
  date: string;
  recipient: string;
  status: string;
  whatsappRecipient?: string;
  whatsappStatus?: string;
  whatsappMessage?: string;
  subject: string;
  html: string;
  options: {
    optionA: { id: string; title: string; excerpt: string };
    optionB: { id: string; title: string; excerpt: string };
  };
}

interface DailyDispatchPanelProps {
  onBlogPublished?: () => void;
  onClose?: () => void;
}

export default function DailyDispatchPanel({ onBlogPublished, onClose }: DailyDispatchPanelProps) {
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: "",
    port: 587,
    user: "",
    pass: "",
    from: "Meridian Research <no-reply@ask-meridian.uk>",
    recipient: "lucas.kempe@icloud.com",
    twilioSid: "",
    twilioToken: "",
    twilioFrom: "+14155238886",
    whatsappRecipient: "1170666236"
  });
  
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [activeTab, setActiveTab] = useState<"advisor" | "smtp" | "logs">("advisor");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logPreviewType, setLogPreviewType] = useState<"email" | "whatsapp">("email");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<string | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  // Load configs & logs
  useEffect(() => {
    fetchSmtpConfig();
    fetchLogs();
  }, []);

  const fetchSmtpConfig = async () => {
    try {
      const res = await fetch("/api/dispatch/config");
      if (res.ok) {
        const data = await res.json();
        setSmtp(data);
      }
    } catch (err) {
      console.error("Failed to fetch SMTP config:", err);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/dispatch/emails");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.emails || []);
        if (data.emails && data.emails.length > 0 && !selectedLogId) {
          setSelectedLogId(data.emails[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dispatch logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    setSmtpMessage(null);
    try {
      const res = await fetch("/api/dispatch/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtp)
      });
      if (res.ok) {
        setSmtpMessage("SMTP & WhatsApp configuration updated successfully.");
        fetchSmtpConfig();
        setTimeout(() => setSmtpMessage(null), 3000);
      } else {
        setSmtpMessage("Failed to update SMTP configuration.");
      }
    } catch (err) {
      setSmtpMessage("Network failure saving configuration.");
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleGenerateDispatch = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationResult(null);
    try {
      const res = await fetch("/api/dispatch/generate-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        setGenerationResult(data);
        fetchLogs();
        if (onBlogPublished) {
          onBlogPublished();
        }
      } else {
        setGenerationError(data.error || "Failed to generate dispatch.");
      }
    } catch (err: any) {
      setGenerationError(err.message || "Network failure triggering dispatch.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishDraft = async (id: string) => {
    setPublishingId(id);
    setPublishMessage(null);
    try {
      const res = await fetch("/api/blogs/publish-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (res.ok) {
        setPublishMessage(`Successfully authenticated and published blog: ${data.blog.title}`);
        if (onBlogPublished) {
          onBlogPublished();
        }
        fetchLogs();
      } else {
        setPublishMessage(data.error || "Failed to publish blog.");
      }
    } catch (err: any) {
      setPublishMessage(err.message || "Network error publishing draft.");
    } finally {
      setPublishingId(null);
    }
  };

  const activeLog = logs.find((l) => l.id === selectedLogId);

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[750px] max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800/40">
            <Sigma className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif italic text-white leading-tight">Meridian AI Advisor</h2>
            <p className="text-xs text-slate-400">Daily Dual Scientific Recommendation & Dispatch Sandbox</p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("advisor")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "advisor"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Forecast Advisor</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("smtp")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "smtp"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              <span>Dispatch Credentials</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "logs"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5" />
              <span>Inbox Sandbox ({logs.length})</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "advisor" && (
            <motion.div
              key="advisor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 h-full flex flex-col justify-between overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto text-center space-y-6 py-6">
                <div className="inline-flex p-3 bg-cyan-950/40 text-cyan-400 border border-cyan-800/20 rounded-2xl shadow-inner mb-2 animate-pulse">
                  <RefreshCw className="w-8 h-8" />
                </div>
                
                <h3 className="text-2xl font-serif italic font-bold text-white leading-snug">
                  Query arXiv & Compile Today's Dual Pathways
                </h3>
                
                <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto font-sans">
                  The AI Advisor checks <code className="text-slate-200 font-mono">cat:physics.optics</code> and <code className="text-slate-200 font-mono">cat:quant-ph</code>, builds the RAG context from your reading logs, and compiles two tailored review articles.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <button
                    onClick={handleGenerateDispatch}
                    disabled={isGenerating}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-sm uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-cyan-950/50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        <span>Generating Dual Pathways...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Trigger Daily Advisor Dispatch</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Progress message logs inside generation */}
                {isGenerating && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl max-w-md mx-auto text-left">
                    <p className="text-xs font-mono text-cyan-400 animate-pulse flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>[1/4] Retrieving user history vector maps (RAG)...</span>
                    </p>
                    <p className="text-xs font-mono text-slate-500 mt-1">[2/4] Pulling real-time feed preprints from export.arxiv.org...</p>
                    <p className="text-xs font-mono text-slate-500 mt-1">[3/4] Modeling dual articles: Optics Focus vs Algebra Math Foundations...</p>
                    <p className="text-xs font-mono text-slate-500 mt-1">[4/4] Orchestrating custom responsive SMTP HTML template & Twilio WhatsApp loops...</p>
                  </div>
                )}

                {/* Success Panel */}
                {generationResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-slate-900 border border-emerald-800/40 rounded-2xl max-w-xl mx-auto text-left space-y-4"
                  >
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Check className="w-5 h-5" />
                      <span>Daily Advisor Analysis Complete!</span>
                    </div>
                    
                    <div className="space-y-2 border-l-2 border-emerald-800/40 pl-4">
                      <p className="text-xs text-slate-300">
                        <span className="font-semibold text-white">Email Delivery Status:</span> {generationResult.dispatchStatus}
                      </p>
                      <p className="text-xs text-slate-300">
                        <span className="font-semibold text-white">WhatsApp Delivery Status:</span> {generationResult.whatsappStatus}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-sans">Draft reviews successfully compiled in draft database.</span>
                      <button
                        onClick={() => setActiveTab("logs")}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                      >
                        <span>Open Inbox Sandbox</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Error Panel */}
                {generationError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-slate-900 border border-red-950 rounded-xl max-w-md mx-auto text-left flex gap-3 items-start"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Advisor Compilation Failure</h4>
                      <p className="text-xs text-red-400 mt-1">{generationError}</p>
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="border-t border-slate-900 pt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Personalized Dispatch recipient: {smtp.recipient}</span>
                <span>Mobile Recipient: {smtp.whatsappRecipient || "None"}</span>
              </div>
            </motion.div>
          )}

          {activeTab === "smtp" && (
            <motion.div
              key="smtp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 h-full overflow-y-auto"
            >
              <form onSubmit={handleSaveSmtp} className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-900 pb-4 mb-6">
                  <div className="p-2 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800/40">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-serif italic">SMTP Relay & Dispatch Credentials</h3>
                    <p className="text-xs text-slate-400">Configure SMTP servers to dispatch the daily RAG forecast templates securely.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">SMTP Host Server</label>
                    <input
                      type="text"
                      placeholder="smtp.mail.me.com"
                      value={smtp.host}
                      onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">SMTP Port</label>
                    <input
                      type="number"
                      placeholder="587"
                      value={smtp.port}
                      onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) || 587 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">SMTP Sender Username</label>
                    <input
                      type="text"
                      placeholder="lucas.kempe@icloud.com"
                      value={smtp.user}
                      onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">SMTP App-Specific Password</label>
                    <input
                      type="password"
                      placeholder={smtp.pass ? "********" : "••••••••••••"}
                      value={smtp.pass}
                      onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Friendly Sender Identity (From)</label>
                    <input
                      type="text"
                      placeholder="Meridian Research <no-reply@ask-meridian.uk>"
                      value={smtp.from}
                      onChange={(e) => setSmtp({ ...smtp, from: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Recipient Destination Email</label>
                    <input
                      type="email"
                      placeholder="lucas.kempe@icloud.com"
                      value={smtp.recipient}
                      onChange={(e) => setSmtp({ ...smtp, recipient: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-sans"
                      required
                    />
                  </div>
                </div>

                {/* Twilio WhatsApp Configuration Section */}
                <div className="flex items-center gap-3 border-b border-slate-900 pb-4 mb-6 mt-10">
                  <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/40">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-serif italic">Twilio WhatsApp Dispatch (Optional)</h3>
                    <p className="text-xs text-slate-400">Receive real-time paper recommendations and instant-publish links directly on your phone.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Twilio Account SID</label>
                    <input
                      type="text"
                      placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      value={smtp.twilioSid || ""}
                      onChange={(e) => setSmtp({ ...smtp, twilioSid: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Twilio Auth Token</label>
                    <input
                      type="password"
                      placeholder={smtp.twilioToken ? "********" : "••••••••••••"}
                      value={smtp.twilioToken || ""}
                      onChange={(e) => setSmtp({ ...smtp, twilioToken: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Twilio WhatsApp Sender</label>
                    <input
                      type="text"
                      placeholder="+14155238886"
                      value={smtp.twilioFrom || ""}
                      onChange={(e) => setSmtp({ ...smtp, twilioFrom: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Twilio sandbox or registered number starting with "+"</span>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">WhatsApp Recipient Number</label>
                    <input
                      type="text"
                      placeholder="1170666236"
                      value={smtp.whatsappRecipient || ""}
                      onChange={(e) => setSmtp({ ...smtp, whatsappRecipient: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Your mobile. Standardizes "1170666236" to "+5491170666236"</span>
                  </div>
                </div>

                {smtpMessage && (
                  <p className={`text-xs font-semibold ${smtpMessage.includes("success") ? "text-emerald-400" : "text-red-400"}`}>
                    {smtpMessage}
                  </p>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSavingSmtp}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSavingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Save Dispatch Credentials</span>
                  </button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-slate-900/30 border border-slate-800 rounded-xl space-y-2 max-w-2xl mx-auto">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold uppercase font-mono">
                  <AlertCircle className="w-4 h-4 text-cyan-400" />
                  <span>Environment Alternative Fallbacks:</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  You can also define credentials inside your local <code className="text-slate-300 font-mono">.env</code>:
                  <br />
                  <code className="text-slate-300 block bg-slate-950 p-2 border border-slate-900 rounded font-mono text-[10px] mt-2 whitespace-pre">
                    SMTP_HOST="smtp.mail.me.com"{"\n"}
                    SMTP_PORT="587"{"\n"}
                    SMTP_USER="lucas.kempe@icloud.com"{"\n"}
                    SMTP_PASS="your-app-password"{"\n"}
                    SMTP_FROM="Meridian Research &lt;no-reply@ask-meridian.uk&gt;"{"\n"}
                    USER_EMAIL="lucas.kempe@icloud.com"{"\n"}
                    TWILIO_ACCOUNT_SID="AC..."{"\n"}
                    TWILIO_AUTH_TOKEN="your_token"{"\n"}
                    TWILIO_FROM_NUMBER="+14155238886"{"\n"}
                    WHATSAPP_RECIPIENT="+5491170666236"
                  </code>
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "logs" && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex divide-x divide-slate-900"
            >
              {/* Chronological Sidebar */}
              <div className="w-80 overflow-y-auto h-full p-4 space-y-3 shrink-0">
                <h3 className="text-xs font-mono uppercase text-slate-400 px-2 tracking-wider">Dispatched Logs History</h3>
                
                {isLoadingLogs && logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span className="text-xs font-mono">Reading mailbox...</span>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 border border-dashed border-slate-800 rounded-xl">
                    <AlertCircle className="w-5 h-5 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs font-sans">No dispatched preprints have been archived yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <button
                        key={log.id}
                        onClick={() => {
                          setSelectedLogId(log.id);
                          setLogPreviewType("email");
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer block ${
                          selectedLogId === log.id
                            ? "bg-slate-900/80 border-cyan-500/50 shadow-md"
                            : "bg-slate-900/20 border-slate-800/40 hover:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-mono text-slate-500">{log.date}</span>
                          <div className="flex gap-1.5">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              log.status.includes("Successfully") 
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/30" 
                                : "bg-cyan-950/80 text-cyan-400 border border-cyan-800/30"
                            }`}>
                              Mail: {log.status.includes("Successfully") ? "Sent" : "Sim"}
                            </span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              log.whatsappStatus && log.whatsappStatus.includes("Successfully")
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/30"
                                : "bg-teal-950/50 text-teal-300 border border-teal-800/20"
                            }`}>
                              WA: {log.whatsappStatus && log.whatsappStatus.includes("Successfully") ? "Sent" : "Sim"}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 font-sans line-clamp-1 mb-1">
                          {log.subject}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          To: {log.recipient} • {log.whatsappRecipient || "1170666236"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Log Review Preview Workspace */}
              <div className="flex-1 overflow-y-auto h-full flex flex-col">
                {activeLog ? (
                  <div className="flex-1 flex flex-col">
                    {/* Preview Header */}
                    <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
                          <Inbox className="w-4 h-4" />
                          <span>Interactive Dispatch Sandbox</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200 font-sans mt-1">
                          {activeLog.subject}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLogPreviewType("email")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            logPreviewType === "email"
                              ? "bg-cyan-600 text-white shadow-md shadow-cyan-950"
                              : "bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          Email Template
                        </button>
                        <button
                          onClick={() => setLogPreviewType("whatsapp")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            logPreviewType === "whatsapp"
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                              : "bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          WhatsApp View
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 p-2 text-xs border-b border-slate-900 flex justify-between text-slate-400 font-mono px-4">
                      <span>Email Status: <span className="text-slate-200 font-semibold">{activeLog.status}</span></span>
                      <span>WhatsApp Status: <span className="text-slate-200 font-semibold">{activeLog.whatsappStatus || "Simulated"}</span></span>
                    </div>

                    {logPreviewType === "email" ? (
                      <div className="flex-1 min-h-[450px] bg-slate-100 p-4 flex flex-col">
                        <div className="flex-1 min-h-[400px]">
                          <iframe
                            title="HTML Email Simulator Preview"
                            srcDoc={activeLog.html}
                            className="w-full h-full min-h-[380px] rounded-lg border border-slate-300 bg-white"
                            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                          />
                        </div>
                        
                        {/* Simulation Actions */}
                        <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-3">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
                            <Database className="w-4 h-4" />
                            <span>Simulated Interactive Actions (Instantly publish either draft to main feed)</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-between">
                              <h5 className="text-xs font-bold text-slate-200 font-sans line-clamp-1">{activeLog.options.optionA.title}</h5>
                              <button
                                onClick={() => handlePublishDraft(activeLog.options.optionA.id)}
                                disabled={publishingId !== null}
                                className="mt-3 w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold rounded text-xs uppercase tracking-wider cursor-pointer"
                              >
                                {publishingId === activeLog.options.optionA.id ? "Publishing..." : "Publish Option A (Optics)"}
                              </button>
                            </div>

                            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-between">
                              <h5 className="text-xs font-bold text-slate-200 font-sans line-clamp-1">{activeLog.options.optionB.title}</h5>
                              <button
                                onClick={() => handlePublishDraft(activeLog.options.optionB.id)}
                                disabled={publishingId !== null}
                                className="mt-3 w-full py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold rounded text-xs uppercase tracking-wider cursor-pointer"
                              >
                                {publishingId === activeLog.options.optionB.id ? "Publishing..." : "Publish Option B (Algebra)"}
                              </button>
                            </div>
                          </div>
                          
                          {publishMessage && (
                            <p className="text-xs text-center font-bold font-mono text-cyan-400 animate-pulse">{publishMessage}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-[450px] bg-slate-950 p-6 flex flex-col items-center justify-center">
                        <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-neutral-900 overflow-hidden shadow-2xl flex flex-col font-sans mb-4">
                          {/* Mock WhatsApp Top Bar */}
                          <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-emerald-400/20 flex items-center justify-center font-bold text-sm text-cyan-300 font-serif">
                              M
                            </div>
                            <div>
                              <h5 className="text-xs font-bold font-sans">Meridian AI Advisor</h5>
                              <span className="text-[9px] text-emerald-100 font-sans font-normal">Official Business Account • Online</span>
                            </div>
                          </div>

                          {/* WhatsApp Chat Body */}
                          <div className="bg-[#e5ddd5] p-4 flex-1 flex flex-col justify-end min-h-[300px]">
                            <div className="self-end bg-white text-slate-950 text-xs p-3.5 rounded-2xl rounded-tr-none shadow max-w-[85%] relative space-y-2 whitespace-pre-wrap font-sans">
                              {activeLog.whatsappMessage || `*Meridian AI Advisor: Daily Forecast* 🌟\n\nDear Lucas, two custom preprints are compiled:\n\n*Option A: Quantum Superposition Optics*\n👉 Publish: http://localhost:3000/?publish_draft=option-a\n\n*Option B: Dynamic Squeezed Light*\n👉 Publish: http://localhost:3000/?publish_draft=option-b`}
                              <div className="text-right text-[9px] text-slate-400 font-mono mt-1">
                                {activeLog.date.split(" ").pop()} • ✓✓
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive trigger links from WhatsApp */}
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm flex flex-col gap-2">
                          <p className="text-[10px] font-mono text-slate-400">Clicking instant links simulated below:</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePublishDraft(activeLog.options.optionA.id)}
                              disabled={publishingId !== null}
                              className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-850 text-[10px] font-mono text-emerald-400 border border-emerald-800/20 rounded"
                            >
                              Link A (Optics)
                            </button>
                            <button
                              onClick={() => handlePublishDraft(activeLog.options.optionB.id)}
                              disabled={publishingId !== null}
                              className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-850 text-[10px] font-mono text-purple-400 border border-purple-800/20 rounded"
                            >
                              Link B (Algebra)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
                    <Inbox className="w-12 h-12 text-slate-800 mb-4 animate-bounce" />
                    <h4 className="font-bold text-slate-400 font-sans">Simulated Review Inbox</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-2">
                      Select a dispatched log from the chronological listing to inspect the high-fidelity responsive template and click Option links directly!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
