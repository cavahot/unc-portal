import { getTranslations, getLocale } from 'next-intl/server'
import { getCarrerasByFacultadAndTipo } from '@/lib/cms/queries/carreras'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.facultades.ciencias-exactas.meta')
  return { title: t('title'), description: t('description') }
}

// ── Static data ───────────────────────────────────────────────────────────────

const ARANCELES = {
  multas: [
    { concepto: 'Multas', monto: '10.000' },
    { concepto: 'Multa por retraso de devolución de libros (por día)', monto: '5.000' },
  ],
  venta: [
    { concepto: 'Programas de estudios por materia (foliados y rubricados)', monto: '50.000' },
    { concepto: 'Constancias Varias', monto: '50.000' },
    { concepto: 'Carpeta para concurso', monto: '150.000' },
    { concepto: 'Credencial de estudiante/funcionario/docente', monto: '100.000' },
    { concepto: 'Certificados de estudios parcial y completo', monto: '50.000' },
    { concepto: 'Formulario de inscripción', monto: '300.000' },
  ],
  academicos: [
    { concepto: 'Matrícula Grado', monto: '400.000' },
    { concepto: 'Cuota mensual Grado', monto: '100.000' },
    { concepto: 'Cuota Recursante', monto: '50.000' },
    { concepto: 'Matrícula Posgrado', monto: '500.000' },
    { concepto: 'Cuotas Maestría', monto: '700.000' },
    { concepto: 'Matrícula Especialización', monto: '500.000' },
    { concepto: 'Cuotas Especialización', monto: '500.000' },
    { concepto: 'Derecho Examen 1° Oportunidad', monto: '50.000' },
    { concepto: 'Derecho Examen 2° Oportunidad', monto: '60.000' },
    { concepto: 'Derecho Examen 3° Oportunidad', monto: '70.000' },
    { concepto: 'Defensa de Tesis / TFG', monto: '500.000' },
    { concepto: 'Solicitud cambio de carrera', monto: '300.000' },
    { concepto: 'Reincorporación', monto: '500.000' },
  ],
  campo: [
    { concepto: 'Uso de Laboratorio y Equipos', monto: '450.000' },
  ],
}

// ── Fallback demo data (used when CMS is empty) ───────────────────────────────

const DEMO_GRADO = [
  { id: 1, nombre: 'Licenciatura en Matemática y Física',   sede: 'Central/Concepción', resolucion: '555/16' },
  { id: 2, nombre: 'Licenciatura en Matemáticas Aplicadas', sede: 'Central/Concepción', resolucion: '558/16' },
  { id: 3, nombre: 'Ingeniería Civil',                       sede: 'Central/Concepción', resolucion: '559/16' },
]

const DEMO_POSGRADO = [
  { id: 4, nombre: 'Maestría en Didáctica de las Ciencias',  sede: 'Central/Concepción', resolucion: '464/23' },
  { id: 5, nombre: 'Especialización en Ingeniería Vial',      sede: 'Central/Concepción', resolucion: '409/23' },
]

// ── Components ────────────────────────────────────────────────────────────────

