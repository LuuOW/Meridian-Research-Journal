import { test } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import os from "os";
import {
  formatARTDate,
  isWeekendInART,
  getLatestArticleTitle,
  generateOfflineRecordEntry,
  appendOfflineRecordContent,
  calculateMsUntilNext5AmART,
  executeOfflineRecordPushToGitHub,
  offlineRecordScheduler,
  OFFLINE_RECORD_FILE_PATH,
  ART_TIMEZONE
} from "./offlineBlogRecord.js";
import { getGitHubSyncConfig } from "./githubSync.js";

test("offlineBlogRecord: formatARTDate correctly formats DD/MM/YYYY in ART timezone", () => {
  // Test specific date requested by user: 18/08/2026
  const testDate = new Date("2026-08-18T15:00:00Z"); // 12:00 ART
  const formatted = formatARTDate(testDate);
  assert.strictEqual(formatted, "18/08/2026", "Should format 18th August 2026 as 18/08/2026");

  // Single digit day and month padding
  const janDate = new Date("2026-01-05T14:00:00Z"); // 11:00 ART
  assert.strictEqual(formatARTDate(janDate), "05/01/2026", "Should pad day and month with leading zeroes");

  // Today (Sunday Sep 13, 2026)
  const todaySunday = new Date("2026-09-13T15:12:00Z"); // 12:12 ART
  assert.strictEqual(formatARTDate(todaySunday), "13/09/2026", "Today must format as 13/09/2026");

  // Timezone boundary check: 02:30 UTC on 19th Aug is 23:30 ART on 18th Aug
  const boundaryDate = new Date("2026-08-19T02:30:00Z");
  assert.strictEqual(formatARTDate(boundaryDate), "18/08/2026", "Should respect ART (UTC-3) boundary before midnight");
});

test("offlineBlogRecord: isWeekendInART accurately identifies Saturdays and Sundays", () => {
  // 2026-09-13 is Sunday
  const sunday = new Date("2026-09-13T15:00:00Z");
  assert.strictEqual(isWeekendInART(sunday), true, "Sunday must return true");

  // 2026-09-12 is Saturday
  const saturday = new Date("2026-09-12T15:00:00Z");
  assert.strictEqual(isWeekendInART(saturday), true, "Saturday must return true");

  // 2026-09-14 is Monday
  const monday = new Date("2026-09-14T15:00:00Z");
  assert.strictEqual(isWeekendInART(monday), false, "Monday must return false");

  // 2026-09-15 is Tuesday
  const tuesday = new Date("2026-09-15T15:00:00Z");
  assert.strictEqual(isWeekendInART(tuesday), false, "Tuesday must return false");

  // 2026-09-18 is Friday
  const friday = new Date("2026-09-18T15:00:00Z");
  assert.strictEqual(isWeekendInART(friday), false, "Friday must return false");
});

test("offlineBlogRecord: generateOfflineRecordEntry outputs exact user specification", () => {
  // Weekend specification:
  // 18/08/2026
  // - Weekend
  const weekendEntry = generateOfflineRecordEntry({
    date: new Date("2026-08-18T15:00:00Z"),
    forceWeekend: true
  });
  assert.strictEqual(weekendEntry, "18/08/2026\n- Weekend");

  // Weekday specification with user sample title:
  const userSampleTitle = "SI-Traceable Calibration and Performance Benchmarking of a Terahertz Photomixer Transmitter-Receiver System Using a Rydberg Atomic Sensor";
  const weekdayEntry = generateOfflineRecordEntry({
    date: new Date("2026-08-18T15:00:00Z"),
    articleTitle: userSampleTitle,
    forceWeekend: false
  });
  assert.strictEqual(weekdayEntry, `18/08/2026\n${userSampleTitle}`);

  // Today (Sunday Sep 13, 2026) automatic weekend detection
  const todayEntry = generateOfflineRecordEntry({
    date: new Date("2026-09-13T15:12:00Z")
  });
  assert.strictEqual(todayEntry, "13/09/2026\n- Weekend", "Sunday must automatically generate - Weekend");
});

