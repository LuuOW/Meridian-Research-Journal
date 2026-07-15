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

