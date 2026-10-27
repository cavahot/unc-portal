/**
 * conveniosCorrections.mjs — CNV-01, decisiones del PO del 2026-10-24 (docs/specs/portal/CONVENIOS.md §9).
 *
 * Capa explícita y revisada que se aplica SOBRE el dataset verbatim del sitio anterior
 * (scripts/lib/conveniosSeedData.mjs, que conserva el texto original en CONVENIOS_*_ORIGEN):
 *   1. CONVENIOS_CORRECCIONES: erratas ortográficas/tipográficas inequívocas. Clave = tipo + sourceRow (fila con
 *      datos de la tabla de origen); `antes` guarda el valor VERBATIM para auditoría y para que el guion de la BD
 *      sepa qué fila/valor corregir. No reescribe el sentido ni agrega hechos: solo letras, tildes, signos,
 *      espacios y conectores; los valores de relleno («N», «____________», «0») pasan a vacío.
 *   2. CONVENIOS_DUPLICADOS_EXCLUIDOS: filas duplicadas que el seed nunca debe volver a crear.
 *   3. CONVENIOS_RECLASIFICADOS: filas que pasan de una tabla a otra (nacional -> internacional).
 *
 * Amenaza que evita: que una re-siembra reintroduzca erratas o el duplicado ya borrado, o que una corrección se
 * aplique sobre un texto distinto del revisado (`aplicarCapaCorrecciones` lanza si `antes` no coincide).
 * Límite: la procedencia (`original`, `reclasificadoDesde`) vive solo en el dataset; no se envía al CMS.
 * El archivo es JS puro y no importa el dataset (evita ciclos).
 */

/** Nombre de campo de la tabla (español) -> propiedad del dataset. */
export const CAMPO_DATASET = {
  denominacion: 'title',
  participantes: 'parties',
  fechaFirma: 'signedMonth',
  duracion: 'duration',
  finalidad: 'objective',
}

/** Campos de la fila que forman la «foto original» de procedencia. */
const CAMPOS_ORIGINALES = ['type', 'year', 'title', 'parties', 'signedMonth', 'duration', 'objective']

