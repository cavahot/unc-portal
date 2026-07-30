# i18n-multilingual Specification

**Change ID:** i18n-multilingual
**Phase:** spec
**Date:** 2026-07-30

---

## Purpose

Define what the system MUST do after adding next-intl with 4 locales (`es`, `en`, `pt-BR`, `gn`) to the UNC Portal. This spec covers URL routing, message catalogs, middleware fusion, layout restructure, component translation, and the locale switcher UI. CMS content localisation is explicitly out of scope.

---

## New Capability: i18n-routing

### Requirement: Locale-Aware URL Routing

The system MUST support 4 locales: `es` (default), `en`, `pt-BR`, `gn`.
The system MUST use `localePrefix: 'as-needed'` so Spanish URLs carry no prefix (`/noticias`) and all other locales receive a prefix (`/en/noticias`, `/pt-BR/noticias`, `/gn/noticias`).
The system MUST NOT redirect a Spanish user from `/noticias` to `/es/noticias`.

#### Scenario: Spanish page loads without prefix

- GIVEN a user requests `/noticias`
- WHEN the middleware processes the request
- THEN the response is the Spanish noticias page with no redirect and no locale prefix in the URL

#### Scenario: Prefixed locale page loads correctly

- GIVEN a user requests `/en/noticias`
- WHEN the middleware processes the request
- THEN the response is the English-UI noticias page and the URL remains `/en/noticias`

#### Scenario: Unknown locale prefix is not treated as a locale

- GIVEN a user requests `/fr/noticias`
- WHEN the middleware processes the request
- THEN next-intl does not recognise `fr` as a valid locale and falls through to the catch-all or 404 behaviour

---

### Requirement: App Router Locale Segment

All page routes MUST live under `app/[locale]/`.
The existing `app/[...slug]/page.tsx` MUST move to `app/[locale]/[...slug]/page.tsx`.
The `[locale]` segment MUST NOT be included in the slug array passed to the page component.
`app/api/` MUST remain at the root and MUST NOT be nested under `[locale]`.
`app/globals.css` MUST remain at the root.
A minimal root `app/layout.tsx` MUST remain as an HTML shell with no locale logic.

#### Scenario: API route is unreachable via locale prefix

- GIVEN a request to `/api/revalidate`
- WHEN the middleware processes the request
- THEN the request bypasses locale detection and reaches the API handler unmodified

#### Scenario: CMS catch-all slug excludes the locale segment

- GIVEN a CMS page with slug `sobre-la-unc` and the user is on `/en/sobre-la-unc`
- WHEN Next.js resolves the route
- THEN `params.slug` equals `['sobre-la-unc']` (no `en` prefix in the array)

---

### Requirement: Middleware Locale + CORS + Rate-Limit Fusion

The system MUST fuse next-intl's `createMiddleware` with the existing CORS and rate-limit logic.
CORS headers for `/api/*` MUST be applied AFTER the locale redirect decision; if the path starts with `/api/`, the middleware MUST apply CORS headers to the response and return early without locale processing.
Rate-limit headers MUST be applied to all responses (locale and API alike).
The middleware matcher MUST exclude `_next/static`, `_next/image`, `favicon.ico`, and all `/api/*` paths from locale detection.

#### Scenario: API request retains CORS headers

- GIVEN a cross-origin request to `/api/revalidate`
- WHEN the middleware runs
- THEN the response includes `Access-Control-Allow-Origin` and rate-limit headers; no locale redirect is performed

#### Scenario: Page request receives locale redirect when needed

- GIVEN a browser request to `/noticias` with `Accept-Language: en`
- WHEN the middleware runs
- THEN next-intl handles locale selection per `localePrefix: 'as-needed'`; rate-limit headers are present on the response

---

### Requirement: HTML Lang Attribute Reflects Active Locale

The `<html lang>` attribute MUST equal the active locale string (`es`, `en`, `pt-BR`, `gn`) for every rendered page.

#### Scenario: Spanish page sets lang to es

- GIVEN a user on `/noticias`
- WHEN the page HTML is inspected
- THEN `<html lang="es">` is present

#### Scenario: English page sets lang to en

- GIVEN a user on `/en/noticias`
- WHEN the page HTML is inspected
- THEN `<html lang="en">` is present

---

### Requirement: i18n Configuration Files

The system MUST provide `i18n/routing.ts` defining the locales array and defaultLocale.
The system MUST provide `i18n/request.ts` exporting `getRequestConfig` for server-side message loading.
The system MUST provide `i18n/navigation.ts` re-exporting next-intl's locale-aware `Link`, `redirect`, `useRouter`, and `usePathname`.
All locale-aware internal navigation MUST use the exports from `i18n/navigation.ts`.

#### Scenario: Internal link auto-prepends locale prefix

- GIVEN a component renders `<Link href="/noticias">` from `i18n/navigation.ts`
- WHEN the active locale is `en`
- THEN the rendered anchor href is `/en/noticias`

---

## New Capability: i18n-messages

### Requirement: Message Catalog Structure

The system MUST store message catalogs under `messages/{locale}/` with one JSON file per namespace.
Required namespaces: `common`, `nav`, `accessibility`, `pages.home`, `pages.noticias`, `pages.buscar`, `pages.transparencia`, `pages.revistas`, `pages.biblioteca`, `pages.solicitar-titulo`, `pages.informacion-publica`.
Every key present in `messages/es/` MUST also exist in every other locale's catalog; missing translations MUST fall back to the Spanish value — never to a raw key string.
`messages/es/` is the authoritative source; `gn` and `pt-BR` MAY initially contain Spanish values as placeholder fallbacks.

