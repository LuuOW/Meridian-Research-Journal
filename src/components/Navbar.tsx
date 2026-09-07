import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Compass, Sun, Moon, Activity, Loader2, ChevronDown, Wrench, ArrowUpRight, FileText, Coins, Heart, QrCode, Terminal, Layers, Sliders, CheckCircle2, AlertTriangle } from "lucide-react";
import { GenerationJob } from "../types";
import { EditorModeButton } from "./EditorModeButton";
import { Switch } from "./Switch";
import { useEditorConfig } from "../lib/editorConfig";

interface NavbarProps {
  onOpenCreate: () => void;
  onOpenAbout: () => void;
  onOpenResume?: () => void;
  onOpenBinance?: () => void;
  onOpenDonations?: () => void;
  isEditorMode: boolean;
  onToggleEditorMode: () => void;
  onHome?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenPipelineStatus?: () => void;
  onOpenAdSenseRevenue?: () => void;
  onOpenDailyDispatch?: () => void;
  onOpenXTest?: () => void;
  onOpenObservatoryClimate?: () => void;
  onOpenEditorConsole?: (tab?: "dispatch" | "climate" | "xtest" | "pipeline") => void;
  onOpenXaiAgent?: () => void;
  hasPendingDispatch?: boolean;
  todayRevenueEstimate?: string;
  activeJobs?: GenerationJob[];
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenCreate, 
  onOpenAbout, 
  onOpenResume,
  onOpenBinance,
  onOpenDonations,
  isEditorMode, 
  onToggleEditorMode,
  onHome,
  theme,
  onToggleTheme,
  onOpenPipelineStatus,
  onOpenAdSenseRevenue,
  onOpenDailyDispatch,
  onOpenXTest,
  onOpenObservatoryClimate,
  onOpenEditorConsole,
  onOpenXaiAgent,
  hasPendingDispatch = false,
  todayRevenueEstimate,
  activeJobs = []
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const { config, toggleArxivGeneration, toggleXPosting } = useEditorConfig();

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
            <div className="flex items-center gap-2 sm:gap-2.5 animate-fade-in">
              {/* Grouped Editor Tools Dropdown - Config with arXiv & X Switches */}
              {(onOpenPipelineStatus || onOpenDailyDispatch || onOpenXTest) && (
                <div className="relative" ref={toolsRef}>
                  <button
                    id="navbar-editor-tools-btn"
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-full text-xs font-mono font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer border select-none active:scale-95 whitespace-nowrap shadow-sm group ${
                      isToolsOpen
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-900 dark:border-white shadow-md shadow-cyan-950/20"
                        : runningCount > 0
                        ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25 shadow-sm shadow-cyan-500/10"
                        : hasPendingDispatch
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/35 hover:bg-amber-500/20 shadow-sm shadow-amber-500/10"
                        : !config.arxivGenerationEnabled || !config.xPostingEnabled
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/35 hover:bg-amber-500/20"
                        : "bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                    title="Editor Config & Autonomous Controls"
                    aria-expanded={isToolsOpen}
                  >
                    {/* Icon container */}
                    <div className="flex items-center justify-center shrink-0">
                      {runningCount > 0 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500 shrink-0" />
                      ) : (
                        <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 group-hover:rotate-12 transition-transform shrink-0" />
                      )}
                    </div>

                    <span className="tracking-tight font-bold">Config</span>

                    {/* Contextual Live Status Pill */}
                    {runningCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping inline-block" />
                        {runningCount} active
                      </span>
                    ) : hasPendingDispatch ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                        Review
                      </span>
                    ) : !config.arxivGenerationEnabled && !config.xPostingEnabled ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                        2 Muted
                      </span>
                    ) : !config.arxivGenerationEnabled ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                        Sourcing Only
                      </span>
                    ) : !config.xPostingEnabled ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                        X Muted
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-500/90 shadow-[0_0_6px_rgba(16,185,129,0.7)] inline-block shrink-0" title="All autonomous engines operational" />
                    )}

                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-400 dark:text-slate-500 ${isToolsOpen ? "rotate-180 text-white dark:text-slate-950" : "group-hover:text-slate-700 dark:group-hover:text-slate-200"}`} />
                  </button>

                  {/* Dropdown Menu Flyout - Config with 2 Switches & Diagnostics */}
                  {isToolsOpen && (
                    <div 
                      className="absolute right-0 mt-2.5 w-84 sm:w-92 rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-900/15 dark:shadow-black/50 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
                      role="menu"
                    >
                      {/* Top Specular Accent Horizon */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 opacity-90" />

                      {/* Header */}
                      <div className="px-3.5 pt-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-cyan-500" />
                          <span className="text-[11px] uppercase font-mono font-extrabold tracking-wider text-slate-900 dark:text-slate-100">
                            Config
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          Autonomous Stack
                        </span>
                      </div>

                      {/* 1. arXiv Switch Component */}
                      <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800/70 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                arXiv
                                {config.arxivGenerationEnabled ? (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                    Generating
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                    Sourcing Only
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Switch
                            id="navbar-switch-arxiv"
                            checked={config.arxivGenerationEnabled}
                            onChange={toggleArxivGeneration}
                            activeColor="emerald"
                            ariaLabel="Toggle arXiv article generation"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pl-9.5">
                          {config.arxivGenerationEnabled
                            ? "Disabling will stop article generation while maintaining candidate sourcing & crawling."
                            : "Generation paused. Paper crawling and candidate scoring remain active."}
                        </p>
                      </div>

                      {/* 2. X Switch Component */}
                      <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800/70 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-black text-white flex items-center justify-center border border-slate-700 font-bold text-xs shrink-0">
                              𝕏
                            </div>
                            <div>
                              <div className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                X
                                {config.xPostingEnabled ? (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block animate-pulse" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                    Disabled
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Switch
                            id="navbar-switch-x"
                            checked={config.xPostingEnabled}
                            onChange={toggleXPosting}
                            activeColor="cyan"
                            ariaLabel="Toggle X posting"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pl-9.5">
                          {config.xPostingEnabled
                            ? "Posts companion summary tweets automatically to X upon publication."
                            : "Disables companion posts to X on publication (Web Intent stays available)."}
                        </p>
                      </div>

                      {/* Consoles & Telemetry Section Header */}
                      <div className="px-3.5 pt-2 pb-1 flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                          Editor Consoles &amp; Telemetry
                        </span>
                        {onOpenEditorConsole && (
                          <button
                            onClick={() => {
                              setIsToolsOpen(false);
                              onOpenEditorConsole("dispatch");
                            }}
                            className="text-[9px] font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            Open Console <ArrowUpRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {/* 1. arXiv Next-Day Dispatch Option */}
                      <button
                        id="dropdown-daily-dispatch-btn"
                        onClick={() => {
                          setIsToolsOpen(false);
                          if (onOpenEditorConsole) onOpenEditorConsole("dispatch");
                          else if (onOpenDailyDispatch) onOpenDailyDispatch();
                        }}
                        className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors group cursor-pointer border-b border-slate-100 dark:border-slate-800/60"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              arXiv Next-Day
                              <span className="px-1 py-0.1 rounded text-[8px] font-mono font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                09:00 ART
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {hasPendingDispatch ? (
                            <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 rounded border border-amber-500/30 animate-pulse">
                              Review
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              Cadence
                            </span>
                          )}
                          <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                        </div>
                      </button>

                      {/* 2. Observatory Climate & Sky Telemetry Option */}
                      <button
                        id="dropdown-climate-btn"
                        onClick={() => {
                          setIsToolsOpen(false);
                          if (onOpenEditorConsole) onOpenEditorConsole("climate");
                          else if (onOpenObservatoryClimate) onOpenObservatoryClimate();
                          else if (onOpenDailyDispatch) onOpenDailyDispatch();
                        }}
                        className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors group cursor-pointer border-b border-slate-100 dark:border-slate-800/60"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                            <Compass className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              Observatory Climate
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-950/50 rounded border border-cyan-500/20">
                            -34.6° BA
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                        </div>
                      </button>

                      {/* 3. X (Twitter) Diagnostics Option */}
                      <button
                        id="dropdown-x-test-btn"
                        onClick={() => {
                          setIsToolsOpen(false);
                          if (onOpenEditorConsole) onOpenEditorConsole("xtest");
                          else if (onOpenXTest) onOpenXTest();
                        }}
                        className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors group cursor-pointer border-b border-slate-100 dark:border-slate-800/60"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-slate-900 dark:bg-black text-white flex items-center justify-center shrink-0 font-bold text-[10px] border border-slate-700">
                            𝕏
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              X Diagnostics
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                $0 Bal
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono font-bold text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-950/50 rounded border border-cyan-500/20">
                            @lk3mpe
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                        </div>
                      </button>

                      {/* 4. Pipeline Status Option */}
                      <button
                        id="dropdown-pipeline-btn"
                        onClick={() => {
                          setIsToolsOpen(false);
                          if (onOpenEditorConsole) onOpenEditorConsole("pipeline");
                          else if (onOpenPipelineStatus) onOpenPipelineStatus();
                        }}
                        className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors group cursor-pointer"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                            {runningCount > 0 ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                            ) : (
                              <Activity className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              Pipeline Status
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {runningCount > 0 ? (
                            <span className="text-[9px] font-mono font-bold text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-950/50 rounded border border-cyan-500/20 animate-pulse">
                              {runningCount} active
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                              Ready
                            </span>
                          )}
                          <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                        </div>
                      </button>

                      {/* Subtle Footer Bar */}
                      <div className="px-3.5 pt-2 pb-0.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        <span>Autonomous Stack</span>
                        <span>v2.5</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Global Light / Dark Theme Toggle Button - Ergonomic & Tactile */}
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-all duration-200 cursor-pointer active:scale-95 shrink-0 group"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle global theme"
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4 text-slate-600 group-hover:text-slate-900 transition-transform group-hover:rotate-12 duration-200" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover:rotate-45 duration-200" />
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

