"use client";

import { useCallback } from "react";
import { useOn } from "@/hooks/useEventBus";
import { useUiChromeStore } from "@/stores/uiChrome";

export function useUiChromeController() {
  const showBottomChrome = useUiChromeStore((s) => s.showBottomChrome);
  const hideBottomChrome = useUiChromeStore((s) => s.hideBottomChrome);
  const requestHideBottomChromeOnNextHome = useUiChromeStore(
    (s) => s.requestHideBottomChromeOnNextHome,
  );
  const consumeHideBottomChromeOnNextHome = useUiChromeStore(
    (s) => s.consumeHideBottomChromeOnNextHome,
  );

  const onShowBottomChrome = useCallback(() => {
    showBottomChrome();
  }, [showBottomChrome]);

  const onHideBottomChrome = useCallback(() => {
    hideBottomChrome();
  }, [hideBottomChrome]);

  const onHideOnNextHome = useCallback(() => {
    requestHideBottomChromeOnNextHome();
  }, [requestHideBottomChromeOnNextHome]);

  const onHomeEntered = useCallback(() => {
    const shouldHideOnEnter = consumeHideBottomChromeOnNextHome();
    if (shouldHideOnEnter) {
      hideBottomChrome();
      return;
    }
    showBottomChrome();
  }, [consumeHideBottomChromeOnNextHome, hideBottomChrome, showBottomChrome]);

  useOn("ui", "UI_BOTTOM_CHROME_SHOW", onShowBottomChrome);
  useOn("ui", "UI_BOTTOM_CHROME_HIDE", onHideBottomChrome);
  useOn("ui", "UI_BOTTOM_CHROME_HIDE_ON_NEXT_HOME", onHideOnNextHome);
  useOn("ui", "UI_HOME_ENTERED", onHomeEntered);
}
