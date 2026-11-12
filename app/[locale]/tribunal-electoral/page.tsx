// INST-02: /tribunal-electoral en el sistema visual del portal (cabecera compartida, aviso en línea, error en línea).
// Los miembros y los documentos salen de las colecciones `tribunal-miembros` y `tribunal-documentos` del CMS.
// DEP-19b: no hay datos de demostración en producción. Una caída del CMS lanza y la recoge `error.tsx` de esta ruta;
// una colección vacía es un estado real y se muestra como aviso en línea («aún no hay miembros publicados»), nunca
// con nombres inventados. Sin modales.
import type { Metadata } from 'next'
import Image from 'next/image'
import PageHero from '@/components/pages/PageHero'
import StatePanel from '@/components/pages/StatePanel'
import TribunalAcordeonClient from '@/components/tribunal/TribunalAcordeonClient'
import { getT } from '@/lib/i18n/server'
import { getTribunalMiembros, getTribunalDocumentos } from '@/lib/cms/queries/tribunal'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: los href que provienen del CMS pasan por safeHref

// ISR (R4): revalida la página cada 60 s. Evita HTML horneado en «no disponible»/«vacío» cuando el build
// corre sin CMS alcanzable. Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.tribunal-electoral')
  return { title: t('meta.title'), description: t('meta.description') }
}

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const PRINCIPALES = ['principal-cronograma', 'principal-reglamento']

const heading = 'font-serif text-3xl font-bold tracking-[-0.03em] text-[#004700] sm:text-4xl'
const intro = 'mt-4 max-w-[65ch] text-base leading-7 text-[#3E4A45]'

export default async function TribunalElectoralPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.tribunal-electoral')
  const prefix = locale === 'es' ? '' : `${locale}/`

  // DEP-19b: sin `.catch` con demo. En producción una caída del CMS llega a `error.tsx`;
  // en desarrollo las consultas devuelven demo por sí mismas.
  const [miembros, documentos] = await Promise.all([getTribunalMiembros(), getTribunalDocumentos()])

  const principalDocs = documentos.filter((d) => PRINCIPALES.includes(d.tipo))
  const accordionDocs = documentos.filter((d) => !PRINCIPALES.includes(d.tipo))

  const accordionT = {
    tipos: {
      'lista-inscriptos': t('accordion.tipos.lista-inscriptos'),
      'formato-notas': t('accordion.tipos.formato-notas'),
      'padron-electoral': t('accordion.tipos.padron-electoral'),
      candidaturas: t('accordion.tipos.candidaturas'),
      oficializacion: t('accordion.tipos.oficializacion'),
      proclamacion: t('accordion.tipos.proclamacion'),
    },
    viewDoc: t('accordion.viewDoc'),
    noDocuments: t('accordion.noDocuments'),
    newTab: t('newTab'),
  }

  return (
    <>
      <PageHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={t('hero.title')}
        description={t('hero.description')}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-20">
            {/* Composición del tribunal */}
            <section aria-labelledby="members-heading">
              <h2 id="members-heading" className={heading}>{t('members.title')}</h2>
              <p className={intro}>{t('members.subtitle')}</p>

              {miembros.length === 0 ? (
                <div className="mt-10">
                  <StatePanel message={t('members.empty')} contact={{ href: `/${prefix}contacto`, label: t('states.contact') }} />
                </div>
              ) : (
                <ul aria-labelledby="members-heading" className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                  {miembros.map((miembro) => (
                    <li key={miembro.id} className="flex items-center gap-5">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#E3EDE7]">
                        {miembro.foto?.url ? (
                          <Image src={miembro.foto.url} alt={miembro.foto.alt ?? miembro.nombre} fill sizes="80px" className="object-cover" />
                        ) : (
                          <span aria-hidden="true" className="flex h-full w-full items-center justify-center font-serif text-2xl font-bold text-[#004700]">
                            {getInitials(miembro.nombre)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold leading-snug text-[#09231D]">{miembro.nombre}</p>
                        <p className="mt-1 text-sm font-semibold text-[#004700]">{miembro.cargo}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Documentos principales */}
            {principalDocs.length > 0 && (
              <section aria-labelledby="downloads-heading">
                <h2 id="downloads-heading" className={heading}>{t('downloads.title')}</h2>
                <p className={intro}>{t('downloads.subtitle')}</p>

                <ul className="mt-10 divide-y divide-[#D7E0DB] overflow-hidden rounded-2xl bg-white">
                  {principalDocs.map((doc) => (
                    <li key={doc.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                      <p className="text-lg font-semibold text-[#09231D]">{doc.titulo}</p>
                      {doc.driveUrl ? (
                        <a
                          href={safeHref(doc.driveUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#004700] px-7 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]"
                        >
                          {t('downloads.download')}
                          <span className="sr-only">: {doc.titulo}. {t('newTab')}</span>
                        </a>
                      ) : (
                        <span className="text-sm font-semibold text-[#3E4A45]">{t('downloads.pending')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Documentos por etapa del proceso */}
            <section aria-labelledby="accordion-heading">
              <h2 id="accordion-heading" className={heading}>{t('accordion.title')}</h2>
              <p className={intro}>{t('accordion.subtitle')}</p>
              <div className="mt-10">
                <TribunalAcordeonClient documentos={accordionDocs} t={accordionT} />
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  )
}
