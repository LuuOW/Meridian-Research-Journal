import React from "react";
import katex from "katex";
import { latexToHumanReadable } from "../lib/titleSubtitlePipeline";

interface FormattedMathTextProps {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
}

/**
 * Renders text containing inline LaTeX math (e.g. $\mathsf{QAC}^0$, $\mathtt{PARITY}_n$)
 * using KaTeX with automatic graceful fallback to Unicode human-readable symbols.
 */
export const FormattedMathText: React.FC<FormattedMathTextProps> = ({
  text,
  className = "",
  as: Component = "span",
}) => {
  if (!text) return null;

  // Split by inline math tokens ($...$)
  const parts = text.split(/(\$[^\$]+\$)/g);

  return (
    <Component className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const formula = part.slice(1, -1);
          try {
            const html = katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={idx}
                className="inline-block px-0.5 align-baseline font-serif"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <span key={idx}>{latexToHumanReadable(formula)}</span>;
          }
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </Component>
  );
};
