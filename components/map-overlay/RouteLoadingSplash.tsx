import Image from "next/image";

type RouteLoadingSplashProps = {
  message: string;
};

export default function RouteLoadingSplash({
  message,
}: RouteLoadingSplashProps) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/88 px-6 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <div className="relative mb-6 h-40 w-40">
          <div className="absolute inset-0 animate-spin rounded-full bg-[conic-gradient(from_90deg,_rgba(206,206,206,0.14)_0deg,_rgba(206,206,206,0.14)_220deg,_rgba(237,237,237,0.96)_300deg,_rgba(151,151,151,0.88)_360deg)] [mask:radial-gradient(farthest-side,transparent_calc(100%-6px),#000_calc(100%-6px))] [-webkit-mask:radial-gradient(farthest-side,transparent_calc(100%-6px),#000_calc(100%-6px))]" />
          <div className="absolute inset-[6px] overflow-hidden rounded-full bg-white shadow-[0_14px_34px_rgba(44,44,44,0.08)]">
            <Image
              src="/images/route/route-loading.svg"
              alt="경로 추천 로딩 일러스트"
              fill
              sizes="160px"
              priority
              className="object-cover"
            />
          </div>
        </div>
        <p className="whitespace-pre-line text-xl font-semibold leading-8 tracking-[-0.03em] text-dg-black">
          {message}
        </p>
        <div className="mt-7 flex items-center justify-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-2 w-2 rounded-full bg-dg-gray-500 [animation:route-loading-bounce_1.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${index * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
