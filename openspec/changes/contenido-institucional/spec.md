# Spec: contenido-institucional

**Change ID:** contenido-institucional
**Date:** 2026-07-29
**Status:** approved

---

## Purpose

Migrate five institutional sections from legacy WordPress to the Payload CMS + Next.js portal, fulfilling legal obligations under Leyes 5189/14 and 5282/14 and providing a unified admin experience.

---

## Section 1 — CMS Schema (Payload)

| ID | Requirement | Priority | File |
|----|-------------|----------|------|
| REQ-01 | Global `Transparencia` MUST expose two arrays: `ley5189[]` (max 20) and `ley5282[]` (max 30). Each item: `label: text required`, `url: text optional`, `nota: text optional`. | Must | `apps/cms/src/globals/Transparencia.ts` |
| REQ-02 | Global `EnlacesExternos` MUST expose: `formularioTitulos: text`, `urlPortalInfoPublica: text`, `contenidoInfoPublica: richText`. | Must | `apps/cms/src/globals/EnlacesExternos.ts` |
| REQ-03 | Collection `Revistas` MUST expose: `nombre: text required`, `slug: text auto+unique`, `descripcion: textarea required`, `anioInicio: number required`, `urlOjs: text required`, `portada: upload→media optional`, `activa: checkbox default true`. | Must | `apps/cms/src/collections/Revistas.ts` |
| REQ-04 | Collection `Tesis` MUST expose: `titulo: text required`, `autor: text required`, `anio: number required`, `resumen: textarea optional`, `facultad: select required (6 UNC faculties)`, `urlPdf: text required`. | Must | `apps/cms/src/collections/Tesis.ts` |
| REQ-05 | `payload.config.ts` MUST register both globals (`Transparencia`, `EnlacesExternos`) and both collections (`Revistas`, `Tesis`) in the same commit as their schema files. | Must | `apps/cms/src/payload.config.ts` |
| REQ-06 | After any schema change, `generate:types` MUST run and `payload-types.ts` MUST reflect the new globals and collections. | Must | `apps/cms/src/payload-types.ts` |
| REQ-07 | Each global/collection MUST have an `afterChange` hook that calls `revalidatePortalTag` with its tag: `transparencia`, `enlaces-externos`, `revistas`, `tesis`. | Must | Each schema file |

#### Scenario: Transparencia afterChange triggers revalidation

- GIVEN an editor saves the `Transparencia` global in Payload admin
- WHEN the `afterChange` hook runs
- THEN `revalidatePortalTag('transparencia')` is called with no errors

---

## Section 2 — CMS Data Queries (Portal lib)

| ID | Requirement | Priority | File |
|----|-------------|----------|------|
| REQ-08 | `lib/cms/queries/institutional.ts` MUST export: `getTransparencia()`, `getRevistas()`, `getEnlacesExternos()`. Each fetches the corresponding Payload resource with its revalidation tag. | Must | `lib/cms/queries/institutional.ts` |
| REQ-09 | `lib/cms/queries/institutional.ts` MUST export `getTesisByQuery(q: string, options?)` that queries `tesis` collection filtering by `titulo` or `autor` (OR clause), supports `limit` (default 12) and `sort=-anio`. | Must | `lib/cms/queries/institutional.ts` |

---

## Section 3 — Portal Pages

