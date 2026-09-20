import { test } from "node:test";
import assert from "node:assert";
import {
  DAILY_AUDIT_CHECKPOINTS,
  USER_GITHUB_EMAIL,
  USER_GITHUB_NAME,
  USER_GITHUB_REPO,
  getARTHourAndMinute,
  evaluateDailyCheckpoints,
  auditContributionAttribution,
  auditOfflineRecordPushStatus,
  auditAndAutoHealOfflineRecord,
  OfflineRecordThreeTimesAuditorService
} from "./offlineRecordThreeTimesAudit.js";
import { formatARTDate, isWeekendInART, OFFLINE_RECORD_FILE_PATH } from "./offlineBlogRecord.js";

// Sunday September 20, 2026 at ~19:10 ART (which is 22:10 UTC)
const SUNDAY_SEP_20_2026_1910_ART = new Date("2026-09-20T22:10:00Z");

test("3x Daily Checkpoints: verifies standard 3 checkpoints configuration (05:00, 13:00, 19:00 ART)", () => {
  assert.strictEqual(DAILY_AUDIT_CHECKPOINTS.length, 3, "Must configure exactly 3 checkpoints per day");

  const [morning, midday, evening] = DAILY_AUDIT_CHECKPOINTS;

  // 1. Morning Checkpoint
  assert.strictEqual(morning.id, "MORNING");
  assert.strictEqual(morning.artHour, 5);
  assert.strictEqual(morning.artMinute, 0);

  // 2. Midday Checkpoint
  assert.strictEqual(midday.id, "MIDDAY");
  assert.strictEqual(midday.artHour, 13);
  assert.strictEqual(midday.artMinute, 0);

  // 3. Evening Checkpoint
  assert.strictEqual(evening.id, "EVENING");
  assert.strictEqual(evening.artHour, 19);
  assert.strictEqual(evening.artMinute, 0);
});

test("3x Daily Checkpoints: accurately evaluates checkpoint status at ~19:10 ART on Sep 20, 2026", () => {
  const { hour, minute, dateStr, isoDate } = getARTHourAndMinute(SUNDAY_SEP_20_2026_1910_ART);

  assert.strictEqual(hour, 19, "Hour must be 19 in ART");
  assert.strictEqual(minute, 10, "Minute must be 10 in ART");
  assert.strictEqual(dateStr, "20/09/2026", "Date must be 20/09/2026 in ART");
  assert.strictEqual(isoDate, "2026-09-20");

  const evaluation = evaluateDailyCheckpoints(SUNDAY_SEP_20_2026_1910_ART);
  const { checkpoints, activeCheckpoint, nextUpcomingCheckpoint } = evaluation;

  assert.strictEqual(checkpoints.length, 3);

  const morning = checkpoints.find((c) => c.id === "MORNING")!;
  const midday = checkpoints.find((c) => c.id === "MIDDAY")!;
  const evening = checkpoints.find((c) => c.id === "EVENING")!;

  // At 19:10 ART:
  // - Morning (05:00) has elapsed
  // - Midday (13:00) has elapsed
  // - Evening (19:00) is ACTIVE (within 30 minutes of 19:00)
  assert.strictEqual(morning.status, "ELAPSED");
  assert.strictEqual(morning.isElapsed, true);

  assert.strictEqual(midday.status, "ELAPSED");
  assert.strictEqual(midday.isElapsed, true);

  assert.strictEqual(evening.status, "ACTIVE", "19:10 ART is within active evening window");
  assert.strictEqual(evening.isElapsed, true);

  assert.strictEqual(activeCheckpoint.id, "EVENING");
  assert.strictEqual(activeCheckpoint.name, "Evening Checkpoint (19:00 ART)");
  assert.strictEqual(nextUpcomingCheckpoint.id, "MORNING", "Next cycle rolls to morning checkpoint");
});

