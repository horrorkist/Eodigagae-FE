import MapCanvasHost from "@/components/map-shell/MapCanvasHost";
import MapRuntimeProvider from "@/components/map-shell/MapRuntimeProvider";
import SearchResultPoiLayerBridge from "@/components/map-shell/SearchResultPoiLayerBridge";
import type { ReactNode } from "react";

export default function MapLayout({ children }: { children: ReactNode }) {
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
