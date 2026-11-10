# Páginas del CMS en el megamenú (MENU-CMS-01)

Cómo crear una página nueva y ponerla en el menú del portal, y qué reglas protegen el menú. Evidencia: recorrido real en el CMS local el 2026-11-09 (ver «Hallazgos»).

## 1. Cómo se hace (para quien edita)

1. **Crear la página** (Colecciones → Páginas): título, `slug` (la ruta completa sin barras, p. ej. `institucional/historia`) y bloques. Sigue el flujo editorial: autor → revisión → aprobación → publicación (la aprueba y publica un revisor; un superadmin solo no puede).
2. **Publicarla.** Mientras esté en borrador, `/<slug>` no se muestra al público.
3. **Enlazarla en el menú** (Globales → Navegación): agregue un enlace de tipo **«Relación (Página)»** y elija la página. El destino es `/<slug>`.
4. El menú se actualiza solo: publicar, despublicar, borrar o cambiar el `slug` de una página invalida la caché `navegacion`.

Una ruta que ya existe en el código (por ejemplo `/historia`) gana sobre una página del CMS con el mismo `slug`: use un `slug` distinto.

## 2. Reglas (qué evita cada una)

| Regla | Amenaza que evita | Límite |
| --- | --- | --- |
| Navegación **rechaza** (400, con mensaje) un enlace «Relación» sin página, a una página inexistente o sin publicar. | Menú público con enlaces muertos por una edición sin revisar. | No revisa los enlaces «Manual» (los sanea el portal con `safeHref`). No impide despublicar después una página ya enlazada. |
| El portal **omite** los enlaces «Relación» cuya página no se puede leer (despublicada o borrada). Un grupo se conserva solo si le quedan hijos válidos. | Mostrar «#» en el menú. | El menú se actualiza al refrescar la caché (hasta 60 s en el peor caso si el aviso al portal falla). |
| **Sembrar** el menú actual (`node scripts/seed-navegacion.mjs --apply`). Solo escribe si Navegación está **vacía**. | Perder todo el menú: con Navegación vacía el portal usa su respaldo, pero con **un solo** enlace guardado lo reemplaza por completo. | No fusiona ni actualiza un menú existente. |

La siembra (`scripts/lib/navegacionSeedData.mjs`) debe coincidir con el respaldo del portal (`FALLBACK_NAVIGATION`); una prueba lo exige.

## 3. Hallazgos del recorrido (2026-11-09, base local)

- Con **un** enlace en Navegación, el menú público quedó solo con ese enlace más Aula Virtual e Intranet (fijos en el código).
- Un enlace a una página en borrador se guardaba sin aviso y se dibujaba como `href="#"`.
- Publicar o cambiar el slug de una página no invalidaba `navegacion` (el menú quedaba con el destino anterior).
- Un superadmin no puede aprobar contenido («Su rol no puede llevar el contenido de «en_revision» a «aprobado»»): hace falta una cuenta de revisor.

## 4. Pendiente (fuera de este cambio)

- Las **etiquetas por idioma** del menú siguen saliendo de una tabla fija por destino (`MENU_LABEL_KEYS`); un enlace nuevo conserva su texto en español hasta agregarle su clave. Alternativa: campo localizado en Navegación.
- La respuesta de la API al crear una página incluye el usuario creador completo (correo, teléfono, identificadores de sesión) cuando lo ve un superadmin. Falta comprobar si los roles editor y revisor también lo reciben (SEC-027).
- ~~Publicar una página y verla en el portal no se pudo probar en el recorrido (requiere revisor y publicador).~~ Cubierto por la prueba de punta a punta (§5).

## 5. Prueba de punta a punta (MENU-CMS-02)

Pedido: «si por favor revisa el recorrido» y, tras confirmar que el paso de publicar nunca se probó, «Sí, prepáralo».

`scripts/smoke-menu-pagina.mjs` recorre el camino completo con las tres identidades del flujo editorial y deja todo como estaba:

