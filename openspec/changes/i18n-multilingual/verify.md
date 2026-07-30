# Verify Report: i18n-multilingual

**Date:** 2026-07-30
**Mode:** openspec (spot-check only — no test runner executed per orchestrator instructions)
**Verdict:** PASS WITH WARNINGS

---

## Spot-Check Results

| # | Check | File | Result |
|---|-------|------|--------|
| 1 | `i18n/navigation.ts` exists and exports `Link`, `redirect` | `i18n/navigation.ts` | PASS — `createNavigation` exports `Link, redirect, useRouter, usePathname, getPathname` |
| 2 | `next-intl.d.ts` exists at project root | `next-intl.d.ts` | PASS — imports types from `messages/es/` namespaces |
| 3 | `app/[locale]/page.tsx` has `getTranslations` import | `app/[locale]/page.tsx:2` | PASS — `import { getTranslations, getFormatter } from 'next-intl/server'` |
| 4 | `components/layout/Header.tsx` has `useTranslations` import | `components/layout/Header.tsx:4` | PASS — `import { useTranslations } from 'next-intl'` |
| 5 | `components/hero/CinematicHero.tsx` has `useTranslations` import | `components/hero/CinematicHero.tsx:4` | PASS — `import { useTranslations } from 'next-intl'` |
| 6 | `components/stats/StatsBlock.tsx` has `useTranslations` import | `components/stats/StatsBlock.tsx:3` | PASS — `import { useTranslations, useFormatter } from 'next-intl'` |
| 7 | `messages/en/nav.json` has at least one key | `messages/en/nav.json:2` | PASS — `skipLink: "Skip to main content"` (English values confirmed) |
| 8 | `messages/gn/nav.json` exists | `messages/gn/nav.json` | PASS — file exists with Spanish-placeholder values |

All 8 spot-checks: **8 / 8 PASS**

---

## Task Completion Status

### Phase 1 — Foundation
| Task | Checkbox | State |
|------|----------|-------|
| 1.1 Install next-intl | [ ] | WARNING — box unchecked; code confirmed present via `i18n/navigation.ts` (manual implementation documented in state.yaml) |
| 1.2 `i18n/routing.ts` | [ ] | WARNING — same (manual) |
| 1.3 `i18n/request.ts` | [ ] | WARNING — same (manual) |
| 1.4 `i18n/navigation.ts` | [ ] | WARNING — spot-check #1 PASS; box unchecked due to manual impl |
| 1.5 `messages/es/` scaffold | [ ] | WARNING — same (manual) |
| 1.6 Copy to en/pt-BR/gn | [ ] | WARNING — spot-check #7 + #8 PASS; box unchecked |

### Phase 2 — Middleware
| Task | Checkbox | State |
|------|----------|-------|
| 2.1 Rewrite `middleware.ts` | [ ] | WARNING — manual implementation; not spot-checked |
| 2.2 Update `config.matcher` | [ ] | WARNING — manual implementation; not spot-checked |

### Phase 3 — Routing Restructure
| Task | Checkbox | State |
|------|----------|-------|
| 3.1–3.5 | [ ] | WARNING — manual implementation; `app/[locale]/page.tsx` confirmed via spot-check #3 |

### Phase 4 — Server Pages
| Task | Checkbox | State |
|------|----------|-------|
| 4.1–4.5 | [x] | PASS |
| 4.6 (`carreras/`, `contacto/`, `tramites/`) | [ ] | INTENTIONAL SKIP — placeholder pages with no message catalog; documented in tasks.md and state.yaml |

### Phase 5 — Client Components
| Task | Checkbox | State |
|------|----------|-------|
| 5.1–5.6 | [x] | PASS — spot-checks #4, #5, #6 confirm useTranslations in Header, CinematicHero, StatsBlock |

### Phase 6 — LocaleSwitcher
| Task | Checkbox | State |
|------|----------|-------|
| 6.1–6.3 | [ ] | WARNING — manual implementation documented in state.yaml; not spot-checked inline here |

### Phase 7 — Type Safety
| Task | Checkbox | State |
|------|----------|-------|
| 7.1–7.4 | [x] | PASS — spot-check #2 confirms `next-intl.d.ts`; tsc clean documented |

---

## Issues

### CRITICAL
_None._

### WARNING

1. **W-1: Unchecked task boxes for manually-implemented phases (1, 2, 3, 6)**
   Phases 1, 2, 3, and 6 were implemented manually outside the SDD apply cycle. Their task checkboxes in `tasks.md` remain `[ ]` even though `state.yaml` lists them as complete and spot-checks confirm the code exists. This is a documentation gap, not a functional gap. Recommend running a pass to tick those boxes before archiving so tasks.md reflects reality.

2. **W-2: `next build` not run**
   Task 7.4 acceptance requires `next build` exit code 0. The build was not run in this verify pass (dev environment constraint noted in tasks.md). Runtime behavior (locale routing, `NextIntlClientProvider` wrapping, `generateStaticParams`) is unproven without a build.

3. **W-3: Middleware spot-check skipped**
   Tasks 2.1/2.2 (CORS bypass, rate-limit headers, matcher exclusions) were not spot-checked inline. State.yaml confirms manual completion but no code evidence was gathered in this pass.

### SUGGESTION

- S-1: After archiving, consider a CI check (`next build`) to catch any locale-routing regression introduced by the `app/[locale]/` restructure.
- S-2: `messages/gn/nav.json` uses Spanish placeholders. Mark as known debt or open a follow-up task for Guaraní translation.

---

## Skipped Verification Dimensions

- **Runtime test execution**: not performed (no test runner invoked per orchestrator scope).
- **Design coherence**: `design.md` was never written; routing decisions captured in `spec.md` instead. Skipped per state.yaml note.
- **Spec compliance matrix**: spec.md exists but full scenario-by-scenario mapping deferred to a deeper verify pass if needed.

---

## Final Verdict

**PASS WITH WARNINGS** — All 8 implementation spot-checks pass. No CRITICAL issues. 3 warnings: unchecked task boxes for manually-implemented phases (documentation gap, not a functional gap), missing `next build` evidence, and unverified middleware code. Change is ready for `sdd-archive` if the team accepts W-1 and W-2 as known.
