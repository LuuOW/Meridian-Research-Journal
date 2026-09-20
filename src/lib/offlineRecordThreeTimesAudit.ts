import fs from "fs";
import path from "path";
import {
  formatARTDate,
  isWeekendInART,
  generateOfflineRecordEntry,
  appendOfflineRecordContent,
  executeOfflineRecordPushToGitHub,
  getRemoteOrLocalOfflineRecord,
  OFFLINE_RECORD_FILE_PATH,
  ART_TIMEZONE,
  OfflineRecordPushResult
} from "./offlineBlogRecord.js";
import { getGitHubSyncConfig, GitHubSyncConfig } from "./githubSync.js";

export const USER_GITHUB_EMAIL = "lucas.kempe@icloud.com";
export const USER_GITHUB_NAME = "Lucas Kempe";
export const USER_GITHUB_REPO = "LuuOW/Meridian-Research-Journal";

export interface DailyCheckpointDefinition {
  id: "MORNING" | "MIDDAY" | "EVENING";
  name: string;
  artHour: number;
  artMinute: number;
  description: string;
}

export const DAILY_AUDIT_CHECKPOINTS: DailyCheckpointDefinition[] = [
  {
    id: "MORNING",
    name: "Morning Checkpoint (05:00 ART)",
    artHour: 5,
    artMinute: 0,
    description: "Daily scheduled publication & initial offline_blog_record logging window"
  },
  {
    id: "MIDDAY",
    name: "Midday Checkpoint (13:00 ART)",
    artHour: 13,
    artMinute: 0,
    description: "Midday verification & synchronization check"
  },
  {
    id: "EVENING",
    name: "Evening Checkpoint (19:00 ART)",
    artHour: 19,
    artMinute: 0,
    description: "Evening contribution graph lock-in & end-of-day audit (~19:10 ART active window)"
  }
];

export interface CheckpointStatus {
  id: "MORNING" | "MIDDAY" | "EVENING";
  name: string;
  targetTimeART: string;
  targetTimeUTC: string;
  status: "ELAPSED" | "ACTIVE" | "PENDING";
  isElapsed: boolean;
  minutesUntilOrSince: number;
}

export interface ContributionGraphAttributionAudit {
  valid: boolean;
  configuredEmail: string;
  configuredName: string;
  expectedUserEmail: string;
  isLinkedToUserAccount: boolean;
  targetRepo: string;
  targetBranch: string;
  diagnosticExplanation: string;
}

export interface OfflineRecordDailyAuditResult {
  timestamp: number;
  artTimeString: string;
  dateStrART: string;
  isWeekend: boolean;
  expectedEntry: string;
  checkpoints: CheckpointStatus[];
  activeCheckpoint: CheckpointStatus;
  nextUpcomingCheckpoint: CheckpointStatus;
  localAudit: {
    exists: boolean;
    containsToday: boolean;
    todayEntrySnippet?: string;
  };
  remoteAudit: {
    checked: boolean;
    configured: boolean;
    containsToday: boolean;
    remoteContentSnippet?: string;
    commitCountToday?: number;
    latestCommitAuthorEmail?: string;
    error?: string;
  };
  attributionAudit: ContributionGraphAttributionAudit;
  status:
    | "VERIFIED_PUSHED_AND_ATTRIBUTED"
    | "LOCAL_RECORDED_REMOTE_MISSING"
    | "COMPLETELY_UNRECORDED"
    | "ATTRIBUTION_MISCONFIGURED"
    | "REMOTE_RECORDED_LOCAL_MISSING"
    | "OFFLINE_RECORD_HEALTHY";
  contributionGraphAlert: string;
  rootCauseAnalysis: string[];
  recommendation: string;
  autoHealed?: boolean;
  healResult?: OfflineRecordPushResult;
}

/**
 * Returns hours and minutes in ART (UTC-3)
 */
