/**
 * Helper utilities for analyzing and rendering LaTeX equations vs dollar/currency expressions.
 */

export const isMathExpression = (content: string): boolean => {
  const trimmed = content.trim();
  
  if (!trimmed) return false;
  if (trimmed.includes("\n")) return false;
  
  // Exclude pure currency/number patterns: e.g., 29, 0, 0.02, 10k, 30M, 100k, 0.011, 0.10, ~0.02
  if (/^~?\d+(?:\.\d+)?\s*[kKmMbB]?$/.test(trimmed)) {
    return false;
  }
  
  // Reject common words that are definitely not math
  if (/\b(until|cross|requests|million|tokens|per|day|month|year|dollars?|cents?|off|free)\b/i.test(trimmed)) {
    return false;
  }
  
  // Check if it has math-like characters or LaTeX backslash, or is a single short variable like x, p, g, T, etc.
  const hasLaTexCommand = trimmed.includes("\\") || trimmed.includes("_") || trimmed.includes("^") || trimmed.includes("{") || trimmed.includes("}") || trimmed.includes("=") || trimmed.includes("+") || trimmed.includes("-") || trimmed.includes("<") || trimmed.includes(">") || trimmed.includes("*") || trimmed.includes("/") || trimmed.includes("(") || trimmed.includes(")") || trimmed.includes("[") || trimmed.includes("]") || trimmed.includes("|") || trimmed.includes(",") || trimmed.includes(";");
  
  // If it's a single letter (e.g. $k$, $p$, $g$, $T$, $x$, $i$, $j$, $s$), it's math
  if (/^[a-zA-Z]$/.test(trimmed)) {
    return true;
  }
  
  // If it has math-like operators or LaTeX commands
  if (hasLaTexCommand) {
    return true;
  }
  
  // If it has multiple spaces without math-like characters, it's probably not math
  const spaces = (trimmed.match(/\s+/g) || []).length;
  if (spaces > 2) {
    return false;
  }
  
  return true;
};

export const sanitizeLatexFormula = (latex: string): string => {
  if (!latex) return "";
  return latex
    .trim()
    .replace(/^\\\[/, "")
    .replace(/\\\]$/, "")
    .replace(/^\$\$/, "")
    .replace(/\$\$$/, "")
    .trim();
};
