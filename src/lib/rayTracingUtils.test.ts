import test from "node:test";
import assert from "node:assert";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState
} from "./rayTracingUtils.js";

test("calculateNormalizedCursor calculates center position as (0, 0)", () => {
  const rect = { left: 100, top: 100, width: 200, height: 200 };
  const result = calculateNormalizedCursor(200, 200, rect);
  assert.strictEqual(result.normX, 0);
  assert.strictEqual(result.normY, 0);
});

test("calculateNormalizedCursor clamps positions outside element bounds to [-1, 1]", () => {
  const rect = { left: 0, top: 0, width: 100, height: 100 };
  const farRightBottom = calculateNormalizedCursor(500, 500, rect);
  assert.strictEqual(farRightBottom.normX, 1);
  assert.strictEqual(farRightBottom.normY, 1);

  const farLeftTop = calculateNormalizedCursor(-100, -100, rect);
  assert.strictEqual(farLeftTop.normX, -1);
  assert.strictEqual(farLeftTop.normY, -1);
});

test("calculateNormalizedCursor handles zero width/height gracefully", () => {
  const rect = { left: 0, top: 0, width: 0, height: 0 };
  const result = calculateNormalizedCursor(50, 50, rect);
  assert.strictEqual(result.normX, 0);
  assert.strictEqual(result.normY, 0);
});

test("computeRayTracedLightState computes centered light state correctly", () => {
  const state = computeRayTracedLightState(0, 0, 4, 20);
  assert.strictEqual(state.lightX, 50);
  assert.strictEqual(state.lightY, 50);
  assert.strictEqual(state.tiltX, 0);
  assert.strictEqual(state.tiltY, 0);
  assert.strictEqual(state.shadowX, 0);
  assert.strictEqual(state.shadowY, 8);
});

test("computeRayTracedLightState computes directional shadow and light position for top-left cursor", () => {
  const state = computeRayTracedLightState(-1, -1, 4, 20);
  assert.strictEqual(state.lightX, 0);
  assert.strictEqual(state.lightY, 0);
  // Cursor top-left -> shadow projects bottom-right (+20, +28)
  assert.strictEqual(state.shadowX, 20);
  assert.strictEqual(state.shadowY, 28);
  // Tilt tilts top edge down (-normY * maxTilt = 4)
  assert.strictEqual(state.tiltX, 4);
  assert.strictEqual(state.tiltY, -4);
});

test("getDefaultLightState returns expected resting state", () => {
  const defaultState = getDefaultLightState();
  assert.strictEqual(defaultState.lightX, 50);
  assert.strictEqual(defaultState.lightY, 50);
  assert.strictEqual(defaultState.angle, 45);
  assert.strictEqual(defaultState.shadowY, 12);
});
