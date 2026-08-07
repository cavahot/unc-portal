# Spec: cms-live-data-harness

**Change ID:** cms-live-data-harness
**Date:** 2026-08-04
**Depends on:** proposal.md

---

## Part A — Delta for `portal`

### MODIFIED Requirements

#### Requirement: REQ-04 — Homepage: news from CMS

The homepage MUST fetch the 3 most recently published news items (`sort=-publishedAt`, `limit=3`) with no `featured` filter applied. If the CMS is unreachable, the system MUST return `DEMO_NEWS` silently.

(Previously: fetched 6 news items — `limit: 6` — with no constraint on sort order documented)

##### Scenario: CMS available with published news

- GIVEN the CMS has at least one published noticia
- WHEN a visitor loads the homepage
- THEN exactly 3 news cards are rendered, ordered from newest to oldest
- AND each card displays title, date, and a valid image src

##### Scenario: CMS unreachable

- GIVEN the CMS does not respond within the timeout
- WHEN a visitor loads the homepage
- THEN fallback DEMO_NEWS cards render without an error state

##### Scenario: Fewer than 3 published noticias exist

- GIVEN only 1 or 2 noticias are published
- WHEN the homepage renders
- THEN only those N cards appear; no empty placeholders are visible

---

#### Requirement: REQ-05 — Homepage: institutional stats from CMS global

The homepage MUST read institutional stat values from the Payload `Estadisticas` global via `getStatsGlobal()`. `diasActividad` MUST be computed at runtime from `FOUNDING_DATE = 2009-08-03`; it MUST NOT be persisted in the CMS. If the global returns null or the CMS is unreachable, FALLBACK_STATS values MUST be used. A zero value from the CMS (e.g., `totalEstudiantes = 0`) MUST be treated as missing and replaced by the fallback value.

(Previously: REQ-05 displayed 6 hardcoded constants inside a client component with no CMS integration)

##### Scenario: Global has valid data

- GIVEN the `Estadisticas` global contains positive values for all 5 fields
- WHEN the homepage renders
- THEN StatsBlock displays those CMS values plus the runtime-computed `diasActividad`

##### Scenario: CMS unreachable or global missing

- GIVEN the CMS is down or the global has never been seeded
- WHEN the homepage renders
- THEN StatsBlock displays FALLBACK_STATS values and no error is surfaced to the user

##### Scenario: An editorial team member updates a stat

- GIVEN a CMS admin saves a new value in the `Estadisticas` global
- WHEN Payload fires the `afterChange` hook
- THEN the portal revalidates the `estadisticas` tag and the next request reflects the new value

---

## Part B — New Specification: `cms-estadisticas`

### Purpose

Payload global that makes institutional statistics editable without deploys. Provides the data contract and graceful-degradation fallback for the portal homepage.

### Requirements

#### Requirement: STATS-01 — Payload Global `Estadisticas`

The CMS MUST expose a global named `Estadisticas` with five required numeric fields (`totalEstudiantes`, `totalDocentes`, `totalEgresados`, `totalCarrerasAcreditadas`, `totalFacultades`), each with minimum value 0. The global MUST be publicly readable. An `afterChange` hook MUST call `revalidatePortalTag('estadisticas')`.

##### Scenario: Fields saved with valid values

- GIVEN an admin submits the global form with five positive integers
- WHEN Payload persists the document
- THEN the REST endpoint `GET /api/globals/estadisticas` returns all five fields as numbers

##### Scenario: afterChange revalidation fires

- GIVEN the global is saved in the CMS
- WHEN `afterChange` executes
- THEN the portal cache tag `estadisticas` is invalidated

---

#### Requirement: STATS-02 — `getStatsGlobal()` query with fallback

`lib/cms/queries/stats.ts` MUST export `StatsData` (interface with the 5 fields), `FALLBACK_STATS` (constant with current hardcoded values), and `getStatsGlobal(): Promise<StatsData>`. The function MUST fetch with `next: { tags: ['estadisticas'] }` and MUST catch all errors by returning `FALLBACK_STATS`.

