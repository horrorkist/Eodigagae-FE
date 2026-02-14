"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearWalkDebugHistory,
  downloadWalkDebugHistory,
  getWalkDebugHistory,
  isWalkDebugEnabled,
  setWalkDebugEnabled,
  subscribeWalkDebugUpdates,
  type WalkDebugEntry,
} from "@/lib/walkDebug";

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

export default function WalkDebugPanel() {
  const [enabled, setEnabled] = useState(() => isWalkDebugEnabled());
  const [entries, setEntries] = useState<WalkDebugEntry[]>(() =>
    getWalkDebugHistory(),
  );
  const [expanded, setExpanded] = useState(true);

  const sync = useCallback(() => {
    setEnabled(isWalkDebugEnabled());
    setEntries(getWalkDebugHistory());
  }, []);

  useEffect(() => {
    return subscribeWalkDebugUpdates(sync);
  }, [sync]);

  const visibleEntries = useMemo(
    () => entries.slice(-MAX_VISIBLE_LOGS).reverse(),
    [entries],
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
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
