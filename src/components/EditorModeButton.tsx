import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Unlock } from "lucide-react";

interface EditorModeButtonProps {
  isEditorMode: boolean;
  onToggleEditorMode: () => void;
  hasRunningJobs?: boolean;
  durationMs?: number; // 5 minutes (300,000 ms) default
}

export const EditorModeButton: React.FC<EditorModeButtonProps> = ({
  isEditorMode,
  onToggleEditorMode,
  hasRunningJobs = false,
  durationMs = 5 * 60 * 1000 // 5 minutes
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(durationMs);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  // Inactivity tracking & countdown loop
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isEditorMode) {
      setRemainingMs(durationMs);
      return;
    }

    lastActivityRef.current = Date.now();
    setRemainingMs(durationMs);

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];
    
    let lastEventTime = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastEventTime > 250) {
        lastEventTime = now;
        recordActivity();
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    let isCancelled = false;
    const updateLoop = () => {
      if (isCancelled) return;

      const elapsed = Date.now() - lastActivityRef.current;
      const left = Math.max(0, durationMs - elapsed);
      setRemainingMs(left);

      if (left <= 0) {
        if (!hasRunningJobs) {
          onToggleEditorMode();
          return;
        } else {
          // Defer lock while background tasks run
          lastActivityRef.current = Date.now();
          setRemainingMs(durationMs);
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, [isEditorMode, durationMs, hasRunningJobs, onToggleEditorMode, recordActivity]);

  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  const formattedTime = `${mins}:${secs.toString().padStart(2, "0")}`;

  // SVG Geometry for the discrete surrounding border
  const size = 40; // 40px container
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth * 2) / 2; // ~17.5px
  const circumference = 2 * Math.PI * radius;

  // Progress from 1 (full border) down to 0 (completely vanished)
  const progressRatio = Math.max(0, Math.min(1, remainingMs / durationMs));
  const strokeDashoffset = circumference * (1 - progressRatio);

  // Dynamic border color depending on time remaining
  let strokeColor = "#06b6d4"; // Cyan
  let glowColor = "rgba(6, 182, 212, 0.45)";
  let ringBg = "text-cyan-500";

  if (progressRatio < 0.15) { // under 45 seconds
    strokeColor = "#ef4444"; // Red
    glowColor = "rgba(239, 68, 68, 0.55)";
    ringBg = "text-red-500";
  } else if (progressRatio < 0.4) { // under 2 minutes
    strokeColor = "#f59e0b"; // Amber
    glowColor = "rgba(245, 158, 11, 0.5)";
    ringBg = "text-amber-500";
  } else {
    strokeColor = "#06b6d4"; // Cyan
    glowColor = "rgba(6, 182, 212, 0.45)";
    ringBg = "text-cyan-500";
  }

  const tooltipText = isEditorMode
    ? `Editor Mode (Unlocked) • ${formattedTime} remaining • Click to lock`
    : "Enable Editor Mode";

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Discrete Surrounding Border SVG (Active when Unlocked) */}
      {isEditorMode && (
        <svg
          className="absolute inset-0 pointer-events-none -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            filter: `drop-shadow(0 0 3px ${glowColor})`
          }}
        >
          {/* Subtle background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-neutral-200 dark:text-neutral-800 opacity-40"
            strokeWidth={1.5}
          />

          {/* Progress Vanishing Border */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-100 ease-linear"
          />
        </svg>
      )}

      {/* Actual Toggle Button */}
      <button
        id="navbar-editor-mode-toggle"
        onClick={onToggleEditorMode}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 z-10 ${
          isEditorMode
            ? "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20"
            : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
        }`}
        title={tooltipText}
        aria-label={tooltipText}
      >
        {isEditorMode ? (
          <Unlock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        ) : (
          <Lock className="w-4 h-4" />
        )}
      </button>

      {/* Discrete Time Pill on Hover */}
      {isEditorMode && isHovered && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-neutral-950 dark:bg-neutral-900 text-white text-[10px] font-mono font-bold rounded-md shadow-xl border border-neutral-800 whitespace-nowrap pointer-events-none z-50 animate-fade-in flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${progressRatio < 0.15 ? "bg-red-400 animate-pulse" : "bg-cyan-400"}`} />
          <span>Auto-lock: {formattedTime}</span>
        </div>
      )}
    </div>
  );
};
