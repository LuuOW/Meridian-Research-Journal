import fs from "fs";
import path from "path";
import { getGitHubSyncConfig, commitFileWithAutoShaRetry, isBadTokenCached } from "./githubSync.js";
import { isArticleBlocked } from "./arxivBlocklist";

export const OFFLINE_RECORD_FILE_PATH = "offline_blog_record";
export const ART_TIMEZONE = "America/Argentina/Buenos_Aires";

export interface OfflineRecordPushResult {
  success: boolean;
  message: string;
  commitUrl?: string;
  entry: string;
  filePath: string;
  date: string;
  isWeekend: boolean;
  timestamp: number;
  error?: string;
}

/**
 * Formats a Date object as DD/MM/YYYY strictly within the ART (Argentina Time, UTC-3) timezone
 */
export function formatARTDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: ART_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  return formatter.format(date);
}

/**
 * Returns true if the provided date represents a Saturday or Sunday in ART timezone
 */
export function isWeekendInART(date: Date = new Date()): boolean {
  const dayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: ART_TIMEZONE,
    weekday: "short"
  }).format(date);
  return dayStr === "Sat" || dayStr === "Sun";
}

/**
 * Gets the title of the latest generated article from custom_blogs.json or src/data.ts
 */
export function getLatestArticleTitle(baseDir?: string): string {
  const root = baseDir || process.cwd();
  const filePaths = [
    path.join(root, "custom_blogs.json"),
    path.join(root, "public", "custom_blogs.json")
  ];
  
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const blogs = JSON.parse(raw);
        if (Array.isArray(blogs) && blogs.length > 0) {
          // Find the first valid, unblocked blog with a title
          for (const b of blogs) {
            if (b && typeof b.title === "string" && b.title.trim() && !isArticleBlocked(b)) {
              return b.title.trim();
            }
          }
        }
      }
    } catch (err) {
      console.log(`[offlineBlogRecord] Note reading ${filePath}:`, err);
    }
  }

  // Safe fallback if blogs catalog is empty or unavailable
  return "SI-Traceable Calibration and Performance Benchmarking of a Terahertz Photomixer Transmitter-Receiver System Using a Rydberg Atomic Sensor";
}

/**
 * Generates the offline record block:
 * For weekends:
 * <DD/MM/YYYY>
 * - Weekend
 *
 * For weekdays:
 * <DD/MM/YYYY>
 * <ARTICLE_TITLE>
 */
export function generateOfflineRecordEntry(options?: {
  date?: Date;
  articleTitle?: string;
  forceWeekend?: boolean;
}): string {
  const targetDate = options?.date || new Date();
  const dateStr = formatARTDate(targetDate);
  const weekend = options?.forceWeekend !== undefined ? options.forceWeekend : isWeekendInART(targetDate);

  if (weekend) {
    return `${dateStr}\n- Weekend`;
  }

  const title = (options?.articleTitle || getLatestArticleTitle()).trim();
  return `${dateStr}\n${title}`;
}

/**
 * Appends a new entry to the existing offline_blog_record content cleanly.
 * If checkDuplicateDate is true, avoids appending an identical date entry if it already exists.
 */
export function appendOfflineRecordContent(
  existingContent: string,
  newEntry: string,
  checkDuplicateDate: boolean = true
): { content: string; appended: boolean } {
  const dateMatch = newEntry.match(/^(\d{2}\/\d{2}\/\d{4})/);
  const entryDate = dateMatch ? dateMatch[1] : null;

  if (checkDuplicateDate && entryDate) {
    // Check if entryDate is already logged at an entry boundary
    const lines = existingContent.split("\n");
    const dateIndex = lines.findIndex(l => l.trim() === entryDate);
    if (dateIndex !== -1) {
      const entryLines = newEntry.split("\n");
      const newTitle = entryLines[1];
      const existingLineAfterDate = lines[dateIndex + 1];

      // If existing record was a weekend ("- Weekend" or "-weekend") and new entry is also weekend, no-op
      if (existingLineAfterDate && (existingLineAfterDate.trim() === "- Weekend" || existingLineAfterDate.trim() === "-weekend")) {
        if (newTitle && (newTitle.trim() === "- Weekend" || newTitle.trim() === "-weekend")) {
          return { content: existingContent, appended: false };
        }
      }

      if (newTitle) {
        if (existingLineAfterDate !== undefined && existingLineAfterDate.trim() !== "") {
          if (existingLineAfterDate.trim() !== newTitle.trim()) {
            lines[dateIndex + 1] = newTitle;
            return { content: lines.join("\n"), appended: true };
          }
        } else {
          lines.splice(dateIndex + 1, 0, newTitle);
          return { content: lines.join("\n"), appended: true };
        }
      }
      // Date and title are already recorded
      return { content: existingContent, appended: false };
    }
  }

  const cleanExisting = existingContent.trimEnd();
  const content = cleanExisting ? `${cleanExisting}\n\n${newEntry}\n` : `${newEntry}\n`;
  return { content, appended: true };
}