| ID | Requirement | Priority | File |
|----|-------------|----------|------|
| REQ-10 | `/transparencia` MUST render two sections (Ley 5189 and Ley 5282). Each item renders as a card: download icon + label + external link (`target="_blank"`). Items without `url` MUST render as a visually dimmed "Documento pendiente" card (non-clickable). | Must | `app/transparencia/page.tsx` |
| REQ-11 | `/revistas` MUST render a grid of journal cards: name, description, start year, optional cover image, and a CTA link to `urlOjs`. Only `activa: true` revistas are shown. | Must | `app/revistas/page.tsx` |
| REQ-12 | `/biblioteca` MUST render a search form (`<form method="GET">` with `?q=`) and thesis cards: `titulo`, `autor`, `anio`, `facultad` badge, "Ver tesis" link to `urlPdf`. Submitting with no results MUST show an empty state. | Must | `app/biblioteca/page.tsx` |
| REQ-13 | `/solicitar-titulo` MUST render a static page (hero + steps) with a CTA button whose `href` comes from `getEnlacesExternos().formularioTitulos`. CTA opens in a new tab. | Must | `app/solicitar-titulo/page.tsx` |
| REQ-14 | `/informacion-publica` MUST render: hero, richText body from `getEnlacesExternos().contenidoInfoPublica`, and a CTA button to `getEnlacesExternos().urlPortalInfoPublica` (`https://informacionpublica.paraguay.gov.py`). | Must | `app/informacion-publica/page.tsx` |
| REQ-15 | All five pages MUST be Server Components. No `"use client"` directive is allowed in any of these page files. | Must | All five `page.tsx` files |

#### Scenario: Transparencia item without URL

- GIVEN the `Transparencia` global has an item with `label` set and `url` empty
- WHEN a visitor loads `/transparencia`
- THEN that item renders as a non-clickable card with text "Documento pendiente" and dimmed visual style
- AND no `<a>` element wraps the card

#### Scenario: Biblioteca search returns no results

- GIVEN the `tesis` collection has no entries matching the query
- WHEN a visitor submits `?q=nonexistent`
- THEN the page renders an empty state message (no error, no crash)

#### Scenario: CMS unreachable — fallback

- GIVEN the Payload CMS is unreachable during a page request
- WHEN any of the five pages is server-rendered
- THEN the page MUST render a fallback (empty list or static minimal content) without throwing an unhandled error

---

## Section 4 — Global Search Extension (`/buscar`)

| ID | Requirement | Priority | File |
|----|-------------|----------|------|
| REQ-16 | `/buscar` MUST search both `noticias` and `tesis` in parallel using `getNewsByQuery(q)` (unchanged) and `getTesisByQuery(q)`. Results MUST be merged and displayed under separate section headers when both have results. | Must | `app/buscar/page.tsx` |
| REQ-17 | `getNewsByQuery` MUST NOT be modified. Tesis search is additive only. | Must | `lib/cms/queries/news.ts` (read-only) |

#### Scenario: Global search returns mixed results

- GIVEN the query "derecho" matches one noticia and two tesis
- WHEN a visitor submits `/buscar?q=derecho`
- THEN the page renders a "Noticias" section with 1 result and a "Tesis" section with 2 results
- AND results from each type do not appear in the other section

---

## Section 5 — Seed Script

| ID | Requirement | Priority | File |
|----|-------------|----------|------|
| REQ-18 | A TypeScript seed script MUST upsert the `Transparencia` global via Payload Local API with 10 pre-labelled Ley 5189 items and 17 pre-labelled Ley 5282 items. URLs are empty strings with TODO comments; labels match the WordPress structure. | Must | `apps/cms/scripts/seed/transparencia.ts` |

---

## Section 6 — Revalidation Endpoint

| ID | Requirement | Priority | File |
|----|-------------|----------|------|
| REQ-19 | `app/api/revalidate/route.ts` MUST accept and process the new tags: `transparencia`, `revistas`, `tesis`, `enlaces-externos` in addition to existing tags. | Must | `app/api/revalidate/route.ts` |

---

## Section 7 — Non-Functional

| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| REQ-20 | `tsc --noEmit` MUST pass with zero new type errors after all schema and query changes. | Must | CI / manual |
| REQ-21 | Thesis list MUST default to `limit=12` and `sort=-anio` to prevent unbounded queries. | Must | `getTesisByQuery` signature |
| REQ-22 | All external links MUST open with `target="_blank" rel="noopener noreferrer"`. | Must | All five pages + seed |
| REQ-23 | Design MUST use dark slate background consistent with `/noticias`, green accent cards, and external link icons. | Should | Visual review |

---

## Out of Scope

- MinIO file upload for these sections (all content is external links)
- Full-text search, faceted filtering, or OJS API integration
- WordPress migration of noticias
- Formulario propio for title requests (Google Form remains)
- Indexing revistas in `/buscar`
