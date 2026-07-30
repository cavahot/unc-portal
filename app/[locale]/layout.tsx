import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages } from 'next-intl'
import { notFound } from 'next/navigation'
import { Inter } from 'next/font/google'
import { routing } from '@/i18n/routing'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AccessibilityPanel from '@/components/accessibility/AccessibilityPanel'
import { getNavigation, FALLBACK_NAVIGATION } from '@/lib/cms/queries/navigation'

const inter = Inter({ subsets: ['latin'] })

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

const NAMESPACES = [
  'common', 'nav', 'accessibility',
  'pages.home', 'pages.noticias', 'pages.buscar',
  'pages.transparencia', 'pages.revistas', 'pages.biblioteca',
  'pages.solicitar-titulo', 'pages.informacion-publica',
]

async function loadMessages(locale: string): Promise<AbstractIntlMessages> {
  const messages: Record<string, unknown> = {}
  for (const ns of NAMESPACES) {
    let mod: { default: unknown } | undefined
    try {
      mod = await import(`../../messages/${locale}/${ns}.json`)
    } catch {
      try {
        mod = await import(`../../messages/es/${ns}.json`)
      } catch { /* skip */ }
    }
    if (!mod) continue
    const parts = ns.split('.')
    let cursor = messages as Record<string, unknown>
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cursor[parts[i]]) cursor[parts[i]] = {}
      cursor = cursor[parts[i]] as Record<string, unknown>
    }
    cursor[parts[parts.length - 1]] = mod.default
  }
  return messages as AbstractIntlMessages
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  const [messages, navigation] = await Promise.all([
    loadMessages(locale),
    getNavigation().catch(() => FALLBACK_NAVIGATION),
  ])

  return (
    <html lang={locale}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('unc-a11y')||'{}'),h=document.documentElement,c=h.classList;if(s.grayscale)c.add('a11y-grayscale');if(s.highContrast)c.add('a11y-high-contrast');if(s.negative)c.add('a11y-negative');if(s.lightBg)c.add('a11y-light-bg');if(s.underlineLinks)c.add('a11y-underline-links');if(s.readableFont)c.add('a11y-readable-font');if(s.fontSize&&s.fontSize!==100)h.style.fontSize=s.fontSize+'%'}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-slate-950 text-white antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Asuncion" now={new Date()}>
          <Header navigation={navigation} />

          <main id="main-content" className="min-h-screen">
            {children}
          </main>

          <Footer />

          <AccessibilityPanel />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
