# Auditoría del volcado de WordPress (2026-11-09)

**Estado:** informe de solo lectura; no autoriza ejecutar nada. Complementa `BITACORA-MIGRACION-NOTICIAS.md` y `MIG-IMG-imagenes-de-noticias.md`. No contiene credenciales ni datos personales: de los usuarios de WordPress solo se cuentan cantidades.

**Fuente:** `m1gr4unc_dbWP.xml` (26 MB) y `m1gr4unc_dbWP.sql` (14 MB), generados por phpMyAdmin 5.2.3 el 2026-11-09 (servidor MySQL 8.0.46, prefijo `uncm1_`). Los archivos están fuera del repositorio (carpeta de descargas) y **no se versionan**. **Comparado con:** la base local del CMS (272 noticias).
**Método:** script de lectura sobre el XML + consultas de solo lectura a la base local + `node scripts/migrate-wordpress.mjs --dry-run --only=posts` (sin escribir). El `.sql` contiene las mismas tablas (39) y 102 sentencias `INSERT` de entradas, **por confirmar** que coincide fila a fila con el XML (no se comparó).

## 1. Resumen

| Elemento | WordPress | CMS local | Diferencia |
| --- | --- | --- | --- |
| Noticias publicadas | 281 | 272 | **9 faltan** (por título+fecha; por slug parecían 48 porque 16 slugs están codificados, ver §3) |
| Páginas | 48 publicadas + 6 borradores | 0 (colección `paginas`) | la mayoría ya tiene página propia en el portal (§6) |
| Adjuntos (imágenes/PDF) | 305 (solo 2024-2026) | 91 en `media` | las imágenes de 2016-2023 **no están en el volcado** |
| Categorías | 13 (5 son de demostración del tema) | 6 valores fijos | no se corresponden 1 a 1 (§5) |
| Menú principal | 38 elementos | 7 grupos / 37 enlaces | equivalente salvo detalles (§6) |
| Usuarios | 6 (5 administradores, 1 editor) | — | solo cantidades |
| Comentarios | 0 | — | nada que migrar |

**Las 9 noticias que faltan en el CMS** (todas publicadas en WordPress): «COMUNICADO - RECTORADO» (2020-08-29, no tiene extracto), «Cumplimiento Ley Nro. 5189/2014 – Informe mes julio de 2026» (2026-08-21), «UNC fortalece acciones de prevención ante el fenómeno de El Niño en Concepción» y «La UNC participó del VI Congreso Nacional de Extensión Universitaria – VI CONEU 2026» (2026-09-03), «Fortalecimiento de las competencias docentes universitarias mediante el enfoque de educación inclusiva» (2026-09-04), «Academia, justicia y conocimiento en un encuentro trascendente.» (2026-09-09), y tres del 2026-10-13 (delegación de HAMK, IV Congreso Nacional sobre Cambio Global y Décima Edición del Concurso de Oratoria 2026). Las dos últimas tienen además un duplicado en borrador/papelera en WordPress.

## 2. Imágenes (el mayor hueco)

- De las 281 noticias, **20 no tienen miniatura** y **199 tienen una miniatura que apunta a un adjunto que no está en el volcado** (las imágenes anteriores a 2024 nunca se descargaron). Solo 5 adjuntos no traen archivo.
- El importador, en simulación, clasifica la imagen destacada así: **57 por miniatura, 75 tomada del cuerpo, 148 «ninguna»**. De las que tienen imagen, **82 no están en la carpeta local de descargas y 50 sí**. 22 noticias tienen imágenes embebidas «no recuperables».
- En el CMS hoy: **148 de 272 noticias sin imagen alguna**, **124 con URL externa a `www.unc.edu.py`** (dependencia de WordPress, decisión D4) y **49 con archivo en Medios**.
- Otros: 121 noticias llevan imágenes dentro del cuerpo, **14 de ellas desde otro dominio** (riesgo de privacidad y de enlaces rotos); **37 enlazan PDF** de `wp-content/uploads` (se romperían al apagar WordPress; el CMS acepta PDF en Medios); 2 llevan video o iframe.
- **Conclusión:** sin copiar la carpeta `wp-content/uploads` del hosting no se puede completar. Una consulta HTTP automática al sitio fue bloqueada por el firewall (OPNsense, 2026-11-09). La vía es copiar los archivos desde el servidor (SFTP, `rsync` o el administrador de archivos del hosting).

## 3. Títulos y slugs

- **106 títulos están todo en mayúsculas** (heredados de WordPress; el portal los muestra gritados).
- **16 títulos usan «letras matemáticas» de Unicode** (por ejemplo 𝗨𝗡𝗖 𝗼𝗿𝗴𝗮𝗻𝗶𝘇𝗮…): los lectores de pantalla las leen mal y el buscador no encuentra esas palabras. **Los 16 ya están así en el CMS** (la importación anterior los copió). Normalizarlos con NFKC los vuelve texto común.
- **16 slugs están codificados en porcentaje** (`%f0%9d%97…`), por el mismo motivo: son ilegibles y no sirven para compartir. Conviene regenerarlos desde el título normalizado.
- 8 títulos superan 150 caracteres (límite del CMS: 150) y 5 tienen espacios dobles.
- 15 títulos aparecen repetidos en WordPress (copias en borrador/papelera o republicaciones).
- **2021 no tiene ninguna noticia** (ni en WordPress ni en el CMS): es un vacío del origen, no de la migración.

