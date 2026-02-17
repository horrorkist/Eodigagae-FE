"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useEmit, useOn } from "@/hooks/useEventBus";
import { requestOrientationPermissionIfNeeded } from "@/hooks/useWalkHeading";
import { useMapStore } from "@/stores/mapStore";
import FloatingFABMenu from "./FloatingFABMenu";
import AppIcon from "@/components/icons/AppIcon";
import {
  AppIconDefinition,
  appIconLocation,
  appIconMagnify,
} from "@/components/icons/definitions.generated";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faMapLocationDot,
  faFlagCheckered,
  faPause,
  faPlay,
  faPersonWalking,
  faStop,
} from "@fortawesome/free-solid-svg-icons";

type ToggleVariant = "orange" | "green" | "blue";

type ToggleItem = {
  key: string;
  labelOn: string;
  labelOff?: string;
  emoji?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  icon: AppIconDefinition;
  variant: ToggleVariant;
  loading?: boolean;
};

type MapOverlayProps = {
  topOffsetPx?: number;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  toggles?: ToggleItem[];
};

const TOGGLE_STYLES: Record<
  ToggleVariant,
  {
    on: string;
    off: string;
    text: string;
  }
> = {
  orange: {
    on: "bg-dg-orange-100 border border-dg-orange-500",
    off: "bg-white border border-white",
    text: "text-dg-orange-500",
  },
  green: {
    on: "bg-dg-green-100 border border-green-sub",
    off: "bg-white border border-white",
    text: "text-green-sub",
  },
  blue: {
    on: "bg-dg-blue-100 border border-dg-blue-500",
    off: "bg-white border border-white",
    text: "text-dg-blue-500",
  },
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

type WalkingOverlayProps = {
  elapsedSec: number;
  walkedDistanceM: number;
  walkingPaused: boolean;
  onTogglePause: () => void;
  onStop: () => void;
};

function WalkingOverlay({
  elapsedSec,
  walkedDistanceM,
  walkingPaused,
  onTogglePause,
  onStop,
}: WalkingOverlayProps) {
  return (
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
            onClick={onTogglePause}
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
            onClick={onStop}
            className="rounded-xl bg-red-500/85 hover:bg-red-500 transition-colors px-3 py-2 text-sm font-semibold"
          >
            <FontAwesomeIcon icon={faStop} className="w-3.5 h-3.5 mr-1.5" />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleChips({ toggles }: { toggles: ToggleItem[] }) {
  if (toggles.length === 0) return null;

  return (
    <div className="pointer-events-auto mt-2 w-full overflow-x-auto pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex min-w-full items-center gap-2 px-5">
        {toggles.map((toggle) => {
          const isOn = toggle.value;
          const label = isOn
            ? toggle.labelOn
            : (toggle.labelOff ?? toggle.labelOn);
          const style = TOGGLE_STYLES[toggle.variant];

          return (
            <button
              key={toggle.key}
              type="button"
              disabled={toggle.disabled || toggle.loading}
              onClick={() => toggle.onChange(!toggle.value)}
              className={[
                "pointer-events-auto shrink-0",
                "flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm shadow backdrop-blur",
                "active:scale-[0.98] transition",
                isOn ? style.on : style.off,
                toggle.disabled ? "opacity-40" : "",
              ].join(" ")}
            >
              <AppIcon
                icon={toggle.icon}
                className={["w-4 h-4", style.text].join(" ")}
              />
              <span className="relative inline-flex items-center justify-center">
                <span className={toggle.loading ? "opacity-0" : ""}>
                  {label}
                </span>
                {toggle.loading && (
                  <span
                    className={[
                      "absolute w-4 h-4 animate-spin rounded-full border-2 border-t-transparent",
                      style.text,
                    ].join(" ")}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MapOverlay({
  topOffsetPx = 12,
  leftSlot,
  rightSlot,
  toggles = [],
}: MapOverlayProps) {
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
    if (isSettingDest) {
      cancelMoveDest();
      return;
    }

    if (isMovingMyMarker) {
      cancelMoveMyMarker();
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

  const onToggleWalking = useCallback(() => {
    if (!canStartWalking) return;
    if (!walking) requestOrientationPermissionIfNeeded();

    emit({
      type: walking ? "STOP_WALKING" : "START_WALKING",
      channel: "map",
    });
  }, [canStartWalking, emit, walking]);

  const onTogglePauseWalking = useCallback(() => {
    emit({
      type: walkingPaused ? "RESUME_WALKING" : "PAUSE_WALKING",
      channel: "map",
    });
  }, [emit, walkingPaused]);

  const onStopWalking = useCallback(() => {
    emit({ type: "STOP_WALKING", channel: "map" });
  }, [emit]);

  const onRequestMyLocation = useCallback(() => {
    emit({ type: "REQUEST_MY_LOCATION", channel: "map" });
  }, [emit]);

  useOn("map", "MY_MARKER_MOVED", () => {
    setIsMovingMyMarker(false);
  });

  useOn("map", "DEST_MOVED", () => {
    setIsSettingDest(false);
  });

  const fabItems = useMemo(
    () => [
      // {
      //   key: "my-location",
      //   icon: faLocationCrosshairs,
      //   label: "내 위치",
      //   onClick: () => emit({ type: "REQUEST_MY_LOCATION", channel: "map" }),
      // },
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
        onClick: onToggleWalking,
      },
    ],
    [
      isMovingMyMarker,
      isSettingDest,
      onToggleMoveMyMarker,
      onToggleMoveDest,
      onToggleWalking,
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
        <WalkingOverlay
          elapsedSec={elapsedSec}
          walkedDistanceM={walkedDistanceM}
          walkingPaused={walkingPaused}
          onTogglePause={onTogglePauseWalking}
          onStop={onStopWalking}
        />
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

            <div className="pointer-events-auto min-w-0 flex-1 max-w-140">
              <Link
                href="/search?focus=1"
                className="flex w-full items-center gap-2 rounded-lg border bg-white/90 backdrop-blur shadow px-3 py-2"
                aria-label="검색 페이지로 이동"
              >
                <AppIcon
                  icon={appIconMagnify}
                  className="h-6 w-6 shrink-0 text-black"
                />
                <span className="text-sm text-gray-500">
                  어디로 산책할까요?
                </span>
              </Link>
            </div>

            <div className="pointer-events-auto">{rightSlot}</div>
          </div>
        </div>
        <ToggleChips toggles={toggles} />
      </div>

      {/* 우측 플로팅 버튼 영역 */}
      <div className="pointer-events-none absolute right-3 bottom-28 flex flex-col items-end space-y-4">
        <FloatingFABMenu items={fabItems} />
        <button
          onClick={onRequestMyLocation}
          className="pointer-events-auto rounded-full w-10 h-10 bg-white p-2 flex items-center justify-center shadow-lg shadow-black/15 overflow-hidden text-dg-black active:bg-dg-green-500 active:text-white"
        >
          <AppIcon icon={appIconLocation} className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
