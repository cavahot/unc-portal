# Spec: portal-home-complete

**Depends on:** proposal.md  
**Date:** 2026-07-29

---

## REQ-01 — Footer: datos de contacto correctos

**Priority:** Must  
**Component:** `components/layout/Footer.tsx`

### Requirements

- R1.1 La dirección debe ser exactamente: **"Km 210, Ruta PY05, Concepción, Paraguay"**
- R1.2 El teléfono **(595 331) 241069 – 240883** debe aparecer en el bloque de contacto con ícono de teléfono
- R1.3 El email de contacto debe ser **secgral@unc.edu.py** (reemplaza el placeholder `contacto@unc.edu.py`)
- R1.4 El `href` del enlace de email debe ser `mailto:secgral@unc.edu.py`

### Scenarios

```
DADO que un visitante accede a cualquier página del portal
CUANDO hace scroll hasta el footer
ENTONCES ve la dirección, teléfono y email correctos del Rectorado
Y el email es un enlace `mailto:` que abre el cliente de correo
```

---

## REQ-02 — Footer: redes sociales oficiales

**Priority:** Must  
**Component:** `components/layout/Footer.tsx`

### Requirements

- R2.1 Los 4 enlaces de redes sociales deben apuntar a las URLs oficiales extraídas de www.unc.edu.py:
  - Facebook: `https://www.facebook.com/people/unc_py/100089915906133/?mibextid=ZbWKwL`
  - X (Twitter): `https://x.com/UncConcepcion`
  - Instagram: `https://www.instagram.com/unc_py/`
  - YouTube: `https://youtube.com/@universidadnacionaldeconce5302?si=o_PW3t0JmcZLeKrS`
- R2.2 Todos los enlaces de redes sociales deben tener `target="_blank"` y `rel="noopener noreferrer"`

### Scenarios

```
DADO que un visitante hace clic en el ícono de Facebook en el footer
ENTONCES se abre la página oficial de UNC en Facebook en una nueva pestaña
```

---

## REQ-03 — Footer: atribución MITIC

**Priority:** Must (requisito legal para sitios gubernamentales paraguayos)  
**Component:** `components/layout/Footer.tsx`

### Requirements

- R3.1 El footer debe incluir el logo/sello de MITIC en la barra legal inferior
- R3.2 El logo debe ser un enlace a `https://mitic.gov.py/` con `target="_blank"`
- R3.3 Si el asset oficial no está disponible, usar SVG inline con texto "Desarrollado por MITIC" 
- R3.4 El texto "Basado en la Guía estándar para sitios web del Gobierno" debe ser visible (puede ser muy pequeño, color `text-white/40`)
- R3.5 El enlace de la Guía debe apuntar a `https://mitic.gov.py/materiales/norma-de-gobierno-linea-grafica/`

### Scenarios

```
DADO que un auditor gubernamental revisa el footer del portal
ENTONCES ve la atribución MITIC visible en la barra legal inferior
Y el logo MITIC enlaza a mitic.gov.py en nueva pestaña
```

---

## REQ-04 — Homepage: noticias desde CMS

**Priority:** Must  
**Component:** `app/page.tsx`

### Requirements

- R4.1 Eliminar el array hardcodeado `newsItems` de `app/page.tsx`
- R4.2 Importar y llamar `getNews({ limit: 6 })` desde `lib/cms/queries/news`
- R4.3 El componente debe ser `async` y hacer el fetch en el servidor
- R4.4 Si el CMS no responde, `getNews()` retorna `DEMO_NEWS` silenciosamente (ya implementado en la query)
- R4.5 Mapear los resultados al formato que espera la sección de noticias existente en `app/page.tsx`
- R4.6 Si `featuredImage` es null, usar imagen de placeholder local (`/images/campus-3d/hero-entry-960.webp`)
- R4.7 El `href` de cada noticia debe ser `/noticias/{slug}` (no `/noticias`)

### Scenarios

```
DADO que hay noticias publicadas en el CMS
CUANDO un visitante accede al homepage
ENTONCES ve las 6 noticias más recientes en la sección de noticias

DADO que el CMS no está disponible (Vercel sin conexión al CMS local)
CUANDO un visitante accede al homepage
ENTONCES ve las 4 noticias demo sin mensajes de error

DADO que una noticia no tiene imagen destacada
CUANDO se renderiza su card
ENTONCES usa una imagen de campus como fallback, sin romper el layout
```

---

## REQ-05 — Homepage: bloque de estadísticas animado

**Priority:** Should  
**Component:** `components/stats/StatsBlock.tsx` (nuevo)

### Requirements

- R5.1 Crear un nuevo componente client-side `StatsBlock` con `'use client'`
- R5.2 Mostrar 6 estadísticas con sus valores exactos:
  - 6205 — "Días de actividad"
  - 4985 — "Estudiantes"
  - 10 — "Carreras acreditadas"
  - 762 — "Docentes y colaboradores"
  - 6 — "Facultades"
  - 672 — "Egresados"
- R5.3 Cuando el bloque entra al viewport (IntersectionObserver, threshold: 0.2), los números animan de 0 al valor final en ~1.2s con easing
- R5.4 La animación solo corre una vez (desconectar el observer después del primer disparo)
- R5.5 Si IntersectionObserver no existe (SSR/bot), mostrar el valor final directamente
- R5.6 Layout: grid 2 columnas en mobile, 3 columnas en ≥ md
- R5.7 Fondo oscuro (`bg-slate-900`) con números en UNC green (`text-[#5CFF5C]`)
- R5.8 Insertar `<StatsBlock>` en `app/page.tsx` después de la sección de noticias

### Scenarios

```
DADO que un visitante hace scroll hasta la sección de estadísticas
CUANDO el bloque entra al 20% del viewport
ENTONCES los 6 contadores comienzan a animar de 0 a su valor final
Y la animación dura aproximadamente 1.2 segundos

DADO que el visitante ya vio la animación y sigue haciendo scroll
CUANDO vuelve a pasar por la sección
ENTONCES los contadores ya muestran el valor final (no reanima)
```

---

## NFR-01 — Calidad técnica

- NF1.1 `tsc --noEmit` debe pasar sin errores tras los cambios
- NF1.2 El Footer es un Server Component (sin `'use client'`); solo StatsBlock usa cliente
- NF1.3 Ningún dato de contacto puede quedar como placeholder en producción

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `components/layout/Footer.tsx` | Modificación (URLs, email, teléfono, MITIC) |
| `components/stats/StatsBlock.tsx` | Nuevo archivo |
| `app/page.tsx` | Modificación (CMS news + StatsBlock) |
