import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Universidad Nacional de Concepción',
  description: 'Portal institucional de la Universidad Nacional de Concepción - Paraguay',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
