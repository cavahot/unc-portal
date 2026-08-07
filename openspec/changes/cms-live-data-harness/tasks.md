# Tasks: cms-live-data-harness

**Change ID:** cms-live-data-harness
**Date:** 2026-08-04
**Phase:** tasks
**Spec:** spec.md | **Design:** design.md

---

## Batch 1 — RDD Contracts (do first, before any implementation)

These fixtures define the CMS response contract. Implementation is derived from them, not the other way around.

- [x] **TASK-01**: Create `tests/fixtures/cms-responses/stats.fixture.json`
  Write a JSON object with all 5 fields: `{ "totalEstudiantes": 4985, "totalDocentes": 762, "totalEgresados": 672, "totalCarrerasAcreditadas": 10, "totalFacultades": 6 }`. This is the contract the CMS global must satisfy. Satisfies: TEST-01.

- [x] **TASK-02**: Create `tests/fixtures/cms-responses/news.fixture.json`
  Write a JSON array of 3 NewsItem objects matching the `NewsItem` interface (id, slug, title, summary, publishedAt, category, featured, author fields populated; featuredImage nullable). Satisfies: TEST-01.

- [x] **TASK-03**: Create `tests/fixtures/schemas.ts`
  Export `statsSchema` (Zod object with 5 numeric fields, each `z.number().min(0)`) and `newsItemSchema` (Zod object matching `NewsItem` interface fields). Import `z` from `zod`. Satisfies: TEST-01.

> TASK-01, TASK-02, TASK-03 can run in parallel.

---

## Batch 2 — CMS Layer

Must be done before portal query layer. `payload-types.ts` regeneration is a dependency for TypeScript typecheck.

- [x] **TASK-04**: Create `apps/cms/src/globals/Estadisticas.ts`
  Follow the `Transparencia.ts` pattern exactly: `slug: 'estadisticas'`, public read, authenticated update. Add 5 required `number` fields with `min: 0`, Spanish labels, and `defaultValue` seeds (students=4985, teachers=762, graduates=672, careers=10, faculties=6). Add `afterChange` hook calling `revalidatePortalTag('estadisticas')`. Satisfies: STATS-01.

- [x] **TASK-05**: Modify `apps/cms/src/payload.config.ts`
  Import `Estadisticas` and append it to the `globals: [...]` array alongside existing globals. Satisfies: STATS-01.

- [x] **TASK-06**: Regenerate `apps/cms/src/payload-types.ts`
  Run `npm run generate:types --workspace=@unc/cms`. Verify the generated file contains the `Estadisticas` type with all 5 numeric fields. Do NOT hand-edit this file. Satisfies: STATS-01 (types contract); also unblocks TASK-07.

> TASK-04 → TASK-05 → TASK-06 (sequential)

---

## Batch 3 — Query and Fallback

Can begin in parallel with TASK-04/05 but must complete before component split (TASK-08).

- [x] **TASK-07**: Create `lib/cms/queries/stats.ts`
  Export:
  - `interface StatsData` with 5 fields (`totalEstudiantes`, `totalDocentes`, `totalEgresados`, `totalCarrerasAcreditadas`, `totalFacultades`: all `number`)
  - `const FALLBACK_STATS: StatsData` = `{ totalEstudiantes: 4985, totalDocentes: 762, totalEgresados: 672, totalCarrerasAcreditadas: 10, totalFacultades: 6 }`
  - `async function getStatsGlobal(): Promise<StatsData>` — fetches `/globals/estadisticas` via `cmsFetch` with `{ tags: ['estadisticas'] }`; coerces each field: `const pick = (v: unknown) => (typeof v === 'number' && v > 0) ? v : null`; falls back field-by-field to `FALLBACK_STATS`; wraps in `try/catch` returning full `FALLBACK_STATS` on error.
  Mirror `lib/cms/queries/news.ts` pattern. Satisfies: STATS-02.

---

## Batch 4 — Component Split

**Critical design decisions for this batch:**

The current `StatsBlock.tsx` uses `useTranslations` (a client hook) and is fully client-side. It must become an async server component.

- [x] **TASK-08**: Create `components/stats/StatCounter.tsx`
  Add `'use client'` directive. Move `easeOutQuart`, `useCountUp` (with `useEffect`, `useRef`, `useState`), and `useFormatter` into this file. Export `interface StatCounterProps { value: number; label: string; prefix?: string; suffix?: string }`. The component renders a `<div>` with the animated count using `useFormatter().number(count)`. Owns its own `IntersectionObserver` (threshold 0.2, self-disconnecting after first intersection). No data fetching, no `useTranslations`. Satisfies: STATS-03.

