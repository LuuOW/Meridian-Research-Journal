import React from "react";

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  activeColor?: "cyan" | "emerald" | "amber" | "indigo";
  size?: "sm" | "md";
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  activeColor = "cyan",
  size = "md",
}) => {
  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle(e);
    }
  };

  const activeColorClasses = {
    cyan: "bg-cyan-500 shadow-sm shadow-cyan-500/30",
    emerald: "bg-emerald-500 shadow-sm shadow-emerald-500/30",
    amber: "bg-amber-500 shadow-sm shadow-amber-500/30",
    indigo: "bg-indigo-500 shadow-sm shadow-indigo-500/30",
  }[activeColor];

  const trackWidthClass = size === "sm" ? "w-8 h-4.5" : "w-10 h-5.5";
  const knobSizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";
  const translateClass = size === "sm" ? "translate-x-3.5" : "translate-x-4.5";

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-950 ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${
        checked
          ? activeColorClasses
          : "bg-slate-200 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700/80"
      } ${trackWidthClass}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block rounded-full bg-white shadow-xs transform transition duration-200 ease-in-out ${knobSizeClass} ${
          checked ? `${translateClass} bg-white` : "translate-x-0 bg-white dark:bg-slate-300"
        }`}
      />
    </button>
  );
};
