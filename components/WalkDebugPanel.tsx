"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useShallow } from "zustand/shallow";
import {
  clearWalkDebugHistory,
  downloadWalkDebugHistory,
  getWalkDebugHistory,
  isWalkDebugEnabled,
  setWalkDebugEnabled,
  subscribeWalkDebugUpdates,
  type WalkDebugEntry,
} from "@/lib/walkDebug";
import { useMapStore } from "@/stores/mapStore";
import type { RouteResult } from "@/domain/route/types";
import { useRouteActions } from "@/hooks/useRouteActions";
import CoordRow from "@/components/CoordRow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPersonWalking,
  faDrawPolygon,
  faRotateLeft,
  faEraser,
  faTriangleExclamation,
  faCircleInfo,
  faSpinner,
  faRulerHorizontal,
  faClock,
  faArrowTrendDown,
  faArrowTrendUp,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useDogStore } from "@/stores/dogStore";
import {
  getWalkRecommendation,
  type WalkRecommendation,
} from "@/lib/walkRecommendation";
import { simplifyPathByRdpMeters } from "@/lib/geo";

const MAX_VISIBLE_LOGS = 80;
const PAYLOAD_PREVIEW_MAX = 220;
const ROUTE_POLYGON_APPROX_TOLERANCE_M = 12;
const ACTION_BUTTON_CLASS =
  "flex items-center gap-1.5 border px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors hover:bg-gray-50";

function clonePath(path: [number, number][]) {
  return path.map(([lng, lat]) => [lng, lat] as [number, number]);
}

function cloneRoute(route: RouteResult): RouteResult {
  if (typeof structuredClone === "function") {
    return structuredClone(route);
  }
  return JSON.parse(JSON.stringify(route)) as RouteResult;
}

function isSamePath(
  a: [number, number][] | null | undefined,
  b: [number, number][] | null | undefined,
) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) {
      return false;
    }
  }

  return true;
}

