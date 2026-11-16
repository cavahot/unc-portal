// INST-05: contenido de /tramites publicado hasta ahora en components/tramites/FacultadTabs.tsx, copiado de forma programática
// (no retranscrito) para sembrar la colección `tramites` del CMS. Fuente de verdad desde la siembra: el CMS; este archivo solo
// sirve para cargar el contenido inicial (scripts/seed-tramites.mjs) y nunca lo importa el portal.
// `facultad` es el slug de la colección `facultades`. `orden` es la posición del trámite dentro de su facultad.
export const TRAMITES_SEED = [
  {
    "facultad": "facultad-de-medicina",
    "titulo": "Inscripción al Examen de Ingreso",
    "descripcion": "Documentos requeridos para postularse al Examen de Ingreso a la Carrera de Medicina. Primum non Nocere — Fundada en 2005.",
    "requisitos": [
      "Formulario de inscripción (disponible en Secretaría)",
      "Fotocopia de Cédula de Identidad vigente",
      "Fotocopia legalizada del Título de Bachiller o equivalente",
      "2 fotografías recientes tamaño carnet (fondo blanco)",
      "Comprobante de pago del arancel de inscripción",
      "Nota de solicitud dirigida al Sr. Decano"
    ],
    "nota": "Las inscripciones se reciben en la Secretaría de la Facultad de lunes a viernes de 07:00 a 12:00 hs.",
    "orden": 1
  },
  {
    "facultad": "facultad-de-medicina",
    "titulo": "Matrícula — Alumnos Admitidos",
    "descripcion": "Requisitos para formalizar la matrícula tras aprobar el Examen de Ingreso.",
    "requisitos": [
      "Resultado del Examen de Ingreso aprobado",
      "Cédula de Identidad original y fotocopia",
      "2 fotografías tamaño carnet (fondo blanco)",
      "Comprobante de pago del arancel de matrícula",
      "Formulario de matrícula completo y firmado"
    ],
    "orden": 2
  },
  {
    "facultad": "facultad-de-odontologia",
    "titulo": "Inscripción al Examen de Ingreso — Carrera de Odontología",
    "descripcion": "Para la inscripción al Examen de Ingreso Carrera de Odontología se exigirán de manera indispensable la presentación de:",
    "requisitos": [
      "Certificado de Estudios sistema NAUTILUS actualizado",
      "Copia autenticada de Título de Bachiller",
      "Visación por el Rectorado de la U.N.C. Para los postulantes extranjeros: Certificado Analítico de Estudios debidamente legalizado",
      "2 Copias autenticadas de Cédula de Identidad Policial, Pasaporte o Documento Nacional de Identidad",
      "Constancia de haber cursado el C.P.I durante el periodo Extensivo o Intensivo",
      "Cancelación del costo del CPI (matrícula más anualidad)",
      "Pago del arancel a examen de ingreso"
    ],
    "orden": 1
  },
  {
    "facultad": "facultad-de-odontologia",
    "titulo": "Requisitos de Admisión — Carrera de Odontología",
    "requisitos": [
      "Cumplir las condiciones que establezcan los reglamentos de la Universidad Nacional de Concepción y las respectivas Facultades (Estatuto UNC. Art 88 Título V. De los Estudiantes)"
    ],
    "orden": 2
  },
  {
    "facultad": "facultad-de-odontologia",
    "titulo": "Inscripción — Lic. en Prótesis Dental",
    "descripcion": "Para la inscripción a la Carrera de Licenciatura en Prótesis Dental se exigirán de manera indispensable la presentación de:",
    "requisitos": [
      "Certificado de Estudios sistema NAUTILUS actualizado",
      "Copia autenticada de Título de Bachiller",
      "Visación por el Rectorado de la U.N.C. Para los postulantes extranjeros: Certificado Analítico de Estudios debidamente legalizado",
      "2 Copias autenticadas de Cédula de Identidad Policial, Pasaporte o Documento Nacional de Identidad"
    ],
    "orden": 3
  },
  {
    "facultad": "facultad-de-ciencias-agrarias",
    "titulo": "Art. 150° — Matriculación (Ing. Agronómica)",
    "etiqueta": "Art. 150°",
    "descripcion": "Ingeniería Agronómica — 5 años. Pago de cuotas educativas según Ley 6628/2020 con comprobante y:",
    "requisitos": [
      "Aprobación del Curso de Preparación al Ingreso (CPI)",
      "Solicitud de inscripción completada de la Facultad",
      "2 fotocopias autenticadas de Cédula de Identidad",
      "1 fotocopia autenticada del Título de Bachiller, registrado en el MEC y legalizado por Rectorado",
      "Certificación Académica original en formato NAUTILUS, visada por supervisión correspondiente y legalizada por Rectorado",
      "2 fotografías tamaño carnet"
    ],
    "orden": 1
  },
  {
    "facultad": "facultad-de-ciencias-agrarias",
    "titulo": "Art. 151° — Inscripción de Asignaturas",
    "etiqueta": "Art. 151°",
    "descripcion": "Procedimiento para la inscripción formal de asignaturas del período lectivo.",
    "requisitos": [
      "Completar y presentar solicitud a la Dirección de Carrera",
      "La Dirección de Carrera asigna número de registro y habilita autorización de pago",
      "Pagar la cuota correspondiente según Ley 6628/2020",
      "Entregar copia del comprobante de pago a la Dirección de Carrera"
    ],
    "nota": "Art. 171°: Las inscripciones se realizan en las instalaciones de la Facultad en las oficinas de Coordinación Académica.",
    "orden": 2
  },
  {
    "facultad": "facultad-de-ciencias-agrarias",
    "titulo": "Exámenes del CPI (Curso de Preparación al Ingreso)",
    "descripcion": "Materias del examen de ingreso al CPI — abierto a todos los egresados del nivel secundario.",
    "requisitos": [
      "Comunicación — Español / Guaraní",
      "Introducción a las Matemáticas",
      "Biología General",
      "Introducción a las Ciencias Básicas",
      "Física — Química"
    ],
    "nota": "Art. 174°: Los estudiantes de tercer año del nivel secundario podrán inscribirse presentando certificado del director de su institución.",
    "orden": 3
  },
  {
    "facultad": "facultad-de-ciencias-agrarias",
    "titulo": "Art. 103° — Lic. Administración Agropecuaria / Agronegocios",
    "etiqueta": "Art. 103°",
    "descripcion": "Licenciatura en Administración Agropecuaria o Administración de Agronegocios — 4 años. Pre-inscripción directa en Secretaría Académica; 40 cupos seleccionados por promedio de calificaciones.",
    "requisitos": [
      "Solicitud de inscripción completada de la Facultad",
      "2 fotocopias autenticadas de Cédula de Identidad",
      "1 fotocopia autenticada del Título de Bachiller, registrado en el MEC y legalizado por Rectorado",
      "Certificación Académica original en formato NAUTILUS, visada y legalizada por Rectorado",
      "2 fotografías tamaño carnet",
      "Pago de cuotas educativas según Ley 6628/2020"
    ],
    "orden": 4
  },
  {
    "facultad": "facultad-de-ciencias-agrarias",
    "titulo": "Requisitos de Egreso — Art. 267°",
    "etiqueta": "Art. 267°",
    "requisitos": [
      "Aprobación de todas las materias del plan de estudios",
      "Pago de los aranceles correspondientes",
      "Presentación y defensa de la tesis final",
      "Realización de la pasantía curricular",
      "Puntos de actividad de extensión requeridos"
    ],
    "orden": 5
  },
  {
    "facultad": "facultad-de-ciencias-economicas-y-administrativas",
    "titulo": "Inscripción al Examen de Ingreso",
    "descripcion": "Documentación para postularse al Examen de Ingreso a las carreras de la Facultad de Ciencias Económicas y Administrativas.",
    "requisitos": [
      "Formulario de inscripción (disponible en Secretaría)",
      "Fotocopia de Cédula de Identidad vigente",
      "Fotocopia legalizada del Título de Bachiller o equivalente",
      "2 fotografías recientes tamaño carnet",
      "Comprobante de pago del arancel de inscripción"
    ],
    "nota": "Carreras disponibles: Contaduría Pública, Administración de Empresas y Economía.",
    "orden": 1
  },
  {
    "facultad": "facultad-de-ciencias-economicas-y-administrativas",
    "titulo": "Matrícula — Alumnos Admitidos",
    "requisitos": [
      "Resultado del Examen de Ingreso aprobado",
      "Cédula de Identidad original y fotocopia",
      "2 fotografías tamaño carnet",
      "Comprobante de pago del arancel de matrícula",
      "Formulario de matrícula completo"
    ],
    "orden": 2
  },
  {
    "facultad": "facultad-de-ciencias-economicas-y-administrativas",
    "titulo": "Trámites de Egreso",
    "requisitos": [
      "Aprobación de todas las materias del plan de estudios",
      "Comprobante de pago de todos los aranceles pendientes",
      "Formulario de solicitud de egreso",
      "Trabajo final aprobado según reglamento de la carrera"
    ],
    "orden": 3
  },
  {
    "facultad": "facultad-de-humanidades-y-ciencias-de-la-educacion",
    "titulo": "Requisitos de Ingreso",
    "descripcion": "Legajo académico con los siguientes documentos adjuntos:",
    "requisitos": [
      "2 fotografías tamaño carnet",
      "2 copias autenticadas de Cédula de Identidad",
      "1 copia autenticada del Título de Bachiller",
      "Original de la Certificación Académica del nivel secundario",
      "Aprobación del examen de ingreso"
    ],
    "nota": "Nivel mínimo aprobatorio: 70%.",
    "orden": 1
  },
  {
    "facultad": "facultad-de-humanidades-y-ciencias-de-la-educacion",
    "titulo": "Requisitos de Egreso",
    "requisitos": [
      "Aprobación de todas las materias del plan de estudios",
      "Presentación y defensa de la monografía final",
      "Pago de todos los aranceles correspondientes"
    ],
    "orden": 2
  },
  {
    "facultad": "facultad-de-ciencias-exactas-y-tecnologicas",
    "titulo": "Requisitos de Admisión",
    "descripcion": "Documentación requerida para el ingreso a las carreras de la Facultad de Ciencias Exactas y Tecnológicas.",
    "requisitos": [
      "Aprobación del examen pre-admisión del CPI",
      "Certificado de estudios secundarios legalizado por el Rectorado",
      "Fotocopia autenticada por notario del Título de Bachiller",
      "Fotocopia autenticada por notario de Cédula de Identidad o Pasaporte (estudiantes extranjeros)"
    ],
    "orden": 1
  },
  {
    "facultad": "facultad-de-ciencias-exactas-y-tecnologicas",
    "titulo": "Inscripción de Asignaturas — Arts. 14–19°",
    "etiqueta": "Arts. 14–19°",
    "descripcion": "Reglamento de inscripción y matriculación de asignaturas.",
    "requisitos": [
      "Art. 14°: Los estudiantes se inscriben en las asignaturas deseadas; la Dirección Académica autoriza previa verificación de correlatividades",
      "Art. 15°: Hasta 5° semestre: máximo 7 asignaturas por período; luego de completar 5° semestre: máximo 9 asignaturas (incluyendo electivas)",
      "Art. 16°: La inscripción a una asignatura requiere aprobación o habilitación al examen final de la asignatura correlativa",
      "Art. 17°: Período de matrícula: marzo–mayo anualmente; pago único anual o fraccionado",
      "Art. 19°: La habilitación al examen final requiere pago total al día de todos los aranceles de la Facultad"
    ],
    "orden": 2
  },
  {
    "facultad": "facultad-de-ciencias-exactas-y-tecnologicas",
    "titulo": "Sistema de Evaluación — Arts. 33–37°",
    "etiqueta": "Arts. 33–37°",
    "descripcion": "La Evaluación Final comprende dos componentes:",
    "requisitos": [
      "Evaluación de Proceso (70 puntos): 2 exámenes parciales + trabajos prácticos + actividades de laboratorio",
      "Examen Final (30 puntos): evaluación integral del programa de la asignatura",
      "Art. 35°: Los parciales combinados cubren el programa completo; 20 puntos cada uno",
      "Art. 37°: Acumulación inferior a 35 puntos en la Evaluación de Proceso → repetición de la asignatura"
    ],
    "nota": "Contacto: academicofacet@unc.edu.py | decanatofacet@unc.edu.py | Tel: 0331-243361",
    "orden": 3
  }
]
