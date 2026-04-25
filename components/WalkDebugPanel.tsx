"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getWalkDebugSession,
  clearWalkDebugHistory,
  downloadWalkDebugHistory,
  getWalkDebugHistory,
  isWalkDebugEnabled,
  setWalkDebugEnabled,
  subscribeWalkDebugUpdates,
  type WalkDebugEntry,
  type WalkDebugSessionMeta,
} from "@/lib/walkDebug";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

const MAX_VISIBLE_LOGS = 80;
const PAYLOAD_PREVIEW_MAX = 220;

function formatTime(at: number) {
  try {
    return new Date(at).toLocaleTimeString();
  } catch {
    return String(at);
  }
}

function formatPayloadPreview(payload?: Record<string, unknown>) {
  if (!payload) return "";
  const raw = JSON.stringify(payload);
  if (raw.length <= PAYLOAD_PREVIEW_MAX) return raw;
  return `${raw.slice(0, PAYLOAD_PREVIEW_MAX)}...`;
}

function getCardinalJump(payload?: Record<string, unknown>) {
  const value = payload?.cardinalJump;
  return typeof value === "string" ? value : null;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

type WalkDebugPanelProps = {
  onClose?: () => void;
};

export default function WalkDebugPanel({ onClose }: WalkDebugPanelProps) {
  const enabled = useSyncExternalStore(
    subscribeWalkDebugUpdates,
    isWalkDebugEnabled,
    () => false,
  );
  const [entries, setEntries] = useState<WalkDebugEntry[]>([]);
  const [session, setSession] = useState<WalkDebugSessionMeta | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const syncEntries = () => {
      setEntries(getWalkDebugHistory());
      setSession(getWalkDebugSession());
    };

    const rafId = window.requestAnimationFrame(syncEntries);
    const unsubscribe = subscribeWalkDebugUpdates(syncEntries);

    return () => {
      window.cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, []);

  const visibleEntries = useMemo(
    () => entries.slice(-MAX_VISIBLE_LOGS).reverse(),
    [entries],
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-800">Walk Debug</div>
          {session ? (
            <div className="mt-1 text-[11px] text-gray-500">
              session {session.sessionId.slice(0, 8)} · 시작 {formatDateTime(session.startedAt)}
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-gray-500">
              아직 활성 디버그 세션이 없습니다.
            </div>
          )}
        </div>
        {onClose ? (
          <button
            type="button"
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-100"
            onClick={onClose}
            aria-label="디버그 패널 닫기"
          >
            <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {session ? (
        <div className="rounded border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600">
          source {session.routeExperienceSource ?? "-"} · 종료 {formatDateTime(session.endedAt)}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-800">Walk Debug Logs</div>
        <div className="text-xs text-gray-500">
          total {entries.length} / visible {visibleEntries.length}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={[
            "rounded border px-2.5 py-1.5 text-xs font-medium transition-colors",
            enabled
              ? "border-green-600 bg-green-600 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
          ].join(" ")}
          onClick={() => setWalkDebugEnabled(!enabled)}
        >
          {enabled ? "Debug ON" : "Debug OFF"}
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
          disabled={entries.length === 0}
          onClick={() => {
            downloadWalkDebugHistory();
          }}
        >
          로그 다운로드
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
          disabled={entries.length === 0}
          onClick={() => {
            clearWalkDebugHistory();
          }}
        >
          로그 비우기
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "접기" : "펼치기"}
        </button>
      </div>

      {expanded ? (
        <div className="max-h-56 overflow-auto rounded border border-gray-200 bg-white">
          {visibleEntries.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">
              로그가 없습니다. Debug ON 후 산책을 시작해 주세요.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visibleEntries.map((entry, idx) => {
                const preview = formatPayloadPreview(entry.payload);
                const cardinalJump = getCardinalJump(entry.payload);
                return (
                  <li key={`${entry.at}-${entry.event}-${idx}`} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-500">{formatTime(entry.at)}</div>
                      {cardinalJump && (
                        <div
                          className={[
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            cardinalJump === "near_180"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700",
                          ].join(" ")}
                        >
                          {cardinalJump}
                        </div>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-gray-800">
                      {entry.event}
                    </div>
                    {preview && (
                      <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] text-gray-600">
                        {preview}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