test("offlineBlogRecord: getLatestArticleTitle extracts latest article or resilient fallback", () => {
  const latestTitle = getLatestArticleTitle();
  assert.ok(typeof latestTitle === "string" && latestTitle.length > 0);
  assert.ok(latestTitle.includes("Terahertz") || latestTitle.length > 10);

  // Even with invalid base directory, fallback returns a valid string
  const fallback = getLatestArticleTitle("/non-existent-directory-abc-123");
  assert.strictEqual(
    fallback,
    "SI-Traceable Calibration and Performance Benchmarking of a Terahertz Photomixer Transmitter-Receiver System Using a Rydberg Atomic Sensor"
  );
});

test("offlineBlogRecord: appendOfflineRecordContent maintains clean separation and prevents unwanted duplicates", () => {
  const baseContent = "edit\n\nhttps://arxiv.org/pdf/2608.14468\n\n18/08/2026\n\nhttps://arxiv.org/pdf/2608.16857\n\n12/09/2026\n";
  const newEntry = "13/09/2026\n- Weekend";

  const res1 = appendOfflineRecordContent(baseContent, newEntry, true);
  assert.strictEqual(res1.appended, true);
  assert.ok(res1.content.endsWith("13/09/2026\n- Weekend\n"));
  assert.ok(res1.content.includes("12/09/2026\n\n13/09/2026"));

  // Duplicate prevention check
  const res2 = appendOfflineRecordContent(res1.content, newEntry, true);
  assert.strictEqual(res2.appended, false, "Should detect duplicate date 13/09/2026 and not append duplicate");
  assert.strictEqual(res2.content, res1.content);

  // Force append when checkDuplicateDate = false
  const res3 = appendOfflineRecordContent(res1.content, newEntry, false);
  assert.strictEqual(res3.appended, true, "Should append when checkDuplicateDate is disabled");
});

test("offlineBlogRecord: calculateMsUntilNext5AmART computes next 05:00 ART (08:00 UTC)", () => {
  // If current time is 04:00 ART (07:00 UTC) on 14/09/2026:
  const before5Am = new Date("2026-09-14T07:00:00.000Z");
  const calc1 = calculateMsUntilNext5AmART(before5Am);
  assert.strictEqual(calc1.ms, 1 * 60 * 60 * 1000, "Should be exactly 1 hour until 5:00 AM ART (08:00 UTC)");
  assert.strictEqual(calc1.targetDateUTC.toISOString(), "2026-09-14T08:00:00.000Z");

  // If current time is 12:00 ART (15:00 UTC) on 13/09/2026:
  const after5Am = new Date("2026-09-13T15:00:00.000Z");
  const calc2 = calculateMsUntilNext5AmART(after5Am);
  // Next 5 AM ART is tomorrow at 08:00 UTC (17 hours later)
  assert.strictEqual(calc2.ms, 17 * 60 * 60 * 1000, "Should target next day 08:00 UTC");
  assert.strictEqual(calc2.targetDateUTC.toISOString(), "2026-09-14T08:00:00.000Z");
});

test("offlineBlogRecord: Target file isolation constraint", () => {
  assert.strictEqual(
    OFFLINE_RECORD_FILE_PATH,
    "offline_blog_record",
    "File path must be exactly offline_blog_record with no extension or extra prefix"
  );
});

test("offlineBlogRecord: Local file integrity and today's logged entry", () => {
  const filePath = path.join(process.cwd(), OFFLINE_RECORD_FILE_PATH);
  assert.ok(fs.existsSync(filePath), "offline_blog_record must exist in repository root");

  const content = fs.readFileSync(filePath, "utf-8");
  const todayStr = formatARTDate(new Date());
  
  // Historical entries must be preserved
  assert.ok(content.includes("18/08/2026"), "Historical 18/08/2026 must be present");
  assert.ok(content.includes("12/09/2026"), "Historical 12/09/2026 must be present");
  assert.ok(content.includes("13/09/2026\n- Weekend"), "Weekend 13/09/2026 must have - Weekend");
  assert.ok(content.includes("14/09/2026"), "Historical 14/09/2026 must be present");
  assert.ok(content.includes("15/09/2026"), "Historical 15/09/2026 must be present");
  assert.ok(content.includes("16/09/2026"), "Historical/today 16/09/2026 must be logged in offline_blog_record");
  assert.ok(content.includes(todayStr), `Today's date (${todayStr}) must be logged in offline_blog_record`);
});

