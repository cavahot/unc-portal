# ARCH-DB-01 — Evidencia de validación de DATABASE_URI

**Estado:** implementación local parcial; conectividad PostgreSQL pendiente.  
**Rama:** `security/rbac-foundation`.  
**No se leyeron secretos ni se inició Docker.**

## RED

Se escribió primero `tests/unit/database-config.spec.ts`. La prueba falló antes de existir el helper:

```text
Cannot find module '../../apps/cms/src/config/database'
```

El fallo correspondía a la ausencia del comportamiento implementado, no a una afirmación de conectividad.

## GREEN

Se añadió `apps/cms/src/config/database.ts` con `getDatabaseURL()` y comentarios `ARCH-DB-01`. El helper:

- prioriza `DATABASE_URI`;
- usa `DATABASE_URL` como compatibilidad;
- acepta únicamente `postgres://` y `postgresql://`;
- rechaza vacío, `***`, `REEMPLAZAR`, `CHANGE_ME` y `TODO`;
- no incluye la URI completa en el mensaje de error;
- no realiza conexiones de red.

`apps/cms/src/payload.config.ts` ahora usa el helper y no inicia Payload con una URI vacía.

`infrastructure/docker/compose.prod.yaml` ahora recibe `DATABASE_URI` desde el entorno/secretos, en lugar de construirla con una contraseña literal dentro del YAML.

`infrastructure/docker/.env.prod.example` y `DEPLOY.md` documentan la nueva variable sin contener secretos reales.

## Verificación

| Prueba | Resultado |
|---|---:|
| Test específico ARCH-DB-01 | 7/7 |
| Suite portal | 23/23 |
| Typecheck portal | correcto |
| Typecheck CMS | 18 errores preexistentes en otros archivos; 0 en archivos ARCH-DB-01 modificados |
| `docker compose ... config --quiet` | correcto con plantilla |
| `node harness/check.mjs --quick` | correcto |
| PostgreSQL sintético `pg_isready` | aceptando conexiones |
| Consulta SQL sintética | PostgreSQL 16.14, base `unc_portal`, rol `unc_cms` |
| Inicialización Payload con URI sintética | alcanzó la lectura del esquema; se detuvo ante prompt interactivo de migración |

La inicialización de Payload confirmó que la URI fue aceptada y que el CMS llegó a consultar el esquema de PostgreSQL. No se seleccionó ninguna opción de migración y no se ejecutaron cambios estructurales.

## Limitaciones

- No se verificó autenticación real contra PostgreSQL.
- No se comprobó que `.env.prod` del servidor real contenga `DATABASE_URI`.
- No se inició Docker porque el motor no estaba activo y el procedimiento exige autorización.
- La plantilla contiene placeholders intencionales; no es una configuración de producción utilizable hasta reemplazarlos fuera del repositorio.
- La comprobación de conectividad se mantiene separada de la validación pura para no introducir red en pruebas unitarias.

## Próximo paso

Autorizar un entorno sintético con Docker Desktop o proporcionar un staging aislado. Luego ejecutar `ARCH-DB-01` dinámico: levantar solo PostgreSQL, probar `pg_isready`, iniciar CMS con una URI sintética y verificar healthcheck sin ejecutar seeds de producción.

## ARCH-DB-02 — Evidencia inicial

Se confirmó que Payload no tenía migraciones versionadas en el repositorio: `migrate:status` informaba `No migrations found`, aunque la base local contenía una migración histórica `dev` generada por el modo de desarrollo.

Cambios realizados:

- `payload.config.ts` declara explícitamente `migrationDir: path.resolve(dirname, 'migrations')`.
- Se añadió `apps/cms/src/migrations/README.md` con el límite de la línea base.
- Payload generó:
  - `apps/cms/src/migrations/20261017_021341_arch_db_02_baseline.ts`
  - `apps/cms/src/migrations/20261017_021341_arch_db_02_baseline.json`
- La migración recibió un encabezado de seguimiento `ARCH-DB-02` en español.

## Prueba de migración reproducible

Se creó una base sintética temporal `unc_portal_archdb02_test`. Payload ejecutó la migración sin interacción manual:

```text
Migrated: 20261017_021341_arch_db_02_baseline
```

Resultado comprobado antes de eliminar la base temporal:

```text
test_tables=64
test_migrations=1
```

La base temporal fue eliminada después de la prueba. La base local original no fue migrada ni alterada estructuralmente.

## Limitaciones de ARCH-DB-02

- La migración es una línea base del esquema observado, no una aprobación para producción.
- La base local original conserva el estado previo y la entrada histórica `dev`.

## Comparación entre dos bases vacías

Se ejecutó la misma migración en `unc_portal_archdb02_a` y `unc_portal_archdb02_b`. Se exportó el esquema con `pg_dump --schema-only --no-owner --no-privileges` y se normalizaron únicamente las líneas `\\restrict`/`\\unrestrict`, que son tokens variables del propio dump.

```text
sha256(schema_a_normalizado)=49386f0d8d01083bf138298f5ef381ba9d0957b9bd8e50c530d5f8b851cacd43
sha256(schema_b_normalizado)=49386f0d8d01083bf138298f5ef381ba9d0957b9bd8e50c530d5f8b851cacd43
equal=True
```

Ambas bases produjeron el mismo esquema después de aplicar la migración. Las bases temporales fueron eliminadas.

## Rollback sintético

Se aplicó la migración en `unc_portal_archdb02_down` y luego se ejecutó `migrate:down` con confirmación explícita solo para esta base temporal:

```text
Migrated down: 20261017_021341_arch_db_02_baseline
 tables_after_down=0
```

La base temporal fue eliminada después de la prueba. No se ejecutó rollback sobre la base local original ni sobre producción.

## Pendiente

- Ejecutar una prueba adicional con fixtures aprobados y no sensibles.
- Automatizar la comparación de esquemas dentro del arnés para que no dependa de comandos manuales.
- Revisar la línea base generada antes de considerar cerrado `ARCH-DB-02`.
