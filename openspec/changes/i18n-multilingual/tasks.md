# Tasks: i18n-multilingual

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1 100 – 1 400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation + Middleware) → PR 2 (Routing restructure) → PR 3 (Pages + Components) → PR 4 (LocaleSwitcher + Type safety) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | next-intl install + i18n config + message catalogs + middleware | PR 1 | Base: `feature/page-builder`; no routing change yet — safe to deploy standalone |
| 2 | Move `app/` → `app/[locale]/`; split layouts | PR 2 | Base: PR 1 branch; highest-risk structural step |
| 3 | Translate server page components + client components | PR 3 | Base: PR 2 branch; requires catalogs from PR 1 |
| 4 | LocaleSwitcher UI + replace internal links + type safety + `generateStaticParams` | PR 4 | Base: PR 3 branch; completes the feature |

---

## Phase 1: Foundation — Install, Config, Catalogs

- [ ] 1.1 Add `next-intl` to root `package.json` and run `npm install`. Acceptance: `node_modules/next-intl` present, no peer-dep errors.
- [ ] 1.2 Create `i18n/routing.ts` — export `locales = ['es','en','pt-BR','gn']`, `defaultLocale = 'es'`, `localePrefix = 'as-needed'`. Acceptance: imports cleanly, types resolve.
- [ ] 1.3 Create `i18n/request.ts` — export `getRequestConfig` loading `messages/{locale}/*.json` merged by namespace. Acceptance: server page can call `getTranslations('common')` without error.
- [ ] 1.4 Create `i18n/navigation.ts` — re-export locale-aware `Link`, `redirect`, `useRouter`, `usePathname` from `next-intl/navigation` using the routing config. Acceptance: `import { Link } from '@/i18n/navigation'` resolves.
- [ ] 1.5 Scaffold `messages/es/` with all 11 required files: `common.json`, `nav.json`, `accessibility.json`, `pages.home.json`, `pages.noticias.json`, `pages.buscar.json`, `pages.transparencia.json`, `pages.revistas.json`, `pages.biblioteca.json`, `pages.solicitar-titulo.json`, `pages.informacion-publica.json`. Acceptance: files exist; keys extracted from current JSX hardcoded strings.
- [ ] 1.6 Copy `messages/es/` to `messages/en/`, `messages/pt-BR/`, `messages/gn/` as Spanish-placeholder fallbacks; translate `en` catalog to English values. Acceptance: 4 locale directories present; `en` has English strings; `gn`/`pt-BR` are valid JSON matching all `es` keys.

## Phase 2: Middleware Fusion

- [ ] 2.1 Rewrite `middleware.ts`: compose `createMiddleware` from next-intl FIRST; if `pathname.startsWith('/api/')`, apply CORS headers and return early without locale processing; apply rate-limit headers to all responses. Acceptance: spec scenarios for API bypass and page locale handling pass.
- [ ] 2.2 Update `config.matcher` to exclude `_next/static`, `_next/image`, `favicon.ico`, and `/api/(.*)`. Acceptance: `next build` emits no middleware warnings; `/api/revalidate` receives CORS headers and no locale redirect.

## Phase 3: Routing Restructure

- [ ] 3.1 Create `app/[locale]/` directory. Move all non-API route directories (`page.tsx` + nested folders) into it: `noticias/`, `noticias/[slug]/`, `carreras/`, `facultades/`, `institucional/`, `contacto/`, `tramites/`, `buscar/`, `transparencia/`, `revistas/`, `biblioteca/`, `solicitar-titulo/`, `informacion-publica/`. Acceptance: `app/api/` remains at root; git diff shows moves, no content changes yet.
- [ ] 3.2 Move `app/[...slug]/page.tsx` to `app/[locale]/[...slug]/page.tsx`; remove `locale` from `params.slug` destructuring. Acceptance: CMS catch-all `params.slug` equals path segments only (no locale string).
- [ ] 3.3 Move `app/page.tsx` (home) to `app/[locale]/page.tsx`. Acceptance: `/` and `/en` both resolve to home.
- [ ] 3.4 Slim `app/layout.tsx` to bare HTML shell: `<html>`, `<body>`, font variables, `globals.css` import — no locale logic. Acceptance: no `NextIntlClientProvider`, no `lang` attribute set here.
- [ ] 3.5 Create `app/[locale]/layout.tsx`: set `<html lang={locale}>`, wrap children in `NextIntlClientProvider` with messages for the active locale. Export `generateStaticParams` returning all 4 locale objects. Acceptance: `lang` attribute correct in all 4 locale variants; provider present above all client subtrees.

