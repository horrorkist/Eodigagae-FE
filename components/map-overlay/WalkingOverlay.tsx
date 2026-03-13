type WalkingOverlayProps = {
  stopLabel: string;
  onStop: () => void;
};

export default function WalkingOverlay({
  stopLabel,
  onStop,
}: WalkingOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 px-3"
      style={{ bottom: "calc(var(--safe-bottom) + 12px)" }}
    >
      <button
        type="button"
        onClick={onStop}
        className="pointer-events-auto w-full rounded-xl bg-dg-green-500 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-dg-green-500/30 transition-colors active:bg-dg-green-600"
      >
        {stopLabel}
      </button>
    </div>
  );
}
