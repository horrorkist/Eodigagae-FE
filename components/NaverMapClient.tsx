"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNaverMap } from "@/hooks/useNaverMap";
import { useMapMyLocation } from "@/hooks/useMapMyLocation";
import { useMapRoute } from "@/hooks/useMapRoute";
import type { UseMapRouteOptions } from "@/hooks/useMapRoute";
import type { MapRuntimeRegistration } from "@/components/map-shell/MapRuntimeProvider";

const CLUSTER_PLUGIN_VERSION = "2026-03-03.1";

export default function NaverMapClient(props: {
  routeOptions?: UseMapRouteOptions;
  onRuntimeChange?: (runtime: MapRuntimeRegistration) => void;
}) {
  const { routeOptions, onRuntimeChange } = props;

  const { mapRef, elRef, sdkReady, setSdkReady } = useNaverMap();
  const [sdkScriptReady, setSdkScriptReady] = useState(false);
  const [shouldLoadClusterPlugin, setShouldLoadClusterPlugin] = useState(false);
  const finalizedRef = useRef(false);
  useMapMyLocation(mapRef, sdkReady);
  useMapRoute(mapRef, routeOptions, sdkReady);

  useEffect(() => {
    onRuntimeChange?.({
      mapRef,
      sdkReady,
    });
  }, [mapRef, onRuntimeChange, sdkReady]);

  const finalizeSdkReady = useCallback(
    (reason: "plugin-ready" | "plugin-failed" | "plugin-skipped") => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;

      if (
        reason === "plugin-failed" &&
        typeof window !== "undefined" &&
        !window.__naverClusterPluginWarned
      ) {
        window.__naverClusterPluginWarned = true;
        console.warn(
          "[map] marker clustering plugin load failed; fallback to individual markers",
        );
      }

      setSdkReady(true);
    },
    [setSdkReady],
  );

  const key = process.env.NEXT_PUBLIC_NAVER_MAPS_KEY_ID;

  return (
    <>
      <Script
        id="naver-maps-sdk"
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${key}`}
        strategy="afterInteractive"
        onReady={() => {
          if (typeof window !== "undefined") {
            window.__naverMapSdkLoaded = true;
            const isClusterPluginCurrent =
              Boolean(window.MarkerClustering) &&
              window.__naverClusterPluginVersion === CLUSTER_PLUGIN_VERSION;

            if (isClusterPluginCurrent) {
              window.__naverClusterPluginLoaded = true;
              setShouldLoadClusterPlugin(false);
              finalizeSdkReady("plugin-skipped");
            } else {
              setShouldLoadClusterPlugin(true);
            }
          }
          setSdkScriptReady(true);
        }}
      />
      {sdkScriptReady && shouldLoadClusterPlugin ? (
        <Script
          id="naver-maps-marker-clustering"
          src={`/vendor/naver-marker-clustering.js?v=${CLUSTER_PLUGIN_VERSION}`}
          strategy="afterInteractive"
          onReady={() => {
            if (typeof window !== "undefined") {
              window.__naverClusterPluginLoadAttempted = true;
              window.__naverClusterPluginLoaded = Boolean(
                window.MarkerClustering,
              );
            }

            finalizeSdkReady("plugin-ready");
          }}
          onError={() => {
            if (typeof window !== "undefined") {
              window.__naverClusterPluginLoadAttempted = true;
              window.__naverClusterPluginLoaded = false;
            }
            finalizeSdkReady("plugin-failed");
          }}
        />
      ) : null}
      <div ref={elRef} className="w-full h-full" />
    </>
  );
}
