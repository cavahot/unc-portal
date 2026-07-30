# Proposal: accessibility-toolbar

**Change ID:** accessibility-toolbar  
**Date:** 2026-07-29  
**Status:** draft

---

## 1. Problem

El portal UNC carece de herramientas de accesibilidad para usuarios con necesidades visuales o motoras. El sitio institucional (www.unc.edu.py) ya las tiene y los visitantes las esperan. Sin ellas, el portal incumple las buenas prácticas de accesibilidad web para organismos públicos paraguayos.

---

## 2. Solución propuesta

Un **panel de accesibilidad flotante lateral** compuesto por:

- **Botón disparador** fijo en el borde derecho de la pantalla (posición media-vertical), siempre visible en todas las páginas
- **Panel deslizante** que se abre desde la derecha con las 9 opciones
- **Persistencia en localStorage** — las preferencias se restauran automáticamente en cada visita

### Las 9 funciones

| Función | Implementación CSS/DOM |
|---|---|
| Aumentar texto | `font-size` en `<html>`: escalar +20% por clic (máx 3 pasos) |
| Disminuir texto | `font-size` en `<html>`: escalar -20% por clic (mín 1 paso) |
| Escala de grises | `filter: grayscale(100%)` en `<body>` |
| Alto contraste | Clase `.high-contrast` en `<html>` con CSS variables invertidas |
| Contraste negativo | `filter: invert(100%)` en `<body>` |
| Fondo claro | Fuerza fondo blanco y texto oscuro via clase en `<html>` |
| Enlaces subrayados | Clase `.underline-links` en `<html>` que aplica `text-decoration: underline` a todos los `<a>` |
| Fuente legible | Reemplaza la fuente Inter por `Arial, sans-serif` vía clase en `<html>` |
| Reiniciar | Borra localStorage y elimina todas las clases/estilos aplicados |

---

## 3. Arquitectura

```
AccessibilityPanel ('use client')
  ├── Botón disparador — fijo, borde derecho, siempre visible
  ├── Panel deslizante (aside) — se abre/cierra con animación
  │   ├── 9 botones de funciones
  │   └── Botón "Reiniciar"
  ├── useLocalStorage — persiste estado de cada función
  └── useEffect — aplica clases/estilos al <html>/<body> al montar y al cambiar
```

El botón del Header ("Herramientas de accesibilidad") también puede disparar el panel vía un evento custom o un estado global simple (Context o ref compartido).

---

## 4. Scope

### In scope
- `components/accessibility/AccessibilityPanel.tsx` — componente principal ('use client')
- `app/globals.css` — clases CSS para `.high-contrast`, `.underline-links`, `.readable-font`, `.light-background`
- `app/layout.tsx` — incluir `<AccessibilityPanel>` en el root layout
- Hook `useAccessibility` para centralizar el estado y la lógica de aplicación

### Out of scope
- Integración con el botón del Header (queda como mejora futura)
- Screen reader enhancements (ARIA live regions, skip links ya existen)
- Internacionalización del panel

---

## 5. Reglas de negocio

- El panel no puede obstruir el contenido principal ni el header de navegación
- El estado se restaura antes del primer render para evitar flash (leer localStorage en el servidor no aplica — solución: aplicar clase en `<html>` via script inline en `<head>`)
- Cada función es independiente y togglable — pueden estar varias activas al mismo tiempo (excepto combinaciones mutuamente excluyentes: escala de grises + contraste negativo)
- El botón disparador debe tener `aria-expanded` y `aria-controls` correctos
- El panel debe cerrarse con `Escape`

---

## 6. Criterios de éxito

1. Botón flotante visible en todas las páginas sin obstruir el contenido
2. Panel se abre/cierra con animación fluida
3. Las 9 funciones operan correctamente
4. Al recargar la página, las preferencias se restauran visualmente sin flash perceptible
5. `tsc --noEmit` pasa sin errores
6. El panel es usable en mobile (375px) y desktop (1280px)
