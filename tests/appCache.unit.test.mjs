import assert from "node:assert/strict";
import test from "node:test";

import { APP_CACHE_KEYS, clearAppCache } from "../lib/storage/appCache.ts";

function createStorageStub() {
  const removedKeys = [];
  return {
    removedKeys,
    removeItem(key) {
      removedKeys.push(key);
    },
  };
}

test("clearAppCache removes only known local/session keys", () => {
  const originalWindow = globalThis.window;
  const localStorage = createStorageStub();
  const sessionStorage = createStorageStub();

  globalThis.window = {
    localStorage,
    sessionStorage,
  };

  const result = clearAppCache();

  assert.deepEqual(localStorage.removedKeys, [...APP_CACHE_KEYS.localStorage]);
  assert.deepEqual(
    sessionStorage.removedKeys,
    [...APP_CACHE_KEYS.sessionStorage],
  );
  assert.equal(result.localStorage.removed, APP_CACHE_KEYS.localStorage.length);
  assert.equal(
    result.sessionStorage.removed,
    APP_CACHE_KEYS.sessionStorage.length,
  );
  assert.equal(result.localStorage.failed, 0);
  assert.equal(result.sessionStorage.failed, 0);

  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

test("clearAppCache returns zero stats without window", () => {
  const originalWindow = globalThis.window;
  delete globalThis.window;

  const result = clearAppCache();
  assert.deepEqual(result, {
    localStorage: { removed: 0, failed: 0 },
    sessionStorage: { removed: 0, failed: 0 },
  });

  if (originalWindow !== undefined) {
    globalThis.window = originalWindow;
  }
});
