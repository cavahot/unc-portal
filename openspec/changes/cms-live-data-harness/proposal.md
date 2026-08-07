# Proposal: cms-live-data-harness

**Change ID:** cms-live-data-harness
**Date:** 2026-08-04
**Status:** draft

---

## 1. Intención

La homepage muestra 5 cifras institucionales hardcodeadas en `components/stats/StatsBlock.tsx` (4985 estudiantes, 762 docentes, 672 egresados, 10 carreras acreditadas, 6 facultades). Cada actualización exige un deploy, con riesgo de publicar datos desactualizados o inconsistentes con los informes oficiales. Además, el portal no tiene ningún test: no hay forma de detectar si un cambio de contrato del CMS rompe la home.

**Resultado esperado:** el equipo editorial actualiza las cifras desde el admin de Payload sin tocar código, y un arnés de validación (tipos + integración + E2E) prueba que la home consume datos reales del CMS.

---

## 2. Scope

### In scope
- Global `Estadisticas` en Payload: `totalEstudiantes`, `totalDocentes`, `totalEgresados`, `totalCarrerasAcreditadas`, `totalFacultades` + hook `revalidatePortalTag`; registro en `payload.config.ts` y regeneración de `payload-types.ts`
- `lib/cms/queries/stats.ts` — `getStatsGlobal()` tipado, con fallback a los valores actuales si el CMS no responde
- Split de `StatsBlock.tsx`: server component que obtiene datos + `StatCounter.tsx` cliente que conserva la animación por scroll
- `app/[locale]/page.tsx`: `getStatsGlobal()` en el `Promise.all`; noticias destacadas pasan a las 3 más recientes (`-publishedAt`, `limit: 3`)
- RDD: fixtures JSON contractuales en `tests/fixtures/cms-responses/` (`stats`, `news`)
- Arnés: Vitest en el portal (`vitest.config.ts`), tests de integración contra el CMS real y E2E Playwright de la home

### Out of scope
- Calcular estadísticas desde conteos de colecciones (fase 2)
- Personalización del admin de Payload
- Cambios en CI/CD y tests de otras páginas
- Flag `featured` en noticias

---

## 3. Capabilities

### New Capabilities
- `cms-estadisticas`: global editorial de cifras institucionales, contrato de datos y fallback
- `test-harness`: contratos RDD, tests de integración contra CMS y E2E de la home

### Modified Capabilities
- `portal`: REQ-04 (noticias de la home: 3 más recientes) y REQ-05 (estadísticas provenientes del CMS, no hardcodeadas)

---

## 4. Approach

Los fixtures JSON se escriben primero y definen el contrato del CMS; el global, la query y los tests se derivan de ellos. El fetch vive en el server component para evitar waterfalls y aprovechar el cache por tag; solo la animación queda en cliente. El fallback replica el patrón ya usado en `/noticias` (`DEMO_NEWS`), garantizando degradación silenciosa.

`diasActividad` sigue calculándose en runtime desde `FOUNDING_DATE`; no se persiste en el CMS.

---

## 5. Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `apps/cms/src/globals/Estadisticas.ts` | New | Global editorial |
| `apps/cms/src/payload.config.ts` | Modified | Registro del global |
| `apps/cms/src/payload-types.ts` | Modified | Tipos regenerados |
| `lib/cms/queries/stats.ts` | New | Query + fallback |
| `components/stats/StatsBlock.tsx` | Modified | Pasa a server component |
| `components/stats/StatCounter.tsx` | New | Animación cliente |
| `app/[locale]/page.tsx` | Modified | Fetch de stats, noticias a 3 |
| `tests/` | New | Fixtures, integración, E2E |

---

## 6. Risks

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Tests de integración dependen del CMS levantado | Alta | Marcarlos como suite separada; unit tests usan los fixtures |
| El split server/client rompe la animación | Media | E2E valida el contador al hacer scroll |
| Datos vacíos o cero en el global recién creado | Media | Seed inicial con los valores actuales + fallback |
| Deriva entre fixture y schema real de Payload | Media | Validación de forma en el test de integración |

---

## 7. Rollback Plan

Revertir el commit: `StatsBlock.tsx` vuelve a ser cliente con constantes y `page.tsx` a `limit: 6`. El global `Estadisticas` puede quedar registrado sin consumidores (inerte) o eliminarse de `payload.config.ts` y regenerar tipos. No hay migración destructiva de datos existentes.

---

## 8. Dependencies

- CMS accesible en `localhost:3002` para tests de integración
- Vitest en el workspace del portal (nueva dependencia)
- Navegadores de Playwright instalados

---

## 9. Success Criteria

- [ ] El equipo editorial cambia una cifra en Payload y la home la refleja tras revalidación, sin deploy
- [ ] Cero números institucionales hardcodeados en `StatsBlock` (salvo el fallback explícito)
- [ ] La home muestra las 3 noticias publicadas más recientes
- [ ] `npm run typecheck`, la suite de integración y el E2E de la home pasan en verde
- [ ] Con el CMS caído la home renderiza valores de fallback sin error

---

## 10. Proposal question round (pendiente de confirmación)

Supuestos aplicados; corregir si alguno no aplica:

1. **Autoría/permiso:** cualquier usuario con acceso al admin puede editar las cifras (no se define un rol restringido ni aprobación editorial).
2. **Trazabilidad:** basta con `updatedAt` visible; no se requiere historial de versiones ni fuente/documento respaldatorio por cifra.
3. **Estado vacío:** si el global existe pero una cifra es `0` o `null`, se usa el valor de fallback en vez de mostrar cero.
4. **Frescura:** la revalidación por tag es suficiente; no se exige un SLA de propagación menor.
