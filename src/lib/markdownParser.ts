/**
 * Markdown utility functions for parsing article sections, extracting code blocks,
 * finding citations, and counting structural elements.
 */

export interface MarkdownBlock {
  type: "heading" | "paragraph" | "code" | "math" | "blockquote" | "list";
  content: string;
  level?: number;
  language?: string;
}

export interface MarkdownStats {
  headingsCount: number;
  codeBlocksCount: number;
  mathBlocksCount: number;
  paragraphCount: number;
  wordCount: number;
}

/**
 * Splits markdown content into structural typed blocks.
 */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  if (!markdown || typeof markdown !== "string") return [];

  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = "";
  let inMathBlock = false;
  let mathBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join("\n").trim();
      if (text) {
        blocks.push({ type: "paragraph", content: text });
      }
      paragraphBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check code fence
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          type: "code",
          content: codeBuffer.join("\n"),
          language: codeLanguage || "text"
        });
        codeBuffer = [];
        codeLanguage = "";
        inCodeBlock = false;
      } else {
        flushParagraph();
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Check display math $$
    if (trimmed === "$$" || (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 2)) {
      flushParagraph();
      if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 2) {
        blocks.push({
          type: "math",
          content: trimmed.slice(2, -2).trim()
        });
      } else if (inMathBlock) {
        blocks.push({
          type: "math",
          content: mathBuffer.join("\n").trim()
        });
        mathBuffer = [];
        inMathBlock = false;
      } else {
        inMathBlock = true;
      }
      continue;
    }

    if (inMathBlock) {
      mathBuffer.push(line);
      continue;
    }

    // Check headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim()
      });
      continue;
    }

    // Check blockquote
    if (line.startsWith(">")) {
      flushParagraph();
      blocks.push({
        type: "blockquote",
        content: line.replace(/^>\s*/, "").trim()
      });
      continue;
    }

    // Blank line flushes paragraph
    if (trimmed === "") {
      flushParagraph();
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return blocks;
}

/**
 * Calculates comprehensive structural statistics for a markdown article.
 */
export function getMarkdownStats(markdown: string): MarkdownStats {
  const blocks = parseMarkdownBlocks(markdown);
  
  let headingsCount = 0;
  let codeBlocksCount = 0;
  let mathBlocksCount = 0;
  let paragraphCount = 0;

  for (const block of blocks) {
    if (block.type === "heading") headingsCount++;
    else if (block.type === "code") codeBlocksCount++;
    else if (block.type === "math") mathBlocksCount++;
    else if (block.type === "paragraph") paragraphCount++;
  }

  const cleanText = (markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/#+\s+/g, " ")
    .replace(/[*_`]/g, " ")
    .trim();

  const words = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];

  return {
    headingsCount,
    codeBlocksCount,
    mathBlocksCount,
    paragraphCount,
    wordCount: words.length
  };
}

/**
 * Extracts all external and internal links from a markdown document.
 */
export function extractMarkdownLinks(markdown: string): Array<{ text: string; url: string }> {
  if (!markdown) return [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: Array<{ text: string; url: string }> = [];
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({
      text: match[1].trim(),
      url: match[2].trim()
    });
  }
  return links;
}
