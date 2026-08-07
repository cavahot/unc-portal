import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.aranceles-rectorado.meta')
  return { title: t('title'), description: t('description') }
}

// ── Static data ───────────────────────────────────────────────────────────────

const MULTAS = [
  { concepto: 'Multa por mora en matrícula — Posgrado/Maestría', monto: '10.000' },
  { concepto: 'Multa por mora en pago de cuota — Posgrado/Maestría', monto: '10.000' },
  { concepto: 'Penalidad por incumplimiento de contrato', monto: '60.000' },
]

const VENTA = [
  { concepto: 'Constancias Varias', monto: '50.000' },
  { concepto: 'Expedición de título universitario', monto: '100.000' },
  { concepto: 'Registro de título universitario', monto: '200.000' },
  { concepto: 'Certificado de capacitación', monto: '100.000' },
  { concepto: 'Credencial de estudiante / funcionario / docente', monto: '100.000' },
  { concepto: 'Certificados de estudios parcial y completo', monto: '50.000' },
  { concepto: 'Certificado de trabajo', monto: '30.000' },
  { concepto: 'Resumen anual de haberes', monto: '50.000' },
]

const EDUCATIVOS = [
  { concepto: 'Matrícula Posgrado — Didáctica', monto: '500.000' },
  { concepto: 'Matrícula Maestría', monto: '500.000' },
  { concepto: 'Cuota Posgrado — Didáctica (módulo)', monto: '300.000' },
  { concepto: 'Cuota Maestría — Educación Superior (módulo)', monto: '400.000' },
  { concepto: 'Legalización de documentos', monto: '50.000' },
  { concepto: 'Autenticación de documentos', monto: '100.000' },
  { concepto: 'Defensa de Tesis de Maestría', monto: '1.000.000' },
  { concepto: 'Matrícula Programa de Formación en Posgrado', monto: '100.000' },
  { concepto: 'Cuota mensual Programa de Formación', monto: '100.000' },
  { concepto: 'Cuota Doctorado — Educación (módulo)', monto: '750.000' },
  { concepto: 'Tutoría final Tesis Doctoral', monto: '2.500.000' },
  { concepto: 'Presentación de proyecto de Tesis Doctoral', monto: '500.000' },
  { concepto: 'Examen extraordinario — Doctorado', monto: '300.000' },
]

// ── Component ─────────────────────────────────────────────────────────────────

function ArancelTable({
  rows,
  colConcepto,
  colMonto,
}: {
  rows: { concepto: string; monto: string }[]
  colConcepto: string
  colMonto: string
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#5CFF5C]/15">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[#5CFF5C]/15 bg-[#5CFF5C]/8">
            <th className="px-5 py-3.5 text-left font-semibold text-[#5CFF5C]">{colConcepto}</th>
            <th className="px-5 py-3.5 text-right font-semibold text-[#5CFF5C] tabular-nums">{colMonto}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#5CFF5C]/8">
          {rows.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-[#5CFF5C]/5">
              <td className="px-5 py-3.5 text-slate-300">{row.concepto}</td>
              <td className="px-5 py-3.5 text-right font-mono font-semibold tabular-nums text-[#5CFF5C]">
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

export default async function ArancelesRectoradoPage() {
  const locale = await getLocale()
  const t      = await getTranslations('pages.aranceles-rectorado')

  return (
    <main className="min-h-screen bg-[#0c1c0c] text-slate-100">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="border-b border-[#5CFF5C]/10 bg-[#0c1c0c]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <li><Link href={`/${locale}`} className="transition-colors hover:text-slate-300">{t('breadcrumb.inicio')}</Link></li>
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
          <span className="inline-flex items-center gap-2 rounded-full border border-[#5CFF5C]/20 bg-[#5CFF5C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#5CFF5C]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#5CFF5C]" />
            {t('hero.badge')}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t('hero.titulo')}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            {t('hero.subtitulo')}
          </p>
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 space-y-12">

        {/* Multas */}
        <section aria-labelledby="multas-heading">
          <h2 id="multas-heading" className="mb-5 text-xl font-bold text-white sm:text-2xl">
            {t('grupos.multas.title')}
          </h2>
          <ArancelTable
            rows={MULTAS}
            colConcepto={t('grupos.multas.concepto')}
            colMonto={t('grupos.multas.monto')}
          />
        </section>

        {/* Venta de bienes y servicios */}
        <section aria-labelledby="venta-heading">
          <h2 id="venta-heading" className="mb-5 text-xl font-bold text-white sm:text-2xl">
            {t('grupos.venta.title')}
          </h2>
          <ArancelTable
            rows={VENTA}
            colConcepto={t('grupos.venta.concepto')}
            colMonto={t('grupos.venta.monto')}
          />
        </section>

        {/* Aranceles educativos */}
        <section aria-labelledby="educativos-heading">
          <h2 id="educativos-heading" className="mb-5 text-xl font-bold text-white sm:text-2xl">
            {t('grupos.educativos.title')}
          </h2>
          <ArancelTable
            rows={EDUCATIVOS}
            colConcepto={t('grupos.educativos.concepto')}
            colMonto={t('grupos.educativos.monto')}
          />
        </section>

        {/* Nota */}
        <div className="rounded-xl border border-[#5CFF5C]/10 bg-[#5CFF5C]/5 px-6 py-4">
          <p className="text-sm leading-relaxed text-slate-400">
            <span className="mr-2 font-semibold text-[#5CFF5C]">Nota:</span>
            {t('nota')}
          </p>
        </div>

      </div>
    </main>
  )
}
