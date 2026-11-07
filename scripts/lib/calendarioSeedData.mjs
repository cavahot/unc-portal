// INST-07: fechas de /calendario-academico publicadas hasta ahora en messages/es/pages.calendario-academico.json, convertidas
// de forma programática (no retranscritas) a fechas reales para sembrar la colección `calendario-academico` del CMS.
// ATENCIÓN: estas fechas NO tienen una fuente verificable en el repositorio y el texto original las llamaba «orientativas».
// Secretaría Académica debe confirmarlas antes de publicar. Fuente de verdad desde la siembra: el CMS; este archivo solo
// sirve para cargar el contenido inicial (scripts/seed-calendario.mjs) y nunca lo importa el portal.
export const CALENDARIO_SEED = [
  {
    "titulo": "1er Semestre 2026",
    "tipo": "semestre",
    "anio": 2026,
    "orden": 1,
    "entradas": [
      {
        "evento": "inicio-clases",
        "inicio": "2026-03-02"
      },
      {
        "evento": "inscripcion-tardia",
        "inicio": "2026-03-16",
        "fin": "2026-03-27"
      },
      {
        "evento": "parciales-1",
        "inicio": "2026-05-05",
        "fin": "2026-05-16"
      },
      {
        "evento": "parciales-2",
        "inicio": "2026-06-23",
        "fin": "2026-07-04"
      },
      {
        "evento": "cierre-semestre",
        "inicio": "2026-07-11"
      }
    ]
  },
  {
    "titulo": "2do Semestre 2026",
    "tipo": "semestre",
    "anio": 2026,
    "orden": 2,
    "entradas": [
      {
        "evento": "inicio-clases",
        "inicio": "2026-08-03"
      },
      {
        "evento": "inscripcion-tardia",
        "inicio": "2026-08-17",
        "fin": "2026-08-28"
      },
      {
        "evento": "parciales-1",
        "inicio": "2026-10-05",
        "fin": "2026-10-16"
      },
      {
        "evento": "parciales-2",
        "inicio": "2026-11-23",
        "fin": "2026-12-04"
      },
      {
        "evento": "cierre-semestre",
        "inicio": "2026-12-11"
      }
    ]
  },
  {
    "titulo": "Mesas de exámenes finales",
    "tipo": "examenes",
    "anio": 2026,
    "orden": 3,
    "entradas": [
      {
        "inicio": "2025-12-01",
        "fin": "2025-12-19"
      },
      {
        "inicio": "2026-02-02",
        "fin": "2026-02-20"
      },
      {
        "inicio": "2026-07-14",
        "fin": "2026-08-01"
      },
      {
        "inicio": "2026-12-01",
        "fin": "2026-12-19"
      }
    ]
  }
]