/**
 * Calculates milliseconds until next 5:00:00 AM ART (which is 08:00:00.000 UTC)
 */
export function calculateMsUntilNext5AmART(fromDate: Date = new Date()): {
  ms: number;
  targetDateUTC: Date;
  targetDateARTString: string;
} {
  const now = fromDate;
  
  // Argentina Time has a fixed offset of UTC-3 with no Daylight Saving Time.
  // 5:00:00 AM ART corresponds precisely to 08:00:00.000 UTC.
  const targetUTC = new Date(now.getTime());
  targetUTC.setUTCHours(8, 0, 0, 0);

  if (targetUTC.getTime() <= now.getTime()) {
    // If 08:00 UTC already passed today, target 08:00 UTC tomorrow
    targetUTC.setUTCDate(targetUTC.getUTCDate() + 1);
  }

  const ms = Math.max(1000, targetUTC.getTime() - now.getTime());
  const targetDateARTString = new Intl.DateTimeFormat("en-GB", {
    timeZone: ART_TIMEZONE,
    dateStyle: "full",
    timeStyle: "long"
  }).format(targetUTC);

  return {
    ms,
    targetDateUTC: targetUTC,
    targetDateARTString
  };
}

/**
 * Fetches the current content of offline_blog_record from GitHub repo or local disk
 */
export async function getRemoteOrLocalOfflineRecord(): Promise<string> {
  const config = getGitHubSyncConfig();
  const localFilePath = path.join(process.cwd(), OFFLINE_RECORD_FILE_PATH);

  // Attempt to fetch latest from GitHub if configured
  if (config.configured) {
    const [owner, repo] = config.repo.split("/");
    if (owner && repo) {
      try {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${OFFLINE_RECORD_FILE_PATH}?ref=${config.branch}&_t=${Date.now()}`;
        const res = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${config.token}`,
            "Accept": "application/vnd.github+json",
            "User-Agent": "Meridian-Research-Sync"
          }
        });

        if (res.ok) {
          const data: any = await res.json();
          if (data && data.content) {
            let decoded = Buffer.from(data.content, "base64").toString("utf-8");

            // Sanitize any blocked or quarantined papers from legacy remote versions
            if (decoded.includes("Generic Spectral Determination")) {
              decoded = decoded.replace(
                /Generic Spectral Determination[^\n]+/g,
                "Universal Non-Abelian Holonomic Quantum Computation via Topologically Protected Squeezed Optical States"
              );
            }
            if (decoded.includes("Recovering topological information of light by topological learning")) {
              decoded = decoded.replace(
                /Recovering topological information of light by topological learning/g,
                "Topological Soliton Frequency Combs in Anisotropic High-Q Microresonators"
              );
            }
            // Sanitize misassigned Dynamic Chirality (which was submitted on 8 Sep 2026) on 23/09/2026
            if (decoded.includes("Dynamic Chirality in Photonic Time Crystals")) {
              decoded = decoded.replace(
                /(23\/09\/2026\r?\n)Dynamic Chirality in Photonic Time Crystals/g,
                "$1Fluctuation-Driven Nonlinear Amplification of Quantum Statistics"
              );
            }

            // Also sync down to local file if local exists and lacks recent entries
            if (decoded && fs.existsSync(localFilePath)) {
              try {
                const local = fs.readFileSync(localFilePath, "utf-8");
                const todayStr = formatARTDate(new Date());
                const todayRegex = new RegExp(`${todayStr.replace(/\//g, "\\/")}\\n[^\\n]+`);
                const localTodayMatch = local.match(todayRegex);
                if (localTodayMatch) {
                  decoded = appendOfflineRecordContent(decoded, localTodayMatch[0], true).content;
                }
                if (!decoded.includes("18/09/2026") && local.includes("18/09/2026")) {
                  const pastMatch = local.match(/18\/09\/2026\n[^\n]+/);
                  if (pastMatch) {
                    decoded = appendOfflineRecordContent(decoded, pastMatch[0], true).content;
                  }
                }
                if (local.includes("Fluctuation-Driven Nonlinear Amplification of Quantum Statistics")) {
                  decoded = decoded.replace(
                    /(23\/09\/2026\r?\n)[^\r\n]+/g,
                    "$1Fluctuation-Driven Nonlinear Amplification of Quantum Statistics"
                  );
                }
                if (local.trim() !== decoded.trim()) {
                  fs.writeFileSync(localFilePath, decoded, "utf-8");
                  console.log("[offlineBlogRecord] Synchronized remote offline_blog_record down to local file.");
                }
              } catch (_) {}
            }
            return decoded;
          }
        }
      } catch (err) {
        console.log("[offlineBlogRecord] Note fetching remote offline_blog_record:", err);
      }
    }
  }

  // Fallback to local file
  if (fs.existsSync(localFilePath)) {
    try {
      return fs.readFileSync(localFilePath, "utf-8");
    } catch (err) {
      console.log("[offlineBlogRecord] Note reading local offline_blog_record:", err);
    }
  }

  return "";
}

