// INST-12: /contacto/dependencias en el sistema visual del portal, con el directorio en el CMS (colección
// `dependencias-contacto`). Spec: docs/specs/portal/DEPENDENCIAS.md §2.5. Antes los datos de Rectorado y las seis facultades
// (direcciones, teléfonos, correos, webs) estaban escritos en esta página, que no usaba los mensajes (español fijo, voseo) y
// enlazaba a /contacto sin el prefijo del idioma.
// El directorio sale del CMS y es la ÚNICA fuente: si el CMS está vacío o caído se muestra un aviso en línea con una salida
// (reintentar, contacto), nunca datos escritos en el código ni una ventana modal. Todo `href` pasa por `safeHref` (el mapeador
// ya descarta webs y correos inválidos; esta es la segunda guarda).
// Errores: la consulta no lanza (estados ok/empty/unavailable) y registra el fallo; un error inesperado de render lo recoge
// `error.tsx` de esta ruta con el mismo estilo del portal.
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import Reveal from '@/components/motion/Reveal'
import { telHref, type Dependencia, type Sede } from '@/lib/cms/dependencias'
import { getDependencias } from '@/lib/cms/queries/dependencias'
import { getT } from '@/lib/i18n/server'
import { safeHref } from '@/lib/security/safeUrl'

// ISR: revalida cada 60 s para no hornear el aviso de «no disponible» si el build corre sin CMS alcanzable.
// Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas de revalidación lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.contacto-dependencias')
  return { title: t('meta.title'), description: t('meta.description') }
}

const focus = 'rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]'
const linkClass = `hover:text-[#004700] hover:underline ${focus}`

/** Iniciales para la dependencia sin logo válido: primeras letras de las dos primeras palabras significativas. */
function initials(nombre: string): string {
  const skip = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])
  return nombre
    .split(/\s+/)
    .filter((w) => w && !skip.has(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function Icon({ d, extra }: { d: string; extra?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d={d} />
      {extra && <path d={extra} />}
    </svg>
  )
}

const ICON = {
  place: 'M12 21s7-5.3 7-12a7 7 0 10-14 0c0 6.7 7 12 7 12z',
  phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1l-1.3 1.3a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 2z',
  mail: 'M4 7l8 6 8-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
  web: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3a14 14 0 014 9 14 14 0 01-4 9 14 14 0 01-4-9 14 14 0 014-9z',
}

function SedeCard({ sede }: { sede: Sede }) {
  return (
    <div className="rounded-xl border border-[#D7E0DB] bg-white p-5 shadow-sm">
      {sede.nombre && <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#008000]">{sede.nombre}</p>}
      <ul className="space-y-2.5 text-sm text-[#3A4A42]">
        <li className="flex items-start gap-2.5">
          <span className="mt-0.5 text-[#008000]"><Icon d={ICON.place} /></span>
          <a href={safeHref(`https://maps.google.com/?q=${encodeURIComponent(sede.direccion)}`)} target="_blank" rel="noopener noreferrer" className={`leading-snug ${linkClass}`}>
            {sede.direccion}
          </a>
        </li>
        {sede.telefonos.map((tel) => (
          <li key={tel} className="flex items-center gap-2.5">
            <span className="text-[#008000]"><Icon d={ICON.phone} /></span>
            <a href={safeHref(telHref(tel))} className={linkClass}>{tel}</a>
          </li>
        ))}
        {sede.correos.map((correo) => (
          <li key={correo} className="flex min-w-0 items-center gap-2.5">
            <span className="text-[#008000]"><Icon d={ICON.mail} /></span>
            <a href={safeHref(`mailto:${correo}`)} className={`truncate ${linkClass}`}>{correo}</a>
          </li>
        ))}
        {/* Segunda guarda: solo se muestra una web que `safeHref` deja pasar tal cual (el mapeador ya descarta las inválidas). */}
        {sede.web && safeHref(sede.web) === sede.web && (
          <li className="flex items-center gap-2.5">
            <span className="text-[#008000]"><Icon d={ICON.web} /></span>
            <a href={safeHref(sede.web)} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {sede.web.replace(/^https?:\/\//, '')}
            </a>
          </li>
        )}
      </ul>
    </div>
  )
}

function DependenciaCard({ dep, index, logoAlt }: { dep: Dependencia; index: number; logoAlt: string }) {
  return (
    <Reveal delay={index * 60}>
      <article
        id={`dept-${dep.slug}`}
        aria-labelledby={`dept-title-${dep.slug}`}
        className={`overflow-hidden rounded-[1.25rem] border bg-white shadow-[0_12px_36px_rgba(7,42,15,0.07)] ${dep.destacada ? 'border-[#008000]/30' : 'border-[#D7E0DB]'}`}
      >
        <div className={`flex items-center gap-4 px-6 py-5 ${dep.destacada ? 'bg-[#004700]' : 'bg-[#F4F7F5]'}`}>
          <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1.5 ring-1 ${dep.destacada ? 'bg-white/10 ring-white/20' : 'bg-white ring-[#D7E0DB]'}`}>
            {dep.logo ? (
              <Image src={dep.logo} alt={logoAlt} fill sizes="56px" className="object-contain p-0.5" />
            ) : (
              <span aria-hidden="true" className={`font-serif text-lg font-bold ${dep.destacada ? 'text-white' : 'text-[#004700]'}`}>{initials(dep.nombre)}</span>
            )}
          </div>
          <h2 id={`dept-title-${dep.slug}`} className={`font-serif text-base font-bold leading-snug sm:text-lg ${dep.destacada ? 'text-white' : 'text-[#09231D]'}`}>
            {dep.nombre}
          </h2>
        </div>
        <div className={`p-5 ${dep.sedes.length > 1 ? 'grid gap-4 sm:grid-cols-2' : ''}`}>
          {dep.sedes.map((sede, i) => (
            <SedeCard key={i} sede={sede} />
          ))}
        </div>
      </article>
    </Reveal>
  )
}

export default async function ContactosDependenciasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.contacto-dependencias')
  const prefix = locale === 'es' ? '' : `${locale}/`

  const result = await getDependencias()
  const dependencias = result.status === 'ok' ? result.data : []

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        parent={{ href: `/${prefix}contacto`, label: t('breadcrumb.contacto') }}
        pageName={t('breadcrumb.nombre')}
        title={t('hero.title')}
        description={t('hero.description')}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {result.status === 'ok' ? (
            <>
              <nav aria-label={t('nav.label')} className="mb-10 flex flex-wrap gap-2 print:hidden">
                {dependencias.map((dep) => (
                  <a
                    key={dep.slug}
                    href={`#dept-${dep.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-[#D7E0DB] bg-white px-4 text-xs font-semibold text-[#3A4A42] shadow-sm transition-colors hover:border-[#37D448]/60 hover:text-[#004700] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
                  >
                    {dep.nombre}
                  </a>
                ))}
              </nav>

              <div className="grid gap-6 lg:grid-cols-2">
                {dependencias.map((dep, i) => (
                  <DependenciaCard key={dep.slug} dep={dep} index={i} logoAlt={t('logoAlt', { nombre: dep.nombre })} />
                ))}
              </div>

              <div className="mt-12 text-center print:hidden">
                <Link
                  href={`/${prefix}contacto`}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#004700] px-7 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
                >
                  {t('back')}
                </Link>
              </div>
            </>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}contacto/dependencias`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
