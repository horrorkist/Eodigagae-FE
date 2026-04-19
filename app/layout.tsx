import type { Metadata } from "next";
// import { Noto_Sans_KR } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";
import Providers from "./providers";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

// const notoSansKr = Noto_Sans_KR({
//   subsets: ["latin"],
//   weight: ["400", "500", "600", "700"],
//   display: "swap",
//   variable: "--font-noto-sans-kr",
// });

export const metadata: Metadata = {
  title: "어디가개",
  description:
    "반려견 정보와 위치 기반 데이터를 결합해 산책 장소 탐색, 추천 경로 선택, 산책 기록 관리까지 이어지는 모바일 지도 앱",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/pwa/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // iOS safe-area
  userScalable: false,
  themeColor: "#0bdc00",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body className={`overflow-hidden`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
