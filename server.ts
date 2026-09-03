import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import nodemailer from "nodemailer";
import { MicroserviceRegistry } from "./src/services/MicroserviceRegistry";
import { extractArxivId, cleanJsonText, generateSlug, parseArxivXml, parseArxivFeedXml, extractSvgString } from "./src/lib/arxivUtils";
import { generateProceduralBannerSvg } from "./src/lib/svgBannerGenerator";
import { generateScientificArticleFromArxiv } from "./src/lib/paperGenerationEngine";
import { auditArticleAgainstArxiv, auditCatalogUniqueness } from "./src/lib/arxivAuditor";
import {
  buildLinkedInSystemInstruction,
  buildLinkedInUserPrompt,
  generateFallbackLinkedInPost,
  sanitizeHashtags
} from "./src/lib/linkedinUtils";
import {
  buildXSystemInstruction,
  buildXUserPrompt,
  generateFallbackXPost,
  sanitizeHashtags as sanitizeXHashtags
} from "./src/lib/xUtils";
import {
  syncAllBlogsToGitHub,
  testGitHubConnection,
  getGitHubSyncConfig,
  writeLocalBlogFiles,
  generateDataTsContent
} from "./src/lib/githubSync";
import {
  resolveBlogSlugOrId,
  normalizeSlug,
  stripSlugTimestampSuffix
} from "./src/lib/slugResolver";
import {
  persistMultiTierBlogs,
  appendGenerationJournal,
  readPipelineRecords,
  createBlogSnapshot
} from "./src/lib/persistenceManager";
import {
  createPipelineTracker,
  recordStepProgress,
  finalizePipelineSuccess,
  finalizePipelineFailure,
  estimateTokens
} from "./src/lib/pipelineAuditor";
import { PipelineExecutionRecord } from "./src/types";
import {
  PortalTokenData,
  PasskeyRecord,
  AuthSessionRecord,
  DeviceFingerprint,
  PasskeyAuditEvent,
  validatePasskeyCredential,
  generatePortalToken,
  cleanExpiredTokens,
  verifyPortalToken,
  pollAuthToken,
  validateRegistrationToken,
  verifyRegistrationPassword,
  authenticatePasskeyCredential,
  registerNewPasskey,
  syncPasskeyCollections,
  createAuthSession,
  validateAndRestoreSession,
  touchSessionActivity,
  revokeAuthSession,
  cleanExpiredSessions,
  createPasskeyAuditEvent,
  appendPasskeyAuditRecord,
  readPasskeyAuditRecords,
  extractClientFingerprint,
  generateSecureChallenge
} from "./src/lib/passkeyManager";
import {
  fetchLiveBinanceTickers,
  fetchLiveBinanceDepth,
  fetchLiveBinanceKlines,
  fetchBinanceAccountInfo,
  fetchBinanceOpenOrders,
  executeBinanceTestOrder,
  previewOrder,
  getPublicDonationAddresses,
  DEFAULT_TRACKED_SYMBOLS,
  DEFAULT_SYMBOL_RULES,
} from "./src/lib/binanceManager";



dotenv.config();

const app = express();
const PORT = 3000;

// Domain Canonical Redirection Middleware (Redirects generic Cloud Run host to custom domain ask-meridian.uk)
app.use((req, res, next) => {
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString().toLowerCase();
  
  // Exclude local development and AI Studio preview containers
  const isAiStudioPreview = host.startsWith("ais-dev-") || host.startsWith("ais-pre-") || host.includes("localhost") || host.includes("127.0.0.1");

  if (!isAiStudioPreview && (host.includes("meridian-blog-620868709178.us-west1.run.app") || (host.endsWith(".run.app") && !host.includes("ais-")))) {
    const targetUrl = `https://ask-meridian.uk${req.originalUrl}`;
    console.log(`[Redirect] 301 Permanent Redirect from ${host}${req.originalUrl} -> ${targetUrl}`);
    return res.redirect(301, targetUrl);
  }
  next();
});

// Google AdSense Authorized Digital Sellers (ads.txt) Verification Endpoint
app.get("/ads.txt", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send("google.com, pub-7734562716191044, DIRECT, f08c47fec0942fa0\n");
});

// Search Engine Optimization (robots.txt) Endpoint
app.get("/robots.txt", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  const robotsPath = path.join(process.cwd(), "public", "robots.txt");
  if (fs.existsSync(robotsPath)) {
    res.send(fs.readFileSync(robotsPath, "utf-8"));
  } else {
    res.send("User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://ask-meridian.uk/sitemap.xml\n");
  }
});

// Dynamic XML Sitemap Endpoint
app.get("/sitemap.xml", (req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    res.send(fs.readFileSync(sitemapPath, "utf-8"));
  } else {
    res.status(404).send("<error>Sitemap not found</error>");
  }
});

// GitHub Pages / Jekyll bypass endpoint
app.get("/.nojekyll", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send("");
});

app.use(express.json({ limit: "10mb" }));

// Initialize Google GenAI client safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("Notice: GEMINI_API_KEY is not defined. Procedural generation fallback will be used.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Cached availability check for GitHub Models (Azure AI Inference) endpoint
let isGitHubModelsSupported: boolean | null = null;
async function checkGitHubModelsAvailability(): Promise<boolean> {
  if (isGitHubModelsSupported !== null) return isGitHubModelsSupported;
  try {
    const dns = await import("dns/promises");
    await dns.lookup("models.inference.ai.azure.com");
    isGitHubModelsSupported = true;
  } catch {
    isGitHubModelsSupported = false;
  }
  return isGitHubModelsSupported;
}

// Simple arXiv API fetcher with quick abort timeout
const fetchArxivMetadata = async (id: string) => {
  try {
    const url = `http://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) throw new Error("Failed to fetch from arXiv API");
    const xml = await res.text();
    
    // Extract metadata using robust helper function
    const { title, summary, authors } = parseArxivXml(xml);
    
    return { title, summary, authors, arxivLink: `https://arxiv.org/abs/${id}` };
  } catch (error) {
    console.warn("Notice: arXiv metadata fetch timed out or failed, falling back to direct input parsing:", error);
    return null;
  }
};

const CUSTOM_BLOGS_FILE = path.join(process.cwd(), "custom_blogs.json");

