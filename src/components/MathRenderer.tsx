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

  // Clean up escaped characters, literal backslash-n, and escaped quotes
  const cleanText = text
    .replace(/\\n/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');

  // Pre-extract all multi-line and single-line block math (delimited by $$ ... $$)
  const blockMaths: { id: string; html: string }[] = [];
  let preprocessedText = "";
  let lastBlockIndex = 0;
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  let blockMatch;
  let blockCount = 0;

  while ((blockMatch = blockRegex.exec(cleanText)) !== null) {
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
    
    preprocessedText += cleanText.substring(lastBlockIndex, blockMatch.index) + id;
    lastBlockIndex = blockRegex.lastIndex;
    blockCount++;
  }
  preprocessedText += cleanText.substring(lastBlockIndex);

  const parseMarkdownFormatting = (text: string): React.ReactNode[] => {
    const regex = /(`[^`\n]+`|\*\*([^*]+)\*\*|__([^_]+)__|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*|_([^_]+)_)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const fullMatch = match[0];
      
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }
      
      if (fullMatch.startsWith("`") && fullMatch.endsWith("`")) {
        const codeText = fullMatch.slice(1, -1);
        parts.push(
          <code key={`code-${matchIndex}`} className="px-1.5 py-0.5 font-mono text-xs bg-slate-100 rounded text-slate-800">
            {codeText}
          </code>
        );
      } else if (fullMatch.startsWith("**") && fullMatch.endsWith("**")) {
        const boldText = match[2];
        parts.push(<strong key={`bold-${matchIndex}`} className="font-bold text-slate-900">{boldText}</strong>);
      } else if (fullMatch.startsWith("__") && fullMatch.endsWith("__")) {
        const boldText = match[3];
        parts.push(<strong key={`bold-${matchIndex}`} className="font-bold text-slate-900">{boldText}</strong>);
      } else if (fullMatch.startsWith("[") && fullMatch.includes("](")) {
        const linkText = match[4];
        const linkUrl = match[5];
        parts.push(
          <a 
            key={`link-${matchIndex}`} 
            href={linkUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-cyan-600 hover:text-cyan-800 underline inline-flex items-center gap-0.5 font-medium transition-colors"
          >
            {linkText}
          </a>
        );
      } else if (fullMatch.startsWith("*") && fullMatch.endsWith("*")) {
        const italicText = match[6];
        parts.push(<em key={`italic-${matchIndex}`} className="italic text-slate-800">{italicText}</em>);
      } else if (fullMatch.startsWith("_") && fullMatch.endsWith("_")) {
        const italicText = match[7];
        parts.push(<em key={`italic-${matchIndex}`} className="italic text-slate-800">{italicText}</em>);
      } else {
        parts.push(fullMatch);
      }
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };

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
        parts.push(...parseMarkdownFormatting(plainText.substring(lastIndex, matchIndex)));
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
        parts.push(...parseMarkdownFormatting(fullMatch));
      }
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < plainText.length) {
      parts.push(...parseMarkdownFormatting(plainText.substring(lastIndex)));
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

  // Split content by newlines and collapse multiple consecutive empty lines
  const rawParagraphs = preprocessedText.split("\n");
  const paragraphs: string[] = [];
  let lastWasEmpty = false;
  
  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    if (!trimmed) {
      if (!lastWasEmpty) {
        paragraphs.push("");
        lastWasEmpty = true;
      }
    } else {
      paragraphs.push(p);
      lastWasEmpty = false;
    }
  }

  // Define types for structured block rendering
  interface Block {
    type: "heading" | "horizontal-rule" | "list-unordered" | "list-ordered" | "blockquote" | "paragraph" | "empty";
    level?: number;
    content: string;
    items?: string[];
  }

  const blocks: Block[] = [];
  let currentList: { type: "unordered" | "ordered"; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: currentList.type === "unordered" ? "list-unordered" : "list-ordered",
        content: "",
        items: currentList.items
      });
      currentList = null;
    }
  };

  for (const p of paragraphs) {
    const trimmed = p.trim();
    
    if (!trimmed) {
      flushList();
      blocks.push({ type: "empty", content: "" });
      continue;
    }

    // Check for headings: e.g. #, ##, ###, ####, followed by optional commas, spaces, and text
    const headingMatch = trimmed.match(/^(#{1,4})\s*,?\s*(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      let content = headingMatch[2].trim();
      
      // Clean up any leading/trailing commas or junk from heading content
      content = content.replace(/^,\s*/, "").replace(/,$/, "").trim();
      
      if (content) {
        blocks.push({ type: "heading", level, content });
      } else {
        blocks.push({ type: "paragraph", content: trimmed });
      }
      continue;
    }

    // Horizontal rule: ---, ***, ___
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "horizontal-rule", content: trimmed });
      continue;
    }

    // Unordered list item: starts with "- " or "* "
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const itemContent = trimmed.substring(2).trim();
      if (currentList && currentList.type === "unordered") {
        currentList.items.push(itemContent);
      } else {
        flushList();
        currentList = { type: "unordered", items: [itemContent] };
      }
      continue;
    }

    // Ordered list item: starts with digits followed by dot and space (e.g., "1. ")
    const orderedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (orderedMatch) {
      const itemContent = orderedMatch[2].trim();
      if (currentList && currentList.type === "ordered") {
        currentList.items.push(itemContent);
      } else {
        flushList();
        currentList = { type: "ordered", items: [itemContent] };
      }
      continue;
    }

    // Blockquote: starts with "> "
    if (trimmed.startsWith("> ")) {
      flushList();
      blocks.push({ type: "blockquote", content: trimmed.substring(2).trim() });
      continue;
    }

    // Normal paragraph
    flushList();
    blocks.push({ type: "paragraph", content: p });
  }
  flushList();

  return (
    <div className="academic-body text-slate-700 leading-relaxed space-y-4">
      {blocks.map((block, bIdx) => {
        switch (block.type) {
          case "empty":
            return <div key={`empty-${bIdx}`} className="h-4" />;
            
          case "heading": {
            const level = block.level || 3;
            if (level === 1) {
              return (
                <h1 key={`h1-${bIdx}`} className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mt-12 mb-6 tracking-tight border-b border-slate-100 pb-3">
                  {renderLine(block.content)}
                </h1>
              );
            }
            if (level === 2) {
              return (
                <h2 key={`h2-${bIdx}`} className="text-2xl md:text-3xl font-bold text-slate-900 mt-10 mb-4 font-display tracking-tight border-b border-slate-100 pb-2">
                  {renderLine(block.content)}
                </h2>
              );
            }
            if (level === 3) {
              return (
                <h3 key={`h3-${bIdx}`} className="text-xl md:text-2xl font-bold text-slate-900 mt-8 mb-4 font-display tracking-tight border-b border-slate-100 pb-2 flex items-center">
                  {renderLine(block.content)}
                </h3>
              );
            }
            return (
              <h4 key={`h4-${bIdx}`} className="text-lg md:text-xl font-bold text-slate-900 mt-6 mb-3 tracking-tight">
                {renderLine(block.content)}
              </h4>
            );
          }
          
          case "horizontal-rule":
            return <hr key={`hr-${bIdx}`} className="my-8 border-slate-200" />;
            
          case "list-unordered":
            return (
              <ul key={`ul-${bIdx}`} className="list-disc pl-6 space-y-2 my-4">
                {(block.items || []).map((item, iIdx) => (
                  <li key={`li-${iIdx}`} className="text-slate-700">{renderLine(item)}</li>
                ))}
              </ul>
            );
            
          case "list-ordered":
            return (
              <ol key={`ol-${bIdx}`} className="list-decimal pl-6 space-y-2 my-4">
                {(block.items || []).map((item, iIdx) => (
                  <li key={`li-${iIdx}`} className="text-slate-700">{renderLine(item)}</li>
                ))}
              </ol>
            );
            
          case "blockquote":
            return (
              <blockquote key={`quote-${bIdx}`} className="border-l-4 border-cyan-500 bg-slate-50 pl-4 py-3 pr-3 my-4 rounded-r-md italic text-slate-600 font-sans">
                {renderLine(block.content)}
              </blockquote>
            );
            
          case "paragraph":
          default:
            return (
              <div key={`p-${bIdx}`} className="mb-4 leading-relaxed">
                {renderLine(block.content)}
              </div>
            );
        }
      })}
    </div>
  );
};
