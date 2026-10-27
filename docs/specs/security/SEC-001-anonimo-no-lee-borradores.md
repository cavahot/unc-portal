# SEC-001 — Lectura pública solo de contenido publicado

**Estado:** Draft, requiere revisión del Product Owner y prueba contra versión aislada del CMS. **Depende de:** SEC-00 y SEC-02 del backlog. **No implementado por este documento.**

## Problema

`Noticias` y `Paginas` tienen `read: () => true` junto con `versions.drafts: true`. La UI no es un control de acceso para las APIs REST/GraphQL ni para versiones.

## Roles y alcance

- **Anónimo:** solo debe recibir documentos cuya publicación sea verificable.
- **Autenticado:** borradores solo si la matriz SEC-03 lo autoriza; un rol sin lectura editorial no gana acceso por estar logueado.
- **Fuera de alcance:** cambios de workflow, migración de documentos, medios y archivos; se especifican por separado.

## Decisiones pendientes

1. ¿Se requiere simultáneamente `_status: published` y `approvalStatus: publicado`, o solo uno de ellos como fuente oficial?
2. ¿Cómo tratar documentos heredados sin `_status` sin exponer borradores antiguos?
3. ¿Quién puede usar preview y leer versiones históricas? Definir roles exactos antes del cambio.

## Criterios Given/When/Then (pruebas negativas primero)

1. **Anónimo / draft:** dado un documento en borrador, cuando se solicita por REST o GraphQL (también con parámetro `draft` o ruta de versiones), entonces no se entrega su contenido ni un fragmento sensible.
2. **Anónimo / publicado:** dado un documento efectivamente publicado, cuando se consulta por los canales públicos, entonces sigue disponible sin sesión.
3. **Usuario sin permiso editorial:** dado un usuario autenticado solo para consulta, cuando consulta un borrador por API directa, entonces recibe denegación sin fuga de título, historial o medios privados.
4. **Revisor autorizado:** dado un rol aprobado para revisión y una sesión válida, cuando consulta el borrador en su ámbito permitido, entonces puede leerlo y no publicarlo.
5. **Cambio de estado:** dado un documento que pasa a borrador/despublicado, cuando la caché se revalida, entonces la API y portal público dejan de servirlo.

## Evidencia y verificación

- Código: `apps/cms/src/collections/Noticias.ts`, `Paginas.ts`.
- RDD: `docs/research/evidence-register.md` RDD-SEC-001; Payload Docs, Drafts.
- Entorno: base sintética en staging, sin tesis ni datos personales.
- Cierre: tests de REST, GraphQL y preview con anónimo y cada rol; logs de ejecución y revisión humana; rollback probado.
