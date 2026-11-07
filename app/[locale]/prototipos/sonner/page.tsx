// PROTO-SONNER-01: ruta experimental sin datos del CMS ni efectos de producción.
// Qué hace: expone el playground de notificaciones para evaluación visual en la rama de desarrollo.
// Límite: no debe agregarse al menú institucional hasta aprobar el patrón.
import type { Metadata } from 'next'
import SonnerPlayground from '@/components/prototypes/SonnerPlayground'

export const metadata: Metadata = {
  title: 'Prototipo Sonner | UNC',
  robots: { index: false, follow: false },
}

export default function SonnerPrototypePage() {
  return <SonnerPlayground />
}
