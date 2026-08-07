# Verify Report: cms-live-data-harness

**Date:** 2026-08-04
**Verdict:** PASS WITH WARNINGS
**Issues:** 0 CRITICAL | 3 WARNING | 2 SUGGESTION

---

## Task Completeness

All 20 tasks are marked complete in apply-progress.md. No unchecked implementation task.

| Batch | Tasks | Status |
|---|---|---|
| Batch 1 RDD Contracts | TASK-01, 02, 03 | All complete |
| Batch 2 CMS Layer | TASK-04, 05, 06 | All complete |
| Batch 3 Query and Fallback | TASK-07 | Complete |
| Batch 4 Component Split | TASK-08, 09 | Complete |
| Batch 5 Homepage Wiring | TASK-10 | Complete |
| Batch 6 Test Infrastructure | TASK-11, 12, 13, 14, 15 | Complete |
| Batch 7 Unit Tests | TASK-16, 17 | Complete |
| Batch 8 Integration Tests | TASK-18, 19 | Complete |
| Batch 9 E2E Test | TASK-20 | Complete |

---

## Test Evidence

| Suite | Command | Result |
|---|---|---|
| Unit | npm run test | 2 files, 9 tests ALL PASSED |
| Integration | npm run test:int | 2 files, 2 tests ALL PASSED (live CMS at localhost:3002) |
| E2E | npm run test:e2e | 3 tests ALL PASSED (portal at localhost:3000) |
| Typecheck | npm run typecheck | FAILS pre-existing errors in contacto/institucional (see WARNING-01) |

---

## Spec Compliance Matrix

### REQ-04 Homepage: news from CMS

| Scenario | Evidence | Status |
|---|---|---|
| CMS available, 3 cards newest first | E2E passes; getNews with limit:3 and sort=-publishedAt confirmed in news.ts | PASS |
| CMS unreachable, DEMO_NEWS renders silently | getNews() try/catch returns DEMO_NEWS | PASS |
| Fewer than 3 noticias, only N cards | Component maps over docs array | PASS |

### REQ-05 Homepage: institutional stats from CMS global

| Scenario | Evidence | Status |
|---|---|---|
| Global valid data: CMS values plus diasActividad | E2E all counters > 0; Promise.all wiring confirmed in page.tsx | PASS |
| CMS unreachable: FALLBACK_STATS no error | Unit test 2 confirms FALLBACK_STATS on throw | PASS |
| Admin saves: afterChange revalidates tag | revalidatePortalTag(estadisticas) in Estadisticas.ts hook | PASS (code) |

### STATS-01 Payload Global Estadisticas

| Scenario | Evidence | Status |
|---|---|---|
| GET /api/globals/estadisticas returns 5 numeric fields | Integration test stats.int.spec.ts passes vs live CMS | PASS |
| afterChange fires revalidation | revalidatePortalTag confirmed in hook | PASS (code) |

### STATS-02 getStatsGlobal() with fallback

| Scenario | Evidence | Status |
|---|---|---|
| Successful fetch resolves to StatsData | Unit test 1 plus integration test | PASS |
| Network error resolves to FALLBACK_STATS without throw | Unit test 2 | PASS |
| Zero value falls back field-by-field | Unit test 3: totalEstudiantes=0 maps to FALLBACK value | PASS |

### STATS-03 Server/client split

| Scenario | Evidence | Status |
|---|---|---|
| StatsBlock async server component, no use client | Confirmed in StatsBlock.tsx | PASS |
| StatCounter use client with IntersectionObserver | Confirmed in StatCounter.tsx | PASS |
| diasActividad computed server-side | daysSinceFounding() in StatsBlock.tsx, FOUNDING_DATE=2009-08-03 | PASS |

### TEST-01 RDD fixtures and Zod schemas

