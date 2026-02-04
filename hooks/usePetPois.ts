import useSWR from "swr";

export function usePetPois(opts: {
  enabled: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
}) {
  const { enabled, lat, lng, radius = 1000 } = opts;

  const key =
    enabled && typeof lat === "number" && typeof lng === "number"
      ? `/api/petpois?lat=${lat}&lng=${lng}&radius=${radius}&numOfRows=80&pageNo=1`
      : null;

  const swr = useSWR(key); // 전역 fetcher 사용

  // 수동 새로고침: 버튼 눌렀을 때만 외부 API를 치게 됨(서버 캐시 TTL 내면 서버가 막아줌)
  const refresh = () => swr.mutate(undefined, { revalidate: true });

  return { ...swr, refresh };
}
