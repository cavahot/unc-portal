'use client'

// INST-09: límite de error de /mapa-sitio. Un error inesperado de render llega aquí con el estilo del portal, en lugar de la
// pantalla de error global. Usa el límite compartido con los textos de esta página (`pages.mapa-sitio`, claves `error.*`).
import RouteError from '@/components/pages/RouteError'

export default function MapaSitioError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.mapa-sitio" {...props} />
}
