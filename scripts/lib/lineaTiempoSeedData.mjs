/**
 * lineaTiempoSeedData.mjs — LT-01
 *
 * Los 5 hitos que el portal publicaba escritos en el código (app/[locale]/historia/page.tsx) con sus textos
 * LITERALES de messages/{es,en,pt-BR,gn}/pages.historia.json (claves timeline.m1..m5, retiradas tras la siembra).
 * Más el hito 2026 aprobado por el PO (Premio Nacional, fuente CONACYT). El español es el texto base; en/pt-BR/gn van como traducciones. Spec: docs/specs/portal/LINEA-TIEMPO.md §5.
 *
 * Clave natural: anio + titulo (exactos). Límite (RDD-LT-02): los hechos NO están verificados contra una fuente
 * oficial. Número de ley corregido a N° 3.201/2007 por indicación del PO (coincide con la BACN, ficha 10576); la
 * fecha «4 de julio de 2007» y los demás hechos siguen sin verificar. Una fila ya cargada con el título viejo se
 * corrige desde el panel o con el script de corrección puntual (el seed no sobrescribe filas existentes).
 */

export const LINEA_TIEMPO_HITOS = [
  {
    "anio": 2007,
    "titulo": "Creación por Ley N° 3.201",
    "descripcion": "El 4 de julio de 2007 se promulga la Ley N° 3.201, que crea la Universidad Nacional de Concepción como institución pública de educación superior en el norte paraguayo.",
    "traducciones": {
      "en": {
        "titulo": "Established by Law No. 3,201",
        "descripcion": "On July 4, 2007, Law No. 3,201 was enacted, creating the Universidad Nacional de Concepción as a public higher education institution in northern Paraguay."
      },
      "ptBR": {
        "titulo": "Criação pela Lei N° 3.201",
        "descripcion": "Em 4 de julho de 2007 foi promulgada a Lei N° 3.201, que criou a Universidad Nacional de Concepción como instituição pública de educação superior no norte do Paraguai."
      },
      "gn": {
        "titulo": "Ñembokatú Léi N° 3.201 ndive",
        "descripcion": "2007 jasypoteĩ 4-pe oñembokatú Léi N° 3.201, oñemoheñóiva Universidad Nacional de Concepción tetãgua mbo'ehao peguáicha Paraguái yvate-pe."
      }
    }
  },
  {
    "anio": 2008,
    "titulo": "Inicio de actividades académicas",
    "descripcion": "La Universidad abre sus puertas e inicia las primeras actividades académicas, marcando el comienzo formal de la vida universitaria en Concepción.",
    "traducciones": {
      "en": {
        "titulo": "Start of academic activities",
        "descripcion": "The University opened its doors and began its first academic activities, marking the formal start of university life in Concepción."
      },
      "ptBR": {
        "titulo": "Início das atividades acadêmicas",
        "descripcion": "A Universidade abriu suas portas e iniciou as primeiras atividades acadêmicas, marcando o começo formal da vida universitária em Concepción."
      },
      "gn": {
        "titulo": "Mbo'e tembiapo ñepyrũ",
        "descripcion": "Mbo'ehao ohechakuaa iñopytyrõ ha oñepyrũ ypy mbo'e tembiaponguéra, oñembokatúva mbo'e arambýre Concepción-pe."
      }
    }
  },
  {
    "anio": 2010,
    "titulo": "Primera promoción de graduados",
    "descripcion": "La UNC celebra la primera graduación de profesionales formados en sus aulas, consolidando su misión educativa en la región.",
    "traducciones": {
      "en": {
        "titulo": "First graduating class",
        "descripcion": "UNC celebrated the graduation of the first class of professionals trained in its classrooms, consolidating its educational mission in the region."
      },
      "ptBR": {
        "titulo": "Primeira turma de formandos",
        "descripcion": "A UNC celebrou a formatura dos primeiros profissionais formados em suas salas, consolidando sua missão educacional na região."
      },
      "gn": {
        "titulo": "Ñepyrũ graduadonguéra",
        "descripcion": "UNC oñemboaje ypy oñemboha'ãngáva iñopytyrõ rehegua, omboñepyrũva mbo'e mba'aporã ko'ã tetãguápe."
      }
    }
  },
  {
    "anio": 2015,
    "titulo": "Apertura de nuevas facultades",
    "descripcion": "La oferta académica se amplía significativamente con la apertura de nuevas facultades, respondiendo a las necesidades del desarrollo regional.",
    "traducciones": {
      "en": {
        "titulo": "Opening of new faculties",
        "descripcion": "The academic offering expanded significantly with the creation of new faculties, responding to the needs of regional development."
      },
      "ptBR": {
        "titulo": "Abertura de novas faculdades",
        "descripcion": "A oferta acadêmica se expandiu significativamente com a criação de novas faculdades, respondendo às necessidades do desenvolvimento regional."
      },
      "gn": {
        "titulo": "Mbo'ehao pytyvõrã pyahu",
        "descripcion": "Mbo'epyrã omohu'ã hetave mbo'ehao pytyvõrã ñembokatú ndive, oñemomba'e Paraguái yvate ñemombarete rehe."
      }
    }
  },
  {
    "anio": 2024,
    "titulo": "Más de 5.000 estudiantes activos",
    "descripcion": "La Universidad alcanza una matrícula histórica de más de 5.000 estudiantes, reafirmando su posición como referente educativo del norte paraguayo.",
    "traducciones": {
      "en": {
        "titulo": "Over 5,000 active students",
        "descripcion": "The University reached a historic enrollment of over 5,000 students, reaffirming its position as an educational benchmark in northern Paraguay."
      },
      "ptBR": {
        "titulo": "Mais de 5.000 estudantes ativos",
        "descripcion": "A Universidade atingiu uma matrícula histórica de mais de 5.000 estudantes, reafirmando sua posição como referência educacional no norte do Paraguai."
      },
      "gn": {
        "titulo": "5.000-upéva mbo'eháva oñemoarandu",
        "descripcion": "Mbo'ehao ohupyty 5.000-upéva mbo'eháva ñemboguapy, omboñepyrũva iñopytyrõ Paraguái yvate pegua mbo'e rehegua."
      }
    }
  },
  // Hito aprobado por el PO (24-10-26). Fuente oficial: CONACYT, 27-04-2026 (enlace). Solo la frase aprobada:
  // la distinción exacta dentro de la categoría está pendiente de confirmación del PO. gn replica el español.
  {
    "anio": 2026,
    "etiquetaFecha": "Abril de 2026",
    "titulo": "Premio Nacional a la Calidad y Excelencia en la Gestión",
    "descripcion": "La Universidad Nacional de Concepción fue galardonada en la edición 2025 del Premio Nacional a la Calidad y Excelencia en la Gestión, en la categoría Sector Público, otorgado por el CONACYT.",
    "enlace": "https://www.conacyt.gov.py/conacyt-entrego-premio-nacional-calidad-excelencia-gestion-2025",
    "traducciones": {
      "en": {
        "titulo": "National Quality and Excellence in Management Award",
        "descripcion": "The Universidad Nacional de Concepción was awarded in the 2025 edition of the National Quality and Excellence in Management Award, in the Public Sector category, granted by CONACYT."
      },
      "ptBR": {
        "titulo": "Prêmio Nacional de Qualidade e Excelência na Gestão",
        "descripcion": "A Universidad Nacional de Concepción foi premiada na edição 2025 do Prêmio Nacional de Qualidade e Excelência na Gestão, na categoria Setor Público, concedido pelo CONACYT."
      },
      "gn": {
        "titulo": "Premio Nacional a la Calidad y Excelencia en la Gestión",
        "descripcion": "La Universidad Nacional de Concepción fue galardonada en la edición 2025 del Premio Nacional a la Calidad y Excelencia en la Gestión, en la categoría Sector Público, otorgado por el CONACYT."
      }
    }
  },
]

/**
 * Payload de creación para el CMS: publicado (conserva el comportamiento de hoy) y orden 1 (un hito por año).
 * Por qué una copia: el seed nunca debe mutar los datos de referencia que también usan las pruebas.
 */
export function toCmsPayloadLineaTiempo(item) {
  return {
    anio: item.anio,
    titulo: item.titulo,
    descripcion: item.descripcion,
    traducciones: structuredClone(item.traducciones),
    // Solo si el hito los trae: los 5 hitos históricos no tienen fecha precisa ni fuente verificada.
    ...(item.etiquetaFecha ? { etiquetaFecha: item.etiquetaFecha } : {}),
    ...(item.enlace ? { enlace: item.enlace } : {}),
    orden: 1,
    active: true,
  }
}
