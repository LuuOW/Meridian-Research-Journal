/**
 * Utility functions for color generation, contrast validation, and tag styling.
 */

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Converts a string tag into a deterministic hue (0-360) for consistent visual branding.
 */
export function getTagHue(tag: string): number {
  if (!tag) return 210; // Default cyan/blue hue
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * Returns tailored Tailwind CSS classes and inline badge color styles for an article tag.
 */
export function getTagStyle(tag: string): { bg: string; text: string; border: string; accentColor: string } {
  const clean = (tag || "").toLowerCase().trim();

  if (clean.includes("quantum") || clean.includes("qubit") || clean.includes("entanglement")) {
    return {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      text: "text-cyan-700 dark:text-cyan-300",
      border: "border-cyan-500/30",
      accentColor: "#06b6d4"
    };
  }

  if (clean.includes("optics") || clean.includes("laser") || clean.includes("photon") || clean.includes("coherent")) {
    return {
      bg: "bg-violet-500/10 dark:bg-violet-500/15",
      text: "text-violet-700 dark:text-violet-300",
      border: "border-violet-500/30",
      accentColor: "#8b5cf6"
    };
  }

  if (clean.includes("gravity") || clean.includes("cosmology") || clean.includes("spacetime") || clean.includes("black hole")) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-500/30",
      accentColor: "#f59e0b"
    };
  }

  if (clean.includes("thermodynamics") || clean.includes("entropy") || clean.includes("statistical")) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-500/30",
      accentColor: "#10b981"
    };
  }

  if (clean.includes("particle") || clean.includes("field theory") || clean.includes("gauge")) {
    return {
      bg: "bg-rose-500/10 dark:bg-rose-500/15",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-500/30",
      accentColor: "#f43f5e"
    };
  }

  const hue = getTagHue(clean);
  return {
    bg: `rgba(${hslToRgb(hue, 70, 50)}, 0.1)`,
    text: `hsl(${hue}, 75%, 45%)`,
    border: `rgba(${hslToRgb(hue, 70, 50)}, 0.25)`,
    accentColor: `hsl(${hue}, 70%, 50%)`
  };
}

/**
 * Converts HSL values to an RGB formatted string "r, g, b".
 */
export function hslToRgb(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));

  return `${r}, ${g}, ${b}`;
}

/**
 * Calculates relative luminance of an sRGB color (0.0 to 1.0).
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(val => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Computes the WCAG contrast ratio between two RGB colors (1.0 to 21.0).
 */
export function calculateContrastRatio(rgb1: RGBColor, rgb2: RGBColor): number {
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}
