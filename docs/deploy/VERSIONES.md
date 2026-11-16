# Versiones del Portal UNC

Cada entrega se identifica con una **etiqueta de git** y una **Release de GitHub**
(`https://github.com/cavahot/unc-portal/releases`). Así se sabe exactamente qué código corre en cada servidor, se
puede volver a una versión anterior y el historial de cambios queda en un solo lugar (`CHANGELOG.md`).

## Numeración (SemVer)

`vMAYOR.MENOR.PARCHE`, con prelanzamientos `-rc.N` para lo que se ensaya en staging.

| Cambio | Ejemplo | Cuándo |
| --- | --- | --- |
| Candidata | `v1.0.0-rc.1`, `v1.0.0-rc.2` | Lo que se instala en staging para ensayar. Una corrección = nueva `rc` |
| Mayor | `v2.0.0` | Cambio que obliga a migrar datos o rompe algo que otros usan |
| Menor | `v1.1.0` | Funcionalidad nueva compatible (una página, un bloque, un campo del CMS) |
| Parche | `v1.0.1` | Corrección sin funcionalidad nueva |

Reglas:
- Una etiqueta **nunca se mueve ni se borra**. Si algo salió mal, se publica la siguiente.
- La versión final (`v1.0.0`) se etiqueta sobre `main`, después de fusionar el trabajo y con el checklist completo.
- Las candidatas `-rc` se marcan como **prelanzamiento** en GitHub y dicen en su texto que no son para producción.

## Flujo

1. El trabajo se hace en ramas y entra por PR a la rama de integración (hoy `chain/rediseno-portal`; después `main`).
2. Con el CI en verde se etiqueta una candidata y se publica su Release (prelanzamiento).
3. Esa versión se instala en **staging** (`git checkout vX.Y.Z-rc.N` y `instalar.sh`) y se ensaya.
4. Con el ensayo correcto y el checklist completo, se fusiona en `main`, se etiqueta la versión final y se publica.
5. El despliegue a producción corre desde `main` y espera la **aprobación del propietario** (entorno `Production` en
   GitHub, con revisor obligatorio).

## Comandos

```bash
# Candidata sobre el último commit con CI en verde de la rama de integración
git fetch origin
git tag -a v1.0.0-rc.2 origin/chain/rediseno-portal -m "v1.0.0-rc.2: <resumen>"
git push origin v1.0.0-rc.2
gh release create v1.0.0-rc.2 --prerelease --verify-tag --title "v1.0.0-rc.2 — <resumen>" --notes-file notas.md

# Qué versión corre en un servidor
cd /opt/unc-portal && git describe --tags
```

Antes de etiquetar, agregue la sección de la versión en `CHANGELOG.md` (en un PR) y use ese texto como notas de la
Release.

## Historial

| Versión | Fecha | Commit | Estado |
| --- | --- | --- | --- |
| `v1.0.0-rc.1` | 2026-11-10 | `6d41c22` | Candidata para staging (prelanzamiento) |