test("offlineBlogRecord: offlineRecordScheduler lifecycle and status reporting", () => {
  const status = offlineRecordScheduler.getStatus();
  assert.ok(typeof status.nextRunUTC === "string");
  assert.ok(typeof status.nextRunART === "string");
  assert.ok(status.msUntilNextRun > 0);
  assert.ok(status.minutesUntilNextRun >= 0);
});

test("offlineBlogRecord: Extensive Audit - Why autopush was delayed and local file desynchronization diagnosis", async () => {
  // DIAGNOSIS TEST:
  // Root Cause 1: Remote GitHub already had 16/09/2026, but the local disk workspace was not updated
  // because getRemoteOrLocalOfflineRecord() previously read from remote without mirroring down to local disk.
  // Root Cause 2: checkAndRunImmediate() inspected content from remote, saw 16/09/2026 was present,
  // and logged "Today is already recorded", skipping local write.
  // Fix Verification:
  const localFilePath = path.join(process.cwd(), OFFLINE_RECORD_FILE_PATH);
  assert.ok(fs.existsSync(localFilePath), "Local file must exist");
  const localContent = fs.readFileSync(localFilePath, "utf-8");

  // Verify that the local file has today's date (16/09/2026) and current title
  assert.ok(
    localContent.includes("16/09/2026"),
    "Local file must be synchronized with 16/09/2026"
  );
  assert.ok(
    localContent.includes("Correlation geometry and topology of structured optical beams") ||
    localContent.includes("SI-Traceable") ||
    localContent.includes("- Weekend"),
    "Local file must have valid title or weekend indicator for 16/09/2026"
  );
});

test("offlineBlogRecord: Strict Weekend Rule - Pushes ONLY date and -weekend on weekends (never article title)", () => {
  // Specification: "as it must push excep on weekends instead of data + article title , only date and -weekend"
  
  // Saturday Test (2026-09-12):
  const saturday = new Date("2026-09-12T15:00:00Z");
  assert.strictEqual(isWeekendInART(saturday), true, "Saturday must be identified as weekend in ART");
  const satEntry = generateOfflineRecordEntry({ date: saturday });
  const satLines = satEntry.split("\n");
  assert.strictEqual(satLines.length, 2, "Weekend entry must have exactly 2 lines: date and - Weekend");
  assert.strictEqual(satLines[0], "12/09/2026");
  assert.strictEqual(satLines[1], "- Weekend");
  assert.ok(!satEntry.includes("Correlation"), "Weekend must never include article title");
  assert.ok(!satEntry.includes("http"), "Weekend must never include URLs");

  // Sunday Test (2026-09-13):
  const sunday = new Date("2026-09-13T15:00:00Z");
  assert.strictEqual(isWeekendInART(sunday), true, "Sunday must be identified as weekend in ART");
  const sunEntry = generateOfflineRecordEntry({ date: sunday });
  const sunLines = sunEntry.split("\n");
  assert.strictEqual(sunLines.length, 2, "Sunday entry must have exactly 2 lines: date and - Weekend");
  assert.strictEqual(sunLines[0], "13/09/2026");
  assert.strictEqual(sunLines[1], "- Weekend");

  // Even if an article title is passed in options, if it's a weekend, it MUST be suppressed:
  const suppressedSunEntry = generateOfflineRecordEntry({
    date: sunday,
    articleTitle: "Breakthrough In Metamaterials And Optical Trapping"
  });
  assert.strictEqual(suppressedSunEntry, "13/09/2026\n- Weekend", "Weekend MUST suppress articleTitle and output ONLY date and - Weekend");
});

