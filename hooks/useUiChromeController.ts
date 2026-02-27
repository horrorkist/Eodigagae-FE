"use client";

import { useCallback } from "react";
import { useOn } from "@/hooks/useEventBus";
import { useUiChromeStore } from "@/stores/uiChrome";

export function useUiChromeController() {
  const showBottomChrome = useUiChromeStore((s) => s.showBottomChrome);
  const hideBottomChrome = useUiChromeStore((s) => s.hideBottomChrome);

  const onShowBottomChrome = useCallback(() => {
    showBottomChrome();
  }, [showBottomChrome]);

  const onHideBottomChrome = useCallback(() => {
    hideBottomChrome();
  }, [hideBottomChrome]);

  const onHomeEntered = useCallback(() => {
    showBottomChrome();
  }, [showBottomChrome]);

  useOn("ui", "UI_BOTTOM_CHROME_SHOW", onShowBottomChrome);
  useOn("ui", "UI_BOTTOM_CHROME_HIDE", onHideBottomChrome);
  useOn("ui", "UI_HOME_ENTERED", onHomeEntered);
}
