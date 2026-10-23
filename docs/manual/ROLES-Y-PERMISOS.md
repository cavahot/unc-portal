# Roles y permisos del CMS — Portal UNC

**Para quién es:** todas las personas que usan el CMS (`/accesoSeguro`) y quienes administran sus cuentas.
**Base:** matriz editorial aprobada el 22-10-2026 (`docs/specs/security/SEC-03-matriz-editorial.md`). Este texto sirve de borrador para el manual de usuario.

> **Estado de aplicación (DEP-03, 22-10-2026).** El servidor **ya impone** en código, para noticias y páginas: quién puede pasar un contenido de un estado a otro; que solo el Publicador (y el Superadministrador) publiquen y despublican; que nadie apruebe ni publique lo propio (cuando el contenido tiene autor registrado); que rechazar exija un comentario; que el historial de aprobaciones lo escriba solo el servidor; que lo nuevo nazca en Borrador y que editar algo aprobado o publicado deje un **borrador nuevo** sin retirar la versión pública vigente. Se probó con pruebas automáticas que simulan cada rol; **todavía no se ha probado con el CMS y la base de datos reales** (hace falta un ambiente de prueba autorizado).
>
> **Aún pendiente:**
> - **Publicación de emergencia del Superadministrador** (con motivo obligatorio y registro reforzado; tarea DEP-03c). Mientras tanto el Superadministrador publica y despublica lo **aprobado** como cualquier Publicador, sin pedir motivo, y tampoco puede publicar lo que él mismo creó.
> - **Contenido anterior sin autor:** las 271 noticias importadas no tienen autor registrado. Un Corresponsal no las ve ni las edita, y nadie queda bloqueado por la regla «lo propio»; los avisos de aprobación/rechazo/publicación no se envían por falta de destinatario. Rellenar la autoría es un trabajo aparte que requiere decisión humana.
> - **Unidad o facultad del Corresponsal** (hoy se filtra solo por autoría; segunda fase).
> - **Borrar** contenido sigue como antes (Superadministrador, Administrador web y Publicador); es un punto por confirmar.
> - **Rechazado → En revisión** en un solo paso no existe: el autor lo devuelve a Borrador y luego lo envía.
> - El historial de aprobaciones no registra la publicación (el registro de auditoría sí).
> - Los conteos del tablero por estado pueden quedar desactualizados mientras no se publique, porque leen la versión principal y no la más reciente.

## El camino de una noticia

```
Borrador ──envía──► En revisión ──aprueba──► Aprobado ──publica──► Publicado
   ▲                     │                      │                     │
   │                  rechaza                 edita               despublica
   │                     ▼                      ▼                     ▼
   └────corrige───── Rechazado                Borrador              Borrador
```

| Estado | Qué significa | Quién lo pone |
|---|---|---|
| Borrador | La están escribiendo. Nadie fuera del equipo la ve. | Quien la redacta |
| En revisión | Lista para que la revise otra persona. | Quien la redacta, al enviarla |
| Rechazada | Hay que corregirla. Siempre lleva un comentario. | Revisor editorial |
| Aprobada | Revisada y lista para publicar. Aún no es pública. | Revisor editorial |
| Publicada | Visible para todo el mundo en el portal. | Publicador |

Cuatro reglas valen para todos:
1. **Nadie aprueba ni publica lo suyo.** Quien revisa tiene que ser otra persona distinta de quien redactó.
2. **Quien aprueba no publica, y quien publica no aprueba.** Son dos personas distintas.
3. **Si se edita algo ya aprobado o publicado, vuelve a Borrador** y hay que repetir el camino.
4. **Rechazar exige un comentario** que explique qué corregir.

## Resumen por rol

| Rol | Redacta | Revisa | Publica | Ve borradores | Administra |
|---|---|---|---|---|---|
| Corresponsal de unidad | Sí, lo suyo | No | No | Solo los suyos | No |
| Editor | Sí | No | No | Todos | No |
| Revisor editorial | No | Sí | No | Todos | No |
| Publicador | No | No | Sí, solo lo aprobado | Todos | No |
| Administrador web | Contenido institucional | No | No (noticias) | Todos | Contenido institucional |
| Superadministrador | Sí | No | Solo emergencia | Todos | Usuarios y roles |
| Auditor | No | No | No | No | No, solo consulta |
| Gestor multimedia | Solo imágenes y archivos | No | No | No | No |
| Consulta | No | No | No | No | No |
| Visitante (sin cuenta) | No | No | No | No | No |

