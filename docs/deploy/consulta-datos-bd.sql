-- consulta-datos-bd.sql — SEED-PROD: dónde están alojados los datos del portal y cuántas filas tiene cada tabla.
-- Solo lectura (SELECT): no modifica nada. Se ejecuta dentro del contenedor de PostgreSQL de producción:
--   docker exec -i unc-postgres-prod sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < docs/deploy/consulta-datos-bd.sql
-- Las tablas de Payload usan el nombre de la colección con guiones bajos (aranceles-facultad -> aranceles_facultad);
-- las que empiezan con `_` y terminan en `_v` son el historial de versiones (borradores), no contenido publicado.
-- Los conteos son exactos (count(*) por tabla) y no fallan si una tabla no existe: solo se listan las que existen.

\echo '== 1. Donde esta la base =='
SELECT current_database()                                   AS base,
       current_user                                         AS usuario,
       current_setting('data_directory')                    AS carpeta_en_el_contenedor,
       pg_size_pretty(pg_database_size(current_database())) AS tamano,
       split_part(version(), ',', 1)                        AS version;

\echo '== 2. Contenido principal (comparar con el manual, Parte C) =='
SELECT t.table_name AS tabla,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT count(*) AS c FROM %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text::bigint AS filas
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  AND t.table_name IN ('facultades', 'carreras', 'aranceles_facultad', 'aranceles_rectorado', 'autoridades', 'tramites',
                       'calendario_academico', 'dependencias_contacto', 'convenios', 'linea_tiempo', 'marco_legal',
                       'transparencia_items', 'glosario_guarani', 'reconocimientos', 'acreditaciones', 'tribunal_miembros',
                       'tribunal_documentos', 'faqs', 'ley5189', 'ley5282', 'noticias', 'media', 'tesis', 'users')
ORDER BY tabla;

\echo '== 3. Todas las tablas con datos (filas > 0) =='
SELECT * FROM (
  SELECT t.table_name AS tabla,
         (xpath('/row/c/text()',
                query_to_xml(format('SELECT count(*) AS c FROM %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text::bigint AS filas
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
) x
WHERE filas > 0
ORDER BY filas DESC, tabla;
