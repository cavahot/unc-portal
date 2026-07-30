# Proposal: portal-home-complete

**Change ID:** portal-home-complete  
**Date:** 2026-07-29  
**Status:** draft

---

## 1. Problem

The UNC portal currently has two critical gaps visible to any visitor:

1. **Homepage shows hardcoded fake data** — the news section is static, not connected to the CMS. Content editors publish noticias but they never appear on the home page.
2. **Footer is missing entirely** — no contact information, no social media links, no MITIC attribution. The MITIC branding requirement is legally mandatory for Paraguayan government websites and the portal is in breach of that standard.

---

## 2. Proposed Solution

Deliver two self-contained UI components and wire them into the portal:

### A. Footer institucional
A full-width footer replacing the current empty footer, with:
- Institutional logo
- Contact block: address, phone, email
- Social media icons: Facebook, X, Instagram, YouTube (links scraped from www.unc.edu.py)
- MITIC government attribution (logo + link to mitic.gov.py), required by Paraguay's Guía estándar para sitios web del Gobierno
- Copyright line with current year

### B. Homepage real data
Replace the hardcoded news on `app/page.tsx` with live data from the CMS:
- Fetch the latest 6 noticias via `getNews({ limit: 6 })` with the existing DEMO_NEWS fallback
- Render them in the existing news section layout

### C. Statistics block (innovative format)
A dedicated `<StatsBlock>` component placed on the homepage with animated counters:
- Numbers animate from 0 → final value when the section enters the viewport (IntersectionObserver)
- Values: 6205 días, 4985 estudiantes, 10 carreras acreditadas, 762 docentes y colaboradores, 6 facultades, 672 egresados
- Dark background with UNC green accents, card-grid layout (3×2)

---

## 3. Scope

### In scope
- `components/footer/Footer.tsx` — new component
- `components/stats/StatsBlock.tsx` — new component with counter animation
- `app/layout.tsx` — add `<Footer>` to root layout
- `app/page.tsx` — wire `getNews({ limit: 6 })`, add `<StatsBlock>`
- MITIC logo: SVG placeholder if official asset unavailable

### Out of scope
- Global search
- Accessibility toolbar (separate change)
- Per-image blur hash in Media.ts
- MinIO S3 plugin re-enable (blocked on dedicated server)
- CMS-driven footer content (future: add Footer global in Payload)

---

## 4. Business rules

- MITIC attribution must appear in every page footer (not just homepage)
- Social media links must open in a new tab
- Footer must render correctly without JavaScript (server component)
- News fallback: if CMS unreachable, show DEMO_NEWS silently — no error state visible to visitors
- Statistics are hardcoded for now; values can be updated by editing the component constant

---

## 5. Success criteria

1. Footer appears on every page of the portal (home, /noticias, /noticias/[slug])
2. Footer contains address, phone, email, 4 social media links, and MITIC logo
3. Homepage news section shows the 3–6 most recent noticias from the CMS (or demo fallback)
4. StatsBlock is visible on homepage with 6 animated counters
5. No TypeScript errors (`tsc --noEmit` passes)
6. No visible layout regression on mobile (375px) and desktop (1280px)

---

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| MITIC official logo not available | Low | Use SVG text-based placeholder; user will swap the asset later |
| Homepage currently has complex hero layout — inserting news may break layout | Medium | Read app/page.tsx fully before editing; scope insert to existing news section |
| Counter animation breaks SSR | Low | IntersectionObserver is client-only; wrap StatsBlock in `'use client'` |
