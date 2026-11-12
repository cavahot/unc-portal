# Contraseñas y cuentas del CMS

Guía para quienes usan el panel (`/accesoSeguro`) y para el superadministrador que administra las cuentas.
Especificación y evidencia: `odd/tasks/seguridad-cuentas.md` (SEC-CUENTAS-01..03). Las reglas viven en un solo lugar,
`apps/cms/src/config/passwordPolicy.ts`: la pantalla y el servidor usan las mismas.

## 1. Qué debe llevar una contraseña

| Regla | Ejemplo de qué falla |
| --- | --- |
| Al menos 12 caracteres | `Wxyz#123456` (11) |
| Al menos 3 números | `Abcdefgh#12x` |
| Al menos 4 letras | `Ab#123456789` |
| Al menos una mayúscula y una minúscula | `abcd#123efgh` / `ABCD#123EFGH` |
| Al menos un carácter especial (`# $ % & * ! ?` …) | `Wxyz1234efgh` |
| Sin espacios al inicio ni al final | `␠Rx7#tq92Lmv5` |
| No contiene su usuario de correo (lo que va antes de la @) | `Jperez#2026xyz` para `jperez@…` |
| No es una contraseña común | `Password#123`, `Concepcion#2026` |
| Distinta de sus 5 contraseñas anteriores | — |

Mientras escribe, la pantalla marca con ✓ cada regla cumplida. El botón se habilita solo cuando todas están cumplidas
y la confirmación coincide. Aunque alguien saltee la pantalla, el servidor rechaza la contraseña con el mismo mensaje.

## 2. Vencimiento

- La contraseña vence a los **90 días** para todos los roles.
- Desde **14 días antes**, el panel muestra un aviso con los días que faltan.
- Al vencer, la cuenta solo puede cambiar su contraseña o salir: el servidor le niega todo lo demás.
- Las cuentas que existían antes de esta política no tienen fecha de cambio: cambian su contraseña en el próximo ingreso.

## 3. Para el usuario

**Primer ingreso o contraseña restablecida.** Si el administrador marcó «Pedirle al usuario que cambie la contraseña
cuando acceda», al entrar el panel lo lleva a **Cambiar contraseña**. Escriba la contraseña que le dieron, elija una
nueva siguiendo la guía y confírmela. Hasta hacerlo no puede ver ni editar nada.

**Cambiar la contraseña cuando quiera.** Vaya a `/accesoSeguro/cambiar-clave`. Siempre se pide la contraseña actual:
el botón «Cambiar contraseña» de la ficha de usuario de Payload no sirve para la propia cuenta y lo indica.

**Al cambiarla** se cierran sus demás sesiones abiertas (otros equipos o navegadores); la actual sigue.

**Si se equivoca 5 veces** con la contraseña actual (al ingresar o al cambiarla), la cuenta se bloquea 10 minutos.

**Si la olvidó.** No hay «olvidé mi contraseña» por correo: pídasela al superadministrador del portal.

## 4. Para el superadministrador

### Restablecer la contraseña de otra cuenta

1. Abra **Usuarios** y luego la ficha de la persona. Complete **Nombre** y **Apellido** si faltan: el diálogo los usa.
2. En la barra lateral pulse **Restablecer contraseña**. Se abre «Restablecer la contraseña de *Nombre Apellido*».
3. Elija una opción:
   - **Generar una contraseña automáticamente** (recomendada): el sistema crea una de 16 caracteres que cumple la
     política. «En el siguiente paso podrás ver y copiar la contraseña».
   - **Crear contraseña**: escríbala; la guía marca las reglas y **RESTABLECER** se habilita cuando cumple todas.
4. Deje marcada **«Pedirle al usuario que cambie la contraseña cuando acceda»** salvo un motivo concreto.
5. Pulse **RESTABLECER**. Aparece «La contraseña se restableció correctamente».
6. Use el ojo para verla o **COPIAR LA CONTRASEÑA**, y pulse **LISTO**.

La contraseña se muestra **una sola vez**: no queda en el registro, en la auditoría ni en el navegador. Entréguela por un
canal seguro (en persona o por un gestor de contraseñas compartido), nunca por correo ni chat. Al restablecer se
cierran todas las sesiones abiertas de esa cuenta.

No puede restablecer su propia contraseña desde aquí: use «Cambiar contraseña». Solo un superadministrador con su
propia contraseña al día puede restablecer.

### Crear una cuenta

Al crearla desde el panel, la cuenta queda con el cambio obligatorio: la persona elige su contraseña en el primer
ingreso. El primer superadministrador (pantalla de primer registro) elige la suya y no queda obligado a cambiarla.

### Cuentas usadas por scripts (pruebas de humo, sondas)

Una cuenta con el cambio pendiente o con la contraseña vencida no tiene permisos. Antes de correr los scripts de
`docs/deploy/README-VPS.md`, ingrese una vez con cada cuenta de prueba y cambie su contraseña; repítalo cada 90 días.

## 5. Qué queda en la auditoría

Colección **Auditoría** (solo superadministrador): ingresos y salidas, cambios de contraseña propios (con el motivo:
voluntario, primer ingreso o restablecida, vencida), intentos fallidos de cambio, restablecimientos por un
administrador (generada o creada, y si exige cambio), altas, bajas y cambios de rol. Nunca se registra una contraseña
ni un hash.

## 6. Sesión

La cookie de sesión es `SameSite=Strict` y, en producción, `Secure`. Solo los orígenes del CMS y del portal
configurados (`NEXT_PUBLIC_SERVER_URL` / `CMS_PUBLIC_URL` y `PORTAL_URL`) pueden usar la sesión desde el navegador. Por
`Strict`, un enlace al panel abierto desde el correo llega sin sesión y pide ingresar: es esperado.
