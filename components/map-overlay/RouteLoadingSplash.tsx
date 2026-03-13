type RouteLoadingSplashProps = {
  title: string;
  description: string;
};

export default function RouteLoadingSplash({
  title,
  description,
}: RouteLoadingSplashProps) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(11,220,0,0.18),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(255,255,255,0.98))] px-6 backdrop-blur-md">
      <div className="flex w-full max-w-xs flex-col items-center rounded-[28px] border border-white/80 bg-white/92 px-6 py-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.14)]">
        <div className="relative mb-6 flex h-18 w-18 items-center justify-center rounded-full bg-dg-green-50">
          <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-dg-green-200 border-t-dg-green-600" />
          <div className="absolute h-3 w-3 rounded-full bg-dg-green-500 shadow-[0_0_18px_rgba(11,220,0,0.45)]" />
        </div>
        <p className="text-xl font-semibold tracking-[-0.03em] text-dg-black">
          {title}
        </p>
        <p className="mt-2 text-sm leading-6 text-dg-gray-600">
          {description}
        </p>
      </div>
    </div>
  );
}
