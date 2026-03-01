# Architecture Review (2026-02-27)

## Scope
- Target: map/walk/poi/search/route-recommend flow across `app`, `components`, `hooks`, `stores`, `services`, `api`.
- Goal: identify duplicate logic, over-complex logic, and architectural risks without changing behavior.

## Executive Summary
- Architecture direction (`domain`/`features`/`adapters` split) is good and already reflected in route/walk logic.
- Main risks now are:
  - control-plane mixing (`EventBus` + direct Zustand actions),
  - orchestration concentration in single large containers,
  - unresolved production blockers (dummy route recommend forced on, failing route-tracking unit test).
- Decision update (2026-02-28): bottom/focused sheets use a fixed non-cover policy, and bottom nav visibility is controlled only by `isBottomChromeVisible` + route/onboarding exceptions.

## High Priority Findings

### 1) Route recommendation is hard-wired to dummy path
- File: `services/routeRecommend.ts`
- Evidence:
  - `USE_DUMMY_ROUTE_RECOMMEND = true` (line 13)
  - API branch bypassed by default (line 182)
- Risk:
  - server recommendation pipeline (`/api/routes/recommend`) is effectively dead in real runtime.
  - user-visible recommendation quality cannot improve regardless of backend changes.

### 2) Potential runtime crash when POI type is unexpected
- File: `lib/focusedPoi.ts`
- Evidence:
  - direct access: `POI_STYLES[item.contenttypeid].label` (line 39)
  - safe fallback exists elsewhere: `getPoiStyle(...)` in `lib/poiMarker.ts` (line 49)
- Risk:
  - if upstream sends unknown `contenttypeid`, app can throw during focus mapping.

### 3) Route editing flow can unintentionally reuse stale route
- Files:
  - `app/(map)/page.tsx`
  - `components/MapOverlay.tsx`
  - `hooks/useMapMyLocation.ts`
- Evidence:
  - edit action clears `drawRoute` but not `route` object (`app/(map)/page.tsx`, line 352+)
  - start condition checks `route.path` existence (`components/MapOverlay.tsx`, line 77)
  - `START_WALKING` re-enables draw route using existing route path (`hooks/useMapMyLocation.ts`, line 380)
- Risk:
  - user may start walking on an outdated route after edit path.

## Medium Priority Findings

### 4) Route tracking unit test command is currently broken
- Command: `npm run test:unit:route-tracking`
- Result: `ERR_MODULE_NOT_FOUND`
- Evidence:
  - `features/route/tracking/snap.ts` line 1 imports `../../../lib/geo` without extension in node test runtime.
- Impact:
  - regression safety net for route tracking is non-functional.

### 5) EventBus + store dual control remains in pet/map/ui flows
- Key files:
  - `hooks/usePetPoiController.ts`
  - `hooks/useMapMyLocation.ts`
  - `hooks/useUiChromeController.ts`
- Evidence:
  - pet toggle both writes store and emits/consumes same event (`PETPOI_TOGGLE`) in same hook.
  - map walking lifecycle still event-driven while many map controls are direct store actions.
- Risk:
  - harder traceability, subtle feedback loops in future feature additions.

### 6) Route recommendation API validation is serial
- File: `app/api/routes/recommend/route.ts`
- Evidence:
  - shortlist loop validates each candidate in sequence, each with two upstream route calls.
- Risk:
  - latency grows linearly with shortlist size and increases timeout exposure.

## Low Priority Findings (Maintainability)

### 7) Marker synchronization logic is duplicated
- Files:
  - `hooks/useMapPetPoi.ts`
  - `hooks/useMapSearchResultPoi.ts`
- Duplication pattern:
  - normalize -> diff keys -> update/create/remove marker entries -> cleanup/pending sync.
- Risk:
  - behavior drift and bug fixes needing repeated patches.

### 8) Distance/speed constants and helper calculations are duplicated
- Examples:
  - `haversineMeters` duplicated in:
    - `features/walk/location/filters.ts`
    - `features/route/tracking/path.ts`
    - `services/routeRecommend.ts`
    - `app/api/routes/recommend/route.ts`
  - `WALK_SPEED_M_PER_MIN = 67` duplicated in:
    - `components/PoiCard.tsx`
    - `components/FocusedPoiSheet.tsx`
    - `app/api/tmap/pois/route.ts`
- Risk:
  - numeric drift over time and inconsistent UX/API behavior.

### 9) Orchestration concentration in large container files
- Largest hotspots:
  - `app/(map)/page.tsx` (~674 LOC)
  - `components/map-page/SearchOverlayPanel.tsx` (~708 LOC)
  - `components/BottomSheet.tsx` (~632 LOC)
  - `hooks/useMapMyLocation.ts` (~600 LOC)
- Risk:
  - high cognitive load, difficult change impact analysis, test fragmentation.

## Architectural Assessment

### Strengths
- `features/route/tracking/*` and `features/walk/location/*` extraction improved testability of pure logic.
- `adapters/map/naver/*` split reduced direct SDK spread in some route/walk paths.
- persistent map runtime (`MapRuntimeProvider` + bridges) is a solid direction for cross-page continuity.

### Gaps
- Control-plane is not fully unified:
  - 일부는 store action, 일부는 EventBus event.
- API boundary normalization utilities are duplicated per route handler.
- UI containers still hold both presentation and flow orchestration concerns.

## Recommended Next Steps (Doc-level)

1. Stabilize correctness blockers first
- turn off forced dummy mode switch-by-env (or remove hardcoded true)
- fix POI style fallback access in focus mapper
- fix stale route reuse on route-edit -> walk-start transition

2. Restore test baseline
- fix `test:unit:route-tracking` module resolution and keep it green in routine checks

3. Simplify control plane
- define explicit rule: map-local action => store/callback, cross-cutting => EventBus
- remove self-echo event paths (especially pet toggle flow)

4. Reduce duplication incrementally
- shared geo utility for distance calculations
- shared marker diff/sync utility for map marker hooks
- shared API query parsing/normalization helpers

5. Continue decomposition of orchestration containers
- split `app/(map)/page.tsx` into page-level state coordinator + feature sections
- split search overlay state persistence/recent-history/service concerns into dedicated modules

## Validation Snapshot
- Passed: `npm run test:unit:walk-location`
- Failed: `npm run test:unit:route-tracking` (`ERR_MODULE_NOT_FOUND`)