test("3x Daily Checkpoints: validates morning (05:00 ART) and midday (13:00 ART) evaluations", () => {
  // 1. Morning test: 05:15 ART (08:15 UTC)
  const morningDate = new Date("2026-09-20T08:15:00Z");
  const morningEval = evaluateDailyCheckpoints(morningDate);
  assert.strictEqual(morningEval.activeCheckpoint.id, "MORNING");
  assert.strictEqual(morningEval.activeCheckpoint.status, "ACTIVE");
  assert.strictEqual(morningEval.checkpoints.find((c) => c.id === "MIDDAY")!.status, "PENDING");
  assert.strictEqual(morningEval.checkpoints.find((c) => c.id === "EVENING")!.status, "PENDING");

  // 2. Midday test: 13:20 ART (16:20 UTC)
  const middayDate = new Date("2026-09-20T16:20:00Z");
  const middayEval = evaluateDailyCheckpoints(middayDate);
  assert.strictEqual(middayEval.activeCheckpoint.id, "MIDDAY");
  assert.strictEqual(middayEval.activeCheckpoint.status, "ACTIVE");
  assert.strictEqual(middayEval.checkpoints.find((c) => c.id === "MORNING")!.status, "ELAPSED");
  assert.strictEqual(middayEval.checkpoints.find((c) => c.id === "EVENING")!.status, "PENDING");
});

test("GitHub Contribution Attribution: verifies user email matches lucas.kempe@icloud.com", () => {
  // Correct configuration
  const validAudit = auditContributionAttribution({
    authorEmail: USER_GITHUB_EMAIL,
    authorName: USER_GITHUB_NAME,
    repo: USER_GITHUB_REPO
  });

  assert.strictEqual(validAudit.valid, true);
  assert.strictEqual(validAudit.isLinkedToUserAccount, true);
  assert.strictEqual(validAudit.configuredEmail, "lucas.kempe@icloud.com");
  assert.ok(validAudit.diagnosticExplanation.includes("matches primary GitHub account email"));

  // Incorrect configuration (generic bot@ask-meridian.uk) which caused 0 contributions
  const invalidAudit = auditContributionAttribution({
    authorEmail: "bot@ask-meridian.uk",
    authorName: "Meridian Research",
    repo: USER_GITHUB_REPO
  });

  assert.strictEqual(invalidAudit.valid, false);
  assert.strictEqual(invalidAudit.isLinkedToUserAccount, false);
  assert.ok(invalidAudit.diagnosticExplanation.includes("CRITICAL ATTRIBUTION FAILURE"));
  assert.ok(invalidAudit.diagnosticExplanation.includes("0 contributions"));
});

test("Audit Status: identifies LOCAL_RECORDED_REMOTE_MISSING and explains 0 contributions on GitHub", async () => {
  // Simulated state:
  // Local file has 20/09/2026 - Weekend
  // Remote GitHub repository ONLY has up to 18/09/2026
  const localContent = `18/09/2026\nTopological Soliton Frequency Combs in Anisotropic High-Q Microresonators\n\n19/09/2026\n- Weekend\n\n20/09/2026\n- Weekend\n`;
  const remoteContent = `18/09/2026\nTopological Soliton Frequency Combs in Anisotropic High-Q Microresonators\n`;

  const audit = await auditOfflineRecordPushStatus({
    referenceDate: SUNDAY_SEP_20_2026_1910_ART,
    mockLocalContent: localContent,
    mockRemoteContent: remoteContent,
    mockConfig: {
      authorEmail: USER_GITHUB_EMAIL,
      authorName: USER_GITHUB_NAME,
      repo: USER_GITHUB_REPO,
      branch: "main"
    }
  });

  assert.strictEqual(audit.status, "LOCAL_RECORDED_REMOTE_MISSING");
  assert.strictEqual(audit.localAudit.containsToday, true);
  assert.strictEqual(audit.remoteAudit.containsToday, false);
  assert.strictEqual(audit.activeCheckpoint.id, "EVENING");
  assert.ok(audit.contributionGraphAlert.includes("0 Contributions Detected"));
  assert.ok(
    audit.rootCauseAnalysis.some((r) => r.includes("Remote Desynchronization")),
    "Must identify remote desynchronization"
  );
  assert.ok(
    audit.rootCauseAnalysis.some((r) => r.includes("Daily Scheduler Skip")),
    "Must explain how local presence bypassed remote push"
  );
});

