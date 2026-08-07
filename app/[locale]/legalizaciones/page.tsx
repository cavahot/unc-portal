import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  await params
  return {
    title: 'Legalizaciones | Universidad Nacional de Concepción',
    description:
      'Requisitos y procedimiento para la legalización de títulos, certificados y expedientes emitidos por la UNC. Tiempo: 12–24 horas. Arancel: G. 50.000.',
  }
}

/* ─── Icons ───────────────────────────────────────────────────────────────── */

function IconSeal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="8" r="6" />
      <path d="M12 14v7M9 18l3 3 3-3" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconCert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="14" y2="13" />
      <path d="M8 17l2 2 4-4" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
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

/* ─── Data ────────────────────────────────────────────────────────────────── */

const DOCUMENT_TYPES = [
  {
    id: 'titulo',
    icon: <IconDoc />,
    label: 'Categoría 1',
    title: 'Títulos de pregrado, grado y posgrado',
    accent: '#5CFF5C',
    items: [
      'Original o fotocopia del título académico debidamente registrado por el Ministerio de Educación y Ciencias (MEC).',
      'Según la modalidad que se desee legalizar.',
    ],
  },
  {
    id: 'certificado',
    icon: <IconCert />,
    label: 'Categoría 2',
    title: 'Certificados de estudio de pregrado, grado y posgrado',
    accent: '#60a5fa',
    items: [
      'Original o fotocopia del Certificado de Estudios.',
    ],
  },
  {
    id: 'expediente',
    icon: <IconFolder />,
    label: 'Categoría 3',
    title: 'Expedientes para exámenes de ingreso',
    accent: '#c084fc',
    items: [
      'Certificado de estudios de la Educación Media, generado por el Sistema NAUTILUS y visado por la Supervisión de Apoyo y Control Administrativo correspondiente.',
      'Si cursó en el extranjero: el documento debe estar legalizado por el Ministerio de Relaciones Exteriores (MRE) o contar con el Apostillado de La Haya, y tener resolución de reconocimiento del MEC.',
      'Paraguayos: fotocopia autenticada por Escribanía Pública de Cédula de Identidad Civil.',
      'Extranjeros: fotocopia autenticada por Escribanía Pública de documento de identidad y Carné de Residencia temporal o permanente.',
    ],
  },
]

