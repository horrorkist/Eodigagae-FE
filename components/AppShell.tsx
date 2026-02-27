import BottomNavHost from "./BottomNavHost";
import Modal from "./Modal";
import MapRuntimeProvider from "@/components/map-shell/MapRuntimeProvider";
import PersistentMapLayer from "@/components/map-shell/PersistentMapLayer";
import { isGlobalMapPersistEnabled } from "@/lib/runtimeFlags";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const isGlobalPersist = isGlobalMapPersistEnabled;

  return (
    <div className="h-dvh bg-neutral-100 overflow-hidden">
      {/* 가운데 정렬 + 모바일 폭 제한 */}
      <div className="mx-auto h-dvh w-full max-w-[430px] bg-white shadow-sm flex flex-col overflow-hidden relative">
        {/* 상단바 */}
        {/* <div
          className="shrink-0 border-b bg-white"
          style={{ paddingTop: "var(--safe-top)" }}
        >
          <TopBar />
        </div> */}

        {/* ✅ 여기만 스크롤 */}
        <main className="flex-1 overflow-y-auto min-h-0 relative">
          {isGlobalPersist ? (
            <MapRuntimeProvider>
              <PersistentMapLayer />
              <div className="relative z-10">{children}</div>
            </MapRuntimeProvider>
          ) : (
            <div className="relative z-10">{children}</div>
          )}
        </main>

        {/* 하단탭 */}
        <BottomNavHost />

        <Modal />
      </div>
    </div>
  );
}
