import BottomNav from "./BottomNav";
import Modal from "./Modal";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh bg-neutral-100 overflow-hidden">
      {/* 가운데 정렬 + 모바일 폭 제한 */}
      <div className="mx-auto h-dvh w-full max-w-[430px] bg-white shadow-sm flex flex-col overflow-hidden">
        {/* 상단바 */}
        {/* <div
          className="shrink-0 border-b bg-white"
          style={{ paddingTop: "var(--safe-top)" }}
        >
          <TopBar />
        </div> */}

        {/* ✅ 여기만 스크롤 */}
        <main className="flex-1 overflow-y-auto min-h-0 relative">
          {children}
        </main>

        {/* 하단탭 */}
        <div
          className="fixed bottom-0 left-1/2 z-101 w-full max-w-[430px] -translate-x-1/2 border-t bg-white"
          style={{ paddingBottom: "var(--safe-bottom)" }}
        >
          <BottomNav />
        </div>

        <Modal />
      </div>
    </div>
  );
}
