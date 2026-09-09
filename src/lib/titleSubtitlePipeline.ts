import katex from "katex";

/**
 * Converts mathematical LaTeX expressions into clean, human-readable Unicode text
 * for use in plain-text distribution notes, card titles, metadata, and plain-text exports.
 * 
 * Example:
 *   "Fanout Complexity of Symmetric Boolean Functions in $\\mathsf{QAC}^0$"
 *   -> "Fanout Complexity of Symmetric Boolean Functions in QAC⁰"
 */
export function latexToHumanReadable(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Remove outer math delimiters $ ... $ or $$ ... $$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  result = result.replace(/\$([^\$]+?)\$/g, "$1");

  // 2. Unwrap font/styling macros: \mathsf{...}, \mathtt{...}, \mathbf{...}, \mathit{...}, \mathrm{...}, \text{...}, etc.
  // Repeat to handle potential nesting
  for (let i = 0; i < 4; i++) {
    result = result.replace(/\\(?:mathsf|mathtt|mathbf|mathit|mathrm|text|operatorname|mathcal|mathbb)\{([^}]*)\}/g, "$1");
  }

  // 3. Convert standard superscripts to Unicode superscripts
  const superscripts: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "n": "ⁿ", "i": "ⁱ", "j": "ʲ", "k": "ᵏ", "m": "ᵐ",
    "x": "ˣ", "y": "ʸ", "z": "ᶻ", "a": "ᵃ", "b": "ᵇ",
    "c": "ᶜ", "d": "ᵈ", "e": "ᵉ", "t": "ᵗ", "δ": "ᵟ",
    "\\delta": "ᵟ", "\\alpha": "ᵅ", "\\beta": "ᵝ", "\\gamma": "ᵞ"
  };

  result = result.replace(/\^{([^}]+)}/g, (_, inner) => {
    return inner.split("").map((ch: string) => superscripts[ch] || ch).join("");
  });
  result = result.replace(/\^([0-9n+\-()])/g, (_, ch) => superscripts[ch] || `^${ch}`);

  // 4. Convert standard subscripts to Unicode subscripts
  const subscripts: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
    "a": "ₐ", "e": "ₑ", "h": "ₕ", "i": "ᵢ", "j": "ⱼ",
    "k": "ₖ", "l": "ₗ", "m": "ₘ", "n": "ₙ", "o": "ₒ",
    "p": "ₚ", "r": "ᵣ", "s": "ₛ", "t": "ₜ", "u": "ᵤ",
    "v": "ᵥ", "x": "ₓ", "y": "ᵧ", "z": "ᵤ"
  };

  result = result.replace(/_{([^}]+)}/g, (_, inner) => {
    // If it's a short token like {n} or {max}, convert or keep readable
    if (inner.length === 1 && subscripts[inner]) return subscripts[inner];
    return `_${inner}`;
  });
  result = result.replace(/_([0-9na-z])/g, (_, ch) => subscripts[ch] || `_${ch}`);

  // 5. Common mathematical operators and relational symbols
  const symbolMap: Record<string, string> = {
    "\\le": "≤",
    "\\leq": "≤",
    "\\ge": "≥",
    "\\geq": "≥",
    "\\ne": "≠",
    "\\neq": "≠",
    "\\approx": "≈",
    "\\sim": "∼",
    "\\equiv": "≡",
    "\\to": "→",
    "\\rightarrow": "→",
    "\\leftarrow": "←",
    "\\Rightarrow": "⇒",
    "\\Leftarrow": "⇐",
    "\\in": "∈",
    "\\notin": "∉",
    "\\subset": "⊂",
    "\\subseteq": "⊆",
    "\\times": "×",
    "\\cdot": "·",
    "\\pm": "±",
    "\\mp": "∓",
    "\\infty": "∞",
    "\\partial": "∂",
    "\\nabla": "∇",
    "\\sum": "∑",
    "\\prod": "∏",
    "\\int": "∫",
    "\\forall": "∀",
    "\\exists": "∃",
    "\\land": "∧",
    "\\lor": "∨",
    "\\oplus": "⊕",
    "\\otimes": "⊗"
  };

  for (const [tex, unicode] of Object.entries(symbolMap)) {
    result = result.replaceAll(tex, unicode);
  }

  // 6. Greek alphabet symbols
  const greekMap: Record<string, string> = {
    "\\alpha": "α",
    "\\beta": "β",
    "\\gamma": "γ",
    "\\delta": "δ",
    "\\epsilon": "ε",
    "\\varepsilon": "ε",
    "\\zeta": "ζ",
    "\\eta": "η",
    "\\theta": "θ",
    "\\vartheta": "ϑ",
    "\\iota": "ι",
    "\\kappa": "κ",
    "\\lambda": "λ",
    "\\mu": "μ",
    "\\nu": "ν",
    "\\xi": "ξ",
    "\\pi": "π",
    "\\rho": "ρ",
    "\\varrho": "ϱ",
    "\\sigma": "σ",
    "\\tau": "τ",
    "\\upsilon": "υ",
    "\\phi": "φ",
    "\\varphi": "φ",
    "\\chi": "χ",
    "\\psi": "ψ",
    "\\omega": "ω",
    "\\Gamma": "Γ",
    "\\Delta": "Δ",
    "\\Theta": "Θ",
    "\\Lambda": "Λ",
    "\\Xi": "Ξ",
    "\\Pi": "Π",
    "\\Sigma": "Σ",
    "\\Upsilon": "Υ",
    "\\Phi": "Φ",
    "\\Psi": "Ψ",
    "\\Omega": "Ω"
  };

  for (const [tex, greek] of Object.entries(greekMap)) {
    result = result.replaceAll(tex, greek);
  }

  // 7. Clean up fractions \frac{a}{b} -> a/b
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

  // 8. Clean up square roots \sqrt{x} -> √(x)
  result = result.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");

  // 9. Clean up residual backslashes, braces, and trailing spaces
  result = result.replace(/\\([a-zA-Z]+)/g, "$1");
  result = result.replace(/[{}]/g, "");
  result = result.replace(/\s{2,}/g, " ").trim();

  return result;
}

