"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isWalkDebugPanelVisible,
  setWalkDebugPanelVisible,
  subscribeWalkDebugUpdates,
} from "@/lib/walkDebug";

export default function MyPage() {
  const [showWalkDebugPanel, setShowWalkDebugPanel] = useState(() =>
    isWalkDebugPanelVisible(),
  );

  const sync = useCallback(() => {
    setShowWalkDebugPanel(isWalkDebugPanelVisible());
  }, []);

  useEffect(() => {
    return subscribeWalkDebugUpdates(sync);
  }, [sync]);

  return (
    <div className="min-h-full bg-gray-50">
      <section className="mx-auto max-w-[430px] px-4 pt-5 pb-24 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">마이 페이지</h1>
          <p className="mt-1 text-sm text-gray-500">
            앱 설정과 디버그 옵션을 관리합니다.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="">
              <div className="text-sm font-semibold text-gray-900">
                산책 디버그 패널 표시
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showWalkDebugPanel}
              onClick={() => setWalkDebugPanelVisible(!showWalkDebugPanel)}
              className={[
                "relative h-7 w-12 rounded-full transition-colors",
                showWalkDebugPanel ? "bg-blue-500" : "bg-gray-300",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  showWalkDebugPanel ? "translate-x-[20px]" : "translate-x-0",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