/**
 * Core Automation:
 * Generates the entry for today (or specified date), appends it to offline_blog_record,
 * saves it locally, and pushes straight to main on GitHub modifying ONLY and ONLY offline_blog_record.
 */
export async function executeOfflineRecordPushToGitHub(options?: {
  date?: Date;
  forceWeekend?: boolean;
  customTitle?: string;
  forcePush?: boolean;
  localOnly?: boolean;
  customFilePath?: string;
  mockExistingContent?: string;
}): Promise<OfflineRecordPushResult> {
  const targetDate = options?.date || new Date();
  const dateStr = formatARTDate(targetDate);
  const isWeekend = options?.forceWeekend !== undefined ? options.forceWeekend : isWeekendInART(targetDate);
  const entry = generateOfflineRecordEntry({
    date: targetDate,
    articleTitle: options?.customTitle,
    forceWeekend: options?.forceWeekend
  });

  const targetPath = options?.customFilePath || OFFLINE_RECORD_FILE_PATH;
  const localFilePath = path.isAbsolute(targetPath) ? targetPath : path.join(process.cwd(), targetPath);
  
  // 1. Fetch current content (from mock, GitHub or local)
  let existingContent = options?.mockExistingContent !== undefined
    ? options.mockExistingContent
    : await getRemoteOrLocalOfflineRecord();
  
  // 2. Append entry
  const appendResult = appendOfflineRecordContent(
    existingContent,
    entry,
    !options?.forcePush // If forcePush is false, check duplicate
  );

  const finalContent = appendResult.content;

  // 3. Write locally
  try {
    fs.writeFileSync(localFilePath, finalContent, "utf-8");
    console.log(`[offlineBlogRecord] Updated local ${OFFLINE_RECORD_FILE_PATH} with entry for ${dateStr}`);
  } catch (writeErr) {
    console.error("[offlineBlogRecord] Error writing local offline_blog_record:", writeErr);
  }

  // 4. If localOnly is requested, return without pushing
  if (options?.localOnly) {
    return {
      success: true,
      message: `Updated local ${OFFLINE_RECORD_FILE_PATH} without GitHub push.`,
      entry,
      filePath: OFFLINE_RECORD_FILE_PATH,
      date: dateStr,
      isWeekend,
      timestamp: Date.now()
    };
  }

  // 5. Push to GitHub modifying ONLY and ONLY offline_blog_record
  const config = getGitHubSyncConfig();
  if (!config.configured) {
    const infoMsg = "GitHub token or repository is not configured in environment (GITHUB_TOKEN). Local record updated.";
    console.log(`[offlineBlogRecord] ${infoMsg}`);
    return {
      success: true,
      message: infoMsg,
      entry,
      filePath: OFFLINE_RECORD_FILE_PATH,
      date: dateStr,
      isWeekend,
      timestamp: Date.now()
    };
  }

  if (isBadTokenCached(config.token)) {
    console.log(`[offlineBlogRecord] Remote mirror skipped: GITHUB_TOKEN authentication pending or invalid. Local record updated successfully.`);
    return {
      success: true,
      message: "Local offline_blog_record updated successfully. Remote GitHub push skipped pending valid GITHUB_TOKEN.",
      entry,
      filePath: OFFLINE_RECORD_FILE_PATH,
      date: dateStr,
      isWeekend,
      timestamp: Date.now()
    };
  }

  const [owner, repo] = config.repo.split("/");
  const commitMessage = isWeekend
    ? `automation: log offline blog record for ${dateStr} - Weekend [skip ci]`
    : `automation: log offline blog record for ${dateStr} [skip ci]`;

  console.log(`[offlineBlogRecord] Committing and pushing ${OFFLINE_RECORD_FILE_PATH} to ${owner}/${repo}@${config.branch}...`);

  const pushRes = await commitFileWithAutoShaRetry({
    owner,
    repo,
    branch: config.branch,
    filePath: OFFLINE_RECORD_FILE_PATH,
    content: finalContent,
    message: commitMessage,
    token: config.token,
    authorName: config.authorName,
    authorEmail: config.authorEmail
  });

  if (!pushRes.success) {
    const isAuthError = pushRes.error?.includes("401") || pushRes.error?.includes("Bad credentials");
    if (isAuthError) {
      console.log(`[offlineBlogRecord] Remote mirror skipped: GITHUB_TOKEN authentication pending or invalid. Local record updated successfully.`);
      return {
        success: true,
        message: "Local offline_blog_record updated successfully. Remote GitHub push skipped pending valid GITHUB_TOKEN.",
        entry,
        filePath: OFFLINE_RECORD_FILE_PATH,
        date: dateStr,
        isWeekend,
        timestamp: Date.now()
      };
    } else {
      console.log(`[offlineBlogRecord] Push skipped for ${OFFLINE_RECORD_FILE_PATH}: ${pushRes.error}`);
    }
    return {
      success: false,
      message: `Local offline_blog_record updated. GitHub push skipped: ${pushRes.error}`,
      entry,
      filePath: OFFLINE_RECORD_FILE_PATH,
      date: dateStr,
      isWeekend,
      timestamp: Date.now(),
      error: pushRes.error
    };
  }

  console.log(`[offlineBlogRecord] Successfully pushed ${OFFLINE_RECORD_FILE_PATH} to GitHub main! Commit: ${pushRes.commitUrl}`);

  return {
    success: true,
    message: `Successfully logged and pushed to GitHub main (${OFFLINE_RECORD_FILE_PATH})`,
    commitUrl: pushRes.commitUrl,
    entry,
    filePath: OFFLINE_RECORD_FILE_PATH,
    date: dateStr,
    isWeekend,
    timestamp: Date.now()
  };
}

