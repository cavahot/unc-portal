# Registro RDD — FAC-02 (datos de la Facultad de Ciencias Agrarias)

**Estado:** 28-10-26. Mismo formato que `evidence-register-premios.md`. Spec: `docs/specs/portal/FACULTAD-AGRARIAS-DATOS.md`. Sin datos personales de
usuarios; el volcado WP (`m1gr4unc_dbWP.xml`) se leyó en solo lectura y no se copia. Solicitudes HTTP: 7 de lectura (www.unc.edu.py 1, www.fca-unc.edu.py 2,
www.aneaes.gov.py 3 [inicio con redirección, listado y re-intento], ideas.aneaes.gov.py 1 con error SSL) y 2 búsquedas web; sin bloqueos ni tiempos agotados.

| ID | Afirmación | Evidencia primaria | Alcance / limitación | Estado |
|---|---|---|---|---|
| RDD-FAC02-01 | La FCA tiene 5 carreras de grado (4 programas, 3 de ellos en Horqueta/Fuerte Olimpo/Yby Yau) y 3 de posgrado con las Res. CONES 556/16, 557/16 (+248/21), 563/16, 372/21, 375/21, 562/16, 992/19, 553/22. | S1 en vivo y página 772 del volcado (coinciden) | El número no se contrastó con el CONES | Observado |
| RDD-FAC02-02 | Los aranceles de la página `agrarias` actual son en su mayoría los de Odontología. | `page.tsx` l. 19-52 vs `odontologiaSeedData.mjs` vs S1 | Origen de la copia: hipótesis | Observado; causa = Hipótesis |
| RDD-FAC02-03 | S1 publica 34 aranceles en 6 encabezados, sin vigencia ni resolución; 3 llevan (*) o (**) sin nota. | S1 | — | Observado |
| RDD-FAC02-04 | Duración y título de los programas están en S4 (`tramites`). | volcado, página 703 | Duración y título de `carreras` proceden SOLO de S4, leída del volcado, no en vivo; sin marca por fila en el módulo (el CMS descartaría la clave). La Especialización dura 9 meses | Observado |
| RDD-FAC02-05 | La Lic. en Adm. Agropecuaria (Horqueta) fue acreditada por la ANEAES, Res. 477 del 12-12-2018. | Noticia UNC 06-02-2019 (volcado, id 23787) | Fuente secundaria (UNC); sin vigencia; ANEAES no consultable (tabla dinámica). No se siembra | Observado (UNC); acreditación vigente = Hipótesis |
| RDD-FAC02-06 | El Km de la dirección es 210 (Ruta Py05), no 2. | S1 y S2 coinciden; «Contactos por dependencia» dice Km 2 para todas las facultades | Dato de contacto institucional contradictorio | Observado |
| RDD-FAC02-07 | El correo del encabezado de S2 apunta a `info@test.com`. | S2 | Lectura resumida | Observado |
| RDD-FAC02-08 | Historia: Ley 3201 (4-5-2007), tres unidades iniciales, primera carrera Ingeniería Agronómica. | S3; Ley 3201 coincide con `founc.edu.py/sobre-founc/` (FAC-01 S3) | S3 leída con resumen automático: Res. 174/09 no incluida | Observado |
| RDD-FAC02-09 | Decano actual: Prof. Ing. Agr. Derlys Fernando López Avalos. | Página «Autoridades» (volcado, fechada 26-10-2025) y `autoridadesSeedData.mjs` | Estado en la BD no consultado | Observado |
| RDD-FAC02-10 | Duración/título de Fuerte Olimpo y Yby Yau son los del programa general. | S4 no distingue sede | Inferencia | Hipótesis |
| RDD-FAC02-11 | El enum de grupos del CMS (4) no representa los 6 encabezados de S1. | `ArancelesFacultad.ts` l. 14-17 vs S1 | — | Observado |
| RDD-FAC02-12 | Una clave del módulo que la colección no define (`sourceUrlExtra`) hacía que la siembra no convergiera (Payload la descarta y el guion ve el campo «vacío»). | Hallazgo del 28-10-26 al re-ejecutar; guardia en `fac02-agrarias-seed.spec.ts` (también sobre Odontología: sin violaciones) | Guardia lee los `name:` de `Carreras.ts`/`Facultades.ts`/`ArancelesFacultad.ts` (incluye subcampos) | Observado |
