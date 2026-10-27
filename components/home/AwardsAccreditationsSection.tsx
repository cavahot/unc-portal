import Image from 'next/image'
import Reveal from '@/components/motion/Reveal'
import { safeHref } from '@/lib/security/safeUrl'
import type { Recognition, RecognitionEdition } from '@/lib/cms/queries/recognitions'
import type { Accreditation, AccreditationGroup } from '@/lib/cms/queries/accreditations'

/**
 * PRA-02: sección pública «Premios y acreditaciones» de la portada.
 * Spec: docs/specs/portal/PREMIOS-ACREDITACIONES.md §2 y §12 | Evidencia: docs/research/evidence-register-premios.md.
 *
 * Componente de servidor sin estado: recibe datos ya validados por las consultas (`recognitions.ts`,
 * `accreditations.ts`) y textos ya traducidos. Solo `Reveal` (cliente) anima la entrada y respeta
 * `prefers-reduced-motion`.
 */

/** Textos traducidos que la página pasa al componente (las claves viven en `awards.*` de pages.home). */
export interface AwardsLabels {
  sectionLabel: string
  title: string
  description: string
  /** Contiene `{name}`. */
  awardedBy: string
  officialSite: string
  source: string
  externalHint: string
  editionsTitle: string
  distinction: { premio: string; premioCategoria: string; mencionEspecial: string; reconocimiento: string }
  accreditationsTitle: string
  accreditationsBody: string
  model: { modeloNacional: string; arcuSur: string }
  organism: { aneaes: string; arcusur: string; otro: string }
  /** Contiene `{year}`. */
  validUntil: string
  otherPrograms: string
  /** Contiene `{name}`. */
  logoAlt: string
}

interface Props {
  recognitions: Recognition[]
  groups: AccreditationGroup[]
  labels: AwardsLabels
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''))

/** Enlace externo (PRA-02): solo https, nueva pestaña, `rel` seguro y aviso para lectores de pantalla. */
function ExternalLink({ to, children, hint, className = '' }: { to: string; children: React.ReactNode; hint: string; className?: string }) {
  // Última barrera (DEP-15): aunque la consulta ya filtra, un enlace no seguro no se renderiza.
  const safe = safeHref(to)
  if (!safe.startsWith('https://')) return null
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-sm font-bold text-[#8AFF8A] underline decoration-[#8AFF8A]/40 underline-offset-4 transition-colors hover:decoration-[#8AFF8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AFF8A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#001A00] motion-reduce:transition-none ${className}`}
    >
      {children}
      <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4h6m0 0v6m0-6-9 9M5 7v12h12v-5" />
      </svg>
      <span className="sr-only"> ({hint})</span>
    </a>
  )
}