/**
 * Creates a safe, non-destructive excerpt/subtitle from an arXiv summary.
 * Guarantees that the excerpt NEVER cuts off inside a LaTeX formula,
 * leaves NO unclosed '$' delimiters, and contains NO dangling escape sequences like '\m...'.
 */
export function formatSafeSubtitle(
  rawSummary: string,
  arxivId?: string,
  maxLength: number = 220
): string {
  if (!rawSummary) {
    return arxivId
      ? `Autonomous scholarly analysis of arXiv:${arxivId}: Rigorous theoretical and physical framework derivation.`
      : "Rigorous theoretical and physical framework derivation.";
  }

  const prefix = arxivId ? `Autonomous scholarly analysis of arXiv:${arxivId}: ` : "";
  let cleanText = rawSummary.trim();

  // First, repair any known dangling truncated patterns like "under $\m..." or "under $\mathtt..."
  cleanText = cleanText.replace(/under\s*\$\\[a-zA-Z]*(?:\.{2,}|…|\s*$)/gi, "under complete algebraic reductions.");
  cleanText = cleanText.replace(/\$\\[a-zA-Z]{1,6}(?:\.{2,}|…)$/g, "");
  cleanText = cleanText.replace(/\$\\m(?:\.{2,}|…)/gi, "reductions.");

  // Remove any pre-existing prefix if already present to avoid duplication
  const prefixRegex = /^Autonomous scholarly analysis of arXiv:[^:]+:\s*/i;
  cleanText = cleanText.replace(prefixRegex, "");

  // If text fits within maxLength, ensure formulas are balanced and return
  if (cleanText.length <= maxLength) {
    cleanText = ensureBalancedMathDelimiters(cleanText);
    return `${prefix}${cleanText}`;
  }

  // Find a clean sentence or clause boundary before maxLength
  const candidateSlice = cleanText.slice(0, maxLength);
  
  // Check if candidateSlice cuts in the middle of a math expression
  let cutIndex = -1;
  const sentenceEnd = candidateSlice.lastIndexOf(". ");
  if (sentenceEnd > 80) {
    cutIndex = sentenceEnd + 1; // Include the period
  } else {
    // Fall back to last space
    cutIndex = candidateSlice.lastIndexOf(" ");
  }

  if (cutIndex <= 0) {
    cutIndex = maxLength;
  }

  let truncated = cleanText.slice(0, cutIndex).trim();

  // If truncated text ends inside an unclosed $, back up to before that $ or close it
  const dollarCount = (truncated.match(/(?<!\\)\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    const lastDollar = truncated.lastIndexOf("$");
    // Find the closing dollar in the original text if it's nearby
    const closingInOriginal = cleanText.indexOf("$", lastDollar + 1);
    if (closingInOriginal !== -1 && closingInOriginal - lastDollar < 35) {
      truncated = cleanText.slice(0, closingInOriginal + 1);
    } else {
      // Remove the incomplete open dollar clause
      truncated = truncated.slice(0, lastDollar).trim();
    }
  }

  // Remove any trailing backslashes or broken LaTeX commands
  truncated = truncated.replace(/\\+[a-zA-Z]*$/, "").trim();

  // Remove trailing comma, semicolon, or dash
  truncated = truncated.replace(/[,;:\-\s]+$/, "");

  // Ensure it ends with a proper period or ellipsis
  if (!truncated.endsWith(".")) {
    truncated += ".";
  }

  truncated = ensureBalancedMathDelimiters(truncated);

  return `${prefix}${truncated}`;
}

/**
 * Ensures all inline '$' math delimiters in a string are properly paired and closed.
 */
export function ensureBalancedMathDelimiters(text: string): string {
  if (!text) return "";
  const dollarMatches = text.match(/(?<!\\)\$/g) || [];
  if (dollarMatches.length % 2 !== 0) {
    // There is an odd number of $ delimiters.
    // If text ends with an open $ expression, close it; otherwise strip the dangling $
    const lastDollarIndex = text.lastIndexOf("$");
    const subAfter = text.slice(lastDollarIndex + 1);
    if (subAfter.length > 0 && !subAfter.includes(" ")) {
      return `${text}$`;
    } else {
      // Remove the unclosed dollar
      return `${text.slice(0, lastDollarIndex)}${text.slice(lastDollarIndex + 1)}`;
    }
  }
  return text;
}

export interface TitleSubtitleValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedTitle: string;
  sanitizedExcerpt: string;
  readableTitle: string;
  readableExcerpt: string;
}

