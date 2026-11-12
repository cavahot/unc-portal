# Staging sintético (SEC-027, opción B)

Objetivo: ensayar migraciones, siembras y páginas nuevas con datos inventados antes de fusionar a `main`. Rama: `feat/staging-sintetico` (sobre el tracker). Estrategia: PR al tracker. Runner: `node --test tests/deploy/*.test.mjs`.

## Specs

Spec completa: `docs/specs/deploy/STAGING.md`.

- S1 «vamos por la b» — mismo servidor que producción, otros puertos y otra base.
- S2 «ok vamos por tu recomendacion» — entrada por túnel SSH, sin subdominio público.
- S3 Aislamiento total de producción (nombres, volúmenes, red, secretos) y puertos solo en 127.0.0.1.

## Tasks

- [x] T1 Compose, ejemplo de entorno, .gitignore y prueba de aislamiento (S1-S3) · inline · commit: (siguiente)
- [x] T2 Spec y guía de ejecución (S1-S2) · inline · commit: (siguiente)
- [ ] T3 Primera corrida en el servidor (la hace el usuario con acceso autorizado; fuera del repositorio)

Ruta: inline. Risk: item 5 (delivery/environment: infrastructure/ se copia al servidor en cada deploy, pero el archivo nuevo no lo usa deploy.yml) → mitigado: ningún workflow lo referencia y las 245 pruebas de despliegue pasan.

## Log

- L1 (2026-11-07) Pedido: «explicame el punto 2» → «vamos por la b» → «ok vamos por tu recomendacion».
- L2 Evidencia: 7 pruebas nuevas; una mutación (puerto sin loopback y contenedor de producción) hizo fallar 3; 245 pruebas de despliegue y 16 guardas del arnés en verde. Honestidad de proceso: el compose se escribió antes que su prueba (sin rojo previo observado). No se ejecutó Docker: la primera corrida real queda por verificar (CMS en producción con http://localhost y sin SMTP).
