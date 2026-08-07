# Apply Progress: cms-live-data-harness — PR 1 + PR 2

**PR 1:** TASK-01 through TASK-10 — Complete
**PR 2:** TASK-11 through TASK-20 — Complete
**Date:** 2026-08-04
**Status:** Complete (all tasks done)

## Tasks

- [x] **TASK-01**: Created `tests/fixtures/cms-responses/stats.fixture.json`
- [x] **TASK-02**: Created `tests/fixtures/cms-responses/news.fixture.json`
- [x] **TASK-03**: Created `tests/fixtures/schemas.ts` (zod added to package.json dependencies)
- [x] **TASK-04**: Created `apps/cms/src/globals/Estadisticas.ts`
- [x] **TASK-05**: Modified `apps/cms/src/payload.config.ts` — Estadisticas imported and added to globals array
- [x] **TASK-06**: Ran `npm run generate:types --workspace=@unc/cms` — `Estadistica` interface generated with all 5 fields
- [x] **TASK-07**: Created `lib/cms/queries/stats.ts` — StatsData, FALLBACK_STATS, getStatsGlobal()
- [x] **TASK-08**: Created `components/stats/StatCounter.tsx` — 'use client', useCountUp, IntersectionObserver
- [x] **TASK-09**: Modified `components/stats/StatsBlock.tsx` — async server component, accepts locale + stats props
- [x] **TASK-10**: Modified `app/[locale]/page.tsx` — added getStatsGlobal() to Promise.all, limit 3, StatsBlock props
- [x] **TASK-11**: Modified `package.json` — added vitest, @vitest/ui, @playwright/test to devDependencies; added test/test:int/test:e2e/test:all scripts
- [x] **TASK-12**: Created `vitest.config.ts` — unit suite, node env, @/* alias
- [x] **TASK-13**: Created `vitest.int.config.ts` — integration suite, 15s timeout, node env
- [x] **TASK-14**: Created `playwright.config.ts` — chromium only, baseURL localhost:3000, testDir tests/e2e
- [x] **TASK-15**: Created `tests/e2e/README.md` — documents playwright install and run steps
- [x] **TASK-16**: Created `tests/unit/schemas.spec.ts` — validates statsSchema and newsItemSchema against fixtures
- [x] **TASK-17**: Created `tests/unit/stats.unit.spec.ts` — mocks cmsFetch, tests getStatsGlobal fallback logic
- [x] **TASK-18**: Created `tests/integration/stats.int.spec.ts` — hits live CMS estadisticas endpoint, skips if unreachable
- [x] **TASK-19**: Created `tests/integration/news.int.spec.ts` — hits live CMS noticias endpoint, skips if unreachable
- [x] **TASK-20**: Created `tests/e2e/homepage.spec.ts` — 3 tests: news cards count, 6 stat labels, counter values > 0

## Notes (PR 2)
- vitest and @playwright/test NOT yet installed. User must run `npm install` before running any test command.
- Playwright browser NOT yet installed. User must run `npx playwright install --with-deps chromium` after npm install.
- vi.mock path in stats.unit.spec.ts: `'../../lib/cms/client'` — matches the actual module resolution from the test file location.
- Unit tests use vi.resetModules() + dynamic import per test to ensure mock isolation across the module cache.
- Integration tests gracefully skip when CMS is not reachable (catch block + early return).
