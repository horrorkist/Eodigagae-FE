"use client";

import { useMemo, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useEmit, useOn } from "@/hooks/useEventBus";

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

  const onToggleMoveMyMarker = () => {
    if (isMovingMyMarker) {
      emit({ type: "MOVE_MY_MARKER_CANCELLED", channel: "map" });
      setIsMovingMyMarker(false);
    } else {
      emit({ type: "MOVE_MY_MARKER_READY", channel: "map" });
      setIsMovingMyMarker(true);
    }
  };

  useOn("map", "MY_MARKER_MOVED", () => {
    setIsMovingMyMarker(false);
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

            <div className="pointer-events-auto flex-1 max-w-[560px]">
              <form
                className="flex items-center gap-2 rounded-2xl border bg-white/90 backdrop-blur shadow px-3 py-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!canSubmit) return;
                  onSearchSubmit?.(q.trim());
                }}
              >
                <span className="text-sm opacity-70">🔎</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="장소 검색 (예: 애견카페, 공원)"
                  className="w-full bg-transparent outline-none text-sm"
                  inputMode="search"
                />
                {q.length > 0 && (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded-full border bg-white/70"
                    onClick={() => setQ("")}
                  >
                    지우기
                  </button>
                )}
                <button
                  type="submit"
                  className="text-xs px-3 py-1 rounded-full border bg-white disabled:opacity-40"
                  disabled={!canSubmit}
                >
                  검색
                </button>
              </form>

              {toggles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {toggles.map((t) => {
                    const on = t.value;
                    const label = on
                      ? `${t.emoji ?? ""} ${t.labelOn}`.trim()
                      : `${t.emoji ?? ""} ${t.labelOff ?? t.labelOn}`.trim();

                    return (
                      <button
                        key={t.key}
                        type="button"
                        disabled={t.disabled}
                        onClick={() => t.onChange(!t.value)}
                        className={[
                          "pointer-events-auto",
                          "px-3 py-2 rounded-full text-sm shadow border backdrop-blur",
                          "bg-white/90 active:scale-[0.98] transition",
                          on ? "border-black" : "border-gray-200 text-gray-600",
                          t.disabled ? "opacity-40" : "",
                        ].join(" ")}
                      >
                        {label}
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
      <div className="pointer-events-none absolute right-3 bottom-28 flex flex-col gap-2">
        <div className="pointer-events-auto rounded-2xl border bg-white/90 backdrop-blur shadow overflow-hidden">
          <button
            type="button"
            className="block px-3 py-3 text-sm w-full text-left hover:bg-black/5 disabled:opacity-50"
            onClick={() =>
              emit({ type: "REQUEST_MY_LOCATION", channel: "map" })
            }
          >
            📍 {"내 위치"}
          </button>
          <div className="h-px bg-black/10" />
          <button
            type="button"
            className={`block px-3 py-3 text-sm w-full text-left ${isMovingMyMarker ? "bg-blue-500! text-white" : ""}`}
            onClick={onToggleMoveMyMarker}
          >
            내 위치 변경
          </button>
        </div>
      </div>
    </div>
  );
}
