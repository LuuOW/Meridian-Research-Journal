import React from "react";
import katex from "katex";

interface MathRendererProps {
  text: string;
}

// Robust helper to check if a matched segment inside $...$ is a math expression or currency/plain text
const isMath = (content: string): boolean => {
  const trimmed = content.trim();
  
  if (!trimmed) return false;
  if (trimmed.includes("\n")) return false;
  
  // Exclude pure currency/number patterns: e.g., 29, 0, 0.02, 10k, 30M, 100k, 0.011, 0.10, ~0.02
  if (/^~?\d+(?:\.\d+)?\s*[kKmMbB]?$/.test(trimmed)) {
    return false;
  }
  
  // Reject long strings (probably separate unrelated dollar symbols in same paragraph)
  if (trimmed.length > 80) return false;
  
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
  
  // If it doesn't have any letters but is a math expression like 2\times 2 or 1 - s
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

export const MathRenderer: React.FC<MathRendererProps> = ({ text }) => {
  if (!text) return null;

  // Pre-extract all multi-line and single-line block math (delimited by $$ ... $$)
  const blockMaths: { id: string; html: string }[] = [];
  let preprocessedText = "";
  let lastBlockIndex = 0;
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  let blockMatch;
  let blockCount = 0;

  while ((blockMatch = blockRegex.exec(text)) !== null) {
    const content = blockMatch[1];
    let renderedHtml = "";
    try {
      renderedHtml = katex.renderToString(content.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch (err) {
      console.error("KaTeX block error:", err);
      renderedHtml = `<pre class="text-red-500 text-center my-4">$$\n${content}\n$$</pre>`;
    }
    
    const id = `___BLOCK_MATH_PLACEHOLDER_${blockCount}___`;
    blockMaths.push({ id, html: renderedHtml });
    
    preprocessedText += text.substring(lastBlockIndex, blockMatch.index) + id;
    lastBlockIndex = blockRegex.lastIndex;
    blockCount++;
  }
  preprocessedText += text.substring(lastBlockIndex);

  const renderInlineMathAndText = (plainText: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\$([^\$\n]+?)\$/g;
    let match;
    
    while ((match = regex.exec(plainText)) !== null) {
      const matchIndex = match.index;
      const fullMatch = match[0];
      const content = match[1];
      
      if (matchIndex > lastIndex) {
        parts.push(plainText.substring(lastIndex, matchIndex));
      }
      
      if (isMath(content)) {
        try {
          const html = katex.renderToString(content.trim(), {
            displayMode: false,
            throwOnError: false,
          });
          parts.push(
            <span
              key={`inline-${matchIndex}`}
              className="inline-block px-1 font-mono text-slate-900"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (err) {
          console.error("KaTeX inline error:", err);
          parts.push(<code key={`inline-err-${matchIndex}`} className="text-red-500">${content}$</code>);
        }
      } else {
        parts.push(fullMatch);
      }
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < plainText.length) {
      parts.push(plainText.substring(lastIndex));
    }
    
    return parts;
  };

  const renderLine = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const placeholderRegex = /___BLOCK_MATH_PLACEHOLDER_(\d+)___/g;
    let match;
    
    while ((match = placeholderRegex.exec(line)) !== null) {
      const matchIndex = match.index;
      const placeholderIndex = parseInt(match[1], 10);
      const mathObj = blockMaths[placeholderIndex];
      
      if (matchIndex > lastIndex) {
        const textBefore = line.substring(lastIndex, matchIndex);
        parts.push(...renderInlineMathAndText(textBefore));
      }
      
      parts.push(
        <div
          key={`block-placeholder-${matchIndex}`}
          className="my-6 w-full overflow-x-auto py-2 text-slate-800"
          dangerouslySetInnerHTML={{ __html: mathObj.html }}
        />
      );
      
      lastIndex = placeholderRegex.lastIndex;
    }
    
    if (lastIndex < line.length) {
      const textAfter = line.substring(lastIndex);
      parts.push(...renderInlineMathAndText(textAfter));
    }
    
    return parts;
  };

  // Split content by newlines to preserve paragraphs and headings
  const paragraphs = preprocessedText.split("\n");
  
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
          <div key={`p-${pIdx}`} className="mb-4 leading-relaxed">
            {renderLine(p)}
          </div>
        );
      })}
    </div>
  );
};