/** Chip de texto (el significado nunca depende solo del color). */
function Chip({ children, tone = 'outline' }: { children: React.ReactNode; tone?: 'solid' | 'outline' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] ${
        tone === 'solid' ? 'bg-[#00A300] text-[#001A00]' : 'border border-[#8AFF8A]/50 text-[#8AFF8A]'
      }`}
    >
      {children}
    </span>
  )
}

/** Etiqueta de la distinción; `por-confirmar` o desconocida no se imprime (no se afirma lo no confirmado). */
function distinctionLabel(value: string, l: AwardsLabels['distinction']): { text: string; tone: 'solid' | 'outline' } | null {
  switch (value) {
    case 'premio':
      return { text: l.premio, tone: 'solid' }
    case 'premio-categoria':
      return { text: l.premioCategoria, tone: 'solid' }
    case 'mencion-especial':
      return { text: l.mencionEspecial, tone: 'outline' }
    case 'reconocimiento':
      return { text: l.reconocimiento, tone: 'outline' }
    default:
      return null
  }
}

function EditionBody({ edition, labels }: { edition: RecognitionEdition; labels: AwardsLabels }) {
  const chip = distinctionLabel(edition.distincion, labels.distinction)
  return (
    <>
      <p className="font-serif text-4xl font-bold leading-none text-white">{edition.anio}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chip ? <Chip tone={chip.tone}>{chip.text}</Chip> : null}
        {edition.categoria ? <span className="text-sm text-white/70">{edition.categoria}</span> : null}
      </div>
      <p className="mt-3 text-sm">
        <ExternalLink to={edition.fuenteUrl} hint={labels.externalHint}>
          {labels.source}
        </ExternalLink>
      </p>
    </>
  )
}

function RecognitionBlock({ rec, labels, index }: { rec: Recognition; labels: AwardsLabels; index: number }) {
  const headingId = `award-${rec.id}`
  const single = rec.ediciones.length === 1
  return (
    <Reveal delay={index * 80}>
      <article aria-labelledby={headingId} className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
        <div className="flex flex-col items-center text-center">
          {rec.logoSrc ? (
            <div className="flex w-full max-w-sm items-center justify-center rounded-[1.45rem] bg-white p-6 shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
              <Image
                src={rec.logoSrc}
                alt={rec.logoAlt}
                width={320}
                height={320}
                sizes="(min-width: 1024px) 320px, 70vw"
                className="h-auto max-h-[160px] w-auto object-contain sm:max-h-[220px]"
              />
            </div>
          ) : null}
          <h3 id={headingId} className="mt-6 font-serif text-2xl font-bold leading-tight text-white sm:text-3xl">
            {rec.nombre}
          </h3>
          {rec.entidad ? <p className="mt-2 text-sm text-white/75">{fill(labels.awardedBy, { name: rec.entidad })}</p> : null}
          {rec.sitioOficial ? (
            <p className="mt-3 text-sm">
              <ExternalLink to={rec.sitioOficial} hint={labels.externalHint}>
                {labels.officialSite}
              </ExternalLink>
            </p>
          ) : null}
        </div>

        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#8AFF8A]">{labels.editionsTitle}</h4>
          {single ? (
            <div className="mt-5 rounded-[1.25rem] border border-[#8AFF8A]/40 bg-white/[0.05] p-6">
              <EditionBody edition={rec.ediciones[0]} labels={labels} />
            </div>
          ) : (
            <ol className="mt-5 border-l border-[#8AFF8A]/30">
              {rec.ediciones.map((edition) => (
                <li key={edition.anio} className="relative pb-8 pl-8 last:pb-0">
                  <span aria-hidden="true" className="absolute -left-[7px] top-2.5 h-3.5 w-3.5 rounded-full bg-[#00A300] ring-4 ring-[#001A00]" />
                  <EditionBody edition={edition} labels={labels} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </article>
    </Reveal>
  )
}

/** Iniciales para el disco cuando una facultad no tiene logo válido: siglas o primeras letras del nombre. */
function initials(group: AccreditationGroup): string {
  if (group.siglas) return group.siglas.slice(0, 4)
  return group.nombre
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

function ProgramRow({ item, labels }: { item: Accreditation; labels: AwardsLabels }) {
  const organism = labels.organism[item.organism as keyof AwardsLabels['organism']] ?? labels.organism.otro
  const model = item.modelo === 'modelo-nacional' ? labels.model.modeloNacional : item.modelo === 'arcusur' ? labels.model.arcuSur : null
  return (
    <li className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
      <p className="font-semibold leading-snug text-white">{item.programa}</p>
      {item.sede ? <p className="mt-0.5 text-sm text-white/70">{item.sede}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Chip>{organism}{model ? ` · ${model}` : ''}</Chip>
        {item.vigenciaAnio ? <span className="text-xs font-semibold text-white/75">{fill(labels.validUntil, { year: item.vigenciaAnio })}</span> : null}
        {item.fuenteUrl ? (
          <span className="text-xs">
            <ExternalLink to={item.fuenteUrl} hint={labels.externalHint}>
              {labels.source}
            </ExternalLink>
          </span>
        ) : null}
      </div>
    </li>
  )
}

function FacultyCard({ group, labels }: { group: AccreditationGroup; labels: AwardsLabels }) {
  const headingId = `acc-${group.key}`
  const orphan = group.key === 'sin-facultad'
  const title = orphan ? labels.otherPrograms : group.nombre
  return (
    <li className="h-full">
      <article
        aria-labelledby={headingId}
        className="h-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-6 transition-[border-color,transform] duration-300 hover:border-[#8AFF8A]/60 focus-within:border-[#8AFF8A]/60 motion-safe:hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none"
      >
        <header className="flex items-center gap-4">
          {orphan ? null : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-2">
              {group.logoSrc ? (
                <Image
                  src={group.logoSrc}
                  alt={fill(labels.logoAlt, { name: group.nombre })}
                  width={64}
                  height={64}
                  sizes="64px"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span aria-hidden="true" className="text-sm font-extrabold text-[#004700]">
                  {initials(group)}
                </span>
              )}
            </span>
          )}
          <div className="min-w-0">
            {group.siglas && !orphan ? (
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#8AFF8A]">{group.siglas}</p>
            ) : null}
            <h4 id={headingId} className="text-lg font-bold leading-snug text-white">
              {title}
            </h4>
          </div>
        </header>
        <ul className="mt-5 space-y-4">
          {group.items.map((item) => (
            <ProgramRow key={item.id} item={item} labels={labels} />
          ))}
        </ul>
      </article>
    </li>
  )
}

/**
 * Renderiza premio(s) y acreditaciones. PRA-02. Sin datos en ambos bloques devuelve `null` (ni título ni
 * sección vacía: escenario 6 del spec); con uno solo, oculta el otro. El fondo verde noche desemboca por
 * un degradado en el verde `#004700` de la franja institucional siguiente.
 * Amenaza que evita: mostrar un encabezado «Premios» sin contenido verificado. Límite: confía en que las
 * consultas ya filtraron y validaron los datos; solo escapa por React y no ejecuta HTML del CMS.
 */
export default function AwardsAccreditationsSection({ recognitions, groups, labels }: Props) {
  if (recognitions.length === 0 && groups.length === 0) return null
  return (
    <section
      id="premios"
      aria-labelledby="awards-title"
      className="relative overflow-hidden bg-[#001A00] py-24 text-white sm:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,163,0,0.16),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-[#004700]"
      />
      <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
        <Reveal>
          <header className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.23em] text-[#8AFF8A]">{labels.sectionLabel}</span>
            <h2 id="awards-title" className="mt-4 font-serif text-4xl font-bold leading-[0.98] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              {labels.title}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{labels.description}</p>
          </header>
        </Reveal>

        {recognitions.length > 0 ? (
          <div className="mx-auto mt-16 space-y-16">
            {recognitions.map((rec, i) => (
              <RecognitionBlock key={rec.id} rec={rec} labels={labels} index={i} />
            ))}
          </div>
        ) : null}

        {groups.length > 0 ? (
          <div className="mt-20">
            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <h3 className="font-serif text-3xl font-bold text-white sm:text-4xl">{labels.accreditationsTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">{labels.accreditationsBody}</p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => (
                  <FacultyCard key={group.key} group={group} labels={labels} />
                ))}
              </ul>
            </Reveal>
          </div>
        ) : null}
      </div>
    </section>
  )
}
