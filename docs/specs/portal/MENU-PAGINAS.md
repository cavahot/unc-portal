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
- Publicar una página y verla en el portal no se pudo probar en el recorrido (requiere revisor y publicador).
