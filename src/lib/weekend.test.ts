import { test } from "node:test";
import assert from "node:assert";
import { isWeekend } from "./arxivUtils";
import { generateOfflineRecordEntry, isWeekendInART } from "./offlineBlogRecord";

test("isWeekend correctly identifies Saturdays and Sundays", () => {
  // Saturday, July 18, 2026
  const saturday = new Date("2026-07-18T12:00:00");
  assert.strictEqual(isWeekend(saturday), true, "Saturday should be classified as weekend");

  // Sunday, July 19, 2026
  const sunday = new Date("2026-07-19T12:00:00");
  assert.strictEqual(isWeekend(sunday), true, "Sunday should be classified as weekend");

  // Monday, July 20, 2026
  const monday = new Date("2026-07-20T12:00:00");
  assert.strictEqual(isWeekend(monday), false, "Monday should not be classified as weekend");

  // Wednesday, July 22, 2026
  const wednesday = new Date("2026-07-22T12:00:00");
  assert.strictEqual(isWeekend(wednesday), false, "Wednesday should not be classified as weekend");
});

test("offlineBlogRecord: Weekend entry must output strictly date and -weekend, never article title or data", () => {
  // Saturday, September 12, 2026
  const sat = new Date("2026-09-12T14:00:00Z");
  assert.strictEqual(isWeekendInART(sat), true);
  const satEntry = generateOfflineRecordEntry({ date: sat });
  assert.strictEqual(satEntry, "12/09/2026\n- Weekend");
  assert.ok(!satEntry.includes("http"), "Must not include URL");
  assert.ok(!satEntry.includes("pdf"), "Must not include PDF link");

  // Sunday, September 13, 2026
  const sun = new Date("2026-09-13T14:00:00Z");
  assert.strictEqual(isWeekendInART(sun), true);
  const sunEntry = generateOfflineRecordEntry({ date: sun });
  assert.strictEqual(sunEntry, "13/09/2026\n- Weekend");

  // Sunday with articleTitle provided: must still be suppressed
  const suppressed = generateOfflineRecordEntry({
    date: sun,
    articleTitle: "Quantum Teleportation of Continuous Variables"
  });
  assert.strictEqual(suppressed, "13/09/2026\n- Weekend");

  // Weekday (Wednesday, September 16, 2026): must output date + article title
  const wed = new Date("2026-09-16T14:00:00Z");
  assert.strictEqual(isWeekendInART(wed), false);
  const wedEntry = generateOfflineRecordEntry({
    date: wed,
    articleTitle: "Correlation geometry and topology of structured optical beams"
  });
  assert.strictEqual(wedEntry, "16/09/2026\nCorrelation geometry and topology of structured optical beams");
});