- [x] **TASK-09**: Modify `components/stats/StatsBlock.tsx` — convert to async server component
  Remove `'use client'` directive, `useTranslations`, `useFormatter`, `useEffect`, `useRef`, `useState`, `useCountUp`, `StatCard`, and all hardcoded stat constants.
  Add `export default async function StatsBlock({ locale, stats }: { locale: string; stats: StatsData })` signature.
  Accept `locale` and `stats` as props (data is fetched in `page.tsx`).
  Compute `diasActividad = daysSinceFounding()` server-side (keep the `FOUNDING_DATE` constant and `daysSinceFounding()` function in this file).
  Use `getT(locale, 'pages.home')` for translated labels — import from `@/lib/i18n/server`.
  Build the stats array from `stats` prop + computed `diasActividad`.
  Render the `<section>` + heading + grid, emitting one `<StatCounter value={...} label={...} />` per cell (import `StatCounter` from `./StatCounter`).
  No IntersectionObserver, no animation logic. Satisfies: STATS-03.

> TASK-08 and TASK-09 can be written in parallel but TASK-09 imports TASK-08 — write TASK-08 first or in the same commit.

---

## Batch 5 — Homepage Wiring

Depends on TASK-07 (query) and TASK-09 (component signature change).

- [x] **TASK-10**: Modify `app/[locale]/page.tsx`
  1. Add import: `import { getStatsGlobal } from '@/lib/cms/queries/stats'`
  2. Change `Promise.all` to include `getStatsGlobal()`:
     ```ts
     const [t, format, { docs: noticias }, stats] = await Promise.all([
       getT(locale, 'pages.home'),
       getF(locale),
       getNews({ limit: 3 }),
       getStatsGlobal(),
     ])
     ```
  3. Change `getNews({ limit: 6 })` → `getNews({ limit: 3 })`.
  4. Change `<StatsBlock />` → `<StatsBlock locale={locale} stats={stats} />`.
  Satisfies: REQ-04, REQ-05.

---

## Batch 6 — Test Infrastructure Setup

Can be done in parallel with Batches 4–5 but must be in place before Batches 7–9.

- [x] **TASK-11**: Add devDependencies and scripts to `package.json` (portal workspace)
  Add: `vitest`, `@vitejs/plugin-react` (if needed for JSX transforms), `zod`.
  Add scripts:
  - `"test": "vitest run tests/unit"`
  - `"test:int": "vitest run tests/integration --config vitest.int.config.ts"`
  Add `@playwright/test` as devDependency (or in the root `package.json`).
  Add script: `"test:e2e": "playwright test"`.
  Satisfies: TEST-02, TEST-03.

- [x] **TASK-12**: Create `vitest.config.ts` (portal root)
  Configure for the unit suite: `environment: 'node'`, `include: ['tests/unit/**/*.spec.ts']`. Import `defineConfig` from `vitest/config`. No special aliases needed beyond path mapping (`@/` → project root). Satisfies: TEST-02.

- [x] **TASK-13**: Create `vitest.int.config.ts` (portal root)
  Same as `vitest.config.ts` but `include: ['tests/integration/**/*.spec.ts']`. This keeps integration tests out of the standard `test` CI script. Satisfies: TEST-02.

- [x] **TASK-14**: Create `playwright.config.ts` (portal root)
  Set `baseURL: 'http://localhost:3000'`, `testDir: 'tests/e2e'`, use `chromium` project only, `timeout: 30_000`. Satisfies: TEST-03.

- [x] **TASK-15**: Install Playwright browser
  Run `npx playwright install --with-deps chromium`. This is a one-time setup step; note it in the project README or a dev-setup script. Satisfies: TEST-03 (prerequisite).

> TASK-11 → TASK-12, TASK-13, TASK-14 (TASK-11 first, then the rest in parallel). TASK-15 can run anytime after TASK-11.

---

## Batch 7 — Unit Tests

Depends on: TASK-01, TASK-02, TASK-03 (fixtures + schemas), TASK-07 (query), TASK-12 (vitest config).

- [x] **TASK-16**: Create `tests/unit/schemas.spec.ts`
  Import `statsSchema` and `newsItemSchema` from `../../tests/fixtures/schemas`. Import fixtures from `../../tests/fixtures/cms-responses/`.
  Assert: `statsSchema.parse(statsFixture)` succeeds (no throw).
  Assert: `newsItemSchema.parse(newsFixture[0])` succeeds.
  Assert: `statsSchema.safeParse({ totalEstudiantes: 'bad' }).success` is `false`.
  Satisfies: TEST-01.

