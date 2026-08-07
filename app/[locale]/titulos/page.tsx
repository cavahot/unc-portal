import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  await params
  return {
    title: 'Inscripción de Títulos | Universidad Nacional de Concepción',
    description:
      'Requisitos y procedimiento para la inscripción de títulos expedidos por universidades extranjeras, nacionales públicas y privadas. Tiempo: 8–24 horas. Arancel: G. 200.000.',
  }
}

/* ─── Icons ───────────────────────────────────────────────────────────────── */

function IconDiploma() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
    </svg>
  )
}

function IconBank() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="2" width="18" height="20" rx="1" />
      <path d="M9 22V12h6v10M3 7h18M3 12h18M3 17h18" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconMoney() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}
      className="h-3.5 w-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h10M12 7l5 5-5 5" />
    </svg>
  )
}

/* ─── Data ────────────────────────────────────────────────────────────────── */

const UNIVERSITY_TYPES = [
  {
    id: 'extranjera',
    icon: <IconGlobe />,
    label: 'Internacional',
    title: 'Universidades Extranjeras',
    subtitle: 'Títulos de grado y/o posgrado',
    accent: '#5CFF5C',
    items: [
      'Título académico original en formato digital (escaneado) y físico, debidamente reconocido por el CONES, registrado y legalizado por el MEC, y legalizado por el MRE de la República del Paraguay, o con apostillado de La Haya, según corresponda.',
      'Paraguayos: fotocopia simple de Cédula de Identidad Civil.',
      'Extranjeros: fotocopia simple de Pasaporte, Documento de Identidad, o Carnet de Residencia legalmente reconocido en el país.',
      'Traducción oficial de los documentos que estén en idioma diferente al castellano.',
      'Identificación del domicilio, teléfono y fax de la Universidad de origen.',
    ],
  },
  {
    id: 'publica',
    icon: <IconBank />,
    label: 'Nacional Pública',
    title: 'Universidades Nacionales Públicas',
    subtitle: 'Títulos de grado y/o posgrado',
    accent: '#60a5fa',
    items: [
      'Título académico original en formato digital (escaneado) y físico, debidamente registrado y legalizado por el Ministerio de Educación y Ciencias (MEC).',
      'Paraguayos: fotocopia simple de Cédula de Identidad Civil.',
      'Extranjeros: fotocopia simple de Pasaporte, Documento de Identidad, o Carnet de Residencia legalmente reconocido en el país.',
      'Identificación del domicilio, teléfono y fax de la Universidad de origen.',
    ],
  },
  {
    id: 'privada',
    icon: <IconBuilding />,
    label: 'Nacional Privada',
    title: 'Universidades Nacionales Privadas',
    subtitle: 'Títulos de grado y/o posgrado',
    accent: '#c084fc',
    items: [
      'Título académico original en formato digital (escaneado) y físico, debidamente registrado y legalizado por el Ministerio de Educación y Ciencias (MEC).',
      'Paraguayos: fotocopia simple de Cédula de Identidad Civil.',
      'Extranjeros: fotocopia simple de Pasaporte, Documento de Identidad, o Carnet de Residencia legalmente reconocido en el país.',
      'Identificación del domicilio, teléfono y fax de la Universidad de origen.',
    ],
  },
]

