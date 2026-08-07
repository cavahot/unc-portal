'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TramiteItem {
  id: string
  title: string
  description?: string
  requirements: string[]
  note?: string
  badge?: string
  linkHref?: string
  linkLabel?: string
}

interface Faculty {
  id: string
  name: string
  shortName: string
  logo: string
  accent: string
  tramites: TramiteItem[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FACULTADES: Faculty[] = [
  {
    id: 'medicina',
    name: 'Facultad de Medicina',
    shortName: 'Medicina',
    logo: '/images/facultades/medicina.png',
    accent: '#2d8a2d',
    tramites: [
      {
        id: 'med-ingreso',
        title: 'Inscripción al Examen de Ingreso',
        description:
          'Documentos requeridos para postularse al Examen de Ingreso a la Carrera de Medicina. Primum non Nocere — Fundada en 2005.',
        requirements: [
          'Formulario de inscripción (disponible en Secretaría)',
          'Fotocopia de Cédula de Identidad vigente',
          'Fotocopia legalizada del Título de Bachiller o equivalente',
          '2 fotografías recientes tamaño carnet (fondo blanco)',
          'Comprobante de pago del arancel de inscripción',
          'Nota de solicitud dirigida al Sr. Decano',
        ],
        note: 'Las inscripciones se reciben en la Secretaría de la Facultad de lunes a viernes de 07:00 a 12:00 hs.',
      },
      {
        id: 'med-matricula',
        title: 'Matrícula — Alumnos Admitidos',
        description:
          'Requisitos para formalizar la matrícula tras aprobar el Examen de Ingreso.',
        requirements: [
          'Resultado del Examen de Ingreso aprobado',
          'Cédula de Identidad original y fotocopia',
          '2 fotografías tamaño carnet (fondo blanco)',
          'Comprobante de pago del arancel de matrícula',
          'Formulario de matrícula completo y firmado',
        ],
      },
    ],
  },
  {
    id: 'odontologia',
    name: 'Facultad de Odontología',
    shortName: 'Odontología',
    logo: '/images/facultades/odontologia.png',
    accent: '#6a6a6a',
    tramites: [
      {
        id: 'odo-ingreso-odo',
        title: 'Inscripción al Examen de Ingreso — Carrera de Odontología',
        description:
          'Para la inscripción al Examen de Ingreso Carrera de Odontología se exigirán de manera indispensable la presentación de:',
        requirements: [
          'Certificado de Estudios sistema NAUTILUS actualizado',
          'Copia autenticada de Título de Bachiller',
          'Visación por el Rectorado de la U.N.C. Para los postulantes extranjeros: Certificado Analítico de Estudios debidamente legalizado',
          '2 Copias autenticadas de Cédula de Identidad Policial, Pasaporte o Documento Nacional de Identidad',
          'Constancia de haber cursado el C.P.I durante el periodo Extensivo o Intensivo',
          'Cancelación del costo del CPI (matrícula más anualidad)',
          'Pago del arancel a examen de ingreso',
        ],
      },
      {
        id: 'odo-admision',
        title: 'Requisitos de Admisión — Carrera de Odontología',
        requirements: [
          'Cumplir las condiciones que establezcan los reglamentos de la Universidad Nacional de Concepción y las respectivas Facultades (Estatuto UNC. Art 88 Título V. De los Estudiantes)',
        ],
      },
      {
        id: 'odo-ingreso-protesis',
        title: 'Inscripción — Lic. en Prótesis Dental',
        description:
          'Para la inscripción a la Carrera de Licenciatura en Prótesis Dental se exigirán de manera indispensable la presentación de:',
        requirements: [
          'Certificado de Estudios sistema NAUTILUS actualizado',
          'Copia autenticada de Título de Bachiller',
          'Visación por el Rectorado de la U.N.C. Para los postulantes extranjeros: Certificado Analítico de Estudios debidamente legalizado',
          '2 Copias autenticadas de Cédula de Identidad Policial, Pasaporte o Documento Nacional de Identidad',
        ],
      },
    ],
  },
  {
    id: 'agrarias',
    name: 'Facultad de Ciencias Agrarias',
    shortName: 'Cs. Agrarias',
    logo: '/images/facultades/agrarias.png',
    accent: '#1a7a1a',
    tramites: [
      {
        id: 'agr-art150-ing',
        title: 'Art. 150° — Matriculación (Ing. Agronómica)',
        description:
          'Ingeniería Agronómica — 5 años. Pago de cuotas educativas según Ley 6628/2020 con comprobante y:',
        requirements: [
          'Aprobación del Curso de Preparación al Ingreso (CPI)',
          'Solicitud de inscripción completada de la Facultad',
          '2 fotocopias autenticadas de Cédula de Identidad',
          '1 fotocopia autenticada del Título de Bachiller, registrado en el MEC y legalizado por Rectorado',
          'Certificación Académica original en formato NAUTILUS, visada por supervisión correspondiente y legalizada por Rectorado',
          '2 fotografías tamaño carnet',
        ],
        badge: 'Art. 150°',
      },
      {
        id: 'agr-art151',
        title: 'Art. 151° — Inscripción de Asignaturas',
        description:
          'Procedimiento para la inscripción formal de asignaturas del período lectivo.',
        requirements: [
          'Completar y presentar solicitud a la Dirección de Carrera',
          'La Dirección de Carrera asigna número de registro y habilita autorización de pago',
          'Pagar la cuota correspondiente según Ley 6628/2020',
          'Entregar copia del comprobante de pago a la Dirección de Carrera',
        ],
        badge: 'Art. 151°',
        note: 'Art. 171°: Las inscripciones se realizan en las instalaciones de la Facultad en las oficinas de Coordinación Académica.',
      },
      {
        id: 'agr-cpi',
        title: 'Exámenes del CPI (Curso de Preparación al Ingreso)',
        description: 'Materias del examen de ingreso al CPI — abierto a todos los egresados del nivel secundario.',
        requirements: [
          'Comunicación — Español / Guaraní',
          'Introducción a las Matemáticas',
          'Biología General',
          'Introducción a las Ciencias Básicas',
          'Física — Química',
        ],
        note: 'Art. 174°: Los estudiantes de tercer año del nivel secundario podrán inscribirse presentando certificado del director de su institución.',
      },
      {
        id: 'agr-art150-lic',
        title: 'Art. 103° — Lic. Administración Agropecuaria / Agronegocios',
        description:
          'Licenciatura en Administración Agropecuaria o Administración de Agronegocios — 4 años. Pre-inscripción directa en Secretaría Académica; 40 cupos seleccionados por promedio de calificaciones.',
        requirements: [
          'Solicitud de inscripción completada de la Facultad',
          '2 fotocopias autenticadas de Cédula de Identidad',
          '1 fotocopia autenticada del Título de Bachiller, registrado en el MEC y legalizado por Rectorado',
          'Certificación Académica original en formato NAUTILUS, visada y legalizada por Rectorado',
          '2 fotografías tamaño carnet',
          'Pago de cuotas educativas según Ley 6628/2020',
        ],
        badge: 'Art. 103°',
      },
      {
        id: 'agr-egreso',
        title: 'Requisitos de Egreso — Art. 267°',
        requirements: [
          'Aprobación de todas las materias del plan de estudios',
          'Pago de los aranceles correspondientes',
          'Presentación y defensa de la tesis final',
          'Realización de la pasantía curricular',
          'Puntos de actividad de extensión requeridos',
        ],
        badge: 'Art. 267°',
      },
    ],
  },
  {
    id: 'economicas',
    name: 'Fac. de Cs. Económicas y Administrativas',
    shortName: 'Cs. Económicas',
    logo: '/images/facultades/economicas.png',
    accent: '#b050a0',
    tramites: [
      {
        id: 'eco-ingreso',
        title: 'Inscripción al Examen de Ingreso',
        description:
          'Documentación para postularse al Examen de Ingreso a las carreras de la Facultad de Ciencias Económicas y Administrativas.',
        requirements: [
          'Formulario de inscripción (disponible en Secretaría)',
          'Fotocopia de Cédula de Identidad vigente',
          'Fotocopia legalizada del Título de Bachiller o equivalente',
          '2 fotografías recientes tamaño carnet',
          'Comprobante de pago del arancel de inscripción',
        ],
        note: 'Carreras disponibles: Contaduría Pública, Administración de Empresas y Economía.',
      },
      {
        id: 'eco-matricula',
        title: 'Matrícula — Alumnos Admitidos',
        requirements: [
          'Resultado del Examen de Ingreso aprobado',
          'Cédula de Identidad original y fotocopia',
          '2 fotografías tamaño carnet',
          'Comprobante de pago del arancel de matrícula',
          'Formulario de matrícula completo',
        ],
      },
      {
        id: 'eco-egreso',
        title: 'Trámites de Egreso',
        requirements: [
          'Aprobación de todas las materias del plan de estudios',
          'Comprobante de pago de todos los aranceles pendientes',
          'Formulario de solicitud de egreso',
          'Trabajo final aprobado según reglamento de la carrera',
        ],
      },
    ],
  },
  {
    id: 'humanidades',
    name: 'Fac. de Humanidades y Cs. de la Educación',
    shortName: 'Humanidades',
    logo: '/images/facultades/humanidades.png',
    accent: '#b08020',
    tramites: [
      {
        id: 'hum-ingreso',
        title: 'Requisitos de Ingreso',
        description:
          'Legajo académico con los siguientes documentos adjuntos:',
        requirements: [
          '2 fotografías tamaño carnet',
          '2 copias autenticadas de Cédula de Identidad',
          '1 copia autenticada del Título de Bachiller',
          'Original de la Certificación Académica del nivel secundario',
          'Aprobación del examen de ingreso',
        ],
        note: 'Nivel mínimo aprobatorio: 70%.',
      },
      {
        id: 'hum-egreso',
        title: 'Requisitos de Egreso',
        requirements: [
          'Aprobación de todas las materias del plan de estudios',
          'Presentación y defensa de la monografía final',
          'Pago de todos los aranceles correspondientes',
        ],
      },
    ],
  },
  {
    id: 'exactas',
    name: 'Fac. de Ciencias Exactas y Tecnológicas',
    shortName: 'Cs. Exactas',
    logo: '/images/facultades/exactas.png',
    accent: '#3a5a8a',
    tramites: [
      {
        id: 'exa-admision',
        title: 'Requisitos de Admisión',
        description:
          'Documentación requerida para el ingreso a las carreras de la Facultad de Ciencias Exactas y Tecnológicas.',
        requirements: [
          'Aprobación del examen pre-admisión del CPI',
          'Certificado de estudios secundarios legalizado por el Rectorado',
          'Fotocopia autenticada por notario del Título de Bachiller',
          'Fotocopia autenticada por notario de Cédula de Identidad o Pasaporte (estudiantes extranjeros)',
        ],
      },
      {
        id: 'exa-inscripcion',
        title: 'Inscripción de Asignaturas — Arts. 14–19°',
        description:
          'Reglamento de inscripción y matriculación de asignaturas.',
        requirements: [
          'Art. 14°: Los estudiantes se inscriben en las asignaturas deseadas; la Dirección Académica autoriza previa verificación de correlatividades',
          'Art. 15°: Hasta 5° semestre: máximo 7 asignaturas por período; luego de completar 5° semestre: máximo 9 asignaturas (incluyendo electivas)',
          'Art. 16°: La inscripción a una asignatura requiere aprobación o habilitación al examen final de la asignatura correlativa',
          'Art. 17°: Período de matrícula: marzo–mayo anualmente; pago único anual o fraccionado',
          'Art. 19°: La habilitación al examen final requiere pago total al día de todos los aranceles de la Facultad',
        ],
        badge: 'Arts. 14–19°',
      },
      {
        id: 'exa-evaluacion',
        title: 'Sistema de Evaluación — Arts. 33–37°',
        description:
          'La Evaluación Final comprende dos componentes:',
        requirements: [
          'Evaluación de Proceso (70 puntos): 2 exámenes parciales + trabajos prácticos + actividades de laboratorio',
          'Examen Final (30 puntos): evaluación integral del programa de la asignatura',
          'Art. 35°: Los parciales combinados cubren el programa completo; 20 puntos cada uno',
          'Art. 37°: Acumulación inferior a 35 puntos en la Evaluación de Proceso → repetición de la asignatura',
        ],
        badge: 'Arts. 33–37°',
        note: 'Contacto: academicofacet@unc.edu.py | decanatofacet@unc.edu.py | Tel: 0331-243361',
      },
    ],
  },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-shrink-0" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-shrink-0" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
      />
    </svg>
  )
}

function TramiteCard({ tramite, accent }: { tramite: TramiteItem; accent: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-white/20 hover:bg-white/[0.05]">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex-shrink-0 w-1 self-stretch rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          {tramite.badge && (
            <span
              className="mb-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold tracking-wide"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              {tramite.badge}
            </span>
          )}
          <h3 className="text-base font-semibold leading-snug text-white">
            {tramite.title}
          </h3>
          {tramite.description && (
            <p className="mt-1.5 text-sm text-white/50 leading-relaxed">
              {tramite.description}
            </p>
          )}
        </div>
      </div>

