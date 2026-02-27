"use client";

import { usePathname } from "next/navigation";
import MapCanvasHost from "@/components/map-shell/MapCanvasHost";

function isMapInteractivePath(pathname: string) {
  return pathname === "/";
}

export default function PersistentMapLayer() {
  const pathname = usePathname();
  const interactive = isMapInteractivePath(pathname);

  return (
    <div
      className={[
        "absolute inset-0 z-0",
        interactive ? "visible opacity-100" : "invisible opacity-0",
        interactive ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={interactive ? undefined : true}
    >
      <MapCanvasHost />
    </div>
  );
}
