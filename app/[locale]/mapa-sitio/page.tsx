import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getT(locale, 'pages.mapa-sitio')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

export default async function MapaSitioPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getT(locale, 'pages.mapa-sitio')

  const sections = [
    {
      key: 'institucion',
      links: [
        { labelKey: 'laInstitucion', href: '/institucional' },
        { labelKey: 'historia', href: '/institucional/historia' },
        { labelKey: 'misionYVision', href: '/institucional/mision-y-vision' },
        { labelKey: 'autoridades', href: '/institucional/autoridades' },
        { labelKey: 'organigrama', href: '/institucional/organigrama' },
        { labelKey: 'marcoLegal', href: '/institucional/marco-legal' },
        { labelKey: 'transparencia', href: '/transparencia' },
      ],
    },
    {
      key: 'academia',
      links: [
        { labelKey: 'carreras', href: '/carreras' },
        { labelKey: 'facultades', href: '/facultades' },
        { labelKey: 'investigacion', href: '/investigacion' },
        { labelKey: 'extension', href: '/extension' },
        { labelKey: 'revistas', href: '/revistas' },
        { labelKey: 'biblioteca', href: '/biblioteca' },
        { labelKey: 'calendario', href: '/calendario-academico' },
      ],
    },
    {
      key: 'servicios',
      links: [
        { labelKey: 'tramites', href: '/tramites' },
        { labelKey: 'solicitarTitulo', href: '/solicitar-titulo' },
        { labelKey: 'informacionPublica', href: '/informacion-publica' },
        { labelKey: 'buscar', href: '/buscar' },
      ],
    },
    {
      key: 'actualidad',
      links: [
        { labelKey: 'noticias', href: '/noticias' },
        { labelKey: 'contacto', href: '/contacto' },
      ],
    },
    {
      key: 'legal',
      links: [
        { labelKey: 'privacidad', href: '/privacidad' },
        { labelKey: 'accesibilidad', href: '/accesibilidad' },
      ],
    },
  ] as const

  return (
    <div className="min-h-screen bg-slate-950">
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">{t('hero.label')}</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{t('hero.title')}</h1>
          <p className="mt-4 text-lg text-white/60">
            {t('hero.description')}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((sec) => (
            <div key={sec.key}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[#5CFF5C]">
                {t(`sections.${sec.key}.title`)}
              </h2>
              <ul className="mt-4 space-y-2">
                {sec.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
                    >
                      <span className="opacity-0 transition-opacity group-hover:opacity-100 text-[#5CFF5C]">
                        <LinkIcon />
                      </span>
                      {t(`sections.${sec.key}.${link.labelKey}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