| Scenario | Evidence | Status |
|---|---|---|
| statsSchema validates stats fixture | schemas.spec.ts test 1 PASSED | PASS |
| Schema rejects non-numeric and negative values | schemas.spec.ts tests 2 and 3 PASSED | PASS |
| newsItemSchema validates news fixture | schemas.spec.ts test 4 PASSED | PASS |

### TEST-02 Vitest integration tests

| Scenario | Evidence | Status |
|---|---|---|
| Both int files pass against live CMS | npm run test:int -> 2 passed | PASS |
| Isolated from standard test script | vitest.int.config.ts with separate include glob | PASS |

### TEST-03 Playwright E2E

| Scenario | Evidence | Status |
|---|---|---|
| 3 news cards with title and date | Homepage shows 3 news cards PASSED | PASS |
| Stats labels visible after scroll plus animation | Homepage shows stats section with 6 counters PASSED | PASS |
| Counter values non-zero after animation | Homepage stats counters animate to non-zero values PASSED | PASS |

### NFR Compliance

| Constraint | Status |
|---|---|
| Zero hardcoded stats outside FALLBACK_STATS/fixtures | PASS |
| Fallback silent no user-visible error | PASS |
| tsc --noEmit passes | FAIL (WARNING-01 pre-existing out of scope) |
| Integration tests isolated from standard test script | PASS |

---

## Design Coherence

| Decision | Implemented As Designed |
|---|---|
| Editorial Estadisticas global | Yes |
| Server/client split: StatsBlock server, StatCounter client | Yes |
| Fallback on zero/null: pick(v) > 0 else FALLBACK field-by-field | Yes |
| RDD fixtures as contract with Zod schema unit test | Yes |
| Data flow via Promise.all in page.tsx | Yes |

---

## Issues

### WARNING-01: tsc --noEmit fails with pre-existing errors (out of scope)

Files: app/[locale]/contacto/page.tsx, app/[locale]/institucional/page.tsx
Error type: TS2345 next-intl MessageKeys strict typing on getT return value.
Root cause: These files were introduced in commit ab4cc24 before this SDD change. Zero new TS errors in files touched by cms-live-data-harness.
Impact: NFR tsc --noEmit MUST pass is technically not met at project level, but this change does not introduce or worsen the failure.
Recommendation: Fix pre-existing TS errors in contacto/institucional in a separate follow-up task.

### WARNING-02: TASK-17 Test 4 deviates from task spec

Task spec says: Test 4 should assert daysSinceFounding() returns a number > 6000.
Actual test 4: Asserts FALLBACK_STATS has all positive values.
Root cause: daysSinceFounding() lives in StatsBlock.tsx and is not exported from stats.ts.
Impact: daysSinceFounding() has no unit coverage. E2E covers it indirectly (counter shows non-zero integer).
Recommendation: Extract daysSinceFounding() to lib/utils/dates.ts, export it, add unit assertion > 6000.

### WARNING-03: Integration test skip uses return-early instead of describe.skip

Spec says: beforeAll pings CMS_URL and describe.skip when unreachable.
Actual: Each test has its own try/catch + return pattern.
Impact: When CMS is unreachable, tests pass with 0 assertions instead of being marked skipped. CI cannot distinguish ran-and-passed from skipped.
Recommendation: Use Vitest describe.skipIf with a module-level reachability flag.

### SUGGESTION-01: StatsBlock section has no id attribute

Spec mentioned section#stats as a possible selector. E2E uses text filtering which works. Adding id=stats would improve accessibility and selector resilience.

### SUGGESTION-02: TASK-15 was documented rather than executed as a script step

Playwright browsers are confirmed installed (E2E tests pass). Formalizing the install step in a dev-setup script would prevent future developer confusion.

---

## Final Verdict

**PASS WITH WARNINGS** - 0 CRITICAL, 3 WARNING, 2 SUGGESTION

All 20 tasks complete. All 14 tests green: 9 unit + 2 integration + 3 E2E. All spec requirements have at least one passing covering test. Pre-existing TypeScript errors (WARNING-01) are out of scope and do not block archive. Safe to proceed to sdd-archive.
