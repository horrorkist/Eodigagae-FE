import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWalkDebugExportPayload,
  clearWalkDebugHistory,
  finishWalkDebugSession,
  getWalkDebugHistory,
  getWalkDebugRouteSnapshot,
  getWalkDebugSession,
  setWalkDebugRouteSnapshot,
  startWalkDebugSession,
  walkDebug,
} from "../lib/walkDebug.ts";

function createStorageStub(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    dump() {
      return Object.fromEntries(store.entries());
    },
  };
}

function installWindow({
  localStorageValues = {},
  sessionStorageValues = {},
} = {}) {
  const originalWindow = globalThis.window;
  const localStorage = createStorageStub(localStorageValues);
  const sessionStorage = createStorageStub(sessionStorageValues);

  globalThis.window = {
    localStorage,
    sessionStorage,
    location: { search: "" },
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };

  return {
    localStorage,
    sessionStorage,
    restore() {
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }
    },
  };
}

function resetWalkDebugGlobals() {
  if (globalThis.window) {
    delete globalThis.window.__walkDebugHistory;
    delete globalThis.window.__walkDebugSession;
  }
}

test("walkDebug does not record entries while debug is disabled", () => {
  const sandbox = installWindow({
    localStorageValues: { walkDebug: "0" },
  });

  resetWalkDebugGlobals();
  clearWalkDebugHistory();
  startWalkDebugSession({
    startedAt: "2026-04-26T10:00:00.000Z",
    routeExperienceSource: "dog-recommend",
  });
  walkDebug("walk:session:start", { foo: "bar" });

  assert.deepEqual(getWalkDebugHistory(), []);
  assert.equal(getWalkDebugSession(), null);

  sandbox.restore();
});

test("walkDebug persists active session logs into sessionStorage", () => {
  const sandbox = installWindow({
    localStorageValues: { walkDebug: "1" },
  });

  resetWalkDebugGlobals();
  clearWalkDebugHistory();
  const session = startWalkDebugSession({
    startedAt: "2026-04-26T10:00:00.000Z",
    routeExperienceSource: "dog-recommend",
  });
  setWalkDebugRouteSnapshot({
    path: [
      [127, 37.5],
      [127.001, 37.501],
    ],
    summary: {
      distance: 1200,
      duration: 900000,
    },
  });
  walkDebug("walk:session:start", { distanceM: 0 });
  walkDebug("walk:location:accepted", { distanceAddedM: 12 });
  finishWalkDebugSession({
    endedAt: "2026-04-26T10:30:00.000Z",
    routeExperienceSource: "dog-recommend",
  });

  const history = getWalkDebugHistory();
  const stored = sandbox.sessionStorage.dump().walkDebugSession;
  assert.ok(session);
  assert.equal(history.length, 2);
  assert.ok(stored);

  const parsed = JSON.parse(stored);
  assert.equal(parsed.session.routeExperienceSource, "dog-recommend");
  assert.equal(parsed.session.endedAt, "2026-04-26T10:30:00.000Z");
  assert.equal(parsed.route.path.length, 2);
  assert.equal(parsed.logs.length, 2);
  assert.equal(getWalkDebugRouteSnapshot()?.summary?.distance, 1200);

  sandbox.restore();
});

test("buildWalkDebugExportPayload restores logs from sessionStorage", () => {
  const sandbox = installWindow({
    localStorageValues: { walkDebug: "1" },
    sessionStorageValues: {
      walkDebugSession: JSON.stringify({
        session: {
          sessionId: "session-1",
          startedAt: "2026-04-26T10:00:00.000Z",
          endedAt: "2026-04-26T10:05:00.000Z",
          routeExperienceSource: "poi-route",
        },
        route: {
          path: [
            [127, 37.5],
            [127.002, 37.501],
          ],
          summary: {
            distance: 1800,
          },
        },
        logs: [
          {
            at: 1,
            event: "route:request:start",
            payload: { foo: "bar" },
          },
        ],
      }),
    },
  });

  resetWalkDebugGlobals();
  const payload = buildWalkDebugExportPayload();

  assert.equal(payload.session?.sessionId, "session-1");
  assert.equal(payload.session?.routeExperienceSource, "poi-route");
  assert.equal(payload.route?.summary?.distance, 1800);
  assert.equal(payload.logs.length, 1);
  assert.equal(payload.logs[0].event, "route:request:start");

  clearWalkDebugHistory();
  assert.equal(sandbox.sessionStorage.dump().walkDebugSession, undefined);

  sandbox.restore();
});
