// INST-02: /solicitar-titulo en el sistema visual del portal (cabecera compartida, aviso en línea, error en línea).
// La URL del formulario sale del global `enlaces-externos` del CMS (`formularioTitulos`); NO hay una URL de respaldo
// escrita en el código. Si el CMS no la entrega (o no pasa `safeHref`), se muestra un aviso en línea con una salida
// (reintentar y contacto) en vez de un botón roto o un formulario que nadie confirmó.
// Errores: `getEnlacesExternos` no lanza (devuelve vacío ante una caída); un error inesperado de render lo recoge
// `error.tsx` de esta ruta con el mismo estilo del portal. Sin modales.
import type { Metadata } from 'next'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import { getT } from '@/lib/i18n/server'
import { getEnlacesExternos } from '@/lib/cms/queries/institutional'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: los href que provienen del CMS pasan por safeHref

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.solicitar-titulo')
  return { title: t('pageTitle'), description: t('pageDescription') }
}

const STEP_KEYS = ['step01', 'step02', 'step03', 'step04'] as const

export default async function SolicitarTituloPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.solicitar-titulo')
  const prefix = locale === 'es' ? '' : `${locale}/`

  const enlaces = await getEnlacesExternos()
  const formHref = safeHref(enlaces.formularioTitulos)
  const hasForm = formHref !== '#'

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('heading')}
        description={t('description')}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-20">
            {hasForm ? (
              <aside aria-labelledby="solicitud-cta" className="rounded-2xl bg-[#004700] p-8 text-white sm:p-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
                <div>
                  <h2 id="solicitud-cta" className="font-serif text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{t('ctaHeading')}</h2>
                  <p className="mt-3 max-w-[65ch] text-base leading-7 text-white/85">{t('ctaNote')}</p>
                </div>
                <a
                  href={formHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white lg:mt-0"
                >
                  {t('ctaButton')}
                  <span className="sr-only"> {t('newTab')}</span>
                </a>
              </aside>
            ) : (
              <StatePanel
                message={t('states.unavailable')}
                retry={{ href: `/${prefix}solicitar-titulo`, label: t('states.retry') }}
                contact={{ href: `/${prefix}contacto`, label: t('states.contact') }}
              />
            )}

            <section aria-labelledby="proceso">
              <h2 id="proceso" className="font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl">
                {t('processHeading')}
              </h2>
              <ol className="mt-10 divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
                {STEP_KEYS.map((key, index) => (
                  <li key={key} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-6 px-6 py-6 sm:px-8">
                    <span aria-hidden="true" className="font-serif text-3xl font-bold tabular-nums text-[#00A300]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-[#09231D]">{t(`steps.${key}.title`)}</h3>
                      <p className="mt-1 max-w-[65ch] text-base leading-7 text-[#3E4A45]">{t(`steps.${key}.description`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </section>
    </>
  )
}
