# DEP-17 — Higiene del repositorio (respaldos y artefactos versionados)

**Estado:** aplicado localmente en el índice (staged deletions, sin commit); pendiente de revisión humana y commit. `guard-tracked-secrets` sigue ROJO por un único hallazgo que requiere decisión humana: `setup/seed.dump.gz`.

## Hecho observado (`git ls-files`)

Respaldos y salidas versionados que el guard debía detectar. Se sacaron del índice con `git rm --cached` (siguen en disco, mismo SHA-1 antes y después):

- `package.backup.json`, `package.before-cms-repair.json`, `package.before-workspaces.json`, `package-lock.before-cms-repair.json`
- `apps/cms/package.before-cms-repair.json`, `apps/cms/next.config.ts.before-turbopack-root.bak`, `apps/cms/src/payload.config.pre-mailpit.backup.ts`, `apps/cms/test.env`
- `infrastructure/docker/compose.backup.yaml`, `infrastructure/docker/compose.postgres.backup.yaml`
- `migration-errors.json` (salida de `scripts/migrate-wordpress.mjs`, que la escribe, no la lee), `test-results/.last-run.json`
- `archive/web-legacy/components/hero/CinematicHero.video.bak`

## Referencias revisadas

Búsqueda en Dockerfile*, infrastructure/, .github/, scripts/, package.json, docs/ y código: ninguno de esos nombres se usa como entrada (sin COPY ni scripts que los lean). Única mención funcional: `scripts/migrate-wordpress.mjs:603` escribe `migration-errors.json`.

## Guard y .gitignore

- `guardTrackedSecrets` ahora detecta `package-lock.before-*.json`, `package.before-*.json` (el patrón anterior exigía un punto extra y no lo cubría), `migration-errors.json` en la raíz y cualquier ruta bajo `test-results/`. Pruebas en `harness/guards.test.mjs`.
- `.gitignore` (añadido al final): `*.bak`, `*.backup*`, `test_write.txt`, `package.before-*.json`, `package.*.before-*.json`, `package-lock.before-*.json`, `package.backup.json`, `migration-errors.json`, `test-results/`, `tsconfig*.tsbuildinfo`.

## Fuera de alcance (decisión aparte)

- `setup/seed.dump.gz`: dump versionado con posible PII; ver DEP-01 y RDD-DEP-01.
- `app/security-headers.ts` (código muerto) y `remotePatterns` con localhost en producción.
- `archive/web-legacy/**` (se dejan `CinematicHero.tsx` y `hero-entry.webp`, no son respaldos).

## Rollback

`git restore --staged -- <archivos>` para cada ruta de la lista y revertir las líneas DEP-17 del final de `.gitignore`.
