"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useEmit, useOn } from "@/hooks/useEventBus";
import { requestOrientationPermissionIfNeeded } from "@/hooks/useWalkHeading";
import { useMapStore } from "@/stores/mapStore";
import FloatingFABMenu from "./FloatingFABMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faMagnifyingGlass,
  faLocationCrosshairs,
  faMapLocationDot,
  faFlagCheckered,
  faPause,
  faPlay,
  faPersonWalking,
  faStop,
  faDog,
} from "@fortawesome/free-solid-svg-icons";

type ToggleItem = {
  key: string;
  labelOn: string;
  labelOff?: string;
  emoji?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

function formatElapsed(totalSec: number) {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDistance(meter: number) {
  if (meter >= 1000) return `${(meter / 1000).toFixed(2)} km`;
  return `${Math.round(meter)} m`;
}

export default function MapOverlay(props: {
  topOffsetPx?: number;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  toggles?: ToggleItem[];
}) {
  const { topOffsetPx = 12, leftSlot, rightSlot, toggles = [] } = props;

  const emit = useEmit();
  const walking = useMapStore((s) => s.walking);
  const route = useMapStore((s) => s.route);
  const walkingPaused = useMapStore((s) => s.walkingPaused);
  const walkingStartedAt = useMapStore((s) => s.walkingStartedAt);
  const walkingPausedAt = useMapStore((s) => s.walkingPausedAt);
  const walkingPausedTotalMs = useMapStore((s) => s.walkingPausedTotalMs);
  const walkedDistanceM = useMapStore((s) => s.walkedDistanceM);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const canStartWalking = useMemo(
    () => !!route?.path && route.path.length > 1,
    [route],
  );
  const elapsedSec = useMemo(() => {
    if (!walkingStartedAt) return 0;
    const effectiveNow =
      walkingPaused && walkingPausedAt ? walkingPausedAt : nowMs;
    const elapsedMs = Math.max(
      0,
      effectiveNow - walkingStartedAt - walkingPausedTotalMs,
    );
    return elapsedMs / 1000;
  }, [
    walkingStartedAt,
    walkingPaused,
    walkingPausedAt,
    walkingPausedTotalMs,
    nowMs,
  ]);

  const [isMovingMyMarker, setIsMovingMyMarker] = useState<boolean>(false);
  const [isSettingDest, setIsSettingDest] = useState<boolean>(false);

  const cancelMoveMyMarker = useCallback(() => {
    emit({ type: "MOVE_MY_MARKER_CANCELLED", channel: "map" });
    setIsMovingMyMarker(false);
  }, [emit]);

  const cancelMoveDest = useCallback(() => {
    emit({ type: "MOVE_DEST_CANCELLED", channel: "map" });
    setIsSettingDest(false);
  }, [emit]);

  const onToggleMoveMyMarker = useCallback(() => {
    if (isSettingDest) {
      cancelMoveDest();
    }

    if (isMovingMyMarker) {
      cancelMoveMyMarker();
      return;
    }

    emit({ type: "MOVE_MY_MARKER_READY", channel: "map" });
    setIsMovingMyMarker(true);
  }, [
    cancelMoveDest,
    cancelMoveMyMarker,
    emit,
    isMovingMyMarker,
    isSettingDest,
  ]);

  const onToggleMoveDest = useCallback(() => {
    if (isMovingMyMarker) {
      cancelMoveMyMarker();
    }

    if (isSettingDest) {
      cancelMoveDest();
      return;
    }

    emit({ type: "MOVE_DEST_READY", channel: "map" });
    setIsSettingDest(true);
  }, [
    cancelMoveDest,
    cancelMoveMyMarker,
    emit,
    isMovingMyMarker,
    isSettingDest,
  ]);

  useOn("map", "MY_MARKER_MOVED", () => {
    setIsMovingMyMarker(false);
  });

  useOn("map", "DEST_MOVED", () => {
    setIsSettingDest(false);
  });

  const fabItems = useMemo(
    () => [
      {
        key: "my-location",
        icon: faLocationCrosshairs,
        label: "내 위치",
        onClick: () => emit({ type: "REQUEST_MY_LOCATION", channel: "map" }),
      },
      {
        key: "move-marker",
        icon: faMapLocationDot,
        label: "내 위치 변경",
        active: isMovingMyMarker,
        onClick: onToggleMoveMyMarker,
      },
      {
        key: "set-dest",
        icon: faFlagCheckered,
        label: "도착지 설정",
        active: isSettingDest,
        onClick: onToggleMoveDest,
      },
      {
        key: "start-walking",
        icon: faPersonWalking,
        label: walking ? "산책 종료" : "산책 시작",
        active: walking,
        disabled: !canStartWalking,
        onClick: () => {
          if (!canStartWalking) return;
          if (!walking) requestOrientationPermissionIfNeeded();

          emit({
            type: walking ? "STOP_WALKING" : "START_WALKING",
            channel: "map",
          });
        },
      },
    ],
    [
      emit,
      isMovingMyMarker,
      isSettingDest,
      onToggleMoveMyMarker,
      onToggleMoveDest,
      walking,
      canStartWalking,
    ],
  );

  useEffect(() => {
    if (!walking || walkingPaused || !walkingStartedAt) return;

    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [walking, walkingPaused, walkingStartedAt]);

  if (walking) {
    return (
      <div className="pointer-events-none absolute inset-0 z-50">
        <div className="pointer-events-none absolute left-0 right-0 top-3 flex justify-center px-3">
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-black/80 text-white shadow-lg backdrop-blur px-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] text-white/80">
                  <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                  <span>Elapsed</span>
                </div>
                <div className="mt-1 text-base font-semibold tabular-nums">
                  {formatElapsed(elapsedSec)}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] text-white/80">
                  <FontAwesomeIcon icon={faPersonWalking} className="w-3 h-3" />
                  <span>Distance</span>
                </div>
                <div className="mt-1 text-base font-semibold tabular-nums">
                  {formatDistance(walkedDistanceM)}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  emit({
                    type: walkingPaused ? "RESUME_WALKING" : "PAUSE_WALKING",
                    channel: "map",
                  })
                }
                className="rounded-xl bg-white/15 hover:bg-white/20 transition-colors px-3 py-2 text-sm font-medium"
              >
                <FontAwesomeIcon
                  icon={walkingPaused ? faPlay : faPause}
                  className="w-3.5 h-3.5 mr-1.5"
                />
                {walkingPaused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={() => emit({ type: "STOP_WALKING", channel: "map" })}
                className="rounded-xl bg-red-500/85 hover:bg-red-500 transition-colors px-3 py-2 text-sm font-semibold"
              >
                <FontAwesomeIcon icon={faStop} className="w-3.5 h-3.5 mr-1.5" />
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {/* 상단 영역 */}
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{ top: topOffsetPx }}
      >
        <div className="px-3">
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto">{leftSlot}</div>

            <div className="pointer-events-auto flex-1 max-w-140">
              <Link
                href="/search?focus=1"
                className="flex w-full items-center gap-2 rounded-lg border bg-white/90 backdrop-blur shadow px-3 py-2"
                aria-label="검색 페이지로 이동"
              >
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="w-3.5 h-3.5 text-gray-400 shrink-0"
                />
                <span className="text-sm text-gray-500">
                  어디로 산책할까요?
                </span>
              </Link>

              {toggles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {toggles.map((t) => {
                    const on = t.value;
                    const label = on ? t.labelOn : (t.labelOff ?? t.labelOn);

                    return (
                      <button
                        key={t.key}
                        type="button"
                        disabled={t.disabled}
                        onClick={() => t.onChange(!t.value)}
                        className={[
                          "pointer-events-auto",
                          "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm shadow border backdrop-blur",
                          "bg-white/90 active:scale-[0.98] transition",
                          on ? "border-black" : "border-gray-200 text-gray-600",
                          t.disabled ? "opacity-40" : "",
                        ].join(" ")}
                      >
                        <FontAwesomeIcon icon={faDog} className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pointer-events-auto">{rightSlot}</div>
          </div>
        </div>
      </div>

      {/* 우측 플로팅 버튼 영역 */}
      <div className="pointer-events-none absolute right-3 bottom-28">
        <FloatingFABMenu items={fabItems} />
      </div>
    </div>
  );
}
