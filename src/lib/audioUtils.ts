/**
 * Audio narration helper utilities for converting markdown and blog content
 * into clean speech scripts, sentence segments, and formatted audio times.
 */

export const getSpeechScript = (content: string, title: string): string => {
  let text = `Listening to: ${title}. Published by Meridian Research. \n\n`;
  
  // Process markdown to speech script
  let cleanText = content
    // Remove LaTeX block equations
    .replace(/\$\$([\s\S]*?)\$\$/g, " [equation mathematical formula] ")
    // Remove inline equations
    .replace(/\$([\s\S]*?)\$\$/g, " ")
    .replace(/\$([^$]+)\$/g, " $1 ")
    // Remove markdown headings
    .replace(/###\s*(.*)/g, "$1. ")
    .replace(/##\s*(.*)/g, "$1. ")
    // Remove markdown horizontal rules
    .replace(/---\s*/g, " ")
    // Remove markdown lists and bullets
    .replace(/[-\*]\s*/g, "")
    // Remove markdown bold/italic
    .replace(/[\*_]{1,3}([^*_]+)[\*_]{1,3}/g, "$1")
    // Remove brackets
    .replace(/[\[\]\(\)]/g, " ")
    // Fix backslash artifacts
    .replace(/\\/g, " ");

  return text + cleanText;
};

export const getSentences = (text: string): string[] => {
  const matches = text.match(/[^.!?\n]+[.!?\n]*/g);
  if (!matches) return [text];
  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
};

export const formatAudioTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const estimateSpeechDuration = (wordCount: number, speedMultiplier = 1.0): number => {
  if (wordCount <= 0 || speedMultiplier <= 0) return 0;
  // Standard speech speed is ~150 words per minute (2.5 words per second)
  const baseSeconds = (wordCount / 150) * 60;
  return Math.round(baseSeconds / speedMultiplier);
};
