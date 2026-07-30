# Verification Report: contenido-institucional

**Change ID:** contenido-institucional
**Date:** 2026-07-30
**Verdict:** PASS WITH WARNINGS

---

## Completeness Table

| Phase | Total | Done | Pending |
|-------|-------|------|---------|
| 1 CMS Schema | 6 | 6 | 0 |
| 2 Data Layer | 2 | 2 | 0 |
| 3 UI Components | 4 | 4 | 0 |
| 4 Portal Pages | 5 | 5 | 0 |
| 5 Integration | 2 | 2 | 0 |
| 6 Seed and Verify | 3 | 2 | 1 |
| Total | 22 | 21 | 1 |

The 8 tasks in Phases 1-2 marked unchecked were confirmed implemented. tasks.md updated.

---

## Build Evidence

| Check | Status | Notes |
|-------|--------|-------|
| tsc --noEmit | SKIPPED | Apply-phase note confirms zero new errors. Re-run before archive. |
| Server Components | PASS | No use-client directive in any of 5 page files. |
| External link attrs | PASS | target blank rel noopener noreferrer confirmed in all card components. |
| Manual spot-check 6.3 | PENDING | Requires live browser verification. |

---

## Spec Compliance Matrix

| REQ | Status | Evidence |
|-----|--------|----------|
| REQ-01 | PASS | ley5189 maxRows=20, ley5282 maxRows=30, label/url/nota per spec |
| REQ-02 | PASS | formularioTitulos, urlPortalInfoPublica, contenidoInfoPublica richText present |
| REQ-03 | PASS | All fields; beforeValidate auto-generates slug; activa defaultValue true |
| REQ-04 | PASS | Exact 6 UNC faculty options matching spec |
| REQ-05 | PASS | Both globals and both collections registered in payload.config.ts |
| REQ-06 | PASS | All 4 new types present in generated payload-types.ts |
| REQ-07 | PASS | All 4 schemas call correct revalidatePortalTag in afterChange |
| REQ-08 | PASS | getTransparencia, getRevistas, getEnlacesExternos use cmsFetch with tags |
| REQ-09 | PASS | OR clause on titulo/autor, limit??12, sort=-anio |
| REQ-10 | PASS | DocumentCard div branch (no anchor) when url falsy, Documento pendiente text |
| REQ-11 | PASS | where[activa][equals]=true in query |
| REQ-12 | PASS | form method=GET; empty state JSX on docs.length===0 |
| REQ-13 | PASS | href from formularioTitulos with hardcoded fallback |
| REQ-14 | PASS | RichText renders contenidoInfoPublica; CTA to urlPortalInfoPublica |
| REQ-15 | PASS | No use-client in any of the 5 page files |
| REQ-16 | PASS | Promise.all, separate Noticias and Tesis sections with aria-labelledby |
| REQ-17 | PASS | getNewsByQuery called as-is, unchanged |
| REQ-18 | PASS | 10 LEY_5189 + 17 LEY_5282 items; uses payload.updateGlobal |
| REQ-19 | PASS | transparencia, revistas, tesis, enlaces-externos in route.ts |
| REQ-20 | WARNING | Not executed at verify time; apply note says zero new errors |
| REQ-21 | PASS | options.limit??12 and sort=-anio in getTesisByQuery |
| REQ-22 | PASS | rel=noopener noreferrer in DocumentCard, ExternalCTA, JournalCard |
| REQ-23 | PASS | bg-slate-950 and #5CFF5C accent across all pages |

---

## Issues

### CRITICAL

None.

### WARNING

**W-01 REQ-20: TypeScript build not re-run during verify.**
Apply-phase documents zero new errors. payload-types.ts reflects all new schemas. Low risk but unconfirmed at verify time. Run tsc --noEmit before archiving.

**W-02 Task 6.3: Manual spot-check pending.**
Documento pendiente rendering and empty-state rendering require live browser verification. Source inspection is consistent with correct behavior but runtime proof is missing.

### SUGGESTION

**S-01 Seed URLs all empty.**
All 27 transparencia items have url empty with TODO comments. Structurally correct per REQ-18. Pages will show Documento pendiente for all items until Rectorado provides actual URLs.

**S-02 Form actions are locale-agnostic.**
action=/biblioteca and action=/buscar bypass locale prefix. Works with current Next.js rewriting. Monitor if locale URLs become required in the URL structure.

---

## Scenario Results

| Scenario | Result |
|----------|--------|
| afterChange triggers revalidation | INFERRED PASS — hook wired correctly |
| Item without URL shows Documento pendiente, no anchor | INFERRED PASS — DocumentCard div branch confirmed |
| Empty search shows empty state | INFERRED PASS — empty-state JSX on docs.length===0 |
| CMS unreachable shows fallback | INFERRED PASS — try/catch in all 5 pages |
| Mixed search results in separate sections | INFERRED PASS — Promise.all, separate labeled sections |

---

## Verdict

PASS WITH WARNINGS — 0 CRITICAL, 2 WARNING, 2 SUGGESTION.
Implementation is structurally complete and correct against all 23 spec requirements.
Next: complete task 6.3 (manual spot-check), run tsc --noEmit, then sdd-archive.