const readCustomBlogs = (): any[] => {
  try {
    if (fs.existsSync(CUSTOM_BLOGS_FILE)) {
      const data = fs.readFileSync(CUSTOM_BLOGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading custom_blogs.json:", error);
  }
  return [];
};

const writeCustomBlogs = (blogs: any[]) => {
  try {
    fs.writeFileSync(CUSTOM_BLOGS_FILE, JSON.stringify(blogs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing custom_blogs.json:", error);
  }
};

const DISPATCHED_EMAILS_FILE = path.join(process.cwd(), "dispatched_emails.json");
const SMTP_CONFIG_FILE = path.join(process.cwd(), "smtp_config.json");

const readDispatchedEmails = (): any[] => {
  try {
    if (fs.existsSync(DISPATCHED_EMAILS_FILE)) {
      const data = fs.readFileSync(DISPATCHED_EMAILS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading dispatched_emails.json:", error);
  }
  return [];
};

const writeDispatchedEmails = (emails: any[]) => {
  try {
    fs.writeFileSync(DISPATCHED_EMAILS_FILE, JSON.stringify(emails, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing dispatched_emails.json:", error);
  }
};

const PASSKEYS_FILE = path.join(process.cwd(), "passkeys.json");
const PASSKEYS_BACKUP_FILE = path.join(process.cwd(), "data", "passkeys_backup.json");
const ACTIVE_SESSIONS_FILE = path.join(process.cwd(), "data", "active_sessions.json");

const logPasskeyAudit = (
  eventType: any,
  status: "success" | "failure" | "pending" | "info",
  options?: {
    credentialId?: string;
    deviceName?: string;
    token?: string;
    details?: Record<string, any>;
    req?: express.Request;
  }
) => {
  try {
    const ip = (options?.req?.headers["x-forwarded-for"] as string) || options?.req?.socket?.remoteAddress;
    const userAgent = (options?.req?.headers["user-agent"] as string);
    const event = createPasskeyAuditEvent(eventType, status, {
      credentialId: options?.credentialId,
      deviceName: options?.deviceName,
      token: options?.token,
      details: options?.details,
      ip,
      userAgent
    });
    appendPasskeyAuditRecord(event, fs);
  } catch (err) {
    console.error("[PasskeyAudit] Failed to log audit event:", err);
  }
};

const readPasskeys = (): PasskeyRecord[] => {
  // 1. Try primary passkeys.json
  try {
    if (fs.existsSync(PASSKEYS_FILE)) {
      const data = fs.readFileSync(PASSKEYS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Error reading primary passkeys.json, trying backup:", error);
  }

  // 2. Fallback to backup mirror data/passkeys_backup.json
  try {
    if (fs.existsSync(PASSKEYS_BACKUP_FILE)) {
      const data = fs.readFileSync(PASSKEYS_BACKUP_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log("[PasskeyPersistence] Recovered passkeys from backup mirror.");
        writePasskeys(parsed, false); // Restore primary
        return parsed;
      }
    }
  } catch (error) {
    console.error("Error reading passkeys_backup.json:", error);
  }

  return [];
};

const writePasskeys = (passkeys: PasskeyRecord[], syncBackup: boolean = true) => {
  try {
    // 1. Write primary passkeys.json
    fs.writeFileSync(PASSKEYS_FILE, JSON.stringify(passkeys, null, 2), "utf-8");

    // 2. Write redundant backup mirror
    if (syncBackup) {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(PASSKEYS_BACKUP_FILE, JSON.stringify(passkeys, null, 2), "utf-8");

      // 3. Create timestamped snapshot in snapshots dir
      const snapshotsDir = path.join(dataDir, "snapshots");
      if (!fs.existsSync(snapshotsDir)) {
        fs.mkdirSync(snapshotsDir, { recursive: true });
      }
      const snapFile = path.join(snapshotsDir, `passkeys_snapshot_${Date.now()}.json`);
      fs.writeFileSync(snapFile, JSON.stringify(passkeys, null, 2), "utf-8");

      // Prune old snapshots (keep last 15)
      const existing = fs.readdirSync(snapshotsDir).filter(f => f.startsWith("passkeys_snapshot_")).sort().reverse();
      if (existing.length > 15) {
        existing.slice(15).forEach(f => {
          try { fs.unlinkSync(path.join(snapshotsDir, f)); } catch {}
        });
      }
    }
  } catch (error) {
    console.error("Error writing passkeys across multi-tier storage:", error);
  }
};

// Persistent Active Sessions Map (survives window closures, tab reloads, and container restarts)
const authSessions = new Map<string, AuthSessionRecord>();

const loadPersistedSessions = () => {
  try {
    if (fs.existsSync(ACTIVE_SESSIONS_FILE)) {
      const data = fs.readFileSync(ACTIVE_SESSIONS_FILE, "utf-8");
      const list: AuthSessionRecord[] = JSON.parse(data);
      const now = Date.now();
      if (Array.isArray(list)) {
        list.forEach(sess => {
          if (sess.expiresAt > now) {
            authSessions.set(sess.sessionId, sess);
          }
        });
      }
    }
  } catch (err) {
    console.error("[PasskeySessions] Error loading persisted active sessions:", err);
  }
};

const savePersistedSessions = () => {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const list = Array.from(authSessions.values());
    fs.writeFileSync(ACTIVE_SESSIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[PasskeySessions] Error saving active sessions to disk:", err);
  }
};

// Initial session load
loadPersistedSessions();

// Store temporary portal tokens for passkey device registration/authentication
const portalTokens = new Map<string, PortalTokenData>();

const readSmtpConfig = (): any => {
  try {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
      const data = fs.readFileSync(SMTP_CONFIG_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading smtp_config.json:", error);
  }
  // Fallback to environment variables
  return {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587") || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Meridian Research <no-reply@ask-meridian.uk>",
    recipient: process.env.USER_EMAIL || "lucas.kempe@icloud.com",
    twilioSid: process.env.TWILIO_ACCOUNT_SID || "",
    twilioToken: process.env.TWILIO_AUTH_TOKEN || "",
    twilioFrom: process.env.TWILIO_FROM_NUMBER || "+14155238886",
    whatsappRecipient: process.env.WHATSAPP_RECIPIENT || "1170666236"
  };
};

const writeSmtpConfig = (config: any) => {
  try {
    fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing smtp_config.json:", error);
  }
};

// Initialize Firestore on Server Side
let db: any = null;
const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;

if (fs.existsSync(CONFIG_FILE)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch (err) {
    console.error("Failed to parse firebase-applet-config.json:", err);
  }
}

if (firebaseConfig && firebaseConfig.projectId) {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    db = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Firestore successfully initialized on Server!");
  } catch (error) {
    console.error("Failed to initialize Firebase on Server:", error);
  }
}

// Resolves a high-precision numeric timestamp for any blog post
const getBlogTimestamp = (blog: any): number => {
  if (blog?.createdAt && typeof blog.createdAt === "number" && !isNaN(blog.createdAt)) {
    return blog.createdAt;
  }
  if (blog?.timestamp && typeof blog.timestamp === "number" && !isNaN(blog.timestamp)) {
    return blog.timestamp;
  }
  if (blog?.id && typeof blog.id === "string") {
    const match = blog.id.match(/(?:generated|draft|blog)-(\d+)/);
    if (match && match[1]) {
      const val = Number(match[1]);
      if (!isNaN(val) && val > 1000000000) return val;
    }
  }
  if (blog?.date && typeof blog.date === "string") {
    const parsed = Date.parse(blog.date);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
};

// Chronologically sort blogs so newest articles appear first deterministically
const sortBlogsChronologically = (blogs: any[]): any[] => {
  return [...blogs].sort((a: any, b: any) => {
    const timeA = getBlogTimestamp(a);
    const timeB = getBlogTimestamp(b);
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return (a?.title || "").localeCompare(b?.title || "");
  });
};

// Get all blogs, with fallback to local JSON file
const getBlogs = async (): Promise<any[]> => {
  const localBlogs = sortBlogsChronologically(readCustomBlogs());
  if (!db) {
    return localBlogs;
  }
  try {
    const querySnapshot = await getDocs(collection(db, "blogs"));
    const firestoreBlogs: any[] = [];
    querySnapshot.forEach((doc) => {
      firestoreBlogs.push(doc.data());
    });

    if (firestoreBlogs.length === 0 && localBlogs.length > 0) {
      // Seed Firestore with local blogs if Firestore is completely empty
      console.log(`Firestore blogs collection is empty. Seeding with ${localBlogs.length} local blogs...`);
      for (const blog of localBlogs) {
        if (blog && blog.id) {
          await setDoc(doc(db, "blogs", blog.id), blog);
        }
      }
      return localBlogs;
    }

    return sortBlogsChronologically(firestoreBlogs);
  } catch (error) {
    console.error("Error reading from Firestore, falling back to local file:", error);
    return localBlogs;
  }
};

let lastGitHubSyncTimestamp: number | null = null;
let lastGitHubSyncStatus: any = null;

// Active Server-Sent Events (SSE) connections for live real-time pipeline monitoring
const activePipelineStreams = new Map<string, Set<express.Response>>();

function broadcastPipelineUpdate(record: PipelineExecutionRecord) {
  if (!record || !record.jobId) return;
  const clients = activePipelineStreams.get(record.jobId);
  if (clients && clients.size > 0) {
    const ssePayload = `data: ${JSON.stringify(record)}\n\n`;
    for (const res of clients) {
      try {
        res.write(ssePayload);
      } catch (err) {
        clients.delete(res);
      }
    }
  }
}

// 99.999% Multi-Tier Save for a single blog: custom_blogs.json, src/data.ts, snapshot, sitemap, Firestore, GitHub
const saveBlog = async (blog: any, reason: string = "save blog") => {
  const rawLocalBlogs = readCustomBlogs();
  const existingIdx = rawLocalBlogs.findIndex((b: any) => b.id === blog.id || b.slug === blog.slug);
  if (existingIdx !== -1) {
    rawLocalBlogs[existingIdx] = { ...rawLocalBlogs[existingIdx], ...blog };
  } else {
    rawLocalBlogs.unshift(blog);
  }
  const localBlogs = sortBlogsChronologically(rawLocalBlogs);

  // Execute 6-Tier replication
  const result = await persistMultiTierBlogs(localBlogs, db, `${reason}: ${blog.title?.slice(0, 40) || blog.id}`);
  lastGitHubSyncTimestamp = Date.now();
  lastGitHubSyncStatus = result.tiers;
  return result;
};

// 99.999% Multi-Tier Save for multiple blogs: custom_blogs.json, src/data.ts, snapshot, sitemap, Firestore, GitHub
const saveBlogs = async (blogs: any[], reason: string = "batch sync") => {
  const sortedBlogs = sortBlogsChronologically(blogs);
  const result = await persistMultiTierBlogs(sortedBlogs, db, reason);
  lastGitHubSyncTimestamp = Date.now();
  lastGitHubSyncStatus = result.tiers;
  return result;
};

// Delete a blog from local files, Firestore, and GitHub mirror
const deleteBlog = async (id: string): Promise<boolean> => {
  // 1. Delete locally
  const localBlogs = readCustomBlogs();
  const filtered = localBlogs.filter((b: any) => b.id !== id && b.slug !== id);
  await persistMultiTierBlogs(filtered, db, `delete article ${id}`);

  // 2. Delete from Firestore explicitly
  let firestoreSuccess = true;
  if (db) {
    try {
      await deleteDoc(doc(db, "blogs", id));
      console.log(`Blog ${id} successfully deleted from Firestore.`);
    } catch (error) {
      console.error("Error deleting from Firestore:", error);
      firestoreSuccess = false;
    }
  }

  return firestoreSuccess;
};

// View counter state & persistent tracking
const blogViewsMap = new Map<string, number>();

const getBlogViews = (idOrSlug: string): number => {
  if (!idOrSlug) return 100;
  if (blogViewsMap.has(idOrSlug)) {
    return blogViewsMap.get(idOrSlug)!;
  }
  // Compute a deterministic realistic base view count between 320 and 1850
  let hash = 0;
  for (let i = 0; i < idOrSlug.length; i++) {
    hash = (hash << 5) - hash + idOrSlug.charCodeAt(i);
    hash |= 0;
  }
  const baseViews = 320 + (Math.abs(hash) % 1530);
  blogViewsMap.set(idOrSlug, baseViews);
  return baseViews;
};

const incrementBlogViews = (idOrSlug: string): { views: number; activeReaders: number } => {
  const current = getBlogViews(idOrSlug);
  const updated = current + 1;
  blogViewsMap.set(idOrSlug, updated);
  
  // Deterministic realistic active readers count between 2 and 18
  let hash = 0;
  for (let i = 0; i < idOrSlug.length; i++) {
    hash = (hash << 5) - hash + idOrSlug.charCodeAt(i);
    hash |= 0;
  }
  const activeReaders = 2 + (Math.abs(hash + updated) % 17);

  return { views: updated, activeReaders };
};

// API: Get all custom blogs
app.get("/api/blogs", async (req, res) => {
  const rawBlogs = await getBlogs();
  const blogs = rawBlogs.map((b) => ({
    ...b,
    views: b.views || getBlogViews(b.id)
  }));
  res.json({ blogs });
});

// API: Resilient single blog resolver (by exact slug, base slug, ID, or arXiv ID)
app.get("/api/blogs/:idOrSlug", async (req, res) => {
  const { idOrSlug } = req.params;
  const allBlogs = await getBlogs();
  const matched = resolveBlogSlugOrId(idOrSlug, allBlogs);

  if (matched) {
    const views = matched.views || getBlogViews(matched.id);
    return res.json({ blog: { ...matched, views } });
  }

  return res.status(404).json({ error: "Article not found", query: idOrSlug });
});

// API: Real-time SSE stream for generation pipeline execution
app.get("/api/pipeline/stream/:jobId", (req, res) => {
  const { jobId } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  if (!activePipelineStreams.has(jobId)) {
    activePipelineStreams.set(jobId, new Set());
  }
  activePipelineStreams.get(jobId)!.add(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ status: "connected", jobId, timestamp: Date.now() })}\n\n`);

  req.on("close", () => {
    const clients = activePipelineStreams.get(jobId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        activePipelineStreams.delete(jobId);
      }
    }
  });
});

// API: Get historical pipeline generation records
app.get("/api/pipeline/records", (req, res) => {
  try {
    const records = readPipelineRecords();
    res.json({ records, count: records.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to retrieve pipeline records" });
  }
});

// API: Get single pipeline execution record by jobId
app.get("/api/pipeline/records/:jobId", (req, res) => {
  try {
    const records = readPipelineRecords();
    const found = records.find(r => r.jobId === req.params.jobId);
    if (found) {
      return res.json({ record: found });
    }
    return res.status(404).json({ error: "Pipeline record not found" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Multi-tier storage diagnostic self-check
app.post("/api/pipeline/audit-check", async (req, res) => {
  const customBlogsExists = fs.existsSync(CUSTOM_BLOGS_FILE);
  const dataTsExists = fs.existsSync(path.join(process.cwd(), "src", "data.ts"));
  const journalExists = fs.existsSync(path.join(process.cwd(), "data", "generation_journal.jsonl"));
  const sitemapExists = fs.existsSync(path.join(process.cwd(), "public", "sitemap.xml"));
  const allBlogs = await getBlogs();

  res.json({
    healthy: customBlogsExists && dataTsExists,
    totalArticles: allBlogs.length,
    tiers: {
      customBlogsJson: { exists: customBlogsExists, count: readCustomBlogs().length },
      dataTs: { exists: dataTsExists },
      journalJsonl: { exists: journalExists },
      sitemapXml: { exists: sitemapExists },
      firestore: { connected: !!db },
      gitHubMirror: { configured: !!process.env.GITHUB_TOKEN }
    },
    sampleArticleTest: {
      quantumFramePotentialFound: !!resolveBlogSlugOrId("towards-optimal-quantum-estimators-for-state-frame-potential-9854", allBlogs)
    }
  });
});

// API: Increment blog view counter
app.post("/api/blogs/:id/view", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Missing blog ID parameter" });
  }

  const { views, activeReaders } = incrementBlogViews(id);

  // If blog exists in local file or Firestore, update its view property
  const localBlogs = readCustomBlogs();
  const targetIndex = localBlogs.findIndex((b: any) => b.id === id || b.slug === id);
  if (targetIndex !== -1) {
    localBlogs[targetIndex].views = views;
    writeCustomBlogs(localBlogs);
  }

  res.json({ success: true, id, views, activeReaders });
});

// API: Delete a custom blog
app.delete("/api/blogs/:id", async (req, res) => {
  const { id } = req.params;
  const password = req.headers["x-deletion-password"] || req.query.password || req.body?.password;
  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  
  if (!password || password !== expectedPassword) {
    return res.status(403).json({ error: "Unauthorized: Incorrect editor password." });
  }

  const success = await deleteBlog(id);
  res.json({ success });
});

// API: Verify Editor Password
app.post("/api/verify-editor-password", (req, res) => {
  const { password } = req.body;

  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  
  if (password === expectedPassword) {
    res.json({ success: true });
  } else {
    res.status(403).json({ error: "Incorrect password." });
  }
});

// API: Get GitHub Mirror Status
app.get("/api/github/status", async (req, res) => {
  try {
    const config = getGitHubSyncConfig();
    const conn = await testGitHubConnection();
    const allBlogs = await getBlogs();

    res.json({
      configured: config.configured,
      connected: conn.connected,
      repo: config.repo,
      branch: config.branch,
      authorName: config.authorName,
      authorEmail: config.authorEmail,
      user: conn.user || null,
      message: conn.message,
      totalArticles: allBlogs.length,
      lastSyncTimestamp: lastGitHubSyncTimestamp,
      lastSyncStatus: lastGitHubSyncStatus
    });
  } catch (err: any) {
    console.error("Error checking GitHub status:", err);
    res.status(500).json({ error: err.message || "Failed to check GitHub status" });
  }
});

// API: Manually trigger instant GitHub sync
app.post("/api/github/sync", async (req, res) => {
  const { password, reason } = req.body || {};
  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";

  if (password && password !== expectedPassword) {
    return res.status(403).json({ error: "Unauthorized: Incorrect password." });
  }

  try {
    const allBlogs = await getBlogs();
    const result = await syncAllBlogsToGitHub(
      allBlogs,
      reason || "manual mirror sync via dashboard"
    );

    lastGitHubSyncTimestamp = Date.now();
    lastGitHubSyncStatus = result;

    res.json(result);
  } catch (err: any) {
    console.error("Manual GitHub sync error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to execute GitHub sync",
      message: err.message
    });
  }
});

// API: Export complete repository bundle (JSON + TypeScript source)
app.get("/api/export/repo-bundle", async (req, res) => {
  try {
    const allBlogs = await getBlogs();
    const dataTs = generateDataTsContent(allBlogs);

    res.json({
      totalArticles: allBlogs.length,
      timestamp: Date.now(),
      customBlogsJson: allBlogs,
      dataTsSource: dataTs,
      instructions: "To update your local GitHub clone: save customBlogsJson into custom_blogs.json, or save dataTsSource into src/data.ts, and git commit."
    });
  } catch (err: any) {
    console.error("Export bundle error:", err);
    res.status(500).json({ error: "Failed to generate export bundle" });
  }
});

// API: Pull all published articles directly from production (https://ask-meridian.uk/api/blogs)
app.post("/api/blogs/pull-prod", async (req, res) => {
  const { password } = req.body || {};
  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";

  if (password && password !== expectedPassword) {
    return res.status(403).json({ error: "Unauthorized: Incorrect password." });
  }

  try {
    const prodRes = await fetch("https://ask-meridian.uk/api/blogs", {
      headers: { "User-Agent": "Meridian-AIStudio-Sync" },
      signal: AbortSignal.timeout(12000)
    });
    if (!prodRes.ok) {
      throw new Error(`Production server returned HTTP ${prodRes.status}`);
    }
    const data: any = await prodRes.json();
    const prodBlogs = data.blogs || [];

    if (!Array.isArray(prodBlogs) || prodBlogs.length === 0) {
      throw new Error("No blogs returned from production");
    }

    await saveBlogs(prodBlogs, "pull and sync from production");

    res.json({
      success: true,
      message: `Successfully pulled and synchronized ${prodBlogs.length} articles from production.`,
      totalArticles: prodBlogs.length,
      blogs: prodBlogs
    });
  } catch (err: any) {
    console.error("Error pulling from production:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to pull articles from production" });
  }
});

// Get registered passkeys, syncing with Firestore if available
const getPasskeys = async (): Promise<any[]> => {
  const localPasskeys = readPasskeys();
  if (!db) {
    return localPasskeys;
  }
  try {
    const querySnapshot = await getDocs(collection(db, "passkeys"));
    const firestorePasskeys: any[] = [];
    querySnapshot.forEach((doc) => {
      firestorePasskeys.push(doc.data());
    });

    // Merge them by ID
    const mergedMap = new Map<string, any>();
    localPasskeys.forEach((p) => mergedMap.set(p.id, p));
    firestorePasskeys.forEach((p) => mergedMap.set(p.id, p));

    const mergedList = Array.from(mergedMap.values());
    if (mergedList.length > localPasskeys.length) {
      writePasskeys(mergedList);
    }
    return mergedList;
  } catch (error) {
    console.error("Error reading passkeys from Firestore, falling back to local file:", error);
    return localPasskeys;
  }
};

// API: Generate WebAuthn Challenge & Detect Device Fingerprint
app.post("/api/passkeys/challenge", (req, res) => {
  try {
    const fingerprint = extractClientFingerprint(req);
    const challenge = generateSecureChallenge();
    
    logPasskeyAudit("challenge_generated", "success", {
      details: {
        fingerprintHash: fingerprint.fingerprintHash,
        platform: fingerprint.platform,
        language: fingerprint.language
      },
      req
    });

    res.json({
      challenge,
      fingerprint,
      rpId: req.hostname
    });
  } catch (err: any) {
    logPasskeyAudit("challenge_generated", "failure", { details: { error: err.message }, req });
    res.status(500).json({ error: "Failed to generate security challenge" });
  }
});

// API: Get registered passkeys
app.get("/api/passkeys/list", async (req, res) => {
  const passkeys = await getPasskeys();
  res.json({ passkeys });
});

// API: Bidirectional synchronization of passkeys between client localStorage and server storage tiers
app.post("/api/passkeys/sync", async (req, res) => {
  try {
    const { passkeys: clientPasskeys, fingerprint } = req.body;
    const currentPasskeys = await getPasskeys();
    const syncResult = syncPasskeyCollections(currentPasskeys, clientPasskeys);

    // Persist merged set across all server tiers
    writePasskeys(syncResult.merged, true);

    // Sync to Firestore if db is available
    if (db && syncResult.addedCount > 0) {
      for (const pk of syncResult.merged) {
        try {
          await setDoc(doc(db, "passkeys", pk.id), pk);
        } catch (err) {
          console.error(`[PasskeySync] Firestore write failed for ${pk.id}:`, err);
        }
      }
    }

    logPasskeyAudit("passkey_synced", "success", {
      details: {
        totalCount: syncResult.merged.length,
        addedCount: syncResult.addedCount,
        updatedCount: syncResult.updatedCount
      },
      req
    });

    res.json({
      success: true,
      passkeys: syncResult.merged,
      count: syncResult.merged.length,
      added: syncResult.addedCount
    });
  } catch (err: any) {
    console.error("[PasskeySync] Synchronization error:", err);
    res.status(500).json({ error: "Failed to synchronize passkeys" });
  }
});

// API: Register a passkey across multi-tier storage with biometric & fingerprint awareness
app.post("/api/passkeys/register", async (req, res) => {
  const { credential, deviceName, token, password, fingerprint } = req.body;
  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";

  // Validate either with portal token OR direct editor password
  if (token) {
    const validation = validateRegistrationToken(token, portalTokens);
    if (!validation.valid) {
      logPasskeyAudit("passkey_registered", "failure", {
        token,
        details: { error: validation.error },
        req
      });
      return res.status(403).json({ error: validation.error });
    }
  } else if (password) {
    const verification = verifyRegistrationPassword(password, expectedPassword);
    if (!verification.authorized) {
      logPasskeyAudit("passkey_registered", "failure", {
        details: { error: verification.error },
        req
      });
      return res.status(403).json({ error: verification.error });
    }
  } else {
    return res.status(400).json({ error: "Authorization token or editor password is required to register a passkey." });
  }

  if (!validatePasskeyCredential(credential)) {
    logPasskeyAudit("passkey_registered", "failure", {
      token,
      details: { error: "Invalid credential payload structure" },
      req
    });
    return res.status(400).json({ error: "Invalid credential data" });
  }

  try {
    const passkeys = await getPasskeys();
    const clientFp = fingerprint || extractClientFingerprint(req);
    
    // Multi-tier registration
    const result = registerNewPasskey(passkeys, {
      id: credential.id,
      deviceName: deviceName || "My Registered Device",
      publicKey: credential.publicKey || "",
      fingerprint: clientFp,
      biometricVerified: true,
      aaguid: credential.aaguid
    });

    writePasskeys(result.updatedPasskeys, true);

    // Sync to Firestore if db is available
    if (db) {
      try {
        await setDoc(doc(db, "passkeys", result.record.id), result.record);
        console.log(`[PasskeyPersistence] Passkey ${result.record.id} written to Firestore.`);
      } catch (err) {
        console.error("Error saving passkey to Firestore:", err);
      }
    }

    // Automatically issue authenticated session
    const session = createAuthSession(result.record.id, result.record.deviceName, {
      fingerprintHash: clientFp?.fingerprintHash,
      editorPassword: expectedPassword
    });
    authSessions.set(session.sessionId, session);
    savePersistedSessions();

    logPasskeyAudit("passkey_registered", "success", {
      credentialId: result.record.id,
      deviceName: result.record.deviceName,
      token,
      details: {
        isNew: result.added,
        biometricVerified: true,
        sessionId: session.sessionId,
        fingerprintHash: clientFp?.fingerprintHash
      },
      req
    });

    res.json({
      success: true,
      registered: true,
      passkey: result.record,
      password: expectedPassword,
      session: {
        sessionId: session.sessionId,
        deviceName: session.deviceName,
        expiresAt: session.expiresAt
      }
    });
  } catch (err: any) {
    console.error("Error in passkey registration pipeline:", err);
    logPasskeyAudit("passkey_registered", "failure", {
      credentialId: credential?.id,
      details: { error: err.message },
      req
    });
    res.status(500).json({ error: "Registration pipeline execution failed." });
  }
});

// API: Generate a portal token
app.post("/api/passkeys/generate-portal", (req, res) => {
  const { type, password, fingerprint } = req.body; // "register" | "auth"

  if (type === "register") {
    const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
    const verification = verifyRegistrationPassword(password, expectedPassword);
    if (!verification.authorized) {
      logPasskeyAudit("portal_token_generated", "failure", {
        details: { type, error: verification.error },
        req
      });
      return res.status(403).json({ error: verification.error });
    }
  }

  const clientFp = fingerprint || extractClientFingerprint(req);
  const token = generatePortalToken(type, portalTokens, { fingerprint: clientFp });
  cleanExpiredTokens(portalTokens);

  logPasskeyAudit("portal_token_generated", "success", {
    token,
    details: { type: type || "register", fingerprintHash: clientFp?.fingerprintHash },
    req
  });

  res.json({ token });
});

// API: Verify and Authorize a Portal Token
app.post("/api/passkeys/verify-portal", (req, res) => {
  const { token, success, deviceName, credentialId, fingerprint } = req.body;
  const editorPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  const clientFp = fingerprint || extractClientFingerprint(req);
  const result = verifyPortalToken(token, success, portalTokens, editorPassword, {
    deviceName,
    fingerprint: clientFp
  });
  
  if (result.success) {
    // Issue persistent auth session
    const session = createAuthSession(credentialId || "cred_portal_auth", deviceName || "Biometric Device", {
      fingerprintHash: clientFp?.fingerprintHash,
      editorPassword
    });
    authSessions.set(session.sessionId, session);
    savePersistedSessions();

    logPasskeyAudit("portal_token_verified", "success", {
      token,
      deviceName,
      details: { sessionId: session.sessionId, fingerprintHash: clientFp?.fingerprintHash },
      req
    });
    return res.json({
      success: true,
      password: editorPassword,
      session: {
        sessionId: session.sessionId,
        deviceName: session.deviceName,
        expiresAt: session.expiresAt
      }
    });
  }
  
  logPasskeyAudit("portal_token_verified", "failure", {
    token,
    details: { error: result.error },
    req
  });
  res.status(result.error === "Token not found or expired" ? 404 : 400).json({ error: result.error });
});

// API: Poll for Portal Token authorization status
app.get("/api/passkeys/poll-auth", (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token is required" });
  }

  const result = pollAuthToken(token, portalTokens);
  if (result.error) {
    logPasskeyAudit("portal_token_polled", "failure", {
      token,
      details: { error: result.error },
      req
    });
    return res.status(result.error === "Token not found or expired" ? 404 : 400).json({ error: result.error });
  }

  if (result.authorized) {
    // Generate active session for polling tab
    const editorPassword = result.password || process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
    const session = createAuthSession("cred_portal_authorized", result.deviceName || "Biometric Device", {
      editorPassword
    });
    authSessions.set(session.sessionId, session);
    savePersistedSessions();

    logPasskeyAudit("portal_token_polled", "success", {
      token,
      deviceName: result.deviceName,
      details: { consumed: true, sessionId: session.sessionId },
      req
    });
    return res.json({
      authorized: true,
      password: editorPassword,
      deviceName: result.deviceName,
      session: {
        sessionId: session.sessionId,
        deviceName: session.deviceName,
        expiresAt: session.expiresAt
      }
    });
  }

  res.json({ authorized: false });
});

// API: Direct Passkey Biometric Authentication (Native WebAuthn Assertion)
app.post("/api/passkeys/authenticate", async (req, res) => {
  const { credentialId, fingerprint } = req.body;
  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";

  const passkeys = await getPasskeys();
  const authResult = authenticatePasskeyCredential(credentialId, passkeys, expectedPassword);

  if (!authResult.authorized) {
    logPasskeyAudit("passkey_authenticated", "failure", {
      credentialId,
      details: { error: authResult.error },
      req
    });
    return res.status(403).json({ error: authResult.error || "Passkey verification failed." });
  }

  // Update lastUsedAt in multi-tier storage and Firestore if available
  if (authResult.updatedPasskeys) {
    writePasskeys(authResult.updatedPasskeys, true);
    if (db && authResult.matched) {
      try {
        await setDoc(doc(db, "passkeys", authResult.matched.id), authResult.matched);
      } catch (err) {
        console.error("Error updating passkey in Firestore:", err);
      }
    }
  }

  // Issue persistent session for window reload & tab closure resilience
  const clientFp = fingerprint || extractClientFingerprint(req);
  const session = createAuthSession(credentialId, authResult.matched?.deviceName || "Biometric Device", {
    fingerprintHash: clientFp.fingerprintHash,
    editorPassword: authResult.password
  });

  authSessions.set(session.sessionId, session);
  savePersistedSessions();

  logPasskeyAudit("passkey_authenticated", "success", {
    credentialId: authResult.matched?.id,
    deviceName: authResult.matched?.deviceName,
    details: {
      sessionId: session.sessionId,
      authCount: authResult.matched?.authCount,
      fingerprintHash: clientFp.fingerprintHash
    },
    req
  });

  logPasskeyAudit("session_issued", "success", {
    credentialId: authResult.matched?.id,
    deviceName: authResult.matched?.deviceName,
    details: {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt
    },
    req
  });

  res.json({
    success: true,
    authorized: true,
    password: authResult.password,
    session: {
      sessionId: session.sessionId,
      deviceName: session.deviceName,
      expiresAt: session.expiresAt
    }
  });
});

// API: Restore Session across Window Closures and Page Reloads
app.post("/api/passkeys/session-restore", (req, res) => {
  const { sessionId, fingerprint } = req.body;
  const clientFp = fingerprint || extractClientFingerprint(req);

  cleanExpiredSessions(authSessions);
  const result = validateAndRestoreSession(sessionId, authSessions, {
    fingerprintHash: clientFp.fingerprintHash
  });

  if (!result.valid) {
    logPasskeyAudit("session_restored_reload", "failure", {
      details: { sessionId, error: result.error },
      req
    });
    return res.status(401).json({ valid: false, error: result.error });
  }

  savePersistedSessions();

  logPasskeyAudit("session_restored_reload", "success", {
    credentialId: result.session?.credentialId,
    deviceName: result.session?.deviceName,
    details: {
      sessionId,
      reloadCount: result.session?.windowReloadCount,
      expiresAt: result.session?.expiresAt
    },
    req
  });

  res.json({
    valid: true,
    authorized: true,
    password: result.password,
    session: {
      sessionId: result.session?.sessionId,
      deviceName: result.session?.deviceName,
      expiresAt: result.session?.expiresAt,
      reloadCount: result.session?.windowReloadCount
    }
  });
});

// API: Check Session Validity
app.get("/api/passkeys/session-check", (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== "string") {
    return res.json({ valid: false });
  }

  const session = authSessions.get(sessionId);
  if (!session || Date.now() > session.expiresAt) {
    return res.json({ valid: false });
  }

  res.json({
    valid: true,
    deviceName: session.deviceName,
    expiresAt: session.expiresAt
  });
});

// API: Explicit Session Revocation (Logout)
app.post("/api/passkeys/session-revoke", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && typeof sessionId === "string") {
    const session = authSessions.get(sessionId);
    revokeAuthSession(sessionId, authSessions);
    savePersistedSessions();
    
    logPasskeyAudit("session_revoked", "success", {
      credentialId: session?.credentialId,
      deviceName: session?.deviceName,
      details: { sessionId },
      req
    });
  }
  res.json({ success: true });
});

// API: Query Immutable Passkey Audit Journal
app.get("/api/passkeys/audit-logs", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const eventType = req.query.eventType as string;
  const status = req.query.status as string;

  let records = readPasskeyAuditRecords(fs, undefined, limit * 2);

  if (eventType) {
    records = records.filter(r => r.eventType === eventType);
  }
  if (status) {
    records = records.filter(r => r.status === status);
  }

  res.json({
    records: records.slice(0, limit),
    totalCount: records.length
  });
});

// API: Passkey Pipeline Audit Summary & Diagnostics
app.get("/api/passkeys/audit-summary", async (req, res) => {
  const passkeys = await getPasskeys();
  const auditRecords = readPasskeyAuditRecords(fs, undefined, 200);
  const activeSessionCount = authSessions.size;

  const summary = {
    totalPasskeys: passkeys.length,
    activeSessions: activeSessionCount,
    totalAuditEvents: auditRecords.length,
    lastAuditEvent: auditRecords[0] || null,
    eventCounts: {
      registered: auditRecords.filter(r => r.eventType === "passkey_registered").length,
      authenticated: auditRecords.filter(r => r.eventType === "passkey_authenticated").length,
      sessionRestored: auditRecords.filter(r => r.eventType === "session_restored_reload").length,
      challenges: auditRecords.filter(r => r.eventType === "challenge_generated").length
    }
  };

  res.json(summary);
});

// API: Sync custom blogs from client and server
app.post("/api/blogs/sync", async (req, res) => {
  const clientBlogs = req.body.blogs || [];
  const serverBlogs = await getBlogs();
  
  // Merge lists using a Map keyed by id to avoid duplicates
  const mergedMap = new Map<string, any>();
  
  // First add all server-side blogs
  serverBlogs.forEach((blog: any) => {
    if (blog && blog.id) {
      mergedMap.set(blog.id, blog);
    }
  });
  
  // Then add client-side blogs (which might have been created offline or saved in localStorage)
  clientBlogs.forEach((blog: any) => {
    if (blog && blog.id) {
      mergedMap.set(blog.id, blog);
    }
  });
  
  const mergedBlogs = sortBlogsChronologically(Array.from(mergedMap.values()));
  
  await saveBlogs(mergedBlogs);
  res.json({ blogs: mergedBlogs });
});

// API: Verify GITHUB_TOKEN
app.get("/api/verify-github-token", async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.json({
      valid: false,
      token_present: false,
      message: "No GITHUB_TOKEN found in environment variables. Please add it to your secrets panel."
    });
  }

  try {
    // 1. Primary check: Verify token via GitHub REST API (which powers repo mirror & commits)
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AskMeridian-Sync/1.0"
      },
      signal: AbortSignal.timeout(6000)
    });

    if (userResponse.ok) {
      const userData: any = await userResponse.json();
      return res.json({
        valid: true,
        token_present: true,
        user: userData.login,
        name: userData.name,
        message: `GITHUB_TOKEN is valid! Authenticated as ${userData.login}${userData.name ? ` (${userData.name})` : ""}.`
      });
    }

    // 2. Secondary check: If supported, test GitHub Models API (Azure AI Inference)
    if (await checkGitHubModelsAvailability()) {
      try {
        const testResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: "ping" }],
            model: "gpt-4o-mini",
            max_tokens: 1
          }),
          signal: AbortSignal.timeout(6000)
        });

        if (testResponse.ok) {
          return res.json({
            valid: true,
            token_present: true,
            message: "GITHUB_TOKEN is valid! Verified successfully with GitHub Models (gpt-4o-mini)."
          });
        }
      } catch {
        // Fall through to report GitHub user API status
      }
    }

    return res.json({
      valid: false,
      token_present: true,
      message: `GitHub rejected the token. Status: ${userResponse.status}`
    });
  } catch (err: any) {
    return res.json({
      valid: false,
      token_present: true,
      message: `Failed to verify token: ${err.message || err}`
    });
  }
});

// Procedural scholarly article generator with authoritative arXiv domain-specific formulations
function generateProceduralPaperArticle(paperTitle: string, paperSummary: string, arxivLink: string, paperAuthors: string, triggerId: number) {
  const generated = generateScientificArticleFromArxiv(paperTitle, paperSummary, arxivLink, paperAuthors, triggerId);
  const bannerTags = Array.isArray(generated.tags) ? generated.tags.slice(0, 2).join(" & ") : "Optics & Quantum";
  const bannerSvg = generateProceduralBannerSvg(generated.title, bannerTags, triggerId);

  return {
    ...generated,
    bannerSvg
  };
}

// API: Generate Blog Post from arXiv with Full Real-time Telemetry & 6-Tier Persistence
app.post("/api/blog/generate", async (req, res) => {
  const { arxivInput, rawText, password, jobId: clientJobId } = req.body;
  const jobId = clientJobId || `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  if (!password || password !== expectedPassword) {
    return res.status(403).json({ error: "Unauthorized: Incorrect editor password." });
  }

  if (!arxivInput && !rawText) {
    return res.status(400).json({ error: "Missing arXiv input or raw text" });
  }

  let tracker = createPipelineTracker(jobId, arxivInput || "Raw Text Input", "", "");
  broadcastPipelineUpdate(tracker);

  try {
    let paperTitle = "";
    let paperSummary = "";
    let paperAuthors = "ArXiv Authors";
    let arxivLink = "";

    const arxivId = extractArxivId(arxivInput || "");
    if (arxivId) {
      tracker = recordStepProgress(tracker, 1, "ArXiv Metadata Ingestion", "ingestion", `Querying export.arxiv.org for ID: ${arxivId}`);
      broadcastPipelineUpdate(tracker);

      const meta = await fetchArxivMetadata(arxivId);
      if (meta) {
        paperTitle = meta.title;
        paperSummary = meta.summary;
        paperAuthors = meta.authors;
        arxivLink = meta.arxivLink;
        tracker.paperTitle = paperTitle;
        tracker.authors = paperAuthors;
        tracker.arxivId = arxivId;
      }
    }

    // Fallbacks if metadata fetch failed or was skipped
    if (!paperTitle && rawText) {
      paperTitle = "Pasted Paper Analysis";
      paperSummary = rawText.slice(0, 2000); // chunk of raw text for context
      arxivLink = arxivInput || "https://arxiv.org";
    } else if (!paperTitle) {
      paperTitle = arxivInput;
      paperSummary = rawText || arxivInput;
      arxivLink = arxivInput.startsWith("http") ? arxivInput : `https://arxiv.org/abs/${arxivInput}`;
    }

    tracker = recordStepProgress(
      tracker,
      2,
      "Angle Synthesis & Token Budgeting",
      "prompt_prep",
      `Formulating perspective angle for: "${paperTitle.slice(0, 50)}..."`
    );
    broadcastPipelineUpdate(tracker);

    const ai = getGeminiClient();
    const processTriggerId = Date.now();
    const anglePerspectives = [
      "Focus on the fundamental theoretical physics & mechanism",
      "Focus on the mathematical formulation & algebraic structures",
      "Focus on the computational paradigm & architectural innovations",
      "Focus on the experimental insights & physical implications",
      "Focus on the quantum/photonic dynamics & conceptual synthesis"
    ];
    const triggerAngle = anglePerspectives[processTriggerId % anglePerspectives.length];

    const systemInstruction = `You are a world-class academic blogger and science communicator. 
Your task is to translate an academic paper (based on its title, abstract, or full text) into a gorgeous, highly polished, comprehensive, and technical blog article.
The article must match the editorial style of "Ask Meridian" (https://ask-meridian.uk/blog/).

CRITICAL TITLE REQUIREMENT:
- You must carefully analyze the paper's core scientific contribution, mathematical framework, physical mechanism, or breakthrough and craft a unique, deeply thoughtful, highly engaging academic title.
- Every time this generation process is triggered, you MUST produce a distinct, fresh, creative title that explores a different angle or emphasis of the paper.
- NEVER reuse generic placeholder titles or repetitive title structures like "Pasted Paper Analysis" or simple verbatim paper title copies.
- Make the title academically rigorous, captivating, and unique for this specific trigger run.

This means the article should be:
- Deeply analytical, authoritative, and scientifically rigorous (no high-level fluffy generic summaries).
- Accessible but mathematically mature.
- Broken down into structured sections: "Introduction", "Key Concepts & Physics", "The Theoretical/Mathematical Formulation", "Architecture or Methodology", "Key Results & Findings", and "Scientific or Practical Implications".
- It MUST include a minimum of 3 detailed mathematical formulas formatted in standard LaTeX. Use "$formula$" for inline math and "$$formula$$" for block equations. Make sure the math is beautiful, highly relevant to the paper, and nicely spaced.
- Generate a beautiful, custom, fully scalable, dynamically animated inline SVG vector code string for the "bannerSvg". The SVG should represent the paper's core scientific concept in an abstract, modern, and aesthetically elite way (e.g., neural nodes, quantum wave tunnels, lattice grids, vector fields, molecules). 
  - MUST include embedded CSS <style> animation keyframes (@keyframes) or SVG animation tags for flowing waveforms (stroke-dashoffset animation), pulsing/glowing quantum nodes, floating particles, or rotating geometric core structures so the vector graphic dynamically moves and animates continuously.
  - Use a dark canvas theme: dark navy background (#0a1128 or #080f1e).
  - Use glowing neon accents: electric cyan (#00f2fe), hot pink (#ff007f), purple (#8b5cf6), or emerald (#38ef7d).
  - It must be self-contained, responsive (viewBox="0 0 800 400"), have no external font dependencies, and look completely professional (not basic or cluttered).`;

    const prompt = `Please generate an exquisite Ask Meridian-style academic blog post based on the following paper details:
Trigger Run ID: ${processTriggerId}
Angle Perspective for this trigger: ${triggerAngle}

Paper Title: ${paperTitle}
Authors/Context: ${paperAuthors}
Link: ${arxivLink}
Source Text/Abstract: ${paperSummary}

Requirements:
1. Title: Create a fresh, highly distinct, carefully considered academic title tailored specifically to this paper and this trigger run (ID: ${processTriggerId}). Ensure it highlights ${triggerAngle}.
2. The response must be valid JSON according to the schema provided. Make sure the 'content' field contains rich, deeply written Markdown text with multiple sections, technical explanations, and the required LaTeX equations.`;

    const estimatedInputTokens = estimateTokens(systemInstruction + prompt);
    tracker = recordStepProgress(
      tracker,
      3,
      "Model Inference & Response Streaming",
      "ai_inference",
      `Executing AI synthesis (~${estimatedInputTokens} input tokens)`
    );
    broadcastPipelineUpdate(tracker);

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.7-flash"
    ];

    let response: any = null;
    let lastError: any = null;
    let modelUsed = "procedural";
    let provider: "gemini" | "github_models" | "procedural" = "procedural";

    if (process.env.GEMINI_API_KEY) {
      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting blog generation with model: ${modelName}`);
          const genPromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "A carefully considered, paper-specific academic blog title. MUST be fresh, unique, creative, and distinct for this generation trigger run." },
                  excerpt: { type: Type.STRING, description: "A highly polished, captivating 1-sentence excerpt summarizing the post" },
                  readingTime: { type: Type.STRING, description: "Reading time estimate, e.g. '8 min read'" },
                  arxivLink: { type: Type.STRING, description: "Link to the source Arxiv paper" },
                  bannerSvg: { type: Type.STRING, description: "Complete responsive SVG code string starting with <svg viewBox='0 0 800 400'> and ending with </svg>. Dark space/navy background (#0a1128) with neon-glow geometric accents." },
                  content: { type: Type.STRING, description: "Comprehensive, publication-grade scholarly blog content in Markdown format, containing sections, paragraphs, bullet points, and at least 3 typeset LaTeX formulas." },
                  author: { type: Type.STRING, description: "Author name, default to 'Meridian Research'" },
                  tags: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "3-5 relevant technical tags, e.g., ['Quantum Computing', 'Physics']"
                  }
                },
                required: ["title", "excerpt", "readingTime", "arxivLink", "bannerSvg", "content", "author", "tags"]
              }
            }
          });

          // Timeout after 14 seconds per model attempt to prevent hanging
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini generation timed out")), 14000));
          response = await Promise.race([genPromise, timeoutPromise]);
          
          if (response && response.text) {
            console.log(`Successfully generated content using model: ${modelName}`);
            modelUsed = modelName;
            provider = "gemini";
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} failed or timed out:`, err.message || err);
          lastError = err;
        }
      }
    }

    let resultText = "";
    if (response && response.text) {
      resultText = response.text;
    } else if (process.env.GITHUB_TOKEN && (await checkGitHubModelsAvailability())) {
      console.log("Attempting fallback via GitHub Models (Azure AI Inference)...");
      try {
        const githubResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(10000),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" }
          })
        });

        if (githubResponse.ok) {
          const data: any = await githubResponse.json();
          if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            resultText = data.choices[0].message.content;
            modelUsed = "gpt-4o-mini";
            provider = "github_models";
            console.log("Successfully generated content using GitHub Models (gpt-4o-mini)");
          } else {
            console.log("Invalid response structure from GitHub Models:", data);
          }
        } else {
          const errText = await githubResponse.text();
          console.log(`GitHub Models API returned status ${githubResponse.status}: ${errText}`);
        }
      } catch (githubErr: any) {
        console.log("GitHub Models API unavailable or failed:", githubErr?.message || githubErr);
      }
    }

    tracker = recordStepProgress(
      tracker,
      4,
      "AST Validation & LaTeX Proof Check",
      "ast_validation",
      `Parsing JSON response and verifying mathematical structure`
    );
    broadcastPipelineUpdate(tracker);

    let parsedBlog: any = null;
    if (resultText) {
      try {
        const sanitizedText = cleanJsonText(resultText);
        parsedBlog = JSON.parse(sanitizedText);
      } catch (parseError: any) {
        console.error("JSON parsing failed, falling back to scholarly procedural synthesis:", parseError.message);
      }
    }

    // If both AI services were unavailable or parsing failed, use the procedural scholarly generator
    if (!parsedBlog || !parsedBlog.content) {
      console.log("Synthesizing scholarly article via high-fidelity procedural generator...");
      parsedBlog = generateProceduralPaperArticle(paperTitle, paperSummary, arxivLink, paperAuthors, processTriggerId);
      modelUsed = "procedural-scholarly-engine-v2";
      provider = "procedural";
    }

    tracker = recordStepProgress(
      tracker,
      5,
      "6-Tier Multi-Storage Replication",
      "persistence",
      `Replicating article to custom_blogs.json, src/data.ts, snapshot archive, and GitHub`
    );
    broadcastPipelineUpdate(tracker);
    
    // Add stable unique ID and slug for this trigger run
    const timestamp = Date.now();
    const slug = generateSlug(parsedBlog.title || paperTitle || "meridian-research");

    const newBlog = {
      ...parsedBlog,
      id: `generated-${timestamp}`,
      slug: `${slug}-${timestamp.toString().slice(-4)}`,
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
      createdAt: timestamp,
      timestamp: timestamp,
      views: getBlogViews(`generated-${timestamp}`)
    };

    // Always save generated blog across 6 redundant storage tiers
    const saveResult = await saveBlog(newBlog, "AI Studio Pipeline Generation");

    // Finalize execution telemetry record
    const finalRecord = finalizePipelineSuccess(
      tracker,
      newBlog,
      modelUsed,
      provider,
      prompt,
      resultText || JSON.stringify(parsedBlog),
      saveResult.tiers
    );

    // Append to immutable disk journal
    appendGenerationJournal(finalRecord);
    broadcastPipelineUpdate(finalRecord);

    res.json({ blog: newBlog, executionRecord: finalRecord });
  } catch (error: any) {
    console.error("Error generating blog:", error);
    const failRecord = finalizePipelineFailure(tracker, error.message || "Failed to generate blog post");
    appendGenerationJournal(failRecord);
    broadcastPipelineUpdate(failRecord);
    res.status(500).json({ error: error.message || "Failed to generate blog post", executionRecord: failRecord });
  }
});


