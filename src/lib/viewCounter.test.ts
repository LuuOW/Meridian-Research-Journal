import { test } from "node:test";
import assert from "node:assert";

function formatViews(views: number): string {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + "M";
  }
  if (views >= 10000) {
    return (views / 1000).toFixed(1) + "k";
  }
  return views.toLocaleString();
}

function calculateBaseViews(idOrSlug: string): number {
  if (!idOrSlug) return 100;
  let hash = 0;
  for (let i = 0; i < idOrSlug.length; i++) {
    hash = (hash << 5) - hash + idOrSlug.charCodeAt(i);
    hash |= 0;
  }
  return 320 + (Math.abs(hash) % 1530);
}

function calculateActiveReaders(idOrSlug: string, views: number): number {
  let hash = 0;
  for (let i = 0; i < idOrSlug.length; i++) {
    hash = (hash << 5) - hash + idOrSlug.charCodeAt(i);
    hash |= 0;
  }
  return 2 + (Math.abs(hash + views) % 17);
}

test("formatViews formats raw view numbers into clean discrete strings", () => {
  assert.strictEqual(formatViews(450), "450");
  assert.strictEqual(formatViews(1284), "1,284");
  assert.strictEqual(formatViews(15400), "15.4k");
  assert.strictEqual(formatViews(2500000), "2.5M");
});

test("calculateBaseViews produces consistent non-zero base count for article IDs", () => {
  const views1 = calculateBaseViews("quantum-split-step-fourier");
  const views2 = calculateBaseViews("quantum-split-step-fourier");
  assert.strictEqual(views1, views2);
  assert.ok(views1 >= 320 && views1 <= 1850, "Base views should fall within expected range");
});

test("calculateActiveReaders returns realistic active reader count", () => {
  const readers = calculateActiveReaders("quantum-split-step-fourier", 1250);
  assert.ok(readers >= 2 && readers <= 18, "Active readers count should be between 2 and 18");
});
