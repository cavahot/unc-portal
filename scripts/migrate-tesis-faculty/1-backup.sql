-- ============================================================
-- PASO 1: Backup de Tesis.facultad ANTES de reiniciar el CMS
-- ============================================================
--
-- Este archivo no se ejecuta directamente — usarlo como referencia.
-- El comando correcto para Windows (sin psql instalado) está en README.md.
--
-- En entornos con psql instalado:
--   psql $DATABASE_URL -f scripts/migrate-tesis-faculty/1-backup.sql
-- ============================================================

-- Exporta id + facultad_slug al cliente (stdout)
COPY (
  SELECT
    id,
    facultad  -- valor del select: 'odontologia', 'medicina', etc.
  FROM tesis
  WHERE facultad IS NOT NULL
  ORDER BY id
)
TO STDOUT
CSV HEADER;

-- Verificación: distribución por facultad
SELECT
  facultad,
  COUNT(*) AS total
FROM tesis
WHERE facultad IS NOT NULL
GROUP BY facultad
ORDER BY total DESC;
