/**
 * MERIDIAN PERSISTENCE MICROSERVICE
 * 
 * High-durability multi-tier persistence engine with cross-device, cross-IP,
 * and cross-browser bidirectional sync, conflict-free resolution, snapshot vaults,
 * and automated self-healing.
 */

import fs from "fs";
import path from "path";
import { BlogPost, PipelineExecutionRecord } from "../types";
import {
  IMicroservice,
  ServiceHealth,
  MultiTierStorageStatus,
  DeviceSyncRegistration,
  CrossDeviceSyncPayload,
  CrossDeviceSyncResult,
  SyncConflictResolution
} from "./types";
import {
  generateSitemapXml,
  syncAllBlogsToGitHub,
  generateDataTsContent
} from "../lib/githubSync";

export class PersistenceMicroservice implements IMicroservice {
  public readonly serviceName = "PersistenceMicroservice";
  public readonly version = "2.5.0";

  private dataDir: string;
  private snapshotsDir: string;
  private journalFile: string;
  private recordsFile: string;
  private deviceRegistryFile: string;
  private customBlogsFile: string;
  private dataTsFile: string;
  private sitemapFile: string;

  private startTime: number = Date.now();
  private lastHeartbeat: number = Date.now();
  private isInitialized: boolean = false;
  private deviceRegistry: Map<string, DeviceSyncRegistration> = new Map();
  private firestoreDbInstance: any = null;

  constructor(options?: { baseDir?: string; firestoreDb?: any }) {
    const base = options?.baseDir || process.cwd();
    this.dataDir = path.join(base, "data");
    this.snapshotsDir = path.join(this.dataDir, "snapshots");
    this.journalFile = path.join(this.dataDir, "generation_journal.jsonl");
    this.recordsFile = path.join(this.dataDir, "pipeline_records.json");
    this.deviceRegistryFile = path.join(this.dataDir, "device_sync_registry.json");
    this.customBlogsFile = path.join(base, "custom_blogs.json");
    this.dataTsFile = path.join(base, "src", "data.ts");
    this.sitemapFile = path.join(base, "public", "sitemap.xml");
    this.firestoreDbInstance = options?.firestoreDb || null;
  }

  public setFirestoreDb(db: any) {
    this.firestoreDbInstance = db;
  }

  public async initialize(): Promise<boolean> {
    try {
      this.ensureDirectories();
      this.loadDeviceRegistry();
      await this.runSelfHealingCheck();
      this.isInitialized = true;
      this.lastHeartbeat = Date.now();
      return true;
    } catch (err) {
      console.error(`[${this.serviceName}] Initialization failed:`, err);
      return false;
    }
  }

  public async getHealth(): Promise<ServiceHealth> {
    this.lastHeartbeat = Date.now();
    const storageStatus = this.checkStorageStatus();
    const status = storageStatus.healthy ? "healthy" : "degraded";

    return {
      serviceName: this.serviceName,
      status,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      lastHeartbeat: this.lastHeartbeat,
      version: this.version,
      details: {
        registeredDevices: this.deviceRegistry.size,
        storageStatus,
        journalExists: fs.existsSync(this.journalFile),
        customBlogsCount: this.readBlogs().length,
        snapshotsCount: this.listSnapshots().length
      }
    };
  }

