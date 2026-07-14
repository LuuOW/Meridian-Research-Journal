// Helper to extract arXiv ID
export const extractArxivId = (input: string): string | null => {
  const urlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i);
  if (urlMatch) return urlMatch[1];
  const idMatch = input.match(/^(\d{4}\.\d{4,5})$/);
  if (idMatch) return idMatch[1];
  return null;
};
