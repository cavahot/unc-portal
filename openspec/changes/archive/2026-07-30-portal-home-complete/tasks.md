# Tasks: portal-home-complete

**Depends on:** spec.md, design.md  
**Date:** 2026-07-29

---

## Bloque 1 — Footer

- [x] T01: Corregir constante `socialLinks` en `components/layout/Footer.tsx` con las 4 URLs oficiales reales
- [x] T02: Corregir bloque `<address>` en `components/layout/Footer.tsx` — email `secgral@unc.edu.py` + añadir teléfono `(595 331) 241069 – 240883` con PhoneIcon
- [x] T03: Añadir bloque MITIC en la barra legal inferior de `components/layout/Footer.tsx` — SVG inline + enlace a `https://mitic.gov.py/` + texto guía con link

## Bloque 2 — StatsBlock

- [x] T04: Crear `components/stats/StatsBlock.tsx` con hook `useCountUp` (requestAnimationFrame + easing easeOutQuart, duración 1200ms)
- [x] T05: Añadir IntersectionObserver en StatsBlock — dispara una sola vez al entrar al viewport con threshold 0.2, SSR-safe

## Bloque 3 — Homepage

- [x] T06: Convertir `app/page.tsx` a async Server Component — importar `getNews`, eliminar array `newsItems`, mapear resultado CMS al layout de noticias existente con fallback de imagen
- [x] T07: Insertar `<StatsBlock />` en `app/page.tsx` después de la sección de noticias

## Verificación

- [x] T08: Correr `tsc --noEmit` y confirmar 0 errores de tipos
