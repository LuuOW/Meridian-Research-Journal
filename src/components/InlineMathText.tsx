import React, { useMemo } from "react";
import katex from "katex";
import { latexToHumanReadable } from "../lib/titleSubtitlePipeline";

interface InlineMathTextProps {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
}

/**
 * InlineMathText renders text containing inline LaTeX math formulas (e.g. `$\\mathsf{QAC}^0$`)
 * using KaTeX with graceful fallback to human-readable plain text if rendering encounters errors.
 */
export const InlineMathText: React.FC<InlineMathTextProps> = ({
  text,
  className = "",
  as: Component = "span"
}) => {
  const parts = useMemo(() => {
    if (!text || typeof text !== "string") {
      return [{ type: "text" as const, content: "" }];
    }

    // Split on inline math delimiters: $...$
    const segments: Array<{ type: "text" | "math"; content: string; html?: string }> = [];
    const regex = /(?<!\\)\$(.*?)(?<!\\)\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          content: text.slice(lastIndex, match.index)
        });
      }

      const formula = match[1];
      try {
        const html = katex.renderToString(formula, {
          displayMode: false,
          throwOnError: false
        });
        segments.push({
          type: "math",
          content: formula,
          html
        });
      } catch {
        // Fall back to clean human-readable unicode text
        segments.push({
          type: "text",
          content: latexToHumanReadable(formula)
        });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex)
      });
    }

    return segments;
  }, [text]);

  return (
    <Component className={className}>
      {parts.map((part, index) => {
        if (part.type === "math" && part.html) {
          return (
            <span
              key={index}
              className="inline-block px-0.5 align-baseline font-sans font-normal not-italic"
              dangerouslySetInnerHTML={{ __html: part.html }}
            />
          );
        }
        return <React.Fragment key={index}>{part.content}</React.Fragment>;
      })}
    </Component>
  );
};
