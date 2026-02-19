import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import {
  ERROR_TEXT_CLASS,
  WALK_DISTANCE_MAX_KM,
  WALK_DISTANCE_MIN_KM,
  WALK_DISTANCE_STEP_KM,
  WALK_DURATION_MAX_MINUTES,
  WALK_DURATION_MIN_MINUTES,
  WALK_DURATION_STEP_MINUTES,
  WALK_STEP_BUTTON_CLASS,
} from "@/components/dog-form/constants";
import {
  clampWalkDistanceKm,
  formatWalkDistance,
  formatWalkDuration,
} from "@/components/dog-form/helpers";

type FieldErrorProps = {
  message?: string;
  className?: string;
};

export function FieldError({ message, className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p className={[ERROR_TEXT_CLASS, className].filter(Boolean).join(" ")}>
      <FontAwesomeIcon icon={faCircleExclamation} className="w-2.5 h-2.5" />
      {message}
    </p>
  );
}

type WalkDistanceSelectorProps = {
  value: number;
  onChange: (nextDistanceKm: number) => void;
  minKm: number;
  maxKm: number;
  disabledByDuration?: boolean;
};

export function WalkDistanceSelector({
  value,
  onChange,
  minKm,
  maxKm,
  disabledByDuration = false,
}: WalkDistanceSelectorProps) {
  const walkDistanceKm = disabledByDuration ? 0 : clampWalkDistanceKm(value);
  const isSelectedInRecommendedRange =
    !disabledByDuration && walkDistanceKm >= minKm && walkDistanceKm <= maxKm;

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold">산책 거리</div>
      <div className="relative">
        <AnimatePresence initial={false}>
          {disabledByDuration && (
            <div className="pointer-events-none absolute left-1/2 -top-8 z-10 -translate-x-1/2">
              <motion.div
                key="walk-duration-priority-tooltip"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{
                  duration: 0.5,
                }}
                className="relative will-change-transform rounded-md text-nowrap bg-dg-green-500 px-2 py-1 text-[11px] font-medium text-white shadow"
              >
                산책 시간에 맞춰 추천해드릴게요.
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-dg-green-500" />
              </motion.div>
            </div>
          )}
          {isSelectedInRecommendedRange && (
            <div className="pointer-events-none absolute left-1/2 -top-8 z-10 -translate-x-1/2">
              <motion.div
                key="walk-distance-tooltip"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{
                  duration: 0.5,
                }}
                className="relative will-change-transform rounded-md bg-dg-green-500 px-2 py-1 text-[11px] font-medium text-white shadow"
              >
                추천 거리예요
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-dg-green-500" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onChange(
                clampWalkDistanceKm(walkDistanceKm - WALK_DISTANCE_STEP_KM),
              )
            }
            disabled={
              disabledByDuration || walkDistanceKm <= WALK_DISTANCE_MIN_KM
            }
            aria-label="산책 거리 줄이기"
            className={WALK_STEP_BUTTON_CLASS}
          >
            -
          </button>
          <div className="flex-1 rounded-md border border-dg-white bg-white px-3 py-2 text-center text-sm font-semibold text-gray-800">
            {formatWalkDistance(walkDistanceKm)}
          </div>
          <button
            type="button"
            onClick={() =>
              onChange(
                clampWalkDistanceKm(walkDistanceKm + WALK_DISTANCE_STEP_KM),
              )
            }
            disabled={
              disabledByDuration || walkDistanceKm >= WALK_DISTANCE_MAX_KM
            }
            aria-label="산책 거리 늘리기"
            className={WALK_STEP_BUTTON_CLASS}
          >
            +
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>최소 500m</span>
        <span>최대 10km</span>
      </div>
    </div>
  );
}

type WalkDurationSelectorProps = {
  value: number;
  onChange: (nextHours: number) => void;
};

export function WalkDurationSelector({
  value,
  onChange,
}: WalkDurationSelectorProps) {
  const walkDurationMinutes = value;

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold">산책 시간</div>
      <div className="text-xs text-gray-500">
        산책 시간을 정하면, 거리보다 시간에 맞춰 추천해드릴게요.
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            onChange(walkDurationMinutes - WALK_DURATION_STEP_MINUTES)
          }
          disabled={walkDurationMinutes <= WALK_DURATION_MIN_MINUTES}
          aria-label="산책 시간 줄이기"
          className={WALK_STEP_BUTTON_CLASS}
        >
          -
        </button>
        <div className="flex-1 rounded-md border border-dg-white bg-white px-3 py-2 text-center text-sm font-semibold text-gray-800">
          {formatWalkDuration(walkDurationMinutes)}
        </div>
        <button
          type="button"
          onClick={() =>
            onChange(walkDurationMinutes + WALK_DURATION_STEP_MINUTES)
          }
          disabled={walkDurationMinutes >= WALK_DURATION_MAX_MINUTES}
          aria-label="산책 시간 늘리기"
          className={WALK_STEP_BUTTON_CLASS}
        >
          +
        </button>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>최소 10분</span>
        <span>최대 3시간</span>
      </div>
    </div>
  );
}

