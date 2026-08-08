import type { Metadata } from 'next'
import './globals.css'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
