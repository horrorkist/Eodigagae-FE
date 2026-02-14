"use client";

const WALK_DEBUG_QUERY_KEY = "walkDebug";
const WALK_DEBUG_STORAGE_KEY = "walkDebug";
const CARDINAL_JUMP_TOLERANCE_DEG = 12;
const WALK_DEBUG_UPDATED_EVENT = "walk-debug:updated";

type WalkDebugPayload = Record<string, unknown>;

export type WalkDebugEntry = {
  at: number;
  event: string;
  payload?: WalkDebugPayload;
};

declare global {
  interface Window {
    __walkDebugHistory?: WalkDebugEntry[];
  }
}

function getHistoryRef() {
  if (typeof window === "undefined") return null;
  return (window.__walkDebugHistory ??= []);
}

function dispatchWalkDebugUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WALK_DEBUG_UPDATED_EVENT));
}

function isDebugTruthy(value: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isWalkDebugEnabled() {
  if (typeof window === "undefined") return false;
  if (isDebugTruthy(process.env.NEXT_PUBLIC_WALK_DEBUG ?? null)) return true;

  const query = new URLSearchParams(window.location.search).get(
    WALK_DEBUG_QUERY_KEY,
  );
  if (isDebugTruthy(query)) return true;

  try {
    const fromStorage = window.localStorage.getItem(WALK_DEBUG_STORAGE_KEY);
    return isDebugTruthy(fromStorage);
  } catch {
    return false;
  }
}

export function classifyCardinalJump(deltaDeg: number | null) {
  if (deltaDeg == null || !Number.isFinite(deltaDeg)) return null;
  const absDelta = Math.abs(deltaDeg);

  if (Math.abs(absDelta - 180) <= CARDINAL_JUMP_TOLERANCE_DEG) {
    return "near_180";
  }
  if (Math.abs(absDelta - 90) <= CARDINAL_JUMP_TOLERANCE_DEG) {
    return "near_90";
  }

  return null;
}

export function getWalkDebugHistory() {
  const history = getHistoryRef();
  if (!history) return [] as WalkDebugEntry[];
  return history.slice();
}

export function clearWalkDebugHistory() {
  const history = getHistoryRef();
  if (!history) return;
  history.splice(0, history.length);
  dispatchWalkDebugUpdate();
}

export function setWalkDebugEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WALK_DEBUG_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore storage errors
  }
  dispatchWalkDebugUpdate();
}

export function subscribeWalkDebugUpdates(handler: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(WALK_DEBUG_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(WALK_DEBUG_UPDATED_EVENT, handler);
  };
}

export function downloadWalkDebugHistory() {
  if (typeof window === "undefined") return false;
  const history = getWalkDebugHistory();
  const payload = {
    exportedAt: new Date().toISOString(),
    count: history.length,
    logs: history,
  };

  const fileName = `walk-debug-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const href = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(href);
  return true;
}

export function walkDebug(event: string, payload?: WalkDebugPayload) {
  if (!isWalkDebugEnabled()) return;

  const entry: WalkDebugEntry = {
    at: Date.now(),
    event,
    payload,
  };
  const history = getHistoryRef();
  if (!history) return;
  history.push(entry);
  dispatchWalkDebugUpdate();
}
