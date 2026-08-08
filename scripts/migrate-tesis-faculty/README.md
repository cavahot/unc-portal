# Migración: Tesis.facultad → relación

## Contexto

El campo `Tesis.facultad` cambió de `select` (string hardcoded) a `relationship`
(relación con la colección `Facultades`). Payload v3 auto-migra el schema al arrancar
en dev, lo que **elimina** la columna `tesis.facultad` varchar y crea la tabla de
relaciones. Los datos existentes se pierden si no se hace backup antes.

## Orden obligatorio

```
PASO 1 — ANTES de reiniciar el CMS:
  psql $DATABASE_URL -f scripts/migrate-tesis-faculty/1-backup.sql

PASO 2 — Reiniciar el CMS (auto-migra el schema):
  npm run dev:all

PASO 3 — Con el CMS corriendo, restaurar las relaciones:
  node scripts/migrate-tesis-faculty/2-restore.mjs
```

## ¿Qué hace cada script?

| Script | Momento | Qué hace |
|--------|---------|----------|
| `1-backup.sql` | Antes del restart | Guarda `(id, facultad_slug)` en `tesis_facultad_backup.csv` |
| `2-restore.mjs` | Después del restart | Lee el CSV, busca cada facultad por slug, PATCH a la API de Payload |

## Variables de entorno necesarias

```bash
DATABASE_URL=postgresql://...  # solo para el paso 1
NEXT_PUBLIC_CMS_URL=http://localhost:3002  # solo para el paso 3 (default de .env.local)
CMS_API_KEY=...  # API key con rol admin en Payload (crear en /admin → API Keys)
```
