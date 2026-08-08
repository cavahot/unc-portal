-- ============================================================
-- PASO 1: Backup de Tesis.facultad ANTES de reiniciar el CMS
-- ============================================================
--
-- Ejecutar con:
--   psql $DATABASE_URL -f scripts/migrate-tesis-faculty/1-backup.sql
--
-- O en una línea:
--   psql $DATABASE_URL -c "COPY (SELECT id, facultad FROM tesis WHERE facultad IS NOT NULL ORDER BY id) TO STDOUT CSV HEADER" > scripts/migrate-tesis-faculty/tesis_facultad_backup.csv
--
-- El archivo resultante (tesis_facultad_backup.csv) es consumido por 2-restore.mjs.
-- ============================================================

\COPY (
  SELECT
    id,
    facultad  -- valor del select: 'odontologia', 'medicina', etc.
  FROM tesis
  WHERE facultad IS NOT NULL
  ORDER BY id
)
TO 'scripts/migrate-tesis-faculty/tesis_facultad_backup.csv'
CSV HEADER;

-- Verificación: muestra cuántos registros fueron exportados
SELECT
  facultad,
  COUNT(*) AS total
FROM tesis
WHERE facultad IS NOT NULL
GROUP BY facultad
ORDER BY total DESC;