##### Scenario: Successful fetch

- GIVEN the CMS is reachable
- WHEN `getStatsGlobal()` is called
- THEN it resolves to a `StatsData` object with all 5 fields as non-negative numbers

##### Scenario: Network error

- GIVEN the CMS throws or times out
- WHEN `getStatsGlobal()` is called
- THEN it resolves to `FALLBACK_STATS` without throwing

---

#### Requirement: STATS-03 — Server/client component split

`StatsBlock.tsx` MUST be a React Server Component that calls `getStatsGlobal()` and passes resolved data as props to `StatCounter.tsx`. `StatCounter.tsx` MUST carry `'use client'` and own all IntersectionObserver and animation logic. Neither component MAY fetch data from the client.

##### Scenario: Rendering pipeline

- GIVEN the homepage is server-rendered
- WHEN Next.js resolves `StatsBlock`
- THEN data is fetched server-side, `diasActividad` is computed server-side, and only serializable props cross the RSC boundary

---

## Part C — New Specification: `test-harness`

### Purpose

RDD fixtures define the CMS response contract before implementation. Vitest integration tests and Playwright E2E validate the portal against a running environment.

### Requirements

#### Requirement: TEST-01 — RDD fixtures and Zod schemas

JSON fixtures in `tests/fixtures/cms-responses/` (`stats.fixture.json`, `news.fixture.json`) MUST exactly match the `StatsData` and `NewsItem` interfaces. Zod schemas in `tests/fixtures/schemas.ts` MUST validate these shapes. Fixtures MUST be authored before implementation begins.

##### Scenario: Schema validation passes for valid fixture

- GIVEN `stats.fixture.json` is loaded
- WHEN validated against `statsSchema`
- THEN validation succeeds with no errors

##### Scenario: Schema rejects malformed data

- GIVEN an object is missing one required numeric field
- WHEN validated against `statsSchema`
- THEN Zod returns a validation error identifying the missing field

---

#### Requirement: TEST-02 — Vitest integration tests

`tests/integration/stats.int.spec.ts` MUST fetch `http://localhost:3002/api/globals/estadisticas` and assert the response matches `statsSchema` with all 5 fields as numbers >= 0. `tests/integration/news.int.spec.ts` MUST fetch the published noticias endpoint with `limit=3` and assert array length <= 3 and each item matches `newsItemSchema`. These tests MUST be isolated in a separate Vitest suite (`test:int`) so they are not run in CI without a live CMS.

##### Scenario: Integration suite runs against live CMS

- GIVEN the CMS is running at `localhost:3002`
- WHEN `npm run test:int` executes
- THEN both spec files pass with no assertion failures

---

#### Requirement: TEST-03 — Playwright E2E for homepage stats

`tests/e2e/homepage.spec.ts` MUST navigate to `http://localhost:3000`, assert the stats section is visible, scroll into it, wait for the animation to complete, assert all counter values are non-zero integers, and assert exactly 3 news cards are visible each with a title and a date.

##### Scenario: Homepage loaded with CMS data

- GIVEN the portal and CMS are both running
- WHEN Playwright loads `http://localhost:3000` and scrolls to the stats section
- THEN all 5 stat counters show non-zero values after the animation
- AND 3 news cards are present, each with a non-empty title and formatted date

##### Scenario: Stats animation fires once

- GIVEN the visitor scrolled past the stats section and returned
- WHEN Playwright inspects the counters
- THEN counters show the final values (no restart of animation)

---

## NFR additions

| Constraint | Value |
|---|---|
| TypeScript typecheck | `tsc --noEmit` MUST pass after all changes |
| Zero hardcoded stats | No stat constant outside `FALLBACK_STATS` or fixture |
| Fallback silent | No user-visible error when CMS is unreachable |
| Vitest scope | Integration tests MUST NOT run in standard `test` script |
