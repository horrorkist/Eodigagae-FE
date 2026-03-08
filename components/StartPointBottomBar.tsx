type StartPointBottomBarProps = {
  backLabel: string;
  confirmLabel: string;
  confirmDisabled: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

export default function StartPointBottomBar({
  backLabel,
  confirmLabel,
  confirmDisabled,
  onBack,
  onConfirm,
}: StartPointBottomBarProps) {
  return (
    <div className="h-16 px-3 grid grid-cols-[0.7fr_1.3fr] items-center gap-3 bg-white">
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl bg-dg-white py-3 text-sm font-semibold text-dg-black transition-colors hover:bg-gray-50"
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled}
        className={[
          "rounded-xl py-3 text-sm font-semibold transition-colors",
          confirmDisabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-dg-green-500 text-white hover:bg-dg-green-600",
        ].join(" ")}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
