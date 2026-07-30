# Design: accessibility-toolbar

**Depends on:** spec.md  
**Date:** 2026-07-29

---

## 1. Arquitectura del componente

### Árbol de componentes

```
<AccessibilityPanel>           ← 'use client', punto único de entrada
  ├── <TriggerButton>          ← botón flotante fijo, siempre visible
  ├── <Overlay>                ← semitransparente, cierra el panel al clic
  └── <Panel>                  ← aside deslizante desde la derecha
        ├── <PanelHeader>      ← título + botón cerrar (×)
        └── <ToolGrid>         ← grid 2×5 de botones (9 herramientas + reiniciar)
              └── <ToolButton> ← botón individual con ícono + label + aria-pressed
```

### Hook central: `useA11y`

Todo el estado y la lógica viven en un custom hook dentro del mismo archivo (no necesita ser exportado — es local al componente):

```typescript
interface A11yState {
  fontSize: number        // 80 | 100 | 120 | 140 (% base)
  grayscale: boolean
  highContrast: boolean
  negative: boolean
  lightBg: boolean
  underlineLinks: boolean
  readableFont: boolean
}

const DEFAULT_STATE: A11yState = {
  fontSize: 100,
  grayscale: false,
  highContrast: false,
  negative: false,
  lightBg: false,
  underlineLinks: false,
  readableFont: false,
}
```

**Responsabilidades del hook:**
1. Inicializar estado desde `localStorage` (`unc-a11y`) al montar
2. Exportar `toggle(key)`, `increaseFontSize()`, `decreaseFontSize()`, `reset()`
3. En cada cambio de estado: aplicar clases al `<html>` element + escribir en localStorage
4. Limpiar al desmontar (no aplica — el componente vive en el root layout)

**Aplicación de efectos — un solo `useEffect` reactivo al estado:**

```typescript
useEffect(() => {
  const html = document.documentElement
  html.style.fontSize = state.fontSize + '%'
  html.classList.toggle('a11y-grayscale',       state.grayscale)
  html.classList.toggle('a11y-high-contrast',   state.highContrast)
  html.classList.toggle('a11y-negative',        state.negative)
  html.classList.toggle('a11y-light-bg',        state.lightBg)
  html.classList.toggle('a11y-underline-links', state.underlineLinks)
  html.classList.toggle('a11y-readable-font',   state.readableFont)
  localStorage.setItem('unc-a11y', JSON.stringify(state))
}, [state])
```

Un solo efecto reactivo es más robusto que 9 efectos separados — garantiza que localStorage siempre refleja el estado actual completo.

---

## 2. Lógica de exclusión mutua

Las exclusiones se resuelven dentro del toggle, no en el componente:

```typescript
function toggle(key: keyof Omit<A11yState, 'fontSize'>) {
  setState(prev => {
    const next = { ...prev, [key]: !prev[key] }
    // F3 ↔ F5 mutuamente excluyentes
    if (key === 'grayscale' && next.grayscale)  next.negative = false
    if (key === 'negative'  && next.negative)   next.grayscale = false
    // F4 ↔ F6 mutuamente excluyentes
    if (key === 'highContrast' && next.highContrast) next.lightBg = false
    if (key === 'lightBg'      && next.lightBg)      next.highContrast = false
    return next
  })
}
```

---

## 3. Anti-FOUC (Flash of Unstyled Content)

**Problema:** React hidrata después del primer paint. Si el usuario tenía "Alto contraste" guardado, vería la página en blanco → flash → contraste. Inaceptable.

**Solución:** Script síncrono inline en `<head>` que aplica clases antes del primer paint. Next.js permite esto con `dangerouslySetInnerHTML` en un `<script>` tag.

**Por qué funciona:** Los scripts síncronos en `<head>` sin `defer`/`async` bloquean el parser del browser hasta ejecutarse. El browser no pinta nada hasta que ese script termina. Esto es deliberado y estándar — es exactamente lo que hacen next-themes, Radix UI, y el propio next.js dark mode.

