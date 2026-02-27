import MapCanvasHost from "@/components/map-shell/MapCanvasHost";
import MapRuntimeProvider from "@/components/map-shell/MapRuntimeProvider";
import SearchResultPoiLayerBridge from "@/components/map-shell/SearchResultPoiLayerBridge";
import { isGlobalMapPersistEnabled } from "@/lib/runtimeFlags";
import type { ReactNode } from "react";

export default function MapLayout({ children }: { children: ReactNode }) {
  if (!isGlobalMapPersistEnabled) {
    return (
      <MapRuntimeProvider>
        <div className="relative h-full w-full">
          <MapCanvasHost />
          <SearchResultPoiLayerBridge />
          <div className="relative h-full w-full pointer-events-none">
            {children}
          </div>
        </div>
      </MapRuntimeProvider>
    );
  }

  return (
    <div className="relative h-full w-full">
      <SearchResultPoiLayerBridge />
      <div className="relative h-full w-full pointer-events-none">
        {children}
      </div>
    </div>
  );
}
