"use client";

import { createContext, useCallback, useMemo, useState } from "react";
import type { ReactNode, RefObject } from "react";

export type MapRuntime = {
  mapRef: RefObject<naver.maps.Map | null>;
  sdkReady: boolean;
};

export type MapRuntimeRegistration = MapRuntime;

type MapRuntimeContextValue = MapRuntime & {
  registerRuntime: (runtime: MapRuntimeRegistration) => void;
};

const EMPTY_MAP_REF: RefObject<naver.maps.Map | null> = {
  current: null,
};

export const MapRuntimeContext = createContext<MapRuntimeContextValue | null>(
  null,
);

export default function MapRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mapRef, setMapRef] =
    useState<RefObject<naver.maps.Map | null>>(EMPTY_MAP_REF);
  const [sdkReady, setSdkReady] = useState(false);

  const registerRuntime = useCallback((runtime: MapRuntimeRegistration) => {
    setMapRef((prev) => (prev === runtime.mapRef ? prev : runtime.mapRef));
    setSdkReady((prev) =>
      prev === runtime.sdkReady ? prev : runtime.sdkReady,
    );
  }, []);

  const value = useMemo<MapRuntimeContextValue>(
    () => ({
      mapRef,
      sdkReady,
      registerRuntime,
    }),
    [mapRef, sdkReady, registerRuntime],
  );

  return (
    <MapRuntimeContext.Provider value={value}>
      {children}
    </MapRuntimeContext.Provider>
  );
}
