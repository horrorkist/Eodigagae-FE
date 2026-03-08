import { BOTTOM_CHROME_HEIGHT_PX } from "@/lib/bottomChromeMetrics";

type StartPointPromptSheetProps = {
  addressText?: string;
};

const DEFAULT_PLACEHOLDER_ADDRESS = "서울특별시 중구 세종대로 110";

export default function StartPointPromptSheet({
  addressText = DEFAULT_PLACEHOLDER_ADDRESS,
}: StartPointPromptSheetProps) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[112] w-full max-w-[430px] -translate-x-1/2"
      style={{
        bottom: `calc(var(--safe-bottom) + ${BOTTOM_CHROME_HEIGHT_PX}px)`,
      }}
    >
      <div className="rounded-t-2xl rounded-b-none bg-white px-4 py-4 text-dg-black shadow-lg shadow-black/15 backdrop-blur space-y-2 flex flex-col justify-center">
        <p className="text-base font-medium">여기서부터 산책을 시작할까요?</p>
        <p className="text-base font-medium text-dg-gray-600">{addressText}</p>
      </div>
    </div>
  );
}
