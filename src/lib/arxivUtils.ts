// Helper to extract arXiv ID
export const extractArxivId = (input: string): string | null => {
  const urlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})(?:v\d+)?/i);
  if (urlMatch) return urlMatch[1];
  const idMatch = input.match(/^(\d{4}\.\d{4,5})(?:v\d+)?$/);
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

// Helper to check if a date is a weekend (Saturday or Sunday)
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Helper to parse arXiv XML payload and extract title, summary, and authors list
export interface ArxivMetadata {
  title: string;
  summary: string;
  authors: string;
}

export const parseArxivXml = (xml: string): ArxivMetadata => {
  // Extract entry content if present to prevent matching the outer feed title/summary
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  const searchContent = entryMatch ? entryMatch[1] : xml;

  const titleMatch = searchContent.match(/<title>([\s\S]*?)<\/title>/);
  const summaryMatch = searchContent.match(/<summary>([\s\S]*?)<\/summary>/);
  const authorMatches = [...searchContent.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)];
  
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "Unknown Paper Title";
  const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim() : "";
  const authors = authorMatches.map(m => m[1].trim()).slice(0, 3).join(", ");
  
  return { title, summary, authors };
};

export interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string;
  link: string;
}

export const parseArxivFeedXml = (xml: string): ArxivPaper[] => {
  const entries: ArxivPaper[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryContent = match[1];
    
    // Extract ID
    const idMatch = entryContent.match(/<id>[\s\S]*?(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i);
    const id = idMatch ? idMatch[1] : "";
    
    const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch = entryContent.match(/<summary>([\s\S]*?)<\/summary>/);
    const authorMatches = [...entryContent.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)];
    
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "Unknown Paper Title";
    const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim() : "";
    const authors = authorMatches.map(m => m[1].trim()).slice(0, 3).join(", ");
    
    if (id) {
      entries.push({
        id,
        title,
        summary,
        authors,
        link: `https://arxiv.org/abs/${id.replace(/v\d+$/, "")}`
      });
    }
  }
  
  return entries;
};


