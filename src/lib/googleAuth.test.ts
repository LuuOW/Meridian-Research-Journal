import { test } from "node:test";
import assert from "node:assert";
import { handleFirestoreError, OperationType } from "./googleAuth";

test("handleFirestoreError correctly structures error message and throws", () => {
  const errorObj = new Error("Permission denied or document missing");
  const path = "blogs/generated-123456";

  let threw = false;
  try {
    handleFirestoreError(errorObj, OperationType.CREATE, path);
  } catch (err: any) {
    threw = true;
    const parsed = JSON.parse(err.message);
    assert.strictEqual(parsed.error, "Permission denied or document missing");
    assert.strictEqual(parsed.operationType, "create");
    assert.strictEqual(parsed.path, path);
    assert.ok("authInfo" in parsed, "Error details must include authInfo object");
  }

  assert.strictEqual(threw, true, "handleFirestoreError should have thrown an Error");
});

test("handleFirestoreError handles string errors", () => {
  const errorStr = "Temporary Firestore network failure";
  const path = null;

  let threw = false;
  try {
    handleFirestoreError(errorStr, OperationType.LIST, path);
  } catch (err: any) {
    threw = true;
    const parsed = JSON.parse(err.message);
    assert.strictEqual(parsed.error, errorStr);
    assert.strictEqual(parsed.operationType, "list");
    assert.strictEqual(parsed.path, null);
  }

  assert.strictEqual(threw, true, "handleFirestoreError should have thrown an Error");
});
