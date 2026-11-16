# FAC-02 — Datos verificados de la Facultad de Ciencias Agrarias

**Estado:** datos y pruebas listos en local, sin commit, sin escritura en el CMS. **Artefactos:** `scripts/lib/agrariasSeedData.mjs`,
`tests/unit/fac02-agrarias-seed.spec.ts`, `docs/research/evidence-register-fac02-agrarias.md`. **Siguiente paso (no hecho):** guion de
siembra (`seed-agrarias`, copia de `seed-odontologia.mjs` con este módulo) y conversión de `app/[locale]/facultades/agrarias/page.tsx`
a los componentes `components/facultades/*`.

## 1. Fuentes (consultadas el 28-10-26)

| Id | Fuente | Cómo se leyó |
|---|---|---|
| S1 | `https://www.unc.edu.py/facultad-de-ciencias-agrarias/` (carreras, Res. CONES con enlaces, aranceles, contacto) | lectura en vivo + página `facultad-de-ciencias-agrarias` del volcado WP local (coinciden) |
| S2 | `https://www.fca-unc.edu.py/` (sitio de la facultad: siglas FCA, dirección, teléfono, correo, Facebook) | lectura en vivo |
| S3 | `https://www.fca-unc.edu.py/pages/historia/` | lectura en vivo (resumida por un modelo auxiliar; solo se usan hechos que confirma otra fuente) |
| S4 | `https://www.unc.edu.py/tramites/` (duración y título de cada programa) | solo volcado WP local; no re-consultada en vivo |
| — | ANEAES `aneaes.gov.py` | la lista de carreras acreditadas es una tabla dinámica en `ideas.aneaes.gov.py:8080` que no se pudo leer (error SSL de la herramienta): sin dato |

El volcado XML no se copia al repositorio. Solicitudes HTTP: ver el registro RDD.

## 2. Afirmación por afirmación (página y mensajes actuales → veredicto)

| # | Afirmación actual | Veredicto | Evidencia |
|---|---|---|---|
| 1 | Subtítulo «Programas de formación de grado acreditados por el CONES» | **Falsa**: el CONES habilita, la ANEAES acredita | `PREMIOS-ACREDITACIONES.md`; S1 titula la columna «Res. CONES» |
| 2 | Los 23 aranceles de la página (`ARANCELES`): Matrícula Grado 400.000, Cuota mensual 100.000, Cuota Maestría 700.000, Defensa de tesis 1.000.000, Usufructo de laboratorio 450.000, Prácticas de campo 350.000, etc. | **Contradicha en su mayoría**: la lista es casi la de Odontología (mismos conceptos y montos: Multas 10.000, Constancias 50.000, Formulario 300.000, Derecho de examen 50.000/60.000/70.000, Solicitud de cambio 300.000, Reincorporación 500.000, Usufructo 450.000). Los aranceles de S1 son otros (p. ej. constancias 40.000, examen 1.ª oportunidad 20.000, cuota maestría 550.000). «Prácticas de Campo (por semestre) 350.000», «Cuota Recursante» y «Reincorporación» **no existen** en S1 | S1 vs. `odontologiaSeedData.mjs` |
| 3 | Frase «Valores vigentes según resolución institucional» | **No verificable**: S1 no cita resolución ni fecha | S1 |
| 4 | Carreras de grado: Ingeniería Agronómica 556/16; Adm. Agropecuaria Horqueta 557/16; Agronegocios 563/16; Fuerte Olimpo 372/21; Yby Yau 375/21 | **Verificadas** (S1). Omite la rectificación CONES N.º 248/21 de Horqueta | S1 |
| 5 | Posgrado: Maestría en Producción Vegetal 562/16; Maestría en Zootecnia 992/19; Especialización en Fertilidad del Suelo 553/22 | **Verificadas** (S1) | S1 |
| 6 | Sedes (Central/Concepción, Horqueta, Fuerte Olimpo, Yby Yau) | **Verificadas**. Nota: S1 escribe «Administración Agropecuarios» (error de tipeo) en Fuerte Olimpo y Yby Yau | S1 |
| 7 | Tagline «Formando profesionales para el desarrollo agropecuario sostenible del Paraguay» | **No verificable** como lema oficial (S2 usa «Ciencia, tecnología y desarrollo rural sostenible») | S2 |
| 8 | Dirección «Campus Universitario: Ruta Py05, Km 210, Concepción» | **Verificada** (S1; S2: «Ruta PY05 … Km. 210»). La página UNC «Contactos por dependencia» dice «Ruta V Gral. Bernardino Caballero Km 2» para todas las facultades: inconsistencia del sitio oficial, a corregir por la UNC | S1, S2, volcado `contactos-por-dependencia` |
| 9 | Teléfono «(595 331) 241813 / 241069 / 240883» | **Parcial**: 241813 verificado (S1, S2). 241069 y 240883 figuran en el pie del portal UNC junto a `secgral@unc.edu.py`, o sea, son institucionales: **no verificados como de la FCA** | S1 (pie) |
| 10 | Correos `secgralfcaunc@gmail.com`, `fca-unc@fca-unc.edu.py` | **Verificados** (S1). El enlace «correo» de S2 apunta a `info@test.com` (placeholder del sitio): no usar | S1, S2 |
| 11 | Web `www.fca-unc.edu.py` | **Verificada** (S1, S2) | S1, S2 |
| 12 | Número de carreras / «5 de grado, 3 de posgrado» | **Verificado** (S1) | S1 |
| 13 | Decano | No está en la página; ver §4 | — |

