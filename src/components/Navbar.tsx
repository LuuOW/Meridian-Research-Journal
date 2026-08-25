import React from "react";
import { Sparkles, Compass, Sun, Moon, Activity, Loader2, DollarSign } from "lucide-react";
import { GenerationJob } from "../types";
import { EditorModeButton } from "./EditorModeButton";

interface NavbarProps {
  onOpenCreate: () => void;
  onOpenAbout: () => void;
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
                Symmetry &amp; Quantum Informatics
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
          {isEditorMode && (
            <div className="flex items-center gap-1.5 sm:gap-2 animate-fade-in">
              {/* AdSense Revenue Tracker Pill */}
              {onOpenAdSenseRevenue && (
                <button
                  id="navbar-adsense-revenue-btn"
                  onClick={onOpenAdSenseRevenue}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-mono font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20 shadow-sm active:scale-95 whitespace-nowrap"
                  title="Open AdSense Revenue & Telemetry Console"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">AdSense</span>
                  {todayRevenueEstimate && (
                    <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 ml-0.5">
                      {todayRevenueEstimate}
                    </span>
                  )}
                </button>
              )}

              {/* Dedicated Pipeline Status Mode Button */}
              {onOpenPipelineStatus && (
                <button
                  id="navbar-pipeline-status-btn"
                  onClick={onOpenPipelineStatus}
                  className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-mono font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border active:scale-95 whitespace-nowrap ${
                    runningCount > 0
                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 shadow-sm"
                      : totalActive > 0
                      ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                      : "bg-transparent text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  }`}
                  title="Open Generation Pipeline Status Console"
                >
                  {runningCount > 0 ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                  ) : (
                    <Activity className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Pipeline Status</span>
                  <span className="sm:hidden text-[11px]">Pipeline</span>
                  {runningCount > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping inline-block -ml-0.5" />
                  ) : totalActive > 0 ? (
                    <span className="px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-800 text-[9px] rounded-full">
                      {totalActive}
                    </span>
                  ) : null}
                </button>
              )}

              <button
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