  public async shutdown(): Promise<boolean> {
    this.saveDeviceRegistry();
    return true;
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
    const srcDir = path.dirname(this.dataTsFile);
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }
    const publicDir = path.dirname(this.sitemapFile);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
  }

  private loadDeviceRegistry(): void {
    try {
      if (fs.existsSync(this.deviceRegistryFile)) {
        const raw = fs.readFileSync(this.deviceRegistryFile, "utf-8");
        const list: DeviceSyncRegistration[] = JSON.parse(raw);
        this.deviceRegistry.clear();
        for (const dev of list) {
          this.deviceRegistry.set(dev.deviceId, dev);
        }
      }
    } catch (err) {
      console.warn(`[${this.serviceName}] Error loading device registry:`, err);
    }
  }

  private saveDeviceRegistry(): void {
    try {
      this.ensureDirectories();
      const list = Array.from(this.deviceRegistry.values());
      fs.writeFileSync(this.deviceRegistryFile, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error(`[${this.serviceName}] Error saving device registry:`, err);
    }
  }

  /**
   * Reads blogs from custom_blogs.json, falling back to data.ts or most recent snapshot
   */
  public readBlogs(): BlogPost[] {
    const map = new Map<string, BlogPost>();

    // 1. Read from snapshots (historical archive)
    const snapshots = this.listSnapshots();
    for (const snap of snapshots) {
      try {
        const raw = fs.readFileSync(snap.path, "utf-8");
        const list: BlogPost[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const b of list) {
            const key = b.slug || b.id || b.title;
            if (key && !map.has(key)) {
              map.set(key, b);
            }
          }
        }
      } catch {}
    }

    // 2. Read from custom_blogs.json (overriding / augmenting)
    try {
      if (fs.existsSync(this.customBlogsFile)) {
        const raw = fs.readFileSync(this.customBlogsFile, "utf-8");
        const parsed: BlogPost[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const b of parsed) {
            const key = b.slug || b.id || b.title;
            if (key) {
              const existing = map.get(key);
              map.set(key, { ...existing, ...b });
            }
          }
        }
      }
    } catch (err) {
      console.error(`[${this.serviceName}] Error reading custom_blogs.json:`, err);
    }

    const all = Array.from(map.values());
    if (all.length > 0) {
      all.sort((a, b) => {
        const timeA = a.createdAt || (a.date ? new Date(a.date).getTime() : 0) || 0;
        const timeB = b.createdAt || (b.date ? new Date(b.date).getTime() : 0) || 0;
        return timeB - timeA;
      });
      return all;
    }

    return [];
  }

  /**
   * Persists blog collection across all 6 redundant storage tiers
   */
  public async persistMultiTier(
    blogs: BlogPost[],
    reason: string = "microservice sync"
  ): Promise<{ success: boolean; status: MultiTierStorageStatus }> {
    this.ensureDirectories();

    // Union merge with existing library to avoid accidental truncations
    const mergedMap = new Map<string, BlogPost>();
    const existing = this.readBlogs();
    for (const b of existing) {
      const key = b.slug || b.id || b.title;
      if (key) mergedMap.set(key, b);
    }
    for (const b of blogs) {
      const key = b.slug || b.id || b.title;
      if (key) {
        const prev = mergedMap.get(key);
        mergedMap.set(key, { ...prev, ...b });
      }
    }

    const mergedBlogs = Array.from(mergedMap.values());
    mergedBlogs.sort((a, b) => {
      const timeA = a.createdAt || (a.date ? new Date(a.date).getTime() : 0) || 0;
      const timeB = b.createdAt || (b.date ? new Date(b.date).getTime() : 0) || 0;
      return timeB - timeA;
    });

    const targetBlogs = mergedBlogs.length >= blogs.length ? mergedBlogs : blogs;

    const status: MultiTierStorageStatus = {
      customBlogsJson: false,
      dataTs: false,
      snapshot: false,
      sitemap: false,
      firestore: false,
      gitHubMirror: false,
      journalJsonl: fs.existsSync(this.journalFile),
      activeTierCount: 0,
      totalTiers: 6,
      healthy: false
    };

    // Tier 1: custom_blogs.json (Local dynamic JSON)
    try {
      fs.writeFileSync(this.customBlogsFile, JSON.stringify(targetBlogs, null, 2), "utf-8");
      status.customBlogsJson = true;
    } catch (err) {
      console.error(`[${this.serviceName}] Tier 1 (custom_blogs.json) write failed:`, err);
    }

    // Tier 2: src/data.ts (Compiled TypeScript static source)
    try {
      const dataTsContent = generateDataTsContent(targetBlogs);
      fs.writeFileSync(this.dataTsFile, dataTsContent, "utf-8");
      status.dataTs = true;
    } catch (err) {
      console.error(`[${this.serviceName}] Tier 2 (data.ts) write failed:`, err);
    }

    // Tier 3: Immutable timestamped snapshot
    try {
      const snapPath = this.createSnapshot(targetBlogs);
      if (snapPath) status.snapshot = true;
    } catch (err) {
      console.error(`[${this.serviceName}] Tier 3 (snapshot) write failed:`, err);
    }

    // Tier 4: public/sitemap.xml (SEO indexing)
    try {
      const sitemapContent = generateSitemapXml(targetBlogs);
      fs.writeFileSync(this.sitemapFile, sitemapContent, "utf-8");
      status.sitemap = true;
    } catch (err) {
      console.error(`[${this.serviceName}] Tier 4 (sitemap.xml) write failed:`, err);
    }

    // Tier 5: Firestore Cloud Database
    if (this.firestoreDbInstance) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await Promise.all(
          blogs.map(async (blog) => {
            if (blog && blog.id) {
              await setDoc(doc(this.firestoreDbInstance, "blogs", blog.id), blog);
            }
          })
        );
        status.firestore = true;
      } catch (err) {
        console.warn(`[${this.serviceName}] Tier 5 (Firestore) sync warning:`, err);
      }
    }

    // Tier 6: GitHub Repository Mirror
    try {
      const ghRes = await syncAllBlogsToGitHub(blogs, reason);
      if (ghRes.success) {
        status.gitHubMirror = true;
      }
    } catch (err) {
      console.warn(`[${this.serviceName}] Tier 6 (GitHub) sync warning:`, err);
    }

    status.activeTierCount = [
      status.customBlogsJson,
      status.dataTs,
      status.snapshot,
      status.sitemap,
      status.firestore,
      status.gitHubMirror
    ].filter(Boolean).length;

    status.healthy = status.customBlogsJson && status.dataTs;

    return {
      success: status.healthy,
      status
    };
  }

  /**
   * Creates an atomic immutable snapshot
   */
  public createSnapshot(blogs: BlogPost[]): string | null {
    try {
      this.ensureDirectories();
      const filename = `snapshot_${Date.now()}.json`;
      const snapshotPath = path.join(this.snapshotsDir, filename);
      fs.writeFileSync(snapshotPath, JSON.stringify(blogs, null, 2), "utf-8");

      // Maintain up to 25 rolling snapshots
      const existing = this.listSnapshots();
      if (existing.length > 25) {
        existing.slice(25).forEach((oldSnap) => {
          try {
            fs.unlinkSync(oldSnap.path);
          } catch {}
        });
      }

      return snapshotPath;
    } catch (err) {
      console.error(`[${this.serviceName}] Snapshot creation failed:`, err);
      return null;
    }
  }

  /**
   * Lists available snapshots ordered from newest to oldest
   */
  public listSnapshots(): { filename: string; path: string; timestamp: number; sizeBytes: number }[] {
    try {
      this.ensureDirectories();
      const files = fs.readdirSync(this.snapshotsDir)
        .filter((f) => f.startsWith("snapshot_") && f.endsWith(".json"));

      return files.map((file) => {
        const fullPath = path.join(this.snapshotsDir, file);
        const stats = fs.statSync(fullPath);
        const match = file.match(/^snapshot_(\d+)\.json$/);
        const timestamp = match ? parseInt(match[1], 10) : stats.mtimeMs;
        return {
          filename: file,
          path: fullPath,
          timestamp,
          sizeBytes: stats.size
        };
      }).sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  /**
   * Restores data from a specific snapshot timestamp or file
   */
  public async rollbackToSnapshot(snapshotFilename: string): Promise<{ success: boolean; blogCount: number; error?: string }> {
    try {
      const snapshotPath = path.join(this.snapshotsDir, snapshotFilename);
      if (!fs.existsSync(snapshotPath)) {
        return { success: false, blogCount: 0, error: "Snapshot file not found" };
      }

      const raw = fs.readFileSync(snapshotPath, "utf-8");
      const blogs: BlogPost[] = JSON.parse(raw);
      if (!Array.isArray(blogs)) {
        return { success: false, blogCount: 0, error: "Invalid snapshot data format" };
      }

      const res = await this.persistMultiTier(blogs, `Rollback to snapshot ${snapshotFilename}`);
      return { success: res.success, blogCount: blogs.length };
    } catch (err: any) {
      return { success: false, blogCount: 0, error: err.message || "Rollback failed" };
    }
  }

  /**
   * Appends execution record to immutable JSONL journal and updates pipeline_records.json
   */
  public appendJournalRecord(record: PipelineExecutionRecord): boolean {
    try {
      this.ensureDirectories();
      const line = JSON.stringify(record) + "\n";
      fs.appendFileSync(this.journalFile, line, "utf-8");

      let records: PipelineExecutionRecord[] = [];
      if (fs.existsSync(this.recordsFile)) {
        try {
          records = JSON.parse(fs.readFileSync(this.recordsFile, "utf-8"));
        } catch {
          records = [];
        }
      }
      records = [record, ...records.filter((r) => r.jobId !== record.jobId)].slice(0, 100);
      fs.writeFileSync(this.recordsFile, JSON.stringify(records, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error(`[${this.serviceName}] Failed to append journal record:`, err);
      return false;
    }
  }

  public readJournalRecords(limit: number = 100): PipelineExecutionRecord[] {
    try {
      this.ensureDirectories();
      if (fs.existsSync(this.recordsFile)) {
        const raw = fs.readFileSync(this.recordsFile, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return list.slice(0, limit);
      }
      if (fs.existsSync(this.journalFile)) {
        const lines = fs.readFileSync(this.journalFile, "utf-8").split("\n").filter(Boolean);
        return lines.map((l) => JSON.parse(l)).reverse().slice(0, limit);
      }
    } catch (err) {
      console.error(`[${this.serviceName}] Failed to read journal records:`, err);
    }
    return [];
  }

  /**
   * Cross-Device, Multi-IP, Multi-Browser Bi-directional Synchronization Engine
   * Merges incoming client data with server state using Last-Write-Wins (LWW)
   * and deep property union to ensure no user updates are lost across browsers/IPs.
   */
  public async syncCrossDevice(payload: CrossDeviceSyncPayload): Promise<CrossDeviceSyncResult> {
    const serverBlogs = this.readBlogs();
    const serverMap = new Map<string, BlogPost>();
    serverBlogs.forEach((b) => serverMap.set(b.id || b.slug, b));

    let addedCount = 0;
    let updatedCount = 0;
    let conflictsResolved = 0;

    // Track device registration
    if (payload.deviceId) {
      this.deviceRegistry.set(payload.deviceId, {
        deviceId: payload.deviceId,
        deviceName: payload.deviceName || "Unidentified Device",
        browser: payload.fingerprintHash || "Unknown",
        os: "Cross-Platform",
        ipAddress: payload.ipAddress || "Roaming",
        lastSyncTimestamp: Date.now(),
        fingerprintHash: payload.fingerprintHash || "fp_unknown",
        version: this.version,
        pendingChangesCount: payload.blogs?.length || 0
      });
      this.saveDeviceRegistry();
    }

    // Perform bidirectional reconciliation
    const mergedMap = new Map<string, BlogPost>(serverMap);

    if (Array.isArray(payload.blogs)) {
      for (const clientBlog of payload.blogs) {
        const key = clientBlog.id || clientBlog.slug;
        if (!key) continue;

        const serverBlog = serverMap.get(key);

        if (!serverBlog) {
          // New blog created on client device
          mergedMap.set(key, clientBlog);
          addedCount++;
        } else {
          // Both server and client have this blog: apply deterministic conflict resolution
          const resolution = this.resolveBlogConflict(serverBlog, clientBlog, payload.clientTimestamp);
          if (resolution.conflictDetected) {
            conflictsResolved++;
          }
          if (resolution.source === "client" || resolution.source === "merged") {
            updatedCount++;
          }
          mergedMap.set(key, resolution.resolvedItem);
        }
      }
    }

    const mergedBlogs = Array.from(mergedMap.values()).sort(
      (a, b) => (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0)
    );

    // Persist merged state across all 6 tiers
    const persistResult = await this.persistMultiTier(
      mergedBlogs,
      `Cross-device sync from ${payload.deviceName || payload.deviceId} (${payload.ipAddress || "roaming"})`
    );

    return {
      success: persistResult.success,
      mergedBlogs,
      serverTimestamp: Date.now(),
      addedToSever: addedCount,
      updatedOnServer: updatedCount,
      deletedOnServer: 0,
      conflictsResolved,
      tierStatus: persistResult.status
    };
  }

  /**
   * Conflict resolution algorithm:
   * 1. View counts: Always take maximum views across devices (never decrement automatically)
   * 2. Timestamps: Higher timestamp takes precedence for content edits
   * 3. Tags & metadata: Union of distinct tags
   */
  public resolveBlogConflict(
    serverBlog: BlogPost,
    clientBlog: BlogPost,
    clientTimestamp: number
  ): SyncConflictResolution<BlogPost> {
    const serverTime = serverBlog.timestamp || serverBlog.createdAt || 0;
    const clientTime = clientBlog.timestamp || clientBlog.createdAt || clientTimestamp || 0;

    const maxViews = Math.max(serverBlog.views || 0, clientBlog.views || 0);

    // Tag union
    const tagSet = new Set([...(serverBlog.tags || []), ...(clientBlog.tags || [])]);
    const mergedTags = Array.from(tagSet);

    if (clientTime > serverTime) {
      // Client is strictly newer
      const resolved: BlogPost = {
        ...clientBlog,
        views: maxViews,
        tags: mergedTags
      };
      return {
        resolvedItem: resolved,
        source: "client",
        conflictDetected: true,
        reason: "Client timestamp is newer than server record"
      };
    } else if (serverTime > clientTime) {
      // Server is strictly newer
      const resolved: BlogPost = {
        ...serverBlog,
        views: maxViews,
        tags: mergedTags
      };
      return {
        resolvedItem: resolved,
        source: "server",
        conflictDetected: false,
        reason: "Server timestamp is newer than client record"
      };
    } else {
      // Equal timestamps: merge non-empty attributes
      const resolved: BlogPost = {
        ...serverBlog,
        ...clientBlog,
        views: maxViews,
        tags: mergedTags
      };
      return {
        resolvedItem: resolved,
        source: "merged",
        conflictDetected: false,
        reason: "Equal timestamps, applied deep property union"
      };
    }
  }

  /**
   * Self-healing check: verifies consistency between custom_blogs.json and src/data.ts
   */
  private async runSelfHealingCheck(): Promise<void> {
    const blogs = this.readBlogs();
    if (blogs.length > 0 && !fs.existsSync(this.dataTsFile)) {
      console.log(`[${this.serviceName}] Regenerating missing src/data.ts...`);
      const dataTsContent = generateDataTsContent(blogs);
      fs.writeFileSync(this.dataTsFile, dataTsContent, "utf-8");
    }
  }

  private checkStorageStatus(): MultiTierStorageStatus {
    const hasCustomBlogs = fs.existsSync(this.customBlogsFile);
    const hasDataTs = fs.existsSync(this.dataTsFile);
    const hasSnapshots = fs.existsSync(this.snapshotsDir);
    const hasSitemap = fs.existsSync(this.sitemapFile);
    const hasJournal = fs.existsSync(this.journalFile);

    const activeCount = [hasCustomBlogs, hasDataTs, hasSnapshots, hasSitemap].filter(Boolean).length;

    return {
      customBlogsJson: hasCustomBlogs,
      dataTs: hasDataTs,
      snapshot: hasSnapshots,
      sitemap: hasSitemap,
      firestore: Boolean(this.firestoreDbInstance),
      gitHubMirror: Boolean(process.env.GITHUB_TOKEN),
      journalJsonl: hasJournal,
      activeTierCount: activeCount,
      totalTiers: 6,
      healthy: hasCustomBlogs && hasDataTs
    };
  }

  public getRegisteredDevices(): DeviceSyncRegistration[] {
    return Array.from(this.deviceRegistry.values());
  }
}
