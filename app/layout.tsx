import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "어디가개",
  description: "모바일 중심 Next.js UI 스캐폴딩",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // iOS safe-area
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="overflow-hidden">
        <Providers>
          <AppShell>{children}</AppShell>;
        </Providers>
      </body>
    </html>
  );
}
