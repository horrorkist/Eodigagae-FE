"use client";

import BottomSheet from "@/components/BottomSheet";
import { useBottomSheetStore } from "@/stores/bottomSheet";
import React from "react";

export default function BottomSheetPage() {
  const open = useBottomSheetStore((s) => s.open);
  const snapTo = useBottomSheetStore((s) => s.snapTo);
  const setSnapPoints = useBottomSheetStore((s) => s.setSnapPoints);
  return (
    <div>
      <BottomSheet peekHeight={30}>
        <div className="space-y-4">
          <div>드래그하면 가까운 스냅으로 붙어요.</div>
          <div>빠르게 아래로 플릭하거나, 아래로 많이 내리면 닫혀요.</div>
          <div style={{ height: 800 }}>스크롤 테스트용 긴 콘텐츠</div>
        </div>
      </BottomSheet>
    </div>
  );
}