/** Tabla de correcciones (antes = verbatim del sitio; despues = null deja el campo vacío). */
export const CONVENIOS_CORRECCIONES = [
  { "tipo":"nacional","sourceRow":12,"year":2012,"campo":"finalidad","antes":"‘- Desarrollar acciones conjuntas permitiendo realizar investigaciones en campos y programas específicos, delimitando oportunamente en convenios de menor jerarquía o apéndices al presente acuerdo. – Regular la Cooperación Interinstitucional entre ambas Instituciones, estableciendo el acceso a plazas en los programas de Práctica Supervisada de Pregrado, ofrecidos por la Sec. De Salud de la Gobernación de Boquerón. – Regular la Cooperación Interinstitucional entre ambas Instituciones, estableciendo el acceso a plazas en los programas de Práctica Supervisada de Pregrado, ofrecidos por la Sec. De Salud de la Gobernación de Boquerón.","despues":"Desarrollar acciones conjuntas permitiendo realizar investigaciones en campos y programas específicos, delimitando oportunamente en convenios de menor jerarquía o apéndices al presente acuerdo. – Regular la Cooperación Interinstitucional entre ambas Instituciones, estableciendo el acceso a plazas en los programas de Práctica Supervisada de Pregrado, ofrecidos por la Sec. De Salud de la Gobernación de Boquerón. – Regular la Cooperación Interinstitucional entre ambas Instituciones, estableciendo el acceso a plazas en los programas de Práctica Supervisada de Pregrado, ofrecidos por la Sec. De Salud de la Gobernación de Boquerón.","motivo":"Prefijo tipográfico «‘- » sobrante al inicio de la finalidad (comilla suelta y guion)." },
  { "tipo":"nacional","sourceRow":31,"year":2014,"campo":"finalidad","antes":"‘- Desarrollar acciones conjuntas permitiendo realizar investigaciones en campos y programas específicos, delimitando oportunamente en convenios de menor jerarquía o apéndices al presente acuerdo. RENOVACIÓN. – Regular la Cooperación Interinstitucional entre ambas Instituciones, estableciendo el acceso a plazas en los programas de Práctica Supervisada de Pregrado, ofrecidos por la Sec. De Salud de la Gobernación de Boquerón. RENOVACIÓN.","despues":"Desarrollar acciones conjuntas permitiendo realizar investigaciones en campos y programas específicos, delimitando oportunamente en convenios de menor jerarquía o apéndices al presente acuerdo. RENOVACIÓN. – Regular la Cooperación Interinstitucional entre ambas Instituciones, estableciendo el acceso a plazas en los programas de Práctica Supervisada de Pregrado, ofrecidos por la Sec. De Salud de la Gobernación de Boquerón. RENOVACIÓN.","motivo":"Prefijo tipográfico «‘- » sobrante al inicio de la finalidad (comilla suelta y guion)." },
  { "tipo":"nacional","sourceRow":34,"year":2015,"campo":"duracion","antes":"3Años.","despues":"3 Años.","motivo":"Falta el espacio entre cifra y unidad." },
  { "tipo":"nacional","sourceRow":35,"year":2015,"campo":"fechaFirma","antes":"30 de Diceimbre","despues":"30 de Diciembre","motivo":"Errata de tipeo en el mes." },
  { "tipo":"nacional","sourceRow":50,"year":2018,"campo":"fechaFirma","antes":"N","despues":null,"motivo":"Valor «N» sin significado (marcador de relleno); se deja vacío, no se inventa fecha." },
  { "tipo":"nacional","sourceRow":52,"year":2019,"campo":"participantes","antes":"Universidad Nacional de Concepción y la Comision Nacional de Telecomunicaciones","despues":"Universidad Nacional de Concepción y la Comisión Nacional de Telecomunicaciones","motivo":"Falta la tilde." },
  { "tipo":"nacional","sourceRow":53,"year":2019,"campo":"participantes","antes":"Universidad Públicas del Paraguay – AUPP y Universidades Nacionales","despues":"Universidades Públicas del Paraguay – AUPP y Universidades Nacionales","motivo":"Concordancia de número: el mismo texto dice «Universidades Nacionales» (plural)." },
  { "tipo":"nacional","sourceRow":55,"year":2019,"campo":"participantes","antes":"Universidad Nacional de Concepción y el Inatituto Nacional de Educacion Superior Dr, Raul Peña (INAES)","despues":"Universidad Nacional de Concepción y el Instituto Nacional de Educación Superior Dr. Raúl Peña (INAES)","motivo":"Errata de tipeo, tilde y puntuación del título «Dr.» (INAES)." },
  { "tipo":"nacional","sourceRow":57,"year":2020,"campo":"participantes","antes":"Universidad Nacional de Concepción y el Instituto de Prevensión Social","despues":"Universidad Nacional de Concepción y el Instituto de Previsión Social","motivo":"Errata de tipeo: Instituto de Previsión Social." },
  { "tipo":"nacional","sourceRow":59,"year":2021,"campo":"denominacion","antes":"Convenio Especifico de Cooperacion","despues":"Convenio Específico de Cooperación","motivo":"Faltan tildes." },
  { "tipo":"nacional","sourceRow":61,"year":2022,"campo":"participantes","antes":"Universidad Nacional de Concepción- Facultada de Odontología y la Universidad Científica del Sur- Carrera de Estomatología","despues":"Universidad Nacional de Concepción- Facultad de Odontología y la Universidad Científica del Sur- Carrera de Estomatología","motivo":"Errata de tipeo." },
  { "tipo":"nacional","sourceRow":62,"year":2022,"campo":"participantes","antes":"Univerisdad Nacional de Concepción y la Universidad Privada del Este","despues":"Universidad Nacional de Concepción y la Universidad Privada del Este","motivo":"Errata de tipeo (letras permutadas)." },
  { "tipo":"nacional","sourceRow":63,"year":2022,"campo":"participantes","antes":"Universidad Nacional de Concepción y la Secretería de Políticas Linguisticas","despues":"Universidad Nacional de Concepción y la Secretaría de Políticas Lingüísticas","motivo":"Errata de tipeo y falta de diéresis/tilde." },
  { "tipo":"nacional","sourceRow":64,"year":2022,"campo":"participantes","antes":"Universidad Nacional de Concepción y el Instituto Nacional de Estadistica (INE) En el marco de del Censo Nacional de Población y Viviendas 2022","despues":"Universidad Nacional de Concepción y el Instituto Nacional de Estadística (INE) En el marco de del Censo Nacional de Población y Viviendas 2022","motivo":"Falta la tilde." },
  { "tipo":"nacional","sourceRow":66,"year":2022,"campo":"finalidad","antes":"Establecer las lines de acción específicas para el trabajo coordiando de la academia de con el MDS en vista a contribuir al desarrollo social de las comunidades, familias y personas.","despues":"Establecer las líneas de acción específicas para el trabajo coordinado de la academia de con el MDS en vista a contribuir al desarrollo social de las comunidades, familias y personas.","motivo":"Erratas de tipeo." },
  { "tipo":"nacional","sourceRow":67,"year":2022,"campo":"finalidad","antes":"Proponer a la Universidad Nacional de Concepción beneficios monetarios en servicio de impresiones a todos los estudiantes de la UNC que porten el carnte estudiantil.","despues":"Proponer a la Universidad Nacional de Concepción beneficios monetarios en servicio de impresiones a todos los estudiantes de la UNC que porten el carnet estudiantil.","motivo":"Errata de tipeo (grafía usada en el resto del sitio: «carnet»)." },
  { "tipo":"nacional","sourceRow":69,"year":2022,"campo":"finalidad","antes":"Proponer por parte de la empresa Sol del Norte S:A descuentos monetarios en la compra de combustible a todos los estudiantes de la Universidad Nacional de Concepción que porten el carnet estudiantil.","despues":"Proponer por parte de la empresa Sol del Norte S.A. descuentos monetarios en la compra de combustible a todos los estudiantes de la Universidad Nacional de Concepción que porten el carnet estudiantil.","motivo":"Signo equivocado (dos puntos) en la sigla de sociedad anónima." },
  { "tipo":"nacional","sourceRow":70,"year":2022,"campo":"participantes","antes":"Universidad Nacional de Concepción Facultad de Ciencias Exactas y Tecnologicas y ls Municipalidad de Yby Yau","despues":"Universidad Nacional de Concepción Facultad de Ciencias Exactas y Tecnologicas y la Municipalidad de Yby Yau","motivo":"Errata de tipeo en el artículo." },
  { "tipo":"nacional","sourceRow":71,"year":2022,"campo":"finalidad","antes":"En el marco del programa Boleto Estudiantil, se compromete a otorgar descuentos en concepto de pasajes a estudiantes y funcionarios de la Universidad Nacional de Concepción, que necesiten transladarse a localidades que forman parte de los itinerarios de transporte de pasajeros realizados por la empresa.","despues":"En el marco del programa Boleto Estudiantil, se compromete a otorgar descuentos en concepto de pasajes a estudiantes y funcionarios de la Universidad Nacional de Concepción, que necesiten trasladarse a localidades que forman parte de los itinerarios de transporte de pasajeros realizados por la empresa.","motivo":"Ortografía: «trasladarse»." },
  { "tipo":"nacional","sourceRow":75,"year":2023,"campo":"denominacion","antes":"Covenio de Colaboración Interinstitucional","despues":"Convenio de Colaboración Interinstitucional","motivo":"Errata de tipeo." },
  { "tipo":"nacional","sourceRow":76,"year":2023,"campo":"denominacion","antes":"Convenio de Colaboación Interinstitucional","despues":"Convenio de Colaboración Interinstitucional","motivo":"Errata de tipeo." },
  { "tipo":"nacional","sourceRow":76,"year":2023,"campo":"duracion","antes":"1 Años.","despues":"1 Año.","motivo":"Concordancia de número." },
  { "tipo":"nacional","sourceRow":89,"year":2023,"campo":"participantes","antes":"Universidad Nacional de Concepción entre Avanti Lavanderia","despues":"Universidad Nacional de Concepción y Avanti Lavanderia","motivo":"Conector «entre» sin segundo término: son dos partes («UNC y X»), igual que el resto de las filas." },
  { "tipo":"nacional","sourceRow":90,"year":2023,"campo":"participantes","antes":"Universidad Nacional de Concepción entre Manufactura de Pilar S.A.","despues":"Universidad Nacional de Concepción y Manufactura de Pilar S.A.","motivo":"Conector «entre» sin segundo término: son dos partes («UNC y X»), igual que el resto de las filas." },
  { "tipo":"nacional","sourceRow":91,"year":2023,"campo":"participantes","antes":"Universidad Nacional de Concepción entre Ñande Tienda.","despues":"Universidad Nacional de Concepción y Ñande Tienda.","motivo":"Conector «entre» sin segundo término: son dos partes («UNC y X»), igual que el resto de las filas." },
  { "tipo":"nacional","sourceRow":92,"year":2023,"campo":"participantes","antes":"Universidad Nacional de Concepción entre Punto Cell","despues":"Universidad Nacional de Concepción y Punto Cell","motivo":"Conector «entre» sin segundo término: son dos partes («UNC y X»), igual que el resto de las filas." },
  { "tipo":"nacional","sourceRow":94,"year":2023,"campo":"participantes","antes":"Universidad Nacional de Concepción entre Espacio de Mujeres Salón","despues":"Universidad Nacional de Concepción y Espacio de Mujeres Salón","motivo":"Conector «entre» sin segundo término: son dos partes («UNC y X»), igual que el resto de las filas." },
  { "tipo":"nacional","sourceRow":95,"year":2023,"campo":"participantes","antes":"Universidad Nacional de Concepción entre Universidad Americana","despues":"Universidad Nacional de Concepción y Universidad Americana","motivo":"Conector «entre» sin segundo término: son dos partes («UNC y X»), igual que el resto de las filas." },
  { "tipo":"nacional","sourceRow":96,"year":2023,"campo":"participantes","antes":"Universidad Nacional de Concepción entre Universidad Nacional de Asunción","despues":"Universidad Nacional de Concepción y Universidad Nacional de Asunción","motivo":"Conector «entre» sin segundo término: son dos partes («UNC y X»), igual que el resto de las filas." },
  { "tipo":"nacional","sourceRow":93,"year":2023,"campo":"participantes","antes":"Universidad Nacional de Concepción entre Minishopp Celulares &- Informática","despues":"Universidad Nacional de Concepción y Minishopp Celulares & Informática","motivo":"Conector «entre» -> «y» y signo «-» sobrante tras «&»." },
  { "tipo":"nacional","sourceRow":99,"year":2024,"campo":"participantes","antes":"Universidad Nacional de Concepción y Ministerio de Justiciav (MJ)","despues":"Universidad Nacional de Concepción y Ministerio de Justicia (MJ)","motivo":"Errata de tipeo (letra sobrante)." },
  { "tipo":"nacional","sourceRow":99,"year":2024,"campo":"finalidad","antes":"El objeto principal del presente Convenio Marco tiene por objeto establecer una relación interinstitucional entre las partes para la cooperación mutua en el ámbito e sus competencias, tendientes al desarrollo de programas y proyectos tecnógicos adecuadamente convenidos.","despues":"El objeto principal del presente Convenio Marco tiene por objeto establecer una relación interinstitucional entre las partes para la cooperación mutua en el ámbito de sus competencias, tendientes al desarrollo de programas y proyectos tecnológicos adecuadamente convenidos.","motivo":"Erratas de tipeo («de» y «tecnológicos»)." },
  { "tipo":"nacional","sourceRow":100,"year":2024,"campo":"finalidad","antes":"El objeto tiene por objeto establecer una relación interinstitucional entre las partes en materia ACADEMICA, CIENTIFICA, TECNOLOGICA Y CULTURAL para la cooperación mutua en el ámbito e sus competencias, tendientes al desarrollo de programas y proyectos tecnógicos adecuadamente convenidos.","despues":"El objeto tiene por objeto establecer una relación interinstitucional entre las partes en materia ACADEMICA, CIENTIFICA, TECNOLOGICA Y CULTURAL para la cooperación mutua en el ámbito de sus competencias, tendientes al desarrollo de programas y proyectos tecnológicos adecuadamente convenidos.","motivo":"Erratas de tipeo («de» y «tecnológicos»)." },
  { "tipo":"nacional","sourceRow":101,"year":2024,"campo":"finalidad","antes":"En atencion a la mision de la OCUM y los fines de la UNC, ambos casos orientados a la investigación, a la formación de recursos humanos para el desarrollo social sostenible, y la promoción de la educación y la cultura. a cooperación mutua en el ámbito e sus competencias, tendientes al desarrollo de programas y proyectos tecnógicos adecuadamente convenidos.","despues":"En atencion a la mision de la OCUM y los fines de la UNC, ambos casos orientados a la investigación, a la formación de recursos humanos para el desarrollo social sostenible, y la promoción de la educación y la cultura. a cooperación mutua en el ámbito de sus competencias, tendientes al desarrollo de programas y proyectos tecnológicos adecuadamente convenidos.","motivo":"Erratas de tipeo («de» y «tecnológicos»)." },
  { "tipo":"internacional","sourceRow":21,"year":2019,"campo":"participantes","antes":"Universidad Nacional de Concepción y la Universidad Nacional Latinoamerica S.C (Mexico)","despues":"Universidad Nacional de Concepción y la Universidad Nacional Latinoamericana S.C (Mexico)","motivo":"Adjetivo truncado. No se toca «Nacional» (posible sobrante) sin confirmación." },
  { "tipo":"internacional","sourceRow":22,"year":2019,"campo":"participantes","antes":"Universidad Nacional de Concepción – Facultad de Ciencias Econmicas y Administrativas, De Paraguay y la Universidad Pablo de Olavide, de Sevilla.","despues":"Universidad Nacional de Concepción – Facultad de Ciencias Económicas y Administrativas, De Paraguay y la Universidad Pablo de Olavide, de Sevilla.","motivo":"Errata de tipeo." },
  { "tipo":"internacional","sourceRow":25,"year":2019,"campo":"fechaFirma","antes":"____________","despues":null,"motivo":"Valor de relleno «____________»; se deja vacío." },
  { "tipo":"internacional","sourceRow":29,"year":2020,"campo":"denominacion","antes":"Convenio Especifico de Cooperacion","despues":"Convenio Específico de Cooperación","motivo":"Faltan tildes (mismo título que la fila nacional 2021; no figuraba en la lista del informe)." },
  { "tipo":"internacional","sourceRow":29,"year":2020,"campo":"duracion","antes":"____________","despues":null,"motivo":"Valor de relleno «____________»; se deja vacío." },
  { "tipo":"internacional","sourceRow":30,"year":2021,"campo":"denominacion","antes":"Convenio Especifico de Cooperacion","despues":"Convenio Específico de Cooperación","motivo":"Faltan tildes (mismo título que la fila nacional 2021; no figuraba en la lista del informe)." },
  { "tipo":"internacional","sourceRow":34,"year":2022,"campo":"finalidad","antes":"Estableer una cooperación académica, científica y cultural entre la UFMC y la UNC, en el ámbito de promover el intercambio estudiantil.","despues":"Establecer una cooperación académica, científica y cultural entre la UFMC y la UNC, en el ámbito de promover el intercambio estudiantil.","motivo":"Errata de tipeo." },
  { "tipo":"internacional","sourceRow":38,"year":2023,"campo":"participantes","antes":"Universidad Nacional de Concepción y la UniversidaEstadual Do Centro Oeste, UNICENTRO.","despues":"Universidad Nacional de Concepción y la Universidade Estadual Do Centro Oeste, UNICENTRO.","motivo":"Dos palabras pegadas («Universidade» + «Estadual»), como las otras filas en portugués." },
  { "tipo":"internacional","sourceRow":39,"year":2023,"campo":"finalidad","antes":"Establecer una amplia y mutual cooperación entre UFP y la UNC. Las Universidades que firman el presente documento declaran su intención de promover intercambios que sean de mutuo beneficio para las instituciones.","despues":"Establecer una amplia y mutua cooperación entre UFP y la UNC. Las Universidades que firman el presente documento declaran su intención de promover intercambios que sean de mutuo beneficio para las instituciones.","motivo":"Concordancia (anglicismo «mutual»)." },
  { "tipo":"internacional","sourceRow":40,"year":2024,"campo":"finalidad","antes":"Establecer una amplia y mutual cooperación entre UnB y la UNC. Las Universidades se proponen desarrollar un programa de mutua cooperación e intercambio académico, científico y cultural, abarcando áreas de interes mutuo.","despues":"Establecer una amplia y mutua cooperación entre UnB y la UNC. Las Universidades se proponen desarrollar un programa de mutua cooperación e intercambio académico, científico y cultural, abarcando áreas de interes mutuo.","motivo":"Concordancia (anglicismo «mutual»)." },
  { "tipo":"internacional","sourceRow":41,"year":2024,"campo":"participantes","antes":"Universidad Nacional de Concepción y VNIVERSIDAD DSALAMANCA","despues":"Universidad Nacional de Concepción y UNIVERSIDAD DE SALAMANCA","motivo":"Errata de tipeo: la propia cadena nombra Salamanca (fila 2024 junto a Sevilla y Valparaíso)." },
  { "tipo":"internacional","sourceRow":41,"year":2024,"campo":"duracion","antes":"0","despues":null,"motivo":"Valor «0» sin significado (duración nula); se deja vacío." },
  { "tipo":"internacional","sourceRow":43,"year":2024,"campo":"participantes","antes":"Universidad Nacional de Concepción y UNIVERSIDAD ESTADUAL DE MATO GROOSO DO SUL","despues":"Universidad Nacional de Concepción y UNIVERSIDAD ESTADUAL DE MATO GROSSO DO SUL","motivo":"Errata de tipeo (Mato Grosso do Sul)." },
]