test("Audit Status: identifies VERIFIED_PUSHED_AND_ATTRIBUTED when remote and local are synced", async () => {
  const syncedContent = `18/09/2026\nTopological Soliton Frequency Combs in Anisotropic High-Q Microresonators\n\n19/09/2026\n- Weekend\n\n20/09/2026\n- Weekend\n`;

  const audit = await auditOfflineRecordPushStatus({
    referenceDate: SUNDAY_SEP_20_2026_1910_ART,
    mockLocalContent: syncedContent,
    mockRemoteContent: syncedContent,
    mockConfig: {
      authorEmail: USER_GITHUB_EMAIL,
      authorName: USER_GITHUB_NAME,
      repo: USER_GITHUB_REPO,
      branch: "main"
    }
  });

  assert.strictEqual(audit.status, "VERIFIED_PUSHED_AND_ATTRIBUTED");
  assert.strictEqual(audit.localAudit.containsToday, true);
  assert.strictEqual(audit.remoteAudit.containsToday, true);
  assert.strictEqual(audit.attributionAudit.valid, true);
  assert.ok(audit.contributionGraphAlert.includes("Contributions Verified"));
});

test("Audit Status: identifies ATTRIBUTION_MISCONFIGURED when committed with unlinked email", async () => {
  const syncedContent = `18/09/2026\nTopological Soliton Frequency Combs in Anisotropic High-Q Microresonators\n\n19/09/2026\n- Weekend\n\n20/09/2026\n- Weekend\n`;

  const audit = await auditOfflineRecordPushStatus({
    referenceDate: SUNDAY_SEP_20_2026_1910_ART,
    mockLocalContent: syncedContent,
    mockRemoteContent: syncedContent,
    mockConfig: {
      authorEmail: "bot@ask-meridian.uk", // Unlinked bot email!
      authorName: "Meridian Research",
      repo: USER_GITHUB_REPO,
      branch: "main"
    }
  });

  assert.strictEqual(audit.status, "ATTRIBUTION_MISCONFIGURED");
  assert.strictEqual(audit.attributionAudit.valid, false);
  assert.ok(audit.contributionGraphAlert.includes("0 Contributions Detected"));
  assert.ok(audit.contributionGraphAlert.includes("bot@ask-meridian.uk"));
});

test("Weekend Rule: validates Sunday Sep 20, 2026 outputs exactly '20/09/2026\\n- Weekend'", async () => {
  const audit = await auditOfflineRecordPushStatus({
    referenceDate: SUNDAY_SEP_20_2026_1910_ART
  });

  assert.strictEqual(audit.isWeekend, true);
  assert.strictEqual(audit.dateStrART, "20/09/2026");
  assert.strictEqual(audit.expectedEntry, "20/09/2026\n- Weekend");
  assert.ok(!audit.expectedEntry.includes("http"));
  assert.ok(!audit.expectedEntry.includes("Universal"));
});

test("Auditor Service: starts, runs audit check, and reports status", async () => {
  const service = new OfflineRecordThreeTimesAuditorService();
  service.start();

  const status = service.getStatus();
  assert.strictEqual(status.running, true);
  assert.ok(status.activeCheckpoint !== undefined);
  assert.ok(Array.isArray(status.checkpoints));
  assert.strictEqual(status.checkpoints.length, 3);

  service.stop();
  assert.strictEqual(service.getStatus().running, false);
});