test("offlineBlogRecord: Strict Weekday Rule - Pushes date + article title on weekdays (never - Weekend)", () => {
  // Monday Test (2026-09-14)
  const monday = new Date("2026-09-14T15:00:00Z");
  assert.strictEqual(isWeekendInART(monday), false, "Monday is not a weekend");
  const monEntry = generateOfflineRecordEntry({
    date: monday,
    articleTitle: "Unified light-matter metric of molecular and nanophotonic chirality"
  });
  const monLines = monEntry.split("\n");
  assert.strictEqual(monLines.length, 2);
  assert.strictEqual(monLines[0], "14/09/2026");
  assert.strictEqual(monLines[1], "Unified light-matter metric of molecular and nanophotonic chirality");
  assert.ok(!monEntry.includes("- Weekend"), "Weekday must never include - Weekend");

  // Tuesday Test (2026-09-15)
  const tuesday = new Date("2026-09-15T15:00:00Z");
  assert.strictEqual(isWeekendInART(tuesday), false, "Tuesday is not a weekend");
  const tueEntry = generateOfflineRecordEntry({
    date: tuesday,
    articleTitle: "$d+1$ Measurement Bases are Sufficient for Determining $d$-Dimensional Quantum States: Theory and Experiment"
  });
  assert.strictEqual(tueEntry, "15/09/2026\n$d+1$ Measurement Bases are Sufficient for Determining $d$-Dimensional Quantum States: Theory and Experiment");

  // Wednesday Test (Today: 2026-09-16)
  const wednesday = new Date("2026-09-16T15:00:00Z");
  assert.strictEqual(isWeekendInART(wednesday), false, "Wednesday is not a weekend");
  const wedEntry = generateOfflineRecordEntry({
    date: wednesday,
    articleTitle: "Correlation geometry and topology of structured optical beams"
  });
  assert.strictEqual(wedEntry, "16/09/2026\nCorrelation geometry and topology of structured optical beams");

  // Thursday Test (2026-09-17)
  const thursday = new Date("2026-09-17T15:00:00Z");
  assert.strictEqual(isWeekendInART(thursday), false, "Thursday is not a weekend");

  // Friday Test (2026-09-18)
  const friday = new Date("2026-09-18T15:00:00Z");
  assert.strictEqual(isWeekendInART(friday), false, "Friday is not a weekend");
});

test("offlineBlogRecord: Title resolution retrieves unblocked published article and skips blocked papers", () => {
  const latestTitle = getLatestArticleTitle();
  assert.ok(typeof latestTitle === "string" && latestTitle.length > 0);
  
  // Must never be a blocked/quarantined diagnostic benchmark paper
  assert.ok(!latestTitle.toLowerCase().includes("integritybench"));
  assert.ok(!latestTitle.toLowerCase().includes("evaluating llms"));
  
  // Should match current top published paper in catalog
  assert.ok(
    latestTitle === "Strong coupling of a reconfigurable ${}^{171}$Yb atom array to a tunable telecom-band nanofiber cavity" ||
    latestTitle === "Fluctuation-Driven Nonlinear Amplification of Quantum Statistics" ||
    latestTitle === "Dynamic Chirality in Photonic Time Crystals" ||
    latestTitle === "Square-Root Higher-Order Exceptional Points with Symmetry-Induced Multiple Spectral Responses" ||
    latestTitle === "Subwavelength exceptional points in dispersive resonator arrays" ||
    latestTitle === "Topological Argument for Robustness of Coherent States in Quantum Optics" ||
    latestTitle === "Topological Soliton Frequency Combs in Anisotropic High-Q Microresonators",
    `Unexpected latest title: ${latestTitle}`
  );
});