**El script es mínimo (< 300 bytes):**
```javascript
try {
  var s = JSON.parse(localStorage.getItem('unc-a11y') || '{}');
  var h = document.documentElement;
  var cl = h.classList;
  if (s.grayscale)     cl.add('a11y-grayscale');
  if (s.highContrast)  cl.add('a11y-high-contrast');
  if (s.negative)      cl.add('a11y-negative');
  if (s.lightBg)       cl.add('a11y-light-bg');
  if (s.underlineLinks)cl.add('a11y-underline-links');
  if (s.readableFont)  cl.add('a11y-readable-font');
  if (s.fontSize && s.fontSize !== 100) h.style.fontSize = s.fontSize + '%';
} catch(e) {}
```

---

## 4. Focus trap

**Por qué:** WCAG 2.1 criterio 2.1.2 — el foco no debe escapar de un dialog/panel mientras está abierto.

**Implementación sin librerías:** Al abrir el panel, un `useEffect` captura todos los elementos focusables dentro del panel y atrapa Tab/Shift+Tab:

```typescript
useEffect(() => {
  if (!isOpen) return
  const panel = panelRef.current
  if (!panel) return
  const focusable = panel.querySelectorAll<HTMLElement>(
    'button, [href], input, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  first?.focus()

  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }
  document.addEventListener('keydown', trap)
  return () => document.removeEventListener('keydown', trap)
}, [isOpen])
```

**Escape:** Listener separado en el mismo `useEffect` — limpio, sin mezclar responsabilidades.

---

## 5. Arquitectura CSS — clases `.a11y-*`

Las clases viven en `globals.css` usando `@layer base` para evitar conflictos con Tailwind:

```css
@layer base {
  /* Grayscale */
  .a11y-grayscale body { filter: grayscale(100%); }

  /* High contrast */
  .a11y-high-contrast body { background: #000 !important; color: #fff !important; }
  .a11y-high-contrast a    { color: #ffff00 !important; }
  .a11y-high-contrast button, .a11y-high-contrast input {
    outline: 2px solid #fff !important;
  }

  /* Negative contrast */
  .a11y-negative body { filter: invert(100%) hue-rotate(180deg); }

  /* Light background */
  .a11y-light-bg body    { background: #fff !important; color: #111 !important; }
  .a11y-light-bg header  { background: #fff !important; }
  .a11y-light-bg footer  { background: #f5f5f5 !important; color: #111 !important; }

  /* Underline links */
  .a11y-underline-links a { text-decoration: underline !important; }

  /* Readable font */
  .a11y-readable-font,
  .a11y-readable-font * { font-family: Arial, Helvetica, sans-serif !important; }
}
```

**Por qué `@layer base`:** Las utilidades Tailwind están en `@layer utilities`. Base tiene menor especificidad que utilities, pero al usar `!important` en las reglas de accesibilidad nos aseguramos que ganen sin importar el orden de capas.

---

## 6. Diseño visual del panel

**Botón disparador:**
- Fondo: `bg-[#004700]` (verde institucional oscuro)
- Borde: `border border-[#5CFF5C]/40`
- Sombra: `shadow-[0_4px_24px_rgba(0,71,0,0.5)]`
- Ícono: SVG persona con círculo (wheelchair simplified)
- En hover: escala `1.05`, borde más brillante

**Panel:**
- Fondo: `bg-slate-900` con borde izquierdo `border-l border-white/10`
- Header: fondo `bg-[#004700]/80` con título en blanco
- Botones de herramienta: grid `2×5` con íconos SVG inline + label texto
- Estado activo: `bg-[#5CFF5C]/20 border border-[#5CFF5C]/60 text-[#5CFF5C]`
- Estado inactivo: `bg-white/5 border border-white/10 text-white/70`

---

## 7. Secuencia de implementación

1. `globals.css` — agregar clases `.a11y-*` en `@layer base`
2. `AccessibilityPanel.tsx` — hook `useA11y` + componente completo
3. `layout.tsx` — script anti-FOUC en `<head>` + `<AccessibilityPanel>` en `<body>`

**Total: 3 archivos, 1 nuevo, 2 edits quirúrgicos.**
