import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
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
  // FAV-01: íconos servidos desde public/. Van bajo /icons/ (y favicon.ico) porque proxy.ts
  // excluye esas rutas del middleware i18n; en la raíz devolverían el 404 localizado.
  // Generados con scripts/generate-favicons.mjs a partir de public/images/logo.png.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/icons/site.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Universidad Nacional de Concepción',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

// FAV-01: color de la barra del navegador móvil (verde UNC), coherente con el manifest.
export const viewport: Viewport = {
  themeColor: '#004700',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the nonce injected by proxy.ts middleware so Next.js can propagate
  // it to all its RSC inline scripts (self.__next_f.push) automatically.
  // This is required for strict-dynamic CSP to work in production.
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') ?? ''

  return (
    <html lang="es" nonce={nonce} suppressHydrationWarning>
      <body
        className={`${inter.className} bg-slate-950 text-white antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
