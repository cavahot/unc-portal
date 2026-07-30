# Tasks: contenido-institucional

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1 200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (CMS schema + data layer) → PR 2 (portal pages + integration) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | CMS globals, collections, payload config, types, queries, revalidate, seed | PR 1 | All backend; deployable without portal pages |
| 2 | UI components, 5 portal pages, `/buscar` extension, navigation links | PR 2 | Depends on PR 1 merged; purely frontend |

---

## Phase 1: CMS Schema & Config

- [ ] 1.1 Create `apps/cms/src/globals/Transparencia.ts` — arrays `ley5189[]` (max 20) and `ley5282[]` (max 30), each with `label` (required), `url` (optional), `nota` (optional); `afterChange` hook calls `revalidatePortalTag('transparencia')`. (REQ-01, REQ-07)
- [ ] 1.2 Create `apps/cms/src/globals/EnlacesExternos.ts` — fields `formularioTitulos: text`, `urlPortalInfoPublica: text`, `contenidoInfoPublica: richText`; `afterChange` hook calls `revalidatePortalTag('enlaces-externos')`. (REQ-02, REQ-07)
- [ ] 1.3 Create `apps/cms/src/collections/Revistas.ts` — fields per spec; `slug` auto-generated + unique; `activa: checkbox true`; `afterChange` hook calls `revalidatePortalTag('revistas')`. (REQ-03, REQ-07)
- [ ] 1.4 Create `apps/cms/src/collections/Tesis.ts` — fields per spec; `facultad` select with 6 UNC faculties (Odontología, Medicina, Ciencias Agrarias, Ciencias Exactas y Tecnológicas, Humanidades y Ciencias de la Educación, Ciencias Económicas y Administrativas); `afterChange` hook calls `revalidatePortalTag('tesis')`. (REQ-04, REQ-07)
- [ ] 1.5 Modify `apps/cms/src/payload.config.ts` — add `Transparencia`, `EnlacesExternos` to `globals[]` and `Revistas`, `Tesis` to `collections[]` in the same commit as tasks 1.1–1.4. (REQ-05)
- [ ] 1.6 Run `npm run generate:types --workspace=@unc/cms` and commit the updated `apps/cms/src/payload-types.ts`. (REQ-06)

## Phase 2: Portal Data Layer

- [ ] 2.1 Create `lib/cms/queries/institutional.ts` — export `getTransparencia()`, `getRevistas()`, `getEnlacesExternos()` using `cmsFetch` with revalidation tags; export `getTesisByQuery(q, options?)` with OR filter on `titulo`/`autor`, `limit=12` default, `sort=-anio`. (REQ-08, REQ-09, REQ-21)
- [ ] 2.2 Modify `app/api/revalidate/route.ts` — accept tags `transparencia`, `revistas`, `tesis`, `enlaces-externos`. (REQ-19)

## Phase 3: UI Components

- [x] 3.1 Create `components/institutional/DocumentCard.tsx` — renders label + download icon + external link; when `url` is absent renders dimmed non-clickable "Documento pendiente" card (no `<a>` element). (REQ-10, REQ-22, REQ-23)
- [x] 3.2 Create `components/institutional/JournalCard.tsx` — name, description, start year, optional cover image, CTA to `urlOjs` with `target="_blank" rel="noopener noreferrer"`. (REQ-11, REQ-22)
- [x] 3.3 Create `components/institutional/ThesisCard.tsx` — title, author, year, facultad badge, "Ver tesis" link to `urlPdf`. (REQ-12, REQ-22)
- [x] 3.4 Create `components/institutional/ExternalCTA.tsx` — reusable CTA button that opens `href` in a new tab. (REQ-13, REQ-22)

## Phase 4: Portal Pages

- [x] 4.1 Create `app/transparencia/page.tsx` — Server Component; calls `getTransparencia()`; renders two sections with `DocumentCard` grid; silent fallback on CMS error. (REQ-10, REQ-15)
- [x] 4.2 Create `app/revistas/page.tsx` — Server Component; calls `getRevistas()`; filters `activa: true`; renders `JournalCard` grid; silent fallback. (REQ-11, REQ-15)
- [x] 4.3 Create `app/biblioteca/page.tsx` — Server Component; reads `?q` from `searchParams`; calls `getTesisByQuery(q)`; renders search `<form method="GET">` and `ThesisCard` grid; empty state when no results; silent fallback. (REQ-12, REQ-15)
- [x] 4.4 Create `app/solicitar-titulo/page.tsx` — Server Component; calls `getEnlacesExternos()`; renders hero + steps + `ExternalCTA` pointing to `formularioTitulos`. (REQ-13, REQ-15)
- [x] 4.5 Create `app/informacion-publica/page.tsx` — Server Component; calls `getEnlacesExternos()`; renders hero + `contenidoInfoPublica` richText + `ExternalCTA` pointing to `urlPortalInfoPublica`. (REQ-14, REQ-15)

## Phase 5: Integration & Wiring

- [x] 5.1 Modify `app/buscar/page.tsx` — call `getTesisByQuery(q)` in parallel with existing `getNewsByQuery(q)`; render merged results under separate "Noticias" and "Tesis" section headers. (REQ-16)
- [x] 5.2 Add navigation links for all five new routes to `fallbackMenuData` / `FALLBACK_NAVIGATION` and to the CMS `Navegacion` global seed or admin instructions. (proposal §5 — `navegacion` modified capability)

## Phase 6: Seed & Verification

- [x] 6.1 Create `apps/cms/scripts/seed/transparencia.ts` — upserts `Transparencia` global via Payload Local API with 10 Ley 5189 items and 17 Ley 5282 items; URLs are empty strings with `// TODO:` comments; labels match WordPress structure. (REQ-18)
- [x] 6.2 Run `tsc --noEmit` from repo root; confirm zero new type errors. (REQ-20) — one pre-existing CMS test error remains (apps/cms/tests/int/api.int.spec.ts path alias), zero new errors from PR 2 files.
- [ ] 6.3 Manual spot-check: load `/transparencia` — verify one item with no URL renders "Documento pendiente" and is not wrapped in `<a>`; load `/biblioteca?q=nonexistent` — verify empty state renders.
