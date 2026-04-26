"use client";

import type { RouteResult } from "../domain/route/types.ts";

const WALK_DEBUG_QUERY_KEY = "walkDebug";
const WALK_DEBUG_STORAGE_KEY = "walkDebug";
const WALK_DEBUG_PANEL_VISIBLE_STORAGE_KEY = "walkDebugPanelVisible";
const WALK_DEBUG_SESSION_STORAGE_KEY = "walkDebugSession";
const CARDINAL_JUMP_TOLERANCE_DEG = 12;
const WALK_DEBUG_UPDATED_EVENT = "walk-debug:updated";

type WalkDebugPayload = Record<string, unknown>;

export type WalkDebugEntry = {
  at: number;
  event: string;
  payload?: WalkDebugPayload;
};

export type WalkDebugSessionMeta = {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  routeExperienceSource: string | null;
  appVersion?: string;
};

type WalkDebugSessionRecord = {
  session: WalkDebugSessionMeta | null;
  route: RouteResult | null;
  logs: WalkDebugEntry[];
};

export type WalkDebugExportPayload = {
  exportedAt: string;
  session: WalkDebugSessionMeta | null;
  route: RouteResult | null;
  count: number;
  logs: WalkDebugEntry[];
};

declare global {
  interface Window {
    __walkDebugHistory?: WalkDebugEntry[];
    __walkDebugSession?: WalkDebugSessionMeta | null;
    __walkDebugRoute?: RouteResult | null;
  }
}

function getStorageWindow() {
  if (typeof window === "undefined") return null;
  return window;
}

