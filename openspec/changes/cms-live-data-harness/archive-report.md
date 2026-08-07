# Archive Report: cms-live-data-harness

**Change ID:** cms-live-data-harness
**Archived:** 2026-08-04
**Status:** archived

---

## What was built

Connected the portal homepage to live CMS data and established a full test harness (RDD + unit + integration + E2E).

**PR 1 — Feature slice:**
- `apps/cms/src/globals/Estadisticas.ts` — Payload GlobalConfig (5 numeric fields, afterChange revalidation)
- `lib/cms/queries/stats.ts` — `getStatsGlobal()` with field-by-field fallback
- `components/stats/StatCounter.tsx` — client animation (IntersectionObserver + rAF)
- `components/stats/StatsBlock.tsx` — async server component, locale + stats props
- `app/[locale]/page.tsx` — `getStatsGlobal()` + `getNews({ limit: 3 })` via Promise.all
- `tests/fixtures/cms-responses/stats.fixture.json` + `news.fixture.json` — RDD contracts
- `tests/fixtures/schemas.ts` — Zod schemas

**PR 2 — Test harness:**
- `vitest.config.ts`, `vitest.int.config.ts`, `playwright.config.ts`
- `tests/unit/schemas.spec.ts`, `tests/unit/stats.unit.spec.ts`
- `tests/integration/stats.int.spec.ts`, `tests/integration/news.int.spec.ts`
- `tests/e2e/homepage.spec.ts`

---

## Test results at archive

| Suite | Tests | Result |
|---|---|---|
| Unit | 10 | ✅ |
| Integration | 2 | ✅ |
| E2E | 3 | ✅ |

---

## Open warnings

- **W-01** (open): TS errors in `contacto/page.tsx` + `institucional/page.tsx` — pre-existing, next-intl MessageKeys. Fix before production TypeScript gate.
- **W-02** (resolved): `daysSinceFounding()` unit test added post-verify.
- **W-03** (resolved): Integration skip uses `ctx.skip()` post-verify.
