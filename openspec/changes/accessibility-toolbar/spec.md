# Spec: accessibility-toolbar

**Depends on:** proposal.md  
**Date:** 2026-07-29

---

## REQ-01 — Botón disparador flotante

**Priority:** Must  
**Component:** `components/accessibility/AccessibilityPanel.tsx`

### Requirements

- R1.1 El botón debe estar fijo en el borde derecho de la pantalla, centrado verticalmente (`fixed right-0 top-1/2 -translate-y-1/2`)
- R1.2 Dimensiones: 44×44px mínimo (WCAG 2.5.5 — tamaño de objetivo táctil)
- R1.3 Debe tener `aria-expanded="true|false"` y `aria-controls="accessibility-panel"`
- R1.4 Debe tener `aria-label="Herramientas de accesibilidad"`
- R1.5 Ícono: figura de persona con círculo (♿ estilizado en SVG inline)
- R1.6 El botón no debe obstruir el contenido: `z-index` por encima del contenido pero por debajo de modales (`z-50`)

### Scenario

```
DADO que un visitante accede a cualquier página del portal
ENTONCES ve el botón de accesibilidad en el borde derecho de la pantalla
Y puede hacer clic para abrir el panel
```

---

## REQ-02 — Panel deslizante

**Priority:** Must  
**Component:** `components/accessibility/AccessibilityPanel.tsx`

### Requirements

- R2.1 El panel se desliza desde la derecha con transición CSS (`translate-x-full` → `translate-x-0`, duración 250ms)
- R2.2 `id="accessibility-panel"` para el `aria-controls` del botón
- R2.3 Ancho: 280px en desktop, 100% en mobile (≤375px)
- R2.4 El panel debe cerrarse al presionar `Escape` (keydown listener en el documento)
- R2.5 El panel debe cerrarse al hacer clic fuera de él (click en el overlay)
- R2.6 Overlay semitransparente detrás del panel cuando está abierto
- R2.7 Título del panel: "Herramientas de accesibilidad"
- R2.8 Focus trap: al abrir el panel, el foco va al primer botón dentro

### Scenario

```
DADO que el panel está abierto
CUANDO el usuario presiona Escape
ENTONCES el panel se cierra y el foco vuelve al botón disparador

DADO que el panel está abierto
CUANDO el usuario hace clic fuera del panel
ENTONCES el panel se cierra
```

---

## REQ-03 — Las 9 funciones

**Priority:** Must  
**Component:** `components/accessibility/AccessibilityPanel.tsx` + `app/globals.css`

Cada función es un toggle independiente. Al activarse aplica un cambio en `<html>` o `<body>`; al desactivarse lo revierte.

| ID | Función | Mecanismo | Clase/Estilo aplicado |
|---|---|---|---|
| F1 | Aumentar texto | Escalar `font-size` de `<html>` | `+20%` por clic, máx `150%` (3 pasos desde `100%`) |
| F2 | Disminuir texto | Escalar `font-size` de `<html>` | `-20%` por clic, mín `80%` |
| F3 | Escala de grises | Toggle clase | `.a11y-grayscale` → `filter: grayscale(100%)` en `body` |
| F4 | Alto contraste | Toggle clase | `.a11y-high-contrast` → ver CSS abajo |
| F5 | Contraste negativo | Toggle clase | `.a11y-negative` → `filter: invert(100%) hue-rotate(180deg)` en `body` |
| F6 | Fondo claro | Toggle clase | `.a11y-light-bg` → `background: white; color: #111` en `body` |
| F7 | Enlaces subrayados | Toggle clase | `.a11y-underline-links` → `a { text-decoration: underline !important }` |
| F8 | Fuente legible | Toggle clase | `.a11y-readable-font` → `font-family: Arial, sans-serif !important` en `html` |
| F9 | Reiniciar | Reset completo | Elimina todas las clases + resetea fontSize + limpia localStorage |

