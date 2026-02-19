import { create } from "zustand";

export type MarkerPlacementMode = "none" | "my" | "dest";

type MapControlState = {
  markerPlacementMode: MarkerPlacementMode;
  myLocationRequestSeq: number;
  startMoveMyMarker: () => void;
  startMoveDest: () => void;
  cancelMarkerPlacement: () => void;
  completeMarkerPlacement: () => void;
  requestMyLocation: () => void;
};

export const useMapControlStore = create<MapControlState>((set) => ({
  markerPlacementMode: "none",
  myLocationRequestSeq: 0,

  startMoveMyMarker: () => set({ markerPlacementMode: "my" }),
  startMoveDest: () => set({ markerPlacementMode: "dest" }),
  cancelMarkerPlacement: () => set({ markerPlacementMode: "none" }),
  completeMarkerPlacement: () => set({ markerPlacementMode: "none" }),
  requestMyLocation: () =>
    set((state) => ({ myLocationRequestSeq: state.myLocationRequestSeq + 1 })),
}));

