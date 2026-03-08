import { create } from "zustand";

export type BottomNavOverrideKind =
  | "none"
  | "route-form-cta"
  | "start-point-cta";

export type RouteFormCtaPayload = {
  formId: string;
  submitLabel: string;
  canSubmit: boolean;
};

export type StartPointCtaPayload = {
  backLabel: string;
  confirmLabel: string;
  confirmDisabled: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

type BottomNavOverrideState = {
  kind: BottomNavOverrideKind;
  routeFormCta: RouteFormCtaPayload | null;
  startPointCta: StartPointCtaPayload | null;
  showRouteFormCta: (payload: RouteFormCtaPayload) => void;
  setRouteFormCanSubmit: (canSubmit: boolean) => void;
  showStartPointCta: (payload: StartPointCtaPayload) => void;
  setStartPointConfirmDisabled: (disabled: boolean) => void;
  clearOverride: () => void;
};

export const useBottomNavOverrideStore = create<BottomNavOverrideState>(
  (set) => ({
    kind: "none",
    routeFormCta: null,
    startPointCta: null,
    showRouteFormCta: (payload) =>
      set({
        kind: "route-form-cta",
        routeFormCta: payload,
        startPointCta: null,
      }),
    setRouteFormCanSubmit: (canSubmit) =>
      set((state) => {
        if (state.kind !== "route-form-cta" || !state.routeFormCta) {
          return state;
        }
        if (state.routeFormCta.canSubmit === canSubmit) {
          return state;
        }
        return {
          routeFormCta: {
            ...state.routeFormCta,
            canSubmit,
          },
        };
      }),
    showStartPointCta: (payload) =>
      set({
        kind: "start-point-cta",
        routeFormCta: null,
        startPointCta: payload,
      }),
    setStartPointConfirmDisabled: (disabled) =>
      set((state) => {
        if (state.kind !== "start-point-cta" || !state.startPointCta) {
          return state;
        }
        if (state.startPointCta.confirmDisabled === disabled) {
          return state;
        }
        return {
          startPointCta: {
            ...state.startPointCta,
            confirmDisabled: disabled,
          },
        };
      }),
    clearOverride: () =>
      set((state) => {
        if (
          state.kind === "none" &&
          state.routeFormCta === null &&
          state.startPointCta === null
        ) {
          return state;
        }
        return {
          kind: "none",
          routeFormCta: null,
          startPointCta: null,
        };
      }),
  }),
);
