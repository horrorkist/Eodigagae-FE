import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faLocationCrosshairs } from "@fortawesome/free-solid-svg-icons";

export default function CoordRow({
  label,
  pos,
}: {
  label: string;
  pos: { lat: number; lng: number } | null;
}) {
  const isMyPos = label.includes("내 위치");

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <FontAwesomeIcon
          icon={isMyPos ? faLocationCrosshairs : faLocationDot}
          className={[
            "w-3 h-3",
            isMyPos ? "text-blue-500" : "text-red-500",
          ].join(" ")}
        />
        {label}
      </div>
      {pos ? (
        <div className="text-sm font-mono text-gray-600 ml-4.5">
          {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
        </div>
      ) : (
        <div className="text-sm text-gray-400 ml-4.5">좌표 없음</div>
      )}
    </div>
  );
}
