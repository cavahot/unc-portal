// GENERADO por scripts/lib/generate-glosario-gn-seed.mjs — no editar a mano (GLO-GN-01).
// Procedencia: glosario_es_gn.csv (glosario del PO), fecha de consulta 2026-10-11, 128 filas,
// sha256 1876ce99cafcd0b7e5d67790ab629538e8d7ad0623270e0a46b2e7af11db5881. Filas con ortografía normalizada (NFC / puso único): 1.
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §3. Regenerar: node scripts/lib/generate-glosario-gn-seed.mjs --csv <ruta>

/** Metadatos de procedencia del dataset. */
export const GLOSARIO_GN_META = Object.freeze({
  "fileName": "glosario_es_gn.csv",
  "fecha": "2026-10-11",
  "filas": 128,
  "sha256": "1876ce99cafcd0b7e5d67790ab629538e8d7ad0623270e0a46b2e7af11db5881",
  "normalizadas": 1
})

/** Entradas del glosario del PO en la forma de la colección `glosario-guarani`. */
export const GLOSARIO_GN_SEED = Object.freeze([
  {
    "terminoEs": "pandemia",
    "terminoGn": "pandemia",
    "variantesGn": [
      {
        "valor": "mba'asypavẽ"
      },
      {
        "valor": "mba'asy vai"
      }
    ],
    "tipo": "prestamo",
    "fuente": "Jojajovai (subsets abc y spl)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Prestamo directo muy frecuente en prensa y textos de la SPL (jopara/jehe'a). 'mba'asypavẽ' aparece una sola vez en el subset spl alineado con 'terminologia juridica en tiempo de pandemia' (alineacion no segura). Sin entrada en el vocabulario SPL (solo 'epidemia = mba'asyguasu ; tasysarambi').",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "COVID-19",
    "terminoGn": "covid-19",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Jojajovai (subset spl)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Sigla se conserva; el subset spl escribe 'mba'asy vaiete covid-19'. No hay forma guarani normada.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "epidemia",
    "terminoGn": "mba'asyguasu",
    "variantesGn": [
      {
        "valor": "tasysarambi"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Solo como referencia para 'pandemia'; no equivale exactamente.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "virtualización",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Sin ocurrencias en Jojajovai ni entrada en vocabulario SPL. Ver lagunas.md."
  },
  {
    "terminoEs": "virtual",
    "terminoGn": "yvytureguánte",
    "variantesGn": [
      {
        "valor": "ikatuva'erãva"
      },
      {
        "valor": "gua'u"
      },
      {
        "valor": "yvytupepo rupive"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Diccionario informatico bilingue castellano-guarani (Yvy Marãe'ỹ/CONACYT 2017)",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'yvytureguánte' glosa 'lo que solo existe dentro de la computadora'. Las variantes del vocabulario SPL ('ikatuva'erãva') significan 'potencial' y no sirven para tecnologia. 'yvytupepo rupive' (Jojajovai libro_gn) tiene alineacion dudosa. En textos SPL se evita el adjetivo con perifrasis: 'tembipurupyahu rupive' (por medio de herramienta tecnologica).",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "entorno",
    "terminoGn": "jere",
    "variantesGn": [],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Sentido de 'alrededores'; no cubre 'entorno virtual'.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "entorno de aprendizaje",
    "terminoGn": "ijereregua jehekombo'e",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Una sola aparicion (traduccion de 'Pedagogia y entornos de aprendizaje'); sin respaldo normativo.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "entorno virtual de aprendizaje",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Ver lagunas.md. La sigla EVA no tiene forma guarani."
  },
  {
    "terminoEs": "plataforma",
    "terminoGn": "tembipurupyahu",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset spl)",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Usado por la SPL para 'plataforma Zoom/herramienta'. Sentido amplio de 'herramienta nueva'; verificar con ALG.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "enseñanza",
    "terminoGn": "tekombo'e",
    "variantesGn": [
      {
        "valor": "mbo'ereko"
      },
      {
        "valor": "porombo'e"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Entrada del vocabulario SPL. 'Enseñanza de la lengua = ñe'ẽ ñembo'euka' (Jojajovai libro_gn). Termino con enye en la tesis: 'enseñanza'.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "enseñar",
    "terminoGn": "mbo'e",
    "variantesGn": [
      {
        "valor": "hekombo'e"
      },
      {
        "valor": "kuaauka"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py) y libro Yvy Marãe'ỹ",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "SPL da 'hekombo'e ; kuaauka'; el libro de Yvy Marãe'ỹ explica 'mbo'e = enseñar' (base de mbo'ehao y mbo'ehára).",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "aprendizaje",
    "terminoGn": "ñehekombo'e",
    "variantesGn": [
      {
        "valor": "jehekombo'e"
      },
      {
        "valor": "ñemoarandu"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario) y vocabulario SPL",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'ñehekombo'e rupive' traduce 'aprendizaje' en el seminario. 'ñemoarandu' es 'estudiar' en SPL. Sin entrada SPL para 'aprendizaje'.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "estudiar",
    "terminoGn": "ñemoarandu",
    "variantesGn": [
      {
        "valor": "jetavy'o"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "educación",
    "terminoGn": "tekombo'e",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subsets seminario y libro_gn); Veron 2016",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Tambien nombre del ministerio: 'Tekombo'e ha Arandupy Motenondeha' (MEC) en Veron 2016. La SPL usa 'EDUCACIÓN' en español en titulares. Sin entrada propia en SPL (solo enseñanza).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "educación superior",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "institucional",
    "fuente": "Sin evidencia fija",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "El subset spl traduce 'en la educación superior' como 'mbo'ehaovusúpe' (contexto) y conserva 'EDUCACIÓN SUPERIOR' en español en un titular. Ver lagunas.md."
  },
  {
    "terminoEs": "escuela",
    "terminoGn": "mbo'ehao",
    "variantesGn": [],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL; libro Yvy Marãe'ỹ",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Compuesto mbo'e + ha + o. El libro Yvy Marãe'ỹ lo cita como neologismo con 'sancion de uso'.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "universidad",
    "terminoGn": "mbo'ehaovusu",
    "variantesGn": [
      {
        "valor": "mbo'ehaorusu"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (libro_gn y seminario); Wikipedia gn",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Tres fuentes humanas coinciden. 'Universidad Nacional de Asunción' se conserva en español en la propia prensa guarani (Universidad Nacional de Asunción-pe). Nombres de instituciones: ver notas_ortografia.md.",
    "evidenciaUrl": "https://gn.wikipedia.org/wiki/Mbo%27ehaovusu"
  },
  {
    "terminoEs": "universidad pública",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'Instituciones públicas = tetã remimoĩmby' (Jojajovai libro_gn); no hay combinacion documentada con universidad."
  },
  {
    "terminoEs": "instituciones públicas",
    "terminoGn": "tetã remimoĩmby",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset libro_gn); Veron 2016",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Veron 2016 glosa 'tetã remimoĩmby (institución)'.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "institución",
    "terminoGn": "temimoĩmby",
    "variantesGn": [
      {
        "valor": "tetã remimoĩmby"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subsets libro_gn seminario spl); Veron 2016",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Varias fuentes humanas coinciden.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "carrera universitaria",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "El subset seminario conserva 'carrera' como prestamo ('heta carrera-pe'). 'ñeñani/ñani' del vocabulario SPL significa 'carrera' deportiva y no sirve."
  },
  {
    "terminoEs": "carrera",
    "terminoGn": "carrera",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Prestamo con sufijo guion: 'carrera-pe'. Sentido deportivo en SPL: ñeñani/ñani (no aplicable).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "informática",
    "terminoGn": "informática",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Libro Yvy Marãe'ỹ/CONACYT 2017; Jojajovai libro_gn",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "El propio libro guarani de Yvy Marãe'ỹ usa 'informática'. Equivalente descriptivo: 'momarandu rembiporupyahu' (= tecnología de la información).",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "tecnología de la información",
    "terminoGn": "momarandu rembiporupyahu",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset libro_gn)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "tecnología",
    "terminoGn": "tecnología",
    "variantesGn": [
      {
        "valor": "mba'epyahu"
      },
      {
        "valor": "mba'eporakokuaa"
      }
    ],
    "tipo": "prestamo",
    "fuente": "Jojajovai (seminario spl libro_gn); libro Yvy Marãe'ỹ",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'tecnología' prestamo es lo habitual en SPL y seminario. 'mba'epyahu' (libro_gn) y 'mba'eporakokuaa' (propuesta tomada de Vikipetã en el libro de Yvy Marãe'ỹ) son alternativas no normadas; no se pudo abrir el articulo de Vikipetã para confirmar.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "sistema",
    "terminoGn": "sistema",
    "variantesGn": [
      {
        "valor": "apopyvusu"
      },
      {
        "valor": "jeporavorape"
      },
      {
        "valor": "tembiaporape"
      },
      {
        "valor": "aty"
      }
    ],
    "tipo": "prestamo",
    "fuente": "Jojajovai (libro_gn); vocabulario SPL",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'sistema operativo = sistema oñemomba'apoha'. Las opciones del vocabulario SPL ('jeporavorape' etc.) no se usan en textos informaticos. 'apopyvusu' proviene de la tabla del libro Yvy Marãe'ỹ (fuente de la forma no verificada).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "sistemas (área de informática y sistemas)",
    "terminoGn": "sistemas",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Uso por analogia con 'sistema'",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Nombre de disciplina; sin evidencia especifica."
  },
  {
    "terminoEs": "red",
    "terminoGn": "apesã",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset libro_gn)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'Red mundial = arapy apesã'; 'redes sociales = ñomongeta veve'; 'red de ordenadores = karameg̃uanguéra apesã'.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "internet",
    "terminoGn": "ñanduti",
    "variantesGn": [
      {
        "valor": "ñandutiveve"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (libro_gn); libro Yvy Marãe'ỹ",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Neologismo (tela de ñandutí). 'ñanduti' con tilde nasal en la ultima vocal segun grafia ALG; algunas fuentes lo escriben sin tilde.",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "computadora",
    "terminoGn": "karameg̃ua",
    "variantesGn": [
      {
        "valor": "karameg̃ua'i (pendrive)"
      }
    ],
    "tipo": "neologismo",
    "fuente": "Libro Yvy Marãe'ỹ/CONACYT 2017",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Resemantizacion documentada de 'karameg̃ua = baúl'; el libro lo propone para consulta de hablantes.",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "datos",
    "terminoGn": "dato",
    "variantesGn": [
      {
        "valor": "datokuéra"
      },
      {
        "valor": "mba'ekuaa"
      },
      {
        "valor": "apopyme'ẽ"
      }
    ],
    "tipo": "prestamo",
    "fuente": "Libro Yvy Marãe'ỹ (diccionario informatico)",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'base de datos = datokuéra renda'. OJO: el vocabulario SPL da 'mba'ekuaa' para 'dato' mientras Jojajovai libro_gn lo usa para 'conocimiento'.",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "base de datos",
    "terminoGn": "datokuéra renda",
    "variantesGn": [
      {
        "valor": "pojoapy rysýi"
      }
    ],
    "tipo": "corpus",
    "fuente": "Libro Yvy Marãe'ỹ (diccionario informatico)",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "conocimiento",
    "terminoGn": "kuaapy",
    "variantesGn": [
      {
        "valor": "mba'ekuaa"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subsets seminario y libro_gn)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Colisión con 'dato' (mba'ekuaa). 'conocer' en SPL: kuaa ; kũmby.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "conocer",
    "terminoGn": "kuaa",
    "variantesGn": [
      {
        "valor": "kũmby"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Original del CSV con glifos degradados: 'kümby' -> 'kũmby'.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "nivel",
    "terminoGn": "yvatejoja",
    "variantesGn": [
      {
        "valor": "mbojojaha"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Sentido de nivel fisico/horizontal. 'Nivel de conocimiento' no documentado.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "nivel de conocimiento",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Ver lagunas.md."
  },
  {
    "terminoEs": "dominio (del modelo)",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'Dominio' en SPL = 'poguy' (poder/control) y en informatica 'korapy' (dominio de Internet; libro Yvy Marãe'ỹ). Ninguno sirve para 'dominio de conocimiento' en TPACK."
  },
  {
    "terminoEs": "dominio (de Internet)",
    "terminoGn": "korapy",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset libro_gn)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Solo sentido informatico.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "modelo",
    "terminoGn": "techapyrã",
    "variantesGn": [
      {
        "valor": "poravopyre"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario libro_gn)",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'techapyrã' es tambien 'ejemplo'; 'poravopyre' proviene de una alineacion dudosa en libro_gn. Ver lagunas.md.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "contexto",
    "terminoGn": "ñe'ẽjeporukatu",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Una sola aparicion ('entender el contexto'); alineacion incierta.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "contextual",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "infraestructura",
    "terminoGn": "mba'eporurã",
    "variantesGn": [
      {
        "valor": "infraestructura"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Original 'mba'eporurä' normalizado a 'mba'eporurã'. Sentido probable 'materiales/insumos'; la prensa guarani conserva 'infraestructura' (Jojajovai abc).",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "infraestructura tecnologica",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "diseño",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Firefox usa el verbo 'ediseña' (prestamo) y el libro Yvy Marãe'ỹ propone 'togue mboheko' solo para 'diseño de página'."
  },
  {
    "terminoEs": "diseño de investigación",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "mixto",
    "terminoGn": "ojehe'áva",
    "variantesGn": [
      {
        "valor": "jehe'a"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Una sola linea del vocabulario del seminario. 'jehe'a' es el nombre tecnico de la mezcla guarani-castellano (Chiruzzo et al. 2022).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "exploratorio",
    "terminoGn": "ypy",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Una sola linea; 'ypy' significa 'origen/primero'. Dudoso.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "secuencia",
    "terminoGn": "tapykuegua",
    "variantesGn": [],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "secuencial",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "fase",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'Etapa' en SPL: ararasa ; arapahẽ ; arapehẽngue (sentido de epoca/periodo)."
  },
  {
    "terminoEs": "etapa",
    "terminoGn": "ararasa",
    "variantesGn": [
      {
        "valor": "arapahẽ"
      },
      {
        "valor": "arapehẽngue"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Original con glifos degradados: 'arapahë' -> 'arapahẽ'.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "cualitativo",
    "terminoGn": "tekoguáva",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Una linea del vocabulario del seminario Yvy Marãe'ỹ/CONACYT.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "cuantitativo",
    "terminoGn": "papygua",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Idem.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "entrevista",
    "terminoGn": "ñe'ẽjovake",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "SPL (verbo 'entrevistar'): mongeta ; ñomongeta.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "entrevistar",
    "terminoGn": "mongeta",
    "variantesGn": [
      {
        "valor": "ñomongeta"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "entrevista semiestructurada",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "directivo",
    "terminoGn": "mburuvicha",
    "variantesGn": [
      {
        "valor": "mburuvichakuéra"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset spl)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'directivos del CONEC = CONEC mburuvichakuéra'. 'mburuvicha' es 'autoridad'.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "técnico (persona)",
    "terminoGn": "mba'apokuaa",
    "variantesGn": [
      {
        "valor": "mba'apokuaahára"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Original 'mba'apokuaahära' normalizado.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "docente",
    "terminoGn": "mbo'ehára",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario); vocabulario SPL ('profesor')",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Coincide con 'profesor = mbo'ehára' (SPL A). Plural 'mbo'ehárakuéra'.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "profesor",
    "terminoGn": "mbo'ehára",
    "variantesGn": [],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "estudiante",
    "terminoGn": "temimbo'e",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario); vocabulario SPL ('alumno')",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'alumno = temimbo'e' en SPL (A).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "alumno",
    "terminoGn": "temimbo'e",
    "variantesGn": [],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "investigación",
    "terminoGn": "jeporekapy",
    "variantesGn": [
      {
        "valor": "tembikuaareka"
      },
      {
        "valor": "tapykueho"
      },
      {
        "valor": "hapykuereho"
      }
    ],
    "tipo": "corpus",
    "fuente": "Libro Yvy Marãe'ỹ/CONACYT 2017; Jojajovai (libro_gn seminario)",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'jeporekapy' encabeza el titulo guarani del propio libro y aparece en libro_gn. 'tembikuaareka' (seminario). 'tapykueho/hapykuereho' (SPL) parece forma arcaica. 'Investigación lingüística' = ñe'ẽ rapereka.",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "investigar",
    "terminoGn": "povyvy",
    "variantesGn": [
      {
        "valor": "mboguyguy"
      },
      {
        "valor": "pyguara"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Formas poco usadas; el libro Yvy Marãe'ỹ usa derivados de 'jeporeka' (p. ej. 'ojejeporekakuévo').",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "doctoral",
    "terminoGn": "doctoral",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Jojajovai (subset spl)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "El subset spl traduce 'Tesis doctoral...con resumen en guaraní' como 'tesis doctoral ... oñemombyky guaraníme' (conserva el prestamo).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "doctor",
    "terminoGn": "pohanohára",
    "variantesGn": [
      {
        "valor": "aranduvusu"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'pohanohára' = medico; 'aranduvusu' = sabio. No hay forma para 'doctor/a en educación'.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "objetivo",
    "terminoGn": "jehupytyrã",
    "variantesGn": [
      {
        "valor": "temimo'ã"
      },
      {
        "valor": "mba'erã"
      },
      {
        "valor": "jehupytyvoirã"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subsets libro_gn seminario); vocabulario SPL",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'Objetivo del proyecto = tembiaporã ohupytyséva'; 'Objetivo 5 = Jehupytyrã 5ha'. Variantes SPL (A) existen.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "objetivo general",
    "terminoGn": "jehupytyrã opaichagua",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'opaichagua' significa 'de toda clase'; no equivale a 'general'. Ver lagunas.md.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "general (adjetivo)",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "SPL 'general = mburuvicha guasu' es el grado militar; no aplicable."
  },
  {
    "terminoEs": "muestra",
    "terminoGn": "atyvore",
    "variantesGn": [
      {
        "valor": "tembiecharã"
      },
      {
        "valor": "techarã"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL; Jojajovai (seminario)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Coincide con el vocabulario del seminario (B). 'submuestra' no documentado.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "submuestra",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "categoría",
    "terminoGn": "ñemohenda",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset libro_td)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Sentido de 'clasificacion/agrupacion' en interfaces de redes sociales.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "operacionalizar",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "cuestionario",
    "terminoGn": "poranduhaipy",
    "variantesGn": [],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "encuesta",
    "terminoGn": "mba'eporandu",
    "variantesGn": [
      {
        "valor": "ñeporandu heta"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset libro_gn); vocabulario SPL",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'ñeporandu heta' es la forma SPL (A).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "adaptacion transcultural",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "subescala",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "escala",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "SPL solo registra 'escalar = jupi' (subir)."
  },
  {
    "terminoEs": "padrón",
    "terminoGn": "terarysýi",
    "variantesGn": [],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Original 'terarysýi'. La prensa guarani conserva 'padrón' para el catastro (Jojajovai abc). Para 'padrón docente' falta verificacion de uso.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "validez",
    "terminoGn": "katupy",
    "variantesGn": [],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Sentido general de 'validez/capacidad'; el uso estadistico no esta documentado. 'tekokatupyry' = competencia (seminario).",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "confiabilidad",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "juicio",
    "terminoGn": "akãguapy",
    "variantesGn": [
      {
        "valor": "akãporã"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Sentido de 'cordura/discernimiento'; no de 'dictamen'.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "juicio de expertos",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "experto",
    "terminoGn": "katupyry",
    "variantesGn": [
      {
        "valor": "tapicha katupyry"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset spl)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'lingüista katupyry' = experto lingüista. Derivado de 'katupy' (SPL).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "coeficiente",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "factor",
    "terminoGn": "apoha",
    "variantesGn": [
      {
        "valor": "mba'eapoha"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Sentido general de 'agente/causante'; no estadistico.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "análisis",
    "terminoGn": "ñehesa'ỹijo",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (libro_gn); Veron 2016",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Veron (miembro de la ALG) escribe 'ñehesa'ỹjo'; libro_gn escribe 'ñehesa'ỹijo'. Variacion ortografica a decidir (ver notas_ortografia.md).",
    "evidenciaUrl": "https://dialnet.unirioja.es/descarga/articulo/7337861.pdf"
  },
  {
    "terminoEs": "análisis factorial",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "alfa de Cronbach",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Nombre propio estadistico: conservar en castellano."
  },
  {
    "terminoEs": "omega de McDonald",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Idem."
  },
  {
    "terminoEs": "criterio",
    "terminoGn": "jesarekorã",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset libro_td)",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Una sola aparicion ('Criterios' en una interfaz).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "validez de criterio",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "evidencia",
    "terminoGn": "",
    "variantesGn": [
      {
        "valor": "ojehechauka (verbo)"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset spl)",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Solo hay uso verbal: 'se evidencia el avance = ojehechauka'. Sin sustantivo documentado.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "comparar",
    "terminoGn": "mbojoja",
    "variantesGn": [
      {
        "valor": "mbojogua"
      },
      {
        "valor": "mbojovake"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "La prensa usa el participio 'ombojojáva' (Jojajovai abc).",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "comparación",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "No hay sustantivo documentado; derivar de 'mbojoja' queda como decision del traductor."
  },
  {
    "terminoEs": "descriptivo",
    "terminoGn": "techaukarã",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Una linea del vocabulario del seminario.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "puntuación",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "hipótesis",
    "terminoGn": "hupityrã",
    "variantesGn": [
      {
        "valor": "mo'ãmby"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL; Jojajovai (seminario)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'mo'ãmby' en el vocabulario del seminario (B). 'hupityrã' normalizado desde 'hupityrä'.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "contraste (de hipótesis)",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "campo (base de datos)",
    "terminoGn": "kámpo",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Libro Yvy Marãe'ỹ (diccionario informatico)",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Solo sentido informatico. 'Fase de campo' sin evidencia.",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "fase de campo",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "resultado",
    "terminoGn": "ojehupytýva",
    "variantesGn": [
      {
        "valor": "ojejuhúva"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (subsets seminario libro_td)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'Resultados y discusión = ojehupytýva ári ñomongeta'.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "proponer",
    "terminoGn": "jerure",
    "variantesGn": [],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'jerure' es mas bien 'pedir/solicitar'; revisar.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "propuesta",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Ver lagunas.md."
  },
  {
    "terminoEs": "palabras clave",
    "terminoGn": "ñe'ẽ heseguaitéva",
    "variantesGn": [
      {
        "valor": "mba'e mba'e rehe oñe'ẽ"
      }
    ],
    "tipo": "corpus",
    "fuente": "Jojajovai (libro_gn); Veron 2016",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Veron (ALG) rotula 'Mba'e mba'e rehe oñe'ẽ' en su resumen; libro_gn usa 'Ñe'ẽ heseguaitéva'.",
    "evidenciaUrl": "https://dialnet.unirioja.es/descarga/articulo/7337861.pdf"
  },
  {
    "terminoEs": "resumen",
    "terminoGn": "mombykypyre",
    "variantesGn": [
      {
        "valor": "ñemombyky"
      }
    ],
    "tipo": "corpus",
    "fuente": "Veron 2016; Jojajovai (seminario); vocabulario SPL",
    "confianza": "A",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'ñemombyky' es la entrada del vocabulario SPL; 'mombykypyre' es el rotulo en dos fuentes humanas (articulo ALG y seminario).",
    "evidenciaUrl": "https://dialnet.unirioja.es/descarga/articulo/7337861.pdf"
  },
  {
    "terminoEs": "palabra",
    "terminoGn": "ñe'ẽ",
    "variantesGn": [
      {
        "valor": "ñe'ẽngue"
      },
      {
        "valor": "ayvu"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "desarrollo",
    "terminoGn": "jekakuaa",
    "variantesGn": [
      {
        "valor": "akãrapu'ã"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'Desarrollo de la terminología' se traduce 'jeguerokakuaa' en libro_gn.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "accesible",
    "terminoGn": "jakuaaha",
    "variantesGn": [
      {
        "valor": "neiséva"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "accesibilidad",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Derivar de 'jakuaaha' es decision del traductor."
  },
  {
    "terminoEs": "mínimo",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "pendiente",
    "terminoGn": "oha'ãrõva",
    "variantesGn": [],
    "tipo": "localizacion",
    "fuente": "Jojajovai (subset libro_td)",
    "confianza": "C",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Interfaz ('videos pendientes'); no cubre 'resultados pendientes'.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "construir",
    "terminoGn": "mba'eapo",
    "variantesGn": [
      {
        "valor": "japo"
      },
      {
        "valor": "mopu'ã"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Original 'mopu'ä' normalizado.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "construcción (del modelo)",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "definitivo",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": ""
  },
  {
    "terminoEs": "mediante",
    "terminoGn": "rupi",
    "variantesGn": [
      {
        "valor": "rehe"
      }
    ],
    "tipo": "diccionario",
    "fuente": "Vocabulario es-gn de la SPL (datos.gov.py)",
    "confianza": "A",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Posposicion. 'Plataforma Zoom rupive' en textos SPL.",
    "fuenteUrl": "https://www.datos.gov.py/dataset/vocabularios-del-espa%C3%B1ol-al-guaran%C3%AD"
  },
  {
    "terminoEs": "según",
    "terminoGn": "he'iháicha",
    "variantesGn": [
      {
        "valor": "jehechaháicha"
      },
      {
        "valor": "oje'eháicha"
      }
    ],
    "tipo": "corpus",
    "fuente": "Veron 2016; vocabulario SPL",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Veron: 'He'iháicha Miquel Siguan (1992)'. SPL lista 'ikatu ; jehechaháicha ; oje'eháicha'.",
    "evidenciaUrl": "https://dialnet.unirioja.es/descarga/articulo/7337861.pdf"
  },
  {
    "terminoEs": "a partir de (tiempo)",
    "terminoGn": "guive",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Veron 2016; libro Yvy Marãe'ỹ",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Posposicion temporal: '1967 guive' (Veron 2016). No sirve para 'a partir de ese nivel' (sentido de base).",
    "evidenciaUrl": "https://dialnet.unirioja.es/descarga/articulo/7337861.pdf"
  },
  {
    "terminoEs": "sin que",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "neologismo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Construccion concesiva/negativa: reformular (ver lagunas.md)."
  },
  {
    "terminoEs": "o (disyuntivo)",
    "terminoGn": "térã",
    "variantesGn": [
      {
        "valor": "ỹrõ"
      }
    ],
    "tipo": "corpus",
    "fuente": "Libro Yvy Marãe'ỹ/CONACYT 2017",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "El libro lo menciona como conector vigente en instituciones y medios.",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "y (copulativo)",
    "terminoGn": "ha",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Veron 2016; Jojajovai",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "",
    "evidenciaUrl": "https://dialnet.unirioja.es/descarga/articulo/7337861.pdf"
  },
  {
    "terminoEs": "marzo",
    "terminoGn": "jasyapy",
    "variantesGn": [],
    "tipo": "corpus",
    "fuente": "Jojajovai (subset seminario)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'7 de marzo de 1870 = 7 jasyapy 1870'. La misma fuente escribe 'Jasypapy 2014' (variante o error). El nombre de los meses sigue sin unificarse: verificar con ALG.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "2020",
    "terminoGn": "2020",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Libro Yvy Marãe'ỹ/CONACYT 2017",
    "confianza": "B",
    "oficial": true,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Criterio de traduccion del proyecto (no norma ALG): cifras en digitos (11 50 100) y numerales guaranies solo en contextos no tecnicos. Fechas con sufijo: '2014-pe'.",
    "fuenteUrl": "https://repositorio.conacyt.gov.py/handle/20.500.14066/2622"
  },
  {
    "terminoEs": "Paraguay",
    "terminoGn": "Paraguái",
    "variantesGn": [
      {
        "valor": "Paraguay"
      }
    ],
    "tipo": "prestamo",
    "fuente": "Veron 2016; Wikipedia gn; Jojajovai",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Adjetivo/gentilicio: 'Paraguaigua'. Veron escribe 'Paraguái'; otras fuentes mantienen 'Paraguay'.",
    "evidenciaUrl": "https://dialnet.unirioja.es/descarga/articulo/7337861.pdf"
  },
  {
    "terminoEs": "Asunción",
    "terminoGn": "Asunción",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Jojajovai (subsets seminario spl)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Se conserva con sufijo con guion: 'Universidad Nacional de Asunción-pe'.",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "Pilar",
    "terminoGn": "Pilar",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Jojajovai (subset spl)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'Pilar-pe' (en Pilar).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "Concepción",
    "terminoGn": "Concepción",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Jojajovai (subset spl)",
    "confianza": "B",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "'Concepción-pe' (en Concepción); 'Concepción-gua' (de Concepción).",
    "evidenciaUrl": "https://github.com/pln-fing-udelar/jojajovai"
  },
  {
    "terminoEs": "TPACK",
    "terminoGn": "",
    "variantesGn": [],
    "tipo": "prestamo",
    "fuente": "Sin evidencia",
    "confianza": "X",
    "oficial": false,
    "revisado": false,
    "activo": true,
    "origen": "glosario-po",
    "fechaConsulta": "2026-10-11",
    "nota": "Siglas (TPACK EVA AUPP XK DEXPLOS): conservar la sigla original y glosar una sola vez; ver lagunas.md."
  }
])