#### Scenario: Missing gn key falls back to Spanish text

- GIVEN `messages/gn/common.json` does not contain the key `search.placeholder`
- WHEN a Guaraní user views a page that renders that key
- THEN the UI displays the Spanish text for `search.placeholder`, not the string `"search.placeholder"`

#### Scenario: All es keys covered in en catalog

- GIVEN `messages/es/nav.json` has N keys
- WHEN `messages/en/nav.json` is read
- THEN it contains those same N keys with English translations (or Spanish fallbacks for any untranslated ones at Phase 1)

---

### Requirement: Server Component Translation

All server page components MUST replace hardcoded UI strings with `t('key')` calls obtained via `await getTranslations(namespace)` from `next-intl/server`.
Date and number formatting MUST use `getFormatter()` from next-intl rather than `toLocaleDateString('es-PY')` or any other hardcoded locale string.

#### Scenario: Page renders with translated heading

- GIVEN the active locale is `en`
- WHEN `app/[locale]/noticias/page.tsx` renders
- THEN the page heading is the English value from `messages/en/pages.noticias.json`, not a hardcoded Spanish string

#### Scenario: Date formatted by locale

- GIVEN a news item with a publication date
- WHEN the page renders for locale `pt-BR`
- THEN the date is formatted according to `pt-BR` conventions via next-intl's formatter

---

### Requirement: Client Component Translation

All `'use client'` components MUST replace hardcoded UI strings with `t('key')` obtained via `useTranslations(namespace)`.
Every client component using `useTranslations` MUST be rendered inside `NextIntlClientProvider`.
`NextIntlClientProvider` MUST be placed in `app/[locale]/layout.tsx`, above all client subtrees.

#### Scenario: Header renders translated nav items

- GIVEN the active locale is `pt-BR`
- WHEN the Header client component mounts
- THEN navigation labels are Portuguese values from `messages/pt-BR/nav.json`

#### Scenario: Missing provider causes build error, not runtime crash

- GIVEN a client component calls `useTranslations` outside the provider tree
- WHEN the application builds or the component mounts
- THEN next-intl throws an error at render time — this scenario MUST be prevented by the layout structure (provider always wraps the tree)

---

### Requirement: Locale Switcher Component

The system MUST provide a `components/i18n/LocaleSwitcher.tsx` client component.
It MUST render a selectable option for each of the 4 locales.
Selecting a locale MUST navigate to the same path in the new locale without a full page reload.
The active locale MUST be visually distinguished.
It MUST be rendered in the Header on desktop (right of the search icon) and in the mobile menu panel.

#### Scenario: Switching locale stays on same page

- GIVEN a user is on `/en/noticias` and selects `pt-BR` in the LocaleSwitcher
- WHEN the selection is made
- THEN the user navigates to `/pt-BR/noticias` via client-side navigation (no full reload)

#### Scenario: Active locale is highlighted

- GIVEN the active locale is `gn`
- WHEN the LocaleSwitcher renders
- THEN the `gn` option has a distinct visual state and the other 3 do not

---

### Requirement: Type Safety

`messages/es/` namespaces MUST be declared in a global type definition file (e.g., `next-intl.d.ts`) so `t()` calls are type-checked against actual message keys.
`tsc --noEmit` MUST pass with zero new TypeScript errors after the migration.
`next build` MUST complete without errors.

#### Scenario: Typo in t() key caught at compile time

- GIVEN a component calls `t('nonexistent.key')`
- WHEN `tsc --noEmit` runs
- THEN a type error is reported for the invalid key

---

### Requirement: Static Params and Metadata

Every page under `app/[locale]/` MUST export `generateStaticParams` returning the 4 locale objects: `[{ locale: 'es' }, { locale: 'en' }, { locale: 'pt-BR' }, { locale: 'gn' }]`.
`generateMetadata` MUST read `params.locale` and use it for locale-appropriate metadata.

#### Scenario: Build generates all 4 locale variants of each page

- GIVEN `next build` runs with static export or ISR
- WHEN routes are pre-rendered
- THEN each page exists for all 4 locales

---

## Acceptance Scenarios (QA Smoke Tests)

| # | Path | Check | Pass condition |
|---|------|-------|----------------|
| 1 | `/noticias` | No redirect, `lang="es"`, Spanish UI | 200, no location header, Spanish labels |
| 2 | `/en/noticias` | English UI strings, `lang="en"` | 200, English labels |
| 3 | `/pt-BR/noticias` | Portuguese UI strings, `lang="pt-BR"` | 200, pt-BR labels |
| 4 | `/gn/noticias` | Guaraní or Spanish fallback UI, `lang="gn"` | 200, no raw keys visible |
| 5 | `/api/revalidate` | Not redirected, has CORS headers | 200/401, `Access-Control-Allow-Origin` present |
| 6 | LocaleSwitcher in header | Click `en` on `/noticias` → `/en/noticias` | URL changes, no reload, `lang` updates |
| 7 | `tsc --noEmit` | Zero new errors | Exit code 0 |
| 8 | `next build` | No new errors | Exit code 0 |

---

## Out of Scope (enforced non-goals)

- CMS content localisation (Payload collections remain Spanish-only)
- `hreflang` tags or locale-specific sitemaps
- `Accept-Language` auto-detection or cookie persistence beyond URL
- Professional linguistic review of `gn` or `pt-BR` catalogs
- Any changes to `lib/cms/**`
