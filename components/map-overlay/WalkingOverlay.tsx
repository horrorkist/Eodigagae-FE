import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faPause,
  faPlay,
  faPersonWalking,
  faStop,
} from "@fortawesome/free-solid-svg-icons";

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

export default function WalkingOverlay({
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