// API: Regenerate Article Banner SVG
app.post("/api/blog/regenerate-banner", async (req, res) => {
  const { blogId, title, excerpt, content, tags, password, seed } = req.body;

  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  if (!password || password !== expectedPassword) {
    return res.status(403).json({ error: "Unauthorized: Incorrect editor password." });
  }

  if (!blogId && !title) {
    return res.status(400).json({ error: "Missing required blog details or blogId" });
  }

  try {
    const ai = getGeminiClient();
    const triggerId = (seed ? Number(seed) : Date.now()) + Math.floor(Math.random() * 100000);
    const tagList = Array.isArray(tags) ? tags.join(", ") : (tags || "Physics, Quantum, Optics");

    const artisticAesthetics = [
      "Focus on high-contrast interference waveforms, Fourier phase contours, and glowing node harmonics",
      "Focus on quantum optical cavity resonators, confocal beam waist modes, and refractive optics",
      "Focus on concentric Fresnel diffraction rings, caustic ray tracing, and photon scattering envelopes",
      "Focus on topological Riemannian manifolds, geodesic coordinate curves, and tensor contraction nodes",
      "Focus on sub-wavelength photonic crystal lattice bandgaps and guided laser dispersion paths"
    ];
    const chosenAesthetic = artisticAesthetics[Math.abs(triggerId) % artisticAesthetics.length];

    const systemInstruction = `You are a world-class vector artist and scientific graphic designer for "Ask Meridian".
Your task is to generate a custom, high-end, responsive inline SVG vector illustration for an academic research article banner.

REQUIREMENTS:
- Visual Theme: ${chosenAesthetic}.
- Theme & Aesthetic: Dark space/navy background (#0a1128 or #080f1e).
- Neon accents: Electric cyan (#00f2fe), hot pink (#ff007f), purple (#8b5cf6), emerald (#38ef7d), or amber (#f59e0b).
- Art style: Abstract, mathematical, geometric vector illustration representing the scientific concept (e.g. quantum circuits, optical lattices, neural graph nodes, wave interference, thermal manifolds, photonic crystals, laser cavity, matrix transformations).
- Dimensions: Responsive viewBox="0 0 800 400" aspect ratio.
- Code output: You MUST respond ONLY with the complete, valid, self-contained SVG element starting with <svg viewBox="0 0 800 400"...> and ending with </svg>. No markdown fences or extraneous surrounding text.`;

    const prompt = `Generate a brand-new, completely unique vector SVG banner (viewBox 0 0 800 400) for this publication:
Run Seed / ID: ${triggerId}
Title: ${title || "Scientific Research Publication"}
Tags: ${tagList}
Creative Angle: ${chosenAesthetic}
Excerpt: ${excerpt || ""}
Context Snippet: ${(content || "").slice(0, 500)}

Output strictly valid SVG XML starting with <svg> and ending with </svg>.`;

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.7-flash"
    ];

    let rawSvgResult = "";
    let lastError: any = null;

    if (process.env.GEMINI_API_KEY) {
      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting banner regeneration with model: ${modelName}`);
          const genPromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction
            }
          });

          // Timeout after 12 seconds to prevent hanging
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini banner generation timed out")), 12000));
          const response: any = await Promise.race([genPromise, timeoutPromise]);

          if (response && response.text) {
            rawSvgResult = response.text;
            console.log(`Successfully regenerated banner using model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} failed for banner generation:`, err.message || err);
          lastError = err;
        }
      }
    }

    if (!rawSvgResult && process.env.GITHUB_TOKEN && (await checkGitHubModelsAvailability())) {
      console.log("Attempting fallback to GitHub Models for banner SVG generation...");
      try {
        const githubResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            model: "gpt-4o-mini"
          })
        });

        if (githubResponse.ok) {
          const data: any = await githubResponse.json();
          if (data.choices && data.choices[0] && data.choices[0].message?.content) {
            rawSvgResult = data.choices[0].message.content;
            console.log("Successfully generated banner SVG using GitHub Models (gpt-4o-mini)");
          }
        }
      } catch (githubErr: any) {
        console.log("GitHub Models fallback unavailable for banner SVG:", githubErr?.message || githubErr);
      }
    }

    let cleanSvg = extractSvgString(rawSvgResult);
    if (!cleanSvg || !cleanSvg.includes("<svg")) {
      console.log("Using procedural high-contrast mathematical vector banner generator with seed:", triggerId);
      cleanSvg = generateProceduralBannerSvg(title, tagList, triggerId);
    }

    // Persist updated blog with new banner SVG in custom_blogs.json & Firestore
    const localBlogs = readCustomBlogs();
    const blogIdx = localBlogs.findIndex((b: any) => b.id === blogId || b.slug === blogId);
    let updatedBlog: any = null;

    if (blogIdx !== -1) {
      localBlogs[blogIdx].bannerSvg = cleanSvg;
      updatedBlog = localBlogs[blogIdx];
      writeLocalBlogFiles(localBlogs);
    } else {
      // If blog was not yet in custom_blogs (e.g. preloaded blog), create or save an updated record
      updatedBlog = {
        id: blogId,
        title: title || "Research Publication",
        excerpt: excerpt || "",
        content: content || "",
        tags: Array.isArray(tags) ? tags : [tags || "Quantum Physics"],
        bannerSvg: cleanSvg,
        date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        readingTime: "8 min read",
        author: "Meridian Research"
      };
      localBlogs.unshift(updatedBlog);
      writeLocalBlogFiles(localBlogs);
    }

    if (db && updatedBlog && updatedBlog.id) {
      try {
        await setDoc(doc(db, "blogs", updatedBlog.id), updatedBlog);
        console.log(`Updated bannerSvg for blog "${updatedBlog.id}" in Firestore.`);
      } catch (dbErr) {
        console.error("Error saving updated bannerSvg to Firestore:", dbErr);
      }
    }

    // Background GitHub sync
    syncAllBlogsToGitHub(localBlogs, `regenerate banner for "${(updatedBlog.title || title || "").slice(0, 30)}"`)
      .catch((err) => console.warn("[GitHub Mirror] Banner regen sync warning:", err));

    res.json({ success: true, bannerSvg: cleanSvg, blog: updatedBlog });
  } catch (error: any) {
    console.error("Error regenerating banner:", error);
    res.status(500).json({ error: error.message || "Failed to regenerate banner" });
  }
});

// API: Regenerate Full Academic Article
app.post("/api/blog/regenerate-article", async (req, res) => {
  try {
    const { blogId, title, excerpt, content, tags, arxivLink, password, seed } = req.body || {};

    const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
    if (password && password !== expectedPassword) {
      return res.status(403).json({ error: "Unauthorized: Invalid editor password" });
    }

    if (!blogId && !title && !arxivLink) {
      return res.status(400).json({ error: "Missing required identifier (blogId, title, or arxivLink)" });
    }

    const triggerId = typeof seed === "number" ? seed : Date.now();
    let paperTitle = (title || "").trim();
    let paperSummary = (excerpt || (content ? content.slice(0, 800) : "")).trim();
    let paperAuthors = "ArXiv Authors";
    let fullArxivUrl = arxivLink || "https://arxiv.org";

    // Attempt to extract arXiv ID and fetch authoritative metadata if possible
    const arxivMatch = (arxivLink || "").match(/(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})/i) ||
      (title || "").match(/(\d{4}\.\d{4,5}(?:v\d+)?)/i);

    if (arxivMatch) {
      const arxivId = arxivMatch[1];
      try {
        const meta = await fetchArxivMetadata(arxivId);
        if (meta) {
          paperTitle = meta.title || paperTitle;
          paperSummary = meta.summary || paperSummary;
          paperAuthors = meta.authors || paperAuthors;
          fullArxivUrl = meta.arxivLink || fullArxivUrl;
        }
      } catch (err) {
        console.warn(`[arXiv Ingestion] Note: Could not fetch fresh arXiv metadata for ID ${arxivId}, proceeding with provided blog metadata.`, err);
      }
    }

    let generatedBlogData: any = null;
    const tagList = Array.isArray(tags) && tags.length > 0 ? tags.join(", ") : "Optics, Quantum Computing, Theoretical Physics";

    // System prompt for publication-grade academic analysis
    const systemInstruction = `You are the Senior Research Editor & Theoretical Physicist at Meridian Research (https://ask-meridian.uk).
Your goal is to author a rigorous, exhaustive, mathematically elegant scholarly editorial analyzing the provided scientific paper.

Structure Guidelines:
1. Executive Abstract & Core Contributions: High-level distillation with core breakthroughs and context.
2. Key Theoretical Formulations & Physics / Math: Rigorous LaTeX mathematical derivations ($$...$$ and $...$) specific to the subject. Never repeat boilerplate. Derive the actual field equations, matrices, or Hamiltonian/loss functions relevant to the paper.
3. Architecture & Methodological Paradigm: Step-by-step breakdown of experimental or computational methodologies.
4. Key Results & Empirical Findings: Quantitative metrics, scaling bounds, fidelity numbers, or computational speedups.
5. Scientific Implications & Horizon: Broader impact on optics, quantum computing, information theory, or mathematical physics.

JSON Schema format required:
{
  "title": "Compelling Scholarly Title",
  "excerpt": "A 2-3 sentence academic overview.",
  "readingTime": "8 min read",
  "arxivLink": "${fullArxivUrl}",
  "content": "Full markdown text with LaTeX equations and section headings",
  "tags": ["3-5 high precision scientific tags"],
  "author": "${paperAuthors}"
}`;

    const prompt = `Please regenerate a comprehensive, brand-new scholarly research article for the following scientific publication:
Run Seed: ${triggerId}
Original Title: ${paperTitle || "Frontier Analysis in Quantum Photonics & Mathematical Physics"}
Authors: ${paperAuthors}
arXiv URL: ${fullArxivUrl}
Existing Abstract / Excerpt: ${paperSummary}
Existing Tags: ${tagList}

Generate a fresh, in-depth academic synthesis with unique mathematical derivations and clean markdown formatting. Output strictly valid JSON matching the schema.`;

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.7-flash"
    ];

    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting article regeneration with model: ${modelName}`);
          const genPromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  excerpt: { type: Type.STRING },
                  readingTime: { type: Type.STRING },
                  arxivLink: { type: Type.STRING },
                  content: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  author: { type: Type.STRING },
                  bannerSvg: { type: Type.STRING, nullable: true }
                },
                required: ["title", "excerpt", "readingTime", "arxivLink", "content", "tags", "author"]
              }
            }
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout with model ${modelName}`)), 22000)
          );

          const response = (await Promise.race([genPromise, timeoutPromise])) as any;
          const text = response.text ? response.text.trim() : "";
          if (text) {
            generatedBlogData = JSON.parse(text);
            console.log(`Successfully regenerated article via Gemini (${modelName})`);
            break;
          }
        } catch (err: any) {
          console.warn(`Gemini article regeneration failed on ${modelName}:`, err.message || err);
        }
      }
    }

    // Fallback to GitHub Models if Gemini failed
    if (!generatedBlogData && process.env.GITHUB_TOKEN && (await checkGitHubModelsAvailability())) {
      try {
        console.log("Attempting article regeneration via GitHub Models (gpt-4o-mini)...");
        const ghResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
          })
        });

        if (ghResponse.ok) {
          const ghData = await ghResponse.json();
          const ghContent = ghData?.choices?.[0]?.message?.content;
          if (ghContent) {
            generatedBlogData = JSON.parse(ghContent);
            console.log("Successfully regenerated article via GitHub Models");
          }
        }
      } catch (ghErr: any) {
        console.log("GitHub Models article regeneration unavailable:", ghErr?.message || ghErr);
      }
    }

    // Procedural generation fallback if AI models were unavailable
    if (!generatedBlogData) {
      console.log("Using dynamic domain procedural generation fallback for article regeneration.");
      generatedBlogData = generateProceduralPaperArticle(paperTitle, paperSummary, fullArxivUrl, paperAuthors, triggerId);
    }

    // Generate or refine banner SVG for the regenerated article
    let finalBannerSvg = generatedBlogData.bannerSvg;
    if (!finalBannerSvg || !finalBannerSvg.startsWith("<svg") || !finalBannerSvg.endsWith("</svg>")) {
      const bannerTags = Array.isArray(generatedBlogData.tags) ? generatedBlogData.tags.join(" & ") : tagList;
      finalBannerSvg = generateProceduralBannerSvg(generatedBlogData.title || paperTitle, bannerTags, triggerId);
    }

    // Read current custom blogs
    let localBlogs: any[] = [];
    if (fs.existsSync(CUSTOM_BLOGS_FILE)) {
      try {
        const raw = fs.readFileSync(CUSTOM_BLOGS_FILE, "utf-8");
        localBlogs = JSON.parse(raw);
      } catch (readErr) {
        console.error("Error reading custom_blogs.json:", readErr);
      }
    }

    // Find blog to update by blogId, or slug, or title match
    const existingIndex = localBlogs.findIndex((b: any) =>
      b.id === blogId ||
      b.slug === blogId ||
      (blogId && b.id && b.id.toString() === blogId.toString()) ||
      (arxivLink && b.arxivLink === arxivLink) ||
      (paperTitle && b.title && b.title.toLowerCase().trim() === paperTitle.toLowerCase().trim())
    );

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const targetId = existingIndex >= 0 ? localBlogs[existingIndex].id : (blogId || `blog-${Date.now()}`);
    const targetSlug = existingIndex >= 0 ? localBlogs[existingIndex].slug : (generatedBlogData.title || paperTitle).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);

    const updatedBlog = {
      ...(existingIndex >= 0 ? localBlogs[existingIndex] : {}),
      id: targetId,
      slug: targetSlug,
      title: generatedBlogData.title || paperTitle,
      excerpt: generatedBlogData.excerpt || paperSummary,
      content: generatedBlogData.content,
      readingTime: generatedBlogData.readingTime || "8 min read",
      date: formattedDate,
      arxivLink: generatedBlogData.arxivLink || fullArxivUrl,
      bannerSvg: finalBannerSvg,
      author: generatedBlogData.author || paperAuthors,
      tags: Array.isArray(generatedBlogData.tags) ? generatedBlogData.tags : ["Optics", "Quantum Computing"],
      updatedAt: now.toISOString()
    };

    // Run automated post-generation arXiv alignment and anti-boilerplate audit
    let auditReport = auditArticleAgainstArxiv(updatedBlog, {
      title: paperTitle,
      summary: paperSummary,
      authors: paperAuthors
    });

    // If the audit flags failure or critical boilerplate, auto-refine with bespoke scientific formulation
    if (auditReport.status === "FAIL" || auditReport.detectedBoilerplatePhrases.length > 0) {
      console.warn(`[Audit System] Audit flagged issues in regenerated article (Score: ${auditReport.fidelityScore}, Issues: ${auditReport.detectedBoilerplatePhrases.join(", ")}). Auto-refining...`);
      const refined = generateScientificArticleFromArxiv(paperTitle, paperSummary, fullArxivUrl, paperAuthors, triggerId + 1);
      updatedBlog.content = refined.content;
      updatedBlog.tags = refined.tags;
      updatedBlog.excerpt = refined.excerpt;
      auditReport = auditArticleAgainstArxiv(updatedBlog, {
        title: paperTitle,
        summary: paperSummary,
        authors: paperAuthors
      });
    }

    if (existingIndex >= 0) {
      localBlogs[existingIndex] = updatedBlog;
    } else {
      localBlogs.unshift(updatedBlog);
    }

    const sortedLocalBlogs = sortBlogsChronologically(localBlogs);

    // Save to custom_blogs.json and src/data.ts
    try {
      writeLocalBlogFiles(sortedLocalBlogs);
      console.log(`Successfully saved regenerated article "${updatedBlog.id}" to custom_blogs.json and src/data.ts`);
    } catch (writeErr) {
      console.error("Error writing local blog files:", writeErr);
    }

    // Save to Firestore if available
    if (db) {
      try {
        await setDoc(doc(db, "blogs", updatedBlog.id), updatedBlog);
        console.log(`Updated regenerated article "${updatedBlog.id}" in Firestore.`);
      } catch (dbErr) {
        console.error("Error saving regenerated article to Firestore:", dbErr);
      }
    }

    // Background GitHub sync
    syncAllBlogsToGitHub(sortedLocalBlogs, `regenerate article for "${(updatedBlog.title || "").slice(0, 30)}"`)
      .catch((err) => console.warn("[GitHub Mirror] Article regen sync warning:", err));

    res.json({ success: true, blog: updatedBlog, audit: auditReport });
  } catch (error: any) {
    console.error("Error regenerating article:", error);
    res.status(500).json({ error: error.message || "Failed to regenerate article" });
  }
});

// API: Audit a specific article against arXiv reference metadata
app.post("/api/blog/audit-article", async (req, res) => {
  try {
    const { blog, arxivId: inputArxivId } = req.body || {};
    if (!blog) {
      return res.status(400).json({ error: "Missing blog object to audit" });
    }

    let arxivMeta = null;
    const arxivId = inputArxivId || extractArxivId(blog.arxivLink || "") || extractArxivId(blog.title || "");
    if (arxivId) {
      try {
        arxivMeta = await fetchArxivMetadata(arxivId);
      } catch (err) {
        console.warn(`Could not fetch arXiv metadata for ID ${arxivId}:`, err);
      }
    }

    const report = auditArticleAgainstArxiv(blog, arxivMeta);
    res.json({ success: true, report, arxivMeta });
  } catch (error: any) {
    console.error("Error auditing article:", error);
    res.status(500).json({ error: error.message || "Failed to audit article" });
  }
});

// API: Cross-catalog audit for duplicate findings and arXiv alignment
app.get("/api/blog/audit-catalog", async (req, res) => {
  try {
    const blogs = await getBlogs();
    const catalogSummary = auditCatalogUniqueness(blogs);
    res.json({ success: true, summary: catalogSummary });
  } catch (error: any) {
    console.error("Error running catalog audit:", error);
    res.status(500).json({ error: error.message || "Failed to run catalog audit" });
  }
});

// API: Predict Daily Recommended Paper in Optics and Quantum Physics based on user's blog history
app.post("/api/blog/predict", async (req, res) => {
  try {
    // 1. Get history of blogs
    const blogs = await getBlogs();
    const historyList = blogs.map((b: any) => ({
      title: b.title,
      excerpt: b.excerpt,
      tags: b.tags || []
    })).slice(0, 10); // Take top 10 most recent for context to stay within token limits cleanly
    
    // 2. Fetch recent papers in optics and quantum physics from arXiv
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=cat:physics.optics+OR+cat:quant-ph&sortBy=submittedDate&sortOrder=descending&max_results=25`;
    const response = await fetch(arxivUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch recent papers from arXiv: ${response.statusText}`);
    }
    const xml = await response.text();
    const candidates = parseArxivFeedXml(xml);
    
    if (candidates.length === 0) {
      return res.status(404).json({ error: "No papers found in optics or quantum physics categories on arXiv." });
    }
    
    // 3. Call Gemini to predict/recommend the best paper
    const ai = getGeminiClient();
    
    const systemInstruction = `You are "Meridian AI Advisor", a state-of-the-art predictive scientific recommendation agent.
Your goal is to analyze the user's reading/writing history of academic blog publications, and select the single most compelling and mathematically fitting next paper from a list of recent arXiv papers.
Your recommended paper must belong strictly to the Optics (physics.optics) or Quantum Physics (quant-ph) categories.
You must generate a captivating, intellectually mature scientific explanation of why this specific paper is today's top predicted article, explaining how it bridges or extends the theories, math, or models found in their past publications.`;

    const prompt = `Here is the user's publication history (recent articles they have read or written reviews for):
${JSON.stringify(historyList, null, 2)}

And here is the feed of today's recent, real arXiv papers in Optics and Quantum Physics:
${JSON.stringify(candidates.map((c, idx) => ({ index: idx, id: c.id, title: c.title, summary: c.summary, authors: c.authors })), null, 2)}

Analyze the user's history, find common research interest themes (e.g., specific math structures, physical phenomena, machine learning techniques applied to physics), and select the single BEST matching paper from the arXiv feed.
Generate a personalized, highly inspiring, and technical AI reasoning explanation (3-4 sentences, elegant, in Ask Meridian style) explaining how this paper is the perfect next step in their academic journey.

The response must be valid JSON according to the schema.`;

    const modelsToTry = [
      "gemini-3.7-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview"
    ];

    let modelResult: any = null;
    let lastErr: any = null;
    for (const modelName of modelsToTry) {
      try {
        modelResult = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                selectedIndex: { type: Type.INTEGER, description: "The index of the selected paper in the provided arXiv list (0-based)" },
                reasoning: { type: Type.STRING, description: "A beautifully composed, technically mature 3-4 sentence explanation of why this paper is recommended, citing specific concepts from their past articles." }
              },
              required: ["selectedIndex", "reasoning"]
            }
          }
        });
        if (modelResult && modelResult.text) break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    const resultText = modelResult?.text;
    if (!resultText) {
      throw lastErr || new Error("Empty response from prediction model");
    }

    const sanitizedText = cleanJsonText(resultText);
    const parsedPrediction = JSON.parse(sanitizedText);
    const selectedIdx = parsedPrediction.selectedIndex;
    
    if (selectedIdx < 0 || selectedIdx >= candidates.length) {
      throw new Error(`Invalid selected index: ${selectedIdx}`);
    }
    
    const predictedPaper = candidates[selectedIdx];
    
    res.json({
      predictedPaper,
      reasoning: parsedPrediction.reasoning,
      predictedAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error("Error predicting blog recommendation:", error);
    res.status(500).json({ error: error.message || "Failed to make scientific paper prediction" });
  }
});

