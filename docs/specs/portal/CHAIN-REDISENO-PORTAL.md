# Cadena de PR — Rediseño del portal (rama integradora)

Estado: **seguimiento; NO fusionar este PR hasta que todos los PR hijos estén revisados e integrados.**
Estrategia: *Feature Branch Chain* (skill `chained-pr`). Rama integradora: `chain/rediseno-portal`. Reemplaza al PR de revisión única `feat/desarrollo-pagina-referencia` → `main` (216 archivos, ~52 000 líneas, 36 900 generadas), que es demasiado grande para revisarlo.

## Cómo está armada

Cada PR hijo es un **rango de commits que ya existía en la historia** (no una selección de rutas), así que cada estado intermedio es uno que ya funcionó. El primer hijo apunta a la rama integradora; cada uno de los demás apunta a la rama del hijo anterior. Cada PR muestra únicamente su rango.

## Orden y límites

| # | Rama | Contenido | A mano | Generadas | Archivos |
| --- | --- | --- | ---: | ---: | ---: |
| 01 | `chain/01-facultades-agrarias` | Facultad de Ciencias Agrarias en el patrón compartido (FAC-02) | 1 549 | 0 | 16 |
| 02 | `chain/02-facultades-y-flujo-guarani` | Unificación de facultades y flujo de aprobación guaraní (un único commit: **`size:exception`**) | 4 974 | 12 082 | 95 |
| 03 | `chain/03-guarani-aprobacion-endurecida` | Aprobación del glosario: códigos de estado, guarda de borrado, auditoría | 458 | 0 | 7 |
| 04 | `chain/04-titulos-cms` | `/titulos` desde el CMS (global, migración, consulta, semilla, página) | 3 206 | 12 021 | 32 |
| 05 | `chain/05-guarani-interfaz` | Importador y aplicador de traducciones guaraníes | 1 118 | 0 | 34 |
| 06 | `chain/06-globals-institucional` | Especificación y globals Información pública / Institución con migración | 749 | 12 752 | 13 |
| 07 | `chain/07-informacion-publica-componentes` | Componentes compartidos y `/informacion-publica` | 1 707 | 0 | 18 |
| 08 | `chain/08-institucion-transparencia-menu` | `/institucional`, `/transparencia` y «Quiénes somos» en el menú | 1 576 | 0 | 22 |
| 09 | `chain/09-seguridad-dependencias` | Override de `happy-dom`, pruebas de middlewares, evidencia SEC-027 | 197 | 6 | 4 |
| 10 | `chain/10-glosario-fuente` | Fuente de los términos completados del glosario | 35 | 0 | 2 |

`A mano` = líneas añadidas + eliminadas sin contar snapshots de migración, `package-lock.json` ni `payload-types.ts`.

## Dependencias

```text
main ── chain/rediseno-portal (📍 este PR, borrador)
          └─ 01 ── 02 ── 03 ── 04 ── 05 ── 06 ── 07 ── 08 ── 09 ── 10
```

Las migraciones forman una cadena que no admite reordenar: `glo_gn_02` (02) → `titulos_01` (04) → `transparencia_institucional_01` (06).

## Cómo se integra

1. Revisar cada PR hijo por separado.
2. Fusionar **de arriba hacia abajo** (10 → 09 → … → 01): cada merge lleva su contenido a la rama de su base, y el 01 lo lleva a `chain/rediseno-portal`.
3. Comprobar que el árbol de `chain/rediseno-portal` es idéntico a `feat/desarrollo-pagina-referencia` más este archivo.
4. Recién entonces: CI completo en este PR, staging con datos sintéticos, pruebas de humo, respaldo con restauración probada, revisión independiente y autorización explícita. **Fusionar este PR despliega a producción** (`deploy.yml`).

## Fuera de esta cadena

- Guarda de producción para `/prototipos/sonner` (el playground sigue público si se despliega).
- Ayuda al triage de 20 avisos moderados y bajos de `npm audit`.
- Las 12 fotos en `media/` (PR 02): confirmar que son material público.
