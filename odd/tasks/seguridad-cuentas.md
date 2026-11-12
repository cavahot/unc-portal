# Seguridad de cuentas del CMS (política de contraseñas, cambio obligatorio, vencimiento y auditoría)
Objetivo: cuentas del CMS con política de contraseñas fuerte validada en el servidor, cambio obligatorio en el primer ingreso
y tras un restablecimiento (como Google Workspace), vencimiento por rol, guía con checks en vivo y todo auditado.
Rama `feat/seguridad-cuentas` (desde `chain/rediseno-portal`). Entrega: PR al tracker. Pruebas: `npx vitest run`.

## Specs
- S1 — Cambio obligatorio al primer ingreso: «que actue como el de la autentificacion de usuario en google que al acceder por primera vez le de la opcion de cambiar pero con relacion en auditoria». Una cuenta creada por un administrador, o cuya contraseña fijó un administrador, entra solo a la pantalla de cambio; hasta cambiarla, el servidor le niega todo lo demás.
- S2 — Política de contraseña: «que debe llevar la contrasaeña ejemplo 3 numero 4 alfanumericos uno especial uno en mayuscyka». Se aplica en el servidor en toda vía que fije una contraseña (crear, editar, primer registro, cambio propio); la vía «olvidé mi contraseña» de Payload, que no pasa por los hooks, se cierra y la recuperación la hace un administrador.
- S3 — Guía con checks en vivo: «que este la guia y de check cuando lo realiza el usuario maxima seguridad en eso». Cada regla se marca a medida que se cumple; el botón se habilita solo con todas cumplidas.
- S4 — Rotación: «debemos estimar cada cuanto». Vencimiento por rol y aviso previo; vencida, la cuenta queda como en S1.
- S5 — Auditoría: «todo auditado». Ingreso, salida, cambio de contraseña (propio, obligatorio, por vencimiento), restablecimiento por administrador, creación, eliminación y cambio de rol de cuentas.
- Supuesto (propuesta, configurable en `apps/cms/src/config/passwordPolicy.ts`): mínimo 12 caracteres con al menos 3 números, 4 letras (1 mayúscula y 1 minúscula como mínimo) y 1 carácter especial; sin espacios al inicio o al final; sin la parte del correo antes de la @; fuera de una lista de contraseñas comunes; distinta de las 5 anteriores. Vencimiento: 90 días para superadmin, web-admin, publisher y reviewer; 180 días para el resto; aviso 14 días antes.

## Tasks
| ID | Specs | Ruta | Estado | Evidencia |
| --- | --- | --- | --- | --- |
| T1 | S2, S4 | inline | hecho | política pura (reglas, evaluación, vencimiento) con pruebas |
| T2 | S1, S2, S4 | inline | pendiente | campos de Users, hooks que aplican la política e historial, migración |
| T3 | S1, S2 | inline | pendiente | el servidor niega todo salvo el cambio mientras sea obligatorio; cierre de forgot/reset; endpoint de cambio propio |
| T4 | S1, S3, S4 | inline | pendiente | pantalla de cambio con guía y checks, redirección y aviso de vencimiento en el panel |
| T5 | S5 | inline | pendiente | eventos de auditoría y migración del enumerado |
| T6 | S1–S5 | inline | pendiente | guía de usuario y de administrador, verificación en el CMS local, PR |

## Log
- L1 (2026-11-12, pedido original): «en cuanto al codigo de los roles que actue como el de la autentificacion de usuario en google que al acceder por primera vez le de la opcion de cambiar pero con relacion en auditoria, todo auditado en cuanto a la rotacion de credenciales debemos estimar cada cuanto y que debe llevar la contrasaeña ejemplo 3 numero 4 alfanumericos uno especial uno en mayuscyka que este la guia y de check cuando lo realiza el usuario maxima seguridad en eso, no entiendo el borrado de las ramas, y los demas puntos flojas realiza una lista de acuerdo a las prioridades y empecemos»
- L2: evidencia Payload 3.91: `auth/operations/resetPassword.js:57` calcula el hash sin hooks de la colección con la contraseña en claro (solo `beforeValidate` con el hash); `collections/operations/utilities/update.js:125,288-298` deja `data.password` visible a los hooks antes del hash; los endpoints propios de la colección se registran antes que los de Payload (`collections/config/sanitize.js:82`), así que pueden reemplazar `/forgot-password` y `/reset-password`.
- L3 (2026-11-12): T1 hecho. `apps/cms/src/config/passwordPolicy.ts` (reglas, evaluación por regla, mensaje para el servidor, vencimiento por rol); `tests/unit/password-policy.spec.ts` 9/9 (RED observado: módulo ausente). La lista de comunes rechazó «Abcd…» en la prueba: se cambiaron los ejemplos. Pendiente de confirmar por el propietario: 12 caracteres y 90/180 días.
