export default function CoordRow({
  label,
  pos,
}: {
  label: string;
  pos: { lat: number; lng: number } | null;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold">{label}</div>
      {pos ? (
        <div className="text-sm font-mono">
          lat: {pos.lat.toFixed(6)}
          <br />
          lng: {pos.lng.toFixed(6)}
        </div>
      ) : (
        <div className="text-sm text-gray-500">좌표 없음</div>
      )}
    </div>
  );
}
