"use client";

import { useRouter } from "next/navigation";
import RouteLoadingSplash from "@/components/map-overlay/RouteLoadingSplash";

export default function RouteLoadingDebugPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <RouteLoadingSplash
        message={"경로를 찾고 있어요.\n조금만 기다려주세요!"}
        onCancel={() => router.push("/")}
      />
    </main>
  );
}