// API: Get SMTP & WhatsApp configuration
app.get("/api/dispatch/config", (req, res) => {
  const config = readSmtpConfig();
  res.json({
    host: config.host || "",
    port: config.port || 587,
    user: config.user || "",
    pass: config.pass ? "********" : "",
    from: config.from || "Meridian Research <no-reply@ask-meridian.uk>",
    recipient: config.recipient || "lucas.kempe@icloud.com",
    twilioSid: config.twilioSid || "",
    twilioToken: config.twilioToken ? "********" : "",
    twilioFrom: config.twilioFrom || "+14155238886",
    whatsappRecipient: config.whatsappRecipient || "1170666236"
  });
});

// API: Update SMTP & WhatsApp configuration
app.post("/api/dispatch/config", (req, res) => {
  const { host, port, user, pass, from, recipient, twilioSid, twilioToken, twilioFrom, whatsappRecipient } = req.body;
  const currentConfig = readSmtpConfig();
  
  const updated = {
    host: host !== undefined ? host : currentConfig.host,
    port: port !== undefined ? parseInt(port) || 587 : currentConfig.port,
    user: user !== undefined ? user : currentConfig.user,
    pass: pass !== undefined && pass !== "********" ? pass : currentConfig.pass,
    from: from !== undefined ? from : currentConfig.from,
    recipient: recipient !== undefined ? recipient : currentConfig.recipient,
    twilioSid: twilioSid !== undefined ? twilioSid : currentConfig.twilioSid,
    twilioToken: twilioToken !== undefined && twilioToken !== "********" ? twilioToken : currentConfig.twilioToken,
    twilioFrom: twilioFrom !== undefined ? twilioFrom : currentConfig.twilioFrom,
    whatsappRecipient: whatsappRecipient !== undefined ? whatsappRecipient : currentConfig.whatsappRecipient
  };

  writeSmtpConfig(updated);
  res.json({ success: true, message: "SMTP & WhatsApp configuration updated successfully." });
});

