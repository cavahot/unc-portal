// INST-08: /accesibilidad en el sistema visual del portal, con el texto y el correo en el CMS (global
// `declaracion-accesibilidad`, un texto por idioma). Spec: docs/specs/portal/LEGALES.md §2.8. Antes el texto estaba escrito en
// los archivos de mensajes, el correo en el código y las características llevaban emojis como icono.
// Estados: `ok`, `empty` (el CMS respondió sin contenido) y `unavailable` (el CMS no respondió): aviso en línea con una salida
// (reintentar solo si no respondió, y Contacto); nunca texto escrito en el código ni un modal. Si el idioma pedido no tiene
// texto, se muestra el español con un aviso.
// El llamado a escribir solo aparece si el CMS trae un correo válido (sin él la frase quedaría cortada).
import type { Metadata } from 'next'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import { getT } from '@/lib/i18n/server'
import { getDeclaracionAccesibilidad } from '@/lib/cms/queries/legales'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: todo href pasa por la allowlist, aunque aquí se arme con el correo

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.accesibilidad')
  return { title: t('meta.title'), description: t('meta.description') }
}

export default async function AccesibilidadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, result] = await Promise.all([getT(locale, 'pages.accesibilidad'), getDeclaracionAccesibilidad(locale)])
  const prefix = locale === 'es' ? '' : `${locale}/`
  const data = result.status === 'ok' ? result.data : null

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('hero.title')}
        description={data ? data.descripcion : null}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {data && result.status === 'ok' ? (
            <div className="max-w-[72ch]">
              {result.fallback && (
                <p role="note" className="mb-10 rounded-2xl border border-[#D7E0DB] bg-white px-6 py-4 text-base leading-7 text-[#3E4A45]">
                  {t('fallbackNotice')}
                </p>
              )}
              <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">{t('features.title')}</h2>
              <p className="mt-4 text-base leading-7 text-[#3E4A45]">{t('features.description')}</p>
              <ol aria-label={t('features.listLabel')} className="mt-8 divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
                {data.caracteristicas.map((c, i) => (
                  <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 px-6 py-6 sm:px-8">
                    <span aria-hidden="true" className="font-serif text-2xl font-bold tabular-nums text-[#00A300]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-[#09231D]">{c.titulo}</h3>
                      <p className="mt-1 text-base leading-7 text-[#1F2D27]">{c.descripcion}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {data.correo && (
                <section aria-labelledby="accesibilidad-contacto" className="mt-12 rounded-2xl border border-[#D7E0DB] bg-white px-6 py-6 sm:px-8">
                  <h2 id="accesibilidad-contacto" className="font-serif text-2xl font-bold tracking-[-0.02em] text-[#004700]">
                    {t('cta.title')}
                  </h2>
                  <p className="mt-3 text-base leading-7 text-[#1F2D27]">
                    {t('cta.description')}{' '}
                    <a
                      href={safeHref(`mailto:${data.correo}`)}
                      className="rounded-sm font-bold text-[#004700] underline underline-offset-4 hover:text-[#005c00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
                    >
                      {data.correo}
                    </a>{' '}
                    {t('cta.subject')}
                  </p>
                </section>
              )}
            </div>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <StatePanel
              message={t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              retry={result.status === 'unavailable' ? { href: `/${prefix}accesibilidad`, label: t('states.retry') } : undefined}
              contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
            />
          )}
        </div>
      </section>
    </>
  )
}
