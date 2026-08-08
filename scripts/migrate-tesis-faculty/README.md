# Migración: Tesis.facultad → relación

## Contexto

El campo `Tesis.facultad` cambió de `select` (string hardcoded) a `relationship`
(relación con la colección `Facultades`). Payload v3 auto-migra el schema al arrancar
en dev, lo que **elimina** la columna `tesis.facultad` varchar y crea la tabla de
relaciones. Los datos existentes se pierden si no se hace backup antes.

## Orden obligatorio

### PASO 1 — ANTES de reiniciar el CMS: exportar datos viejos

El entorno local usa Docker. No hace falta tener `psql` instalado en Windows:

**PowerShell:**
```powershell
docker exec unc-postgres-local psql -U unc_cms -d unc_portal `
  -c "COPY (SELECT id, facultad FROM tesis WHERE facultad IS NOT NULL ORDER BY id) TO STDOUT CSV HEADER" `
  | Out-File -FilePath scripts/migrate-tesis-faculty/tesis_facultad_backup.csv -Encoding utf8
```

**Bash (WSL / Git Bash):**
```bash
docker exec unc-postgres-local psql -U unc_cms -d unc_portal \
  -c "COPY (SELECT id, facultad FROM tesis WHERE facultad IS NOT NULL ORDER BY id) TO STDOUT CSV HEADER" \
  > scripts/migrate-tesis-faculty/tesis_facultad_backup.csv
```

Verificar que el archivo tiene datos:
```powershell
Get-Content scripts/migrate-tesis-faculty/tesis_facultad_backup.csv
```

---

### PASO 2 — Reiniciar el CMS (auto-migra el schema)

```bash
npm run dev:all
```

Payload detecta el cambio y aplica la migración. La columna `tesis.facultad` varchar
se reemplaza por la tabla de relaciones. **Sin el CSV del paso 1, los datos se pierden.**

---

### PASO 3 — Con el CMS corriendo, restaurar relaciones

Primero crear un API Key con rol admin en el CMS:
**http://localhost:3002/admin → Settings → API Keys → Create**

Luego:
```powershell
$env:CMS_API_KEY="tu-api-key-aqui"; node scripts/migrate-tesis-faculty/2-restore.mjs
```

O en Bash:
```bash
CMS_API_KEY="tu-api-key-aqui" node scripts/migrate-tesis-faculty/2-restore.mjs
```

---

## ¿Qué hace cada script?

| Script | Momento | Qué hace |
|--------|---------|----------|
| `1-backup.sql` | Antes del restart | Query de referencia (usar vía `docker exec`) |
| `2-restore.mjs` | Después del restart | Lee el CSV, busca cada facultad por slug, PATCH a la API de Payload |

## Variables de entorno necesarias para el paso 3

```bash
NEXT_PUBLIC_CMS_URL=http://localhost:3002  # default, sin cambios
CMS_API_KEY=...                            # crear en /admin → Settings → API Keys
```
