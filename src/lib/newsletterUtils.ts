/**
 * Newsletter generation and email delivery utility functions.
 * Builds responsive, dark/light-compatible HTML email newsletters,
 * plain-text fallbacks, recipient chunking, and unsubscribe token verification.
 */

import { BlogPost } from "../types";
import { extractArxivId } from "./arxivUtils";

export interface NewsletterPayload {
  subject: string;
  preheader: string;
  htmlContent: string;
  textContent: string;
}

/**
 * Generates an academic email subject line from a blog post.
 */
export function buildNewsletterSubject(post: BlogPost): string {
  const cleanTitle = (post?.title || "Latest Research Update").trim();
  const primaryTag = (post?.tags && post.tags.length > 0) ? post.tags[0].toUpperCase() : "RESEARCH";
  return `[Meridian // ${primaryTag}] ${cleanTitle}`;
}

/**
 * Extracts a concise preheader snippet from post content or excerpt.
 */
export function extractPreheader(contentOrExcerpt: string, maxLength: number = 140): string {
  if (!contentOrExcerpt) return "Latest research preprint analysis from Meridian.";
  const clean = contentOrExcerpt
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/#+\s+/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 3) + "...";
}

/**
 * Creates a deterministic HMAC-like signature token for safe one-click email unsubscription.
 */
export function createUnsubscribeToken(email: string, secretKey: string = "meridian-secret-salt"): string {
  const input = `${email.toLowerCase().trim()}:${secretKey}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + "-" + Buffer.from(email.toLowerCase().trim()).toString("base64url");
}

/**
 * Verifies an unsubscribe token against the user's email address.
 */
export function verifyUnsubscribeToken(email: string, token: string, secretKey: string = "meridian-secret-salt"): boolean {
  if (!email || !token) return false;
  const expected = createUnsubscribeToken(email, secretKey);
  return token === expected;
}

/**
 * Chunks an array of recipient emails into batches for rate-limited SMTP dispatching.
 */
export function chunkEmailRecipients<T>(recipients: T[], batchSize: number = 50): T[][] {
  if (!Array.isArray(recipients) || recipients.length === 0) return [];
  const safeSize = Math.max(1, batchSize);
  const chunks: T[][] = [];
  for (let i = 0; i < recipients.length; i += safeSize) {
    chunks.push(recipients.slice(i, i + safeSize));
  }
  return chunks;
}

/**
 * Builds responsive HTML newsletter template with inline styling for email client compatibility.
 */
export function generateHtmlNewsletter(post: BlogPost, appUrl: string = "https://meridian-research.com", unsubscribeUrl?: string): string {
  const title = post.title || "Research Publication";
  const author = post.author || "Lucas Kempe";
  const dateStr = post.date ? new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Recent Publication";
  const arxivId = extractArxivId(post.arxivLink || "");
  const tagsHtml = (post.tags || [])
    .map(t => `<span style="display:inline-block;padding:3px 8px;margin-right:6px;font-size:11px;font-family:monospace;background-color:#0e2a47;color:#38bdf8;border-radius:4px;border:1px solid #1e40af;">${t}</span>`)
    .join("");
  const postUrl = `${appUrl}/#blog-${post.id}`;
  const unsubs = unsubscribeUrl || `${appUrl}/unsubscribe`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#050b1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050b1e;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#0a1128;border:1px solid #1e293b;border-radius:12px;overflow:hidden;">
          <!-- Header Banner -->
          <tr>
            <td style="padding:24px 32px;background-color:#070d24;border-bottom:1px solid #1e293b;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size:12px;font-weight:700;letter-spacing:2px;color:#38bdf8;font-family:monospace;text-transform:uppercase;">MERIDIAN RESEARCH</span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:#64748b;font-family:monospace;">${dateStr}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px;">
              <div style="margin-bottom:16px;">${tagsHtml}</div>
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.4;color:#f8fafc;font-weight:700;">${title}</h1>
              <p style="margin:0 0 20px 0;font-size:14px;color:#94a3b8;line-height:1.6;">${post.excerpt || ""}</p>
              
              <div style="padding:16px;background-color:#0f172a;border-left:3px solid #38bdf8;border-radius:0 8px 8px 0;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.5;"><strong>Author:</strong> ${author}</p>
                ${arxivId ? `<p style="margin:4px 0 0 0;font-size:13px;color:#94a3b8;"><strong>Preprint ID:</strong> arXiv:${arxivId}</p>` : ""}
              </div>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="border-radius:6px;background-color:#0284c7;">
                    <a href="${postUrl}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Read Full Publication &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#050b1e;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">You are receiving this digest because you subscribed to Meridian Research Publications.</p>
              <p style="margin:0;font-size:12px;"><a href="${unsubs}" style="color:#38bdf8;text-decoration:underline;">Unsubscribe from this newsletter</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds plain-text fallback newsletter for text-only email clients.
 */
export function generatePlainTextNewsletter(post: BlogPost, appUrl: string = "https://meridian-research.com", unsubscribeUrl?: string): string {
  const title = post.title || "Research Publication";
  const author = post.author || "Lucas Kempe";
  const excerpt = post.excerpt || "";
  const arxivId = extractArxivId(post.arxivLink || "");
  const postUrl = `${appUrl}/#blog-${post.id}`;
  const unsubs = unsubscribeUrl || `${appUrl}/unsubscribe`;

  return `========================================
MERIDIAN RESEARCH PUBLICATION DIGEST
========================================

${title}
Author: ${author}
${arxivId ? `arXiv ID: ${arxivId}` : ""}

EXCERPT:
${excerpt}

Read the full interactive paper with LaTeX formulas, ray-traced charts, and audio narration at:
${postUrl}

----------------------------------------
To unsubscribe: ${unsubs}
`;
}
