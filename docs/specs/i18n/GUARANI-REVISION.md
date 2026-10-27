# Revisión nativa pendiente — cadenas guaraníes de GLO-GN-01

**Estado:** borrador para revisión de un hablante nativo (PO / SPL / ALG). **Ninguna cadena de esta lista fue revisada por un hablante nativo.** No es traducción de calidad nativa: es una propuesta apoyada en el glosario del PO (`glosario-guarani` en el CMS) y en el uso previo del catálogo. Publicar `/gn` sin esta revisión es decisión del PO.
Generado el 25-10-2026. Hoja de cálculo equivalente (fuera del repositorio): `gn-revision.csv` en la carpeta de trabajo del agente.
Spec: `docs/specs/i18n/GLOSARIO-GUARANI.md`.

## Cómo leer la incertidumbre

| Nivel | Significado |
|---|---|
| bajo | Término del glosario con confianza A/B, nombre propio, préstamo ya usado, o corrección mecánica de ortografía |
| medio | Palabra de uso general bien conocida o patrón ya presente en el catálogo, sin entrada en el glosario |
| alto | Frase compuesta por el traductor sin respaldo en el glosario: revisar sintaxis, armonía nasal y elección léxica |

## Resumen

- Cadenas registradas: **355** (traducidas desde el español: 232; correcciones de traducciones previas: 73; ortografía «hag̃ua/ko'ág̃a»: 31; cambios de estructura de claves: 19).
- Incertidumbre: alto 143, medio 129, bajo 64.
- Hallazgo: la traducción guaraní **previa** del catálogo tiene errores de sentido frecuentes (p. ej. «Facultades» → «Mokõi Tetãgua Jeporu», «Estudiantes» → «Mbo'eháva», «Academia» → «Mbo'ehára» = docente, «mbo'ehao» = escuela usado por universidad, misiones truncadas). Solo se corrigió lo detectado en los archivos priorizados; **todo el catálogo `gn` necesita revisión nativa**, no solo esta lista.
- Estructura: `pages.ley-5189.json`, `pages.ley-5282.json`, `pages.tramites.json` y `pages.titulos.json` tenían claves distintas de `es` (faltaban 48, sobraban 12): se rehicieron con la estructura de `es`.

| Archivo | Traducidas | Corregidas | Ortografía | Estructura | alto | medio | bajo |
|---|---|---|---|---|---|---|---|
| common.json | 19 | 8 | 0 | 0 | 15 | 8 | 4 |
| nav.json | 35 | 6 | 0 | 0 | 17 | 18 | 6 |
| pages.accesibilidad.json | 0 | 0 | 6 | 0 | 0 | 0 | 6 |
| pages.autoridades.json | 3 | 0 | 1 | 0 | 2 | 1 | 1 |
| pages.buscar.json | 14 | 0 | 0 | 0 | 2 | 7 | 5 |
| pages.contacto.json | 0 | 2 | 1 | 0 | 1 | 1 | 1 |
| pages.convenios.json | 38 | 0 | 0 | 0 | 17 | 20 | 1 |
| pages.extension.json | 0 | 1 | 1 | 0 | 1 | 0 | 1 |
| pages.facultades.agrarias.json | 0 | 1 | 0 | 0 | 1 | 0 | 0 |
| pages.facultades.ciencias-economicas.json | 0 | 1 | 0 | 0 | 1 | 0 | 0 |
| pages.facultades.ciencias-exactas.json | 0 | 1 | 0 | 0 | 1 | 0 | 0 |
| pages.facultades.humanidades.json | 0 | 1 | 0 | 0 | 1 | 0 | 0 |
| pages.historia.json | 3 | 3 | 2 | 0 | 5 | 1 | 2 |
| pages.home.json | 17 | 42 | 0 | 0 | 23 | 28 | 8 |
| pages.institucional.json | 0 | 1 | 1 | 0 | 1 | 0 | 1 |
| pages.investigacion.json | 0 | 3 | 2 | 0 | 3 | 0 | 2 |
| pages.legalizaciones.json | 0 | 0 | 3 | 0 | 0 | 0 | 3 |
| pages.ley-5189.json | 12 | 0 | 0 | 6 | 4 | 6 | 2 |
| pages.ley-5282.json | 13 | 0 | 0 | 5 | 5 | 6 | 2 |
| pages.marco-legal.json | 31 | 0 | 1 | 0 | 21 | 10 | 1 |
| pages.mision-vision.json | 0 | 2 | 3 | 0 | 2 | 0 | 3 |
| pages.noticias.json | 14 | 0 | 0 | 0 | 2 | 8 | 4 |
| pages.privacidad.json | 0 | 0 | 6 | 0 | 0 | 0 | 6 |
| pages.solicitar-titulo.json | 16 | 0 | 0 | 0 | 11 | 5 | 0 |
| pages.titulos.json | 0 | 0 | 4 | 2 | 0 | 0 | 4 |
| pages.tramites.json | 16 | 0 | 0 | 6 | 5 | 10 | 1 |
| pages.tribunal-electoral.json | 1 | 1 | 0 | 0 | 2 | 0 | 0 |

## Cadenas que siguen iguales al español

Muchas son a propósito: nombres propios (Universidad Nacional de Concepción, facultades, direcciones), siglas (UNC, ANEAES, ARCU-SUR), nombres de documentos legales y términos con confianza X o sin entrada en el glosario (la regla es no inventar calcos). Otras quedan **pendientes** por tiempo (sobre todo `pages.aranceles-rectorado.json`, `pages.organigrama.json`, `pages.facultades.odontologia.json`, `pages.biblioteca.json`, `pages.informacion-publica.json`, `pages.transparencia.json`, `pages.revistas.json`).

| Archivo | Iguales al español / total |
|---|---|
| common.json | 18 / 44 |
| nav.json | 30 / 74 |
| pages.aranceles-rectorado.json | 29 / 41 |
| pages.autoridades.json | 9 / 33 |
| pages.biblioteca.json | 15 / 15 |
| pages.buscar.json | 2 / 16 |
| pages.contacto.json | 2 / 33 |
| pages.convenios.json | 2 / 59 |
| pages.facultades.agrarias.json | 7 / 31 |
| pages.facultades.ciencias-economicas.json | 6 / 30 |
| pages.facultades.ciencias-exactas.json | 7 / 31 |
| pages.facultades.humanidades.json | 7 / 31 |
| pages.facultades.json | 1 / 14 |
| pages.facultades.medicina.json | 6 / 30 |
| pages.facultades.odontologia.json | 25 / 31 |
| pages.historia.json | 3 / 26 |
| pages.home.json | 15 / 77 |
| pages.informacion-publica.json | 11 / 11 |
| pages.institucional.json | 3 / 44 |
| pages.legalizaciones.json | 6 / 44 |
| pages.ley-5189.json | 2 / 22 |
| pages.ley-5282.json | 1 / 22 |
| pages.mapa-sitio.json | 4 / 32 |
| pages.marco-legal.json | 22 / 65 |
| pages.noticias.json | 3 / 17 |
| pages.organigrama.json | 20 / 32 |
| pages.privacidad.json | 2 / 19 |
| pages.revistas.json | 6 / 6 |
| pages.solicitar-titulo.json | 2 / 18 |
| pages.titulos.json | 2 / 34 |
| pages.tramites.json | 3 / 26 |
| pages.transparencia.json | 10 / 10 |
| pages.tribunal-electoral.json | 9 / 22 |

## Decisiones de vocabulario aplicadas (revisar primero)

| Español | Guaraní usado | Respaldo |
|---|---|---|
| universidad | mbo'ehaovusu | glosario B (antes se usaba «mbo'ehao» = escuela, A) |
| universidad pública | tetã mbo'ehaovusu | patrón de «tetã remimoĩmby» (instituciones públicas, B); combinación sin respaldo |
| institución / institucional (menú) | temimoĩmby | glosario B |
| estudiante(s) | temimbo'e(kuéra) | glosario B/A |
| docente(s) | mbo'ehára(kuéra) | glosario B/A |
| investigación | jeporekapy | glosario B |
| desarrollo | jekakuaa | glosario A |
| carrera(s), facultad(es) | carrera-kuéra, facultad-kuéra | glosario B (préstamo con sufijo y guion, notas fila 14) |
| buscar | eheka | criterio Yvy Marãe'ỹ/CONACYT (notas §2) |
| autoridades | mburuvichakuéra | glosario B |
| se abre en una pestaña nueva | ojepe'a tendayke pyahúpe | sin respaldo en el glosario (alto) |
| menú | poravorã | sin respaldo en el glosario (alto) |
| documento | kuatia | uso previo del catálogo; sin entrada |
| hag̃ua, ko'ág̃a | con g̃ (g + U+0303) | alfabeto ALG (notas fila 9) |

## Detalle por cadena

| Archivo | Clave | Español | Antes | Guaraní propuesto | Términos del glosario | Incert. | Nota |
|---|---|---|---|---|---|---|---|
| pages.ley-5189.json | `breadcrumb.home` | Inicio | (clave faltante) | Ñepyrũ |  | bajo | clave antes faltante en gn |
| pages.ley-5189.json | `breadcrumb.institutional` | Institucional | (clave faltante) | Temimoĩmby |  | medio | clave antes faltante en gn |
| pages.ley-5189.json | `breadcrumb.page` | Ley 5189/2014 | (clave faltante) | Léi 5189/2014 |  | bajo | clave antes faltante en gn |
| pages.ley-5189.json | `hero.eyebrow` | Transparencia institucional | (clave faltante) | Transparencia institucional |  | n/a | Clave faltante en gn: se agregó con el texto español (pendiente de traducción) |
| pages.ley-5189.json | `hero.badgeLabel` | Ley vigente | (clave faltante) | Léi oñemboguatáva |  | alto | clave antes faltante en gn |
| pages.ley-5189.json | `docs.description` | Accedé a los documentos exigidos por la Ley 5189/2014. Cada archivo está disponible en Google Drive para su descarga inmediata. | (clave faltante) | Eike kuatia Léi 5189/2014 ojeruréva rehe. Archivo ñavõ oĩ Google Drive-pe emboguejy hag̃ua pya'e. |  | alto | clave antes faltante en gn |
| pages.ley-5189.json | `docs.totalLabel` | documentos | (clave faltante) | kuatia |  | medio | clave antes faltante en gn |
| pages.ley-5189.json | `docs.noDocs` | Sin documentos cargados. | (clave faltante) | Ndaipóri kuatia oñemoĩva. |  | medio | clave antes faltante en gn |
| pages.ley-5189.json | `docs.fallbackNote` | Mostrando datos del sistema. Reconectando con el servidor de contenidos... | (clave faltante) | Ojehechauka sistema marandu. Ojoajujey servidor de contenidos ndive... | datos=(sin forma)[B]; sistema=sistema[B] | alto | clave antes faltante en gn |
| pages.ley-5189.json | `info.eyebrow` | Marco normativo | (clave faltante) | Marco normativo |  | n/a | Clave faltante en gn: se agregó con el texto español (pendiente de traducción) |
| pages.ley-5189.json | `info.title` | Compromiso con la transparencia | (clave faltante) | Compromiso transparencia ndive |  | medio | clave antes faltante en gn |
| pages.ley-5189.json | `info.description` | La Universidad Nacional de Concepción publica esta información en cumplimiento estricto de la Ley 5189/2014 y las disposiciones de la Contraloría General de la República del Paraguay. | (clave faltante) | Universidad Nacional de Concepción omyasãi ko marandu Léi 5189/2014 ha Contraloría General de la República del Paraguay disposición-kuéra he'iháicha. | universidad=(sin forma)[B]; concepcion=Concepción[B]; general=(sin forma)[X]; paraguay=Paraguái[B] | alto | clave antes faltante en gn |
| pages.ley-5189.json | `info.ctaTransparencia` | Ver Transparencia | (clave faltante) | Ehecha Transparencia |  | medio | clave antes faltante en gn |
| pages.ley-5189.json | `info.ctaInstitutional` | Volver a Institucional | (clave faltante) | Ejevy Temimoĩmby-pe |  | medio | clave antes faltante en gn |
| pages.ley-5189.json | `hero.label` | (no existe en es) | Ñe'ẽ ñemombe'u | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.ley-5189.json | `intro` | (no existe en es) | Léi N° 5189/2014 ombokatupyry tetãygua marandu remuneración, designación ha mba'apohára rehegua oĩhápe tetãgua mba'apohárãguápe. | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.ley-5189.json | `contact.title` | (no existe en es) | Ñeporandu haguã | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.ley-5189.json | `contact.description` | (no existe en es) | Eñomongeta Secretaría General pegua marandu hetave haguã. | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.ley-5282.json | `breadcrumb.home` | Inicio | (clave faltante) | Ñepyrũ |  | bajo | clave antes faltante en gn |
| pages.ley-5282.json | `breadcrumb.institutional` | Institucional | (clave faltante) | Temimoĩmby |  | medio | clave antes faltante en gn |
| pages.ley-5282.json | `breadcrumb.page` | Ley 5282/2014 | (clave faltante) | Léi 5282/2014 |  | bajo | clave antes faltante en gn |
| pages.ley-5282.json | `hero.eyebrow` | Libre acceso a la información | (clave faltante) | Jeike sãso marandúpe |  | alto | clave antes faltante en gn |
| pages.ley-5282.json | `hero.badgeLabel` | Art. 8° — 17 ítems | (clave faltante) | Art. 8° — 17 ítem |  | medio | clave antes faltante en gn |
| pages.ley-5282.json | `docs.description` | Accedé a los documentos exigidos por el Art. 8° de la Ley 5282/2014. Cada archivo está disponible en Google Drive para su descarga inmediata. | (clave faltante) | Eike kuatia Léi 5282/2014 Art. 8° ojeruréva rehe. Archivo ñavõ oĩ Google Drive-pe emboguejy hag̃ua pya'e. |  | alto | clave antes faltante en gn |
| pages.ley-5282.json | `docs.totalLabel` | documentos | (clave faltante) | kuatia |  | medio | clave antes faltante en gn |
| pages.ley-5282.json | `docs.noDocs` | Sin documentos cargados. | (clave faltante) | Ndaipóri kuatia oñemoĩva. |  | medio | clave antes faltante en gn |
| pages.ley-5282.json | `docs.fallbackNote` | Mostrando datos del sistema. Reconectando con el servidor de contenidos... | (clave faltante) | Ojehechauka sistema marandu. Ojoajujey servidor de contenidos ndive... | datos=(sin forma)[B]; sistema=sistema[B] | alto | clave antes faltante en gn |
| pages.ley-5282.json | `info.eyebrow` | Marco normativo | (clave faltante) | Marco normativo |  | n/a | Clave faltante en gn: se agregó con el texto español (pendiente de traducción) |
| pages.ley-5282.json | `info.title` | Compromiso con el acceso a la información | (clave faltante) | Compromiso marandu jeike ndive |  | alto | clave antes faltante en gn |
| pages.ley-5282.json | `info.description` | La Universidad Nacional de Concepción publica esta información en cumplimiento de la Ley 5282/2014 y garantiza el derecho ciudadano de acceso a la información pública. | (clave faltante) | Universidad Nacional de Concepción omyasãi ko marandu Léi 5282/2014 he'iháicha ha omo'ã tetãygua derecho jeike hag̃ua tetãgua marandúpe. | universidad=(sin forma)[B]; concepcion=Concepción[B] | alto | clave antes faltante en gn |
| pages.ley-5282.json | `info.ctaTransparencia` | Ver Transparencia | (clave faltante) | Ehecha Transparencia |  | medio | clave antes faltante en gn |
| pages.ley-5282.json | `info.ctaInstitutional` | Volver a Institucional | (clave faltante) | Ejevy Temimoĩmby-pe |  | medio | clave antes faltante en gn |
| pages.ley-5282.json | `hero.label` | (no existe en es) | Ñe'ẽ ñemombe'u | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.ley-5282.json | `intro` | (no existe en es) | Léi N° 5282/2014 omboñepyrũ tetãygua marandu joaju derecho tetãgua mba'apohárãpe, ñe'ẽ ñemombe'u ha democracia ñemombarete haguã. | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.ley-5282.json | `contact.title` | (no existe en es) | Ñeporandu haguã | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.ley-5282.json | `contact.description` | (no existe en es) | Eñomongeta Secretaría General pegua marandu hetave haguã. | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.titulos.json | `infoCards.c2.value` | Ver lista completa | (clave faltante) | Ver lista completa |  | n/a | Clave faltante en gn: se agregó con el texto español (pendiente de traducción) |
| pages.titulos.json | `infoCards.c2.description` | (no existe en es) | Ehecha lista opa rehegua | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.tramites.json | `tramites.t1.nombre` | Solicitud de Título | (clave faltante) | Título jerure |  | medio | clave antes faltante en gn; solicitar = jerure (A) |
| pages.tramites.json | `tramites.t1.descripcion` | Iniciá el proceso oficial para obtener tu diploma de grado o posgrado. | (clave faltante) | Emoñepyrũ proceso oficial rehupyty hag̃ua nde diploma grado térã posgrado. |  | alto | clave antes faltante en gn |
| pages.tramites.json | `tramites.t1.duracion` | 15 días hábiles | (clave faltante) | 15 ára hábil |  | medio | clave antes faltante en gn |
| pages.tramites.json | `tramites.t2.nombre` | Legalización de Documentos | (clave faltante) | Kuatia legalización |  | medio | clave antes faltante en gn |
| pages.tramites.json | `tramites.t2.descripcion` | Legalización y apostilla de certificados y documentos académicos. | (clave faltante) | Certificado ha kuatia académico legalización ha apostilla. |  | medio | clave antes faltante en gn |
| pages.tramites.json | `tramites.t2.duracion` | 10 días hábiles | (clave faltante) | 10 ára hábil |  | medio | clave antes faltante en gn |
| pages.tramites.json | `tramites.t3.nombre` | Certificado de Estudios | (clave faltante) | Certificado de Estudios |  | n/a | Clave faltante en gn: se agregó con el texto español (pendiente de traducción) |
| pages.tramites.json | `tramites.t3.descripcion` | Constancia oficial de materias aprobadas y situación académica actual. | (clave faltante) | Constancia oficial materia ojehupytýva ha situación académica ko'ag̃agua rehegua. |  | alto | clave antes faltante en gn |
| pages.tramites.json | `tramites.t3.duracion` | 5 días hábiles | (clave faltante) | 5 ára hábil |  | medio | clave antes faltante en gn |
| pages.tramites.json | `tramites.t4.nombre` | Constancia de Alumno Regular | (clave faltante) | Constancia de Alumno Regular |  | n/a | Clave faltante en gn: se agregó con el texto español (pendiente de traducción) |
| pages.tramites.json | `tramites.t4.descripcion` | Documento que acredita tu condición de estudiante activo en la UNC. | (clave faltante) | Kuatia ohechaukáva ndeha'eha temimbo'e activo UNC-pe. | estudiante=temimbo'e[B] | alto | clave antes faltante en gn; estudiante = temimbo'e (B) |
| pages.tramites.json | `tramites.t4.duracion` | 3 días hábiles | (clave faltante) | 3 ára hábil |  | medio | clave antes faltante en gn |
| pages.tramites.json | `tramites.t5.nombre` | Certificado de Notas | (clave faltante) | Certificado de Notas |  | n/a | Clave faltante en gn: se agregó con el texto español (pendiente de traducción) |
| pages.tramites.json | `tramites.t5.descripcion` | Historial académico completo con calificaciones de todas las materias. | (clave faltante) | Historial académico completo opaite materia calificación ndive. |  | alto | clave antes faltante en gn |
| pages.tramites.json | `tramites.t5.duracion` | 5 días hábiles | (clave faltante) | 5 ára hábil |  | medio | clave antes faltante en gn |
| pages.tramites.json | `tramites.t6.nombre` | Solicitud de Becas | (clave faltante) | Beca jerure |  | medio | clave antes faltante en gn |
| pages.tramites.json | `tramites.t6.descripcion` | Acceso a programas de becas nacionales e internacionales disponibles para alumnos de la UNC. | (clave faltante) | Jeike programa de becas nacional ha internacional UNC temimbo'ekuérape g̃uarã. | alumno=temimbo'e[A] | alto | clave antes faltante en gn; alumno = temimbo'e (A) |
| pages.tramites.json | `tramites.t6.duracion` | Según convocatoria | (clave faltante) | Convocatoria he'iháicha |  | medio | clave antes faltante en gn |
| pages.tramites.json | `seeMore` | Ver más | (clave faltante) | Ehecha hetave |  | bajo | clave antes faltante en gn |
| pages.tramites.json | `breadcrumb.home` | (no existe en es) | Ñepyrũ | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.tramites.json | `breadcrumb.page` | (no existe en es) | Trámites | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| pages.tramites.json | `help.email` | (no existe en es) | secgral@unc.edu.py | (eliminada) |  | n/a | Clave sobrante en gn (no existe en es): eliminada |
| nav.json | `ariaLabel` | Navegación principal | Navegación principal | Poravorã guasu |  | alto | «poravorã» (menú) tomado del uso en localización; sin entrada en el glosario |
| nav.json | `skipLink` | Saltar al contenido principal | Saltar al contenido principal | Eho tetepy guasúpe |  | alto | «tetepy» por «contenido»: sin respaldo en el glosario |
| nav.json | `homeAriaLabel` | Ir al inicio de la Universidad Nacional de Concepción | Ir al inicio de la Universidad Nacional de Concepción | Eho Universidad Nacional de Concepción ñepyrũme | universidad=(sin forma)[B]; concepcion=Concepción[B] | medio | ñepyrũ (inicio) ya usado en el catálogo; sufijo nasal -me |
| nav.json | `logoAlt` | Logotipo oficial de la Universidad Nacional de Concepción | Logotipo oficial de la Universidad Nacional de Concepción | Universidad Nacional de Concepción logotipo oficial | universidad=(sin forma)[B]; concepcion=Concepción[B] | medio | poseedor antes de lo poseído (notas fila 6); «logotipo oficial» como préstamo |
| nav.json | `searchAriaLabel` | Buscar en el portal institucional | Buscar en el portal institucional | Eheka portal institucional-pe |  | medio | «eheka» (buscar) es criterio del libro Yvy Marãe'ỹ (notas §2); sufijo con guion tras préstamo (notas fila 14) |
| nav.json | `searchTitle` | Buscar | Buscar | Eheka |  | bajo | Yvy Marãe'ỹ/CONACYT 2017: «eheka» = buscar |
| nav.json | `aulaVirtualAriaLabel` | Acceder al Aula Virtual. Abre en una nueva pestaña | Acceder al Aula Virtual. Abre en una nueva pestaña | Eike Aula Virtual-pe. Ojepe'a tendayke pyahúpe | virtual=(sin forma)[B] | alto | Aula Virtual = nombre de la plataforma (no se traduce); «tendayke» (pestaña) sin entrada en el glosario |
| nav.json | `intranetAriaLabel` | Acceder a la Intranet. Abre en una nueva pestaña | Acceder a la Intranet. Abre en una nueva pestaña | Eike Intranet-pe. Ojepe'a tendayke pyahúpe |  | alto | ídem |
| nav.json | `openMenu` | Abrir menú de navegación | Abrir menú de navegación | Embojuruja poravorã |  | alto | mbojuruja = abrir (uso en localización, sin entrada en el glosario) |
| nav.json | `closeMenu` | Cerrar menú de navegación | Cerrar menú de navegación | Emboty poravorã |  | alto | mboty = cerrar |
| nav.json | `mainMenu` | Menú principal | Menú principal | Poravorã guasu |  | alto |  |
| nav.json | `relatedLinks` | Accesos institucionales relacionados | Accesos institucionales relacionados | Joaju institucional-kuéra |  | alto | «joaju» (enlace/acceso) ya usado en el catálogo |
| nav.json | `viewSection` | Ver sección | Ver sección | Ehecha pehẽ |  | alto | pehẽ = parte/sección |
| nav.json | `viewMainSection` | Ver sección principal | Ver sección principal | Ehecha pehẽ guasu |  | alto |  |
| nav.json | `searchInPortal` | Buscar en el portal | Heka portalpe | Eheka portal-pe |  | bajo | corrige «Heka» (sin prefijo de imperativo) por «Eheka» (criterio Yvy Marãe'ỹ) |
| nav.json | `items.institucional` | Institucional | Mba'apohára | Temimoĩmby |  | medio | corrige «Mba'apohára» (= trabajador); glosario: institución = temimoĩmby (B) |
| nav.json | `items.facultades` | Facultades | Mokõi Tetãgua Jeporu | Facultad-kuéra |  | medio | corrige «Mokõi Tetãgua Jeporu» (sin sentido); sin entrada: préstamo con sufijo plural (notas fila 14) |
| nav.json | `items.preguntasFrecuentes` | Preguntas Frecuentes | Preguntas Frecuentes | Porandu py'ỹiguáva |  | alto | perífrasis «preguntas de cada rato»; sin respaldo |
| nav.json | `items.academia` | Academia | Mbo'ehára | Academia |  | bajo | corrige «Mbo'ehára» (= docente); sin entrada: se conserva el término |
| nav.json | `institutional.historia` | Historia | Historia | Tembiasakue |  | medio | tembiasakue = historia (uso general); sin entrada en el glosario |
| nav.json | `institutional.misionVisionValores` | Misión, Visión y Valores | Misión, Visión y Valores | Misión, Visión ha Valores |  | medio | nombres de sección como préstamo; «ha» = y (glosario B) |
| nav.json | `institutional.autoridades` | Autoridades | Autoridades | Mburuvichakuéra |  | medio | glosario: directivo/autoridad = mburuvicha, plural mburuvichakuéra (B) |
| nav.json | `institutional.transparenciaLey5189` | Transparencia Ley 5.189 | Transparencia Ley 5.189 | Transparencia Léi 5.189 |  | medio | «Léi» ya usado en el catálogo y en prensa guaraní |
| nav.json | `institutional.transparenciaLey5282` | Transparencia Ley 5.282 | Transparencia Ley 5.282 | Transparencia Léi 5.282 |  | medio |  |
| nav.json | `institutional.informacionPublica` | Información Pública | Información Pública | Tetãgua marandu |  | alto | forma ya usada en el catálogo para «información pública»; sin entrada |
| nav.json | `institutional.titulos` | Títulos | Títulos | Título-kuéra |  | medio | préstamo con sufijo plural |
| nav.json | `institutional.solicitarTitulo` | Solicitar Título | Solicitar Título | Ejerure título |  | medio | glosario: jerure = pedir/solicitar (A, con nota «revisar») |
| nav.json | `contactos.porDependencia` | Contactos por dependencia | Contactos por dependencia | Ñomongeta dependencia rupi |  | alto | «ñomongeta» ya usado para contacto; «rupi» = por (glosario A, «mediante») |
| nav.json | `academia.investigacion` | Investigación | Investigación | Jeporekapy | investigacion=jeporekapy[B] | bajo | glosario: investigación = jeporekapy (B) |
| nav.json | `footer.institutional.title` | Institucional | Mba'apohára | Temimoĩmby |  | medio | ídem items.institucional |
| nav.json | `footer.institutional.ariaLabel` | Enlaces institucionales | Enlaces institucionales | Joaju institucional-kuéra |  | alto |  |
| nav.json | `footer.institutional.autoridades` | Autoridades | Autoridades | Mburuvichakuéra |  | medio |  |
| nav.json | `footer.institutional.historia` | Historia | Historia | Tembiasakue |  | medio |  |
| nav.json | `footer.institutional.misionVision` | Misión y Visión | Misión y Visión | Misión ha Visión |  | medio |  |
| nav.json | `footer.services.title` | Servicios | Servicios | Pytyvõkuéra |  | medio | «pytyvõ» (ayuda/servicio) ya usado en el catálogo |
| nav.json | `footer.services.ariaLabel` | Servicios institucionales | Servicios institucionales | Temimoĩmby pytyvõkuéra |  | alto |  |
| nav.json | `footer.services.carreras` | Carreras | Carreras | Carrera-kuéra | carrera=carrera[B] | medio | glosario: carrera = carrera (B), sufijo con guion |
| nav.json | `footer.academia.title` | Academia | Mbo'ehára | Academia |  | bajo | corrige «Mbo'ehára» (= docente) |
| nav.json | `footer.academia.ariaLabel` | Enlaces académicos | Enlaces académicos | Joaju académico-kuéra |  | alto |  |
| nav.json | `footer.academia.investigacion` | Investigación | Investigación | Jeporekapy | investigacion=jeporekapy[B] | bajo | glosario B |
| nav.json | `footer.academia.calendarioAcademico` | Calendario académico | Calendario académico | Arapapaha académico |  | alto | arapapaha = calendario (uso general, sin entrada); adjetivo como préstamo |
| common.json | `skipToContent` | Saltar al contenido principal | Saltar al contenido principal | Eho tetepy guasúpe |  | alto | igual que nav.skipLink |
| common.json | `goHome` | Ir al inicio de la Universidad Nacional de Concepción | Ir al inicio de la Universidad Nacional de Concepción | Eho Universidad Nacional de Concepción ñepyrũme | universidad=(sin forma)[B]; concepcion=Concepción[B] | medio |  |
| common.json | `officialLogo` | Logotipo oficial de la Universidad Nacional de Concepción | Logotipo oficial de la Universidad Nacional de Concepción | Universidad Nacional de Concepción logotipo oficial | universidad=(sin forma)[B]; concepcion=Concepción[B] | medio |  |
| common.json | `search` | Buscar | Heka | Eheka |  | bajo | corrige «Heka» |
| common.json | `searchPortal` | Buscar en el portal institucional | Heka portalpe | Eheka portal institucional-pe |  | medio |  |
| common.json | `searchTitle` | Buscar | Heka | Eheka |  | bajo |  |
| common.json | `aulaVirtual` | Aula Virtual | Tenda Mbo'esyry | Aula Virtual | virtual=(sin forma)[B] | bajo | nombre de la plataforma: se conserva (revierte «Tenda Mbo'esyry», sin respaldo) |
| common.json | `aulaVirtualAriaLabel` | Acceder al Aula Virtual. Abre en una nueva pestaña | Tenda Mbo'esyrype joaju. Abre en una nueva pestaña | Eike Aula Virtual-pe. Ojepe'a tendayke pyahúpe | virtual=(sin forma)[B] | alto | la versión previa dejaba la segunda frase en español |
| common.json | `intranetAriaLabel` | Acceder a la Intranet. Abre en una nueva pestaña | Intranetpe joaju. Abre en una nueva pestaña | Eike Intranet-pe. Ojepe'a tendayke pyahúpe |  | alto |  |
| common.json | `socialNetworks` | Redes oficiales | Redes oficiales | Ñomongeta veve oficial | red=(sin forma)[B] | alto | glosario (nota de «red»): redes sociales = ñomongeta veve (B) |
| common.json | `visitSocial` | Visitar {network} de la Universidad Nacional de Concepción | Visitar {network} de la Universidad Nacional de Concepción | Ehecha Universidad Nacional de Concepción {network} | universidad=(sin forma)[B]; concepcion=Concepción[B] | medio | poseedor antes de lo poseído |
| common.json | `institutional` | Institucional | Mba'apohára | Temimoĩmby |  | medio | corrige «Mba'apohára» |
| common.json | `services` | Servicios | Servicios | Pytyvõkuéra |  | medio |  |
| common.json | `academia` | Academia | Mbo'ehára | Academia |  | bajo | corrige «Mbo'ehára» |
| common.json | `contactInstitutional` | Contacto institucional | Contacto institucional | Ñomongeta institucional |  | alto |  |
| common.json | `seeContactInfo` | Ver información de contacto | Ver información de contacto | Ehecha ñomongeta rehegua marandu |  | alto |  |
| common.json | `mapTitle` | Mapa del campus | Mapa del campus | Campus yvy ra'ãnga |  | alto | yvy ra'ãnga = mapa (uso general, sin entrada) |
| common.json | `mapLoad` | Ver mapa interactivo | Ver mapa interactivo | Ehecha yvy ra'ãnga interactivo |  | alto |  |
| common.json | `mapDirections` | Cómo llegar | Cómo llegar | Mba'éicha jaguahẽ |  | medio | «cómo llegamos» |
| common.json | `mapOpen` | Abrir en Google Maps | Abrir en Google Maps | Embojuruja Google Maps-pe |  | alto |  |
| common.json | `mapPosterLabel` | Ilustración abstracta del campus con la ubicación del Rectorado | Ilustración abstracta del campus con la ubicación del Rectorado | Campus ra'ãnga ohechaukáva Rectorado oĩha |  | alto | texto alternativo; perífrasis sin respaldo |
| common.json | `mapIframeTitle` | Mapa de Google con la ubicación de la Universidad Nacional de Concepción | Mapa de Google con la ubicación de la Universidad Nacional de Concepción | Google yvy ra'ãnga ohechaukáva Universidad Nacional de Concepción oĩha | universidad=(sin forma)[B]; concepcion=Concepción[B] | alto |  |
| common.json | `allRightsReserved` | © {year} Universidad Nacional de Concepción. Todos los derechos reservados. | © {year} Universidad Nacional de Concepción. Todos los derechos reservados. | © {year} Universidad Nacional de Concepción. Opaite derecho oñeñongatu. | universidad=(sin forma)[B]; concepcion=Concepción[B] | alto | «ñongatu» (guardar) es criterio Yvy Marãe'ỹ para «archivar»; fórmula legal sin respaldo |
| common.json | `legalInfo` | Información legal | Información legal | Marandu legal |  | alto |  |
| common.json | `institutionalDescription` | Excelencia académica, investigación, innovación y compromiso con el desarrollo sostenible del Paraguay. | Excelencia académica, investigación, innovación y compromiso con el desarrollo sostenible del Paraguay. | Excelencia académica, jeporekapy, innovación ha compromiso Paraguái jekakuaa sostenible ndive. | investigacion=jeporekapy[B]; desarrollo=jekakuaa[A]; paraguay=Paraguái[B] | alto | jeporekapy (B), jekakuaa = desarrollo (A); resto préstamo |
| common.json | `noDocumentsAvailable` | No hay documentos disponibles. | No hay documentos disponibles. | Ndaipóri kuatia. |  | medio | kuatia (documento) ya usado en el catálogo |
| common.json | `openInNewTab` | Abre en una nueva pestaña | Abre en una nueva pestaña | Ojepe'a tendayke pyahúpe |  | alto |  |
| pages.home.json | `hero.imageAlt` | Acceso principal de la Universidad Nacional de Concepción | Universidad Nacional de Concepción ñepyrũ joaju | Universidad Nacional de Concepción jeikeha guasu | universidad=(sin forma)[B]; concepcion=Concepción[B] | medio | corrige traducción previa que no correspondía al español («ñepyrũ joaju»); jeikeha = entrada |
| pages.home.json | `hero.title1` | Bienvenidos a la | Teruviché | Peguahẽ porãite |  | medio | corrige traducción previa que no correspondía al español («Teruviché»); fórmula de bienvenida en plural |
| pages.home.json | `hero.description` | Una universidad pública que integra identidad, excelencia académica, investigación, innovación y compromiso con el desarrollo sostenible del norte del Paraguay. | Mbo'ehao tetãgua ombojoajúva identidad, mbo'e porã, mba'ekuaapyrã, tembiapo pyahu ha Paraguái yvate ñemombarete rehe ñemomba'e. | Tetã mbo'ehaovusu ombojoajúva identidad, excelencia académica, jeporekapy, innovación ha compromiso Paraguái yvate jekakuaa sostenible ndive. | universidad publica=(sin forma)[X]; investigacion=jeporekapy[B]; desarrollo=jekakuaa[A]; paraguay=Paraguái[B] | alto | mbo'ehaovusu (B), jeporekapy (B), jekakuaa = desarrollo (A); «tetã + sustantivo» = público (patrón de «tetã remimoĩmby», B); adjetivos como préstamo |
| pages.home.json | `hero.ctaExplore` | Explorar carreras | Mbo'epyrã eheka | Eheka carrera-kuéra | carrera=carrera[B] | medio | glosario: carrera (B); corrige «mbo'epyrã» |
| pages.home.json | `hero.ctaAbout` | Conocer la UNC | UNC eikuaa | Eikuaa UNC | conocer=kuaa[A] | bajo | conocer = kuaa (A) |
| pages.home.json | `hero.badgePublic` | Universidad pública | Mbo'ehao tetãgua | Tetã mbo'ehaovusu | universidad publica=(sin forma)[X] | medio | corrige «mbo'ehao» (= escuela, A) por mbo'ehaovusu (universidad, B) |
| pages.home.json | `hero.badgeFounded` | Fundada en 2007 | Oñembokatú 2007-pe | Oñemopyendáva 2007-pe |  | medio | corrige traducción previa que no correspondía al español («Oñembokatú»); fecha con sufijo (notas §2) |
| pages.home.json | `hero.badgeLocation` | Concepción · Paraguay | Concepción · Paraguay | Concepción · Paraguái | concepcion=Concepción[B]; paraguay=Paraguái[B] | bajo | glosario: Paraguay = Paraguái (B) |
| pages.home.json | `hero.scrollLabel` | Desplázate para ingresar | Eho peve | Eguejy eike hag̃ua |  | alto | corrige traducción previa que no correspondía al español («Eho peve») |
| pages.home.json | `hero.mainAccess` | Acceso principal | Ñepyrũ joaju | Jeikeha guasu |  | alto |  |
| pages.home.json | `quickLinks.sectionLabel` | Servicios institucionales | Mbo'ehao pytyvõguéra | Temimoĩmby pytyvõkuéra |  | alto | corrige «mbo'ehao» (escuela) |
| pages.home.json | `quickLinks.description` | Encuentra rápidamente los servicios académicos y administrativos más consultados. | Eikuaa pya'eve mbo'e ha mba'apohára pytyvõ iporãitéva. | Ejuhu pya'e pytyvõ académico ha administrativo ojeheka hetavéva. |  | alto | corrige traducción previa que no correspondía al español |
| pages.home.json | `quickLinks.actionAccess` | Acceder a la plataforma | Plataformape ejoaju | Eike plataforma-pe | plataforma=(sin forma)[C] | alto |  |
| pages.home.json | `quickLinks.items.carreras.title` | Carreras | Mbo'epyrãnguéra | Carrera-kuéra | carrera=carrera[B] | medio | glosario B |
| pages.home.json | `quickLinks.items.carreras.description` | Explora la oferta académica por facultad y nivel. | Eheka mbo'epyrã mbo'ehao pytyvõrãnguéra rupi. | Ehecha oferta académica facultad ha nivel rupi. | nivel=(sin forma)[A] | alto | corrige traducción previa que no correspondía al español; «nivel» como préstamo (el A del glosario es nivel físico) |
| pages.home.json | `quickLinks.items.carreras.label` | Oferta académica | Mbo'e oferta | Oferta académica |  | bajo | sin entrada: se conserva |
| pages.home.json | `quickLinks.items.calendario.title` | Calendario Académico | Mbo'e Aravo | Arapapaha Académico |  | alto | corrige «Mbo'e Aravo» (aravo = hora) |
| pages.home.json | `quickLinks.items.calendario.description` | Consulta fechas, periodos y actividades importantes. | Eheka ára, periodo ha tembiapo iporãva. | Ehecha ára, periodo ha tembiapo tuichamba'éva. |  | alto | corrige «iporãva» (= bueno) por «tuichamba'éva» (importante) |
| pages.home.json | `quickLinks.items.calendario.label` | Fechas importantes | Ára iporãva | Ára tuichamba'éva |  | alto |  |
| pages.home.json | `quickLinks.items.titulos.title` | Títulos y Legalizaciones | Títuloguéra ha Legalizaciones | Título-kuéra ha Legalizaciones |  | medio |  |
| pages.home.json | `quickLinks.items.titulos.description` | Información sobre trámites y documentación académica. | Marandu trámite ha mbo'e kuatia rehegua. | Marandu trámite ha kuatia académico rehegua. |  | alto |  |
| pages.home.json | `quickLinks.items.titulos.label` | Gestiones académicas | Mbo'e mba'apohára | Gestiones académicas |  | bajo | corrige «Mbo'e mba'apohára» (= trabajador de enseñanza); se conserva el español |
| pages.home.json | `quickLinks.items.aulaVirtual.description` | Accede a la plataforma institucional de aprendizaje. | Mbo'ehao mbo'e plataformape ejoaju. | Eike plataforma institucional ñehekombo'e reheguápe. | plataforma=(sin forma)[C]; aprendizaje=ñehekombo'e[B] | alto | aprendizaje = ñehekombo'e (B) |
| pages.home.json | `quickLinks.items.aulaVirtual.label` | Plataforma educativa | Mbo'e plataforma | Plataforma tekombo'e rehegua | plataforma=(sin forma)[C] | alto | educación = tekombo'e (B) |
| pages.home.json | `news.sectionLabel` | Actualidad universitaria | Mbo'ehao marandu | Mbo'ehaovusu marandu |  | medio | corrige «mbo'ehao» |
| pages.home.json | `news.description` | Información sobre actividades académicas, investigación, extensión universitaria y gestión institucional. | Mbo'e tembiapo, mba'ekuaapyrã, mbo'e ñepyrũ ha mbo'ehao mba'apohára rehegua marandu. | Marandu tembiapo académico, jeporekapy, extensión universitaria ha gestión institucional rehegua. | investigacion=jeporekapy[B] | alto | corrige «mbo'e ñepyrũ» y «mba'apohára» (sin relación con extensión/gestión) |
| pages.home.json | `news.viewAll` | Ver todas las noticias | Marandu opavave ehecha | Ehecha opaite marandu |  | medio | corrige «opavave» (= todas las personas) |
| pages.home.json | `news.readNews` | Leer noticia: {title} | Marandu eñemongeta: {title} | Emoñe'ẽ marandu: {title} |  | medio | corrige «eñemongeta» (= conversa); moñe'ẽ = leer |
| pages.home.json | `news.defaultCategory` | Institucional | Institucional | Temimoĩmby |  | medio | institución = temimoĩmby (B) |
| pages.home.json | `stats.sectionLabel` | UNC en números | UNC número rehegua | UNC papapýpe |  | alto | papapy = número |
| pages.home.json | `stats.title` | Estadísticas institucionales | Mbo'ehao estadística | Estadística institucional |  | bajo | sin entrada |
| pages.home.json | `stats.items.estudiantes` | Estudiantes | Mbo'eháva | Temimbo'ekuéra | estudiante=temimbo'e[B] | medio | corrige «Mbo'eháva»; glosario: estudiante = temimbo'e (B/A) |
| pages.home.json | `stats.items.carrerasAcreditadas` | Carreras acreditadas | Mbo'epyrã acreditado | Carrera acreditada-kuéra | carrera=carrera[B] | medio |  |
| pages.home.json | `stats.items.facultades` | Facultades | Mbo'ehao pytyvõrã | Facultad-kuéra |  | medio | corrige «Mbo'ehao pytyvõrã» |
| pages.home.json | `stats.items.egresados` | Egresados | Graduado | Egresado-kuéra |  | medio |  |
| pages.home.json | `transparency.sectionLabel` | Gestión pública | Tetãgua mba'apohára | Gestión pública |  | bajo | corrige «Tetãgua mba'apohára» (= funcionario) |
| pages.home.json | `transparency.title` | Transparencia activa | Ñe'ẽ ñemombe'u | Transparencia activa |  | bajo | corrige «Ñe'ẽ ñemombe'u» (= relato); sin entrada |
| pages.home.json | `transparency.description` | Accede a documentos, normativas e información pública de la Universidad Nacional de Concepción. | Kuatia, léi ha Universidad Nacional de Concepción rehegua tetãgua marandu ejoaju haguã. | Eike Universidad Nacional de Concepción kuatia, normativa ha tetãgua marandúpe. | universidad=(sin forma)[B]; concepcion=Concepción[B] | alto |  |
| pages.home.json | `transparency.viewPortal` | Consultar el portal de transparencia | Ñe'ẽ ñemombe'u portal eheka | Ehecha portal de transparencia |  | medio |  |
| pages.home.json | `transparency.items.ley5189.description` | Información pública sobre remuneraciones y asignaciones. | Remuneración ha designación rehegua tetãgua marandu. | Tetãgua marandu remuneración ha asignación rehegua. |  | alto | corrige «designación» |
| pages.home.json | `transparency.items.ley5282.description` | Acceso ciudadano a la información pública institucional. | Tetãygua marandu joaju mbo'ehao marandu rehegua. | Tetãygua jeike temimoĩmby tetãgua marandúpe. |  | alto |  |
| pages.home.json | `awards.sectionLabel` | Calidad reconocida | Calidad reconocida | Calidad ojehechakuaáva |  | medio |  |
| pages.home.json | `awards.title` | Premios y acreditaciones | Premios y acreditaciones | Premio ha acreditación-kuéra |  | medio |  |
| pages.home.json | `awards.description` | Distinciones a la gestión y programas acreditados por organismos nacionales de evaluación de la calidad. | Distinciones a la gestión y programas acreditados por organismos nacionales de evaluación de la calidad. | Distinción-kuéra gestión-pe ha programa acreditado organismo nacional evaluación de la calidad rehegua rupive. |  | alto |  |
| pages.home.json | `awards.awardedBy` | Otorgado por {name} | Otorgado por {name} | Ome'ẽva: {name} |  | medio |  |
| pages.home.json | `awards.officialSite` | Sitio oficial | Sitio oficial | Tenda oficial |  | medio |  |
| pages.home.json | `awards.source` | Fuente | Fuente | Ypykue |  | alto | ypykue = origen; sin entrada para «fuente» |
| pages.home.json | `awards.externalHint` | se abre en una pestaña nueva | se abre en una pestaña nueva | ojepe'a tendayke pyahúpe |  | alto |  |
| pages.home.json | `awards.editionsTitle` | Ediciones en que fuimos distinguidos | Ediciones en que fuimos distinguidos | Edición ojehechakuaa hag̃uépe UNC |  | alto |  |
| pages.home.json | `awards.distinction.premioCategoria` | Premio por categoría | Premio por categoría | Premio categoría rupi | categoria=(sin forma)[B] | medio |  |
| pages.home.json | `awards.distinction.reconocimiento` | Reconocimiento | Reconocimiento | Jehechakuaa |  | medio |  |
| pages.home.json | `awards.accreditations.title` | Acreditaciones | Acreditaciones | Acreditación-kuéra |  | medio |  |
| pages.home.json | `awards.accreditations.organism.otro` | Otro organismo | Otro organismo | Ambue organismo |  | medio |  |
| pages.home.json | `awards.accreditations.validUntil` | hasta {year} | hasta {year} | {year} peve |  | bajo | peve = hasta |
| pages.home.json | `awards.accreditations.otherPrograms` | Otros programas acreditados | Otros programas acreditados | Ambue programa acreditado |  | medio |  |
| pages.home.json | `awards.logoAlt` | Logo de {name} | Logo de {name} | {name} logo |  | medio |  |
| pages.home.json | `institutional.label` | Universidad pública | Mbo'ehao tetãgua | Tetã mbo'ehaovusu | universidad publica=(sin forma)[X] | medio | corrige «mbo'ehao» |
| pages.home.json | `institutional.title` | Excelencia académica, investigación e innovación | Mbo'e porã, mba'ekuaapyrã ha tembiapo pyahu | Excelencia académica, jeporekapy ha innovación | investigacion=jeporekapy[B] | medio | investigación = jeporekapy (B) |
| pages.home.json | `institutional.description` | Comprometidos con el desarrollo sostenible de Concepción y del Paraguay. | Concepción ha Paraguái ñemombarete rehe ñemomba'e. | Compromiso Concepción ha Paraguái jekakuaa sostenible ndive. | desarrollo=jekakuaa[A]; concepcion=Concepción[B]; paraguay=Paraguái[B] | alto | desarrollo = jekakuaa (A); corrige «ñemombarete» |
| pages.historia.json | `timeline.moreInfo` | Más información | Más información | Marandu hetave |  | medio |  |
| pages.historia.json | `timeline.newTab` | (se abre en una pestaña nueva) | (se abre en una pestaña nueva) | (ojepe'a tendayke pyahúpe) |  | alto |  |
| pages.historia.json | `timeline.unavailable` | La línea de tiempo no está disponible en este momento. Vuelva a intentarlo más tarde. | La línea de tiempo no está disponible en este momento. Vuelva a intentarlo más tarde. | Línea de tiempo ndaipóri ko'ág̃a. Eha'ã jey upe rire. |  | alto |  |
| pages.historia.json | `timeline.description` | Los momentos más significativos en el desarrollo de la Universidad Nacional de Concepción. | Universidad Nacional de Concepción rehegua ára iporãitéva. | Universidad Nacional de Concepción jekakuaa ára tuichamba'eve. | desarrollo=jekakuaa[A]; universidad=(sin forma)[B]; concepcion=Concepción[B] | alto | corrige traducción previa que no correspondía al español; desarrollo = jekakuaa (A) |
| pages.historia.json | `intro.body2` | Con seis facultades y una amplia oferta académica, la institución forma profesionales comprometidos con el desarrollo sostenible de la región, fomentando la investigación, la extensión universitaria y la innovación como pilares del quehacer universitario. | Mbo'ehao mokõipavẽ (6) ndive ha mbo'epyrã heta ndive, mbo'ehao omoha'ãnga ñeporandu, mbo'e ñepyrũ ha tembiapo pyahu rehegua mba'aporãnguéra Paraguái yvate ñemombarete haguã. | 6 facultad ha oferta académica tuicháva ndive, temimoĩmby ombokatupyry profesional-kuéra oñemoĩva región jekakuaa sostenible rehe, omoakãrapu'ãvo jeporekapy, extensión universitaria ha innovación, mbo'ehaovusu rembiapo pyenda ramo. | institucion=temimoĩmby[B]; desarrollo=jekakuaa[A]; investigacion=jeporekapy[B]; pilar=(sin forma)[B] | alto | corrige traducción previa que no correspondía al español («mokõipavẽ (6)» y omisiones); cifras en dígitos (notas §2) |
| pages.historia.json | `mission.body` | La Universidad Nacional de Concepción se define como una institución pública de educación superior al servicio de la sociedad paraguaya, con especial énfasis en las necesidades del norte del país. Su misión es la formación integral de profesionales capaces de contribuir al desarrollo económico, social y cultural de la región, mediante la docencia, la investigación científica y la extensión universitaria. | Universidad Nacional de Concepción oñemoñe'ẽ tetãgua mbo'ehao peguáicha, oñemomba'eva tetã rehe, Paraguái yvate rehegua mba'aporãrã. Imba'aporã ha'e ñeha'ã, mba'ekuaapyrã ha mbo'e ñepyrũ ndive. | Universidad Nacional de Concepción ha'e tetã remimoĩmby educación superior rehegua, oservíva Paraguái tavayguápe ha oma'ẽvéva tetã yvate remikotevẽre. Hembiapo ha'e ombokatupyry porã profesional-kuéra ikatúva oipytyvõ región jekakuaa económico, social ha cultural, mbo'ehára rembiapo, jeporekapy científica ha extensión universitaria rupive. | universidad=(sin forma)[B]; concepcion=Concepción[B]; institucion=temimoĩmby[B]; educacion superior=(sin forma)[X]; desarrollo=jekakuaa[A]; investigacion=jeporekapy[B] | alto | corrige traducción previa que no correspondía al español (la versión previa omitía media misión); tetã remimoĩmby (B) |
| pages.institucional.json | `hero.description` | Una universidad pública, comprometida con el desarrollo sostenible del norte del Paraguay, con más de una década formando profesionales de excelencia. | Mbo'ehao ñemigua, Paraguái yvate pegua ñemoarandu ha ñemombyky rehegua mba'aporã, opa arambýre oñemomba'e porã haguã. | Tetã mbo'ehaovusu, oñemoĩva Paraguái yvate jekakuaa sostenible rehe, ombokatupyrýva profesional iporãitéva hetave 10 ary guive. | universidad publica=(sin forma)[X]; desarrollo=jekakuaa[A]; paraguay=Paraguái[B] | alto | corrige traducción previa que no correspondía al español |
| pages.mision-vision.json | `mission.quote` | Somos una universidad formadora de profesionales íntegros, innovadores, críticos, humanistas, socialmente responsables y con principios democráticos, que articula la docencia, la investigación y la extensión del conocimiento científico y tecnológico, el fomento de la cultura, el arte, el deporte, el desarrollo sostenible y el espíritu emprendedor. | Ha'e ore mbo'ehao omoha'ãnga ñeha'ã porã rehe, ñepyrũ pyahu rehe, ñemomba'e rehe, opavavépe oñemomba'e ha mba'aporã porã rehe, ombojoajúva mbo'e, mba'ekuaapyrã ha mbo'e ñepyrũ, tembiapo pyahu, jekuaa pyahu ha mbo'ehára rembiasa ndive. | Ore ha'e mbo'ehaovusu ombokatupyrýva profesional hekojojáva, innovador, crítico, humanista, socialmente responsable ha principio democrático reheguáva, ombojoajúva mbo'ehára rembiapo, jeporekapy ha kuaapy científico ha tecnológico ñemyasãi, cultura, arte ha deporte ñemokyre'ỹ, jekakuaa sostenible ha espíritu emprendedor. | universidad=mbo'ehaovusu[B]; investigacion=jeporekapy[B]; conocimiento=kuaapy[B]; desarrollo=jekakuaa[A] | alto | corrige traducción previa que no correspondía al español; kuaapy = conocimiento (B) |
| pages.mision-vision.json | `values.v8.description` | Dedicación y responsabilidad con la misión educativa y el desarrollo de la institución. | Mbo'e mba'aporã ha mbo'ehao ñemombarete rehe ñemomba'e porã. | Ñemoĩ ha responsabilidad misión educativa ha temimoĩmby jekakuaa rehe. | desarrollo=jekakuaa[A]; institucion=temimoĩmby[B] | alto | desarrollo = jekakuaa (A) |
| pages.extension.json | `hero.description` | La UNC trasciende el aula para contribuir activamente al desarrollo humano, cultural y productivo de la región de Concepción. | UNC oguata mbo'eháo guive tetã rehe pytyvõ haguã Concepción rehegua ñemombarete, arandú ha tembiapo rehegua. | UNC ohasa aula rembe'y oipytyvõ hag̃ua jekakuaa humano, cultural ha productivo Concepción región-pe. | desarrollo=jekakuaa[A]; concepcion=Concepción[B] | alto | corrige traducción previa que no correspondía al español |
| pages.facultades.agrarias.json | `hero.tagline` | Formando profesionales para el desarrollo agropecuario sostenible del Paraguay. | Ojapo profesional Paraguay yvy ñembojoavy ndive. | Ombokatupyry profesional-kuéra Paraguái jekakuaa agropecuario sostenible rehe. | desarrollo=jekakuaa[A]; paraguay=Paraguái[B] | alto | corrige traducción previa que no correspondía al español («yvy ñembojoavy») |
| pages.facultades.ciencias-economicas.json | `hero.tagline` | Formando profesionales líderes en administración, contabilidad e informática para el desarrollo empresarial del Paraguay. | Ojapo profesional tembiapo ñepytyvõ ha viru ñembojoavy ndive. | Ombokatupyry profesional líder administración, contabilidad ha informática-pe, Paraguái jekakuaa empresarial rehe. | informatica=informática[B]; desarrollo=jekakuaa[A]; paraguay=Paraguái[B] | alto | corrige traducción previa que no correspondía al español; informática como préstamo (B) |
| pages.facultades.ciencias-exactas.json | `hero.tagline` | Formando ingenieros y científicos para el desarrollo tecnológico sostenible del Paraguay. | Ojapo ingeniero ha científico tecnología ñemoñare ndive. | Ombokatupyry ingeniero ha científico-kuéra Paraguái jekakuaa tecnológico sostenible rehe. | desarrollo=jekakuaa[A]; paraguay=Paraguái[B] | alto | corrige traducción previa que no correspondía al español |
| pages.facultades.humanidades.json | `hero.tagline` | Formando profesionales comprometidos con la educación, la cultura y el desarrollo humano del Paraguay. | Ojapo profesional mbo'esýva ha ava rembiasakue ndive. | Ombokatupyry profesional oñemoĩva tekombo'e, cultura ha Paraguái jekakuaa humano rehe. | educacion=tekombo'e[B]; desarrollo=jekakuaa[A]; paraguay=Paraguái[B] | alto | corrige traducción previa que no correspondía al español; educación = tekombo'e (B) |
| pages.investigacion.json | `hero.description` | La UNC promueve la generación de conocimiento científico orientado al desarrollo sostenible de Concepción y el norte del Paraguay. | UNC ombokatupyry mba'ekuaapyrã Concepción ha Paraguái yvate ñemombarete haguã. | UNC omokyre'ỹ kuaapy científico ñemoheñói Concepción ha Paraguái yvate jekakuaa sostenible rehe. | conocimiento=kuaapy[B]; desarrollo=jekakuaa[A]; concepcion=Concepción[B]; paraguay=Paraguái[B] | alto | conocimiento = kuaapy (B), desarrollo = jekakuaa (A) |
| pages.investigacion.json | `areas.a3.p2` | Infraestructura vial y gestión de obras en el norte del país | Tetã yvate ñangareko rehegua | Infraestructura vial ha obra ñangareko tetã yvatépe | infraestructura=mba'eporurã[A] | alto | corrige traducción previa que no correspondía al español (faltaba «infraestructura»); préstamo admitido por el glosario (A) |
| pages.investigacion.json | `areas.a4.p3` | Desarrollo económico local y emprendimiento regional | Tetã ñemombarete ha tembiapo ñepyrũ | Jekakuaa económico local ha emprendimiento regional | desarrollo=jekakuaa[A] | alto | desarrollo = jekakuaa (A) |
| pages.tribunal-electoral.json | `accordion.subtitle` | Accedé a los documentos oficiales de cada etapa del proceso | Eike marandúpe proceso electoral rembiporu rehegua | Eike kuatia oficial-kuérape proceso electoral ararasa ñavõmegua | etapa=ararasa[A] | alto | etapa = ararasa (A, sentido de época: revisar) |
| pages.tribunal-electoral.json | `hero.description` | Órgano autónomo encargado de garantizar la transparencia y legalidad de los procesos electorales universitarios. | Órgano autónomo encargado de garantizar la transparencia y legalidad de los procesos electorales universitarios. | Órgano autónomo oñangarekóva transparencia ha legalidad mbo'ehaovusu jeporavo-kuérape. |  | alto | jeporavo = elección (uso general, sin entrada) |
| pages.autoridades.json | `others.title` | Otras autoridades | Otras autoridades | Ambue mburuvichakuéra |  | medio | autoridad = mburuvicha (B) |
| pages.autoridades.json | `states.empty` | Por el momento no hay autoridades publicadas. Vuelva a consultar más tarde. | Por el momento no hay autoridades publicadas. Vuelva a consultar más tarde. | Ko'ág̃a ndaipóri mburuvicha oñemyasãiva. Ehecha jey upe rire. |  | alto |  |
| pages.autoridades.json | `states.unavailable` | No pudimos cargar las autoridades en este momento. Intente nuevamente en unos minutos. | No pudimos cargar las autoridades en este momento. Intente nuevamente en unos minutos. | Ndaikatúi rohechauka mburuvichakuéra ko'ág̃a. Eha'ã jey sapy'ami rire. |  | alto |  |
| pages.accesibilidad.json | `features.description` | Este portal incluye las siguientes herramientas para mejorar la experiencia de todos los usuarios: | Ko portal omoĩ ko'ã tembiporu opavave oiporu porã haguã: | Ko portal omoĩ ko'ã tembiporu opavave oiporu porã hag̃ua: |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.accesibilidad.json | `features.f2.description` | El portal ofrece modos de alto contraste y escala de grises para mejorar la legibilidad para personas con baja visión o daltonismo. | Portal omboguejy ohechauka tuicha ha gris escala haguã mba'e hesakã haguã maranduháva. | Portal omboguejy ohechauka tuicha ha gris escala hag̃ua mba'e hesakã hag̃ua maranduháva. | contraste=(sin forma)[X]; escala=(sin forma)[X] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.accesibilidad.json | `features.f3.description` | Podés activar el subrayado de todos los enlaces del portal para identificarlos más fácilmente. | Ikatu remombyry portal rehegua joaju opavave ñomimbyrã eikuaa porã haguã. | Ikatu remombyry portal rehegua joaju opavave ñomimbyrã eikuaa porã hag̃ua. |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.accesibilidad.json | `features.f4.description` | Opción para cambiar a una tipografía de mayor legibilidad, especialmente útil para personas con dislexia. | Opción kuatia ñemomba'e porã haguã, oĩháicha maranduháva dyslexia oĩvapepe. | Opción kuatia ñemomba'e porã hag̃ua, oĩháicha maranduháva dyslexia oĩvapepe. |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.accesibilidad.json | `features.f5.description` | Todo el portal es navegable mediante teclado. Usá Tab para moverte entre elementos y Enter para activarlos. | Portal opa teclado ndive oñembojáva. Tab emomba'e tembiporu peve ha Enter embokatú haguã. | Portal opa teclado ndive oñembojáva. Tab emomba'e tembiporu peve ha Enter embokatú hag̃ua. |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.accesibilidad.json | `cta.subject` | con el asunto "Accesibilidad". Nos comprometemos a responder en un plazo de 5 días hábiles. | "Accesibilidad" rembiapokue ndive. Oñemomba'e 5 arapotĩ guive ñemomba'e haguã. | "Accesibilidad" rembiapokue ndive. Oñemomba'e 5 arapotĩ guive ñemomba'e hag̃ua. | accesibilidad=(sin forma)[X] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.autoridades.json | `organigrama.title` | ¿Querés ver la estructura organizacional completa? | ¿Remomba'e porã haguã mbo'ehao ñemombyky opa rehegua? | ¿Remomba'e porã hag̃ua mbo'ehao ñemombyky opa rehegua? |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.contacto.json | `info.phone.action` | Llamar ahora | Eñe'ẽ ko'ãga | Eñe'ẽ ko'ág̃a |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.extension.json | `programs.p1.descripcion` | Cursos, talleres y diplomaturas abiertos a la comunidad para la formación permanente de profesionales y ciudadanos. | Curso, taller ha diplomaturas opavave haguã mbo'ehára ha tetãygua ñemba'apo. | Curso, taller ha diplomaturas opavave hag̃ua mbo'ehára ha tetãygua ñemba'apo. |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.historia.json | `intro.body1` | La Universidad Nacional de Concepción fue creada por Ley N° 3.201 el 4 de julio de 2007, con el propósito de brindar educación superior pública de calidad a la región norte de la República del Paraguay. Ubicada en la ciudad de Concepción, capital del Departamento de Concepción, la UNC responde a la histórica demanda de la comunidad regional de contar con una casa de estudios superiores cercana a su realidad. | Universidad Nacional de Concepción oñembokatú Léi N° 3.201 ndive 2007 jasypoteĩ 4-pe, oñemomba'e haguã mbo'e porã tetãgua Paraguái yvate pegua. Concepción táva-pe guivegua, Concepción Departamento óga tuicha-pe, UNC oñemomba'e Paraguái yvate pegua ñepyrũhaguéicha mbo'e porã rehegua. | Universidad Nacional de Concepción oñembokatú Léi N° 3.201 ndive 2007 jasypoteĩ 4-pe, oñemomba'e hag̃ua mbo'e porã tetãgua Paraguái yvate pegua. Concepción táva-pe guivegua, Concepción Departamento óga tuicha-pe, UNC oñemomba'e Paraguái yvate pegua ñepyrũhaguéicha mbo'e porã rehegua. | universidad=(sin forma)[B]; concepcion=Concepción[B]; educacion superior=(sin forma)[X]; paraguay=Paraguái[B]; concepcion=Concepción[B]; concepcion=Concepción[B] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.historia.json | `intro.statStudents` | Estudiantes activos | Mbo'eháva oñemoarandu hagua | Mbo'eháva oñemoarandu hag̃ua | estudiante=(sin forma)[B] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.institucional.json | `sections.items.historia.description` | Desde su fundación en 2007, la UNC ha crecido hasta convertirse en el referente de educación superior del norte paraguayo. | 2007 guive, UNC oikoporã oñemomba'e porã haguã Paraguái yvate pegua mbo'ehaópe. | 2007 guive, UNC oikoporã oñemomba'e porã hag̃ua Paraguái yvate pegua mbo'ehaópe. | educacion superior=(sin forma)[X] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.investigacion.json | `meta.description` | Conocé los proyectos, grupos y líneas de investigación de la Universidad Nacional de Concepción. | UNC rehegua mba'ekuaapyrã tembiaponguéra, grupo ha líneas eikuaa haguã. | UNC rehegua mba'ekuaapyrã tembiaponguéra, grupo ha líneas eikuaa hag̃ua. | investigacion=(sin forma)[B]; universidad=(sin forma)[B]; concepcion=(sin forma)[B] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.investigacion.json | `cta.title` | ¿Querés publicar o colaborar? | ¿Remomba'e haguã térã reñomongeta? | ¿Remomba'e hag̃ua térã reñomongeta? |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.legalizaciones.json | `services.description` | La Secretaría General de la UNC ofrece el servicio de legalización de los documentos emitidos por la institución para uso oficial a nivel nacional e internacional. | Secretaría General UNC pegua omboguejy mbo'ehao kuatia legalización pytyvõ, tetã ha tetã ambuépe oñemongu'e haguã. | Secretaría General UNC pegua omboguejy mbo'ehao kuatia legalización pytyvõ, tetã ha tetã ambuépe oñemongu'e hag̃ua. | general=(sin forma)[X]; institucion=temimoĩmby[B]; nivel=(sin forma)[A] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.legalizaciones.json | `services.s3.description` | Autenticación del certificado analítico de calificaciones para uso en procesos de admisión, becas o reconocimiento de estudios en el exterior. | Calificaciones kuatia ñemomba'e ñemboguapy, beca térã mbo'e ñemomba'e tetã ambuépe haguã. | Calificaciones kuatia ñemomba'e ñemboguapy, beca térã mbo'e ñemomba'e tetã ambuépe hag̃ua. |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.legalizaciones.json | `contact.description` | Para consultas sobre el proceso de legalización de documentos, dirigirse personalmente a: | Legalización tembiapo rehegua ñeporandu haguã, eho: | Legalización tembiapo rehegua ñeporandu hag̃ua, eho: |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.marco-legal.json | `info.description` | Para acceder a información adicional sobre la normativa institucional o solicitar copias de los documentos legales, puede dirigirse a la Secretaría General del Rectorado de la UNC. | Léi ñemombyky marandu ambuégui térã kuatia kopia ñemomba'e haguã, eho Secretaría General del Rectorado UNC pegua. | Léi ñemombyky marandu ambuégui térã kuatia kopia ñemomba'e hag̃ua, eho Secretaría General del Rectorado UNC pegua. | general=(sin forma)[X] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.mision-vision.json | `vision.quote` | Ser una universidad de prestigio, distinguida por la calidad y pertinencia del servicio educativo, incluyente, con alto liderazgo en la formación integral de la persona, con innovación permanente y responsabilidad universitaria para la transformación social sostenible, con visibilidad nacional e internacional. | Oĩ haguã mbo'ehao ikatupyrýva, iporãva ha tetãme oñeha'ã, opavavépe joaju rehe, mba'aporã rehegua ñemomba'e porãitévape, ñepyrũ pyahu ha mbo'e mba'aporã rehegua, opavapy rehegua ñemomba'e porã, Paraguái ha tetã ambuépe oñeikuaavapa haguã. | Oĩ hag̃ua mbo'ehao ikatupyrýva, iporãva ha tetãme oñeha'ã, opavavépe joaju rehe, mba'aporã rehegua ñemomba'e porãitévape, ñepyrũ pyahu ha mbo'e mba'aporã rehegua, opavapy rehegua ñemomba'e porã, Paraguái ha tetã ambuépe oñeikuaavapa hag̃ua. | universidad=(sin forma)[B] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.mision-vision.json | `values.v3.description` | Cumplimiento riguroso de los compromisos con los estudiantes, el Estado y la sociedad. | Mbo'eháva, tetã ha tetã remimbiokuépe oñemomba'e porãve haguã. | Mbo'eháva, tetã ha tetã remimbiokuépe oñemomba'e porãve hag̃ua. | estudiante=(sin forma)[B] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.mision-vision.json | `values.v10.description` | Garantía de acceso y trato equitativo sin distinción de origen, género o condición social. | Joaju ha trato porã opavavépe, mba'épa oñembokatúva ani haguã. | Joaju ha trato porã opavavépe, mba'épa oñembokatúva ani hag̃ua. |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.privacidad.json | `sections.s2.content` | Este portal puede recopilar datos de navegación de carácter técnico (dirección IP, tipo de navegador, páginas visitadas) con fines estadísticos y de mejora del servicio. No se recopilan datos personales identificables sin consentimiento expreso del usuario. | Ko portal ikatu omboguapy navegación datos técnicoguéra (IP dirección, kundahára mba'e, arapypegua página) estadística ha pytyvõ porã haguã. Datos personales identificable ani oñemboguapy usuario eñemomba'e mboyve. | Ko portal ikatu omboguapy navegación datos técnicoguéra (IP dirección, kundahára mba'e, arapypegua página) estadística ha pytyvõ porã hag̃ua. Datos personales identificable ani oñemboguapy usuario eñemomba'e mboyve. | datos=dato[B]; tecnico=(sin forma)[A]; datos=dato[B] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.privacidad.json | `sections.s3.title` | Finalidad del tratamiento | Mba'e haguã oñemboguapy | Mba'e hag̃ua oñemboguapy |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.privacidad.json | `sections.s3.content` | Los datos recabados se utilizan exclusivamente para mejorar la experiencia de navegación, generar estadísticas de uso agregadas, y garantizar el correcto funcionamiento del portal. No se utilizan para fines comerciales ni son cedidos a terceros. | Datos oñemboguapyva oñeiporu ete ñemboarandúpe navegación porã haguã, estadística ha portal mba'apohára haguã. Ani oñeiporu mba'e viru haguã ha ani oñemomba'e ambuépe. | Datos oñemboguapyva oñeiporu ete ñemboarandúpe navegación porã hag̃ua, estadística ha portal mba'apohára hag̃ua. Ani oñeiporu mba'e viru hag̃ua ha ani oñemomba'e ambuépe. | datos=dato[B] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.privacidad.json | `sections.s5.content` | El usuario tiene derecho a acceder, rectificar y cancelar sus datos personales, así como a oponerse a su tratamiento, conforme a la legislación paraguaya vigente. Para ejercer estos derechos, puede contactarse con la Secretaría General de la UNC. | Usuario oĩ iñe'ẽ haguã, oñemomba'e ha oñembohavy haguã idatos personales, ha ani oñeiporu haguã, Paraguái léi ojurujáva reheve. Ko derecho oiporu haguã, eñomongeta Secretaría General UNC pegua. | Usuario oĩ iñe'ẽ hag̃ua, oñemomba'e ha oñembohavy hag̃ua idatos personales, ha ani oñeiporu hag̃ua, Paraguái léi ojurujáva reheve. Ko derecho oiporu hag̃ua, eñomongeta Secretaría General UNC pegua. | datos=dato[B]; general=(sin forma)[X] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.privacidad.json | `sections.s6.content` | Este portal puede utilizar cookies técnicas necesarias para el funcionamiento del sitio. No se utilizan cookies de rastreo ni publicidad de terceros. Puede configurar su navegador para rechazar cookies, aunque esto podría afectar la funcionalidad del portal. | Ko portal ikatu oiporu cookies técnicas portal mba'apohára haguã. Ani oñeiporu rastreador cookies ha publicidad ambuégui. Ikatu remombyry nde kundahára cookies ani haguã, upépe portal mba'aporãkue oñembohavy haguã. | Ko portal ikatu oiporu cookies técnicas portal mba'apohára hag̃ua. Ani oñeiporu rastreador cookies ha publicidad ambuégui. Ikatu remombyry nde kundahára cookies ani hag̃ua, upépe portal mba'aporãkue oñembohavy hag̃ua. |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.privacidad.json | `sections.s7.content` | Para consultas relacionadas con la privacidad y el tratamiento de datos personales, puede escribir a secgral@unc.edu.py o dirigirse personalmente a las oficinas de la Secretaría General en el Campus Universitario de la UNC. | Privacidad ha datos personales rehegua ñeporandu haguã, emoñe'ẽ secgral@unc.edu.py-pe térã eho Secretaría General UNC Campus Universitario-pe. | Privacidad ha datos personales rehegua ñeporandu hag̃ua, emoñe'ẽ secgral@unc.edu.py-pe térã eho Secretaría General UNC Campus Universitario-pe. | datos=dato[B]; general=(sin forma)[X] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.titulos.json | `meta.description` | Información sobre los títulos habilitantes expedidos por la Universidad Nacional de Concepción: solicitud, requisitos, plazos y reconocimiento de títulos. | Marandu UNC omboguejy haguã títuloguéra rehegua: ñemomba'e, mba'e oñeikotevẽva, aravo ha título ñemomba'e. | Marandu UNC omboguejy hag̃ua títuloguéra rehegua: ñemomba'e, mba'e oñeikotevẽva, aravo ha título ñemomba'e. | universidad=(sin forma)[B]; concepcion=(sin forma)[B] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.titulos.json | `hero.description` | Información sobre los títulos habilitantes expedidos por la UNC | Marandu UNC omboguejy haguã títuloguéra rehegua | Marandu UNC omboguejy hag̃ua títuloguéra rehegua |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.titulos.json | `graduates.s4.description` | Una vez procesada la solicitud, recibirá notificación para concurrir al retiro del diploma en la Secretaría General. | Oñemboavyva ñemomba'e rire, emoñe'ẽ Secretaría General-pe título emono'õ haguã. | Oñemboavyva ñemomba'e rire, emoñe'ẽ Secretaría General-pe título emono'õ hag̃ua. | general=(sin forma)[X] | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.titulos.json | `recognition.body2` | Para iniciar este proceso, los interesados deben presentar la documentación original debidamente apostillada o legalizada según corresponda, junto con la traducción oficial al idioma español cuando los documentos estén en otro idioma. | Ko tembiapo ñepyrũ haguã, oñeikotevẽ kuatia teete apostillado térã legalizado haguéicha, ha español ñe'ẽme traducción oficial mba'eve ambuépe oĩva reheve. | Ko tembiapo ñepyrũ hag̃ua, oñeikotevẽ kuatia teete apostillado térã legalizado haguéicha, ha español ñe'ẽme traducción oficial mba'eve ambuépe oĩva reheve. |  | bajo | ortografía: «haguã/hagua» → «hag̃ua», «ko'ãga» → «ko'ág̃a» (alfabeto ALG con g̃; notas fila 9) |
| pages.contacto.json | `info.hours.label` | Horario de atención | Mba'apohaguã aravo | Ñepytyvõ aravo |  | alto | corrige «Mba'apohaguã aravo» |
| pages.contacto.json | `info.hours.value` | Lunes a viernes ⏎ 07:00 – 13:00 hs | Arambotÿ – Arambokõi ⏎ 07:00 – 13:00 | Arateĩ guive Arapo peve ⏎ 07:00 – 13:00 hs |  | medio | corrige «Arambotÿ – Arambokõi» (nasal degradada y días que no corresponden a lunes–viernes); nombres de los días a verificar con la ALG |
| pages.marco-legal.json | `hero.softwareNote` | Para abrir los documentos necesita un programa compatible con archivos PDF, DOC y XLS. | Para abrir los documentos necesita un programa compatible con archivos PDF, DOC y XLS. | Kuatia ojepe'a hag̃ua, eikotevẽ programa omoñe'ẽkuaáva PDF, DOC ha XLS. |  | alto |  |
| pages.marco-legal.json | `hierarchy.heading` | Del marco general a la gestión | Del marco general a la gestión | Marco general guive gestión peve | general=(sin forma)[X] | medio |  |
| pages.marco-legal.json | `search.label` | Buscar un documento | Buscar un documento | Eheka peteĩ kuatia |  | medio | eheka (criterio Yvy Marãe'ỹ); kuatia ya usado en el catálogo |
| pages.marco-legal.json | `search.placeholder` | Ej.: becas, posgrado, ética… | Ej.: becas, posgrado, ética… | Techapyrã: becas, posgrado, ética… |  | medio | techapyrã = ejemplo (nota del glosario en «modelo») |
| pages.marco-legal.json | `search.clear` | Borrar búsqueda | Borrar búsqueda | Emopotĩ jeheka |  | alto |  |
| pages.marco-legal.json | `search.statusAll` | {total} documentos en {categories} categorías | {total} documentos en {categories} categorías | {total} kuatia {categories} categoría-pe | categoria=(sin forma)[B] | alto |  |
| pages.marco-legal.json | `search.statusOne` | 1 documento coincide con «{query}» | 1 documento coincide con «{query}» | 1 kuatia ojoja «{query}» rehe |  | alto |  |
| pages.marco-legal.json | `search.statusOther` | {count} documentos coinciden con «{query}» | {count} documentos coinciden con «{query}» | {count} kuatia ojoja «{query}» rehe |  | alto |  |
| pages.marco-legal.json | `search.statusNone` | Ningún documento coincide con «{query}» | Ningún documento coincide con «{query}» | Ndaipóri kuatia ojojáva «{query}» rehe |  | alto |  |
| pages.marco-legal.json | `search.emptyTitle` | No encontramos documentos con «{query}» | No encontramos documentos con «{query}» | Ndorojuhúi kuatia «{query}» reheguáva |  | alto |  |
| pages.marco-legal.json | `search.emptyHint` | Revise la ortografía o pruebe con una palabra del título, como «reglamento» o «posgrado». | Revise la ortografía o pruebe con una palabra del título, como «reglamento» o «posgrado». | Ehecha jey mba'éichapa ehai térã eheka peteĩ ñe'ẽ título-pegua, techapyrã «reglamento» térã «posgrado». | palabra=ñe'ẽ[A] | alto | palabra = ñe'ẽ (A); o = térã (B) |
| pages.marco-legal.json | `search.showAll` | Ver todos los documentos | Ver todos los documentos | Ehecha opaite kuatia |  | medio |  |
| pages.marco-legal.json | `index.label` | Categorías del marco legal | Categorías del marco legal | Marco legal categoría-kuéra | categoria=(sin forma)[B] | medio |  |
| pages.marco-legal.json | `docs.countOne` | 1 documento | 1 documento | 1 kuatia |  | medio |  |
| pages.marco-legal.json | `docs.countOther` | {count} documentos | {count} documentos | {count} kuatia |  | medio |  |
| pages.marco-legal.json | `docs.downloadAria` | Descargar «{title}» ({format}). Se abre en una pestaña nueva. | Descargar «{title}» ({format}). Se abre en una pestaña nueva. | Emboguejy «{title}» ({format}). Ojepe'a tendayke pyahúpe. |  | alto | mboguejy = descargar (uso en localización, sin entrada) |
| pages.marco-legal.json | `docs.dated` | Fecha: {date} | Fecha: {date} | Ára: {date} |  | medio |  |
| pages.marco-legal.json | `categoryDescriptions.ley-creacion` | Ley de la Nación que crea la Universidad Nacional de Concepción. | Ley de la Nación que crea la Universidad Nacional de Concepción. | Tetã Léi omoheñóiva Universidad Nacional de Concepción. | universidad=(sin forma)[B]; concepcion=Concepción[B] | alto |  |
| pages.marco-legal.json | `categoryDescriptions.estatuto` | Norma fundamental que define los fines, el gobierno y la organización de la Universidad. | Norma fundamental que define los fines, el gobierno y la organización de la Universidad. | Norma fundamental ohechaukáva Universidad rembipota, gobierno ha organización. | universidad=(sin forma)[B] | alto |  |
| pages.marco-legal.json | `categoryDescriptions.reglamento-general` | Desarrolla el Estatuto. Cada título regula un ámbito de la vida universitaria. | Desarrolla el Estatuto. Cada título regula un ámbito de la vida universitaria. | Omboheko Estatuto. Título ñavõ omboheko mbo'ehaovusu rekove pehẽ. |  | alto |  |
| pages.marco-legal.json | `categoryDescriptions.reglamentos-especiales` | Reglas de órganos, programas y servicios concretos. | Reglas de órganos, programas y servicios concretos. | Órgano, programa ha pytyvõ concreto rembiapoukapy. |  | alto |  |
| pages.marco-legal.json | `categoryDescriptions.codigos` | Principios de conducta y de buen gobierno. | Principios de conducta y de buen gobierno. | Tekoporã ha buen gobierno rehegua principio. |  | alto |  |
| pages.marco-legal.json | `categoryDescriptions.politicas` | Orientaciones institucionales por área de gestión. | Orientaciones institucionales por área de gestión. | Temimoĩmby orientación gestión área rupi. |  | alto |  |
| pages.marco-legal.json | `categoryDescriptions.planes` | Planes institucionales de mediano plazo y sus proyectos. | Planes institucionales de mediano plazo y sus proyectos. | Temimoĩmby plan mediano plazo-gua ha iproyecto-kuéra. |  | alto |  |
| pages.marco-legal.json | `categoryDescriptions.manuales` | Funciones y buenas prácticas para el trabajo institucional. | Funciones y buenas prácticas para el trabajo institucional. | Función ha práctica porã temimoĩmby rembiapópe g̃uarã. |  | alto |  |
| pages.marco-legal.json | `categoryDescriptions.procedimientos` | Pasos y circuitos administrativos del Rectorado. | Pasos y circuitos administrativos del Rectorado. | Rectorado paso ha circuito administrativo-kuéra. |  | alto |  |
| pages.marco-legal.json | `categoryDescriptions.protocolos` | Protocolos adoptados ante situaciones específicas. | Protocolos adoptados ante situaciones específicas. | Protocolo ojeporúva situación específica-pe. |  | alto |  |
| pages.marco-legal.json | `format.doc` | Documento de Word | Documento de Word | Word kuatia |  | medio |  |
| pages.marco-legal.json | `format.link` | Enlace | Enlace | Joaju |  | medio | joaju ya usado en el catálogo para enlace |
| pages.marco-legal.json | `states.empty` | Todavía no hay documentos publicados en esta sección. Vuelva a consultar más adelante. | Todavía no hay documentos publicados en esta sección. Vuelva a consultar más adelante. | Ko'ág̃a ndaipóri kuatia oñemyasãiva ko pehẽme. Ehecha jey upe rire. |  | alto |  |
| pages.marco-legal.json | `states.unavailable` | Los documentos no están disponibles en este momento. Intente de nuevo en unos minutos. | Los documentos no están disponibles en este momento. Intente de nuevo en unos minutos. | Kuatia ndaipóri ko'ág̃a. Eha'ã jey sapy'ami rire. |  | alto |  |
| pages.convenios.json | `meta.nacional.title` | Convenios nacionales \| Universidad Nacional de Concepción | Convenios nacionales \| Universidad Nacional de Concepción | Convenio nacional-kuéra \| Universidad Nacional de Concepción | universidad=(sin forma)[B]; concepcion=Concepción[B] | medio |  |
| pages.convenios.json | `meta.internacional.title` | Convenios internacionales \| Universidad Nacional de Concepción | Convenios internacionales \| Universidad Nacional de Concepción | Convenio internacional-kuéra \| Universidad Nacional de Concepción | universidad=(sin forma)[B]; concepcion=Concepción[B] | medio |  |
| pages.convenios.json | `hero.title.nacional` | Convenios nacionales | Convenios nacionales | Convenio nacional-kuéra |  | medio |  |
| pages.convenios.json | `hero.title.internacional` | Convenios internacionales | Convenios internacionales | Convenio internacional-kuéra |  | medio |  |
| pages.convenios.json | `hero.intro.nacional` | Acuerdos firmados con ministerios, universidades, municipios, gremios y comercios del país. Cada fila enlaza al documento firmado. | Acuerdos firmados con ministerios, universidades, municipios, gremios y comercios del país. Cada fila enlaza al documento firmado. | Ñe'ẽme'ẽ oñemboheraguapýva ministerio, mbo'ehaovusu, municipio, gremio ha comercio tetãmegua ndive. Fila ñavõ ojoaju kuatia oñemboheraguapývape. | universidad=mbo'ehaovusu[B] | alto | ñemboheraguapy = firma (uso general, sin entrada en el glosario) |
| pages.convenios.json | `hero.intro.internacional` | Acuerdos con universidades e instituciones de otros países para movilidad, investigación y cooperación académica. Cada fila enlaza al documento firmado. | Acuerdos con universidades e instituciones de otros países para movilidad, investigación y cooperación académica. Cada fila enlaza al documento firmado. | Ñe'ẽme'ẽ mbo'ehaovusu ha temimoĩmby ambue tetãmegua ndive movilidad, jeporekapy ha cooperación académica rehe. Fila ñavõ ojoaju kuatia oñemboheraguapývape. | universidad=mbo'ehaovusu[B]; institucion=temimoĩmby[B]; investigacion=jeporekapy[B] | alto | ñemboheraguapy = firma (uso general, sin entrada en el glosario) |
| pages.convenios.json | `hero.summary.nacional` | {count} convenios nacionales · {from}–{to} | {count} convenios nacionales · {from}–{to} | {count} convenio nacional · {from}–{to} |  | medio |  |
| pages.convenios.json | `hero.summary.internacional` | {count} convenios internacionales · {from}–{to} | {count} convenios internacionales · {from}–{to} | {count} convenio internacional · {from}–{to} |  | medio |  |
| pages.convenios.json | `switch.label` | Tipo de convenio | Tipo de convenio | Convenio ñemohenda |  | alto | categoría = ñemohenda (B) |
| pages.convenios.json | `switch.nacional` | Nacionales | Nacionales | Nacional-kuéra |  | medio |  |
| pages.convenios.json | `switch.internacional` | Internacionales | Internacionales | Internacional-kuéra |  | medio |  |
| pages.convenios.json | `chart.heading` | Convenios firmados por año | Convenios firmados por año | Convenio oñemboheraguapýva ary rupi |  | alto | ñemboheraguapy = firma (uso general, sin entrada en el glosario) |
| pages.convenios.json | `chart.yearLink` | {year}: {count} convenios | {year}: {count} convenios | {year}: {count} convenio |  | medio |  |
| pages.convenios.json | `chart.legendInstitutional` | Institucionales | Institucionales | Institucional-kuéra |  | medio |  |
| pages.convenios.json | `chart.legendBenefits` | Beneficios para estudiantes | Beneficios para estudiantes | Temimbo'ekuéra mba'eporã | estudiante=temimbo'e[B] | alto | estudiante = temimbo'e (B) |
| pages.convenios.json | `search.placeholder` | Institución, tema o año | Institución, tema o año | Temimoĩmby, tema térã ary | institucion=temimoĩmby[B] | medio |  |
| pages.convenios.json | `search.emptyHint` | Pruebe con otra palabra, quite un filtro o elija «Todos los años». | Pruebe con otra palabra, quite un filtro o elija «Todos los años». | Eha'ã ambue ñe'ẽ ndive, eipe'a peteĩ filtro térã eiporavo «Opaite ary». | palabra=ñe'ẽ[A] | alto | la cita coincide con filters.allYears |
| pages.convenios.json | `filters.category` | Categoría | Categoría | Ñemohenda | categoria=ñemohenda[B] | medio | B |
| pages.convenios.json | `filters.year` | Año | Año | Ary |  | bajo |  |
| pages.convenios.json | `filters.allYears` | Todos los años | Todos los años | Opaite ary |  | medio |  |
| pages.convenios.json | `categories.institucional` | Institucionales | Institucionales | Institucional-kuéra |  | medio |  |
| pages.convenios.json | `categories.beneficios` | Beneficios para estudiantes | Beneficios para estudiantes | Temimbo'ekuéra mba'eporã | estudiante=temimbo'e[B] | alto |  |
| pages.convenios.json | `badge.beneficios` | Beneficio estudiantil | Beneficio estudiantil | Temimbo'e mba'eporã |  | alto |  |
| pages.convenios.json | `index.label` | Ir al año | Ir al año | Eho arýpe |  | medio |  |
| pages.convenios.json | `columns.title` | Denominación | Denominación | Téra |  | medio |  |
| pages.convenios.json | `columns.parties` | Instituciones participantes | Instituciones participantes | Temimoĩmby oikéva | institucion=temimoĩmby[B] | alto |  |
| pages.convenios.json | `columns.signed` | Fecha de firma | Fecha de firma | Ñemboheraguapy ára |  | alto | ñemboheraguapy = firma (uso general, sin entrada en el glosario) |
| pages.convenios.json | `columns.duration` | Duración | Duración | Ipukukue |  | alto |  |
| pages.convenios.json | `columns.objective` | Finalidad | Finalidad | Jehupytyrã |  | medio | objetivo = jehupytyrã (B) |
| pages.convenios.json | `table.caption.nacional` | Convenios nacionales agrupados por año de firma, del más reciente al más antiguo | Convenios nacionales agrupados por año de firma, del más reciente al más antiguo | Convenio nacional-kuéra ary ñemboheraguapy rupi, ipyahuvéva guive itujavéva peve |  | alto |  |
| pages.convenios.json | `table.caption.internacional` | Convenios internacionales agrupados por año de firma, del más reciente al más antiguo | Convenios internacionales agrupados por año de firma, del más reciente al más antiguo | Convenio internacional-kuéra ary ñemboheraguapy rupi, ipyahuvéva guive itujavéva peve |  | alto |  |
| pages.convenios.json | `table.countOther` | {count} convenios | {count} convenios | {count} convenio |  | medio |  |
| pages.convenios.json | `table.notRecorded` | Sin dato | Sin dato | Ndaipóri marandu |  | medio |  |
| pages.convenios.json | `table.noObjective` | Sin finalidad registrada | Sin finalidad registrada | Ndaipóri jehupytyrã oñeñongatúva |  | alto |  |
| pages.convenios.json | `states.unavailable` | No pudimos cargar los convenios en este momento. Vuelva a intentarlo en unos minutos. | No pudimos cargar los convenios en este momento. Vuelva a intentarlo en unos minutos. | Ndaikatúi rohechauka convenio-kuéra ko'ág̃a. Eha'ã jey sapy'ami rire. |  | alto |  |
| pages.convenios.json | `info.title` | ¿Su institución quiere firmar un convenio? | ¿Su institución quiere firmar un convenio? | ¿Nde temimoĩmby oipota oñemboheraguapy peteĩ convenio? | institucion=temimoĩmby[B] | alto |  |
| pages.convenios.json | `info.description` | Para proponer un convenio de cooperación, escríbanos con el objeto del acuerdo y los datos de contacto de su institución. | Para proponer un convenio de cooperación, escríbanos con el objeto del acuerdo y los datos de contacto de su institución. | Convenio cooperación rehegua ejerure hag̃ua, ehai oréve convenio jehupytyrã ha nde temimoĩmby ñomongeta rehegua marandu ndive. | proponer=jerure[A]; datos=(sin forma)[B]; institucion=temimoĩmby[B] | alto | proponer = jerure (A) |
| pages.convenios.json | `info.cta` | Contactar a la UNC | Contactar a la UNC | Eñomongeta UNC ndive |  | medio |  |
| pages.noticias.json | `pageTitle` | Noticias - Universidad Nacional de Concepción | Noticias - Universidad Nacional de Concepción | Marandu - Universidad Nacional de Concepción | universidad=(sin forma)[B]; concepcion=Concepción[B] | bajo |  |
| pages.noticias.json | `pageDescription` | Novedades y comunicados institucionales de la UNC. | Novedades y comunicados institucionales de la UNC. | UNC marandu pyahu ha comunicado institucional-kuéra. |  | medio |  |
| pages.noticias.json | `heading` | Noticias | Noticias | Marandu |  | bajo | igual que el menú |
| pages.noticias.json | `subheading` | Novedades y comunicados de la Universidad Nacional de Concepción | Novedades y comunicados de la Universidad Nacional de Concepción | Universidad Nacional de Concepción marandu pyahu ha comunicado-kuéra | universidad=(sin forma)[B]; concepcion=Concepción[B] | medio |  |
| pages.noticias.json | `empty` | No hay noticias disponibles en este momento. | No hay noticias disponibles en este momento. | Ko'ág̃a ndaipóri marandu. |  | medio |  |
| pages.noticias.json | `home` | Inicio | Inicio | Ñepyrũ |  | bajo |  |
| pages.noticias.json | `gallery` | Galería | Galería | Ta'ãngakuéra |  | medio |  |
| pages.noticias.json | `backToNews` | Ver más noticias | Ver más noticias | Ehecha hetave marandu |  | medio |  |
| pages.noticias.json | `draftBanner` | Vista previa — esta noticia no está publicada | Vista previa — esta noticia no está publicada | Jehecha ypy — ko marandu ndojeikuaaukái gueteri |  | alto |  |
| pages.noticias.json | `draftExit` | Salir del preview | Salir del preview | Esẽ jehecha ypýgui |  | alto |  |
| pages.noticias.json | `categories.institucional` | Institucional | Institucional | Temimoĩmby |  | medio | institución = temimoĩmby (B) |
| pages.noticias.json | `categories.investigacion` | Investigación | Investigación | Jeporekapy | investigacion=jeporekapy[B] | bajo | B |
| pages.noticias.json | `categories.eventos` | Eventos | Eventos | Evento-kuéra |  | medio |  |
| pages.noticias.json | `categories.comunicados` | Comunicados | Comunicados | Comunicado-kuéra |  | medio |  |
| pages.buscar.json | `pageTitleDefault` | Buscar — Universidad Nacional de Concepción | Buscar — Universidad Nacional de Concepción | Eheka — Universidad Nacional de Concepción | universidad=(sin forma)[B]; concepcion=Concepción[B] | bajo |  |
| pages.buscar.json | `pageTitleQuery` | Búsqueda: "{q}" — UNC | Búsqueda: "{q}" — UNC | Jeheka: "{q}" — UNC |  | medio |  |
| pages.buscar.json | `pageDescription` | Buscar noticias y contenido en el portal de la Universidad Nacional de Concepción. | Buscar noticias y contenido en el portal de la Universidad Nacional de Concepción. | Eheka marandu ha tetepy Universidad Nacional de Concepción portal-pe. | universidad=(sin forma)[B]; concepcion=Concepción[B] | alto |  |
| pages.buscar.json | `headingExplore` | Explorar noticias | Explorar noticias | Ehecha marandu |  | medio |  |
| pages.buscar.json | `headingResults` | Resultados para | Resultados para | Ojejuhúva | resultado=ojehupytýva[B] | medio | resultado = ojehupytýva / ojejuhúva (B) |
| pages.buscar.json | `resultsSingular` | resultado | resultado | ojejuhúva | resultado=ojehupytýva[B] | medio |  |
| pages.buscar.json | `resultsPlural` | resultados | resultados | ojejuhúva | resultado=ojehupytýva[B] | medio | el guaraní no marca plural aquí |
| pages.buscar.json | `searchPlaceholder` | Buscar noticias... | Buscar noticias... | Eheka marandu... |  | bajo |  |
| pages.buscar.json | `searchAriaLabel` | Buscar en el portal | Buscar en el portal | Eheka portal-pe |  | bajo |  |
| pages.buscar.json | `searchButton` | Buscar | Buscar | Eheka |  | bajo |  |
| pages.buscar.json | `noResults` | No encontramos resultados para "{query}" | No encontramos resultados para "{query}" | Ndorojuhúi mba'eve "{query}" rehe | resultado=(sin forma)[B] | alto |  |
| pages.buscar.json | `noResultsHint` | Intentá con otras palabras | Intentá con otras palabras | Eha'ã ambue ñe'ẽ ndive | palabra=ñe'ẽ[A] | medio |  |
| pages.buscar.json | `viewAllNews` | Ver todas las noticias | Ver todas las noticias | Ehecha opaite marandu |  | medio |  |
| pages.buscar.json | `sectionNews` | Noticias | Noticias | Marandu |  | bajo |  |
| pages.solicitar-titulo.json | `pageTitle` | Solicitar Título — UNC | Solicitar Título — UNC | Ejerure Título — UNC |  | medio | solicitar = jerure (A) |
| pages.solicitar-titulo.json | `pageDescription` | Solicita la gestión de tu título universitario en la Universidad Nacional de Concepción a través del formulario oficial. | Solicita la gestión de tu título universitario en la Universidad Nacional de Concepción a través del formulario oficial. | Ejerure nde título universitario gestión Universidad Nacional de Concepción-pe formulario oficial rupive. | universidad=(sin forma)[B]; concepcion=Concepción[B] | alto |  |
| pages.solicitar-titulo.json | `heading` | Solicitud de Título Universitario | Solicitud de Título Universitario | Título Universitario jerure |  | medio |  |
| pages.solicitar-titulo.json | `description` | Iniciá el proceso de gestión de tu diploma universitario de forma online a través del formulario oficial de la Universidad Nacional de Concepción. | Iniciá el proceso de gestión de tu diploma universitario de forma online a través del formulario oficial de la Universidad Nacional de Concepción. | Emoñepyrũ nde diploma universitario gestión online formulario oficial Universidad Nacional de Concepción-pegua rupive. | universidad=(sin forma)[B]; concepcion=Concepción[B] | alto |  |
| pages.solicitar-titulo.json | `ctaLabel` | Iniciar ahora | Iniciar ahora | Emoñepyrũ ko'ág̃a |  | medio |  |
| pages.solicitar-titulo.json | `ctaHeading` | ¿Listo para solicitar tu título? | ¿Listo para solicitar tu título? | ¿Ndesako'ípa ejerure hag̃ua nde título? |  | alto |  |
| pages.solicitar-titulo.json | `ctaNote` | Este formulario abre en Google Forms en una nueva pestaña. | Este formulario abre en Google Forms en una nueva pestaña. | Ko formulario ojepe'a Google Forms-pe, tendayke pyahúpe. |  | alto |  |
| pages.solicitar-titulo.json | `ctaButton` | Iniciar solicitud | Iniciar solicitud | Emoñepyrũ jerure |  | medio |  |
| pages.solicitar-titulo.json | `processHeading` | Proceso de solicitud | Proceso de solicitud | Jerure rape |  | alto |  |
| pages.solicitar-titulo.json | `steps.step01.title` | Completá el formulario | Completá el formulario | Emyenyhẽ formulario |  | medio |  |
| pages.solicitar-titulo.json | `steps.step01.description` | Ingresá tus datos personales y la información de tu carrera. | Ingresá tus datos personales y la información de tu carrera. | Emoinge nde marandu personal ha nde carrera rehegua marandu. | datos=(sin forma)[B]; carrera=carrera[B] | alto | carrera (B) |
| pages.solicitar-titulo.json | `steps.step02.title` | Adjuntá la documentación | Adjuntá la documentación | Emoirũ kuatia |  | alto |  |
| pages.solicitar-titulo.json | `steps.step02.description` | Cédula de identidad, certificado de egreso y demás documentos requeridos según tu facultad. | Cédula de identidad, certificado de egreso y demás documentos requeridos según tu facultad. | Cédula de identidad, certificado de egreso ha ambue kuatia oñeikotevẽva nde facultad he'iháicha. |  | alto | según = he'iháicha (B) |
| pages.solicitar-titulo.json | `steps.step03.description` | Recibirás notificaciones sobre el estado de tu solicitud a través del correo registrado. | Recibirás notificaciones sobre el estado de tu solicitud a través del correo registrado. | Rehupytýta marandu nde jerure rehegua correo emoĩ vaekuépe. |  | alto |  |
| pages.solicitar-titulo.json | `steps.step04.title` | Retiro del título | Retiro del título | Título ñeme'ẽ |  | alto |  |
| pages.solicitar-titulo.json | `steps.step04.description` | Una vez aprobado, te notificaremos la fecha y lugar de entrega de tu diploma universitario. | Una vez aprobado, te notificaremos la fecha y lugar de entrega de tu diploma universitario. | Oñemboaje rire, romomarandúta ndéve ára ha tenda oñeme'ẽtaha nde diploma universitario. |  | alto |  |