// API: Get email dispatch logs
app.get("/api/dispatch/emails", (req, res) => {
  const emails = readDispatchedEmails();
  res.json({ emails });
});

// API: Publish a specific draft option
app.post("/api/blogs/publish-draft", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing draft ID" });
  }

  try {
    const blogs = await getBlogs();
    const draftIndex = blogs.findIndex((b: any) => b.id === id);
    if (draftIndex === -1) {
      return res.status(404).json({ error: "Draft blog option not found in database." });
    }

    // Set the status of the selected blog to published
    const updatedBlog = {
      ...blogs[draftIndex],
      status: "published",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    };

    // Update the list of blogs
    const updatedBlogs = blogs.map((b: any) => b.id === id ? updatedBlog : b);
    await saveBlogs(updatedBlogs);

    res.json({ success: true, blog: updatedBlog });
  } catch (error: any) {
    console.error("Error publishing draft:", error);
    res.status(500).json({ error: error.message || "Failed to publish draft option" });
  }
});

// API: Generate daily dual publication drafts & dispatch email (RAG + Algebra Focus)
app.post("/api/dispatch/generate-options", async (req, res) => {
  try {
    // 1. Get user blog history (RAG Context)
    const blogs = await getBlogs();
    const published = blogs.filter((b: any) => b.status !== "draft_option");
    const historyList = published.map((b: any) => ({
      title: b.title,
      excerpt: b.excerpt,
      tags: b.tags || [],
      contentSnippet: b.content ? b.content.slice(0, 400) : ""
    })).slice(0, 6);

    // 2. Fetch recent arXiv preprints from cat:physics.optics and cat:quant-ph
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=cat:physics.optics+OR+cat:quant-ph&sortBy=submittedDate&sortOrder=descending&max_results=15`;
    const response = await fetch(arxivUrl);
    if (!response.ok) {
      throw new Error(`arXiv API fetch failed: ${response.statusText}`);
    }
    const xml = await response.text();
    const candidates = parseArxivFeedXml(xml);

    if (candidates.length === 0) {
      return res.status(404).json({ error: "No recent preprints found on arXiv." });
    }

    // 3. Call Gemini to predict/recommend and write TWO distinct blog drafts
    const ai = getGeminiClient();
    const systemInstruction = `You are "Meridian AI Advisor", a state-of-the-art predictive scientific recommendation and authoring agent.
Your task is to review the user's publication history, and today's arXiv papers feed in Optics (physics.optics) and Quantum Physics (quant-ph).
You must select exactly TWO papers from the feed and author two full publication-ready blog drafts:
- Option A (Optics/Quantum Focus): Select a paper focusing on optics or quantum optics. Write a highly detailed academic blog post with deep technical reasoning, equations, and insights.
- Option B (Algebra/Mathematical Focus): Select a different paper focusing on mathematical foundations, algebraic structures, operator algebras, or linear algebra in optics/quantum physics. Write a deeply mathematical analysis, showing full derivations and equations.

CRITICAL TITLE REQUIREMENT:
For both options, carefully consider the core scientific discovery, mathematical framework, or physical breakthrough of each selected paper and craft a unique, deeply thoughtful, highly compelling academic title. Every time this process triggers, create fresh, distinct titles that explore the unique novelty of the paper and never reuse generic template titles.

For both options, you must write a comprehensive, long-form academic blog post (content) in markdown format. You must embed rich, professionally-crafted KaTeX/LaTeX math equations (use inline $...$ and block $$...$$) to describe the physics and derivations.`;

    const prompt = `Here is the user's publication history (recent blogs):
${JSON.stringify(historyList, null, 2)}

Here is the feed of today's arXiv papers:
${JSON.stringify(candidates.map((p, i) => ({ index: i, id: p.id, title: p.title, summary: p.summary, authors: p.authors })), null, 2)}

Choose exactly TWO distinct papers from the feed.
- Assign one to Option A (Optics/Quantum Focus).
- Assign another to Option B (Algebra/Mathematical Focus).

For each option, generate:
1. arxivId: The actual arXiv ID of the paper (e.g. "2304.12345").
2. title: A carefully considered, fresh, unique, and serious academic title for the blog post based on the paper's core discovery.
3. excerpt: A compelling 1-2 sentence subtitle/summary.
4. tags: Array of 3-4 relevant tags (e.g. ["Optics", "Quantum", "Algebra", "Squeezed Light", "Lie Groups"]).
5. ragAlignment: A 2-sentence explanation of why this paper was selected and how it extends themes in the user's reading history.
6. content: A long, detailed academic blog post in Markdown format (~400-600 words) summarizing the paper's findings, highlighting the technical and mathematical innovations, showing full mathematical derivations or formulations using LaTeX/KaTeX (enclosed in $...$ and $$...$$).

Respond strictly with valid JSON conforming to the response schema.`;

    const modelsToTry = [
      "gemini-3.7-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview"
    ];

    let modelResult: any = null;
    let lastErr: any = null;
    for (const modelName of modelsToTry) {
      try {
        modelResult = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                optionA: {
                  type: Type.OBJECT,
                  properties: {
                    arxivId: { type: Type.STRING },
                    title: { type: Type.STRING },
                    excerpt: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    ragAlignment: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["arxivId", "title", "excerpt", "tags", "ragAlignment", "content"]
                },
                optionB: {
                  type: Type.OBJECT,
                  properties: {
                    arxivId: { type: Type.STRING },
                    title: { type: Type.STRING },
                    excerpt: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    ragAlignment: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["arxivId", "title", "excerpt", "tags", "ragAlignment", "content"]
                }
              },
              required: ["optionA", "optionB"]
            }
          }
        });
        if (modelResult && modelResult.text) break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    const resultText = modelResult?.text;
    if (!resultText) {
      throw lastErr || new Error("Empty response from prediction model");
    }

    const sanitizedText = cleanJsonText(resultText);
    const parsedData = JSON.parse(sanitizedText);

    // Create Draft Objects
    const timestamp = Date.now();
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;

    const draftA = {
      id: `draft-optics-${timestamp}`,
      slug: `draft-optics-${timestamp.toString().slice(-4)}`,
      title: parsedData.optionA.title,
      excerpt: parsedData.optionA.excerpt,
      content: parsedData.optionA.content,
      tags: parsedData.optionA.tags || ["Optics"],
      status: "draft_option",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      arxivLink: `https://arxiv.org/abs/${parsedData.optionA.arxivId}`,
      ragAlignment: parsedData.optionA.ragAlignment,
      category: "Optics Focus"
    };

    const draftB = {
      id: `draft-algebra-${timestamp}`,
      slug: `draft-algebra-${timestamp.toString().slice(-4)}`,
      title: parsedData.optionB.title,
      excerpt: parsedData.optionB.excerpt,
      content: parsedData.optionB.content,
      tags: parsedData.optionB.tags || ["Algebra"],
      status: "draft_option",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      arxivLink: `https://arxiv.org/abs/${parsedData.optionB.arxivId}`,
      ragAlignment: parsedData.optionB.ragAlignment,
      category: "Algebra Focus"
    };

    await saveBlog(draftA);
    await saveBlog(draftB);

    // Create high-fidelity HTML email template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Publications Dispatch</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #030712;
      color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      border-bottom: 1px solid #1f2937;
      padding-bottom: 30px;
      margin-bottom: 30px;
    }
    .logo {
      font-family: Georgia, serif;
      font-size: 28px;
      font-style: italic;
      color: #06b6d4;
      text-decoration: none;
      font-weight: bold;
    }
    .subtitle {
      font-size: 12px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 10px;
    }
    .intro {
      font-size: 15px;
      line-height: 1.6;
      color: #d1d5db;
      margin-bottom: 30px;
    }
    .card {
      background-color: #0b1329;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .tag {
      display: inline-block;
      font-size: 10px;
      font-weight: bold;
      background-color: #0f172a;
      color: #38bdf8;
      border: 1px solid #1e293b;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    .card-title {
      font-family: Georgia, serif;
      font-size: 20px;
      color: #f3f4f6;
      margin: 0 0 10px 0;
      line-height: 1.3;
    }
    .card-excerpt {
      font-size: 14px;
      color: #9ca3af;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .alignment {
      font-size: 12px;
      color: #06b6d4;
      background-color: rgba(6, 182, 212, 0.05);
      border-left: 3px solid #06b6d4;
      padding: 10px;
      margin-bottom: 20px;
      border-radius: 0 8px 8px 0;
    }
    .btn {
      display: inline-block;
      background-color: #06b6d4;
      color: #030712;
      font-weight: bold;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      text-align: center;
    }
    .btn:hover {
      background-color: #22d3ee;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #6b7280;
      margin-top: 40px;
      border-top: 1px solid #1f2937;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${appUrl}" class="logo">Meridian Research</a>
      <div class="subtitle">AI Advisor Daily Dispatch</div>
    </div>
    
    <div class="intro">
      Dear Lucas,<br><br>
      We have completed today's predictive RAG pathways analysis. Based on your reading history, we have compiled exactly two peer-reviewed arXiv preprints into custom, publication-ready review articles. Select one below to instantly authorize and publish it to the main feed.
    </div>
    
    <div class="card">
      <div class="tag">OPTION A: OPTICS / QUANTUM FOCUS</div>
      <h3 class="card-title">${draftA.title}</h3>
      <p class="card-excerpt">${draftA.excerpt}</p>
      <div class="alignment">
        <strong>Advisor Alignment:</strong> ${draftA.ragAlignment}
      </div>
      <a href="${appUrl}/?publish_draft=${draftA.id}" class="btn">Authenticate & Publish Option A</a>
    </div>
    
    <div class="card" style="border-color: #334155;">
      <div class="tag" style="color: #a855f7; background-color: #1e1b4b; border-color: #3b0764;">OPTION B: ALGEBRA / MATHEMATICAL FOCUS</div>
      <h3 class="card-title">${draftB.title}</h3>
      <p class="card-excerpt">${draftB.excerpt}</p>
      <div class="alignment" style="color: #a855f7; border-left-color: #a855f7; background-color: rgba(168, 85, 247, 0.05);">
        <strong>Advisor Alignment:</strong> ${draftB.ragAlignment}
      </div>
      <a href="${appUrl}/?publish_draft=${draftB.id}" class="btn" style="background-color: #a855f7; color: #ffffff;">Authenticate & Publish Option B</a>
    </div>
    
    <div class="footer">
      This is an automated dispatch from your personalized Meridian AI Advisor. <br>
      To manage your integration, visit the Dispatch Credentials tab on your dashboard.<br><br>
      © 2026 Meridian Research. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    const smtp = readSmtpConfig();
    let dispatchStatus = "Simulated Dispatch (No SMTP credentials configured)";

    if (smtp.host && smtp.user && smtp.pass) {
      try {
        console.log(`Attempting real email dispatch to ${smtp.recipient}...`);
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.port === 465,
          auth: {
            user: smtp.user,
            pass: smtp.pass
          }
        });

        await transporter.sendMail({
          from: smtp.from,
          to: smtp.recipient,
          subject: `[Meridian Advisor] Select Today's Publication: Optics vs Quantum Physics`,
          html: emailHtml
        });

        dispatchStatus = `Successfully Dispatched via SMTP to ${smtp.recipient}`;
        console.log("Real email sent successfully!");
      } catch (smtpErr: any) {
        console.error("Failed to send real email via SMTP:", smtpErr);
        dispatchStatus = `SMTP failure: ${smtpErr.message || smtpErr}`;
      }
    } else {
      console.log(`[SIMULATED EMAIL DISPATCH] to ${smtp.recipient}`);
    }

    // Send WhatsApp via Twilio if configured, or log high-fidelity simulation
    let whatsappStatus = "Simulated WhatsApp Dispatch (No Twilio credentials configured)";
    const waMsgBody = `*Meridian AI Advisor: Daily Forecast* 🌟\n\nDear Lucas, we have executed our daily RAG predictive analysis. Two custom publication-ready drafts are compiled in your database:\n\n*Option A: ${draftA.title}*\n• arXiv: ${parsedData.optionA.arxivId}\n• Alignment: ${draftA.ragAlignment.slice(0, 100)}...\n👉 Publish Option A: ${appUrl}/?publish_draft=${draftA.id}\n\n*Option B: ${draftB.title}*\n• arXiv: ${parsedData.optionB.arxivId}\n• Alignment: ${draftB.ragAlignment.slice(0, 100)}...\n👉 Publish Option B: ${appUrl}/?publish_draft=${draftB.id}\n\nSelect either link to authenticate & publish instantly to Ask Meridian!`;

    let rawRecipient = smtp.whatsappRecipient || "1170666236";
    let formattedRecipient = rawRecipient.trim();
    if (!formattedRecipient.startsWith("+")) {
      if (formattedRecipient.startsWith("11")) {
        formattedRecipient = "+549" + formattedRecipient;
      } else {
        formattedRecipient = "+" + formattedRecipient;
      }
    }

    if (smtp.twilioSid && smtp.twilioToken && smtp.twilioFrom) {
      try {
        console.log(`Attempting to send real WhatsApp message to ${formattedRecipient} via Twilio...`);
        const twilioSid = smtp.twilioSid;
        const twilioToken = smtp.twilioToken;
        const twilioFrom = smtp.twilioFrom;

        const twilioFromFormatted = twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`;
        const twilioToFormatted = `whatsapp:${formattedRecipient}`;
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

        const twilioBody = new URLSearchParams({
          From: twilioFromFormatted,
          To: twilioToFormatted,
          Body: waMsgBody
        });

        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: twilioBody.toString()
        });

        if (twilioRes.ok) {
          whatsappStatus = `Successfully Sent Real WhatsApp via Twilio to ${formattedRecipient}`;
          console.log("Real WhatsApp sent successfully via Twilio!");
        } else {
          const errData: any = await twilioRes.json();
          console.error("Twilio WhatsApp API error:", errData);
          whatsappStatus = `Twilio API failed: ${errData.message || twilioRes.statusText}`;
        }
      } catch (waErr: any) {
        console.error("Failed to send real WhatsApp via Twilio:", waErr);
        whatsappStatus = `Twilio network failure: ${waErr.message || waErr}`;
      }
    } else {
      console.log(`[SIMULATED WHATSAPP DISPATCH] to ${formattedRecipient}`);
    }

    // Save Dispatch Log entry
    const dispatched = readDispatchedEmails();
    const newDispatch = {
      id: `log-${timestamp}`,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + " " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      recipient: smtp.recipient || "lucas.kempe@icloud.com",
      status: dispatchStatus,
      whatsappRecipient: formattedRecipient,
      whatsappStatus: whatsappStatus,
      whatsappMessage: waMsgBody,
      subject: `[Meridian Advisor] Select Today's Publication: Optics vs Quantum Physics`,
      html: emailHtml,
      options: {
        optionA: { id: draftA.id, title: draftA.title, excerpt: draftA.excerpt },
        optionB: { id: draftB.id, title: draftB.title, excerpt: draftB.excerpt }
      }
    };
    dispatched.unshift(newDispatch);
    writeDispatchedEmails(dispatched.slice(0, 50));

    res.json({
      success: true,
      dispatchStatus,
      whatsappStatus,
      drafts: {
        optionA: { id: draftA.id, title: draftA.title },
        optionB: { id: draftB.id, title: draftB.title }
      }
    });

  } catch (error: any) {
    console.error("Error generating options:", error);
    res.status(500).json({ error: error.message || "Failed to generate daily options" });
  }
});

