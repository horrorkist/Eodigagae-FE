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

- [x] Integrate search page UX into home as an overlay panel (`/?search=1&focus=1`).
- [x] Replace bottom nav search tab with history tab (`/history` placeholder page).
- [x] Keep `/search` backward compatibility via redirect to `/?search=1&focus=1`.
- [x] Remove `UI_BOTTOM_CHROME_HIDE_ON_NEXT_HOME` dead path after home-overlay integration.
- [x] Keep map instance alive globally while hiding map visuals outside home.
- [x] Add rollback switch for global map persist:
  - `NEXT_PUBLIC_MAP_PERSIST_GLOBAL=1` -> global persist mode (default).
  - `NEXT_PUBLIC_MAP_PERSIST_GLOBAL=0` -> rollback to `(map)` layout-mounted map mode.
- [x] Add emergency rollback procedure for search layout regressions:
  - First response: set `NEXT_PUBLIC_MAP_PERSIST_GLOBAL=0` and restart app.
  - After hotfix verification: set `NEXT_PUBLIC_MAP_PERSIST_GLOBAL=1` and restart app.
- [ ] QA:
  - `/search` redirect + autofocus works.
  - Home search overlay blocks underlying map interactions.
  - Search submit closes overlay and reveals home search-results sheet.
  - Search result item opens focused POI detail without bottom nav regressions.
- [ ] Add search autocomplete suggestions (debounced input, suggestion dropdown, keyboard selection).
- [x] Fix POI toggle chip not activating on initial app mount when `myPos` is not yet available.
- [ ] Fix desktop/trackpad backdrop click-through while bottom sheet is open:
  - Backdrop tap/click should only close the sheet.
  - Must not trigger underlying `MapOverlay` actions (search bar route, POI chip toggle).
  - Validate on desktop mouse + trackpad and mobile touch.

## POI Focus Flow (KTO + TMAP)

- [ ] Define a unified `FocusedPoi` model used by both KTO list and TMAP search results.
  - Required fields: `id`, `source`, `name`, `lat`, `lng`, `bizCategory`, `distanceM`, `middleAddress`, `jibunAddress`, `roadAddress`.
  - Optional fields: `tel`, `thumbnail`, `raw` (for debugging).
- [ ] Add `focusedPoi` state to a global store (likely `mapStore`) with actions:
  - `setFocusedPoi(poi)`
  - `clearFocusedPoi()`
- [ ] Add mapper utilities:
  - KTO (`PetPoiItem`) -> `FocusedPoi`
  - TMAP (`TmapPoi`) -> `FocusedPoi`
- [ ] Extend TMAP response model so UI can render `middleAddress` explicitly.
  - Include `middleAddrName` in API normalization and `types/tmapPoi.ts`.
- [ ] Define fallback policy for missing addresses from KTO/TMAP:
  - If `middleAddress`/`jibunAddress`/`roadAddress` missing, render `"-"` (no extra API call for now).
- [ ] Implement common POI click behavior for both lists:
  - Save clicked POI into `focusedPoi`.
  - Move map center to POI coordinate.
  - Open main bottom sheet to middle snap and show POI detail content.
- [ ] Implement search-page click routing flow:
  - On search result click, store `focusedPoi` then route to `/`.
  - On main page mount, consume pending focus state and move center/snap sheet.
- [ ] Make map-center move robust when map instance is not ready yet:
  - Avoid dropped center-move command during page transition.
  - Apply center move after map initialization if needed.
- [ ] Add bottom-sheet detail rendering mode for focused POI:
  - Display: `업체명`, `업종`, `거리`, `middleAddress`, `지번주소`, `도로명 주소`.
  - Keep existing non-POI main content and POI list tab behavior intact.
- [ ] Decide relation between `focusedPoi` and `pickedPos` (route destination):
  - Option A: keep separate (recommended for minimal regression).
  - Option B: sync `pickedPos` automatically on POI focus.
- [ ] QA checklist:
  - Click from KTO list on main page -> map centers + sheet middle snap + detail renders.
  - Click from TMAP search page -> routes to `/` + map centers + sheet middle snap + detail renders.
  - Missing address fields render gracefully.
  - Existing walking/route/manual marker flows are not regressed.

## Upcoming Features

- [ ] Build onboarding page.
- [ ] Add walking history page and list view.
- [ ] Support camera switching during walk mode.
- [ ] Save photos taken during a walk to the walking history.
- [ ] Design destination marker UI.

## Icons

- [ ] Consider migrating `AppIcon` to load raw SVG files from `public/icons` (or SVGR import) to avoid duplicating path data in TSX.
