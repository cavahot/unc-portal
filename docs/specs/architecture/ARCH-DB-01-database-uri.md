# ARCH-DB-01 — Contrato de conexión PostgreSQL

**Estado:** SDD aprobado para implementación local; no verifica producción.  
**Fuente RDD:** `docs/evidence/arch-db-00-baseline.md`, `compose.prod.yaml:91-95`, `payload.config.ts:37-40`.

## Contrato

- La configuración activa debe proporcionar `DATABASE_URI` o, como compatibilidad, `DATABASE_URL`.
- La primera variable no vacía tiene prioridad.
- La URI debe usar `postgresql:` o `postgres:`.
- Se rechazan valores vacíos, `***`, `REEMPLAZAR`, `CHANGE_ME`, `TODO` y plantillas sin resolver.
- La validación no devuelve ni imprime la URI completa en errores.
- El helper no hace conexiones de red: solo valida configuración. La conectividad se probará aparte con PostgreSQL sintético.
- `payload.config.ts` debe consumir este helper en lugar de usar una cadena vacía como fallback.

## Given / When / Then

1. Given `DATABASE_URI` válida, When se carga la configuración, Then se devuelve esa URI.
2. Given `DATABASE_URI` vacía y `DATABASE_URL` válida, When se carga la configuración, Then se usa `DATABASE_URL`.
3. Given una URI con `***` o `REEMPLAZAR`, When se valida, Then falla con error seguro sin incluir el secreto.
4. Given una URI `mysql://` o texto cualquiera, When se valida, Then falla por esquema no admitido.
5. Given ambas variables vacías, When se carga la configuración, Then falla antes de iniciar Payload.

## Fuera de alcance

- No cambiar contraseñas existentes.
- No leer `.env` reales.
- No iniciar Docker automáticamente.
- No ejecutar migraciones ni consultar producción.
- No comprobar la disponibilidad TCP desde este helper.
