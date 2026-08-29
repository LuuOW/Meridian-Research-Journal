import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Download,
  Printer,
  FileText,
  Copy,
  Check,
  Briefcase,
  Layers,
  Sparkles,
  BookOpen,
  Mail,
  Linkedin,
  Phone,
  MapPin,
  ExternalLink,
  Code,
  Tag,
  Share2
} from "lucide-react";
import { RESUME_DATA } from "../lib/resumeData";
import {
  generateMarkdownResume,
  generatePrintableHtmlResume,
  downloadFile,
  printResumeDocument
} from "../lib/resumeExporter";

interface ResumeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeViewModal: React.FC<ResumeViewModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "keywords" | "publications">("preview");
  const resume = RESUME_DATA;

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    const md = generateMarkdownResume();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownResume();
    downloadFile("Lucas_Kempe_Resume_Meridian.md", md, "text/markdown;charset=utf-8");
  };

  const handleDownloadHtml = () => {
    const html = generatePrintableHtmlResume();
    downloadFile("Lucas_Kempe_Resume_Meridian.html", html, "text/html;charset=utf-8");
  };

  const handlePrint = () => {
    printResumeDocument();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col z-10 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/60 dark:bg-neutral-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 font-sans tracking-tight">
                  {resume.name} — Curriculum Vitae
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase rounded-full border border-emerald-500/20">
                  Ready to Download
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                Synthesized across all Meridian research articles &amp; systems
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title="Print to PDF or paper"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Print / PDF</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Download as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.MD</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-mono font-bold border border-purple-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Download standalone HTML"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.HTML</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-mono transition-all cursor-pointer"
              title="Copy Markdown to Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 border-b border-neutral-100 dark:border-neutral-800 flex gap-4 text-xs font-mono font-bold uppercase tracking-wider bg-white dark:bg-neutral-900 shrink-0">
          <button
            onClick={() => setActiveTab("preview")}
            className={`pb-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "preview"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Curriculum Vitae
          </button>
          <button
            onClick={() => setActiveTab("publications")}
            className={`pb-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "publications"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Articles &amp; Papers ({resume.keyPublications.length})
          </button>
          <button
            onClick={() => setActiveTab("keywords")}
            className={`pb-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "keywords"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Keywords &amp; AST Index ({resume.technicalKeywords.length})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-8 bg-neutral-50/30 dark:bg-neutral-950/20 text-neutral-800 dark:text-neutral-200">
          {activeTab === "preview" && (
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* Header Info */}
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-baseline gap-2">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 dark:text-white font-sans tracking-tight">
                      {resume.name}
                    </h1>
                    <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide font-mono mt-0.5">
                      {resume.title}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                    Verified Scholar Node
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-mono leading-relaxed">
                  {resume.subtitle}
                </p>

                {/* Contact Pill Grid */}
                <div className="flex flex-wrap gap-2 pt-2 text-xs font-mono">
                  <a
                    href={`mailto:${resume.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                    {resume.email}
                  </a>
                  <a
                    href={resume.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
                    LinkedIn Profile
                  </a>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    {resume.phone}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    {resume.location}
                  </span>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-2">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-mono flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" /> Executive Summary
                </h2>
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {resume.summary}
                </div>
              </div>

              {/* Core Competencies */}
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-mono flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-500" /> Core Competencies &amp; Technical Specializations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {resume.coreCompetencies.map((cat, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-2.5"
                    >
                      <h3 className="text-xs font-bold text-cyan-700 dark:text-cyan-300 font-mono uppercase tracking-wider pb-1 border-b border-neutral-100 dark:border-neutral-800">
                        {cat.category}
                      </h3>
                      <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-sans">
                        {cat.skills.map((skill, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-1.5">
                            <span className="text-cyan-500 mt-0.5">•</span>
                            <span>{skill}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Professional Experience */}
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-mono flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-500" /> Professional Experience &amp; Leadership
                </h2>
                <div className="space-y-4">
                  {resume.experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                            {exp.role}
                          </h3>
                          <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 font-mono">
                            {exp.organization}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md self-start sm:self-auto">
                          {exp.period} · {exp.location}
                        </span>
                      </div>

                      <ul className="space-y-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 list-disc pl-4 leading-relaxed">
                        {exp.highlights.map((h, hIdx) => (
                          <li key={hIdx}>{h}</li>
                        ))}
                      </ul>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {exp.technologies.map((t, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 rounded text-[10px] font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Research Domains Syntheses */}
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-mono flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-500" /> Key Research Domains
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {resume.researchDomains.map((dom, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-2"
                    >
                      <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                        {dom.domain}
                      </h3>
                      <ul className="space-y-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                        {dom.keyThemes.map((theme, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-1">
                            <span className="text-cyan-500 font-bold">›</span>
                            <span>{theme}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "publications" && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-xs text-cyan-800 dark:text-cyan-200 font-mono">
                Selected publications and rigorous mathematical formulations authored and synthesized for Meridian Journal.
              </div>
              <div className="space-y-3">
                {resume.keyPublications.map((pub, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-2.5 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-baseline gap-1">
                      <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                        {pub.title}
                      </h3>
                      {pub.arxivLink && (
                        <a
                          href={pub.arxivLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 font-mono hover:underline shrink-0"
                        >
                          <span>arXiv</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                      {pub.category}
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {pub.impactSummary}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pub.keywords.map((kw, kIdx) => (
                        <span
                          key={kIdx}
                          className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded text-[10px] font-mono"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "keywords" && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-800 dark:text-purple-200 font-mono">
                Comprehensive AST indexing &amp; ATS-optimized scientific terminology derived from all published articles.
              </div>

              <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                  Full Technical Index ({resume.technicalKeywords.length} terms)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resume.technicalKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 rounded-xl text-xs font-mono font-semibold"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/80 dark:bg-neutral-950/60 text-xs font-mono text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Meridian Scientific Resume v2.4 · Lucas Kempe</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold font-sans text-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
            >
              Download PDF / Print
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