const STEPS = [
  { n: 1,  who: 'Recurrente',                                       desc: 'Presentación de las documentaciones requeridas para el proceso.' },
  { n: 2,  who: 'Mesa de Entrada / Atención al Usuario',            desc: 'Recibidos los documentos, se provee de una contraseña para proceder al pago de los aranceles correspondientes.' },
  { n: 3,  who: 'Perceptoría – Recurrente',                         desc: 'Pago de los aranceles correspondientes.' },
  { n: 4,  who: 'Mesa de Entrada / Atención al Usuario',            desc: 'Se deriva el legajo a la Secretaría General para los procesos de control, legalización y registro en el Libro correspondiente.' },
  { n: 5,  who: 'Asistente de Secretaría General',                  desc: 'En caso de encontrarse alguna incorrección en el legajo, se devuelve a Mesa de Entrada para notificación al afectado.' },
  { n: 6,  who: 'Asistente de Secretaría General',                  desc: 'Culminados los controles y encontrándose las documentaciones en regla, se procede a la legalización e inscripción en los registros, previa firma y sello del Secretario General de la UNC.' },
  { n: 7,  who: 'Asistente de Secretaría General',                  desc: 'Una vez legalizado el documento, se devuelve a Mesa de Entrada, donde permanece hasta su retiro.' },
  { n: 8,  who: 'Asistente de Secretaría General',                  desc: 'Una vez devuelto el documento legalizado, se procede al archivo del legajo pertinente.' },
  { n: 9,  who: 'Mesa de Entrada / Atención al Usuario',            desc: 'Entrega de los documentos al recurrente, previa presentación de la contraseña y comprobante de pago de aranceles.' },
  { n: 10, who: 'Asistente de Secretaría General',                  desc: 'Archivo final de la contraseña.' },
]

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function LegalizacionesPage({
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
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#5CFF5C]/6 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-white/35">
            <Link href={`/${locale === 'es' ? '' : locale}`} className="transition-colors hover:text-white/70">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-white/55">Legalizaciones</span>
          </nav>

          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/[0.06] px-3 py-1.5">
            <span className="text-[#5CFF5C]"><IconSeal /></span>
            <span className="text-xs font-bold text-[#5CFF5C]">Secretaría General — UNC</span>
          </div>

          <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            Legalización de{' '}
            <span className="text-[#5CFF5C]">Documentos</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/50">
            Servicio de legalización de títulos de pregrado, grado y posgrado emitidos por la UNC,
            otras universidades, y expedientes para exámenes de ingreso.
          </p>

          {/* Quick stats */}
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: <IconClock />, v: '12–24 hs', l: 'Tiempo de trámite' },
              { icon: <IconMoney />, v: 'G. 50.000', l: 'Arancel único' },
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
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">

        {/* ── DOCUMENT TYPES ───────────────────────────────────────────────── */}
        <section aria-labelledby="requisitos-heading">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Documentos y requisitos</p>
            <h2 id="requisitos-heading" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              ¿Qué tipo de documento querés legalizar?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/45">
              Cada categoría tiene requisitos específicos. Identificá tu caso antes de presentarte.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {DOCUMENT_TYPES.map((doc) => (
              <div key={doc.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all hover:border-white/[0.15] hover:bg-white/[0.04]">
                {/* Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${doc.accent}12`, color: doc.accent }}>
                  {doc.icon}
                </div>

                {/* Label */}
                <p className="text-[0.55rem] font-extrabold uppercase tracking-widest"
                  style={{ color: doc.accent }}>
                  {doc.label}
                </p>

                {/* Title */}
                <h3 className="text-sm font-bold leading-snug text-white">{doc.title}</h3>

                {/* Divider */}
                <div className="h-px bg-white/[0.06]" />

                {/* Items */}
                <ul className="flex flex-col gap-2.5">
                  {doc.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-white/55">
                      <span className="mt-0.5 shrink-0" style={{ color: doc.accent }}>
                        <IconCheck />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROCEDURE STEPS ──────────────────────────────────────────────── */}
        <section aria-labelledby="procedimiento-heading">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">Procedimiento</p>
            <h2 id="procedimiento-heading" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Paso a paso del trámite
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/45">
              El proceso involucra a Mesa de Entrada y Secretaría General. Tiempo total: 12 a 24 horas hábiles.
            </p>
          </div>

          <div className="relative">
            {/* Vertical guide line — desktop only */}
            <div aria-hidden="true"
              className="absolute left-[2.35rem] top-4 hidden h-[calc(100%-2rem)] w-px bg-white/[0.06] sm:block" />

            <ol className="flex flex-col gap-3">
              {STEPS.map((step) => (
                <li key={step.n}
                  className="relative flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.03]">
                  {/* Step number */}
                  <span
                    aria-label={`Paso ${step.n}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#5CFF5C]/25 bg-[#5CFF5C]/[0.08] font-mono text-sm font-bold text-[#5CFF5C]"
                  >
                    {step.n.toString().padStart(2, '0')}
                  </span>

                  <div className="min-w-0 flex-1 pt-1">
                    {/* Responsible */}
                    <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-widest text-white/30">
                      {step.who}
                    </p>
                    {/* Description */}
                    <p className="text-sm leading-relaxed text-white/65">
                      {step.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── INFO STRIP ────────────────────────────────────────────────────── */}
        <section>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Tiempo */}
            <div className="flex items-start gap-4 rounded-2xl border border-[#5CFF5C]/15 bg-[#5CFF5C]/[0.03] p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5CFF5C]/10 text-[#5CFF5C]">
                <IconClock />
              </div>
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#5CFF5C]">Tiempo del trámite</p>
                <p className="mt-1 text-lg font-bold text-white">12 a 24 horas hábiles</p>
                <p className="mt-1 text-xs text-white/45">
                  Tiempo mínimo: 12 horas · Tiempo máximo: 24 horas
                </p>
              </div>
            </div>

            {/* Arancel */}
            <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/60">
                <IconMoney />
              </div>
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/35">Arancel</p>
                <p className="mt-1 text-lg font-bold text-white">G. 50.000</p>
                <p className="mt-1 text-xs text-white/45">
                  Pago en Perceptoría luego de presentar la documentación en Mesa de Entrada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTACT CTA ───────────────────────────────────────────────────── */}
        <section>
          <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-white">Mesa de Entrada — Secretaría General</p>
              <p className="mt-0.5 text-xs text-white/40">
                Rectorado · Ruta PY05, Km 210 · Concepción, Paraguay · Horario de atención: lunes a viernes
              </p>
            </div>
            <Link
              href="/contacto"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold text-white/60 transition-all hover:border-white/30 hover:text-white"
            >
              Ver contactos
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}
                className="h-3.5 w-3.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h10M12 7l5 5-5 5" />
              </svg>
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
