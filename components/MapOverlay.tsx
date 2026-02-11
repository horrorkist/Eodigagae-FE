"use client";

import { useMemo, useState } from "react";
import { useEmit, useOn } from "@/hooks/useEventBus";
import FloatingFABMenu from "./FloatingFABMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faXmark,
  faLocationCrosshairs,
  faMapLocationDot,
  faFlagCheckered,
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

export default function MapOverlay(props: {
  topOffsetPx?: number;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  onSearchSubmit?: (q: string) => void;
  toggles?: ToggleItem[];
}) {
  const {
    topOffsetPx = 12,
    leftSlot,
    rightSlot,
    onSearchSubmit,
    toggles = [],
  } = props;

  const emit = useEmit();
  const [q, setQ] = useState("");
  const canSubmit = useMemo(() => q.trim().length > 0, [q]);

  const [isMovingMyMarker, setIsMovingMyMarker] = useState<boolean>(false);
  const [isSettingDest, setIsSettingDest] = useState<boolean>(false);

  const onToggleMoveMyMarker = () => {
    if (isSettingDest) {
      emit({ type: "MOVE_DEST_CANCELLED", channel: "map" });
      setIsSettingDest(false);
    }
    if (isMovingMyMarker) {
      emit({ type: "MOVE_MY_MARKER_CANCELLED", channel: "map" });
      setIsMovingMyMarker(false);
    } else {
      emit({ type: "MOVE_MY_MARKER_READY", channel: "map" });
      setIsMovingMyMarker(true);
    }
  };

  const onToggleMoveDest = () => {
    if (isMovingMyMarker) {
      emit({ type: "MOVE_MY_MARKER_CANCELLED", channel: "map" });
      setIsMovingMyMarker(false);
    }
    if (isSettingDest) {
      emit({ type: "MOVE_DEST_CANCELLED", channel: "map" });
      setIsSettingDest(false);
    } else {
      emit({ type: "MOVE_DEST_READY", channel: "map" });
      setIsSettingDest(true);
    }
  };

  useOn("map", "MY_MARKER_MOVED", () => {
    setIsMovingMyMarker(false);
  });

  useOn("map", "DEST_MOVED", () => {
    setIsSettingDest(false);
  });

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
              <form
                className="flex items-center gap-2 rounded-lg border bg-white/90 backdrop-blur shadow px-3 py-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!canSubmit) return;
                  onSearchSubmit?.(q.trim());
                }}
              >
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="w-3.5 h-3.5 text-gray-400 shrink-0"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="어디로 산책할까요?"
                  className="w-full bg-transparent outline-none text-sm"
                  inputMode="search"
                />
              </form>

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
        <FloatingFABMenu
          items={[
            {
              key: "my-location",
              icon: faLocationCrosshairs,
              label: "내 위치",
              onClick: () =>
                emit({ type: "REQUEST_MY_LOCATION", channel: "map" }),
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
          ]}
        />
      </div>
    </div>
  );
}
