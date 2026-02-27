# Smoke Tests

## Commands
- Parser fixture checks:
  - `npm run test:smoke:parser`
- App/API smoke checks (starts `next dev` temporarily):
  - `npm run test:smoke:app`
- Run all:
  - `npm run test:smoke`

## Covered Scenarios
- Home page check is optional (`SMOKE_STRICT_HOME=1` when strict verification is needed).
- `/search` route compatibility should redirect to home search overlay (`/?search=1&focus=1`).
- `/api/petpois` validation guard works for missing `lat/lng`.
- `/api/tmap/pedestrian` validation guard works for malformed payload.
- `extractTmapPedestrian`:
  - deterministic success fixture parsing
  - points-only payload failure guard

## Notes
- These are baseline regression guards for refactor safety, not full E2E tests.
- No network call to external map providers is required for smoke pass.
- App smoke runner uses `NEXT_DIST_DIR=.next-smoke` by default to avoid colliding with existing `next dev` lock files, and cleans it up after run.
