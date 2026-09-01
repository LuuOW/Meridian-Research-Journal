/**
 * MERIDIAN MICROSERVICES ARCHITECTURE TYPES
 * 
 * Typed contracts, lifecycle hooks, health checks, multi-device session definitions,
 * storage tier statuses, and bi-directional synchronization interfaces.
 */

import { BlogPost, PipelineExecutionRecord } from "../types";
import { PasskeyRecord, AuthSessionRecord, DeviceFingerprint } from "../lib/passkeyManager";

export interface ServiceHealth {
  serviceName: string;
  status: "healthy" | "degraded" | "unhealthy" | "idle";
  uptimeSeconds: number;
  lastHeartbeat: number;
  version: string;
  details?: Record<string, any>;
  errors?: string[];
}

export interface IMicroservice {
  readonly serviceName: string;
  readonly version: string;
  initialize(): Promise<boolean>;
  getHealth(): Promise<ServiceHealth>;
  shutdown(): Promise<boolean>;
}

export interface MultiTierStorageStatus {
  customBlogsJson: boolean;
  dataTs: boolean;
  snapshot: boolean;
  sitemap: boolean;
  firestore: boolean;
  gitHubMirror: boolean;
  journalJsonl: boolean;
  activeTierCount: number;
  totalTiers: number;
  healthy: boolean;
}

export interface DeviceSyncRegistration {
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastSyncTimestamp: number;
  fingerprintHash: string;
  version: string;
  pendingChangesCount: number;
}

export interface CrossDeviceSyncPayload {
  deviceId: string;
  deviceName: string;
  fingerprintHash?: string;
  ipAddress?: string;
  clientTimestamp: number;
  blogs: BlogPost[];
  lastKnownServerTimestamp?: number;
}

export interface SyncConflictResolution<T> {
  resolvedItem: T;
  source: "server" | "client" | "merged";
  conflictDetected: boolean;
  reason?: string;
}

export interface CrossDeviceSyncResult {
  success: boolean;
  mergedBlogs: BlogPost[];
  serverTimestamp: number;
  addedToSever: number;
  updatedOnServer: number;
  deletedOnServer: number;
  conflictsResolved: number;
  tierStatus: MultiTierStorageStatus;
}

export interface SessionRoamContext {
  sessionId: string;
  credentialId: string;
  deviceName: string;
  originalIp: string;
  currentIp: string;
  ipRoamDetected: boolean;
  fingerprintHash: string;
  userAgent: string;
  authorized: boolean;
  lastActiveAt: number;
  expiresAt: number;
}

export interface ArxivIngestionResult {
  arxivId: string;
  title: string;
  summary: string;
  authors: string;
  arxivLink: string;
  publishedDate?: string;
  categories?: string[];
  pdfLink?: string;
  source: "arxiv_api" | "direct_input" | "fallback_cache";
}

export interface ArticleGenerationOptions {
  arxivInput: string;
  rawText?: string;
  password?: string;
  jobId?: string;
  angleSeed?: number;
  forceModel?: string;
  requestIp?: string;
}

export interface ArticleGenerationResult {
  blog: BlogPost;
  executionRecord: PipelineExecutionRecord;
  persistedTiers: MultiTierStorageStatus;
}
