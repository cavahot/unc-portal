# Product

<!-- impeccable:product-schema 1 -->

> Estado de la evidencia: los hechos marcados **(inferido)** salen del repositorio y de las instrucciones del usuario en esta sesión; el usuario no los confirmó punto por punto (la pregunta de confirmación quedó sin respuesta). Se corrigen aquí cuando el usuario los ajuste.

## Platform

web

## Users

- **Visitante del portal (inferido):** estudiantes, aspirantes, egresados, docentes y público general que consultan información institucional de la Universidad Nacional de Concepción.
- **Para `/titulos` (inferido):** una persona con un título expedido por otra universidad (extranjera, nacional pública o nacional privada) que debe inscribirlo en la Secretaría General de la UNC. Necesita saber qué documentos presentar, cuánto cuesta, cuánto tarda y qué pasos sigue.
- **Editores (confirmado por el usuario):** el personal que mantiene el contenido desde el panel del CMS, sin tocar código ni desplegar.

## Product Purpose

Portal institucional público de la Universidad Nacional de Concepción (UNC, Paraguay). Informa y permite hacer trámites con datos vigentes. El éxito de `/titulos` es que la persona llegue a Mesa de Entrada con la documentación correcta y sin consultas repetidas.

## Operating Context

- Interfaz en español, guaraní, inglés y portugués (`es`, `gn`, `en`, `pt-BR`); el guaraní pasa por un flujo de aprobación del glosario antes de publicarse.
- Stack existente: Next.js (App Router) para el portal, Payload CMS y Postgres. El portal solo lee del CMS (estados `ok`, `empty`, `unavailable`).
- El trámite se hace en Mesa de Entrada del Rectorado (Ruta PY05, Km 210, Concepción) y se paga en Perceptoría.

## Capabilities and Constraints

- **Confirmado por el usuario:** «siempre esto de debe partir de la base de datos al cms y que impacte en el portal»; sin datos fijos en el código; el diseño debe coincidir con el resto del portal («todos lo stilos deben coincidir»).
- El arancel de la inscripción ya existe en el CMS (colección `aranceles-rectorado`); no se duplica.
- Seguridad: regla SEC-027 antes de publicar; sin datos inventados ni de demostración (si falta contenido, aviso neutro).
- Solo local por ahora; el despliegue se prepara después.
- **Decisión abierta:** el contenido del CMS es solo en español y las otras lenguas traducen la interfaz (hipótesis, sin verificar).

## Brand Commitments

- Identidad verde institucional ya presente en el portal (inferido de las páginas existentes); la página nueva debe coincidir con ella.
- Redacción neutra y profesional, sin regionalismos (el texto actual usa voseo).

## Evidence on Hand

- Contenido real actual de `/titulos` en `app/[locale]/titulos/page.tsx`: 3 tipos de universidad con sus requisitos, 8 pasos del procedimiento, plazo de 8 a 24 horas y nota sobre el reconocimiento del CONES.
- Arancel vigente en `scripts/lib/arancelesSeedData.mjs` (concepto «Inscripción de Títulos Universitarios»).
- Especificación de la tarea: `docs/specs/portal/TITULOS.md`.
- Ausencia que no se debe fabricar: no hay testimonios, estadísticas de trámites ni plazos reales medidos; solo el rango publicado.

## Product Principles

1. **Una sola fuente:** lo que ve el visitante sale del CMS; el editor puede corregirlo sin desplegar.
2. **Primero la tarea:** qué llevar, cuánto cuesta, cuánto tarda y qué sigue, en ese orden de importancia.
3. **Honestidad sobre datos:** si falta contenido, se dice; nunca se muestra uno inventado.
4. **Coherencia con el portal:** una página institucional más, no una isla con su propio estilo.
5. **Accesible por defecto:** legible en móvil, teclado y lectores de pantalla.

## Accessibility & Inclusion

- Contraste AA y uso en móvil (inferido del resto del portal, que ya incluye un panel de accesibilidad).
- Cuatro idiomas, incluido el guaraní.