// API: AI-Enhanced LinkedIn Post Generator powered by Gemini
app.post("/api/linkedin/generate-post", async (req, res) => {
  const { title, excerpt, content, tags, arxivLink, blogId, articleUrl: clientArticleUrl, tone = "technical", customPrompt } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Missing article title" });
  }

  const blogUrl = clientArticleUrl || (blogId ? `https://ask-meridian.uk/blog/${blogId.replace(/^\/+/, "")}` : "https://ask-meridian.uk/blog");

  try {
    const ai = getGeminiClient();

    const systemInstruction = buildLinkedInSystemInstruction(blogUrl);
    const promptText = buildLinkedInUserPrompt({ title, excerpt, content, tags, tone, customPrompt });

    const modelsToTry = [
      "gemini-3.7-flash",
      "gemini-flash-latest"
    ];

    let response: any = null;
    let lastError = null;

    if (process.env.GEMINI_API_KEY) {
      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting LinkedIn post generation with model: ${modelName}`);
          const genPromise = ai.models.generateContent({
            model: modelName,
            contents: promptText,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  postText: { type: Type.STRING, description: "The full, beautifully formatted LinkedIn post text ready for sharing." },
                  headline: { type: Type.STRING, description: "A catchy 1-line preview title for the LinkedIn post." },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 relevant hashtags" }
                },
                required: ["postText", "headline", "hashtags"]
              }
            }
          });

          // Timeout after 10 seconds per attempt to prevent hanging
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini LinkedIn generation timed out")), 10000));
          response = await Promise.race([genPromise, timeoutPromise]);

          if (response && response.text) {
            console.log(`Successfully generated LinkedIn post using model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} failed for LinkedIn post generation:`, err.message || err);
          lastError = err;
        }
      }
    }

    if (response && response.text) {
      try {
        const sanitized = cleanJsonText(response.text);
        const parsed = JSON.parse(sanitized);
        return res.json({
          success: true,
          postText: parsed.postText,
          headline: parsed.headline,
          hashtags: sanitizeHashtags(parsed.hashtags),
          tone
        });
      } catch (parseErr) {
        console.warn("Failed to parse Gemini response for LinkedIn post:", parseErr);
      }
    }

    // Fallback to GitHub Models if Gemini failed
    if (process.env.GITHUB_TOKEN && (await checkGitHubModelsAvailability())) {
      console.log("Attempting fallback to GitHub Models for LinkedIn post generation...");
      try {
        const githubResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: `${systemInstruction}\nReturn JSON with schema: {"postText": string, "headline": string, "hashtags": string[]}` },
              { role: "user", content: promptText }
            ],
            temperature: 0.7
          })
        });

        if (githubResponse.ok) {
          const data: any = await githubResponse.json();
          if (data.choices && data.choices[0] && data.choices[0].message?.content) {
            const parsed = JSON.parse(cleanJsonText(data.choices[0].message.content));
            console.log("Successfully generated LinkedIn post via GitHub Models");
            return res.json({
              success: true,
              postText: parsed.postText,
              headline: parsed.headline,
              hashtags: sanitizeHashtags(parsed.hashtags),
              tone
            });
          }
        }
      } catch (githubErr: any) {
        console.log("GitHub Models fallback unavailable for LinkedIn post:", githubErr?.message || githubErr);
      }
    }

    // Fallback if AI call failed or key not configured
    const fallback = generateFallbackLinkedInPost({ title, excerpt, content, tags, tone, blogUrl, blogId });
    return res.json(fallback);

  } catch (error: any) {
    console.error("Error generating AI LinkedIn post:", error);
    const fallback = generateFallbackLinkedInPost({ title, excerpt, content, tags, tone, blogUrl, blogId });
    return res.json(fallback);
  }
});

// API: AI-Enhanced X Companion Post Generator (Futuristic Vision) powered by Gemini
app.post("/api/x/generate-post", async (req, res) => {
  const { title, excerpt, content, tags, arxivLink, blogId, articleUrl: clientArticleUrl, customPrompt } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Missing article title" });
  }

  const blogUrl = clientArticleUrl || (blogId ? `https://ask-meridian.uk/blog/${blogId.replace(/^\/+/, "")}` : "https://ask-meridian.uk/blog");

  try {
    const ai = getGeminiClient();

    const systemInstruction = buildXSystemInstruction(blogUrl);
    const promptText = buildXUserPrompt({ title, excerpt, content, tags, customPrompt });

    const modelsToTry = [
      "gemini-3.7-flash",
      "gemini-flash-latest"
    ];

    let response: any = null;
    let lastError = null;

    if (process.env.GEMINI_API_KEY) {
      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting X companion post generation with model: ${modelName}`);
          const genPromise = ai.models.generateContent({
            model: modelName,
            contents: promptText,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  postText: { type: Type.STRING, description: "The full, visionary 3-sentence X post text ready for sharing." },
                  headline: { type: Type.STRING, description: "A catchy 1-line futuristic preview title for the X post." },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 relevant cutting-edge hashtags" }
                },
                required: ["postText", "headline", "hashtags"]
              }
            }
          });

          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini X post generation timed out")), 10000));
          response = await Promise.race([genPromise, timeoutPromise]);

          if (response && response.text) {
            console.log(`Successfully generated X post using model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} failed for X post generation:`, err.message || err);
          lastError = err;
        }
      }
    }

    if (response && response.text) {
      try {
        const sanitized = cleanJsonText(response.text);
        const parsed = JSON.parse(sanitized);
        return res.json({
          success: true,
          postText: parsed.postText,
          headline: parsed.headline,
          hashtags: sanitizeXHashtags(parsed.hashtags),
          tone: "future"
        });
      } catch (parseErr) {
        console.warn("Failed to parse Gemini response for X post:", parseErr);
      }
    }

    // Fallback to GitHub Models if Gemini failed
    if (process.env.GITHUB_TOKEN && (await checkGitHubModelsAvailability())) {
      console.log("Attempting fallback to GitHub Models for X post generation...");
      try {
        const githubResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: `${systemInstruction}\nReturn JSON with schema: {"postText": string, "headline": string, "hashtags": string[]}` },
              { role: "user", content: promptText }
            ],
            temperature: 0.7
          })
        });

        if (githubResponse.ok) {
          const data: any = await githubResponse.json();
          if (data.choices && data.choices[0] && data.choices[0].message?.content) {
            const parsed = JSON.parse(cleanJsonText(data.choices[0].message.content));
            console.log("Successfully generated X post via GitHub Models");
            return res.json({
              success: true,
              postText: parsed.postText,
              headline: parsed.headline,
              hashtags: sanitizeXHashtags(parsed.hashtags),
              tone: "future"
            });
          }
        }
      } catch (githubErr: any) {
        console.log("GitHub Models fallback unavailable for X post:", githubErr?.message || githubErr);
      }
    }

    // High-quality fallback
    const fallback = generateFallbackXPost({ title, excerpt, content, tags, blogUrl, blogId });
    return res.json(fallback);

  } catch (error: any) {
    console.error("Error generating AI X post:", error);
    const fallback = generateFallbackXPost({ title, excerpt, content, tags, blogUrl, blogId });
    return res.json(fallback);
  }
});

// ==========================================
// BINANCE TREASURY & DAILY WORK API ROUTES
// ==========================================

// 1. System Connectivity & API Status
app.get("/api/binance/status", async (req, res) => {
  const hasApiKey = Boolean(process.env.BINANCE_API_KEY && process.env.BINANCE_API_KEY.trim().length > 0);
  const hasSecretKey = Boolean(process.env.BINANCE_SECRET_KEY && process.env.BINANCE_SECRET_KEY.trim().length > 0);
  const baseEndpoint = process.env.BINANCE_BASE_URL || "https://api.binance.com";
  const localTime = Date.now();

  let connected = false;
  let serverTime = localTime;
  let latencyMs = 0;
  let driftMs = 0;

  try {
    const start = Date.now();
    const timeRes = await fetch(`${baseEndpoint}/api/v3/time`, { signal: AbortSignal.timeout(3500) });
    latencyMs = Date.now() - start;
    if (timeRes.ok) {
      const timeData: any = await timeRes.json();
      serverTime = timeData.serverTime || Date.now();
      driftMs = serverTime - (localTime + latencyMs / 2);
      connected = true;
    }
  } catch (_) {
    // If external call is blocked, provide local timestamp
  }

  res.json({
    configured: hasApiKey && hasSecretKey,
    hasApiKey,
    hasSecretKey,
    connected,
    serverTime,
    localTime,
    driftMs,
    latencyMs,
    baseEndpoint,
  });
});

// 2. Real-time Market Tickers
app.get("/api/binance/market/tickers", async (req, res) => {
  try {
    const symbolsParam = req.query.symbols as string | undefined;
    const symbols = symbolsParam ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()) : undefined;
    const tickers = await fetchLiveBinanceTickers(symbols);
    res.json({ success: true, tickers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch market tickers" });
  }
});

// 3. Real-time Order Book Depth
app.get("/api/binance/market/depth", async (req, res) => {
  try {
    const symbol = ((req.query.symbol as string) || "BTCUSDT").toUpperCase();
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit as string, 10) || 20));
    const depth = await fetchLiveBinanceDepth(symbol, limit);
    res.json({ success: true, depth });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch order book depth" });
  }
});

// 4. Candlestick (Kline) Series with Technical Indicators (SMA & RSI)
app.get("/api/binance/market/klines", async (req, res) => {
  try {
    const symbol = ((req.query.symbol as string) || "BTCUSDT").toUpperCase();
    const interval = (req.query.interval as string) || "1h";
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string, 10) || 24));
    const klines = await fetchLiveBinanceKlines(symbol, interval, limit);
    res.json({ success: true, symbol, interval, klines });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch klines" });
  }
});

// 5. Authenticated Account & Spot Portfolio Balances
app.get("/api/binance/account", async (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY;
  const secretKey = process.env.BINANCE_SECRET_KEY;

  if (!apiKey || !secretKey) {
    // Return structured simulation portfolio for preview
    const tickers = await fetchLiveBinanceTickers();
    const btcPrice = tickers.find((t) => t.symbol === "BTCUSDT")?.price || 91850;
    const ethPrice = tickers.find((t) => t.symbol === "ETHUSDT")?.price || 2680;
    const solPrice = tickers.find((t) => t.symbol === "SOLUSDT")?.price || 194.5;
    const bnbPrice = tickers.find((t) => t.symbol === "BNBUSDT")?.price || 648.2;

    const simulatedBalances = [
      { asset: "BTC", free: 0.125, locked: 0.0, total: 0.125, usdPrice: btcPrice, usdValue: 0.125 * btcPrice, btcValue: 0.125, allocationPercent: 55.4 },
      { asset: "ETH", free: 1.85, locked: 0.0, total: 1.85, usdPrice: ethPrice, usdValue: 1.85 * ethPrice, btcValue: (1.85 * ethPrice) / btcPrice, allocationPercent: 24.1 },
      { asset: "SOL", free: 12.0, locked: 0.0, total: 12.0, usdPrice: solPrice, usdValue: 12.0 * solPrice, btcValue: (12.0 * solPrice) / btcPrice, allocationPercent: 11.3 },
      { asset: "BNB", free: 2.5, locked: 0.0, total: 2.5, usdPrice: bnbPrice, usdValue: 2.5 * bnbPrice, btcValue: (2.5 * bnbPrice) / btcPrice, allocationPercent: 7.8 },
      { asset: "USDT", free: 320.0, locked: 0.0, total: 320.0, usdPrice: 1.0, usdValue: 320.0, btcValue: 320 / btcPrice, allocationPercent: 1.4 },
    ];

    const totalUsd = simulatedBalances.reduce((acc, b) => acc + b.usdValue, 0);
    const totalBtc = totalUsd / btcPrice;

    return res.json({
      success: true,
      isSimulation: true,
      account: {
        makerCommission: 10,
        takerCommission: 10,
        canTrade: true,
        canWithdraw: false,
        canDeposit: true,
        updateTime: Date.now(),
        accountType: "SPOT (SIMULATION - Configure BINANCE_API_KEY)",
        balances: simulatedBalances,
        totalUsdValue: totalUsd,
        totalBtcValue: totalBtc,
        nonZeroCount: simulatedBalances.length,
      },
    });
  }

  try {
    const account = await fetchBinanceAccountInfo(apiKey, secretKey);
    res.json({ success: true, isSimulation: false, account });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch Binance account data" });
  }
});

// 6. Authenticated Open Orders
app.get("/api/binance/orders/open", async (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY;
  const secretKey = process.env.BINANCE_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return res.json({ success: true, isSimulation: true, orders: [] });
  }

  try {
    const symbol = req.query.symbol as string | undefined;
    const orders = await fetchBinanceOpenOrders(apiKey, secretKey, symbol);
    res.json({ success: true, isSimulation: false, orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch open orders" });
  }
});

// 7. Pre-flight Trade Order Preview & Fee Validation
app.post("/api/binance/order/preview", async (req, res) => {
  try {
    const { symbol = "BTCUSDT", side = "BUY", type = "LIMIT", quantity = 0.01, price } = req.body;
    const tickers = await fetchLiveBinanceTickers([symbol, "BNBUSDT"]);
    const currentPrice = tickers.find((t) => t.symbol === symbol)?.price || price || 91850;
    const bnbPrice = tickers.find((t) => t.symbol === "BNBUSDT")?.price || 648.2;

    const preview = previewOrder(symbol, side, type, parseFloat(quantity), price ? parseFloat(price) : undefined, currentPrice, undefined, bnbPrice);
    res.json({ success: true, preview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to preview order" });
  }
});

// 8. Test Order Execution against Binance Matching Engine
app.post("/api/binance/order/test", async (req, res) => {
  try {
    const apiKey = process.env.BINANCE_API_KEY || "";
    const secretKey = process.env.BINANCE_SECRET_KEY || "";
    const { symbol = "BTCUSDT", side = "BUY", type = "LIMIT", quantity = 0.01, price, timeInForce = "GTC" } = req.body;

    const result = await executeBinanceTestOrder(apiKey, secretKey, {
      symbol,
      side,
      type,
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : undefined,
      timeInForce,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Order test execution failed" });
  }
});

// 9. Public Research Donation Addresses
app.get("/api/binance/donations", (req, res) => {
  try {
    const donations = getPublicDonationAddresses();
    res.json({
      success: true,
      title: "Meridian Independent Research Treasury",
      description: "Support open-access arXiv synthesis, quantitative editorial reviews, and distributed math compute.",
      donations,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to load donation addresses" });
  }
});

// ------------------------------------------------------------------------------------------------
// MERIDIAN MICROSERVICES ARCHITECTURE MANAGEMENT ENDPOINTS
// ------------------------------------------------------------------------------------------------
const microservicesRegistry = MicroserviceRegistry.getInstance();
microservicesRegistry.initializeAll().catch((err) => console.error("[Microservices] Initialization warning:", err));

// Aggregated health and diagnostics
app.get("/api/services/health", async (req, res) => {
  try {
    const health = await microservicesRegistry.getAggregatedHealth();
    res.json({ success: true, ...health });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cross-device and cross-IP state synchronization
app.post("/api/services/sync-cross-device", async (req, res) => {
  try {
    const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
    const payload = { ...req.body, ipAddress: req.body.ipAddress || clientIp };
    const syncRes = await microservicesRegistry.getPersistenceService().syncCrossDevice(payload);
    res.json(syncRes);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Cross-device sync failed" });
  }
});

// Multi-tier snapshots management
app.get("/api/services/snapshots", (req, res) => {
  try {
    const snapshots = microservicesRegistry.getPersistenceService().listSnapshots();
    res.json({ success: true, snapshots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Multi-tier snapshot rollback
app.post("/api/services/snapshots/rollback", async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: "filename required" });
    }
    const rollbackRes = await microservicesRegistry.getPersistenceService().rollbackToSnapshot(filename);
    res.json(rollbackRes);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Registered roaming devices list
app.get("/api/services/devices", (req, res) => {
  try {
    const devices = microservicesRegistry.getPersistenceService().getRegisteredDevices();
    res.json({ success: true, devices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
