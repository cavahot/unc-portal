# Límites para pruebas adversariales del Portal UNC

**Autorización actual:** revisión del código local y pruebas de seguridad no destructivas con fixtures sintéticas. Esto NO autoriza pruebas contra un dominio publicado ni contra datos de producción.

## Permitido sin Docker

- Leer código, dependencias, rutas y configuración no secreta.
- Ejecutar tests unitarios, typecheck, lint y auditoría de dependencias; registrar fallos sin modificar el producto automáticamente.
- Simular ataques en memoria/fixtures sobre funciones de autorización: anónimo leyendo borradores, editor intentando publicar, viewer intentando cambiar umbrales, cliente falsificando `Origin`, rol intentando falsificar un registro.

## Pendiente de autorización para pruebas dinámicas

- **Objetivo exacto:** URL del staging o autorización explícita para producción.
- **Alcance:** endpoints, cuentas de prueba por rol, ventana horaria, límite de peticiones, operaciones permitidas y contacto de incidentes.
- **Infraestructura:** autorización para iniciar Docker Desktop o acceso a staging con PostgreSQL/MinIO y datos sintéticos; credenciales mediante canal seguro, nunca en chat ni repositorio.
- **Excluido por defecto:** fuerza bruta, denegación de servicio, fuzzing agresivo, modificación/borrado de datos reales, bypass de sesiones ajenas y exfiltración.

## Plantilla de hallazgo

| Campo | Contenido |
|---|---|
| ID / severidad | SEC-FIND-XXX / con criterio explícito |
| Objetivo / entorno | Local, staging o producción autorizada |
| Precondición | Rol, fixture sintética, versión exacta |
| Acción controlada | Petición o prueba reproducible con tasa limitada |
| Esperado vs observado | 401/403/no dato vs respuesta real |
| Evidencia | Archivo:línea, test, respuesta redactada sin PII |
| Impacto y alcance | Lo probado y lo que no quedó demostrado |
| Remediación | Control del servidor + test de regresión |

Detener y avisar si aparece dato personal real, credencial, degradación del servicio o comportamiento fuera del alcance autorizado.
