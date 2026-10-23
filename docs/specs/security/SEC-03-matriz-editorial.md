# SEC-03 — Matriz editorial (aprobada)

**Estado:** APROBADA el 2026-10-22 por César, como dueño del proyecto en esta sesión. Queda desbloqueado DEP-03 (flujo editorial en el servidor). Si la institución designa a otra persona como Product Owner, debe ratificarla; hasta entonces es la política vigente. Guía para usuarios: `docs/manual/ROLES-Y-PERMISOS.md`.

## Decisiones tomadas (respuestas a las 7 preguntas)

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Publica el editor? | **No.** Solo el Publicador. |
| 2 | ¿Autorrevisión? | **No**, sin excepciones. Una unidad sin segundo usuario pide a otro Revisor. |
| 3 | ¿El Publicador aprueba? | **No.** Aprueba el Revisor y publica el Publicador, personas distintas. |
| 4 | ¿Emergencia? | Solo Superadministrador, con motivo obligatorio, registrada en auditoría. |
| 5 | ¿Corresponsal solo ve lo suyo? | **Sí**, por autoría. Filtro por unidad: segunda fase. |
| 6 | ¿Quién despublica? | Publicador y Superadministrador, de inmediato. |
| 7 | ¿El Auditor lee borradores? | **No.** Solo auditoría y métricas. |

**Consecuencia:** `web-admin` y `editor` dejan de poder publicar noticias. Los identificadores internos de rol no cambian (`correspondent`, `editor`, `reviewer`, `publisher`, `web-admin`, `superadmin`, `auditor`, `media-manager`, `viewer`); los usuarios ven los nombres en español.

## Flujo (texto)

```
Autor (correspondent/editor)         Revisor (reviewer)              Publicador (publisher)
  draft ──envía──► en_revision ──aprueba──► aprobado ──publica──► publicado
    ▲                   │                      │                        │
    │                rechaza                 edita                  despublica
    │                   ▼                      ▼                        ▼
    └────corrige──── rechazado               draft                    draft
Regla: nadie aprueba ni publica lo propio; el servidor rechaza cualquier otro salto (403/422).
```

## Capas de protección de una petición

`Nginx (TLS, límites, headers)` → `Límites del portal (IP real, tasa, tamaño)` → `Guardia de rol (sesión y rol primero)` → `Reglas de acceso (público solo publicado)` → `Validador de transición (estado y actor)` → `Base de datos (mínimo privilegio, backups)`. Cada capa rechaza por sí sola; ninguna confía en la anterior.
**Relacionado:** `docs/FLUJO_EDITORIAL.md` (contradictorio: asigna publicar a `editor` y a `publisher`), `TASK-SEC-001` SEC-03/SEC-04, `TASK-DEPLOY-001` DEP-03.
**Principio:** separación de funciones. Quien redacta no aprueba; quien aprueba no publica; nadie aprueba ni publica lo propio.

## Estados y quién los fija

| Estado (`approvalStatus`) | Lo fija | Transiciones permitidas desde él |
|---|---|---|
| `draft` (Borrador) | Autor (`correspondent`, `editor`) | → `en_revision` (autor) |
| `en_revision` | Autor al enviar | → `aprobado` o `rechazado` (`reviewer`, nunca el autor) |
| `rechazado` | `reviewer`, con comentario obligatorio | → `draft` (autor, para corregir) |
| `aprobado` | `reviewer` | → `publicado` (`publisher`) o → `draft` si se edita |
| `publicado` (`_status: published`) | `publisher` | → `draft` (despublicar, `publisher`) |

Regla dura: cualquier cambio de contenido de un documento `aprobado` o `publicado` lo devuelve a `draft`. `approvalHistory` lo escribe solo el servidor, a partir de la sesión.

## Matriz rol × acción (propuesta)

Los usuarios ven los nombres en español. El identificador interno (entre paréntesis) no cambia: está guardado en la base de datos, en el token de sesión y en el código, y no lo ve el usuario.

