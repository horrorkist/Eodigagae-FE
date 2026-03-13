import AppIcon from "@/components/icons/AppIcon";
import { appIconOption } from "@/components/icons/definitions.generated";
import formatDist from "@/lib/formatDist";
import type { RouteRecommendation } from "@/types/routeRecommend";

function formatRouteDistance(distanceM: number | undefined) {
  if (typeof distanceM !== "number" || !Number.isFinite(distanceM)) return "-";
  if (distanceM <= 0) return "-";
  return formatDist(distanceM);
}

function durationToMinutes(durationRaw: number | undefined) {
  if (typeof durationRaw !== "number" || !Number.isFinite(durationRaw))
    return 0;
  if (durationRaw <= 0) return 0;
  const minutes =
    durationRaw > 100_000 ? durationRaw / 60_000 : durationRaw / 60;
  return Math.max(1, Math.round(minutes));
}

type RoutePlanningOverlayProps = {
  recommendations: RouteRecommendation[];
  selectedRouteId: string | null;
  loading: boolean;
  error: string | null;
  routeEditLabel: string;
  loadingLabel: string;
  emptyLabel: string;
  startLabel: string;
  onRouteSelect?: (routeId: string) => void;
  onRouteEdit?: () => void;
  onGuideStart?: () => void;
};

export default function RoutePlanningOverlay({
  recommendations,
  selectedRouteId,
  loading,
  error,
  routeEditLabel,
  loadingLabel,
  emptyLabel,
  startLabel,
  onRouteSelect,
  onRouteEdit,
  onGuideStart,
}: RoutePlanningOverlayProps) {
  const canStartGuide =
    !loading &&
    recommendations.length > 0 &&
    recommendations.some((item) => item.id === selectedRouteId);

  return (
    <div
      className="pointer-events-none absolute left-0 right-0"
      style={{ bottom: "calc(var(--safe-bottom) + 16px)" }}
    >
      <div className="flex flex-col gap-2">
        <div className="px-3">
          <button
            type="button"
            onClick={onRouteEdit}
            className="pointer-events-auto flex items-center gap-x-1 rounded-full bg-white px-3 py-4 text-dg-black shadow-md backdrop-blur transition-colors active:bg-dg-green-50"
          >
            <AppIcon icon={appIconOption} className="w-5 h-5" />
            {routeEditLabel}
          </button>
        </div>

        <div className="pointer-events-auto overflow-x-auto pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="px-3">
              <div className="rounded-xl bg-white px-3 py-5 text-sm font-medium text-gray-500 shadow-md">
                {loadingLabel}
              </div>
            </div>
          ) : error ? (
            <div className="px-3">
              <div className="rounded-xl bg-white px-3 py-5 text-sm font-medium text-red-500 shadow-md">
                {error}
              </div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="px-3">
              <div className="rounded-xl bg-white px-3 py-5 text-sm font-medium text-gray-500 shadow-md">
                {emptyLabel}
              </div>
            </div>
          ) : (
            <div className="flex w-max min-w-full items-center gap-2 px-3">
              {recommendations.map((routeItem, index) => {
                const isSelected = selectedRouteId === routeItem.id;
                const minutes = durationToMinutes(
                  routeItem.route.summary?.duration,
                );
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                const dist = formatRouteDistance(
                  routeItem.route.summary?.distance,
                );
                const displayLabel =
                  routeItem.displayLabel ?? `경로 ${index + 1}`;

                return (
                  <button
                    onClick={() => onRouteSelect?.(routeItem.id)}
                    key={routeItem.id}
                    type="button"
                    className={[
                      "rounded-2xl border-2 bg-white px-3 py-4 transition-colors w-38 h-26 flex flex-col items-start justify-between space-y-4 font-semibold",
                      isSelected
                        ? "border border-dg-green-500"
                        : "border-transparent text-gray-600",
                    ].join(" ")}
                  >
                    <div className="flex justify-between w-full items-end">
                      <div
                        className={[
                          "px-2 py-0.5 rounded-full text-white text-sm",
                          isSelected ? "bg-dg-green-500" : "bg-dg-gray-500",
                        ].join(" ")}
                      >
                        {displayLabel}
                      </div>
                      <div className="text-dg-gray-500 font-medium tracking-tighter">
                        {dist}
                      </div>
                    </div>
                    <div
                      className={[
                        "tabular-nums -tracking-tight flex gap-x-1 items-end",
                        isSelected ? "text-dg-black" : "text-dg-gray-500",
                      ].join(" ")}
                    >
                      {hours > 0 && (
                        <div className="font-semibold">
                          <span className="text-2xl">{hours}</span>
                          <span>시간</span>
                        </div>
                      )}
                      {mins > 0 && (
                        <div className="font-semibold">
                          <span className="text-2xl">{mins}</span>
                          <span>분</span>
                        </div>
                      )}
                      {hours === 0 && mins === 0 && <span>-</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={onGuideStart}
            disabled={!canStartGuide}
            className="pointer-events-auto w-full text-lg rounded-xl bg-dg-green-500/95 px-3 py-5 font-semibold text-white shadow-md backdrop-blur transition-colors active:bg-dg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {startLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
