# Regla SEC-027 — Gate de seguridad antes de publicar

**Estado:** activa como regla de revisión
**Ámbito:** Portal UNC y cualquier aplicación que se incorpore al mismo ciclo de trabajo
**Origen:** síntesis interna basada en la guía «27 controles de seguridad antes de publicar tu app», de Brayan Valencia Cuellar / KIRELEN.

> Esta regla adapta el enfoque de la guía al método de trabajo del Portal UNC. No reproduce el PDF ni sustituye sus controles individuales. La lista exacta de los 27 controles queda pendiente de cotejo si se dispone del documento completo.

## Regla obligatoria

Una aplicación **no puede pasar a staging aprobado, producción ni publicación** hasta que sus controles de seguridad aplicables estén identificados, comprobados con evidencia reproducible y revisados después de las correcciones autorizadas.

La revisión debe cubrir, como mínimo, estas familias de riesgo:

1. autenticación y sesiones;
2. secretos y configuración sensible;
3. separación de usuarios, roles y privilegios;
4. protección de solicitudes y límites de abuso;
5. archivos, cargas y contenido activo;
6. pagos u operaciones de impacto económico, si existen;
7. dependencias, runtime e imágenes de despliegue;
8. registros, auditoría, alertas y respuesta operativa.

## Condiciones de cumplimiento

Para cada control aplicable se debe registrar:

- identificador interno `SEC-027-XX`;
- componente, ruta, colección o servicio afectado;
- amenaza que se revisa;
- precondiciones y entorno autorizado;
- prueba realizada con datos o cuentas sintéticas;
- resultado esperado y resultado observado;
- evidencia: archivo, línea, test, configuración o salida redactada;
- clasificación: `confirmado`, `condicional` o `pendiente`;
- severidad e impacto;
- corrección propuesta;
- prueba de regresión;
- responsable y estado.

## Reglas de bloqueo

El gate debe quedar en estado **bloqueado** cuando ocurra cualquiera de estas condiciones:

- existe un bypass de autenticación, autorización o transición editorial;
- se exponen secretos, credenciales, tokens o datos privados;
- una carga, URL, redirección, webhook o fetch no tiene validación server-side suficiente;
- una imagen o dependencia crítica no está fijada o tiene riesgo no evaluado;
- faltan límites de tamaño, tasa, timeout o concurrencia para una operación abusada;
- los registros no permiten reconstruir una operación sensible;
- un hallazgo alto o crítico no tiene mitigación aceptada, excepción documentada y fecha de revisión;
- la prueba depende solo de una respuesta de IA, sin ejecución o evidencia independiente;
- se pretende probar o desplegar contra producción sin alcance, respaldo y autorización explícitos.

## Secuencia obligatoria

```text
Delimitar alcance autorizado
        ↓
Inventariar los 27 controles aplicables
        ↓
SDD: contrato, amenaza y aceptación
        ↓
RDD: evidencia y límites de la revisión
        ↓
TDD: prueba negativa o de regresión
        ↓
Implementar el cambio mínimo autorizado
        ↓
Repetir la prueba afectada
        ↓
Ejecutar gates del arnés
        ↓
Revisión independiente
        ↓
Backup y restore comprobados
        ↓
Staging con datos sintéticos
        ↓
Smoke tests y observabilidad
        ↓
Autorización explícita de publicación
```

## Límites de seguridad

- La revisión local es defensiva y no autoriza pentesting externo.
- No se deben usar datos reales, credenciales reales ni secretos en fixtures, logs o prompts.
- No se deben ejecutar migraciones irreversibles, borrados, fuerza bruta, fuzzing agresivo o pruebas de denegación de servicio sin autorización separada.
- Un resultado verde demuestra únicamente el alcance probado; no certifica ausencia de vulnerabilidades.
- Los hallazgos condicionados deben mantenerse como condicionados hasta verificar el entorno real autorizado.

## Criterio de cierre

`SEC-027` solo puede marcarse como **cumplido** cuando:

1. todos los controles aplicables tienen evidencia;
2. los controles no aplicables tienen justificación técnica;
3. no existen bloqueadores altos o críticos sin excepción aprobada;
4. las correcciones tienen pruebas de regresión verdes;
5. el informe distingue hechos confirmados, riesgos condicionados y pruebas pendientes;
6. backup, restore, rollback, observabilidad y límites operativos fueron comprobados en el entorno correspondiente.

## Registro inicial para Portal UNC

| Control | Estado inicial | Evidencia | Próximo paso |
|---|---|---|---|
| `SEC-027-01` a `SEC-027-08` — familias de riesgo | `pendiente de desglose exacto` | La página pública describe las familias, pero el PDF protegido no fue descargado | Obtener el documento por un canal autorizado o convertir cada familia en controles internos verificables |
| Gate de pruebas | `bloqueado` | Suite global: 2.119/2.129; FAC-01 tiene 10 fallos | Corregir o decidir formalmente los fallos FAC-01 y repetir la suite |
| Dependencias | `bloqueado` | Auditoría actual: 3 altas, 10 moderadas y 9 bajas | Evaluar cada aviso, versiones afectadas y mitigación sin ejecutar auto-fix |
| Despliegue | `pendiente` | No aprobado para producción | Completar staging sintético, backup/restore y rollback |
