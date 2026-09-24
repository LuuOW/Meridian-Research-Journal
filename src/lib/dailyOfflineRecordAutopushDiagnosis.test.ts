import { test } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import {
  formatARTDate,
  isWeekendInART,
  generateOfflineRecordEntry,
  appendOfflineRecordContent,
  getLatestArticleTitle,
  executeOfflineRecordPushToGitHub,
  calculateMsUntilNext5AmART,
  offlineRecordScheduler,
  OFFLINE_RECORD_FILE_PATH,
  ART_TIMEZONE
} from "./offlineBlogRecord.js";
import { isArticleBlocked } from "./arxivBlocklist.js";
import { getGitHubSyncConfig } from "./githubSync.js";

test("Daily Offline Record Diagnosis 1: Weekend Rule - Pushes ONLY date and '- Weekend', never article title", () => {
  // Sunday Sep 13, 2026
  const sunday = new Date("2026-09-13T12:00:00Z");
  assert.strictEqual(isWeekendInART(sunday), true, "2026-09-13 must be identified as weekend in ART");

  const sundayEntry = generateOfflineRecordEntry({ date: sunday, forceWeekend: true });
  const sundayLines = sundayEntry.trim().split("\n");

  assert.strictEqual(sundayLines.length, 2, "Weekend entry must have exactly 2 lines (date and status)");
  assert.strictEqual(sundayLines[0].trim(), "13/09/2026", "Line 1 must be date in DD/MM/YYYY format");
  assert.strictEqual(sundayLines[1].trim(), "- Weekend", "Line 2 must be '- Weekend'");
  assert.ok(!sundayEntry.includes("http"), "Weekend entry must not contain URLs");
  assert.ok(!sundayEntry.includes("Unified"), "Weekend entry must not contain article titles");

  // Saturday Sep 12, 2026
  const saturday = new Date("2026-09-12T12:00:00Z");
  assert.strictEqual(isWeekendInART(saturday), true, "2026-09-12 must be identified as weekend in ART");

  const saturdayEntry = generateOfflineRecordEntry({ date: saturday, forceWeekend: true });
  const saturdayLines = saturdayEntry.trim().split("\n");
  assert.strictEqual(saturdayLines[0].trim(), "12/09/2026");
  assert.strictEqual(saturdayLines[1].trim(), "- Weekend");
});

test("Daily Offline Record Diagnosis 2: Weekday Rule - Pushes date + article title, never '- Weekend'", () => {
  // Friday Sep 18, 2026 (Today)
  const friday = new Date("2026-09-18T12:00:00Z");
  assert.strictEqual(isWeekendInART(friday), false, "2026-09-18 is Friday (weekday) in ART");

  const fridayEntry = generateOfflineRecordEntry({
    date: friday,
    articleTitle: "Topological Soliton Frequency Combs in Anisotropic High-Q Microresonators"
  });

  const fridayLines = fridayEntry.trim().split("\n");
  assert.strictEqual(fridayLines.length, 2, "Weekday entry must have exactly 2 lines: date and title");
  assert.strictEqual(fridayLines[0].trim(), "18/09/2026");
  assert.strictEqual(fridayLines[1].trim(), "Topological Soliton Frequency Combs in Anisotropic High-Q Microresonators");
  assert.ok(!fridayEntry.includes("- Weekend"), "Weekday entry must NEVER contain '- Weekend'");
  assert.ok(!fridayEntry.includes("-weekend"), "Weekday entry must NEVER contain '-weekend'");

  // Thursday Sep 17, 2026 (Yesterday)
  const thursday = new Date("2026-09-17T12:00:00Z");
  assert.strictEqual(isWeekendInART(thursday), false, "2026-09-17 is Thursday (weekday) in ART");

  const thursdayEntry = generateOfflineRecordEntry({
    date: thursday,
    articleTitle: "Universal Non-Abelian Holonomic Quantum Computation via Topologically Protected Squeezed Optical States"
  });
  const thursdayLines = thursdayEntry.trim().split("\n");
  assert.strictEqual(thursdayLines[0].trim(), "17/09/2026");
  assert.strictEqual(thursdayLines[1].trim(), "Universal Non-Abelian Holonomic Quantum Computation via Topologically Protected Squeezed Optical States");
  assert.ok(!thursdayEntry.includes("- Weekend"));
});

