/**
 * pilaresSeedData.mjs — PILARES-01: contenido inicial del global `pilares-academicos`.
 * Spec: docs/specs/portal/PILARES-ACADEMICOS.md.
 *
 * Origen de cada texto (para que los responsables lo confirmen desde el panel):
 *   - Tarjetas: propuesta de diseño «Propuesta 02 • Editorial & Métricas» (2026-11-10). Redacción de la propuesta, sin
 *     confirmar por las dependencias.
 *   - Páginas de Investigación y Extensión: el contenido que hasta ahora estaba escrito en el portal
 *     (messages/es/pages.investigacion.json y app/[locale]/extension/page.tsx), conservado para no perderlo.
 * Reglas: ninguna cifra a mano. Las métricas de Docencia se vinculan a «Estadísticas»; las cifras de la propuesta para
 * Investigación y Extensión (45+, PRONII, 80+, Anual) no tienen fuente y NO se cargan. Todas las páginas quedan
 * «en construcción».
 */

const text = (t, format = 0) => ({ type: 'text', version: 1, text: t, format, detail: 0, mode: 'normal', style: '' })
const block = (type, children, extra = {}) => ({ type, version: 1, direction: 'ltr', format: '', indent: 0, children, ...extra })
const p = (t) => block('paragraph', [text(t)], { textFormat: 0 })
const h = (tag, t) => block('heading', [text(t)], { tag })
const ul = (items) => block('list', items.map((t, i) => block('listitem', [text(t)], { value: i + 1 })), { listType: 'bullet', start: 1, tag: 'ul' })
const doc = (...children) => ({ root: block('root', children) })

const stat = (estadistica, etiqueta) => ({ origen: 'estadistica', estadistica, etiqueta })

export const PILARES_SEED = {
  docencia: {
    titulo: 'Docencia de Grado y Posgrado',
    bajada: 'Formación de alta competencia',
    descripcion:
      'Planes curriculares actualizados bajo estándares de la ANEAES, articulando teoría, laboratorios de vanguardia y formación de juicio crítico.',
    icono: 'birrete',
    metricas: [stat('totalCarrerasAcreditadas', 'Carreras acreditadas'), stat('totalEstudiantes', 'Estudiantes activos')],
    enlaceTexto: 'Ir a Docencia',
    pagina: {
      estado: 'construccion',
      estadisticas: [stat('totalDocentes', 'Docentes'), stat('totalEgresados', 'Egresados'), stat('totalFacultades', 'Facultades')],
    },
  },
  investigacion: {
    titulo: 'Investigación y Desarrollo',
    bajada: 'Ciencia aplicada al territorio',
    descripcion:
      'Fomento de proyectos en áreas prioritarias: biotecnología, producción sostenible, ciencias de la salud, humanidades y tecnología regional.',
    icono: 'matraz',
    metricas: [],
    enlaceTexto: 'Ir a Investigación',
    pagina: {
      estado: 'construccion',
      contenido: doc(
        p('La UNC promueve la generación de conocimiento científico orientado al desarrollo sostenible de Concepción y el norte del Paraguay.'),
        h('h2', 'Líneas de investigación'),
        h('h3', 'Ciencias de la Salud'),
        ul([
          'Epidemiología de enfermedades tropicales en el norte del Paraguay',
          'Salud bucal comunitaria en zonas rurales de Concepción',
          'Impacto nutricional en el rendimiento escolar',
        ]),
        h('h3', 'Ciencias Agrarias y Ambiente'),
        ul([
          'Agricultura sostenible y gestión de recursos hídricos',
          'Biodiversidad y conservación del Chaco paraguayo',
          'Impacto del cambio climático en la producción agropecuaria regional',
        ]),
        h('h3', 'Tecnología e Ingeniería'),
        ul([
          'Energías renovables aplicadas a comunidades rurales',
          'Infraestructura vial y gestión de obras en el norte del país',
          'Sistemas de información geográfica para planificación territorial',
        ]),
        h('h3', 'Ciencias Sociales y Humanidades'),
        ul([
          'Historia y patrimonio cultural de la región de Concepción',
          'Educación intercultural bilingüe en comunidades indígenas',
          'Desarrollo económico local y emprendimiento regional',
        ]),
      ),
      estadisticas: [],
    },
  },
  extension: {
    titulo: 'Extensión Universitaria',
    bajada: 'Transferencia e impacto social',
    descripcion:
      'Articulación permanente entre docentes, estudiantes y comunidades con programas de salud comunitaria, asesoría jurídica y desarrollo cultural.',
    icono: 'personas',
    metricas: [],
    enlaceTexto: 'Ir a Extensión',
    pagina: {
      estado: 'construccion',
      contenido: doc(
        p('La UNC construye puentes entre el conocimiento académico y la sociedad. Sus programas de extensión universitaria y vinculación fortalecen el desarrollo sostenible del norte paraguayo.'),
        h('h2', 'Líneas de acción'),
        h('h3', 'Proyección comunitaria'),
        p('Programas que articulan el saber universitario con las necesidades de comunidades rurales y urbanas del departamento de Concepción.'),
        h('h3', 'Vinculación con el sector productivo'),
        p('Convenios y proyectos conjuntos con organismos públicos, empresas y organizaciones de la sociedad civil orientados al desarrollo regional.'),
        h('h3', 'Arte y cultura'),
        p('Eventos, talleres y producciones culturales que potencian la identidad y el patrimonio del norte paraguayo.'),
        h('h3', 'Salud comunitaria'),
        p('Operativos y brigadas de salud coordinados con facultades de Medicina y Odontología para comunidades de escasos recursos.'),
        h('h3', 'Consultorio jurídico gratuito'),
        p('Asistencia legal a ciudadanos de bajos ingresos, administrado por la Facultad de Ciencias Económicas y Administrativas.'),
        h('h3', 'Transferencia agroalimentaria'),
        p('Capacitaciones y asistencia técnica a productores agropecuarios en coordinación con la Facultad de Ciencias Agrarias.'),
      ),
      estadisticas: [],
    },
  },
}