function ProgramTable({
  rows,
  colCarrera,
  colSede,
  colRes,
}: {
  rows: { id: number; nombre: string; sede?: string; resolucion?: string }[]
  colCarrera: string
  colSede:    string
  colRes:     string
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#5CFF5C]/15">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[#5CFF5C]/15 bg-[#5CFF5C]/8">
            <th className="px-5 py-3.5 text-left font-semibold text-[#5CFF5C]">{colCarrera}</th>
            <th className="px-5 py-3.5 text-left font-semibold text-[#5CFF5C]">{colSede}</th>
            <th className="px-5 py-3.5 text-left font-semibold text-[#5CFF5C] tabular-nums">{colRes}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#5CFF5C]/8">
          {rows.map(row => (
            <tr key={row.id} className="transition-colors hover:bg-[#5CFF5C]/5">
              <td className="px-5 py-3.5 font-medium text-slate-100">{row.nombre}</td>
              <td className="px-5 py-3.5 text-slate-400">{row.sede ?? 'Central/Concepción'}</td>
              <td className="px-5 py-3.5 font-mono text-slate-400 tabular-nums">{row.resolucion ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ArancelTable({ rows }: { rows: { concepto: string; monto: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#5CFF5C]/10">
      <table className="min-w-full text-sm">
        <tbody className="divide-y divide-[#5CFF5C]/8">
          {rows.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-[#5CFF5C]/5">
              <td className="px-4 py-3 text-slate-300">{row.concepto}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[#5CFF5C]">
                {row.monto}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CienciasExactasPage() {
  const locale = await getLocale()
  const t      = await getTranslations('pages.facultades.ciencias-exactas')

  const SLUG = 'facultad-de-ciencias-exactas-y-tecnologicas'

  const [gradoRaw, posgradoRaw] = await Promise.all([
    getCarrerasByFacultadAndTipo(SLUG, 'grado').catch(() => []),
    getCarrerasByFacultadAndTipo(SLUG, 'posgrado').catch(() => []),
  ])

  const grado    = gradoRaw.length    > 0 ? gradoRaw    : DEMO_GRADO
  const posgrado = posgradoRaw.length > 0 ? posgradoRaw : DEMO_POSGRADO

  return (
    <main className="min-h-screen bg-[#0c1c0c] text-slate-100">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="border-b border-[#5CFF5C]/10 bg-[#0c1c0c]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <li><Link href={`/${locale}`} className="transition-colors hover:text-slate-300">Inicio</Link></li>
            <li aria-hidden className="select-none">/</li>
            <li><Link href={`/${locale}/facultades`} className="transition-colors hover:text-slate-300">{t('breadcrumb.facultades')}</Link></li>
            <li aria-hidden className="select-none">/</li>
            <li className="font-medium text-[#5CFF5C]">{t('breadcrumb.nombre')}</li>
          </ol>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#5CFF5C]/10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(92,255,92,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(92,255,92,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#5CFF5C]/6 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center">

            {/* Logo */}
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-[#5CFF5C]/20 bg-[#5CFF5C]/8 p-3 shadow-lg shadow-[#5CFF5C]/5 sm:h-36 sm:w-36">
              <Image
                src="/images/facultades/exactas.png"
                alt="Logo Facultad de Ciencias Exactas y Tecnológicas"
                width={120}
                height={120}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            {/* Text */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#5CFF5C]">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#5CFF5C]" />
                {t('hero.badge')}
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {t('hero.nombre')}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                {t('hero.tagline')}
              </p>

              {/* Quick stats */}
              <div className="mt-6 flex flex-wrap gap-4">
                {[
                  { label: 'Carreras de Grado',  value: grado.length    },
                  { label: 'Posgrados',           value: posgrado.length },
                  { label: 'Años de trayectoria', value: '10+'           },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-[#5CFF5C]/15 bg-[#5CFF5C]/8 px-4 py-2.5 text-center"
                  >
                    <p className="text-lg font-bold tabular-nums text-[#5CFF5C]">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 space-y-16">

        {/* Carreras de Grado */}
        <section aria-labelledby="grado-heading">
          <div className="mb-6">
            <h2 id="grado-heading" className="text-2xl font-bold text-white sm:text-3xl">
              {t('grado.title')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">{t('grado.subtitle')}</p>
          </div>
          <ProgramTable
            rows={grado.map(c => ({ id: c.id, nombre: c.nombre, sede: c.sede, resolucion: c.resolucion ?? undefined }))}
            colCarrera={t('grado.cols.carrera')}
            colSede={t('grado.cols.sede')}
            colRes={t('grado.cols.resolucion')}
          />
        </section>

        {/* Programas de Posgrado */}
        <section aria-labelledby="posgrado-heading">
          <div className="mb-6">
            <h2 id="posgrado-heading" className="text-2xl font-bold text-white sm:text-3xl">
              {t('posgrado.title')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">{t('posgrado.subtitle')}</p>
          </div>
          <ProgramTable
            rows={posgrado.map(c => ({ id: c.id, nombre: c.nombre, sede: c.sede, resolucion: c.resolucion ?? undefined }))}
            colCarrera={t('posgrado.cols.programa')}
            colSede={t('posgrado.cols.sede')}
            colRes={t('posgrado.cols.resolucion')}
          />
        </section>

        {/* Aranceles */}
        <section aria-labelledby="aranceles-heading">
          <div className="mb-6">
            <h2 id="aranceles-heading" className="text-2xl font-bold text-white sm:text-3xl">
              {t('aranceles.title')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">{t('aranceles.subtitle')}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#5CFF5C]">
                {t('aranceles.grupos.multas')}
              </h3>
              <ArancelTable rows={ARANCELES.multas} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#5CFF5C]">
                {t('aranceles.grupos.campo')}
              </h3>
              <ArancelTable rows={ARANCELES.campo} />
            </div>

            <div className="sm:col-span-2">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#5CFF5C]">
                {t('aranceles.grupos.venta')}
              </h3>
              <ArancelTable rows={ARANCELES.venta} />
            </div>

            <div className="sm:col-span-2">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#5CFF5C]">
                {t('aranceles.grupos.academicos')}
              </h3>
              <ArancelTable rows={ARANCELES.academicos} />
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section aria-labelledby="contacto-heading">
          <div className="mb-6">
            <h2 id="contacto-heading" className="text-2xl font-bold text-white sm:text-3xl">
              {t('contacto.title')}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Dirección */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#5CFF5C]/15 bg-[#5CFF5C]/5 p-5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5CFF5C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5CFF5C]">Dirección</p>
              <p className="text-sm text-slate-300">{t('contacto.direccion')}</p>
            </div>

            {/* Teléfono */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#5CFF5C]/15 bg-[#5CFF5C]/5 p-5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5CFF5C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5CFF5C]">Teléfono</p>
              <a href="tel:+595331243361" className="text-sm text-slate-300 transition-colors hover:text-[#5CFF5C]">
                {t('contacto.telefono')}
              </a>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#5CFF5C]/15 bg-[#5CFF5C]/5 p-5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5CFF5C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5CFF5C]">Email</p>
              <div className="space-y-1">
                <a href="mailto:academicofacet@unc.edu.py" className="block text-sm text-slate-300 transition-colors hover:text-[#5CFF5C]">academicofacet@unc.edu.py</a>
                <a href="mailto:decanatofacet@unc.edu.py" className="block text-sm text-slate-300 transition-colors hover:text-[#5CFF5C]">decanatofacet@unc.edu.py</a>
              </div>
            </div>

            {/* Web */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#5CFF5C]/15 bg-[#5CFF5C]/5 p-5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5CFF5C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5CFF5C]">Sitio web</p>
              <a
                href="https://www.facet-unc.edu.py"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-300 transition-colors hover:text-[#5CFF5C]"
              >
                {t('contacto.web')}
              </a>
              <a
                href="https://www.facet-unc.edu.py"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#5CFF5C] hover:underline"
              >
                {t('contacto.sitio')}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