export function getARTHourAndMinute(date: Date = new Date()): {
  hour: number;
  minute: number;
  second: number;
  dateStr: string;
  isoDate: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ART_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(date);

  let hour = 0;
  let minute = 0;
  let second = 0;
  let day = "";
  let month = "";
  let year = "";

  for (const p of parts) {
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
    if (p.type === "second") second = parseInt(p.value, 10);
    if (p.type === "day") day = p.value;
    if (p.type === "month") month = p.value;
    if (p.type === "year") year = p.value;
  }

  // format as DD/MM/YYYY
  const dateStr = `${day}/${month}/${year}`;
  const isoDate = `${year}-${month}-${day}`;

  return { hour, minute, second, dateStr, isoDate };
}

/**
 * Evaluates the 3 daily checkpoints for any given reference date in ART
 */
export function evaluateDailyCheckpoints(referenceDate: Date = new Date()): {
  checkpoints: CheckpointStatus[];
  activeCheckpoint: CheckpointStatus;
  nextUpcomingCheckpoint: CheckpointStatus;
} {
  const { hour, minute, dateStr } = getARTHourAndMinute(referenceDate);
  const currentMinutesFromMidnight = hour * 60 + minute;

  const checkpointStatuses: CheckpointStatus[] = DAILY_AUDIT_CHECKPOINTS.map((cp) => {
    const cpMinutes = cp.artHour * 60 + cp.artMinute;
    const diff = currentMinutesFromMidnight - cpMinutes;

    // A checkpoint is ACTIVE if we are within 30 minutes after it,
    // ELAPSED if > 30 minutes past it, and PENDING if still before it.
    let status: "ELAPSED" | "ACTIVE" | "PENDING" = "PENDING";
    if (diff >= 0 && diff <= 30) {
      status = "ACTIVE";
    } else if (diff > 30) {
      status = "ELAPSED";
    } else {
      status = "PENDING";
    }

    // Calculate UTC target time: ART is UTC-3, so UTC hour = ART hour + 3
    const utcHour = cp.artHour + 3;
    const targetTimeART = `${cp.artHour.toString().padStart(2, "0")}:${cp.artMinute
      .toString()
      .padStart(2, "0")}:00 ART`;
    const targetTimeUTC = `${utcHour.toString().padStart(2, "0")}:${cp.artMinute
      .toString()
      .padStart(2, "0")}:00 UTC`;

    return {
      id: cp.id,
      name: cp.name,
      targetTimeART,
      targetTimeUTC,
      status,
      isElapsed: diff >= 0,
      minutesUntilOrSince: diff
    };
  });

  // Find active checkpoint or most recent elapsed checkpoint
  let activeCheckpoint = checkpointStatuses.find((cp) => cp.status === "ACTIVE");
  if (!activeCheckpoint) {
    const elapsed = checkpointStatuses.filter((cp) => cp.isElapsed);
    activeCheckpoint = elapsed.length > 0 ? elapsed[elapsed.length - 1] : checkpointStatuses[0];
  }

  // Find next upcoming checkpoint
  const pending = checkpointStatuses.find((cp) => cp.status === "PENDING");
  const nextUpcomingCheckpoint = pending || checkpointStatuses[0];

  return {
    checkpoints: checkpointStatuses,
    activeCheckpoint,
    nextUpcomingCheckpoint
  };
}

/**
 * Validates whether the configured author email matches GitHub account requirements
 * for incrementing contribution squares.
 */
export function auditContributionAttribution(configOverride?: Partial<GitHubSyncConfig>): ContributionGraphAttributionAudit {
  const config = { ...getGitHubSyncConfig(), ...(configOverride || {}) };
  const email = (config.authorEmail || "").trim().toLowerCase();
  const name = (config.authorName || "").trim();
  const repo = config.repo;
  const branch = config.branch;

  const isUserEmail = email === USER_GITHUB_EMAIL.toLowerCase();
  const isGenericBot = email.includes("bot@") || email.includes("ask-meridian.uk");

  let diagnosticExplanation = "";
  if (isUserEmail) {
    diagnosticExplanation = `Author email '${email}' matches primary GitHub account email (${USER_GITHUB_EMAIL}). Commits will correctly register on the GitHub contribution graph for ${name}.`;
  } else if (isGenericBot) {
    diagnosticExplanation = `CRITICAL ATTRIBUTION FAILURE: Author email is set to '${email}'. GitHub ONLY increments contribution squares for emails linked to your personal account. Commits made with '${email}' will show as 0 contributions for Lucas Kempe on GitHub!`;
  } else {
    diagnosticExplanation = `Author email '${email}' is not confirmed as primary account '${USER_GITHUB_EMAIL}'. Verify that '${email}' is registered under GitHub -> Settings -> Emails.`;
  }

  return {
    valid: isUserEmail,
    configuredEmail: config.authorEmail,
    configuredName: name,
    expectedUserEmail: USER_GITHUB_EMAIL,
    isLinkedToUserAccount: isUserEmail,
    targetRepo: repo,
    targetBranch: branch,
    diagnosticExplanation
  };
}