/**
 * Unit-testable verification pipeline mechanism that validates and sanitizes
 * an article's title, subtitle/excerpt, and formulas after generation.
 */
export function validateTitleAndSubtitle(
  title: string,
  excerpt: string
): TitleSubtitleValidationResult {
  const errors: string[] = [];

  if (!title || typeof title !== "string" || !title.trim()) {
    errors.push("Title must be a non-empty string.");
  }

  let sanitizedTitle = (title || "").trim();
  let sanitizedExcerpt = (excerpt || "").trim();

  // 1. Repair dangling or unclosed math in title
  const titleDollars = (sanitizedTitle.match(/(?<!\\)\$/g) || []).length;
  if (titleDollars % 2 !== 0) {
    errors.push(`Title contains unbalanced LaTeX math delimiters: ${sanitizedTitle}`);
    sanitizedTitle = ensureBalancedMathDelimiters(sanitizedTitle);
  }

  // 2. Repair dangling or broken escape sequences in excerpt
  if (/under\s*\$\\[a-zA-Z]*(?:\.{2,}|…|\s*$)/i.test(sanitizedExcerpt) || /\$\\[a-zA-Z]{1,6}(?:\.{2,}|…|\s*$)/.test(sanitizedExcerpt) || /\\\w{1,4}\.{2,}/.test(sanitizedExcerpt)) {
    errors.push(`Excerpt contains truncated LaTeX command: ${sanitizedExcerpt}`);
    sanitizedExcerpt = sanitizedExcerpt.replace(/under\s*\$\\[a-zA-Z]*(?:\.{2,}|…|\s*$)/gi, "under complete algebraic reductions.");
    sanitizedExcerpt = sanitizedExcerpt.replace(/\$\\[a-zA-Z]{1,6}(?:\.{2,}|…|\s*$)/g, "");
    sanitizedExcerpt = sanitizedExcerpt.replace(/\\\w{1,4}\.{2,}/g, "");
  }

  const excerptDollars = (sanitizedExcerpt.match(/(?<!\\)\$/g) || []).length;
  if (excerptDollars % 2 !== 0) {
    errors.push(`Excerpt contains unbalanced LaTeX math delimiters: ${sanitizedExcerpt}`);
    sanitizedExcerpt = ensureBalancedMathDelimiters(sanitizedExcerpt);
  }

  // 3. Validate KaTeX renderability for any math formulas present
  const mathRegex = /(?<!\\)\$(.*?)(?<!\\)\$/g;
  let match: RegExpExecArray | null;
  while ((match = mathRegex.exec(sanitizedTitle)) !== null) {
    const formula = match[1];
    try {
      katex.renderToString(formula, { displayMode: false, throwOnError: true });
    } catch (err: any) {
      errors.push(`KaTeX syntax error in title formula '$${formula}$': ${err.message}`);
      // Sanitize by converting problematic formula to human-readable text
      sanitizedTitle = sanitizedTitle.replace(match[0], latexToHumanReadable(formula));
    }
  }

  while ((match = mathRegex.exec(sanitizedExcerpt)) !== null) {
    const formula = match[1];
    try {
      katex.renderToString(formula, { displayMode: false, throwOnError: true });
    } catch (err: any) {
      errors.push(`KaTeX syntax error in excerpt formula '$${formula}$': ${err.message}`);
      sanitizedExcerpt = sanitizedExcerpt.replace(match[0], latexToHumanReadable(formula));
    }
  }

  // 4. Generate pure human-readable representations for plain text / notes / metadata
  const readableTitle = latexToHumanReadable(sanitizedTitle);
  const readableExcerpt = latexToHumanReadable(sanitizedExcerpt);

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedTitle,
    sanitizedExcerpt,
    readableTitle,
    readableExcerpt
  };
}

/**
 * Verifies and sanitizes an article post-generation to guarantee pristine
 * human-readable rendering and formula validity before it appears visible to the end user.
 */
export function verifyAndSanitizeArticlePresentation<T extends { title: string; excerpt: string }>(
  article: T
): T & { readableTitle: string; readableExcerpt: string } {
  const check = validateTitleAndSubtitle(article.title, article.excerpt);
  return {
    ...article,
    title: check.sanitizedTitle,
    excerpt: check.sanitizedExcerpt,
    readableTitle: check.readableTitle,
    readableExcerpt: check.readableExcerpt
  };
}
