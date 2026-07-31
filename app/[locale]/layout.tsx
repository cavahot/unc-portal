import { NextIntlClientProvider } from 'next-intl'
import { notFound } from 'next/navigation'
import { Inter } from 'next/font/google'
import { routing } from '@/i18n/routing'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AccessibilityPanel from '@/components/accessibility/AccessibilityPanel'
import { getNavigation, FALLBACK_NAVIGATION } from '@/lib/cms/queries/navigation'
import { loadMessages } from '@/lib/i18n/server'

const inter = Inter({ subsets: ['latin'] })

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

          <Footer locale={locale} />

          <AccessibilityPanel />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
