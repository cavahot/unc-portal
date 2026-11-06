# INSTITUCIONAL-TRANSPARENCIA — Transparencia, Información Pública e Institución (CMS → base de datos → portal)

Estado: **borrador para aprobación** · Rama: `feat/transparencia-institucional-cms` · Alcance: solo local (el despliegue se prepara después).
Patrón de referencia: `docs/specs/portal/TITULOS.md` (global del CMS, estados `ok`/`empty`/`unavailable`, límite de error, semilla idempotente).

## 1. Problema y evidencia (RDD)

| Hecho observado | Evidencia |
| --- | --- |
| `/informacion-publica` (422 líneas) tiene escritos en el código los 3 canales de solicitud, sus enlaces, los 7 datos requeridos, la cita de la ley y el correo `secgral@unc.edu.py`. No usa traducciones: todo el texto está en español dentro del componente. | `app/[locale]/informacion-publica/page.tsx` (`CHANNELS`, `REQUIRED_DATA`, texto en JSX). |
| La misma página usa fondo `bg-slate-950`, un color de acento por canal (`#5CFF5C`, `#60a5fa`, `#c084fc`) y voseo («Elegí», «podés», «Accedé»). El resto del portal usa verdes institucionales y redacción neutra. | `page.tsx` (líneas 82-120 y texto de la página). |
| `/institucional` (364 líneas) muestra «Quiénes somos» (año 2007, Concepción, Pública), 4 tarjetas de sección y 4 valores desde archivos de mensajes, no desde el CMS: un editor no puede cambiarlos sin desplegar. | `messages/es/pages.institucional.json` (`about`, `sections`, `values`). |
| `/transparencia` ya lee las leyes 5189 y 5282 desde colecciones del CMS; lo que falla es el diseño: dos tarjetas iguales sobre fondo gris, etiqueta en mayúsculas sobre el título y un botón que repite el texto del enlace. | `app/[locale]/transparencia/page.tsx`. |
| Regla del dueño: todo contenido institucional vive en CMS + Postgres y el portal lo lee de ahí; el diseño debe coincidir con el resto del portal. | Memoria `feedback-todo-contenido-cms-bd-portal`; `PRODUCT.md`. |

Hipótesis (por verificar): el contenido del CMS es solo en español y las otras lenguas traducen la interfaz, como en `/titulos`.

## 2. Contrato

### 2.1 Global `informacion-publica` (nuevo)
Un solo documento editable sin tocar código.

| Campo | Tipo | Regla |
| --- | --- | --- |
| `titulo` | texto | obligatorio, máx. 120 |
| `descripcion` | texto largo | obligatorio, máx. 500 |
| `leyReferencia` | texto | obligatorio, máx. 160 (p. ej. «Ley N° 5282/2014 — Libre Acceso a la Información Pública») |
| `cita` | `{ texto, fuente }` | texto máx. 800; `fuente` máx. 160 |
| `vias[]` | lista (1–6) | `slug` único, `etiqueta`, `titulo`, `descripcion` (máx. 500), `destacada` (casilla; rótulo fijo en la interfaz, no texto libre), `accion { texto, url }` |
| `datosRequeridos[]` | lista | texto máx. 200 |
| `portalOficial` | `{ titulo, descripcion, url }` | `url` https de host oficial permitido |
| `correo` | email | obligatorio, formato de correo válido |

Las URL de `accion` pueden ser **internas** (ruta que empieza con `/`) o **externas https** de un host de la lista oficial (`informacionpublica.paraguay.gov.py` y subdominios de `paraguay.gov.py`); nunca `javascript:` ni `http:`.

### 2.2 Global `institucional` (nuevo)
| Campo | Tipo | Regla |
| --- | --- | --- |
| `titulo`, `descripcion` | texto | obligatorios (máx. 120 / 400) |
| `sobre` | `{ titulo, texto, datos[] }` | `datos[]` de 1 a 4 pares `{ valor, etiqueta }` (año de fundación, sede, tipo) |
| `secciones[]` | lista (1–8) | `destino` (**lista cerrada**: historia, mision-vision, autoridades, organigrama, transparencia, informacion-publica, marco-legal), `etiqueta`, `titulo`, `descripcion`, `accion` |
| `valores[]` | lista (1–8) | `titulo`, `descripcion` |