test("Daily Offline Record Diagnosis 3: Why today hasn't autopushed - GITHUB_TOKEN environment check", () => {
  const config = getGitHubSyncConfig();
  
  // Diagnostic analysis:
  // If GITHUB_TOKEN is not configured in the host environment:
  // executeOfflineRecordPushToGitHub updates the local file on disk,
  // but skips remote HTTP POST/PUT to api.github.com to prevent 401 Bad Credentials.
  if (!config.configured) {
    assert.strictEqual(config.token, "", "Token is empty when unconfigured");
    assert.strictEqual(config.configured, false, "GitHub sync should flag configured as false");
  } else {
    assert.ok(config.token.length > 0, "GitHub token is configured");
  }

  // Verify that executeOfflineRecordPushToGitHub handles missing token gracefully
  const testResult = executeOfflineRecordPushToGitHub({
    date: new Date("2026-09-18T12:00:00Z"),
    customTitle: "Topological Soliton Frequency Combs in Anisotropic High-Q Microresonators",
    localOnly: true // simulate without network mutation
  });

  return testResult.then((res) => {
    assert.strictEqual(res.success, true, "Local update should succeed even if remote push is unconfigured");
    assert.strictEqual(res.date, "18/09/2026");
    assert.strictEqual(res.isWeekend, false);
  });
});

test("Daily Offline Record Diagnosis 4: Why today hasn't autopushed - Idempotency & Duplicate Guard", () => {
  // If 18/09/2026 is ALREADY recorded in offline_blog_record with the same title,
  // appendOfflineRecordContent correctly skips duplicate insertion (appended: false).
  const existingRecord = `edit

17/09/2026
Universal Non-Abelian Holonomic Quantum Computation via Topologically Protected Squeezed Optical States

18/09/2026
Topological Soliton Frequency Combs in Anisotropic High-Q Microresonators
`;

  const newEntryToday = `18/09/2026\nTopological Soliton Frequency Combs in Anisotropic High-Q Microresonators`;
  const result = appendOfflineRecordContent(existingRecord, newEntryToday, true);

  assert.strictEqual(
    result.appended,
    false,
    "When today's date and exact title are already present in record, autopush is a no-op to prevent duplicate commits"
  );
  assert.strictEqual(result.content, existingRecord, "Content should remain identical when duplicate is detected");

  // However, if the title was an old placeholder or incorrect, it MUST update in-place:
  const staleRecord = `edit

18/09/2026
Recovering topological information of light by topological learning
`;
  const updateResult = appendOfflineRecordContent(staleRecord, newEntryToday, true);
  assert.strictEqual(updateResult.appended, true, "Must update title in-place if title changed for the same date");
  assert.ok(updateResult.content.includes("Topological Soliton Frequency Combs"));
  assert.ok(!updateResult.content.includes("Recovering topological information"));
});

test("Daily Offline Record Diagnosis 5: Timing schedule check - 5:00 AM ART (08:00 UTC) target", () => {
  const scheduleInfo = calculateMsUntilNext5AmART();
  
  assert.ok(scheduleInfo.ms > 0, "Milliseconds until next run must be positive");
  assert.strictEqual(scheduleInfo.targetDateUTC.getUTCHours(), 8, "Target UTC hour must be exactly 08:00 UTC (5 AM ART)");
  assert.strictEqual(scheduleInfo.targetDateUTC.getUTCMinutes(), 0, "Target UTC minutes must be 0");
  assert.strictEqual(scheduleInfo.targetDateUTC.getUTCSeconds(), 0, "Target UTC seconds must be 0");
  assert.ok(
    scheduleInfo.targetDateARTString.includes("05:00:00") || scheduleInfo.targetDateARTString.includes("5:00:00"),
    "Must display 05:00:00 ART"
  );
});

