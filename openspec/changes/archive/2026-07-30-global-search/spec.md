# Spec: global-search

**Depends on:** proposal.md  
**Date:** 2026-07-29

---

## REQ-01 — Página `/buscar`

**Priority:** Must  
**File:** `app/buscar/page.tsx`

### Requirements

- R1.1 Server Component async que lee `searchParams: Promise<{ q?: string }>`
- R1.2 Si `q` está presente y no está vacío: llama `getNewsByQuery(q, { limit: 12 })`
- R1.3 Si `q` está ausente o vacío: llama `getNews({ limit: 12 })` (browse mode)
- R1.4 Metadata dinámica: `title: q ? \`Búsqueda: "${q}" — UNC\` : 'Buscar — UNC'`
- R1.5 Layout oscuro consistente con `/noticias` (`bg-slate-950 pt-28 pb-20`)

### Scenarios

```
DADO que el visitante accede a /buscar sin parámetros
ENTONCES ve las 12 noticias más recientes con el título "Explorar noticias"

DADO que el visitante accede a /buscar?q=rector
ENTONCES ve las noticias cuyo título o resumen contiene "rector"
Y el heading muestra 'Resultados para "rector"'

DADO que no hay resultados para la query
ENTONCES ve un empty state con el mensaje "No encontramos noticias para "[query]""
Y un botón "Ver todas las noticias" que enlaza a /noticias
```

---

## REQ-02 — Input de búsqueda en la página

**Priority:** Must

### Requirements

- R2.1 Un `<form method="GET" action="/buscar">` con un `<input name="q">` pre-relleno con el valor actual de `q`
- R2.2 El input tiene `placeholder="Buscar noticias..."`, `aria-label="Buscar en el portal"`, `type="search"`
- R2.3 Botón submit con ícono de lupa y texto "Buscar"
- R2.4 Funciona sin JavaScript (form nativo GET)

---

## REQ-03 — Query `getNewsByQuery`

**Priority:** Must  
**File:** `lib/cms/queries/news.ts`

### Requirements

- R3.1 Nueva función `getNewsByQuery(q: string, options?: { limit?: number }): Promise<PayloadResponse<NewsItem>>`
- R3.2 La query usa condición OR de Payload: `where[or][0][title][like]=q&where[or][1][summary][like]=q`
- R3.3 Siempre filtra por `where[_status][equals]=published`
- R3.4 Si el CMS falla: retorna DEMO_NEWS filtrado — `DEMO_NEWS.filter(n => n.title.toLowerCase().includes(q.toLowerCase()) || n.summary?.toLowerCase().includes(q.toLowerCase()))`
- R3.5 Tag de revalidación: `noticias-search`
- R3.6 Timeout heredado del `cmsFetch` existente (ya tiene AbortController de 8s)

---

## REQ-04 — Grid de resultados

**Priority:** Must

### Requirements

- R4.1 Mismo componente de card que usa `/noticias/page.tsx` (no crear nuevo componente — copiar el JSX del card)
- R4.2 Grid `sm:grid-cols-2 lg:grid-cols-3` con `gap-6`
- R4.3 Cada card enlaza a `/noticias/${slug}` (igual que en el listing)
- R4.4 Si `featuredImage` es null, mostrar placeholder verde oscuro (igual que en listing)

---

## REQ-05 — Header: mejorar el link de búsqueda

**Priority:** Should  
**File:** `components/layout/Header.tsx` (o el componente que tenga el link `/buscar`)

### Requirements

- R5.1 Verificar dónde está el link `/buscar` en el header
- R5.2 Si es un `<Link href="/buscar">`, dejarlo como está — el formulario está en la página destino
- R5.3 No agregar lógica de búsqueda en el header en este cambio

---

## NFR-01

- NF1.1 `tsc --noEmit` pasa sin errores
- NF1.2 La página es Server Component — sin `'use client'`
- NF1.3 Sin librerías de UI externas
