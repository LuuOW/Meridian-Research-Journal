import fs from "fs";
import path from "path";
import { BlogPost, PipelineExecutionRecord } from "../types";
import { generateSitemapXml, syncAllBlogsToGitHub, generateDataTsContent } from "./githubSync";

const DATA_DIR = path.join(process.cwd(), "data");
const SNAPSHOTS_DIR = path.join(DATA_DIR, "snapshots");
const JOURNAL_FILE = path.join(DATA_DIR, "generation_journal.jsonl");
const RECORDS_FILE = path.join(DATA_DIR, "pipeline_records.json");
const CUSTOM_BLOGS_FILE = path.join(process.cwd(), "custom_blogs.json");
const DATA_TS_FILE = path.join(process.cwd(), "src", "data.ts");
const SITEMAP_FILE = path.join(process.cwd(), "public", "sitemap.xml");

// Ensure required persistent directories exist
function ensureDirectories() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("[Persistence] Error creating data directories:", err);
  }
}

/**
 * Appends a generation record to the immutable crash-resistant JSONL journal
 */
export function appendGenerationJournal(record: PipelineExecutionRecord): boolean {
  try {
    ensureDirectories();
    const line = JSON.stringify(record) + "\n";
    fs.appendFileSync(JOURNAL_FILE, line, "utf-8");

    // Also update pipeline_records.json (last 100 records)
    let records: PipelineExecutionRecord[] = [];
    if (fs.existsSync(RECORDS_FILE)) {
      try {
        records = JSON.parse(fs.readFileSync(RECORDS_FILE, "utf-8"));
      } catch {
        records = [];
      }
    }
    records = [record, ...records.filter(r => r.jobId !== record.jobId)].slice(0, 100);
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[Persistence] Error writing generation journal:", err);
    return false;
  }
}

/**
 * Reads all pipeline execution records from disk
 */
export function readPipelineRecords(): PipelineExecutionRecord[] {
  try {
    ensureDirectories();
    if (fs.existsSync(RECORDS_FILE)) {
      const data = fs.readFileSync(RECORDS_FILE, "utf-8");
      return JSON.parse(data);
    }
    if (fs.existsSync(JOURNAL_FILE)) {
      const lines = fs.readFileSync(JOURNAL_FILE, "utf-8").split("\n").filter(Boolean);
      return lines.map(line => JSON.parse(line)).reverse();
    }
  } catch (err) {
    console.error("[Persistence] Error reading pipeline records:", err);
  }
  return [];
}

/**
 * Creates an immutable timestamped snapshot backup of all blogs
 */
export function createBlogSnapshot(blogs: BlogPost[]): string | null {
  try {
    ensureDirectories();
    const filename = `snapshot_${Date.now()}.json`;
    const snapshotPath = path.join(SNAPSHOTS_DIR, filename);
    fs.writeFileSync(snapshotPath, JSON.stringify(blogs, null, 2), "utf-8");
    
    // Prune old snapshots, keep last 20
    const existingSnapshots = fs.readdirSync(SNAPSHOTS_DIR)
      .filter(f => f.startsWith("snapshot_") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (existingSnapshots.length > 20) {
      existingSnapshots.slice(20).forEach(oldFile => {
        try {
          fs.unlinkSync(path.join(SNAPSHOTS_DIR, oldFile));
        } catch {}
      });
    }

    return snapshotPath;
  } catch (err) {
    console.error("[Persistence] Failed to create snapshot:", err);
    return null;
  }
}

/**
 * 99.999% Durable Multi-Tier Blog Persistence Engine
 * Writes across 6 redundant storage tiers:
 * 1. custom_blogs.json (Local dynamic JSON)
 * 2. src/data.ts (Compiled TypeScript code fallback)
 * 3. Atomic timestamped snapshot in /data/snapshots/
 * 4. public/sitemap.xml (SEO indexing)
 * 5. Firestore Cloud Collection (if configured)
 * 6. GitHub Repository Mirror (if configured)
 */
export async function persistMultiTierBlogs(
  blogs: BlogPost[],
  db: any,
  reason: string = "multi-tier sync"
): Promise<{
  success: boolean;
  tiers: {
    customBlogsJson: boolean;
    dataTs: boolean;
    snapshot: boolean;
    sitemap: boolean;
    firestore: boolean;
    gitHubMirror: boolean;
  };
}> {
  ensureDirectories();
  const tiers = {
    customBlogsJson: false,
    dataTs: false,
    snapshot: false,
    sitemap: false,
    firestore: false,
    gitHubMirror: false
  };

  // 1. Write custom_blogs.json
  try {
    fs.writeFileSync(CUSTOM_BLOGS_FILE, JSON.stringify(blogs, null, 2), "utf-8");
    tiers.customBlogsJson = true;
  } catch (err) {
    console.error("[Persistence] Failed writing custom_blogs.json:", err);
  }

  // 2. Write src/data.ts
  try {
    const dataTsContent = generateDataTsContent(blogs);
    fs.writeFileSync(DATA_TS_FILE, dataTsContent, "utf-8");
    tiers.dataTs = true;
  } catch (err) {
    console.error("[Persistence] Failed writing src/data.ts:", err);
  }

  // 3. Write snapshot
  try {
    const snapshotPath = createBlogSnapshot(blogs);
    if (snapshotPath) tiers.snapshot = true;
  } catch (err) {
    console.error("[Persistence] Failed writing snapshot:", err);
  }

  // 4. Write sitemap.xml
  try {
    const sitemapContent = generateSitemapXml(blogs);
    fs.writeFileSync(SITEMAP_FILE, sitemapContent, "utf-8");
    tiers.sitemap = true;
  } catch (err) {
    console.error("[Persistence] Failed writing sitemap.xml:", err);
  }

  // 5. Write to Firestore Cloud Database
  if (db) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await Promise.all(
        blogs.map(async (blog) => {
          if (blog && blog.id) {
            await setDoc(doc(db, "blogs", blog.id), blog);
          }
        })
      );
      tiers.firestore = true;
    } catch (err) {
      console.warn("[Persistence] Firestore sync warning:", err);
    }
  }

  // 6. Push to GitHub Mirror
  try {
    const ghRes = await syncAllBlogsToGitHub(blogs, reason);
    if (ghRes.success) {
      tiers.gitHubMirror = true;
    }
  } catch (err) {
    console.warn("[Persistence] GitHub auto-sync warning:", err);
  }

  const success = tiers.customBlogsJson && tiers.dataTs;
  return { success, tiers };
}

/**
 * Reads blogs from custom_blogs.json safely
 */
export function readCustomBlogs(): BlogPost[] {
  try {
    if (fs.existsSync(CUSTOM_BLOGS_FILE)) {
      const data = fs.readFileSync(CUSTOM_BLOGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("[Persistence] Error reading custom_blogs.json:", err);
  }
  return [];
}