## 3. Datos verificados que la página actual no traía

**Procedencia de `duracion` y `titulo` de las carreras: S4 (`https://www.unc.edu.py/tramites/`), leída solo del volcado WP local, NO en vivo.**
No se guarda por fila en el módulo (el CMS descarta claves que su colección no define y la siembra no convergería); la guardia de
`fac02-agrarias-seed.spec.ts` lo impide.

- Duración y título de cada programa (S4): Ingeniería Agronómica 5 años, «Ingeniero Agrónomo»; las dos licenciaturas 4 años; maestrías 2 años,
  «Magister Scientiae en …»; Especialización 9 meses, «Especialista en Fertilidad del Suelo y Nutrición de Plantas» (no cabe en
  `duracion`, que exige 1–12 años: queda vacía).
- Resolución CONES N.º 248/21 (rectificación) de Horqueta (S1).
- Historia mínima (S3): Ley 3201 del 4-5-2007; una de las tres unidades iniciales; primera carrera Ingeniería Agronómica.
- Facebook `cienciasagrarias.unc.5` (S2).
- Siglas FCA (S2).

## 4. Decano

Fuente oficial (UNC, página «Autoridades»): **Prof. Ing. Agr. Derlys Fernando López Avalos**, Decano de la Facultad de Ciencias Agrarias.
`scripts/lib/autoridadesSeedData.mjs` ya lo define (`type: decano`, `facultadSlug: facultad-de-ciencias-agrarias`); no se consultó la tabla
`autoridades` de la BD (prohibido tocar BD): el PO debe confirmar que la fila existe y está activa. No se incluye en el módulo.
(Noticia de 2019: el decano de entonces era el Ing. Agr. Cornelio Vázquez Torres: dato histórico, no vigente.)

## 5. Decisiones de modelado

- Los 4 grupos de aranceles del CMS (multas, venta, servicios, médicos) no coinciden con los 6 encabezados de S1. «Venta de Bienes
  Forestales» va en `venta`; «Aranceles Educativos», «Análisis Laboratoriales» y «Alquileres Varios» en `servicios`. El encabezado
  original queda en `nota`. Alternativa: ampliar el enum (decisión del PO/arquitectura).
- Se **omiten** 3 aranceles de S1 con asterisco sin explicación: «Matrícula Curso de Grado (**)» 300.000, «Matrícula Curso de Grado (*)»
  400.000 y «Derecho de examen de ingreso (*)» 200.000. S1 no dice qué significan (¿turno? ¿sede?), y publicar «(*)» confunde.
- Fuerte Olimpo y Yby Yau reciben duración y título del programa «Licenciatura en Administración Agropecuaria» de S4, que no
  distingue sede. Por confirmar con Secretaría Académica.
- Nombre corregido: «Licenciatura en Administración Agropecuaria» (S1 trae «Agropecuarios» en dos filas).

## 6. Brechas para el Product Owner

| # | Qué falta | Quién |
|---|---|---|
| G1 | **Vigencia de los aranceles** (S1 no da fecha ni resolución) y qué significan (*) y (**) | Dirección Administrativa de la FCA |
| G2 | **Acreditaciones ANEAES**: la noticia oficial de la UNC (06-02-2019) dice que la ANEAES acreditó la Licenciatura en Administración Agropecuaria (Horqueta) por Res. N.º 477 del 12-12-2018, pero no da vigencia y no se pudo contrastar con ANEAES. Sin fuente ANEAES no se afirma. Faltan además Ingeniería Agronómica y Agronegocios | Aseguramiento de la Calidad / FCA: resolución y vigencia oficiales |
| G3 | Historia aprobada (S3 menciona la Res. 174/09 del Consejo Universitario, 17-6-2009, que aprueba la Lic. en Adm. Agropecuaria de Horqueta; no incluida por venir de un resumen automático). Fecha de inicio de Agronegocios, Fuerte Olimpo, Yby Yau y posgrados | FCA |
| G4 | Modalidad de cada carrera; perfil de egreso aprobado (hay textos en S4, no sembrados) | Secretaría Académica |
| G5 | Contacto de la Filial Horqueta (dato solo en el volcado: Av. Capitán Gumercindo Sosa c/ Ruta V; (595 332) 222133) y de Fuerte Olimpo / Yby Yau: no hay campo por sede | FCA |
| G6 | Teléfonos adicionales (241069 / 240883): ¿son de la FCA? | FCA |
| G7 | Fotografía de portada y logo (ya existe `public/images/facultades/agrarias.png`; falta autorizar uso) | PO |
| G8 | Redes: solo se halló Facebook; ¿hay Instagram/X/YouTube oficiales? | FCA |
| G9 | Duración de la Especialización (9 meses): ampliar el campo `duracion` o texto libre | Arquitectura |
| G10 | Corregir en el sitio UNC: dirección «Km 2» en Contactos por dependencia y «Agropecuarios» en dos filas | Comunicación UNC |
| G11 | Confirmar que el decano existe activo en `autoridades` | PO |

## 7. Rollback

Archivos nuevos: borrarlos revierte todo; el módulo no se importa desde ningún guion todavía.