| Rol (identificador interno) | Crear / editar borrador | Enviar a revisión | Aprobar / rechazar | Publicar / despublicar | Leer borradores | Otros |
|---|---|---|---|---|---|---|
| Corresponsal de unidad (`correspondent`) | Sí (los propios) | Sí | No | No | Los propios | — |
| Editor (`editor`) | Sí | Sí | No | No | Sí | — |
| Revisor editorial (`reviewer`) | No | No | Sí, nunca lo propio | No | Sí | — |
| Publicador (`publisher`) | No | No | No | Sí, solo lo aprobado | Sí | — |
| Administrador web (`web-admin`) | Contenido institucional | — | No | No en noticias (ver pregunta 4) | Sí | Colecciones institucionales |
| Superadministrador (`superadmin`) | Sí | Sí | No (ver pregunta 4) | Excepción auditada | Sí | Usuarios y roles |
| Auditor (`auditor`) | No | No | No | No | No | Lee auditoría y métricas |
| Gestor multimedia (`media-manager`) | Solo medios | — | No | No | No | Medios |
| Consulta (`viewer`) | No | No | No | No | No | Solo publicado |
| Visitante (anónimo) | No | No | No | No | No | Solo publicado |

## Puntos aún por confirmar al implementar (no bloquean DEP-03a)

1. Si `web-admin` puede borrar noticias (hoy sí; la matriz implica que no).
2. Que las páginas institucionales (`paginas`) sigan el mismo camino que las noticias.
3. Que `editor` y `correspondent` puedan subir imágenes (hoy pueden).
4. Modelo de «unidad» de un usuario para filtrar corresponsales (segunda fase).
5. `docs/FLUJO_EDITORIAL.md` está desactualizado y contradice esta matriz: reescribirlo a partir de este documento.

## Controles anti-ataque asociados (ya hechos o por hacer)

| Amenaza | Control | Estado |
|---|---|---|
| Anónimo lee borradores | Lectura pública solo `_status: published`, versiones solo editoriales | Hecho (DEP-02), falta probar con Payload real |
| Escalada de rol o saltarse el flujo por API | `beforeChange` que valida transición, actor y autoría; campos de estado con `access` por campo | Hecho en local (DEP-03, `docs/specs/security/DEP-03-flujo-editorial-servidor.md`); falta probar con Payload y Postgres reales |
| Historial falsificado | `approvalHistory` escrito solo por servidor | Hecho en local (DEP-03); falta probar con Payload real |
| Rutas de monitoreo abiertas | `requireRole` + `overrideAccess:false` | Hecho (DEP-04) |
| Fuerza bruta y abuso | Límites de tasa por IP real, tope de cuerpo | Hecho (DEP-06); falta login/forgot-password en nginx (DEP-12) |
| XSS por contenido del CMS | `safeJsonLd`, `safeHref`, sin HTML crudo | Hecho (DEP-05, DEP-15, DEP-19b) |
| Robo de sesión | Cookie `Secure`, `csrf` con orígenes del portal | Pendiente: hipótesis a confirmar en staging |
| Secretos débiles | `requireSecret`, token de preview firmado | Hecho (DEP-16) |
| Pérdida o manipulación de datos | Backups cifrados fuera del host, restore probado, auditoría inmutable | Auditoría hecha (DEP-04); backups pendientes (DEP-08) |

## Base de datos segura (checklist)

- Usuario de aplicación con mínimo privilegio (sin superusuario ni `CREATE ROLE`); el de migraciones separado del de ejecución.
- Postgres sin puerto publicado; solo red interna. SSL activable (`POSTGRES_SSL`).
- `auditoria` sin `update`/`delete` por API; índices para consultas por usuario y fecha (DEP-07).
- Backups con `umask 077`, cifrados y fuera del host (DEP-08); restore probado.
- Migraciones solo hacia adelante en producción; `down` solo sobre BD vacía.

## Pruebas negativas que saldrán de la matriz (DEP-03, TDD)

1. Dado un `correspondent`, cuando intenta fijar `aprobado` o `publicado` por REST/GraphQL, entonces recibe 403 y no cambia nada.
2. Dado un `reviewer`, cuando aprueba un documento que él mismo creó, entonces recibe 403.
3. Dado un `publisher`, cuando intenta publicar un documento en `en_revision`, entonces recibe 422.
4. Dado cualquier rol, cuando envía `approvalHistory` en el cuerpo, entonces el servidor lo ignora y registra el suyo.
5. Dado un documento `aprobado`, cuando alguien edita su contenido, entonces vuelve a `draft`.
6. Dado un `viewer` o anónimo, cuando pide un borrador, entonces no recibe título ni fragmento.

## Rollback

Este documento no cambia código. Para descartarlo basta con borrar el archivo.
