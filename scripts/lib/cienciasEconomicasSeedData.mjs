// FAC-07: datos de Ciencias Económicas separados de la composición visual.
// Qué hace: conserva facultad, carreras y aranceles como entrada versionable para Payload.
// Amenaza: evita que la página publique una segunda copia local y permite repetir el seed sin duplicados.
// Límite: los montos deben confirmarse editorialmente antes de producción porque la fuente no declara una vigencia visible.
export const SOURCES = {
  UNC: 'https://www.unc.edu.py/facultad-de-ciencias-economicas-y-administrativas/',
  FCEA: 'https://www.fcea-unc.edu.py/',
  CONES: 'https://cones.gov.py/universidad-nacional-de-concepcion/',
}

export const FACULTAD_SLUG = 'facultad-de-ciencias-economicas-y-administrativas'
export const FACULTAD_NOMBRE = 'Facultad de Ciencias Económicas y Administrativas'

export const FACULTAD_FIELDS = {
  descripcion: { value: 'Unidad académica de la Universidad Nacional de Concepción orientada a la formación profesional en administración, contabilidad, economía e informática empresarial.', sourceUrl: SOURCES.UNC },
  direccion: { value: 'Campus Universitario: Ruta PY05, km 210, Concepción, Paraguay.', sourceUrl: SOURCES.UNC },
  telefono: { value: '(595 331) 241749', sourceUrl: SOURCES.FCEA },
  email: { value: 'secretariageneral@fcea-unc.edu.py', sourceUrl: SOURCES.FCEA },
  sitioWeb: { value: 'https://www.fcea-unc.edu.py/', sourceUrl: SOURCES.FCEA },
  logoPath: { value: '/images/facultades/economicas.png', sourceUrl: SOURCES.UNC },
}

const career = (slug, nombre, tipo, orden, sede, resoluciones = []) => ({ slug, nombre, tipo, orden, sede, modalidad: 'Presencial', activa: true, resoluciones, sourceUrl: SOURCES.UNC })

export const CARRERAS = [
  career('ingenieria-comercial', 'Ingeniería Comercial', 'grado', 1, 'Concepción', [{ numero: '17/16' }, { numero: '454/26', detalle: 'Sede Central/Concepción' }]),
  career('ingenieria-en-informatica-empresarial', 'Ingeniería en Informática Empresarial', 'grado', 2, 'Concepción', [{ numero: '16/16', detalle: 'Central/Concepción' }, { numero: '238/21', detalle: 'Sede Concepción' }, { numero: '942/25', detalle: 'Sede Central' }]),
  career('licenciatura-en-administracion', 'Licenciatura en Administración', 'grado', 3, 'Central/Horqueta', [{ numero: '124/16', detalle: 'Central/Concepción' }, { numero: '123/16', detalle: 'Horqueta' }]),
  career('contaduria-publica', 'Contaduría Pública', 'grado', 4, 'Central/Horqueta', [{ numero: '159/16', detalle: 'Central/Concepción' }, { numero: '158/16', detalle: 'Horqueta' }]),
  career('especializacion-en-administracion-financiera-gubernamental', 'Especialización en Administración Financiera Gubernamental', 'posgrado', 1, 'Central/Concepción', [{ numero: '518/16' }]),
  career('maestria-en-administracion-y-direccion-de-empresas', 'Maestría en Administración y Dirección de Empresas', 'posgrado', 2, 'Central/Concepción', [{ numero: '561/16' }]),
  career('maestria-en-auditoria', 'Maestría en Auditoría', 'posgrado', 3, 'Central/Concepción', [{ numero: '564/16' }]),
  career('especializacion-en-auditoria-impositiva', 'Especialización en Auditoría Impositiva', 'posgrado', 4, 'Horqueta', [{ numero: '528/17' }]),
  career('maestria-en-analitica-de-datos-en-el-area-empresarial', 'Maestría en Analítica de Datos en el Área Empresarial', 'posgrado', 5, 'Concepción', [{ numero: '136/21' }]),
  career('maestria-en-contabilidad-y-finanzas', 'Maestría en Contabilidad y Finanzas', 'posgrado', 6, 'Central/Concepción', [{ numero: '348/22' }]),
  career('especializacion-en-direccion-y-gestion-de-mipymes', 'Especialización en Dirección y Gestión de Mipymes', 'posgrado', 7, 'Central/Concepción', [{ numero: '100/24' }]),
  career('doctorado-en-administracion-y-direccion-de-empresas', 'Doctorado en Administración y Dirección de Empresas', 'posgrado', 8, 'Central/Concepción', [{ numero: '101/24' }]),
]

const fee = (grupo, concepto, monto, orden) => ({ grupo, concepto, monto, orden, active: true, sourceUrl: SOURCES.FCEA })

export const ARANCELES = [
  fee('multas', 'Multas', 10000, 1),
  fee('multas', 'Multa por retraso de devolución de libros (por día)', 5000, 2),
  fee('venta', 'Programas de estudios por materia (foliados y rubricados)', 50000, 3),
  fee('venta', 'Constancias Varias', 50000, 4),
  fee('venta', 'Carpeta para concurso', 150000, 5),
  fee('venta', 'Credencial de estudiante/funcionario/docente', 100000, 6),
  fee('venta', 'Certificados de estudios parcial y completo', 50000, 7),
  fee('venta', 'Formulario de inscripción', 300000, 8),
  fee('servicios', 'Uso de Laboratorio de Informática', 450000, 9),
  fee('servicios', 'Matrícula Grado', 300000, 10),
  fee('servicios', 'Cuota mensual Grado', 100000, 11),
  fee('servicios', 'Cuota Recursante', 50000, 12),
  fee('servicios', 'Matrícula Maestría', 500000, 13),
  fee('servicios', 'Cuotas Maestría', 700000, 14),
  fee('servicios', 'Matrícula Doctorado', 1500000, 15),
  fee('servicios', 'Cuotas Doctorado', 1500000, 16),
  fee('servicios', 'Derecho Examen 1° Oportunidad', 50000, 17),
  fee('servicios', 'Derecho Examen 2° Oportunidad', 60000, 18),
  fee('servicios', 'Derecho Examen 3° Oportunidad', 70000, 19),
  fee('servicios', 'Defensa de Tesis Maestría', 1000000, 20),
  fee('servicios', 'Defensa de Tesis Doctorado', 2000000, 21),
  fee('servicios', 'Solicitud cambio de carrera', 300000, 22),
  fee('servicios', 'Reincorporación', 500000, 23),
]

export const OMITIDOS = []
const seedData = { SOURCES, FACULTAD_SLUG, FACULTAD_NOMBRE, FACULTAD_FIELDS, CARRERAS, ARANCELES, OMITIDOS }
export default seedData
