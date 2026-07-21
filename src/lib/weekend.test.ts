import { test } from "node:test";
import assert from "node:assert";
import { isWeekend } from "./arxivUtils";

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
