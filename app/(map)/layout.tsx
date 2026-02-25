import MapCanvasHost from "@/components/map-shell/MapCanvasHost";
import MapRuntimeProvider from "@/components/map-shell/MapRuntimeProvider";
import type { ReactNode } from "react";

export default function MapLayout({ children }: { children: ReactNode }) {
  return (
    <MapRuntimeProvider>
      <div className="relative h-full w-full">
        <MapCanvasHost />
        <div className="relative h-full w-full pointer-events-none">
          {children}
        </div>
      </div>
    </MapRuntimeProvider>
  );
}
