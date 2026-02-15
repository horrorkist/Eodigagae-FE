# TODO

## Pre-walk location periodic refresh

- [ ] Add periodic location updates before entering walking mode (`walking === false`).
- [ ] Keep current one-shot initialization, and add a toggleable background refresh strategy:
  - Option A: `useGeolocation({ watch: true })` only while not walking.
  - Option B: `setInterval + refresh()` with a configurable interval.
- [ ] Prevent map jitter:
  - Ignore tiny coordinate changes under a minimum move threshold.
  - Preserve manual marker move mode behavior (`manualPosRef`).
- [ ] Ensure walking mode transition is clean:
  - Stop pre-walk periodic updates immediately on `START_WALKING`.
  - Resume pre-walk periodic updates on `STOP_WALKING`.
- [ ] Add config constants:
  - `PREWALK_UPDATE_INTERVAL_MS`
  - `PREWALK_MIN_MOVE_M`
  - Optional `PREWALK_MAX_ACCURACY_M`
- [ ] Add debug logs for pre-walk updates (source, accepted/rejected reason).
- [ ] Verify on mobile:
  - Stationary device: no unnecessary pan/move spam.
  - Slow drift: controlled updates only.
  - Resume from walking to idle: updates restart correctly.

## Search

- [ ] Add search autocomplete suggestions (debounced input, suggestion dropdown, keyboard selection).
- [x] Fix POI toggle chip not activating on initial app mount when `myPos` is not yet available.
- [ ] Fix desktop/trackpad backdrop click-through while bottom sheet is open:
  - Backdrop tap/click should only close the sheet.
  - Must not trigger underlying `MapOverlay` actions (search bar route, POI chip toggle).
  - Validate on desktop mouse + trackpad and mobile touch.

## Upcoming Features

- [ ] Build onboarding page.
- [ ] Add walking history page and list view.
- [ ] Support camera switching during walk mode.
- [ ] Save photos taken during a walk to the walking history.
- [ ] Design destination marker UI.