const STEPS = [
  {
    n: 1,
    who: 'Recurrente',
    desc: 'Presentación de las documentaciones (formato digital o físico) requeridas en Secretaría General del Rectorado.',
  },
  {
    n: 2,
    who: 'Mesa de Entrada / Atención al Usuario',
    desc: 'Presentados los documentos, se proveerá de una contraseña para proceder al pago de los aranceles correspondientes.',
  },
  {
    n: 3,
    who: 'Perceptoría – Recurrente',
    desc: 'Pago de los aranceles correspondientes.',
  },
  {
    n: 4,
    who: 'Mesa de Entrada / Atención al Usuario',
    desc: 'Se deriva el legajo a la Secretaría General para los procesos de control e inscripción en el Libro correspondiente.',
  },
  {
    n: 5,
    who: 'Asistente de Secretaría General',
    desc: 'En caso de encontrarse alguna incorrección en el legajo, se comunica a Mesa de Entrada para notificar al afectado.',
  },
  {
    n: 6,
    who: 'Asistente de Secretaría General',
    desc: 'Culminados los controles y estando las documentaciones en regla, se procede a la inscripción en los registros previa firma digital o firma y sello del Secretario General de la UNC, y se devuelve a Mesa de Entrada hasta su retiro.',
  },
  {
    n: 7,
    who: 'Mesa de Entrada / Atención al Usuario',
    desc: 'Entrega de los documentos inscriptos al recurrente, previa presentación de la contraseña y comprobante de pago de aranceles.',
  },
  {
    n: 8,
    who: 'Asistente de Secretaría General',
    desc: 'Archivo final de la contraseña y legajo.',
  },
]

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function TitulosPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(92,255,92,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          }}
        />
        <div aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#5CFF5C]/6 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-white/35">
            <Link href={`/${locale === 'es' ? '' : locale}`} className="transition-colors hover:text-white/70">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-white/55">Inscripción de Títulos</span>
          </nav>

          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/[0.06] px-3 py-1.5">
            <span className="text-[#5CFF5C]"><IconDiploma /></span>
            <span className="text-xs font-bold text-[#5CFF5C]">Secretaría General — UNC</span>
          </div>

          <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            Inscripción de{' '}
            <span className="text-[#5CFF5C]">Títulos</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/50">
            Servicio de inscripción y registro de títulos académicos expedidos por universidades
            extranjeras, nacionales públicas y nacionales privadas ante la Secretaría General de la UNC.
          </p>

          {/* Quick stats */}
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: <IconClock />, v: '8–24 hs',    l: 'Tiempo de trámite' },
              { icon: <IconMoney />, v: 'G. 200.000', l: 'Arancel único' },
            ].map(s => (
              <div key={s.l}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3">
                <span className="text-[#5CFF5C]">{s.icon}</span>
                <div>
                  <p className="text-base font-bold text-white">{s.v}</p>
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/35">{s.l}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3">
              <div>
                <p className="text-base font-bold text-white">3</p>
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/35">Tipos de universidad</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">

        {/* ── UNIVERSITY TYPES ─────────────────────────────────────────────── */}
        <section aria-labelledby="requisitos-heading">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Documentos requeridos</p>
            <h2 id="requisitos-heading" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              ¿De qué tipo de universidad proviene tu título?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/45">
              Los requisitos varían según el origen de la institución. Identificá tu caso antes de presentarte en Mesa de Entrada.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {UNIVERSITY_TYPES.map((ut) => (
              <div key={ut.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all hover:border-white/[0.15] hover:bg-white/[0.04]">

                {/* Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${ut.accent}12`, color: ut.accent }}>
                  {ut.icon}
                </div>

                {/* Label */}
                <p className="text-[0.55rem] font-extrabold uppercase tracking-widest"
                  style={{ color: ut.accent }}>
                  {ut.label}
                </p>

                {/* Title + subtitle */}
                <div>
                  <h3 className="text-sm font-bold leading-snug text-white">{ut.title}</h3>
                  <p className="mt-0.5 text-[0.65rem] text-white/35">{ut.subtitle}</p>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/[0.06]" />

                {/* Items */}
                <ul className="flex flex-col gap-2.5">
                  {ut.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-white/55">
                      <span className="mt-0.5 shrink-0" style={{ color: ut.accent }}>
                        <IconCheck />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CONES note */}
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-yellow-500/15 bg-yellow-500/[0.04] px-5 py-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <p className="text-xs leading-relaxed text-white/55">
              <strong className="font-semibold text-yellow-400">Títulos extranjeros:</strong>{' '}
              El reconocimiento por el CONES (Consejo Nacional de Educación Superior) es un requisito previo
              indispensable. Consultá los trámites en{' '}
              <a href="https://www.cones.gov.py/" target="_blank" rel="noopener noreferrer"
                className="font-semibold text-[#5CFF5C] hover:text-[#8AFF8A]">
                cones.gov.py
              </a>.
            </p>
          </div>
        </section>

        {/* ── PROCEDURE ────────────────────────────────────────────────────── */}
        <section aria-labelledby="procedimiento-heading">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Procedimiento</p>
            <h2 id="procedimiento-heading" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Proceso de inscripción paso a paso
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/45">
              La inscripción se tramita en Secretaría General del Rectorado. Tiempo total: 8 a 24 horas hábiles.
            </p>
          </div>

          <div className="relative">
            <div aria-hidden="true"
              className="absolute left-[2.35rem] top-4 hidden h-[calc(100%-2rem)] w-px bg-white/[0.06] sm:block" />

            <ol className="flex flex-col gap-3">
              {STEPS.map((step) => (
                <li key={step.n}
                  className="relative flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.03]">
                  <span
                    aria-label={`Paso ${step.n}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#5CFF5C]/25 bg-[#5CFF5C]/[0.08] font-mono text-sm font-bold text-[#5CFF5C]"
                  >
                    {step.n.toString().padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                      {step.who}
                    </p>
                    <p className="text-sm leading-relaxed text-white/65">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── INFO STRIP ───────────────────────────────────────────────────── */}
        <section>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-2xl border border-[#5CFF5C]/15 bg-[#5CFF5C]/[0.03] p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5CFF5C]/10 text-[#5CFF5C]">
                <IconClock />
              </div>
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#5CFF5C]">Tiempo del trámite</p>
                <p className="mt-1 text-lg font-bold text-white">8 a 24 horas hábiles</p>
                <p className="mt-1 text-xs text-white/45">Tiempo mínimo: 8 horas · Tiempo máximo: 24 horas</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/60">
                <IconMoney />
              </div>
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/35">Arancel</p>
                <p className="mt-1 text-lg font-bold text-white">G. 200.000</p>
                <p className="mt-1 text-xs text-white/45">
                  Pago en Perceptoría luego de recibir la contraseña en Mesa de Entrada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── RELATED LINKS ────────────────────────────────────────────────── */}
        <section>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-white">Mesa de Entrada — Secretaría General</p>
                <p className="mt-0.5 text-xs text-white/40">Rectorado · Ruta PY05, Km 210 · Concepción</p>
              </div>
              <Link href="/contacto"
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/60 transition-all hover:border-white/30 hover:text-white">
                Contacto <IconArrow />
              </Link>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-white">¿Necesitás legalizar tu título?</p>
                <p className="mt-0.5 text-xs text-white/40">Mirá también el trámite de legalizaciones</p>
              </div>
              <Link href="/legalizaciones"
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/[0.06] px-4 py-2 text-xs font-bold text-[#5CFF5C] transition-all hover:bg-[#5CFF5C]/[0.12]">
                Ver trámite <IconArrow />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