/** Duplicados del origen que no se siembran. Se conserva la fila de menor sourceRow (la que se mantiene). */
export const CONVENIOS_DUPLICADOS_EXCLUIDOS = [
  {
    tipo: 'nacional',
    sourceRow: 40,
    year: 2016,
    title: 'Convenio Marco de Cooperación Interinstitucional.',
    parties:
      'Universidad Nacional de Concepción- Facultad de Ciencias Agrarias y la Asociación de Docentes de la Facultad de ciencias Agrarias de la UNC.',
    duplicaDe: { tipo: 'nacional', sourceRow: 38 },
    motivo:
      'Duplicado de la fila 38 (mismo convenio, «04 de Noviembre» / «4 de Noviembre»). Ambas filas carecen de enlace en el origen; el PO pidió borrar el duplicado sin enlace y, al no haber diferencia, se retira la posterior (fila 40).',
  },
]

/** Filas que cambian de tabla. `orden` = posición dentro de su año en el destino. */
export const CONVENIOS_RECLASIFICADOS = [
  {
    tipo: 'nacional',
    sourceRow: 5,
    tipoNuevo: 'internacional',
    orden: 1,
    motivo:
      'Universidade Federal da Grande Dourados (Brasil), 2009: es un convenio internacional publicado por error en la tabla nacional (decisión del PO).',
  },
]