      {/* Requirements */}
      <ul className="flex flex-col gap-2 flex-1">
        {tramite.requirements.map((req, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
            <span style={{ color: accent }} className="mt-0.5">
              <CheckIcon />
            </span>
            <span>{req}</span>
          </li>
        ))}
      </ul>

      {/* Note */}
      {tramite.note && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
          <span className="text-white/40 mt-0.5">
            <InfoIcon />
          </span>
          <p className="text-xs text-white/50 leading-relaxed">{tramite.note}</p>
        </div>
      )}

      {/* Link */}
      {tramite.linkHref && (
        <a
          href={tramite.linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-xs font-semibold transition-all"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          {tramite.linkLabel ?? 'Ver más'}
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function FacultadTabs() {
  const [activeId, setActiveId] = useState(FACULTADES[0].id)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  const faculty = FACULTADES.find((f) => f.id === activeId)!

  function handleImgError(id: string) {
    setImgErrors((prev) => new Set(prev).add(id))
  }

  return (
    <div>
      {/* ── Faculty tab strip ── */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
        role="tablist"
        aria-label="Seleccionar facultad"
      >
        {FACULTADES.map((f) => {
          const isActive = f.id === activeId
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${f.id}`}
              onClick={() => setActiveId(f.id)}
              className={[
                'flex flex-col items-center gap-2 rounded-2xl border px-4 py-3 min-w-[96px] max-w-[110px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]',
                isActive
                  ? 'border-[#5CFF5C]/50 bg-[#5CFF5C]/10 text-[#5CFF5C]'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/80',
              ].join(' ')}
            >
              {/* Logo circle */}
              <div className="w-14 h-14 flex-shrink-0 rounded-full overflow-hidden bg-white flex items-center justify-center ring-2 ring-white/10">
                {!imgErrors.has(f.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.logo}
                    alt={f.name}
                    className="w-full h-full object-contain"
                    onError={() => handleImgError(f.id)}
                  />
                ) : (
                  /* Fallback: colored abbreviation */
                  <span
                    className="text-sm font-bold"
                    style={{ color: f.accent }}
                  >
                    {f.shortName.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Name */}
              <span className="text-[0.65rem] font-semibold text-center leading-tight">
                {f.shortName}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Faculty header ── */}
      <div
        id={`panel-${faculty.id}`}
        role="tabpanel"
        aria-label={faculty.name}
        className="mt-8"
      >
        <div className="mb-6 flex items-center gap-4">
          {/* Large logo */}
          <div className="hidden sm:flex h-16 w-16 flex-shrink-0 rounded-2xl overflow-hidden bg-white items-center justify-center shadow-lg">
            {!imgErrors.has(faculty.id) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faculty.logo}
                alt={faculty.name}
                className="w-full h-full object-contain"
                onError={() => handleImgError(faculty.id)}
              />
            ) : (
              <span className="text-lg font-bold" style={{ color: faculty.accent }}>
                {faculty.shortName.slice(0, 3).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: faculty.accent }}
            >
              Trámites académicos
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-white leading-snug">
              {faculty.name}
            </h2>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-6 h-px bg-gradient-to-r from-white/15 via-white/5 to-transparent" />

        {/* ── Tramite cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {faculty.tramites.map((tramite) => (
            <TramiteCard key={tramite.id} tramite={tramite} accent={faculty.accent} />
          ))}
        </div>
      </div>
    </div>
  )
}
