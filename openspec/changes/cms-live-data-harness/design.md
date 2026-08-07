# Design: cms-live-data-harness

## Technical Approach

Add a Payload global `Estadisticas` that follows the existing `Transparencia`/`EnlacesExternos` pattern (public read, authenticated update, `revalidatePortalTag` afterChange). The portal consumes it through `lib/cms/queries/stats.ts`, mirroring `getTransparencia()` — `cmsFetch` with a cache tag plus a `try/catch` fallback to the current hardcoded values. `StatsBlock` is split into an async server component (data + layout) and a `'use client'` `StatCounter` (animation only). A test harness (fixtures + Zod schemas + Vitest integration + Playwright E2E) locks the CMS contract.

## Architecture Decisions

### Decision: Global vs. computed collection counts

| Option | Tradeoff | Decision |
|---|---|---|
| Editorial `Estadisticas` global | Numbers are official figures, not row counts; editorial control; trivial to implement | **Chosen** |
| Aggregate from collection counts | Would report wrong figures (CMS holds a fraction of real records) | Rejected (phase 2 per proposal) |

**Rationale**: 4985 students / 762 teachers are institutional report figures with no CMS source of truth.

### Decision: Server/client boundary in StatsBlock

**Choice**: `StatsBlock.tsx` becomes `async` server component. It receives `locale`, calls `getStatsGlobal()`, computes `diasActividad` via `daysSinceFounding()`, resolves labels with `getT(locale, 'pages.home')`, and renders the `<section>` + heading + grid. It emits one `<StatCounter value label />` per cell. `StatCounter.tsx` is `'use client'` and owns `useCountUp`, `useFormatter`, and its own `IntersectionObserver`.

**Alternatives considered**: (a) keep the grid inside a single client `StatCounters` wrapper receiving an array; (b) lift `IntersectionObserver` to a client wrapper and pass `active` down.

**Rationale**: Keeping the grid markup on the server maximizes the static payload — only six leaf counters ship JS. Per-counter observers are acceptable (6 observers, `threshold: 0.2`, self-disconnecting) and remove the need for a client wrapper that would re-introduce a client boundary around the whole section.

**Consequence**: `StatsBlock` currently uses `useTranslations`; it must switch to `getT(locale, ...)` and `app/[locale]/page.tsx` must pass `locale` (there is no server `getLocale()` helper in `lib/i18n/server.ts`).

### Decision: Fallback on zero/null

**Choice**: `getStatsGlobal()` coerces each field with `pick(raw.x) ?? FALLBACK.x` where a `0`, `null`, or non-finite value falls back. Matches proposal assumption #3.

### Decision: RDD fixtures as the contract source

**Choice**: JSON fixtures in `tests/fixtures/cms-responses/` (`stats.json`, `news.json`) + Zod schemas in `tests/fixtures/schemas.ts`. **CI invariant**: a unit test validates every fixture against its schema, so a fixture can never drift from the declared contract. Integration tests validate the *live* CMS response against the same schema — a schema failure means the CMS changed, a fixture failure means the fixture rotted.

**Alternatives considered**: TypeScript literals (no runtime validation), MSW handlers (heavier, not needed for server-side fetch).

## Data Flow

```
Browser → Next.js RSC (app/[locale]/page.tsx)
             └─ Promise.all([getT, getF, getStatsGlobal(), getNews({limit:3})])
                        │                          │
             GET /api/globals/estadisticas   GET /api/noticias?limit=3&sort=-publishedAt
                    tag: 'estadisticas'          tag: 'noticias'
                        │                          │
                  StatsBlock (server)         news cards (server)
                        │
                  StatCounter × 6 (client: IntersectionObserver + rAF countup)

Payload admin save → afterChange → revalidatePortalTag('estadisticas')
                                     → POST portal /api/revalidate → revalidateTag
```

Cache: both queries use on-demand tag revalidation (no `revalidate` TTL); `cmsFetch` already forwards `next.tags`.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/cms/src/globals/Estadisticas.ts` | Create | Global, 5 required `number` fields, Spanish labels, `defaultValue` seeds, `revalidatePortalTag('estadisticas')` |
| `apps/cms/src/payload.config.ts` | Modify | Import + append to `globals: [...]` |
| `apps/cms/src/payload-types.ts` | Modify | Regenerate: `npm run generate:types --workspace=@unc/cms` |
| `lib/cms/queries/stats.ts` | Create | `StatsData`, `FALLBACK_STATS`, `getStatsGlobal()` |
| `components/stats/StatsBlock.tsx` | Modify | → async server component, accepts `locale` |
| `components/stats/StatCounter.tsx` | Create | `'use client'` animated counter |
| `app/[locale]/page.tsx` | Modify | Add `getStatsGlobal()` to `Promise.all`, `getNews({ limit: 3 })`, `<StatsBlock locale={locale} stats={stats} />` |
| `tests/fixtures/cms-responses/{stats,news}.json` | Create | Contract fixtures |
| `tests/fixtures/schemas.ts` | Create | `statsSchema`, `newsItemSchema` |
| `tests/unit/**`, `tests/integration/**`, `tests/e2e/homepage.spec.ts` | Create | Harness |
| `vitest.config.ts`, `playwright.config.ts` | Create | Runners |
| `package.json` | Modify | `test`, `test:int`, `test:e2e`; devDeps `vitest`, `zod`, `@playwright/test` |

## Interfaces / Contracts

```ts
// lib/cms/queries/stats.ts
export interface StatsData {
  totalEstudiantes: number
  totalDocentes: number
  totalEgresados: number
  totalCarrerasAcreditadas: number
  totalFacultades: number
}
export const FALLBACK_STATS: StatsData = {
  totalEstudiantes: 4985, totalDocentes: 762, totalEgresados: 672,
  totalCarrerasAcreditadas: 10, totalFacultades: 6,
}
export async function getStatsGlobal(): Promise<StatsData>

// components/stats/StatCounter.tsx
export interface StatCounterProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
}
```

No `any` introduced. `payload-types.ts` must be regenerated before `npm run typecheck`.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | Fixture/schema conformance; `getStatsGlobal()` fallback on reject and on `0`/`null`; `daysSinceFounding()` | Vitest, `node` env, mocked `cmsFetch`, fixtures as mock payloads |
| Integration | Live `/api/globals/estadisticas` and `/api/noticias?limit=3` match the Zod schemas | `vitest.config.ts` (`environment: 'node'`, `include: tests/integration/**/*.spec.ts`); `beforeAll` pings `CMS_URL` and `describe.skip`s when unreachable |
| E2E | Home renders 3 news cards; scroll to stats, `waitForTimeout(1200)` for the rAF animation to settle, assert all 5 CMS-backed counters parse to `> 0` (plus `diasActividad`) | Playwright, `baseURL: http://localhost:3000`, `tests/e2e/homepage.spec.ts` |

## Migration / Rollout

No data migration. Payload creates the `estadisticas` global row lazily with the field `defaultValue`s, so the first read already returns the current figures. Rollback = revert the commit; the global can stay registered and inert.

## Open Questions

- [ ] `REVALIDATION_SECRET` must be set in the CMS env for the `afterChange` hook to reach the portal — confirm it is configured in dev and prod.
- [ ] Playwright browsers are not installed yet (`npx playwright install` required); E2E cannot run in CI until that is provisioned.
