# Pre-deploy audit — Portal UNC (2026-10-19)

Branch: `security/rbac-foundation` (with uncommitted changes). Related: `TASK-SEC-001-hardening-portal-unc.md`, `TASK-ARCH-DB-001-backend-db-hardening.md`.

**Verdict: NO-GO for production.**

## Scope and limits

- Static, read-only audit: access control, middlewares, frontend, backend, relational DB and the deploy package.
- No build, tests, `npm audit` or Docker were run, and no per-role negative tests were executed.
- Items marked **[V]** were confirmed by reading the code directly. The rest come from subagent reports and are not yet confirmed.
- Not covered: `payload-types.ts` vs collections, per-collection indexes/FKs, all pages, real Payload 3.87.1 behavior for cookies, CSRF and anonymous `draft=true`.
- The editor/publisher permission is still an open Product Owner decision (`docs/FLUJO_EDITORIAL.md`). This report does not resolve it.

## Critical (block the deploy)

| ID | Finding | Evidence | Minimal fix |
|---|---|---|---|
| C1 [V] | Production data dump versioned in git; restore is destructive | `setup/seed.dump.gz` in `git ls-files`, not ignored; `scripts/setup/restore-db-prod.sh` runs `DROP SCHEMA public CASCADE` with no prior `pg_dump` | Check the dump for users/PII; if present, remove it from the repo and purge history. Ignore `setup/*.dump*`. Require a `pg_dump` before the DROP |
| C2 [V] | Drafts and editorial data are publicly readable | `Noticias.ts:19`, `Paginas.ts:18`: `read: () => true`, drafts enabled. Anonymous `draft=true` behavior is a hypothesis | `read` returns `true` only for recognized roles; otherwise `{ _status: { equals: 'published' } }`. Add a negative test (SEC-02) |
| C3 | Editorial flow not enforced in the backend | `canWriteEditorial` allows `editor` and `correspondent`; `approvalStatus`, `_status`, `approvalHistory` have no field `access` or `beforeChange` check | Field-level access plus a `beforeChange` hook that derives history from `req.user`. Role matrix depends on SEC-03 |
| C4 [V] | No migration step in the deploy; no rollback | No "migrate" match in `.github`, `apps/cms/Dockerfile` or `DEPLOY.md`; compose uses `:latest`; restore leaves `payload_migrations` without the baseline | One schema path (seed + mark baseline applied, or migrate on empty DB); explicit migrate step with prior backup; deploy by sha |

## High

- **[V] Audit log exposed and mutable.** `Auditoria.read` only requires a session (any role, including `viewer`), and the data includes emails and IPs. `update` and `delete` are allowed to `superadmin`.
- **Monitoring routes without role checks.** `/api/logs`, `/metrics`, `/dashboard/*`, `/alerts` (GET), `/api/auditoria` respond to any authenticated user. Several return `error.message` to the client. `limit`/`hours` are not validated.
- **[V] Rate limit and CORS do not cover `/api/*`.** The `proxy.ts` matcher excludes `api/`. `/api/contact` trusts the first `x-forwarded-for` value, which the client controls.
- **[V] Stored XSS through JSON-LD.** Six `dangerouslySetInnerHTML` with `JSON.stringify` and no `<` escaping, in `app/[locale]/noticias/[slug]/page.tsx`, `carreras/[slug]/page.tsx` and `layout.tsx`. Titles come from the CMS. The CSP has `'unsafe-inline'`, so it does not stop it.
- **Backup and restore are incompatible.** `backup.sh` writes a custom-format dump; `restore.sh` reads it with `gunzip | psql`. Both target `unc-postgres-local`, not `-prod`. `backup.yml` needs a Postgres exposed to the internet, which this design does not have. Restore has never been tested.
- **Misleading health check.** Without a session `/api/health` returns `ok` without touching the DB. With a session it reads `DATABASE_URL`, which prod does not define. The deploy waits a fixed 20 s and does not roll back on failure.
- **Env vars out of sync.** `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `SMTP_FROM_*`, `POSTGRES_SSL` do not reach the compose. The portal uses `SMTP_PASS`, the CMS `SMTP_PASSWORD`. Password-reset and contact emails may fail in production.
- **MinIO.** Unpinned version (`:latest`) and the root credential is used as the app credential.

## Medium

- **[V]** `PAYLOAD_SECRET || ''` allows starting with an empty secret.
- Preview secret travels in the query string; `/api/revalidate` throws 500 when token lengths differ.
- `/api/monitoring` is an unauthenticated Sentry tunnel that fetches a host taken from the client envelope (partial SSRF).
- RichText `href={url}` has no scheme allowlist.
- A 404 caused by a CMS outage is cached for up to 1 h (`revalidate = 3600`).
- Missing i18n files: `en` lacks `aranceles-rectorado`, three faculty pages, `ley-5189`, `ley-5282`; `gn` and `pt-BR` lack `ley-5189` and `ley-5282`.
- Nginx: missing security headers, rate limit only on login, `/admin` open to the internet, fragile certificate renewal.
- Containers: no resource limits, a single network, no log rotation.
- Workflows: actions pinned by tag, not SHA; `SENTRY_AUTH_TOKEN` stays in an image layer.
- Migration tests only check a string in the source; they do not verify that migrations exist or match the collections.
- No index on `auditoria.usuario`, `fecha_hora`, `coleccion`.

## Low

- Versioned backups and leftovers: `.bak`/`.backup` files, `apps/cms/test.env`, `package.*.before-*.json`.
- `test_write.txt` is not ignored (AGENTS.md says it must not be committed).
- Dead code: `app/security-headers.ts`, `apps/cms/src/app/my-route`.
- `remotePatterns` includes localhost in production.

## What is correct

- Fail-fast DB URI validation that does not leak the secret.
- `Users`: the `role` field and the last superadmin are protected.
- `Auditoria.create` is `false`.
- `revalidate` uses Bearer auth and an allowlist.
- No secrets in `NEXT_PUBLIC_*`.
- No DB or MinIO ports exposed; both images run as non-root; `.env` files are ignored.

## Go/no-go checklist

- [ ] C1: decide the fate of the seed dump and add a mandatory backup to the restore script
- [ ] C2/C3: restrict draft reads and enforce editorial transitions, with negative tests
- [ ] C4: explicit migration step and rollback by sha
- [ ] Audit log read-only and limited to auditor/superadmin
- [ ] Role checks on all CMS monitoring routes
- [ ] Rate limit and CORS applied to `/api/*`; trusted client IP
- [ ] JSON-LD escaping helper
- [ ] Backup and restore tested end to end on synthetic data
- [ ] Health check with a real DB probe, retries and rollback
- [ ] Env vars aligned across compose, code and `.env.prod.example`
- [ ] Pin MinIO and application images; MinIO service user
- [ ] Nginx headers, `/admin` restriction, certificate renewal tested
- [ ] Remove versioned leftovers; ignore `test_write.txt`

## Suggested order (TDD, one negative test per item)

C2 → C3 → audit/monitoring access → JSON-LD → `/api/*` limits → migrations and restore → deploy health/rollback → hygiene. Each fix needs its own diff, test evidence and rollback note (AGENTS.md).