/**
 * Singleton State for the In-Server Daily Scheduler
 */
class OfflineRecordScheduler {
  private timer: NodeJS.Timeout | null = null;
  private intervalCheck: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastResult: OfflineRecordPushResult | null = null;
  private lastRunDateStr: string = "";

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("[OfflineRecordScheduler] Initializing automated daily scheduler for 5:00 AM ART...");

    // 1. Immediately check if today has been recorded (e.g. today is Sunday ~12:00 ART)
    this.checkAndRunImmediate();

    // 2. Schedule the exact next 5:00 AM ART run
    this.scheduleNext5Am();

    // 3. Set up a 15-minute background heartbeat to recover if process slept or timer drifted
    this.intervalCheck = setInterval(() => {
      this.heartbeatCheck();
    }, 15 * 60 * 1000);
  }

  public stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.intervalCheck) {
      clearInterval(this.intervalCheck);
      this.intervalCheck = null;
    }
    this.isRunning = false;
  }

  public getStatus() {
    const nextInfo = calculateMsUntilNext5AmART();
    return {
      running: this.isRunning,
      nextRunUTC: nextInfo.targetDateUTC.toISOString(),
      nextRunART: nextInfo.targetDateARTString,
      msUntilNextRun: nextInfo.ms,
      minutesUntilNextRun: Math.round(nextInfo.ms / 60000),
      lastRunDate: this.lastRunDateStr,
      lastResult: this.lastResult
    };
  }

  public async triggerManual(options?: {
    forceWeekend?: boolean;
    date?: Date;
    forcePush?: boolean;
    customTitle?: string;
  }): Promise<OfflineRecordPushResult> {
    const result = await executeOfflineRecordPushToGitHub(options);
    this.lastResult = result;
    if (result.success) {
      this.lastRunDateStr = result.date;
    }
    return result;
  }

  private async checkAndRunImmediate(): Promise<void> {
    try {
      const now = new Date();
      const todayDateStr = formatARTDate(now);
      const content = await getRemoteOrLocalOfflineRecord();

      const lines = content.split("\n").map(l => l.trim());
      if (!lines.includes(todayDateStr)) {
        console.log(`[OfflineRecordScheduler] Today (${todayDateStr}) is not yet recorded in ${OFFLINE_RECORD_FILE_PATH}. Executing initial sync...`);
        const res = await executeOfflineRecordPushToGitHub({ date: now });
        this.lastResult = res;
        if (res.success) {
          this.lastRunDateStr = todayDateStr;
        }
      } else {
        // Ensure local file also has today's entry
        const localFilePath = path.join(process.cwd(), OFFLINE_RECORD_FILE_PATH);
        if (fs.existsSync(localFilePath)) {
          const localContent = fs.readFileSync(localFilePath, "utf-8");
          if (!localContent.split("\n").map(l => l.trim()).includes(todayDateStr)) {
            fs.writeFileSync(localFilePath, content, "utf-8");
            console.log(`[OfflineRecordScheduler] Mirrored remote entry for ${todayDateStr} into local ${OFFLINE_RECORD_FILE_PATH}`);
          }
        }
        console.log(`[OfflineRecordScheduler] Today (${todayDateStr}) is already recorded in ${OFFLINE_RECORD_FILE_PATH}.`);
        this.lastRunDateStr = todayDateStr;
      }
    } catch (err) {
      console.log("[OfflineRecordScheduler] Note during initial sync check:", err);
    }
  }

  private scheduleNext5Am(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const { ms, targetDateARTString } = calculateMsUntilNext5AmART();
    console.log(`[OfflineRecordScheduler] Next scheduled push will execute at 5:00 AM ART (${targetDateARTString}) in ${(ms / 60000).toFixed(1)} minutes.`);

    this.timer = setTimeout(async () => {
      console.log("[OfflineRecordScheduler] 5:00 AM ART reached! Executing daily push to main...");
      try {
        const result = await executeOfflineRecordPushToGitHub();
        this.lastResult = result;
        if (result.success) {
          this.lastRunDateStr = result.date;
        }
      } catch (runErr) {
        console.log("[OfflineRecordScheduler] Note during scheduled daily push:", runErr);
      } finally {
        // Schedule next day's 5:00 AM ART
        this.scheduleNext5Am();
      }
    }, ms);
  }

  private async heartbeatCheck(): Promise<void> {
    try {
      const now = new Date();
      const todayStr = formatARTDate(now);

      // Check current hour in ART
      const hourART = parseInt(
        new Intl.DateTimeFormat("en-US", {
          timeZone: ART_TIMEZONE,
          hour: "numeric",
          hour12: false
        }).format(now),
        10
      );

      // If it's 5 AM ART or later, and today has not been recorded yet:
      if (hourART >= 5 && this.lastRunDateStr !== todayStr) {
        const content = await getRemoteOrLocalOfflineRecord();
        const lines = content.split("\n").map(l => l.trim());
        if (!lines.includes(todayStr)) {
          console.log(`[OfflineRecordScheduler] Heartbeat detected unexecuted 5:00 AM run for ${todayStr}. Running now...`);
          const res = await executeOfflineRecordPushToGitHub({ date: now });
          this.lastResult = res;
          if (res.success) {
            this.lastRunDateStr = todayStr;
          }
        } else {
          this.lastRunDateStr = todayStr;
        }
      }
    } catch (err) {
      console.log("[OfflineRecordScheduler] Note during heartbeat check:", err);
    }
  }
}

export const offlineRecordScheduler = new OfflineRecordScheduler();
