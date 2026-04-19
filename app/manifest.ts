import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "어디가개",
    short_name: "어디가개",
    description:
      "반려견 정보와 위치 기반 데이터를 결합해 산책 장소 탐색, 추천 경로 선택, 산책 기록 관리까지 이어지는 모바일 지도 앱",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0bdc00",
    prefer_related_applications: false,
    icons: [
      {
        src: "/pwa/icons/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa/icons/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa/icons/pwa-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