/**
 * Performs a comprehensive audit of today's offline_blog_record push status
 * across the 3 daily checkpoints.
 */
export async function auditOfflineRecordPushStatus(options?: {
  referenceDate?: Date;
  mockLocalContent?: string;
  mockRemoteContent?: string;
  mockConfig?: Partial<GitHubSyncConfig>;
}): Promise<OfflineRecordDailyAuditResult> {
  const targetDate = options?.referenceDate || new Date();
  const dateStrART = formatARTDate(targetDate);
  const isWeekend = isWeekendInART(targetDate);
  const expectedEntry = generateOfflineRecordEntry({ date: targetDate, forceWeekend: isWeekend });

  const { hour, minute, second } = getARTHourAndMinute(targetDate);
  const artTimeString = `${dateStrART} ${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}:${second.toString().padStart(2, "0")} ART`;

  const { checkpoints, activeCheckpoint, nextUpcomingCheckpoint } = evaluateDailyCheckpoints(targetDate);
  const attributionAudit = auditContributionAttribution(options?.mockConfig);

  // 1. Audit Local Content
  let localContent = "";
  const localFilePath = path.join(process.cwd(), OFFLINE_RECORD_FILE_PATH);

  if (options?.mockLocalContent !== undefined) {
    localContent = options.mockLocalContent;
  } else if (fs.existsSync(localFilePath)) {
    try {
      localContent = fs.readFileSync(localFilePath, "utf-8");
    } catch (_) {}
  }

  const localLines = localContent.split("\n").map((l) => l.trim());
  const localDateIdx = localLines.indexOf(dateStrART);
  const localContainsToday = localDateIdx !== -1;
  let localTodaySnippet = "";
  if (localContainsToday) {
    localTodaySnippet = localLines.slice(localDateIdx, localDateIdx + 2).join("\n");
  }

  // 2. Audit Remote Content from GitHub API
  let remoteContent = "";
  let remoteChecked = false;
  let remoteConfigured = Boolean(attributionAudit.configuredEmail);
  let remoteError = "";

  if (options?.mockRemoteContent !== undefined) {
    remoteContent = options.mockRemoteContent;
    remoteChecked = true;
  } else {
    const config = { ...getGitHubSyncConfig(), ...(options?.mockConfig || {}) };
    if (config.configured && config.token) {
      const [owner, repo] = config.repo.split("/");
      if (owner && repo) {
        try {
          const url = `https://api.github.com/repos/${owner}/${repo}/contents/${OFFLINE_RECORD_FILE_PATH}?ref=${config.branch}&_t=${Date.now()}`;
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${config.token}`,
              Accept: "application/vnd.github+json",
              "User-Agent": "Meridian-3xDaily-Auditor"
            }
          });
          if (res.ok) {
            const data: any = await res.json();
            if (data && data.content) {
              remoteContent = Buffer.from(data.content, "base64").toString("utf-8");
              remoteChecked = true;
            }
          } else {
            remoteError = `GitHub API HTTP ${res.status}: ${res.statusText}`;
          }
        } catch (fetchErr: any) {
          remoteError = fetchErr?.message || "Failed to query GitHub contents API";
        }
      }
    } else {
      remoteConfigured = false;
    }
  }

  const remoteLines = remoteContent.split("\n").map((l) => l.trim());
  const remoteDateIdx = remoteLines.indexOf(dateStrART);
  const remoteContainsToday = remoteDateIdx !== -1;
  let remoteTodaySnippet = "";
  if (remoteContainsToday) {
    remoteTodaySnippet = remoteLines.slice(remoteDateIdx, remoteDateIdx + 2).join("\n");
  }

  // 3. Determine Overall Status & Root Cause Diagnosis
  const rootCauseAnalysis: string[] = [];
  let status: OfflineRecordDailyAuditResult["status"] = "OFFLINE_RECORD_HEALTHY";
  let contributionGraphAlert = "";
  let recommendation = "";

  if (!attributionAudit.valid) {
    rootCauseAnalysis.push(
      `Attribution Mismatch: Git commits are configured with email '${attributionAudit.configuredEmail}'. GitHub contribution graph strictly requires commits to match user email '${USER_GITHUB_EMAIL}'.`
    );
  }

  if (localContainsToday && !remoteContainsToday) {
    status = "LOCAL_RECORDED_REMOTE_MISSING";
    rootCauseAnalysis.push(
      `Remote Desynchronization: Local offline_blog_record has '${dateStrART}', but the remote repository at ${attributionAudit.targetRepo}@${attributionAudit.targetBranch} DOES NOT have today's entry committed.`
    );
    rootCauseAnalysis.push(
      `Daily Scheduler Skip: The morning scheduler (05:00 ART) checks local contents. If local file was written or edited on disk before remote push completed, the scheduler assumed today was done and bypassed remote GitHub push.`
    );
    contributionGraphAlert = `0 Contributions Detected: Because remote GitHub repository lacks today's commit for '${dateStrART}', your GitHub profile shows 0 contributions today (${artTimeString}).`;
    recommendation = `Trigger automated push immediately to sync '${dateStrART}' directly to GitHub main with author '${USER_GITHUB_EMAIL}'.`;
  } else if (!localContainsToday && !remoteContainsToday) {
    status = "COMPLETELY_UNRECORDED";
    rootCauseAnalysis.push(
      `Unrecorded Day: Neither local nor remote offline_blog_record contains an entry for today (${dateStrART}).`
    );
    contributionGraphAlert = `0 Contributions Detected: No record for today has been logged or committed.`;
    recommendation = `Run daily offline record generation for ${dateStrART} and push directly to GitHub main.`;
  } else if (remoteContainsToday && !attributionAudit.valid) {
    status = "ATTRIBUTION_MISCONFIGURED";
    contributionGraphAlert = `0 Contributions Detected: Today's entry is committed to GitHub, BUT the commit author email was '${attributionAudit.configuredEmail}' instead of '${USER_GITHUB_EMAIL}'. GitHub refused to attribute it to your contribution graph!`;
    recommendation = `Update authorEmail in githubSync.ts to '${USER_GITHUB_EMAIL}' and push an attribution commit.`;
  } else if (remoteContainsToday && localContainsToday && attributionAudit.valid) {
    status = "VERIFIED_PUSHED_AND_ATTRIBUTED";
    contributionGraphAlert = `Contributions Verified: Today (${dateStrART}) is recorded on GitHub remote main with author '${USER_GITHUB_EMAIL}'. Contributions should reflect on GitHub graph within cache refresh window.`;
    recommendation = `System is 100% compliant across all 3 checkpoints.`;
  } else if (remoteContainsToday && !localContainsToday) {
    status = "REMOTE_RECORDED_LOCAL_MISSING";
    recommendation = `Sync remote record down to local repository.`;
  }

  return {
    timestamp: Date.now(),
    artTimeString,
    dateStrART,
    isWeekend,
    expectedEntry,
    checkpoints,
    activeCheckpoint,
    nextUpcomingCheckpoint,
    localAudit: {
      exists: Boolean(localContent),
      containsToday: localContainsToday,
      todayEntrySnippet: localTodaySnippet
    },
    remoteAudit: {
      checked: remoteChecked,
      configured: remoteConfigured,
      containsToday: remoteContainsToday,
      remoteContentSnippet: remoteTodaySnippet,
      error: remoteError || undefined
    },
    attributionAudit,
    status,
    contributionGraphAlert,
    rootCauseAnalysis,
    recommendation
  };
}

/**
 * Audits and automatically heals missing pushes to GitHub.
 * If remote GitHub is missing today's entry or if forcePush is requested,
 * executes the push with proper attribution (lucas.kempe@icloud.com).
 */
export async function auditAndAutoHealOfflineRecord(options?: {
  referenceDate?: Date;
  forcePush?: boolean;
}): Promise<OfflineRecordDailyAuditResult> {
  const targetDate = options?.referenceDate || new Date();
  const initialAudit = await auditOfflineRecordPushStatus({ referenceDate: targetDate });

  // If remote is missing or forcePush requested:
  if (
    options?.forcePush ||
    initialAudit.status === "LOCAL_RECORDED_REMOTE_MISSING" ||
    initialAudit.status === "COMPLETELY_UNRECORDED" ||
    !initialAudit.remoteAudit.containsToday
  ) {
    console.log(
      `[ThreeTimesDailyAuditor] Auto-healing offline_blog_record push for ${initialAudit.dateStrART}...`
    );

    const isWeekend = initialAudit.isWeekend;
    const healResult = await executeOfflineRecordPushToGitHub({
      date: targetDate,
      forceWeekend: isWeekend,
      forcePush: true
    });

    const refreshedAudit = await auditOfflineRecordPushStatus({ referenceDate: targetDate });
    refreshedAudit.autoHealed = true;
    refreshedAudit.healResult = healResult;

    return refreshedAudit;
  }

  return initialAudit;
}

/**
 * In-Memory Singleton Service that schedules the 3 daily checks
 * (05:00 ART Morning, 13:00 ART Midday, 19:00 ART Evening)
 */
export class OfflineRecordThreeTimesAuditorService {
  private isRunning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private lastAuditResult: OfflineRecordDailyAuditResult | null = null;
  private checkpointHistory: Map<string, OfflineRecordDailyAuditResult> = new Map();

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("[ThreeTimesDailyAuditor] Starting 3x daily audit daemon (05:00, 13:00, 19:00 ART)...");

    // 1. Immediate initial audit check on startup
    this.runAuditCheck();

    // 2. Schedule regular 15-minute heartbeat to check and trigger checkpoints
    this.intervalTimer = setInterval(() => {
      this.runAuditCheck();
    }, 15 * 60 * 1000);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
  }

  public async runAuditCheck(forcePushIfMissing: boolean = false): Promise<OfflineRecordDailyAuditResult> {
    try {
      const now = new Date();
      let audit = await auditOfflineRecordPushStatus({ referenceDate: now });

      // If at any elapsed checkpoint remote lacks today's push, auto-heal
      if (
        forcePushIfMissing ||
        audit.status === "LOCAL_RECORDED_REMOTE_MISSING" ||
        audit.status === "COMPLETELY_UNRECORDED"
      ) {
        console.log(`[ThreeTimesDailyAuditor] Detected missing remote push during checkpoint ${audit.activeCheckpoint.name}. Triggering auto-heal...`);
        audit = await auditAndAutoHealOfflineRecord({ referenceDate: now, forcePush: true });
      }

      this.lastAuditResult = audit;
      const historyKey = `${audit.dateStrART}_${audit.activeCheckpoint.id}`;
      this.checkpointHistory.set(historyKey, audit);

      return audit;
    } catch (err) {
      console.error("[ThreeTimesDailyAuditor] Error during audit check:", err);
      throw err;
    }
  }

  public getStatus() {
    const now = new Date();
    const { checkpoints, activeCheckpoint, nextUpcomingCheckpoint } = evaluateDailyCheckpoints(now);
    return {
      running: this.isRunning,
      activeCheckpoint,
      nextUpcomingCheckpoint,
      checkpoints,
      lastAudit: this.lastAuditResult,
      historyCount: this.checkpointHistory.size
    };
  }
}

export const offlineRecordThreeTimesAuditor = new OfflineRecordThreeTimesAuditorService();
