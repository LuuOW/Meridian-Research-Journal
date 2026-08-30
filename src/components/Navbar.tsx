import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Compass, Sun, Moon, Activity, Loader2, DollarSign, ChevronDown, Wrench, ArrowUpRight, FileText } from "lucide-react";
import { GenerationJob } from "../types";
import { EditorModeButton } from "./EditorModeButton";

interface NavbarProps {
  onOpenCreate: () => void;
  onOpenAbout: () => void;
  onOpenResume?: () => void;
  isEditorMode: boolean;
  onToggleEditorMode: () => void;
  onHome?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenPipelineStatus?: () => void;
  onOpenAdSenseRevenue?: () => void;
  todayRevenueEstimate?: string;
  activeJobs?: GenerationJob[];
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenCreate, 
  onOpenAbout, 
  onOpenResume,
  isEditorMode, 
  onToggleEditorMode,
  onHome,
  theme,
  onToggleTheme,
  onOpenPipelineStatus,
  onOpenAdSenseRevenue,
  todayRevenueEstimate,
  activeJobs = []
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsToolsOpen(false);
      }
    };

    if (isToolsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isToolsOpen]);

  const handleHomeClick = () => {
    if (onHome) {
      onHome();
    } else {
      window.location.reload();
    }
  };

  const runningCount = activeJobs.filter(j => !j.dismissed && j.status === "generating").length;
  const totalActive = activeJobs.filter(j => !j.dismissed).length;

  return (
    <header id="app-header" className="sticky top-0 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-gray-100 dark:border-neutral-900 z-40 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        
        {/* Brand Logo & Compass */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div 
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0" 
            onClick={handleHomeClick}
          >
            {/* Elite Geometric Emblazoned Logo */}
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 dark:from-neutral-200 dark:to-neutral-400 p-[1px] shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-105 shrink-0">
              <div className="w-full h-full bg-black dark:bg-neutral-900 rounded-[11px] flex items-center justify-center overflow-hidden relative">
                {/* Decorative background grid line */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15)_1px,_transparent_1px)] bg-[size:6px_6px] opacity-40"></div>
                {/* Core rotating compass */}
                <Compass 
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-neutral-100 transition-all duration-1000 ease-in-out group-hover:rotate-[360deg] relative z-10" 
                />
                {/* Outer orbit circle */}
                <div className="absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/10 dark:border-white/5 animate-pulse"></div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold tracking-tighter italic font-serif text-black dark:text-white group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                  Meridian.
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 bg-neutral-950 text-white dark:bg-white dark:text-black text-[7px] sm:text-[8px] font-extrabold rounded-md font-mono uppercase tracking-widest shadow-sm transition-colors">
                  Journal
                </span>
              </div>
              <p className="text-[8px] sm:text-[9px] text-gray-500 dark:text-neutral-400 font-bold tracking-widest uppercase font-mono transition-colors truncate hidden sm:block">
                Quantum Optics · Computing · AI
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex gap-8 text-xs font-bold tracking-widest uppercase text-gray-400 dark:text-neutral-500 justify-center shrink-0">
          <span className="text-black dark:text-white border-b-2 border-black dark:border-white pb-1 cursor-pointer transition-colors" onClick={handleHomeClick}>Blog</span>
          <span className="hover:text-black dark:hover:text-white cursor-pointer transition-colors pb-1 text-neutral-500 dark:text-neutral-400 hover:border-b-2 hover:border-black dark:hover:border-white" onClick={onOpenAbout}>About</span>
        </div>

        {/* Action Button & Theme/Editor Toggles */}
        <div className="flex justify-end items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mobile About Button */}
          <button
            onClick={onOpenAbout}
            className="md:hidden px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            title="About Meridian Journal"
          >
            About
          </button>
          {isEditorMode && (
            <div className="flex items-center gap-1.5 sm:gap-2 animate-fade-in">
              {/* Grouped Editor Tools Dropdown */}
              {(onOpenAdSenseRevenue || onOpenPipelineStatus) && (
                <div className="relative" ref={toolsRef}>
                  <button
                    id="navbar-editor-tools-btn"
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-mono font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border active:scale-95 whitespace-nowrap ${
                      isToolsOpen
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm"
                        : runningCount > 0
                        ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 shadow-sm"
                        : "bg-neutral-100 dark:bg-neutral-900/80 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    }`}
                    title="Editor Tools & Telemetry"
                    aria-expanded={isToolsOpen}
                  >
                    {runningCount > 0 ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500 shrink-0" />
                    ) : (
                      <Wrench className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
                    )}
                    <span className="hidden sm:inline">Tools</span>

                    {/* Quick Indicator Badge on Dropdown Button */}
                    {runningCount > 0 ? (
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping inline-block" />
                    ) : todayRevenueEstimate ? (
                      <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {todayRevenueEstimate}
                      </span>
                    ) : null}

                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isToolsOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown Menu Flyout */}
                  {isToolsOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                      role="menu"
                    >
                      <div className="px-3.5 py-1.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                          Editor Controls
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          Live Telemetry
                        </span>
                      </div>

                      {/* AdSense Revenue Option */}
                      {onOpenAdSenseRevenue && (
                        <button
                          id="dropdown-adsense-btn"
                          onClick={() => {
                            setIsToolsOpen(false);
                            onOpenAdSenseRevenue();
                          }}
                          className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/70 transition-colors group cursor-pointer"
                          role="menuitem"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <DollarSign className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                                AdSense Monetization
                              </div>
                              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                Revenue, RPM &amp; Telemetry
                              </div>
                            </div>
                          </div>
                          {todayRevenueEstimate && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-md border border-emerald-500/20">
                                {todayRevenueEstimate}
                              </span>
                              <ArrowUpRight className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </button>
                      )}

                      {/* Pipeline Status Option */}
                      {onOpenPipelineStatus && (
                        <button
                          id="dropdown-pipeline-btn"
                          onClick={() => {
                            setIsToolsOpen(false);
                            onOpenPipelineStatus();
                          }}
                          className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/70 transition-colors group cursor-pointer"
                          role="menuitem"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              {runningCount > 0 ? (
                                <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                              ) : (
                                <Activity className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                                Pipeline Status
                                {runningCount > 0 && (
                                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping inline-block" />
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                Queue &amp; arXiv synthesis logs
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {runningCount > 0 ? (
                              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/50 rounded-md border border-cyan-500/20 animate-pulse">
                                {runningCount} active
                              </span>
                            ) : totalActive > 0 ? (
                              <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                                {totalActive} jobs
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-neutral-400">
                                Idle
                              </span>
                            )}
                            <ArrowUpRight className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )}

                      {/* Resume / CV Export Option in Tools */}
                      {onOpenResume && (
                        <button
                          id="dropdown-resume-btn"
                          onClick={() => {
                            setIsToolsOpen(false);
                            onOpenResume();
                          }}
                          className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/70 transition-colors group cursor-pointer border-t border-neutral-100 dark:border-neutral-800/60"
                          role="menuitem"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                                Curriculum Vitae
                              </div>
                              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                Downloadable PDF &amp; Markdown
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/50 rounded-md border border-purple-500/20">
                              Export
                            </span>
                            <ArrowUpRight className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Primary 1-Click Action: Generate Blog */}
              <button
                id="navbar-generate-blog-btn"
                onClick={onOpenCreate}
                className="px-3 sm:px-5 py-1.5 sm:py-2.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-full text-xs font-bold shadow-sm transition-all duration-200 flex items-center gap-1.5 group active:scale-95 cursor-pointer whitespace-nowrap"
                title="Generate Blog from arXiv"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white dark:text-black fill-white/20 group-hover:rotate-12 transition-transform shrink-0" />
                <span className="hidden sm:inline">Generate Blog</span>
                <span className="sm:hidden text-[11px]">Generate</span>
              </button>
            </div>
          )}

          {/* Global Light / Dark Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 sm:p-2.5 rounded-full text-neutral-400 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900/60 border border-transparent dark:border-neutral-900 transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle global theme"
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            ) : (
              <Sun className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {/* Discrete Editor Mode Button with Surrounding Vanishing Countdown Border */}
          <EditorModeButton
            isEditorMode={isEditorMode}
            onToggleEditorMode={onToggleEditorMode}
            hasRunningJobs={runningCount > 0}
          />
        </div>

      </div>
    </header>
  );
};