- [x] **TASK-17**: Create `tests/unit/stats.unit.spec.ts`
  Mock `lib/cms/client.cmsFetch`:
  - Test 1: when `cmsFetch` resolves with the stats fixture, `getStatsGlobal()` returns those values.
  - Test 2: when `cmsFetch` rejects, `getStatsGlobal()` resolves to `FALLBACK_STATS` (no throw).
  - Test 3: when `cmsFetch` resolves with a field as `0`, that field resolves to the corresponding `FALLBACK_STATS` value.
  - Test 4: `daysSinceFounding()` returns a number > 6000 (sanity check that FOUNDING_DATE is correct).
  Satisfies: STATS-02, TEST-01.

> TASK-16 and TASK-17 can run in parallel.

---

## Batch 8 — Integration Tests

Depends on: TASK-03 (schemas), TASK-13 (int vitest config). Requires CMS running at `localhost:3002` — these tests are skipped when unreachable.

- [x] **TASK-18**: Create `tests/integration/stats.int.spec.ts`
  `beforeAll`: ping `http://localhost:3002/api/globals/estadisticas`; if it throws, call `describe.skip`.
  Main test: fetch the endpoint, parse JSON, validate against `statsSchema`. Assert all 5 fields are `number >= 0`. Satisfies: TEST-02, STATS-01.

- [x] **TASK-19**: Create `tests/integration/news.int.spec.ts`
  `beforeAll`: ping `http://localhost:3002/api/noticias?limit=3`; skip suite if unreachable.
  Main test: fetch with `limit=3&sort=-publishedAt&where[_status][equals]=published`, assert `docs.length <= 3`, validate `docs[0]` against `newsItemSchema`. Satisfies: TEST-02, REQ-04.

> TASK-18 and TASK-19 can run in parallel.

---

## Batch 9 — E2E Test

Depends on: TASK-14, TASK-15 (Playwright config + browser install), TASK-09/TASK-10 (component + homepage wiring complete). Requires both portal and CMS running.

- [x] **TASK-20**: Create `tests/e2e/homepage.spec.ts`
  Use `@playwright/test`. Single `test('homepage stats and news', ...)`:
  1. Navigate to `baseURL` (`/es` or `/`).
  2. Locate the stats section (`section#stats` or by aria label).
  3. Scroll it into view with `scrollIntoViewIfNeeded()`.
  4. `waitForTimeout(1200)` for rAF animation to settle.
  5. Assert all 6 counter elements (5 CMS stats + diasActividad) contain text that parses to `parseInt > 0`.
  6. Count news card elements; assert count === 3.
  7. For each card, assert title text is non-empty and date element is visible.
  Satisfies: TEST-03, REQ-04, REQ-05.

---

## Dependency Summary

```
TASK-01, TASK-02, TASK-03 (parallel) ─────────────────────────────────────────────────┐
                                                                                        │
TASK-04 → TASK-05 → TASK-06 (sequential)                                               │
                                                                                        ▼
TASK-07 (query, parallel with 04-06)        TASK-16, TASK-17 (parallel) ─── TASK-12 ──┘
    │
    ├─ TASK-08 (StatCounter)
    │       │
    └─ TASK-09 (StatsBlock) ─── TASK-10 (page.tsx)
                                        │
TASK-11 → TASK-12, TASK-13, TASK-14 ───┤
TASK-15 (anytime after 11)              │
                                        ▼
                            TASK-16, TASK-17 (unit tests)
                            TASK-18, TASK-19 (int tests) ── require CMS running
                            TASK-20 (E2E) ─────────────── require portal + CMS running
```

**Sequential bottlenecks:**
- TASK-04 → TASK-05 → TASK-06 must be sequential (each depends on the previous).
- TASK-06 (type regeneration) must complete before any portal code that imports Payload types.
- TASK-07 must complete before TASK-09 (StatsBlock needs `StatsData` type).
- TASK-08 and TASK-09 should land in the same commit (TASK-09 imports TASK-08).

---

## Review Workload Forecast

| Metric | Value |
|---|---|
| Estimated changed lines (implementation) | ~243 |
| Estimated changed lines (tests + config) | ~295 |
| Total estimated changed lines | ~538 |
| Chained PRs recommended | **Yes** |
| 400-line budget risk | High |
| Decision needed before apply | Yes |

**Reason:** Total diff (~538 lines across 16+ files) exceeds the 400-line single-PR budget. The natural split is:

- **PR 1 (implementation):** TASK-01 through TASK-10 (~243 lines). Delivers the full feature end-to-end: CMS global, query, component split, homepage wiring. Verifiable against a running environment without tests.
- **PR 2 (test harness):** TASK-11 through TASK-20 (~295 lines). Delivers all test infrastructure, unit tests, integration tests, and E2E — locked to the contracts established in PR 1.

If the team prefers a single PR, apply `size:exception` before `sdd-apply`.
