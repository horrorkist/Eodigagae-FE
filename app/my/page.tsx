"use client";

import { useState, useSyncExternalStore } from "react";
import {
  COACHMARK_COOKIE_NAME,
  ONBOARDING_COOKIE_NAME,
} from "@/lib/onboarding";
import {
  isWalkDebugPanelVisible,
  setWalkDebugPanelVisible,
  subscribeWalkDebugUpdates,
} from "@/lib/walkDebug";

export default function MyPage() {
  const [isCookieResetDone, setIsCookieResetDone] = useState(false);
  const showWalkDebugPanel = useSyncExternalStore(
    subscribeWalkDebugUpdates,
    isWalkDebugPanelVisible,
    () => true,
  );
  const handleResetOnboardingAndCoachmark = () => {
    if (typeof document === "undefined") return;

    const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = [
      `${ONBOARDING_COOKIE_NAME}=`,
      "Path=/",
      "Max-Age=0",
      `Expires=${expires}`,
      "SameSite=Lax",
    ].join("; ");
    document.cookie = [
      `${COACHMARK_COOKIE_NAME}=`,
      "Path=/",
      "Max-Age=0",
      `Expires=${expires}`,
      "SameSite=Lax",
    ].join("; ");
    setIsCookieResetDone(true);
  };

  return (
    <div className="min-h-full bg-gray-50 pointer-events-auto">
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
                showWalkDebugPanel ? "bg-dg-green-500" : "bg-gray-300",
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

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="text-sm font-semibold text-gray-900">
                온보딩/코치마크 쿠키 삭제
              </div>

              <button
                type="button"
                onClick={handleResetOnboardingAndCoachmark}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 active:bg-gray-100"
              >
                삭제
              </button>
            </div>

            {isCookieResetDone ? (
              <p className="text-xs text-dg-green-700">
                쿠키를 삭제했어요. 홈으로 이동하면 온보딩이 다시 시작됩니다.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
