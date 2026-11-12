// INST-09: /mapa-sitio en el sistema visual del portal, construido desde la navegación del CMS (global `navegacion`, la misma
// que arma el menú) y no con enlaces escritos en el código. Antes cinco enlaces apuntaban a rutas inexistentes
// (`/institucional/historia` y otras devolvían «Página no encontrada») y el mapa omitía unas 15 páginas del menú.
// Cada elemento del menú con hijos es una sección; los que no tienen hijos van juntos en «páginas principales». Una sección
// fija de utilidades (buscar, privacidad, accesibilidad) completa el mapa: son páginas del pie, no del menú.
// Límite: `getNavigation()` cae a la navegación de respaldo del portal si el CMS no responde, así que esta página no tiene
// estado «no disponible» propio: muestra el mismo menú que el resto del sitio.
import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import PageHero from '@/components/pages/PageHero'
import { getT } from '@/lib/i18n/server'
import { getNavigation } from '@/lib/cms/queries/navigation'
import { armarMapa, type MapaEnlace } from '@/lib/cms/mapaSitio'
import { translateMenu } from '@/lib/cms/navegacion'
import { safeHref } from '@/lib/security/safeUrl' // DEP-15: todo href pasa por la allowlist

// ISR (R4): revalida la página cada 60 s; las etiquetas de la navegación la refrescan antes cuando el CMS avisa.
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.mapa-sitio')
  return { title: t('meta.title'), description: t('meta.description') }
}

const linkClass =
  'inline-flex min-h-11 items-center rounded-sm text-base font-medium text-[#09231D] underline-offset-4 transition-colors hover:text-[#005c00] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A300] motion-reduce:transition-none'
const h2Class = 'font-serif text-2xl font-bold tracking-[-0.02em] text-[#004700]'
const isExternal = (href: string) => /^https?:/i.test(href)

/** Enlace interno con el prefijo del idioma, o externo con `rel` seguro en la misma pestaña (el menú ya lo permite). */
function Enlace({ link }: { link: MapaEnlace }) {
  const href = safeHref(link.href)
  return isExternal(href) ? (
    <a href={href} rel="noopener noreferrer" className={linkClass}>
      {link.label}
    </a>
  ) : (
    <Link href={href} className={linkClass}>
      {link.label}
    </Link>
  )
}

export default async function MapaSitioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, tNav, navigation] = await Promise.all([getT(locale, 'pages.mapa-sitio'), getT(locale, 'nav'), getNavigation()])
  // Las etiquetas del menú salen del catálogo `nav` según el destino (el CMS las guarda solo en español). Una clave ausente
  // devuelve la propia clave, así que se descarta y se conserva la etiqueta del CMS.
  const lookup = (key: string): string | undefined => {
    const value = tNav(key)
    return value && !value.endsWith(key) ? value : undefined
  }
  const secciones = armarMapa(navigation, (items) => translateMenu(items, locale, lookup))
  const utilidades: MapaEnlace[] = [
    { label: t('utilidades.buscar'), href: '/buscar' },
    { label: t('utilidades.privacidad'), href: '/privacidad' },
    { label: t('utilidades.accesibilidad'), href: '/accesibilidad' },
  ]

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
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {secciones.map((s) => (
              <section key={s.key} aria-labelledby={`mapa-${s.key}`}>
                <h2 id={`mapa-${s.key}`} className={h2Class}>
                  {s.key === 'principal' ? t('sections.principal') : s.title}
                </h2>
                <ul className="mt-4 divide-y divide-[#D7E0DB] border-t border-[#D7E0DB]">
                  {s.href && (
                    <li>
                      <Enlace link={{ label: s.title, href: s.href }} />
                    </li>
                  )}
                  {s.links.map((l) => (
                    <li key={l.href}>
                      <Enlace link={l} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <section aria-labelledby="mapa-utilidades">
              <h2 id="mapa-utilidades" className={h2Class}>
                {t('utilidades.title')}
              </h2>
              <ul className="mt-4 divide-y divide-[#D7E0DB] border-t border-[#D7E0DB]">
                {utilidades.map((l) => (
                  <li key={l.href}>
                    <Enlace link={l} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </section>
    </>
  )
}
