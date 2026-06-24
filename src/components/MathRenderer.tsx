import React from "react";
import katex from "katex";

interface MathRendererProps {
  text: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text }) => {
  if (!text) return null;

  // Render inline and block equations
  // Split by $$ first for block math, then by $ for inline math
  const renderLine = (line: string): React.ReactNode[] => {
    const blocks = line.split("$$");
    return blocks.map((block, idx) => {
      // Every odd index is a block formula
      if (idx % 2 !== 0) {
        try {
          const html = katex.renderToString(block.trim(), {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <div
              key={`block-${idx}`}
              className="my-6 overflow-x-auto py-2 flex justify-center text-slate-800"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (err) {
          console.error("KaTeX block error:", err);
          return <pre key={`block-err-${idx}`} className="text-red-500 text-center my-4">$$\n{block}\n$$</pre>;
        }
      }

      // Even indices contain standard text which might have inline formulas
      const inlines = block.split("$");
      return (
        <span key={`text-${idx}`}>
          {inlines.map((segment, sIdx) => {
            // Every odd index is an inline formula
            if (sIdx % 2 !== 0) {
              try {
                const html = katex.renderToString(segment.trim(), {
                  displayMode: false,
                  throwOnError: false,
                });
                return (
                  <span
                    key={`inline-${sIdx}`}
                    className="inline-block px-1 font-mono text-slate-900"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              } catch (err) {
                console.error("KaTeX inline error:", err);
                return <code key={`inline-err-${sIdx}`} className="text-red-500">${segment}$</code>;
              }
            }
            return <React.Fragment key={`plain-${sIdx}`}>{segment}</React.Fragment>;
          })}
        </span>
      );
    });
  };

  // Split content by newlines to preserve paragraphs and headings
  const paragraphs = text.split("\n");
  
  return (
    <div className="academic-body text-slate-700 leading-relaxed space-y-4">
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim();
        if (!trimmed) return <div key={`empty-${pIdx}`} className="h-4" />;
        
        // Handle headings
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={`h3-${pIdx}`} className="text-xl md:text-2xl font-bold text-slate-900 mt-8 mb-4 font-display tracking-tight border-b border-slate-100 pb-2 flex items-center">
              {renderLine(trimmed.replace("### ", ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={`h2-${pIdx}`} className="text-2xl md:text-3xl font-bold text-slate-900 mt-10 mb-4 font-display tracking-tight border-b border-slate-100 pb-2">
              {renderLine(trimmed.replace("## ", ""))}
            </h2>
          );
        }
        
        // Handle horizontal rule
        if (trimmed === "---") {
          return <hr key={`hr-${pIdx}`} className="my-8 border-slate-200" />;
        }
        
        // Handle list items
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <ul key={`ul-${pIdx}`} className="list-disc pl-6 space-y-1 my-2">
              <li className="text-slate-700">{renderLine(trimmed.substring(2))}</li>
            </ul>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s(.*)/);
          if (match) {
            return (
              <ol key={`ol-${pIdx}`} className="list-decimal pl-6 space-y-1 my-2">
                <li className="text-slate-700">{renderLine(match[2])}</li>
              </ol>
            );
          }
        }
        
        // Handle blockquotes
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={`quote-${pIdx}`} className="border-l-4 border-cyan-500 bg-slate-50 pl-4 py-3 pr-3 my-4 rounded-r-md italic text-slate-600 font-sans">
              {renderLine(trimmed.substring(2))}
            </blockquote>
          );
        }
        
        // Default paragraph
        return (
          <p key={`p-${pIdx}`} className="mb-4 leading-relaxed">
            {renderLine(p)}
          </p>
        );
      })}
    </div>
  );
};