## 4. Descripciones (resumen)

- **278 de 281 noticias no tienen extracto.** El campo `summary` del CMS es obligatorio (20 a 300 caracteres), así que hay que derivarlo del cuerpo. Hoy el importador omite una noticia sin extracto y sin cuerpo suficiente («COMUNICADO - RECTORADO»), que es la única que reporta como advertencia.
- 1 noticia tiene cuerpo menor a 20 caracteres, y 6 contienen shortcodes de WordPress.

## 5. Categorías

El CMS solo admite seis valores: institucional, académica, investigación, extensión, eventos y comunicados. Las 13 categorías de WordPress incluyen cinco de demostración del tema (Web Design, Social Marketing, Coding, Uncategorized, Sin categoría). **245 de las 281 noticias solo tienen una categoría genérica** («Sin categoría» o «Noticias»). Por eso el importador adivina la categoría por palabras clave, con este resultado en simulación: comunicados 89, institucional 54, académica 46, investigación 41, eventos 31, extensión 19. **Es una heurística, no un dato**; hay que decidir si se acepta o se revisa a mano.

Propuesta de correspondencia para las categorías reales (decisión del Product Owner): Resoluciones → comunicados; Acreditaciones → académica; Firma Convenio → institucional; Conferencias y Seminarios → eventos; Concursos → comunicados; Transparencia → comunicados; Eventos → eventos.

## 6. Páginas y menú

- De las 54 páginas, **5 están vacías** (Aseguramiento de la Calidad, Bienestar Institucional, Dirección General Académica, Extensión y Vinculación, Investigación) y el portal ya tiene su propia versión.
- **Ya cubiertas por el portal/CMS:** Autoridades, Aranceles Rectorado, Contacto y Contactos por dependencia, Convenios (nacionales e internacionales), las seis facultades, Historia, Institucional, Legalizaciones, Leyes 5189 y 5282, Marco Legal, Misión/Visión/Valores, Noticias, Organigrama, Política de privacidad, Preguntas Frecuentes, Solicitar información, Títulos, Trámites, Transparencia y Tribunal Electoral.
- **Basura de la plantilla, no migrar:** Home v5, Home v6, Página de Ejemplo 2, `copia_Historia`, `copia_2Historia`, Historia_v1, Historia (varias versiones), `Modelo _principal`, `Noticias_old`, `prueba`, `Version_2`, Slider, Tablas. Hay además páginas duplicadas (Ley 5189 y Ley 5282, dos veces cada una).
- **Sin equivalente claro y a decidir:** Galería de Fotos, Rendición de Cuentas al Ciudadano, Licitaciones (casi vacía), Quienes Somos (14 000 caracteres) y Solicitud de gestión de títulos.
- **Menú:** coincide con el del portal. Difieren Aula Virtual (aquí es un enlace fijo externo) y Convenios, que en WordPress tiene dos hijos (nacionales e internacionales) y en el portal es un solo enlace.
- Plugins del sitio viejo con función propia: formulario de contacto (4 formularios idénticos; el portal tiene el suyo), carrusel de imágenes (galería de fotos), accesibilidad MITIC y ventana modal.

## 7. Decisiones para el Product Owner

1. **Títulos en mayúsculas:** ¿convertirlos a formato de oración (con riesgo en siglas) o conservarlos? Recomendación: normalizar las letras matemáticas (NFKC) siempre, y las mayúsculas solo si se revisa una lista.
2. **Categorías:** ¿aceptar la correspondencia de §5 y la heurística por palabras clave?
3. **Resúmenes:** ¿derivarlos del primer párrafo (recortado a 300) o redactarlos?
4. **Duplicados de título** (15): ¿cuál se conserva?
5. **Páginas sin equivalente** (§6): ¿se migran, se recrean en el CMS o se descartan?
6. **Los 16 títulos y slugs ya cargados:** ¿se corrigen en el CMS existente? Es un cambio sobre contenido publicado, y debe pasar por el flujo editorial.

## 8. Ruta de trabajo (resumen; el detalle está en `odd/tasks/migracion-wordpress-nov-2026.md`)

SDD → RDD → TDD, local primero, siempre por el flujo editorial (autor, revisor y publicador distintos), con copia de la base antes de escribir: (1) normalizador de títulos, resúmenes y slugs con pruebas; (2) imágenes y PDF desde `wp-content/uploads` hacia Medios con el cargador existente; (3) las 9 noticias faltantes como borrador y avance por el flujo; (4) corrección de los 16 títulos; (5) verificación en el portal local; (6) recién después, staging y producción con autorización explícita.

## 9. Límites de este informe

No se ejecutó nada contra el CMS ni contra la base de WordPress. Las cifras provienen del XML y de la base local de desarrollo. La heurística de categorías y la derivación de resúmenes se evaluaron en simulación, no sobre el contenido real publicado. No se revisó la calidad editorial del texto de las noticias ni el contenido de las 54 páginas más allá de su tamaño y título.
