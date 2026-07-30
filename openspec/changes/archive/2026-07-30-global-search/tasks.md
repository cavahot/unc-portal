# Tasks: global-search

**Depends on:** spec.md, design.md  
**Date:** 2026-07-29

---

- [x] T01: Agregar `getNewsByQuery(q, options?)` en `lib/cms/queries/news.ts` — query OR Payload + fallback DEMO_NEWS filtrado
- [x] T02: Crear `app/[locale]/buscar/page.tsx` — Server Component con `generateMetadata`, `SearchForm` inline, grid de cards, empty state  
      _(path adjusted: project uses `app/[locale]/` i18n structure; implemented at `app/[locale]/buscar/page.tsx`)_
- [x] T03: Correr `tsc --noEmit` y confirmar 0 errores nuevos  
      _(pre-existing error in `apps/cms/tests/int/api.int.spec.ts` unrelated to this change; no new errors introduced)_