function downloadJsonFile(fileName: string, payload: unknown) {
  if (typeof window === "undefined") return false;

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

function renderWalkDistanceFeedback(
  distanceKm: number,
  walkRec: WalkRecommendation,
) {
  if (distanceKm < walkRec.minKm) {
    return (
      <div className="flex items-center gap-1.5 text-orange-600">
        <FontAwesomeIcon icon={faArrowTrendDown} className="w-3 h-3" />
        추천보다 {(walkRec.minKm - distanceKm).toFixed(1)}km 짧아요
      </div>
    );
  }

  if (distanceKm > walkRec.maxKm) {
    return (
      <div className="flex items-center gap-1.5 text-red-600">
        <FontAwesomeIcon icon={faArrowTrendUp} className="w-3 h-3" />
        추천보다 {(distanceKm - walkRec.maxKm).toFixed(1)}km 길어요
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-green-600">
      <FontAwesomeIcon icon={faCircleCheck} className="w-3 h-3" />
      추천 범위에 적합해요!
    </div>
  );
}

export default function WalkDebugPanel() {
  const {
    myPos,
    pickedPos,
    route,
    routeRawResponse,
    routeLoading,
    routeError,
    drawRoute,
    setDrawRoute,
    setRouteState,
    clearRoute,
    clearPicked,
  } = useMapStore(
    useShallow((s) => ({
      myPos: s.myPos,
      pickedPos: s.pickedPos,
      route: s.route,
      routeRawResponse: s.routeRawResponse,
      routeLoading: s.routeLoading,
      routeError: s.routeError,
      drawRoute: s.drawRoute,
      setDrawRoute: s.setDrawRoute,
      setRouteState: s.setRouteState,
      clearRoute: s.clearRoute,
      clearPicked: s.clearPicked,
    })),
  );
  const dog = useDogStore((s) => s.dog);
  const walkRec = dog ? getWalkRecommendation(dog) : null;
  const { requestTmapWalkRoute } = useRouteActions();

  const enabled = useSyncExternalStore(
    subscribeWalkDebugUpdates,
    isWalkDebugEnabled,
    () => false,
  );
  const [entries, setEntries] = useState<WalkDebugEntry[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [originalRouteBackup, setOriginalRouteBackup] =
    useState<RouteResult | null>(null);
  const [approximatedPath, setApproximatedPath] = useState<
    [number, number][] | null
  >(null);
  const [showRouteJson, setShowRouteJson] = useState(false);
  const canRequest = !!myPos && !!pickedPos && !routeLoading;
  const canDraw = !!route?.path?.length;
  const canPolygonApprox = !!route?.path?.length && route.path.length > 2;
  const canRestoreOriginal =
    !!originalRouteBackup &&
    !!approximatedPath &&
    !!route?.path?.length &&
    isSamePath(route.path, approximatedPath);
  const routeDistanceKm =
    route?.summary?.distance != null ? route.summary.distance / 1000 : null;
  const routeExportPayload = useMemo(() => {
    if (!route) return null;
    return {
      exportedAt: new Date().toISOString(),
      route,
      context: {
        myPos,
        pickedPos,
        drawRoute,
        routeLoading,
        routeError,
      },
    };
  }, [drawRoute, myPos, pickedPos, route, routeError, routeLoading]);
  const routeExportJson = useMemo(() => {
    if (!routeExportPayload) return "";
    return JSON.stringify(routeExportPayload, null, 2);
  }, [routeExportPayload]);
  const isRouteJsonVisible = showRouteJson && !!route;

  useEffect(() => {
    const syncEntries = () => {
      setEntries(getWalkDebugHistory());
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
      <div className="rounded border border-gray-200 bg-white p-3 space-y-3">
        <div className="text-sm font-semibold text-gray-800">Route Controls</div>
        <CoordRow label="현재 내 위치" pos={myPos} />
        <CoordRow label="도착지" pos={pickedPos} />

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            onClick={() => {
              void requestTmapWalkRoute();
            }}
            disabled={!canRequest}
          >
            <FontAwesomeIcon
              icon={routeLoading ? faSpinner : faPersonWalking}
              className="w-3.5 h-3.5"
              spin={routeLoading}
            />
            {routeLoading ? "요청 중..." : "경로 요청"}
          </button>

          <button
            type="button"
            className={[
              "flex items-center gap-1.5 border px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors",
              drawRoute ? "bg-blue-500 text-white border-blue-500" : "hover:bg-gray-50",
            ].join(" ")}
            onClick={() => setDrawRoute(!drawRoute)}
            disabled={!canDraw}
          >
            <FontAwesomeIcon icon={faDrawPolygon} className="w-3.5 h-3.5" />
            {drawRoute ? "그리기 끄기" : "그리기"}
          </button>

          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            onClick={() => {
              if (!route?.path?.length) return;
              if (canRestoreOriginal && originalRouteBackup) {
                setRouteState({ route: cloneRoute(originalRouteBackup) });
                setOriginalRouteBackup(null);
                setApproximatedPath(null);
                return;
              }

              const approximated = simplifyPathByRdpMeters(
                route.path,
                ROUTE_POLYGON_APPROX_TOLERANCE_M,
              );
              setRouteState({
                route: {
                  ...route,
                  path: approximated,
                },
              });
              setOriginalRouteBackup(cloneRoute(route));
              setApproximatedPath(clonePath(approximated));
            }}
            disabled={!canPolygonApprox && !canRestoreOriginal}
          >
            <FontAwesomeIcon icon={faDrawPolygon} className="w-3.5 h-3.5" />
            {canRestoreOriginal ? "원본 경로 복원" : "다각형 근사"}
          </button>

          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            onClick={clearRoute}
            disabled={!route && !routeError}
          >
            <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5" />
            경로 초기화
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 border px-3 py-2 rounded text-sm transition-colors hover:bg-gray-50"
            onClick={clearPicked}
          >
            <FontAwesomeIcon icon={faEraser} className="w-3.5 h-3.5" />
            클릭 초기화
          </button>

          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            onClick={() => setShowRouteJson((prev) => !prev)}
            disabled={!route}
          >
            {isRouteJsonVisible ? "JSON 숨기기" : "JSON 보기"}
          </button>

          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            onClick={() => {
              if (!routeExportPayload) return;
              const fileName = `route-debug-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
              downloadJsonFile(fileName, routeExportPayload);
            }}
            disabled={!routeExportPayload}
          >
            JSON 다운로드
          </button>

          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            onClick={() => {
              if (!routeRawResponse) return;
              const fileName = `route-raw-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
              downloadJsonFile(fileName, routeRawResponse);
            }}
            disabled={!routeRawResponse}
          >
            Raw 다운로드
          </button>
        </div>

        {routeError && (
          <div className="flex items-center gap-2 text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className="w-3.5 h-3.5 shrink-0"
            />
            <span>{routeError}</span>
          </div>
        )}

        {route && (
          <div className="text-sm border rounded p-3 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <FontAwesomeIcon
                icon={faCircleInfo}
                className="w-3.5 h-3.5 text-blue-500"
              />
              경로 정보
            </div>
            <div className="ml-5.5 space-y-1 text-gray-700">
              <div>path points: {route.path.length}</div>

              {routeDistanceKm != null && (
                <>
                  <div className="flex items-center gap-1.5">
                    <FontAwesomeIcon
                      icon={faRulerHorizontal}
                      className="w-3 h-3 text-gray-400"
                    />
                    {routeDistanceKm.toFixed(2)} km
                  </div>
                  {walkRec && renderWalkDistanceFeedback(routeDistanceKm, walkRec)}
                </>
              )}

              {route.summary?.duration != null && (
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon
                    icon={faClock}
                    className="w-3 h-3 text-gray-400"
                  />
                  {Math.round(route.summary.duration / 60000)} min
                </div>
              )}
            </div>
          </div>
        )}

        {isRouteJsonVisible && routeExportJson && (
          <div className="text-xs border rounded p-3 space-y-2 bg-gray-50">
            <div className="font-semibold text-gray-700">Route JSON</div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all text-[11px] text-gray-700">
              {routeExportJson}
            </pre>
          </div>
        )}
      </div>

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