## Phase 4: Server Page Components

- [ ] 4.1 Update `app/[locale]/page.tsx` (home) — replace hardcoded strings with `await getTranslations('pages.home')`. Replace any `toLocaleDateString('es-PY')` calls with `getFormatter()`. Acceptance: English heading renders on `/en`.
- [ ] 4.2 Update `app/[locale]/noticias/page.tsx` — translations + locale formatter for dates. Acceptance: smoke test #2 (spec acceptance table).
- [ ] 4.3 Update `app/[locale]/noticias/[slug]/page.tsx` — `generateMetadata` reads `params.locale`; date formatter locale-aware. Acceptance: `<title>` differs per locale.
- [ ] 4.4 Update `app/[locale]/buscar/page.tsx`, `app/[locale]/transparencia/page.tsx`, `app/[locale]/revistas/page.tsx`, `app/[locale]/biblioteca/page.tsx` — `getTranslations` per page namespace. Acceptance: no hardcoded Spanish strings remain.
- [ ] 4.5 Update `app/[locale]/solicitar-titulo/page.tsx`, `app/[locale]/informacion-publica/page.tsx` — same pattern. Acceptance: same.
- [ ] 4.6 Update remaining pages (`carreras/`, `facultades/`, `institucional/`, `contacto/`, `tramites/`) — add translations for any UI strings; add page-namespace keys to `messages/es/`. Acceptance: `tsc --noEmit` passes.

## Phase 5: Client Components

- [ ] 5.1 Update `components/Header.tsx` — replace hardcoded strings with `useTranslations('nav')`; verify it is inside `NextIntlClientProvider`. Acceptance: Portuguese nav labels on `/pt-BR`.
- [ ] 5.2 Update `components/MegaMenu.tsx` — `useTranslations('nav')` for menu item labels. Acceptance: no hardcoded Spanish nav strings.
- [ ] 5.3 Update `components/AccessibilityPanel.tsx` — `useTranslations('accessibility')`. Acceptance: accessibility labels translate on locale switch.
- [ ] 5.4 Update `components/CinematicHero.tsx` — `useTranslations('pages.home')` for heading/subtitle. Acceptance: English hero text on `/en`.
- [ ] 5.5 Update `components/StatsBlock.tsx` — `useTranslations('pages.home')` for labels; use `useFormatter()` for numbers. Acceptance: number format differs for `pt-BR`.
- [ ] 5.6 Audit `components/Footer.tsx` — if it contains hardcoded UI strings, add `useTranslations('common')` and extract keys. Acceptance: no raw Spanish strings in Footer JSX after audit.

## Phase 6: LocaleSwitcher

- [ ] 6.1 Create `components/i18n/LocaleSwitcher.tsx` — `'use client'`; renders 4 locale options with flag emojis (🇪🇸 es, 🇺🇸 en, 🇧🇷 pt-BR, 🇵🇾 gn); uses `useRouter`/`usePathname` from `i18n/navigation` to navigate to same path in selected locale; active locale visually highlighted. Acceptance: switching locale on `/en/noticias` navigates to `/pt-BR/noticias` without full reload.
- [ ] 6.2 Render `<LocaleSwitcher>` in `Header.tsx` to the right of the search icon (desktop). Acceptance: switcher visible on desktop ≥ md breakpoint.
- [ ] 6.3 Render `<LocaleSwitcher>` in the mobile menu panel. Acceptance: switcher visible in mobile drawer.

## Phase 7: Internal Links + Type Safety

- [ ] 7.1 Replace all `import { Link } from 'next/link'` with `import { Link } from '@/i18n/navigation'` across all moved page and component files. Same for `redirect`. Acceptance: `grep -r "from 'next/link'" app/[locale]` returns no matches.
- [ ] 7.2 Create `next-intl.d.ts` at project root — declare `IntlMessages` type from `messages/es/` namespaces so `t('key')` calls are type-checked. Acceptance: `tsc --noEmit` catches a deliberately invalid key.
- [ ] 7.3 Add `generateStaticParams` to every `app/[locale]/*/page.tsx` that does not already inherit it from the layout — return all 4 locale objects. Acceptance: `next build` pre-renders all 4 locale variants per page.
- [ ] 7.4 Run `tsc --noEmit` and `next build`; fix any new type errors or build errors introduced by the migration. Acceptance: exit code 0 for both commands; spec acceptance scenarios 7 and 8 pass.