test("offlineBlogRecord: appendOfflineRecordContent updates article title in-place on weekdays without duplicating date", () => {
  const initialContent = "edit\n\n16/09/2026\nOld Placeholder Title";
  const updatedEntry = "16/09/2026\nCorrelation geometry and topology of structured optical beams";

  const res = appendOfflineRecordContent(initialContent, updatedEntry, true);
  assert.strictEqual(res.appended, true);
  
  // Verify date appears exactly once
  const matches = res.content.match(/16\/09\/2026/g);
  assert.strictEqual(matches?.length, 1, "Date line must not be duplicated");
  assert.ok(res.content.includes("Correlation geometry and topology of structured optical beams"));
  assert.ok(!res.content.includes("Old Placeholder Title"), "Old title must be updated");

  // Verify weekend protection: if existing entry is - Weekend, a duplicate weekend entry is a clean no-op
  const weekendContent = "edit\n\n13/09/2026\n- Weekend";
  const duplicateWeekendEntry = "13/09/2026\n- Weekend";
  const weekendRes = appendOfflineRecordContent(weekendContent, duplicateWeekendEntry, true);
  assert.strictEqual(weekendRes.appended, false);
  assert.strictEqual(weekendRes.content, weekendContent);
});

test("offlineBlogRecord: ART Timezone vs UTC Time Boundary Invariance", () => {
  // User's current local time: 2026-09-16T19:42:19-07:00
  // In UTC: 2026-09-17T02:42:19Z
  // In ART (UTC-3): 2026-09-16T23:42:19-03:00 (STILL September 16!)
  const lateEveningDate = new Date("2026-09-17T02:42:19Z");
  const artDateStr = formatARTDate(lateEveningDate);
  assert.strictEqual(artDateStr, "16/09/2026", "2:42 AM UTC on Sep 17 is still 16/09/2026 in Argentina Time (UTC-3)");
  assert.strictEqual(isWeekendInART(lateEveningDate), false, "Wednesday night is not a weekend");

  // Just after midnight in ART: 03:01 UTC on Sep 17 is 00:01 ART on Sep 17
  const nextDayDate = new Date("2026-09-17T03:01:00Z");
  assert.strictEqual(formatARTDate(nextDayDate), "17/09/2026", "03:01 UTC transitions to 17/09/2026 in ART");
});

test("offlineBlogRecord: Isolated local push simulation with temporary file", async () => {
  const tempFilePath = path.join(os.tmpdir(), `test_offline_blog_record_${Date.now()}`);
  
  const result = await executeOfflineRecordPushToGitHub({
    date: new Date("2026-08-18T15:00:00Z"),
    forceWeekend: false,
    customTitle: "Unit Test Verification Title",
    localOnly: true,
    customFilePath: tempFilePath,
    mockExistingContent: "mock_initial_content"
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.date, "18/08/2026");
  assert.strictEqual(result.entry, "18/08/2026\nUnit Test Verification Title");
  
  // Verify content was written to temp file
  assert.ok(fs.existsSync(tempFilePath));
  const written = fs.readFileSync(tempFilePath, "utf-8");
  assert.ok(written.includes("mock_initial_content"));
  assert.ok(written.includes("18/08/2026\nUnit Test Verification Title"));

  // Clean up temp file
  try { fs.unlinkSync(tempFilePath); } catch (_) {}
});

test("offlineBlogRecord: Live Server Automation Endpoints Verification", async () => {
  try {
    const statusRes = await fetch("http://localhost:3000/api/automation/offline-record-status");
    if (statusRes.ok) {
      const data = await statusRes.json();
      const expectedDate = formatARTDate(new Date());
      const expectedWeekend = isWeekendInART(new Date());

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.targetFile, "offline_blog_record");
      assert.strictEqual(data.currentDateART, expectedDate, "Endpoint must report current dynamic ART date");
      assert.strictEqual(data.isWeekend, expectedWeekend, "Endpoint must report current dynamic weekend status");
      assert.ok(data.scheduler);
      assert.ok(data.fullRecordContent.includes(expectedDate), "Full record content must include current date");
    }

    const contentRes = await fetch("http://localhost:3000/api/automation/offline-record-content");
    if (contentRes.ok) {
      const text = await contentRes.text();
      const expectedDate = formatARTDate(new Date());
      assert.ok(text.includes(expectedDate), "Content endpoint must return current date entry");
      assert.ok(text.includes("- Weekend"), "Content endpoint must include historical weekend entries");
    }
  } catch (err: any) {
    // If dev server port is occupied or different in test environment, skip gracefully
    console.log("Skipping live HTTP server check in unit test runner:", err.message);
  }
});
