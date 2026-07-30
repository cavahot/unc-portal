# Design: global-search

**Depends on:** spec.md  
**Date:** 2026-07-29

---

## 1. Decisiones de arquitectura

### Server Component puro — sin estado cliente

La búsqueda usa el patrón URL-driven nativo de Next.js App Router:

- El estado de búsqueda vive en la URL (`?q=`)
- El browser maneja la navegación (form GET nativo)
- No hay `useState`, no hay `useRouter`, no hay debounce
- El servidor renderiza la respuesta completa para cada query
- Ventajas: funciona sin JS, indexable por SEO, compartible por link, no hay flash de estado

### Por qué no fetch en el cliente

Un input con `onChange` + `fetch` requiere debounce, loading states, y manejo de race conditions. Para un portal universitario con ~12-50 noticias, el round-trip al servidor por navegación es imperceptible y más simple de mantener.

---

## 2. Query OR en Payload CMS

Payload soporta condiciones compuestas via `where[or]`:

```
/api/noticias
  ?where[or][0][title][like]=rector
  &where[or][1][summary][like]=rector
  &where[_status][equals]=published
  &sort=-publishedAt
  &limit=12
  &depth=2
```

`URLSearchParams` construye esto limpiamente:

```typescript
const params = new URLSearchParams()
params.append('where[or][0][title][like]', q)
params.append('where[or][1][summary][like]', q)
params.append('where[_status][equals]', 'published')
params.append('sort', '-publishedAt')
params.append('limit', String(limit))
params.append('depth', '2')
```

---

## 3. Estructura de `app/buscar/page.tsx`

```
BuscarPage (async Server Component)
  ├── await searchParams → extrae q
  ├── await getNewsByQuery(q) || getNews()
  ├── <SearchForm defaultValue={q} />   ← form GET nativo
  ├── heading dinámico
  ├── grid de cards (mismo JSX de /noticias)
  └── <EmptyState query={q} />          ← solo si results.length === 0
```

`generateMetadata` también es async y usa `searchParams`.

---

## 4. Reutilización del card de noticias

El card de `/noticias/page.tsx` es JSX inline (no un componente separado). Para este cambio, el card se duplica en `buscar/page.tsx` — misma estructura, mismo Tailwind. No se extrae a un componente compartido todavía porque:

1. El criterio de extracción es 3+ usos — actualmente son 2
2. Una abstracción prematura complica el árbol de componentes
3. Si en el futuro se necesita un tercer lugar, se extrae entonces

---

## 5. Secuencia de implementación

1. `lib/cms/queries/news.ts` — agregar `getNewsByQuery`
2. `app/buscar/page.tsx` — página completa
3. `tsc --noEmit`

**Total: 2 archivos, 1 nuevo, 1 edit quirúrgico.**