| Paso | Comprobación | Resultado esperado |
| --- | --- | --- |
| 1 | `identidades` | Autor superadmin, revisor `reviewer` y publicador `publisher`/`superadmin`, tres cuentas distintas. Si falla, no se crea nada. |
| 2 | (siembra) | Si Navegación está vacía, se carga el menú actual (`NAVEGACION_SEED`) y **queda cargado**. |
| 3 | `pagina_creada` | Página `prueba-menu-<marca de tiempo>` en Borrador. |
| 4 | `rechaza_borrador` | Enlazarla en Borrador devuelve **400** (regla del §2). |
| 5 | `flujo_editorial` | `en_revision` (autor) → `aprobado` (revisor) → `publicado` (publicador). |
| 6 | `enlace_agregado` | Navegación acepta el enlace «Relación (Página)» al final del menú. |
| 7 | `portal_muestra_enlace` | La portada del portal contiene `href="/<slug>"` (espera hasta ~90 s la revalidación). |
| 8 | `portal_muestra_pagina` | `/<slug>` responde 200. |
| 9 | `menu_restaurado`, `pagina_borrada` | **Siempre** (también si un paso falla), salvo `--keep`: el menú vuelve a la copia tomada en el paso 2 y la página se borra. |

Uso en local (las contraseñas se escriben en el aviso de la terminal, nunca en un archivo):

```
node scripts/smoke-menu-pagina.mjs            # sin red: describe el recorrido
node scripts/smoke-menu-pagina.mjs --apply    # con CMS_EMAIL/CMS_PASSWORD, CMS_REVIEWER_*, CMS_PUBLISHER_*
```

En staging: `CMS_URL` y `PORTAL_URL` https y `--allow-remote`. Código de salida 0 solo si todas las comprobaciones pasan.

El enlace de prueba va en el **primer nivel** del menú: los submenús se dibujan en el navegador al abrir el grupo y no vienen en el HTML del servidor, así que una búsqueda en el HTML no los vería.

Segunda corrida (2026-11-09, 22:29 UTC, tras subir el límite): siembra, página creada, rechazo en borrador (400), flujo editorial completo, enlace visible en la portada y limpieza (página borrada y menú con sus 7 enlaces y 30 subenlaces). Comprobado además en el navegador: el megamenú abierto muestra los 15 subenlaces de «Institucional».

Primera corrida real (2026-11-09, CMS local): falló en la siembra con HTTP 400. Navegación admitía 12 subenlaces por grupo y «Institucional» tiene 15, así que el menú actual nunca se podía guardar en el CMS (tampoco con `seed-navegacion`). Se subió el límite a 20 y una prueba compara la siembra con los límites leídos del global; el guion ahora muestra el mensaje del CMS.

Límite: si otra persona edita el menú mientras corre, la restauración pisa ese cambio. Pruebas: `tests/unit/smoke-menu-pagina.spec.ts` (CMS y portal simulados).

## 6. Vista de la estructura en el panel (MENU-CMS-03)

Pedido (textual): «Dentro del CMS debe estar el apartado de menu del portal donde se pueda visualizar la estructura del portal y debe tener la posibilidad de insertar en los niveles ejemplo dentro de Academia en un sub nivel Tesis Académicas ahora no se visualiza esa parte dentro del cms» y luego «Sí, impleméntala».

Evidencia: el apartado existe (Globales → Navegación, dos niveles) pero (a) estaba vacío hasta que se cargó el menú actual; (b) cada fila se ve como «Link 01», «Link 02», sin su nombre, y para ubicar «Academia» hay que abrir fila por fila; (c) los campos se llaman `Label`, `Type`, `Url`, `Page`, `New Tab`.

| ID | Comportamiento esperado |
| --- | --- |
| S1 | Arriba del formulario, una **vista del menú**: el árbol completo en el orden del portal, con cada enlace principal y sus subenlaces sangrados, y el destino de cada uno (`/ruta`, «Página vinculada», «Grupo sin página propia» para `#`, «sin destino» si falta). Se actualiza mientras se edita, sin guardar. Si el menú está vacío dice que el portal usa su menú de respaldo y cómo cargarlo. |
| S2 | Cada fila muestra su texto; un enlace principal con subenlaces agrega «· N subenlaces» (o «· 1 subenlace»). Una fila sin texto dice «Enlace sin nombre». |
| S3 | Etiquetas en español: «Enlaces del menú» / «Enlace», «Subenlaces» / «Subenlace», «Texto», «Tipo de destino», «Dirección (URL)», «Página», «Abrir en una pestaña nueva». |
| S4 | No cambia la estructura guardada (sin migración) ni las reglas de §2. |

Límite: la vista no consulta el título de las páginas vinculadas (muestra «Página vinculada»); la traducción de enlaces nuevos sigue pendiente (§4).