El destino es una lista cerrada y no una URL libre: así una tarjeta nunca apunta a una ruta inexistente ni a un sitio externo.

### 2.3 Transparencia (hub)
Sin colección nueva: sigue leyendo `ley5189` y `ley5282`. Cambia el diseño y se agrega el enlace a Información Pública como tercera vía de acceso, tomado del global `informacion-publica` (título y descripción).

### 2.4 Acceso, hooks y auditoría
Lectura pública (sin datos privados); escritura con `canUpdateGlobal`; revalidación por etiqueta (`informacion-publica`, `institucional`), agregadas a `ALLOWED_TAGS`; auditoría con `makeAuditGlobalAfterChange` (SEC-027).

### 2.5 Estados y errores
Igual que `TITULOS.md` §2.2 y §2.6: `ok` / `empty` (aviso neutro, nunca datos de demostración) / `unavailable` (200 con aviso, no 500); consulta con `try/catch` que registra solo el nombre del error y el código HTTP; panel en línea con «Intentar de nuevo» y «Contacto»; `error.tsx` por ruta con referencia (`digest`) y sin mensaje ni stack; sin ventanas modales.

### 2.6 Diseño
Sistema visual de `/titulos` y facultades (verdes institucionales `#004700`/`#00A300`, fondo `#F4F7F5`, tarjetas blancas, foco visible). Reglas de `impeccable`: sin etiqueta en mayúsculas sobre el título, sin tarjetas de icono idénticas, sin borde de color en un solo lado, sin colores libres por canal (acento de lista cerrada), redacción neutra sin voseo, móvil primero, `prefers-reduced-motion`, contraste AA.

## 3. Criterios de aceptación (Given / When / Then)

1. **Given** el global `informacion-publica` con 3 vías, **When** se abre `/es/informacion-publica`, **Then** se ven las 3 vías, los datos requeridos y el portal oficial, tomados del CMS.
2. **Given** que el editor cambia el correo o una vía y guarda, **When** pasa la revalidación, **Then** la página lo muestra sin desplegar.
3. **Given** una `url` con `javascript:`, `http:` o host no permitido, **When** se intenta guardar, **Then** se rechaza (4xx).
4. **Given** el global vacío, **When** se abre la página, **Then** aparece un aviso neutro y ningún dato de demostración; **Given** el CMS caído, **Then** 200 con aviso en línea.
5. **Given** el global `institucional` con secciones y valores, **When** se abre `/es/institucional`, **Then** el hub se pinta desde el CMS y cada tarjeta enlaza a una ruta existente.
6. **Given** un destino fuera de la lista cerrada, **When** se guarda, **Then** se rechaza.
7. **Given** `/transparencia`, **When** se abre, **Then** muestra el avance de cada ley, el enlace a Información Pública y ninguna tarjeta idéntica a otra por plantilla.
8. **Given** un rol sin permiso de global, **When** intenta modificar un global por REST, **Then** recibe 403.
9. **Given** un error inesperado de render en cualquiera de las tres rutas, **Then** se muestra el límite de error del portal con referencia y sin mensaje ni stack.
10. **Given** las 4 lenguas, **When** se abren las tres páginas, **Then** todas las claves existen en `es`, `gn`, `en` y `pt-BR` con los mismos marcadores (el guaraní se marca pendiente de revisión).

## 4. Pruebas (TDD)
Esquema y acceso de cada global; validadores (URL, correo, destino, límites); consultas con `ok`/`empty`/`unavailable`; render por estado; semilla idempotente y que no pisa ediciones; revalidación por etiqueta; ausencia de datos fijos (prueba que falla si reaparecen `CHANNELS`, `REQUIRED_DATA` o `secgral@unc.edu.py` en el código); manejo de errores y mensajes en cuatro lenguas.

## 5. Fuera de alcance
Traducir al guaraní el contenido del CMS (requiere campos localizados); `/ley-5189`, `/ley-5282`, `/historia`, `/mision-vision`, `/autoridades`, `/organigrama` (subpáginas); despliegue a producción.

## 6. Riesgos, orden de despliegue y reversión
- Orden al desplegar: migración → semilla → portal. Si el portal sale antes, las páginas muestran el estado `empty`.
- Migración solo hacia adelante (patrón del repo); las páginas anteriores quedan en git.
- La lista cerrada de destinos exige actualizarla si se crea una sección nueva en el portal.
