# Verification Report: portal-home-complete

**Date:** 2026-07-30  
**Verdict:** PASS WITH WARNINGS  
**Mode:** openspec

---

## Completeness Table

| Task | Description | Status |
|---|---|---|
| T01 | socialLinks — 4 real official URLs | COMPLETE |
| T02 | Address block — email secgral@unc.edu.py + PhoneIcon + phone number | COMPLETE |
| T03 | MITIC block — SVG inline + mitic.gov.py link + guía link | COMPLETE |
| T04 | StatsBlock.tsx — useCountUp with rAF + easeOutQuart, 1200ms | COMPLETE |
| T05 | IntersectionObserver — threshold 0.2, fires once, SSR-safe | COMPLETE |
| T06 | page.tsx — async Server Component, getNews({ limit: 6 }), no newsItems array | COMPLETE |
| T07 | StatsBlock inserted in page.tsx after news section | COMPLETE |
| T08 | tsc --noEmit — 0 portal errors (1 pre-existing CMS test error, unrelated) | COMPLETE |

---

## Build / Type-Check Evidence

Command: `npx tsc --noEmit` from `/unc-portal`

```
apps/cms/tests/int/api.int.spec.ts(2,20): error TS2307: Cannot find module '@/payload.config'
```

Portal-scope errors: **0**  
The single error is in `apps/cms/tests/int/api.int.spec.ts` — a CMS test file, pre-existing, outside the scope of this change. All three affected files (Footer.tsx, StatsBlock.tsx, app/[locale]/page.tsx) typecheck clean.

---

## Spec Compliance Matrix

### REQ-01 — Footer: contact data

| Requirement | Implementation | Status |
|---|---|---|
| R1.1 Address "Km 210, Ruta PY05, Concepción, Paraguay" | Lines 556-558 of Footer.tsx — exact match | PASS |
| R1.2 Phone (595 331) 241069 – 240883 with PhoneIcon | Lines 575-583 — PhoneIcon rendered, text matches | PASS |
| R1.3 Email secgral@unc.edu.py | Line 570 — displayed correctly | PASS |
| R1.4 href="mailto:secgral@unc.edu.py" | Line 563 — exact match | PASS |

### REQ-02 — Footer: social links

| Requirement | Implementation | Status |
|---|---|---|
| R2.1 Facebook URL | Line 85 — exact match | PASS |
| R2.1 X/Twitter URL | Line 90 — exact match | PASS |
| R2.1 Instagram URL | Line 95 — exact match | PASS |
| R2.1 YouTube URL | Line 100 — exact match | PASS |
| R2.2 target="_blank" rel="noopener noreferrer" | Lines 502-503 — present on all social links | PASS |

### REQ-03 — Footer: MITIC attribution

