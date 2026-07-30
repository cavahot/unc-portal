# Proposal: global-search

**Change ID:** global-search  
**Date:** 2026-07-29  
**Status:** draft

---

## 1. Problema

El portal tiene un link "Buscar" en el header que apunta a `/buscar` pero esa ruta no existe — devuelve 404. Los visitantes no pueden encontrar noticias ni contenido por texto libre.

---

## 2. Solución propuesta

Una página `/buscar` Server Component que:

1. Lee el parámetro `?q=` de la URL
2. Consulta el CMS con `cmsFetch` usando `where[title][like]` y `where[summary][like]`
3. Renderiza los resultados como cards (mismo diseño que `/noticias`)
4. Cae silenciosamente a DEMO_NEWS filtrado cuando el CMS no responde
5. Muestra estado vacío cuando no hay resultados para la query

El input de búsqueda es un `<form>` con `method="GET"` — al hacer submit navega a `/buscar?q=texto`. Sin JavaScript requerido para la búsqueda básica.

---

## 3. Flujo de usuario

```
Usuario escribe en el header → presiona Enter → navega a /buscar?q=texto
                                                       ↓
                                          Server Component lee params
                                                       ↓
                                          cmsFetch → CMS (o DEMO_NEWS)
                                                       ↓
                                          Renderiza resultados / empty state
```

---

## 4. Query al CMS

Payload CMS soporta condiciones OR via `where[or]`:

```
GET /api/noticias
  ?where[or][0][title][like]=texto
  &where[or][1][summary][like]=texto
  &where[_status][equals]=published
  &sort=-publishedAt
  &limit=12
  &depth=2
```

Esta query se agrega como `getNewsByQuery(q: string)` en `lib/cms/queries/news.ts`.

---

## 5. Scope

### In scope
- `app/buscar/page.tsx` — Server Component, lee `searchParams.q`
- `lib/cms/queries/news.ts` — agregar `getNewsByQuery(q)`
- Input de búsqueda en el header (ya existe el link, mejorar con `<form>`)

### Out of scope
- Búsqueda en tiempo real / autocomplete (requiere debounce client-side — mejora futura)
- Búsqueda en otras colecciones (páginas, facultades)
- Indexación full-text (Meilisearch/Algolia)

---

## 6. Criterios de éxito

1. `/buscar?q=rector` devuelve noticias que contienen "rector" en título o resumen
2. `/buscar` sin parámetro muestra las últimas 12 noticias (browse mode)
3. `/buscar?q=xyzabc` muestra empty state con mensaje claro
4. CMS caído → fallback silencioso con DEMO_NEWS filtrado
5. `tsc --noEmit` pasa sin errores nuevos