**CSS para `.a11y-high-contrast` (REQ-03, F4):**
```css
.a11y-high-contrast body {
  background: #000 !important;
  color: #fff !important;
}
.a11y-high-contrast a { color: #ff0 !important; }
.a11y-high-contrast button, .a11y-high-contrast input {
  border: 2px solid #fff !important;
}
```

### Requirements adicionales

- R3.1 F3 y F5 son mutuamente excluyentes — activar uno desactiva el otro
- R3.2 F4 y F6 son mutuamente excluyentes — activar uno desactiva el otro
- R3.3 Cada botón muestra visualmente si está activo (fondo verde UNC cuando on)
- R3.4 Cada botón tiene `aria-pressed="true|false"`

### Scenario

```
DADO que el usuario activa "Escala de grises"
ENTONCES la página entera se ve en grises
Y el botón de "Escala de grises" muestra estado activo

DADO que "Escala de grises" está activo y el usuario activa "Contraste negativo"
ENTONCES "Escala de grises" se desactiva automáticamente
Y "Contraste negativo" queda activo

DADO que el usuario hace clic en "Reiniciar"
ENTONCES todas las funciones se desactivan
Y la página vuelve a su aspecto original
```

---

## REQ-04 — Persistencia en localStorage

**Priority:** Must

### Requirements

- R4.1 Al cambiar cualquier función, el estado completo se guarda en `localStorage` con key `unc-a11y`
- R4.2 Al cargar la página, el componente lee localStorage y aplica el estado guardado
- R4.3 Para evitar flash (FOUC), agregar un script inline en `<head>` de `layout.tsx` que aplica las clases antes del primer paint:

```html
<script dangerouslySetInnerHTML={{ __html: `
  try {
    var s = JSON.parse(localStorage.getItem('unc-a11y') || '{}');
    var h = document.documentElement;
    if (s.grayscale) h.classList.add('a11y-grayscale');
    if (s.highContrast) h.classList.add('a11y-high-contrast');
    if (s.negative) h.classList.add('a11y-negative');
    if (s.lightBg) h.classList.add('a11y-light-bg');
    if (s.underlineLinks) h.classList.add('a11y-underline-links');
    if (s.readableFont) h.classList.add('a11y-readable-font');
    if (s.fontSize) h.style.fontSize = s.fontSize + '%';
  } catch(e) {}
` }} />
```

- R4.4 El script está envuelto en `try/catch` para no romper si localStorage no está disponible (modo privado, SSR)

### Scenario

```
DADO que el usuario activó "Alto contraste" en una visita anterior
CUANDO vuelve al portal en una nueva pestaña
ENTONCES la página carga directamente en alto contraste sin flash de tema claro
```

---

## REQ-05 — Responsive y accesibilidad del propio panel

**Priority:** Must

### Requirements

- R5.1 En mobile (≤640px) el panel ocupa el ancho completo de la pantalla
- R5.2 El botón disparador tiene tamaño táctil mínimo de 44×44px en todos los viewports
- R5.3 El contraste del botón disparador debe ser suficiente en cualquier modo de color del portal (fondo oscuro y claro)
- R5.4 El panel funciona con teclado: Tab navega entre los 9 botones, Enter/Space los activa

---

## NFR-01 — Calidad técnica

- NF1.1 `tsc --noEmit` pasa sin errores
- NF1.2 El componente usa `'use client'` — nunca se ejecuta en el servidor
- NF1.3 Sin librerías externas — solo React hooks y CSS nativo
- NF1.4 El script anti-flash en `<head>` NO usa `defer` ni `async` (debe bloquear el render brevemente, eso es intencional)

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `components/accessibility/AccessibilityPanel.tsx` | Nuevo |
| `app/globals.css` | Agregar clases `.a11y-*` |
| `app/layout.tsx` | Script anti-flash en `<head>` + `<AccessibilityPanel>` en body |
