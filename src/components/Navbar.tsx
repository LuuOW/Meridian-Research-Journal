import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Compass, Sun, Moon, Activity, Loader2, ChevronDown, Wrench, ArrowUpRight, FileText, Coins, Heart, QrCode, Terminal, Layers, Sliders, CheckCircle2, AlertTriangle } from "lucide-react";
import { GenerationJob } from "../types";
import { EditorModeButton } from "./EditorModeButton";
import { Switch } from "./Switch";
import { useEditorConfig } from "../lib/editorConfig";

// Vector Arxiv Logo Badge matching uploaded brand asset
const ArxivLogoIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div 
    className={`${className} rounded-lg bg-[#8F1414] flex items-center justify-center p-1 border border-red-800/40 shadow-xs shrink-0 select-none overflow-hidden`}
    title="arXiv Article Generation"
  >
    <svg
      viewBox="0 0 247 111"
      className="w-full h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 'a' */}
      <path
        d="M390.61,255.154c5.018,0,8.206,3.312,8.206,8.4v37.831H363.308a4.813,4.813,0,0,1-5.143-4.929V283.427a8.256,8.256,0,0,1,7-8.148l25.507-3.572v-8.4H362.306a4.014,4.014,0,0,1-4.141-4.074c0-2.87,2.143-4.074,4.355-4.074Zm.059,38.081V279.942l-24.354,3.4v9.9Z"
        transform="translate(-358.165 -222.27)"
        fill="#ffffff"
      />
      {/* 'r' */}
      <path
        d="M427.571,255.154c1.859,0,3.1,1.24,3.985,3.453,1.062-2.213,2.568-3.453,4.694-3.453h14.878a4.062,4.062,0,0,1,4.074,4.074v7.828c0,2.656-1.327,4.074-4.074,4.074-2.656,0-4.074-1.418-4.074-4.074V263.3H436.515a2.411,2.411,0,0,0-2.656,2.745v27.188h10.007c2.658,0,4.074,1.329,4.074,4.074s-1.416,4.074-4.074,4.074h-26.39c-2.659,0-3.986-1.328-3.986-4.074s1.327-4.074,3.986-4.074h8.236V263.3h-7.263c-2.656,0-3.985-1.329-3.985-4.074,0-2.658,1.329-4.074,3.985-4.074Z"
        transform="translate(-358.165 -222.27)"
        fill="#ffffff"
      />
      {/* 'x' stroke 1 (white) */}
      <path
        d="M486.149,277.877l-32.741,38.852c-1.286,1.372-2.084,3.777-1.365,5.5a4.705,4.705,0,0,0,4.4,2.914,4.191,4.191,0,0,0,3.16-1.563l40.191-42.714a4.417,4.417,0,0,0,.042-6.042Z"
        transform="translate(-358.165 -222.27)"
        fill="#ffffff"
      />
      {/* 'x' stroke 2 (silver-grey crossing stroke) */}
      <path
        d="M486.149,277.877l31.187-38.268c1.492-1.989,2.2-3.03,1.492-4.723a5.142,5.142,0,0,0-4.481-3.161h0a4.024,4.024,0,0,0-3.008,1.108L472.711,274.6a4.769,4.769,0,0,0,.015,6.53L520.512,332.2a3.913,3.913,0,0,0,3.137,1.192,4.394,4.394,0,0,0,4.027-2.818c.719-1.727-.076-3.438-1.4-5.23l-40.124-47.464"
        transform="translate(-358.165 -222.27)"
        fill="#D1D5DB"
      />
      {/* 'x' stroke 3 (white top-right branch) */}
      <path
        d="M499.833,274.828,453.169,224.4s-1.713-2.08-3.524-2.124a4.607,4.607,0,0,0-4.338,2.788c-.705,1.692-.2,2.88,1.349,5.1l40.093,48.422"
        transform="translate(-358.165 -222.27)"
        fill="#ffffff"
      />
      {/* 'i' */}
      <path
        d="M539.233,255.154c2.656,0,4.074,1.416,4.074,4.074v34.007h10.1c2.746,0,4.074,1.329,4.074,4.074s-1.328,4.074-4.074,4.074H524.8c-2.656,0-4.074-1.328-4.074-4.074s1.418-4.074,4.074-4.074h10.362V263.3h-8.533c-2.744,0-4.073-1.329-4.073-4.074,0-2.658,1.329-4.074,4.073-4.074Zm4.22-17.615a5.859,5.859,0,1,1-5.819-5.819A5.9,5.9,0,0,1,543.453,237.539Z"
        transform="translate(-358.165 -222.27)"
        fill="#ffffff"
      />
      {/* 'v' */}
      <path
        d="M605.143,259.228a4.589,4.589,0,0,1-.267,1.594L590,298.9a3.722,3.722,0,0,1-3.721,2.48h-5.933a3.689,3.689,0,0,1-3.808-2.48l-15.055-38.081a3.23,3.23,0,0,1-.355-1.594,4.084,4.084,0,0,1,4.164-4.074,3.8,3.8,0,0,1,3.718,2.656l14.348,36.134,13.9-36.134a3.8,3.8,0,0,1,3.72-2.656A4.084,4.084,0,0,1,605.143,259.228Z"
        transform="translate(-358.165 -222.27)"
        fill="#ffffff"
      />
    </svg>
  </div>
);

// Vector X (Twitter) Logo Badge
const XLogoIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div 
    className={`${className} rounded-lg bg-black text-white flex items-center justify-center p-1.5 border border-slate-800 shadow-xs shrink-0 select-none overflow-hidden`}
    title="X Posting"
  >
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 text-white"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  </div>
);

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

                  {/* Dropdown Menu Flyout - 2 Switches only: arXiv icon + switch, X icon + switch */}
                  {isToolsOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-36 sm:w-40 rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/15 dark:shadow-black/60 p-2 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150"
                      role="menu"
                      aria-label="Configuration Switches"
                    >
                      {/* 1. arXiv switch (icon only next to switch) */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-900/70 transition-colors">
                        <ArxivLogoIcon className="w-8 h-8" />
                        <Switch
                          id="navbar-switch-arxiv"
                          checked={config.arxivGenerationEnabled}
                          onChange={toggleArxivGeneration}
                          activeColor="emerald"
                          ariaLabel="Toggle arXiv article generation"
                        />
                      </div>

                      {/* 2. X switch (icon only next to switch) */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-900/70 transition-colors">
                        <XLogoIcon className="w-8 h-8" />
                        <Switch
                          id="navbar-switch-x"
                          checked={config.xPostingEnabled}
                          onChange={toggleXPosting}
                          activeColor="cyan"
                          ariaLabel="Toggle X posting"
                        />
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