## Cada rol, en detalle

### Corresponsal de unidad
Persona de una facultad o unidad que aporta noticias.
- **Puede:** crear noticias, editar **sus** borradores, subir imágenes para ellas, enviarlas a revisión, leer los comentarios de rechazo y corregir.
- **No puede:** ver ni editar borradores de otras personas, aprobar, publicar ni borrar.
- **Si necesita algo más:** pide a un Editor que la tome, o a un Revisor que la revise.

### Editor
Redacta y cuida el contenido de todo el portal.
- **Puede:** crear y editar cualquier borrador, enviarlo a revisión, subir imágenes y corregir lo rechazado.
- **No puede:** aprobar ni publicar, ni siquiera lo que escribió él mismo.
- **Si necesita algo más:** pide revisión a un Revisor y publicación a un Publicador.

### Revisor editorial
Controla la calidad antes de que algo salga.
- **Puede:** leer todos los borradores, aprobar o rechazar lo que está en revisión, y dejar comentarios.
- **No puede:** editar el contenido, publicar ni aprobar lo que redactó él mismo. Si encuentra un error, rechaza con un comentario y lo corrige el autor.
- **Si necesita algo más:** si es el único revisor y le toca revisar lo suyo, debe pedir a otra persona con ese rol.

### Publicador
Decide cuándo algo se hace público.
- **Puede:** publicar noticias y páginas que ya están **aprobadas**, despublicarlas de inmediato y borrar contenido.
- **No puede:** editar el texto, aprobar ni publicar algo que esté en borrador, en revisión o rechazado.
- **Si necesita algo más:** si hay un error en algo publicado, lo despublica y avisa al autor.

### Administrador web
Mantiene la parte institucional del sitio.
- **Puede:** gestionar facultades, carreras, autoridades, convenios, navegación y otros contenidos institucionales.
- **No puede:** aprobar ni publicar noticias, ni gestionar usuarios.

### Superadministrador
Cuenta técnica de máxima confianza; conviene que haya muy pocas.
- **Puede:** crear, cambiar y bloquear usuarios y roles; gestionar la configuración; y **publicar en una emergencia**.
- **No puede:** aprobar en el flujo normal ni borrar el último superadministrador.
- **Emergencia:** se exige escribir el motivo y queda registrado en la auditoría con nombre y hora. No sirve para saltarse la revisión por comodidad.

### Auditor
Vigila que todo se haga bien.
- **Puede:** leer el registro de auditoría (quién hizo qué y cuándo), las métricas y los paneles de seguimiento.
- **No puede:** modificar nada, ni leer borradores, ni borrar el registro. Nadie puede editar ni borrar la auditoría.

### Gestor multimedia
Cuida la mediateca.
- **Puede:** subir, ordenar y mantener imágenes y archivos.
- **No puede:** crear noticias, revisar, publicar ni ver borradores.

### Consulta
Cuenta de solo lectura para quien necesita entrar al panel sin cambiar nada.
- **Puede:** ver lo publicado.
- **No puede:** ver borradores ni modificar nada.

### Visitante (sin cuenta)
Cualquier persona que entra al portal.
- **Puede:** leer lo publicado.
- **No puede:** nada más. Los borradores y las versiones anteriores no son accesibles.

## Qué hago si el sistema no me deja

| Situación | Qué hacer |
|---|---|
| «No tienes permiso» al publicar | Comprueba si la noticia está **Aprobada**. Si no, pídele la revisión a un Revisor. |
| Mi noticia volvió a Borrador | Se editó después de aprobarse. Reenvíala a revisión. |
| La rechazaron | Lee el comentario, corrige y vuelve a enviarla. |
| Quiero revisar algo que escribí | No se puede. Pide a otra persona con rol de Revisor. |
| Hay un error grave en algo publicado | El Publicador lo despublica. Si no hay Publicador disponible, el Superadministrador puede hacerlo como emergencia, con motivo. |
| Olvidé mi contraseña | Usa «Olvidé mi contraseña». Tras varios intentos fallidos la cuenta se bloquea un tiempo; el Superadministrador puede desbloquearla. |

## Puntos por confirmar al implementar

- Si el Administrador web puede borrar noticias (hoy sí; la matriz implica que no).
- Que las páginas institucionales sigan el mismo camino que las noticias.
- Que Editor y Corresponsal puedan subir imágenes (hoy pueden).
- Cómo se agrupan los Corresponsales por unidad (segunda fase; hoy se filtra por autoría).