/** Clave de fila de origen. */
const claveFila = (tipo, sourceRow) => `${tipo}#${sourceRow}`

/**
 * Aplica la capa a las filas verbatim y devuelve { nacionales, internacionales }. No muta la entrada.
 * - Filas corregidas o reclasificadas llevan `original` (foto verbatim previa); las reclasificadas, además,
 *   `reclasificadoDesde`. Las filas excluidas se omiten. Las reclasificadas se agregan al final de la tabla destino
 *   (el orden de origen se conserva; la página ordena por año).
 * - Lanza si una fila no existe o si `antes`/título/participantes no coinciden con lo revisado.
 */
export function aplicarCapaCorrecciones({ nacionales, internacionales }) {
  const porClave = new Map()
  for (const r of [...nacionales, ...internacionales]) porClave.set(claveFila(r.type, r.sourceRow), { ...r })
  const get = (tipo, sourceRow) => {
    const r = porClave.get(claveFila(tipo, sourceRow))
    if (!r) throw new Error(`Corrección sobre una fila inexistente: ${tipo} ${sourceRow}`)
    return r
  }
  const foto = (r) => Object.fromEntries(CAMPOS_ORIGINALES.map((c) => [c, r[c] ?? null]))

  const excluidas = new Set()
  for (const d of CONVENIOS_DUPLICADOS_EXCLUIDOS) {
    const r = get(d.tipo, d.sourceRow)
    if (r.title !== d.title || r.parties !== d.parties || r.year !== d.year) {
      throw new Error(`El duplicado ${d.tipo} ${d.sourceRow} no coincide con el texto revisado`)
    }
    excluidas.add(claveFila(d.tipo, d.sourceRow))
  }

  for (const c of CONVENIOS_CORRECCIONES) {
    const r = get(c.tipo, c.sourceRow)
    if (excluidas.has(claveFila(c.tipo, c.sourceRow))) throw new Error(`Corrección sobre una fila excluida: ${c.tipo} ${c.sourceRow}`)
    const prop = CAMPO_DATASET[c.campo]
    if (!prop) throw new Error(`Campo desconocido en la corrección: ${c.campo}`)
    if (r.year !== c.year) throw new Error(`Año distinto en la corrección ${c.tipo} ${c.sourceRow}`)
    if ((r[prop] ?? null) !== c.antes) throw new Error(`El valor de ${c.tipo} ${c.sourceRow} (${c.campo}) no coincide con «antes»`)
    r.original ??= foto(r)
    r[prop] = c.despues
  }

  for (const m of CONVENIOS_RECLASIFICADOS) {
    const r = get(m.tipo, m.sourceRow)
    r.original ??= foto(r)
    r.reclasificadoDesde = m.tipo
    r.type = m.tipoNuevo
    r.orden = m.orden
  }

  const vivas = (lista) =>
    lista.filter((x) => !excluidas.has(claveFila(x.type, x.sourceRow))).map((x) => porClave.get(claveFila(x.type, x.sourceRow)))
  const todas = [...vivas(nacionales), ...vivas(internacionales)]
  return {
    nacionales: todas.filter((r) => r.type === 'nacional'),
    internacionales: [...todas.filter((r) => r.type === 'internacional' && !r.reclasificadoDesde), ...todas.filter((r) => r.reclasificadoDesde === 'nacional' && r.type === 'internacional')],
  }
}
