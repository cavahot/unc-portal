# Tasks: accessibility-toolbar

**Depends on:** spec.md, design.md  
**Date:** 2026-07-29

---

## Bloque 1 — CSS base

- [x] T01: Agregar clases `.a11y-*` en `app/globals.css` dentro de `@layer base` (grayscale, high-contrast, negative, light-bg, underline-links, readable-font)

## Bloque 2 — Componente principal

- [x] T02: Crear `components/accessibility/AccessibilityPanel.tsx` con interfaz `A11yState`, `DEFAULT_STATE`, y hook `useA11y` (estado, toggle, increaseFontSize, decreaseFontSize, reset, useEffect reactivo → DOM + localStorage)
- [x] T03: Implementar lógica de exclusión mutua dentro de `toggle` (grayscale↔negative, highContrast↔lightBg)
- [x] T04: Implementar focus trap (useEffect con querySelectorAll, Tab/Shift+Tab, Escape, retorno de foco al botón disparador)
- [x] T05: Construir JSX — TriggerButton flotante + Overlay + Panel deslizante + PanelHeader + grid de 9 ToolButtons con aria-pressed y estado visual activo/inactivo

## Bloque 3 — Integración en layout

- [x] T06: Agregar script anti-FOUC síncrono en `<head>` de `app/layout.tsx`
- [x] T07: Importar e insertar `<AccessibilityPanel />` en `app/layout.tsx` dentro del `<body>`

## Verificación

- [x] T08: Correr `tsc --noEmit` y confirmar 0 errores nuevos