test("Daily Offline Record Diagnosis 6: Blocklist enforcement prevents blocked papers from entering offline_blog_record", () => {
  // Test that blocked papers (e.g. math.DS 2608.11111 or stale 2609.06542) are rejected by title resolution
  const mathDsPaper = {
    id: "blog-1789613391006-pwjbf",
    title: "Generic Spectral Determination of Semiclassical Schrödinger Operators with ℤ2-Symmetry",
    arxivLink: "https://arxiv.org/abs/2608.11111",
    slug: "generic-spectral-determination-of-semiclassical-schr-dinger-"
  };

  const staleOpticsPaper = {
    id: "blog-2609-06542v1-5582",
    title: "Recovering topological information of light by topological learning",
    arxivLink: "https://arxiv.org/abs/2609.06542",
    slug: "2609-06542v1-5582"
  };

  assert.strictEqual(isArticleBlocked(mathDsPaper), true, "math.DS paper must be permanently blocked");
  assert.strictEqual(isArticleBlocked(staleOpticsPaper), true, "Stale optics paper must be permanently blocked");

  const latestTitle = getLatestArticleTitle();
  assert.ok(
    !latestTitle.includes("Generic Spectral Determination"),
    "Latest title must NEVER resolve to the blocked math.DS paper"
  );
  assert.ok(
    !latestTitle.includes("Recovering topological information"),
    "Latest title must NEVER resolve to the stale Sept 6 paper"
  );
  assert.ok(
    latestTitle === "Strong coupling of a reconfigurable ${}^{171}$Yb atom array to a tunable telecom-band nanofiber cavity" ||
    latestTitle === "Fluctuation-Driven Nonlinear Amplification of Quantum Statistics" ||
    latestTitle === "Dynamic Chirality in Photonic Time Crystals" ||
    latestTitle === "Square-Root Higher-Order Exceptional Points with Symmetry-Induced Multiple Spectral Responses" ||
    latestTitle === "Subwavelength exceptional points in dispersive resonator arrays" ||
    latestTitle === "Topological Argument for Robustness of Coherent States in Quantum Optics",
    `Latest title must resolve to a valid unblocked paper, got: ${latestTitle}`
  );
});

test("Daily Offline Record Diagnosis 7: Current repository offline_blog_record content integrity", () => {
  const filePath = path.join(process.cwd(), OFFLINE_RECORD_FILE_PATH);
  assert.ok(fs.existsSync(filePath), "offline_blog_record must exist in root");

  const content = fs.readFileSync(filePath, "utf-8");

  // Verify weekends format
  assert.ok(content.includes("13/09/2026\n- Weekend"), "Weekend 13/09/2026 must be logged as - Weekend");

  // Verify weekdays format
  assert.ok(
    content.includes("14/09/2026\nUnified light-matter metric of molecular and nanophotonic chirality"),
    "Monday 14/09 must have article title"
  );
  assert.ok(
    content.includes("15/09/2026\n$d+1$ Measurement Bases are Sufficient for Determining $d$-Dimensional Quantum States: Theory and Experiment"),
    "Tuesday 15/09 must have article title"
  );
  assert.ok(
    content.includes("16/09/2026\nCorrelation geometry and topology of structured optical beams"),
    "Wednesday 16/09 must have article title"
  );
  assert.ok(
    content.includes("17/09/2026\nUniversal Non-Abelian Holonomic Quantum Computation via Topologically Protected Squeezed Optical States"),
    "Thursday 17/09 must have article title"
  );
  assert.ok(
    content.includes("18/09/2026\nTopological Soliton Frequency Combs in Anisotropic High-Q Microresonators"),
    "Friday 18/09 must have article title"
  );

  // Quarantine checks
  assert.ok(!content.includes("2608.11111"), "Must not contain quarantined arXiv ID 2608.11111");
  assert.ok(!content.includes("Generic Spectral Determination"), "Must not contain blocked title");
  assert.ok(!content.includes("Recovering topological information"), "Must not contain stale Sept 6 title");
});
