import test from "node:test";
import assert from "node:assert";
import { getArtTime, getSourceArxivBatch } from "../src/lib/dailyEditorialEngine";

test("getArtTime computes 4:00 AM ART and 5:30 AM ART schedules accurately", () => {
  // Monday October 5, 2026 at 03:59:00 ART (06:59:00 UTC) - Just before review window
  const beforeReview = new Date(Date.UTC(2026, 9, 5, 6, 59, 0));
  const artBefore = getArtTime(beforeReview);
  assert.strictEqual(artBefore.hour, 3);
  assert.strictEqual(artBefore.minute, 59);
  assert.strictEqual(artBefore.isReviewWindow, false);
  assert.strictEqual(artBefore.isPast530AmArt, false);

  // Monday October 5, 2026 at 04:00:00 ART (07:00:00 UTC) - Review window starts
  const atReview = new Date(Date.UTC(2026, 9, 5, 7, 0, 0));
  const artReview = getArtTime(atReview);
  assert.strictEqual(artReview.hour, 4);
  assert.strictEqual(artReview.minute, 0);
  assert.strictEqual(artReview.isReviewWindow, true);
  assert.strictEqual(artReview.isPast530AmArt, false);
  assert.strictEqual(artReview.scheduled4AmEpoch, Date.UTC(2026, 9, 5, 7, 0, 0));
  assert.strictEqual(artReview.autoPublish530AmEpoch, Date.UTC(2026, 9, 5, 8, 30, 0));

  // Monday October 5, 2026 at 05:15:00 ART (08:15:00 UTC) - In review window
  const inReview = new Date(Date.UTC(2026, 9, 5, 8, 15, 0));
  const artInReview = getArtTime(inReview);
  assert.strictEqual(artInReview.hour, 5);
  assert.strictEqual(artInReview.minute, 15);
  assert.strictEqual(artInReview.isReviewWindow, true);
  assert.strictEqual(artInReview.isPast530AmArt, false);

  // Monday October 5, 2026 at 05:30:00 ART (08:30:00 UTC) - Auto-publish timeout triggers
  const atAutoPublish = new Date(Date.UTC(2026, 9, 5, 8, 30, 0));
  const artAutoPublish = getArtTime(atAutoPublish);
  assert.strictEqual(artAutoPublish.hour, 5);
  assert.strictEqual(artAutoPublish.minute, 30);
  assert.strictEqual(artAutoPublish.isReviewWindow, false);
  assert.strictEqual(artAutoPublish.isPast530AmArt, true);

  // Monday October 5, 2026 at 09:00:00 ART (12:00:00 UTC) - Well past auto-publish
  const pastAutoPublish = new Date(Date.UTC(2026, 9, 5, 12, 0, 0));
  const artPast = getArtTime(pastAutoPublish);
  assert.strictEqual(artPast.hour, 9);
  assert.strictEqual(artPast.isReviewWindow, false);
  assert.strictEqual(artPast.isPast530AmArt, true);
});

test("Weekend Bridge schedules for Monday 4:00 AM and 5:30 AM ART", () => {
  // Saturday October 3, 2026 at 12:00:00 ART (15:00:00 UTC)
  const saturday = new Date(Date.UTC(2026, 9, 3, 15, 0, 0));
  const artSat = getArtTime(saturday);
  assert.strictEqual(artSat.isWeekend, true);
  assert.strictEqual(artSat.isReviewWindow, false);
  assert.strictEqual(artSat.targetDayName, "Monday");
  assert.strictEqual(artSat.targetPublishDate, "2026-10-05");
  assert.strictEqual(artSat.targetPublishEpoch4Am, Date.UTC(2026, 9, 5, 7, 0, 0));
  assert.strictEqual(artSat.targetPublishEpoch530Am, Date.UTC(2026, 9, 5, 8, 30, 0));

  // Sunday October 4, 2026 at 10:00:00 ART (13:00:00 UTC)
  const sunday = new Date(Date.UTC(2026, 9, 4, 13, 0, 0));
  const artSun = getArtTime(sunday);
  assert.strictEqual(artSun.isWeekend, true);
  assert.strictEqual(artSun.isReviewWindow, false);
  assert.strictEqual(artSun.targetDayName, "Monday");
  assert.strictEqual(artSun.targetPublishDate, "2026-10-05");
  assert.strictEqual(artSun.targetPublishEpoch4Am, Date.UTC(2026, 9, 5, 7, 0, 0));
  assert.strictEqual(artSun.targetPublishEpoch530Am, Date.UTC(2026, 9, 5, 8, 30, 0));
});

test("Source batch mapping supports Monday to Friday next-day publishing", () => {
  const batch1 = getSourceArxivBatch(1);
  assert.ok(batch1.sourceBatchName.includes("Monday"));
  const batch5 = getSourceArxivBatch(5);
  assert.ok(batch5.sourceBatchName.includes("Friday"));
});
