// Helper to extract arXiv ID
export const extractArxivId = (input: string): string | null => {
  const urlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i);
  if (urlMatch) return urlMatch[1];
  const idMatch = input.match(/^(\d{4}\.\d{4,5})$/);
  if (idMatch) return idMatch[1];
  return null;
};

// Robust helper to sanitize and repair invalid JSON strings from LLM output
export const cleanJsonText = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  let result = "";
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    // Handle literal newlines inside string values
    if (inString && char === '\n') {
      result += '\\n';
      continue;
    }
    if (inString && char === '\r') {
      result += '\\r';
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    
    if (inString && char === '\\') {
      const nextChar = cleaned[i + 1];
      
      if (!nextChar) {
        result += '\\\\';
        continue;
      }
      
      let isLaTexOrInvalid = false;
      
      if (!"\\/bfnrtu\"".includes(nextChar)) {
        isLaTexOrInvalid = true;
      } else if ("bft".includes(nextChar)) {
        isLaTexOrInvalid = true;
      } else if (nextChar === 'u') {
        const fourChars = cleaned.substring(i + 2, i + 6);
        const isValidUnicode = /^[0-9a-fA-F]{4}$/.test(fourChars);
        if (!isValidUnicode) {
          isLaTexOrInvalid = true;
        }
      } else if (nextChar === 'n' || nextChar === 'r') {
        const afterNextChar = cleaned[i + 2] || "";
        if (/^[a-z]$/.test(afterNextChar)) {
          isLaTexOrInvalid = true;
        }
      }
      
      if (isLaTexOrInvalid) {
        result += '\\\\';
      } else {
        result += '\\';
        escapeNext = true;
      }
    } else {
      result += char;
    }
  }
  
  return result;
};

// Helper to generate a clean, safe URL slug from a title string
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

// Helper to parse arXiv XML payload and extract title, summary, and authors list
export interface ArxivMetadata {
  title: string;
  summary: string;
  authors: string;
}

export const parseArxivXml = (xml: string): ArxivMetadata => {
  const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/);
  const summaryMatch = xml.match(/<summary>([\s\S]*?)<\/summary>/);
  const authorMatches = [...xml.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)];
  
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "Unknown Paper Title";
  const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim() : "";
  const authors = authorMatches.map(m => m[1].trim()).slice(0, 3).join(", ");
  
  return { title, summary, authors };
};


