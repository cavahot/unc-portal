// Contenido inicial del global `legalizaciones` (INST-11): lo que estaba escrito en `app/[locale]/legalizaciones/page.tsx`
// (3 categorías de documentos, 10 pasos, plazo de 12 a 24 horas hábiles, dependencia). Se carga tal cual estaba; la única
// edición es de redacción: el texto de la página usaba voseo en el encabezado de la sección y aquí no se incluye.
// El arancel NO se guarda aquí: la siembra enlaza la fila «Legalizaciones» de `aranceles-rectorado`.
// Sin revisión de la fuente: Secretaría General debe confirmar requisitos, pasos, plazo y arancel antes de publicar.

/** Concepto de la fila de `aranceles-rectorado` que se enlaza (el de scripts/lib/arancelesSeedData.mjs). */
export const ARANCEL_CONCEPTO = 'Legalizaciones'

export const LEGALIZACIONES_SEED = {
  titulo: 'Legalización de documentos',
  descripcion:
    'Servicio de legalización de títulos de pregrado, grado y posgrado emitidos por la UNC, otras universidades, y expedientes para exámenes de ingreso.',
  unidad: 'Secretaría General — UNC',
  plazoMinHoras: 12,
  plazoMaxHoras: 24,
  tipos: [
    {
      slug: 'titulos',
      etiqueta: 'Categoría 1',
      titulo: 'Títulos de pregrado, grado y posgrado',
      subtitulo: null,
      acento: 'verde',
      requisitos: [
        { texto: 'Original o fotocopia del título académico debidamente registrado por el Ministerio de Educación y Ciencias (MEC).' },
        { texto: 'Según la modalidad que se desee legalizar.' },
      ],
    },
    {
      slug: 'certificados',
      etiqueta: 'Categoría 2',
      titulo: 'Certificados de estudio de pregrado, grado y posgrado',
      subtitulo: null,
      acento: 'azul',
      requisitos: [{ texto: 'Original o fotocopia del Certificado de Estudios.' }],
    },
    {
      slug: 'expedientes',
      etiqueta: 'Categoría 3',
      titulo: 'Expedientes para exámenes de ingreso',
      subtitulo: null,
      acento: 'violeta',
      requisitos: [
        {
          texto:
            'Certificado de estudios de la Educación Media, generado por el Sistema NAUTILUS y visado por la Supervisión de Apoyo y Control Administrativo correspondiente.',
        },
        {
          texto:
            'Si cursó en el extranjero: el documento debe estar legalizado por el Ministerio de Relaciones Exteriores (MRE) o contar con el Apostillado de La Haya, y tener resolución de reconocimiento del MEC.',
        },
        { texto: 'Paraguayos: fotocopia autenticada por Escribanía Pública de Cédula de Identidad Civil.' },
        {
          texto:
            'Extranjeros: fotocopia autenticada por Escribanía Pública de documento de identidad y Carné de Residencia temporal o permanente.',
        },
      ],
    },
  ],
  pasos: [
    { responsable: 'Recurrente', descripcion: 'Presentación de las documentaciones requeridas para el proceso.' },
    {
      responsable: 'Mesa de Entrada / Atención al Usuario',
      descripcion: 'Recibidos los documentos, se provee de una contraseña para proceder al pago de los aranceles correspondientes.',
    },
    { responsable: 'Perceptoría – Recurrente', descripcion: 'Pago de los aranceles correspondientes.' },
    {
      responsable: 'Mesa de Entrada / Atención al Usuario',
      descripcion: 'Se deriva el legajo a la Secretaría General para los procesos de control, legalización y registro en el Libro correspondiente.',
    },
    {
      responsable: 'Asistente de Secretaría General',
      descripcion: 'En caso de encontrarse alguna incorrección en el legajo, se devuelve a Mesa de Entrada para notificación al afectado.',
    },
    {
      responsable: 'Asistente de Secretaría General',
      descripcion:
        'Culminados los controles y encontrándose las documentaciones en regla, se procede a la legalización e inscripción en los registros, previa firma y sello del Secretario General de la UNC.',
    },
    {
      responsable: 'Asistente de Secretaría General',
      descripcion: 'Una vez legalizado el documento, se devuelve a Mesa de Entrada, donde permanece hasta su retiro.',
    },
    {
      responsable: 'Asistente de Secretaría General',
      descripcion: 'Una vez devuelto el documento legalizado, se procede al archivo del legajo pertinente.',
    },
    {
      responsable: 'Mesa de Entrada / Atención al Usuario',
      descripcion: 'Entrega de los documentos al recurrente, previa presentación de la contraseña y comprobante de pago de aranceles.',
    },
    { responsable: 'Asistente de Secretaría General', descripcion: 'Archivo final de la contraseña.' },
  ],
}
