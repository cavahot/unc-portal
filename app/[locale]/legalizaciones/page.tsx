// INST-11: /legalizaciones en el sistema visual del portal, con todo su contenido en el CMS (global `legalizaciones`). Spec:
// docs/specs/portal/LEGALIZACIONES.md §2.5. Antes las categorías de documentos, los 10 pasos, el plazo y el arancel estaban
// escritos en esta página, que no usaba los mensajes (no cambiaba con el idioma) y usaba voseo.
// Todo el contenido (categorías, requisitos, pasos, plazo) sale del global y el arancel de la fila enlazada de
// `aranceles-rectorado`; si el CMS está vacío o caído se muestra un aviso en línea con una salida (reintentar, contacto),
// nunca contenido escrito en el código ni una ventana modal. Reutiliza los componentes de /titulos (mismo modelo de trámite).
// Errores: la consulta no lanza (estados ok/empty/unavailable) y registra el fallo; un error inesperado de render lo recoge
// `error.tsx` de esta ruta con el mismo estilo del portal.
import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/motion/Reveal'
import TitulosHero, { type HeroFact } from '@/components/titulos/TitulosHero'
import TiposDocumentos from '@/components/titulos/TiposDocumentos'
import PasosProcedimiento from '@/components/titulos/PasosProcedimiento'
import { getT } from '@/lib/i18n/server'
import { formatMonto } from '@/lib/cms/aranceles'
import { getLegalizaciones } from '@/lib/cms/queries/legalizaciones'

// ISR: revalida cada 60 s para no hornear el aviso de «no disponible» si el build corre sin CMS alcanzable.
// Límite: la página puede mostrar datos hasta 60 s viejos (las etiquetas de revalidación lo acortan).
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.legalizaciones')
  const result = await getLegalizaciones()
  // Con contenido, el título y la descripción son los del CMS (el editor los corrige sin desplegar).
  if (result.status === 'ok') return { title: `${result.data.titulo} | UNC`, description: result.data.descripcion }
  return { title: t('meta.title'), description: t('meta.description') }
}

/** Fecha de la última actualización en el idioma de la página, en hora de Paraguay (`gn` usa es-PY). */
function formatUpdated(iso: string, locale: string): string {
  const tag = locale === 'gn' ? 'es-PY' : locale
  try {
    return new Intl.DateTimeFormat(tag, { dateStyle: 'long', timeZone: 'America/Asuncion' }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

const buttonPrimary =
  'inline-flex min-h-12 items-center justify-center rounded-full bg-[#004700] px-7 text-sm font-bold text-white transition-colors hover:bg-[#005c00] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]'
const buttonSecondary =
  'inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#004700]/30 px-7 text-sm font-bold text-[#004700] transition-colors hover:border-[#004700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#00A300]'
const ctaOutline =
  'inline-flex min-h-12 items-center justify-center rounded-full border-2 border-white/30 px-7 text-sm font-bold text-white transition-colors hover:border-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white'

export default async function LegalizacionesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getT(locale, 'pages.legalizaciones')
  const prefix = locale === 'es' ? '' : `${locale}/`

  const result = await getLegalizaciones()
  const data = result.status === 'ok' ? result.data : null

  // Datos del trámite: plazo y arancel primero (lo que más se busca), luego la unidad responsable.
  const facts: HeroFact[] = []
  if (data) {
    if (data.plazo) facts.push({ term: t('facts.plazo'), value: t('facts.plazoValue', { min: data.plazo.min, max: data.plazo.max }) })
    facts.push(
      data.arancel
        ? { term: t('facts.arancel'), value: formatMonto(data.arancel.monto) }
        : {
            term: t('facts.arancel'),
            value: t('facts.arancelPending'),
            link: { href: `/${prefix}aranceles-rectorado`, label: t('facts.arancelLink') },
          },
    )
    facts.push({ term: t('facts.unidad'), value: data.unidad })
  }

  return (
    <>
      <TitulosHero
        homeHref={`/${locale === 'es' ? '' : locale}`}
        homeLabel={t('breadcrumb.inicio')}
        pageName={t('breadcrumb.nombre')}
        title={data ? data.titulo : t('hero.titulo')}
        description={data ? data.descripcion : null}
        factsLabel={t('facts.label')}
        facts={facts}
        updatedText={data?.updatedAt ? t('hero.updated', { date: formatUpdated(data.updatedAt, locale) }) : null}
        indexLabel={t('index.label')}
        index={(data?.tipos ?? []).map((tipo) => ({
          slug: tipo.slug,
          etiqueta: tipo.etiqueta,
          acento: tipo.acento,
          countText: tipo.requisitos.length === 1 ? t('index.countOne') : t('index.countOther', { count: tipo.requisitos.length }),
        }))}
      />

      <section className="relative z-10 -mt-10 bg-[#F4F7F5] pb-20 pt-10 sm:pb-28 sm:pt-14 lg:rounded-t-[2rem] print:mt-0 print:bg-white print:pt-2">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          {data ? (
            <div className="flex flex-col gap-20">
              <TiposDocumentos
                title={t('documents.title')}
                intro={t('documents.intro')}
                listLabel={(tipo) => t('documents.listLabel', { tipo })}
                tipos={data.tipos}
                nota={null}
              />
              <PasosProcedimiento
                title={t('procedure.title')}
                intro={t('procedure.intro', { unidad: data.unidad })}
                total={data.plazo ? t('procedure.total', { min: data.plazo.min, max: data.plazo.max }) : null}
                stepLabel={(n) => t('procedure.step', { number: n })}
                responsibleLabel={t('procedure.responsible')}
                pasos={data.pasos}
              />
            </div>
          ) : (
            // Error capturado en el diseño: aviso en línea (no un modal), accesible y con una salida.
            <div role="status" className="rounded-2xl bg-white p-6 sm:p-8">
              <p className="max-w-[65ch] text-base leading-7 text-[#3E4A45]">
                {t(result.status === 'unavailable' ? 'states.unavailable' : 'states.empty')}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {result.status === 'unavailable' && (
                  <Link href={`/${prefix}legalizaciones`} prefetch={false} className={buttonPrimary}>
                    {t('states.retry')}
                  </Link>
                )}
                <Link href={`/${prefix}contacto`} className={result.status === 'unavailable' ? buttonSecondary : buttonPrimary}>
                  {t('states.contact')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24 print:hidden">
        <div className="mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-8 rounded-[1.5rem] bg-[#004700] p-8 text-white sm:p-10 lg:flex-row lg:items-center lg:gap-16 lg:p-14">
              <div className="flex-1">
                <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{t('cta.title')}</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">{t('cta.description')}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0 lg:flex-col">
                <Link
                  href={`/${prefix}titulos`}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#8AFF8A] px-7 text-sm font-bold text-[#001A00] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t('cta.titulos')}
                </Link>
                <Link href={`/${prefix}aranceles-rectorado`} className={ctaOutline}>
                  {t('cta.aranceles')}
                </Link>
                <Link href={`/${prefix}contacto`} className={ctaOutline}>
                  {t('cta.contacto')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
