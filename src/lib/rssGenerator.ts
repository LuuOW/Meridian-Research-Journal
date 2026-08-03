import { BlogPost } from "../types";

/**
 * Escapes special XML characters to ensure valid XML feed output.
 */
export function escapeXml(unsafe: string = ""): string {
  if (!unsafe || typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface RssFeedOptions {
  title?: string;
  description?: string;
  siteUrl?: string;
  feedUrl?: string;
  language?: string;
}

/**
 * Generates a standard RSS 2.0 XML feed from an array of blog posts.
 */
export function generateRssFeed(posts: BlogPost[] = [], options: RssFeedOptions = {}): string {
  const title = escapeXml(options.title || "Meridian Research Journal");
  const description = escapeXml(
    options.description || "Peer-reviewed research insights, quantum physics, and optical engineering."
  );
  const siteUrl = options.siteUrl || "https://meridian-journal.org";
  const feedUrl = options.feedUrl || `${siteUrl}/rss.xml`;
  const language = options.language || "en-us";
  const pubDate = new Date().toUTCString();

  const itemsXml = posts
    .map((post) => {
      const postTitle = escapeXml(post.title || "Untitled Article");
      const postLink = `${siteUrl}/post/${post.slug || post.id}`;
      const postExcerpt = escapeXml(post.excerpt || "");
      const author = escapeXml(post.author || "Meridian Research Journal");
      const categories = (post.tags || []).map((t) => `<category>${escapeXml(t.replace(/^#+/, ""))}</category>`).join("\n        ");

      return `    <item>
      <title>${postTitle}</title>
      <link>${postLink}</link>
      <guid isPermaLink="true">${postLink}</guid>
      <description>${postExcerpt}</description>
      <dc:creator>${author}</dc:creator>
      <pubDate>${pubDate}</pubDate>
      ${categories}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <link>${siteUrl}</link>
    <description>${description}</description>
    <language>${language}</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;
}
