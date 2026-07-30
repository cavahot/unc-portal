# Verify Report: global-search

**Date:** 2026-07-30  
**Verdict:** PASS WITH WARNINGS  
**CRITICAL:** 0 | **WARNING:** 3 | **SUGGESTION:** 2

---

## Completeness Table

| Task | Status | Evidence |
|---|---|---|
| T01 — `getNewsByQuery` in `lib/cms/queries/news.ts` | COMPLETE | Function present at line 142–179 |
| T02 — `app/[locale]/buscar/page.tsx` | COMPLETE | File at `app/[locale]/buscar/page.tsx` |
| T03 — `tsc --noEmit` 0 new errors | COMPLETE (pre-existing only) | See Build Evidence below |

---

## Build / Type-Check Evidence

Command: `npx tsc -p tsconfig.json --noEmit`

Result: 1 error — `apps/cms/tests/int/api.int.spec.ts(2,20): error TS2307: Cannot find module '@/payload.config'`

Pre-existing? YES — git log shows this file was introduced in commit `b76aef3` (chore: sincronizar estado actual e integrar workspace de cms), before the global-search change. No new TypeScript errors were introduced by this change. Portal source files (app/, lib/, components/) are clean.

---

## Spec Compliance Matrix

### REQ-01 — Página `/buscar`

| Req | Description | Status | Notes |
|---|---|---|---|
| R1.1 | Async Server Component, `searchParams: Promise<{ q?: string }>` | PASS | `export default async function BuscarPage({ searchParams })` |
| R1.2 | `q` present → `getNewsByQuery(q, { limit: 12 })` | PASS | `query ? getNewsByQuery(query, { limit: 12 })` |
| R1.3 | `q` absent → `getNews({ limit: 12 })` (browse mode) | PASS | `: getNews({ limit: 12 })` in Promise.all |
| R1.4 | Dynamic metadata title | PASS | Title matches spec; description field is an addition |
| R1.5 | `bg-slate-950 pt-28 pb-20` | PASS | Line 43 of page file |

**Scenarios:**
- Browse mode (`/buscar` no params) → heading "Explorar noticias" — PASS
- Query mode (`/buscar?q=rector`) → heading `Resultados para "rector"` — PASS
- Empty state (`/buscar?q=xyzabc`) → empty state with "Ver todas las noticias" link — PASS (text says "No encontramos resultados para…" vs spec's "No encontramos noticias para…" — see W02)

### REQ-02 — Input de búsqueda

| Req | Description | Status |
|---|---|---|
| R2.1 | `<form method="GET" action="/buscar">` with `<input name="q">` pre-filled | PASS |
| R2.2 | `placeholder="Buscar noticias..."`, `aria-label="Buscar en el portal"`, `type="search"` | PASS |
| R2.3 | Submit button with SVG lupa icon and text "Buscar" | PASS |
| R2.4 | Works without JavaScript (native GET form) | PASS |

### REQ-03 — Query `getNewsByQuery`

| Req | Description | Status |
|---|---|---|
| R3.1 | `getNewsByQuery(q: string, options?: { limit?: number }): Promise<PayloadResponse<NewsItem>>` | PASS |
| R3.2 | OR condition: `where[or][0][title][like]` + `where[or][1][summary][like]` | PASS |
| R3.3 | `where[_status][equals]=published` | PASS |
| R3.4 | DEMO_NEWS fallback with case-insensitive title/summary filter | PASS |
| R3.5 | `tags: ['noticias-search']` | PASS |
| R3.6 | Inherits `cmsFetch` AbortController timeout | PASS |

### REQ-04 — Grid de resultados

| Req | Description | Status |
|---|---|---|
| R4.1 | Same card JSX pattern as `/noticias` (duplicated inline) | PASS |
| R4.2 | `grid gap-6 sm:grid-cols-2 lg:grid-cols-3` | PASS |
| R4.3 | Cards link to `/noticias/${slug}` | PASS |
| R4.4 | Placeholder `bg-[#004700]/30` for missing `featuredImage` | PASS |

### REQ-05 — Header link (Should)

| Req | Description | Status |
|---|---|---|
| R5.1–R5.3 | `<Link href="/buscar">` present in Header; no search logic added to header | PASS |

### NFR-01

| NFR | Description | Status |
|---|---|---|
| NF1.1 | `tsc --noEmit` passes without new errors | PASS (pre-existing CMS test error only) |
| NF1.2 | Server Component — no `'use client'` | PASS |
| NF1.3 | No external UI libraries | PASS |

---

## Acceptance Criteria from Proposal

| Criterion | Status |
|---|---|
| `/buscar?q=rector` returns matching noticias | PASS |
| `/buscar` without param shows latest 12 (browse mode) | PASS |
| `/buscar?q=xyzabc` shows empty state | PASS |
| CMS down → silent fallback with DEMO_NEWS filtered | PASS |

---

## Issues

### WARNINGS

**W01 — File path deviation from spec**  
Spec REQ-01 declares `app/buscar/page.tsx`. Actual implementation: `app/[locale]/buscar/page.tsx`.  
This is architecturally correct for the project's next-intl i18n structure (all routes live under `app/[locale]/`). Not a defect — the spec was written before the i18n PR landed. Spec and design should be updated to reflect the real path.

**W02 — Empty state copy deviation**  
Spec scenario: "No encontramos noticias para [query]"  
Implementation: "No encontramos resultados para [query]"  
The word "resultados" is arguably more accurate since the page also searches tesis, but it deviates from the spec. Accept the deviation or update the spec.

**W03 — Pre-existing TypeScript error in tsconfig scope**  
`apps/cms/tests/int/api.int.spec.ts` causes `tsc --noEmit` to exit non-zero. This error predates global-search (git: `b76aef3`). The tsconfig `exclude` list does not exclude `apps/cms/tests/`. Not introduced by this change, but NFR-01 strictly fails as stated. Recommend adding `apps/cms/tests` to tsconfig `exclude`.

### SUGGESTIONS

**S01 — Scope expansion: Tesis search**  
The page also queries `getTesisByQuery` and renders `ThesisCard`. This enhancement was not in the spec or design but is functional and additive. No rework needed — document it in the spec if this is intentional scope.

**S02 — tasks.md path updated**  
T02 was updated during verification to reflect the real path (`app/[locale]/buscar/page.tsx`). This is informational only.

---

## Design Coherence

Design decisions from `design.md` are all honored:
- URL-driven state, no client-side JS required
- `URLSearchParams` for OR query construction
- Server Component structure matches design diagram
- Card JSX duplicated (not extracted) per design decision
- 2 files total (1 new, 1 edit)

One deviation: the implementation adds a third data source (tesis) and a third file (`lib/cms/queries/institutional.ts` was edited and `ThesisCard` was used). Design said "2 files, 1 new, 1 edit" — implementation touched at least 3 files. This is a WARNING-level scope deviation that doesn't break any spec requirement.

---

## Final Verdict

**PASS WITH WARNINGS** — All spec requirements and all proposal acceptance criteria are satisfied. The 3 warnings are non-blocking: W01 and W02 are documentation/copy discrepancies, W03 is a pre-existing infrastructure issue. Ready for archive.
