# Arnés local de ingeniería y seguridad — Portal UNC

Un runner de **solo lectura del código fuente** para la línea base SDD/RDD. No crea usuarios, no cambia roles, no corre migraciones ni toca producción. Los comandos de pruebas existentes pueden generar cachés temporales en sus propias herramientas.

## Uso

```text
node harness/check.mjs --plan       # ver el plan sin ejecutar
node --test "harness/*.test.mjs"  # comprobar el runner y los guards (Node 24 no acepta el directorio)
node harness/check.mjs --quick      # documentos + unitarias + typecheck portal
node harness/check.mjs --full       # suma CMS typecheck, lint y npm audit (red)
```

El runner imprime JSON con cada comando, estado de salida y resumen corto. `--full` debe devolver **no cero** mientras fallen gates existentes; eso es una línea base honesta, no fallo del arnés. La auditoría de paquetes consulta el registro npm y **no** actualiza dependencias. No ejecutar integración/E2E con datos reales sin ambiente aislado.

## Guards DEP-00 (solo lectura)

`harness/guards.mjs` define 8 funciones puras (`guard-tracked-secrets`, `guard-api-coverage`, `guard-route-roles`, `guard-jsonld`, `guard-env-parity`, `guard-deploy-steps`, `guard-i18n-parity`, `guard-secret-required`) que devuelven `{ id, passed, findings }`. `--quick` y `--full` los ejecutan y los reportan en la clave `guards` del JSON. Un guard rojo es deuda real del informe AUDIT-DEPLOY-2026-10-19, no un fallo del arnés; los findings son rutas/líneas/nombres de variable, nunca valores.

## Siguientes incrementos

- Una vez aprobada SEC-03, añadir pruebas de acceso por rol sobre fixtures con `overrideAccess: false` y REST/GraphQL.
- Con Docker Desktop activo o staging aislado, ejecutar pruebas de integración contra PostgreSQL/MinIO sintéticos, verificar backup/restauración y reproducir ataques no destructivos de `docs/security/ATTACK-BOUNDARIES.md`.
- No convertir los chequeos de texto o un escáner de dependencias en una certificación de seguridad.