function readSessionStorageRecord(): WalkDebugSessionRecord | null {
  const storageWindow = getStorageWindow();
  if (!storageWindow) return null;

  try {
    const raw = storageWindow.sessionStorage.getItem(WALK_DEBUG_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WalkDebugSessionRecord>;
    return {
      session: parsed.session ?? null,
      route:
        parsed.route && typeof parsed.route === "object"
          ? (parsed.route as RouteResult)
          : null,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return null;
  }
}

function writeSessionStorageRecord(record: WalkDebugSessionRecord | null) {
  const storageWindow = getStorageWindow();
  if (!storageWindow) return;

  try {
    if (
      !record ||
      (record.session == null && record.logs.length === 0)
    ) {
      storageWindow.sessionStorage.removeItem(WALK_DEBUG_SESSION_STORAGE_KEY);
      return;
    }

    storageWindow.sessionStorage.setItem(
      WALK_DEBUG_SESSION_STORAGE_KEY,
      JSON.stringify(record),
    );
  } catch {
    // ignore storage errors
  }
}

function hydrateWalkDebugState() {
  const storageWindow = getStorageWindow();
  if (!storageWindow) return null;
  if (storageWindow.__walkDebugHistory && storageWindow.__walkDebugSession !== undefined) {
    return {
      history: storageWindow.__walkDebugHistory,
      session: storageWindow.__walkDebugSession,
      route: storageWindow.__walkDebugRoute ?? null,
    };
  }

  const stored = readSessionStorageRecord();
  storageWindow.__walkDebugHistory = stored?.logs ?? [];
  storageWindow.__walkDebugSession = stored?.session ?? null;
  storageWindow.__walkDebugRoute = stored?.route ?? null;
  return {
    history: storageWindow.__walkDebugHistory,
    session: storageWindow.__walkDebugSession,
    route: storageWindow.__walkDebugRoute,
  };
}

function getHistoryRef() {
  const hydrated = hydrateWalkDebugState();
  return hydrated?.history ?? null;
}

function getSessionRef() {
  const hydrated = hydrateWalkDebugState();
  return hydrated?.session ?? null;
}

function setSessionRef(session: WalkDebugSessionMeta | null) {
  const storageWindow = getStorageWindow();
  if (!storageWindow) return;
  storageWindow.__walkDebugSession = session;
}

function getRouteRef() {
  const hydrated = hydrateWalkDebugState();
  return hydrated?.route ?? null;
}

function setRouteRef(route: RouteResult | null) {
  const storageWindow = getStorageWindow();
  if (!storageWindow) return;
  storageWindow.__walkDebugRoute = route;
}

function syncWalkDebugState() {
  writeSessionStorageRecord({
    session: getSessionRef(),
    route: getRouteRef(),
    logs: getWalkDebugHistory(),
  });
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

export function isWalkDebugPanelVisible() {
  if (typeof window === "undefined") return false;
  try {
    const fromStorage = window.localStorage.getItem(
      WALK_DEBUG_PANEL_VISIBLE_STORAGE_KEY,
    );
    if (fromStorage == null) return false;
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

export function getWalkDebugSession() {
  return getSessionRef();
}

export function getWalkDebugRouteSnapshot() {
  return getRouteRef();
}

export function hasWalkDebugLogs() {
  return getWalkDebugHistory().length > 0;
}

function buildSessionMeta(params?: {
  startedAt?: string;
  routeExperienceSource?: string | null;
}): WalkDebugSessionMeta {
  const startedAt = params?.startedAt ?? new Date().toISOString();
  const routeExperienceSource = params?.routeExperienceSource ?? null;
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || undefined;

  return {
    sessionId:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `walk-debug-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    startedAt,
    endedAt: null,
    routeExperienceSource,
    ...(appVersion ? { appVersion } : {}),
  };
}

function ensureSessionMeta() {
  const session = getSessionRef();
  if (session) return session;

  const nextSession = buildSessionMeta();
  setSessionRef(nextSession);
  syncWalkDebugState();
  return nextSession;
}

export function clearWalkDebugHistory() {
  const history = getHistoryRef();
  if (!history) return;
  history.splice(0, history.length);
  setSessionRef(null);
  setRouteRef(null);
  syncWalkDebugState();
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

export function setWalkDebugPanelVisible(visible: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      WALK_DEBUG_PANEL_VISIBLE_STORAGE_KEY,
      visible ? "1" : "0",
    );
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

export function startWalkDebugSession(params?: {
  startedAt?: string;
  routeExperienceSource?: string | null;
}) {
  if (!isWalkDebugEnabled()) return null;

  const current = getSessionRef();
  if (current && current.endedAt == null) {
    const nextSession: WalkDebugSessionMeta = {
      ...current,
      startedAt: params?.startedAt ?? current.startedAt,
      routeExperienceSource:
        params?.routeExperienceSource ?? current.routeExperienceSource,
      endedAt: null,
    };
    setSessionRef(nextSession);
    syncWalkDebugState();
    dispatchWalkDebugUpdate();
    return nextSession;
  }

  const history = getHistoryRef();
  history?.splice(0, history.length);
  const nextSession = buildSessionMeta(params);
  setSessionRef(nextSession);
  setRouteRef(null);
  syncWalkDebugState();
  dispatchWalkDebugUpdate();
  return nextSession;
}

export function finishWalkDebugSession(params?: {
  endedAt?: string;
  routeExperienceSource?: string | null;
}) {
  const current = getSessionRef();
  if (!current) return null;

  const nextSession: WalkDebugSessionMeta = {
    ...current,
    endedAt: params?.endedAt ?? new Date().toISOString(),
    routeExperienceSource:
      params?.routeExperienceSource ?? current.routeExperienceSource,
  };
  setSessionRef(nextSession);
  syncWalkDebugState();
  dispatchWalkDebugUpdate();
  return nextSession;
}

export function buildWalkDebugExportPayload(): WalkDebugExportPayload {
  const history = getWalkDebugHistory();
  return {
    exportedAt: new Date().toISOString(),
    session: getWalkDebugSession(),
    route: getWalkDebugRouteSnapshot(),
    count: history.length,
    logs: history,
  };
}

export function setWalkDebugRouteSnapshot(route: RouteResult | null) {
  if (!isWalkDebugEnabled()) return;
  setRouteRef(route);
  syncWalkDebugState();
  dispatchWalkDebugUpdate();
}

export function downloadWalkDebugHistory() {
  if (typeof window === "undefined") return false;
  const payload = buildWalkDebugExportPayload();

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
  ensureSessionMeta();

  const entry: WalkDebugEntry = {
    at: Date.now(),
    event,
    payload,
  };
  const history = getHistoryRef();
  if (!history) return;
  history.push(entry);
  syncWalkDebugState();
  dispatchWalkDebugUpdate();
}
