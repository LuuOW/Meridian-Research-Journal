import { BlogPost } from "../types";

/**
 * Social media draft generation and Markdown formatting tools.
 */

export const generateLinkedInDraft = (
  title: string,
  excerpt: string,
  blogId?: string,
  origin: string = "https://meridian-research.org"
): string => {
  const cleanTitle = title.length > 80 ? `${title.slice(0, 77)}...` : title;
  const blogUrl = blogId ? `${origin}/blog/${blogId}` : origin;
  return `${cleanTitle} just got a major upgrade. New inverse-design techniques deliver 10× greater bandwidth, up to 4× lower loss, and 100× faster design cycles—opening the door to more efficient optical communications, quantum photonics, and light-matter interaction engineering.\n\nRead on Meridian: ${blogUrl}`;
};

export const generateTwitterDraft = (
  title: string,
  blogId?: string,
  origin: string = "https://meridian-research.org"
): string => {
  const cleanTitle = title.length > 120 ? `${title.slice(0, 117)}...` : title;
  const blogUrl = blogId ? `${origin}/blog/${blogId}` : origin;
  return `🔬 Hot Off the Press: "${cleanTitle}"\n\nDeep dive into the optics and physics breakdown on Meridian:\n${blogUrl}`;
};

export const formatMarkdownExport = (blog: BlogPost): string => {
  const tagsStr = (blog.tags || []).map((t) => `\`${t}\``).join(", ");
  return `# ${blog.title}\n\n**Published:** ${blog.date} | **Reading Time:** ${blog.readingTime || "5 min read"}\n**ArXiv Reference:** [Link](${blog.arxivLink})\n**Tags:** ${tagsStr}\n\n---\n\n## Abstract & Highlights\n${blog.excerpt}\n\n---\n\n${blog.content}\n`;
};
