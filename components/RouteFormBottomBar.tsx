type RouteFormBottomBarProps = {
  formId: string;
  submitLabel: string;
  canSubmit: boolean;
};

export default function RouteFormBottomBar({
  formId,
  submitLabel,
  canSubmit,
}: RouteFormBottomBarProps) {
  return (
    <div className="h-16 px-3 grid grid-cols-[0.7fr_1.3fr] items-center gap-3 bg-white">
      <button
        type="reset"
        form={formId}
        className="rounded-xl bg-dg-white py-3 text-sm font-semibold text-dg-black transition-colors hover:bg-gray-50"
      >
        초기화
      </button>
      <button
        type="submit"
        form={formId}
        disabled={!canSubmit}
        className={[
          "rounded-xl py-3 text-sm font-semibold transition-colors",
          canSubmit
            ? "bg-dg-green-500 text-white hover:bg-dg-green-600"
            : "bg-gray-300 text-gray-500 cursor-not-allowed",
        ].join(" ")}
      >
        {submitLabel}
      </button>
    </div>
  );
}
