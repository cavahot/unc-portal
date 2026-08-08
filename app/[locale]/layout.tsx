import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { draftMode } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AccessibilityPanel from '@/components/accessibility/AccessibilityPanel'
import PreviewBanner from '@/components/preview/PreviewBanner'
import { getNavigation, FALLBACK_NAVIGATION } from '@/lib/cms/queries/navigation'
import { loadMessages } from '@/lib/i18n/server'
import { baseOg } from '@/lib/seo/og'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    openGraph: {
      ...baseOg(locale),
    },
  }
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

  // Read the nonce that the middleware (proxy.ts) injected into the request headers.
  // Server Components see it via headers() because the middleware used
  // NextResponse.next({ request: { headers: { 'x-nonce': nonce } } }).
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') ?? ''

  const { isEnabled: isDraft } = await draftMode()

  const [messages, navigation] = await Promise.all([
    loadMessages(locale),
    getNavigation().catch(() => FALLBACK_NAVIGATION),
  ])

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Asuncion" now={new Date()}>
      {isDraft && <PreviewBanner />}
      <Header navigation={navigation} />

      <main id="main-content" className="min-h-screen">
        {children}
      </main>

      <Footer locale={locale} />

      <AccessibilityPanel />
    </NextIntlClientProvider>
  )
}
