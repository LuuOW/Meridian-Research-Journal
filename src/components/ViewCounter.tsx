import React from "react";
import { Eye, Users } from "lucide-react";
import { formatViews } from "../lib/viewCounter";

interface ViewCounterProps {
  views?: number;
  activeReaders?: number;
  className?: string;
  compact?: boolean;
  showActiveDot?: boolean;
}

export const ViewCounter: React.FC<ViewCounterProps> = ({
  views = 0,
  activeReaders,
  className = "",
  compact = false,
  showActiveDot = true,
}) => {
  // Format numbers nicely using standardized view formatter
  const formattedViews = formatViews(views);

  // Calculate default active readers if not explicitly provided
  const liveCount = activeReaders ?? (views > 0 ? (views % 11) + 2 : 3);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-neutral-400 dark:text-neutral-500 ${className}`}
        title={`${formattedViews} article views`}
      >
        <Eye className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
        <span>{formattedViews}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 transition-colors shadow-2xs ${className}`}
      title={`${formattedViews} total article views • ${liveCount} readers active now`}
    >
      {/* Eye icon & view count */}
      <span className="flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
        <span className="tracking-tight">{formattedViews}</span>
        <span className="text-[10px] uppercase font-sans text-neutral-400 dark:text-neutral-500 font-semibold">
          views
        </span>
      </span>

      {/* Separator dot */}
      <span className="text-neutral-300 dark:text-neutral-600 font-sans">•</span>

      {/* Active pulse & live reader count */}
      <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-sans font-medium">
        {showActiveDot && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400 ml-0.5" />
        <span>{liveCount} reading</span>
      </span>
    </div>
  );
};
