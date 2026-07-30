# Design: portal-home-complete

**Depends on:** spec.md  
**Date:** 2026-07-29

---

## Decisiones de arquitectura

### 1. Footer — estrategia de edición

**Decisión:** Edición quirúrgica, sin reescribir el componente.

El componente existente (`components/layout/Footer.tsx`) tiene estructura correcta, iconos SVG, grid responsive y estilos consistentes. Lo que hay que cambiar son únicamente:

- Constante `socialLinks` → 4 URLs reales
- Bloque `<address>` → añadir teléfono, corregir email
- Barra legal inferior → añadir bloque MITIC

**No se toca:** estructura JSX, grid, estilos, navegación, iconos de redes sociales.

---

### 2. MITIC — SVG inline placeholder

**Decisión:** SVG inline en el footer, sin dependencia de asset externo.

El logo oficial de MITIC no está disponible como archivo. En lugar de un `<img>` que rompe si falta el archivo, usar un SVG inline que representa visualmente el sello: escudo simple + texto "MITIC" + "Gobierno del Paraguay".

Esto satisface el requisito legal de atribución visible y permite que el usuario reemplace el SVG con el asset oficial cuando lo tenga.

Estructura visual del placeholder:

```
[ escudo SVG ] MITIC
               Gobierno de la República del Paraguay
```

Enlace envuelve todo el bloque → `https://mitic.gov.py/`

---

### 3. StatsBlock — arquitectura del componente

**Decisión:** `'use client'` con hook `useCountUp` y `useRef` para el observer.

#### Por qué `requestAnimationFrame` y no CSS transitions

CSS `counter()` no existe para valores animados. Las alternativas son:
- **CSS transitions** en un `--value` custom property → requiere hacks de keyframes generados dinámicamente, no funciona con valores arbitrarios.
- **`setInterval`** → impreciso, no respeta el frame rate del navegador.
- **`requestAnimationFrame` (rAF)** → preciso, cancelable, respeta 60fps/120fps, estándar para animaciones de JS.

Elegimos rAF.

#### Hook `useCountUp`

```typescript
function useCountUp(target: number, duration: number, active: boolean): number
```

- Recibe el valor final, duración en ms, y si debe correr.
- Mientras `active === false`, devuelve `0`.
- Cuando `active` cambia a `true`, arranca el loop rAF.
- Usa easing `easeOutQuart`: `1 - (1-t)^4` — arranque rápido, frenada suave al llegar al valor.
- Retorna el valor actual (número entero).
- Cleanup: cancela el rAF pendiente en el `useEffect` return.

#### IntersectionObserver — SSR-safe

```typescript
useEffect(() => {
  if (!('IntersectionObserver' in window)) {
    setActive(true)   // fallback: mostrar valor final directo
    return
  }
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      setActive(true)
      observer.disconnect()   // una sola vez
    }
  }, { threshold: 0.2 })
  observer.observe(ref.current!)
  return () => observer.disconnect()
}, [])
```

La condición `'IntersectionObserver' in window` solo corre en el cliente (dentro de `useEffect`), por lo que no hay discrepancia SSR/cliente.

#### Estructura del componente

```
StatsBlock ('use client')
  └── useRef → ref del <section>
  └── useState(active: boolean)
  └── useEffect → IntersectionObserver
  └── STATS array (constante, no prop)
  └── grid 2col / 3col
      └── StatCard × 6
          └── useCountUp(value, 1200, active)
          └── <span>{count.toLocaleString('es-PY')}</span>
          └── <span>{label}</span>
```

`toLocaleString('es-PY')` formatea 4985 → "4.985" con separador de miles local.

---

### 4. Homepage — wiring CMS news

**Decisión:** Convertir `app/page.tsx` a Server Component async, eliminar el array estático.

```typescript
// app/page.tsx
export default async function HomePage() {
  const { docs: noticias } = await getNews({ limit: 6 })
  // ...
}
```

El mapeo del resultado al layout existente de la sección de noticias:

| Campo CMS (`NewsItem`) | Campo esperado en JSX |
|---|---|
| `title` | `title` |
| `publishedAt` | `date` (formateado) + `dateTime` |
| `category` | `category` (via `CATEGORY_LABELS`) |
| `/noticias/${slug}` | `href` |
| `featuredImage?.url` | `image` (fallback: `/images/campus-3d/hero-entry-960.webp`) |
| `featuredImage?.alt` | `imageAlt` |

No se agrega un nuevo tipo — se mapea inline en el render, sin crear interfaces intermedias.

---

## Archivos y cambios concretos

| Archivo | Tipo | Descripción |
|---|---|---|
| `components/layout/Footer.tsx` | Edit | Constante `socialLinks`, bloque `<address>`, barra MITIC |
| `components/stats/StatsBlock.tsx` | New | Componente client con hook useCountUp + IntersectionObserver |
| `app/page.tsx` | Edit | Async + `getNews({ limit: 6 })` + `<StatsBlock>` |

**Total: 2 edits + 1 archivo nuevo. Alcance acotado, sin refactoring.**

---

## Secuencia de implementación

1. `Footer.tsx` → correcciones de datos (riesgo cero, sin lógica nueva)
2. `StatsBlock.tsx` → nuevo componente aislado (se puede probar solo)
3. `page.tsx` → wiring CMS + insertar StatsBlock (depende de los dos anteriores)