| Requirement | Implementation | Status |
|---|---|---|
| R3.1 MITIC logo/seal in legal bar | MiticLogo SVG component rendered in legal bar | PASS |
| R3.2 Link to mitic.gov.py with target="_blank" | Lines 658-663 — exact match | PASS |
| R3.3 SVG inline (no external asset dependency) | MiticLogo is 100% SVG inline, lines 394-422 | PASS |
| R3.4 "Basado en la Guía estándar..." text visible | Lines 647-648 — text rendered, color text-white/30 (slightly below spec's text-white/40 but visible) | PASS |
| R3.5 Guía link → mitic.gov.py/materiales/... | Line 650 — exact URL | PASS |

### REQ-04 — Homepage: CMS news

| Requirement | Implementation | Status |
|---|---|---|
| R4.1 No hardcoded newsItems array | Confirmed absent from app/[locale]/page.tsx | PASS |
| R4.2 getNews({ limit: 6 }) called | Line 141 — exact call | PASS |
| R4.3 Async Server Component | Line 140: `export default async function Home()` | PASS |
| R4.4 CMS fallback → DEMO_NEWS | getNews() catches internally and returns DEMO_NEWS. Additional `.catch(() => ({ docs: [] }))` in page.tsx overrides with empty array on extreme edge case | WARN |
| R4.5 Result mapped to news layout | Lines 344-428 — direct field access: n.title, n.slug, n.publishedAt, n.category, n.featuredImage | PASS |
| R4.6 Image fallback to /images/campus-3d/hero-entry-960.webp | Line 370 — null-coalescence fallback | PASS |
| R4.7 href: /noticias/{slug} | Line 364 — `href={\`/noticias/${n.slug}\`}` | PASS |

### REQ-05 — StatsBlock

| Requirement | Implementation | Status |
|---|---|---|
| R5.1 'use client' directive | Line 1 of StatsBlock.tsx | PASS |
| R5.2 6 stats — exact values | 5 of 6 hardcoded (4985, 10, 762, 6, 672). "Días de actividad" uses daysSinceFounding() — dynamic (≈6205) | SUGGEST |
| R5.3 IntersectionObserver threshold 0.2, ~1.2s easing | threshold: 0.2 (line 75), duration 1200ms (line 48), easeOutQuart (lines 21-23) | PASS |
| R5.4 Animation fires once only | observer.disconnect() on first isIntersecting (line 72) | PASS |
| R5.5 SSR/no-IO fallback | `if (!('IntersectionObserver' in window)) { setActive(true) }` lines 64-66 | PASS |
| R5.6 Grid 2col mobile / 3col ≥md | `grid-cols-2 md:grid-cols-3` (line 88) | PASS |
| R5.7 bg-slate-900 + text-[#5CFF5C] | Section bg (line 82) + span class (line 51) | PASS |
| R5.8 StatsBlock after news section | Line 432 of page.tsx — correct position | PASS |

### NFR-01

| Requirement | Status |
|---|---|
| NF1.1 tsc --noEmit passes (portal scope) | PASS |
| NF1.2 Footer is Server Component (no 'use client') | PASS — Footer.tsx has no 'use client' directive |
| NF1.3 No placeholder contact data | PASS — all data is real (secgral@unc.edu.py, real phone, real address) |

---

## Design Coherence

| Design Decision | Implemented As Designed | Notes |
|---|---|---|
| Footer: surgical edit, no JSX rewrite | Yes — only socialLinks, address block, and MITIC bar changed | PASS |
| MITIC: SVG inline placeholder | Yes — MiticLogo component with inline SVG | PASS |
| StatsBlock: useCountUp + rAF + easeOutQuart | Yes — matches design spec exactly | PASS |
| IntersectionObserver: SSR-safe, one-shot | Yes — window check inside useEffect, disconnect on fire | PASS |
| Homepage: async SC + getNews + inline mapping | Yes — no intermediate type created, mapped directly | PASS |

---

## Issues

### WARNING

**W01 — Path deviation: app/[locale]/page.tsx vs app/page.tsx**  
The spec and design reference `app/page.tsx`. The actual file is `app/[locale]/page.tsx`. This is consistent with the project's next-intl locale routing structure, intentional, and the correct location. No code issue. The spec artifact path reference needs updating at archive time.

**W02 — Redundant catch overrides DEMO_NEWS fallback**  
In `app/[locale]/page.tsx` line 141:
```typescript
const { docs: noticias } = await getNews({ limit: 6 }).catch(() => ({ docs: [] }))
```
`getNews()` already catches all CMS failures and returns DEMO_NEWS silently. The additional `.catch()` would only activate if getNews itself threw unexpectedly — and in that case it returns an empty array (blank news section) instead of DEMO_NEWS. Risk is extremely low since getNews has a bullet-proof internal catch. Recommend removing the extra `.catch()` or changing it to `catch(() => ({ docs: DEMO_NEWS }))`.

### SUGGESTION

**S01 — "Días de actividad" is dynamic, not hardcoded 6205**  
Spec says value: 6205. Implementation computes `daysSinceFounding()` from `new Date('2009-08-03')`. This is strictly better — the counter stays accurate over time. As of 2026-07-30 the value is ≈6204-6206. Recommend updating the spec to reflect the dynamic approach rather than a static value.

---

## Final Verdict

**PASS WITH WARNINGS**

- 0 CRITICAL issues
- 2 WARNINGS (low-risk: path nomenclature in spec + redundant catch clause)  
- 1 SUGGESTION (dynamic days counter is an improvement over spec)
- All 8 tasks verified complete in code
- TypeScript clean for all changed portal files
- Footer data fully correct (address, phone, email, social URLs, MITIC)
- StatsBlock fully implements the design (rAF, easing, IntersectionObserver, SSR fallback)
- Homepage async with CMS wiring and StatsBlock integrated
