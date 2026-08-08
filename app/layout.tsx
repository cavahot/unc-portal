import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.unc.edu.py'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Universidad Nacional de Concepción',
    template: '%s — UNC',
  },
  description: 'Portal institucional de la Universidad Nacional de Concepción - Paraguay',
  openGraph: {
    type: 'website',
    siteName: 'Universidad Nacional de Concepción',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const locale = headersList.get('x-locale') ?? 'es'

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.className} bg-slate-950 text-white antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
