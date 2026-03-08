import { useEffect, useRef } from "react";
import { BOTTOM_CHROME_HEIGHT_PX } from "@/lib/bottomChromeMetrics";

type StartPointPromptSheetProps = {
  addressText?: string;
  onHeightChange?: (heightPx: number) => void;
};

const DEFAULT_PLACEHOLDER_ADDRESS = "서울특별시 중구 세종대로 110";

export default function StartPointPromptSheet({
  addressText = DEFAULT_PLACEHOLDER_ADDRESS,
  onHeightChange,
}: StartPointPromptSheetProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onHeightChange) return;
    const element = rootRef.current;
    if (!element) return;

    const notify = () => {
      onHeightChange(element.offsetHeight);
    };

    notify();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      notify();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [onHeightChange]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed left-1/2 z-[112] w-full max-w-[430px] -translate-x-1/2"
      style={{
        bottom: `calc(var(--safe-bottom) + ${BOTTOM_CHROME_HEIGHT_PX}px)`,
      }}
    >
      <div className="rounded-t-2xl rounded-b-none bg-white px-4 py-8 text-dg-black shadow-lg shadow-black/15 backdrop-blur space-y-2 flex flex-col justify-center">
        <p className="text-base font-medium">여기서부터 산책을 시작할까요?</p>
        <p className="text-base font-medium text-dg-gray-600">{addressText}</p>
      </div>
    </div>
  );
}
