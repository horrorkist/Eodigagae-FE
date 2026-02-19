# Architecture Refactor Plan

## Scope
- Target: map/walk/poi/route-recommend architecture.
- Constraint: preserve existing behavior while reducing coupling and file complexity.
- Horizon: 1-2 weeks, incremental PRs, safe rollback per PR.

## Current Pain Points
- Route recommendation flow is not connected end-to-end.
  - `components/MapOverlay.tsx`
  - `app/page.tsx`
  - `app/api/routes/recommend/route.ts`
- Large files mix UI, domain logic, SDK handling, and state orchestration.
  - `hooks/useMapMyLocation.ts`
  - `hooks/useMapRoute.ts`
  - `components/MapOverlay.tsx`
  - `components/DogInfoForm.tsx`
- Mixed control plane (EventBus + direct Zustand actions) increases tracing difficulty.
  - `hooks/useEventBus.ts`
  - `hooks/useMapMyLocation.ts`
  - `components/MapOverlay.tsx`
- Domain types are coupled to store layer.
  - `stores/mapStore.ts`
  - `types/routeRecommend.ts`

## Target Architecture
- `domain/*`: pure types/rules (no React, no SDK, no store dependency).
- `features/*`: user-facing use cases and screen orchestration.
- `adapters/map/naver/*`: Naver SDK-specific rendering and listeners.
- `infrastructure/api/*`: upstream API clients and response normalization.
- `stores/*`: state only (no parsing/business rules).

## Execution Order (PR Plan)

### PR 1: Baseline Safety Net (0.5-1 day)
- Status: completed
- Add smoke-level checks for critical flows:
  - map init
  - pet POI toggle fetch
  - route request failure/success parsing
- Add deterministic fixtures for route parsing.
- Outcome:
  - Refactor PRs can verify behavior parity quickly.
- Done when:
  - CI (or local script) validates core flows repeatedly without manual map clicking.

### PR 2: Domain Type Decoupling (0.5-1 day)
- Status: completed
- Move route domain types from store into domain/type modules.
  - New example:
    - `domain/route/types.ts`
    - `domain/poi/types.ts`
- Update imports:
  - `types/routeRecommend.ts` should depend on domain types, not `stores/mapStore.ts`.
- Keep store shape identical (no runtime behavior change).
- Done when:
  - Build/lint pass and no runtime behavior differences.

### PR 3: Route Recommendation Vertical Slice (1-2 days)
- Status: completed
- Connect existing API to client flow (replace dummy route list path).
  - Current disconnected points:
    - `app/page.tsx`
    - `components/MapOverlay.tsx`
    - `components/DogInfoForm.tsx`
    - `app/api/routes/recommend/route.ts`
- Add a dedicated recommendation service + minimal state slice.
  - Example:
    - `services/routeRecommend.ts`
    - `stores/routeRecommendStore.ts`
- Keep existing walk route flow intact (`useRouteActions`) and integrate recommendations as additive UI data.
- Done when:
  - Dummy cards removed.
  - Selecting recommendation can feed map route rendering without regressions.

### PR 4: Map Control Plane Simplification (1-2 days)
- Status: completed
- Reduce event-based map control where direct actions are clearer.
- Rule:
  - Keep EventBus for cross-page/global UI events.
  - Prefer store actions or local callbacks for map-local actions.
- First migration candidates:
  - `MOVE_MY_MARKER_READY/CANCELLED`
  - `MOVE_DEST_READY/CANCELLED`
  - `REQUEST_MY_LOCATION`
- Done when:
  - Fewer `useOn("map", ...)` handlers.
  - Same user interactions still work.

### PR 5: Split `useMapMyLocation` into Submodules (1-2 days)
- Status: completed
- Extract pure logic/util modules:
  - walk distance filters
  - heading update criteria
  - marker HTML builders
  - walking session state transitions
- Keep hook as orchestration entry point only.
- Suggested structure:
  - `features/walk/location/session.ts`
  - `features/walk/location/filters.ts`
  - `adapters/map/naver/userMarker.ts`
- Done when:
  - `hooks/useMapMyLocation.ts` shrinks significantly.
  - Extracted pure modules have unit tests.

### PR 6: Split `useMapRoute` Renderer vs Tracking Logic (1-2 days)
- Status: completed
- Separate concerns:
  - off-route detection / reroute prompt policy
  - geometry helpers
  - polyline and guidance marker rendering
- Suggested structure:
  - `features/route/tracking/*`
  - `adapters/map/naver/routeRenderer.ts`
- Done when:
  - route tracking logic can run without Naver SDK in unit tests.

### PR 7: POI Marker Incremental Update (0.5-1 day)
- Status: completed
- Replace full redraw on each change with keyed diff update.
  - Current hot path:
    - `hooks/useMapPetPoi.ts`
- Strategy:
  - key by stable id (`contentid` or normalized id)
  - add/update/remove deltas only
- Done when:
  - marker redraw cost reduced and focus/label behavior unchanged.

### PR 8: UI Decomposition Cleanup (1 day)
- Status: completed
- Split large UI containers into composable sections:
  - `components/MapOverlay.tsx`
  - `components/DogInfoForm.tsx`
  - `app/page.tsx`
- Keep render output and interactions unchanged.
- Done when:
  - file sizes and hook complexity drop, with no UX regressions.

## Non-Functional Rules
- No destructive rewrites.
- One risky concern per PR.
- Every PR must include:
  - behavior parity checklist
  - rollback path
  - before/after metrics (file size, render/update cost, handler count)

## Suggested Tracking Metrics
- File LOC reduction:
  - `hooks/useMapMyLocation.ts`
  - `hooks/useMapRoute.ts`
  - `components/MapOverlay.tsx`
- EventBus usage count:
  - number of `useOn("map", ...)` subscriptions.
- Marker update work:
  - full redraw count per POI refresh.
- Route recommendation completion:
  - API call -> UI cards -> route render success rate.

## Risks and Mitigation
- Risk: hidden regressions in walking lifecycle.
  - Mitigation: fixture-based checks + debug panel scenario checklist.
- Risk: mixed duration unit bug (sec/ms).
  - Mitigation: define single canonical unit in domain layer and convert only at UI boundary.
- Risk: over-migration in one PR.
  - Mitigation: enforce one-boundary-at-a-time policy.

## Priority Choice (default)
- Default priority used in this plan:
  1. Maintainability and architecture clarity
  2. Regression risk reduction
  3. Performance optimizations

- If needed, reorder quickly:
  - Performance-first: PR 7 -> PR 5 -> PR 6
  - Delivery-first (route recommend): PR 3 first, then PR 2/4/5/6
