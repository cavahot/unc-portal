'use client'

// INST-12: límite de error de /contacto/dependencias. Un error inesperado de render llega aquí con el estilo del portal, en lugar
// de la pantalla de error global. Usa el límite compartido con los textos de esta página (`pages.contacto-dependencias`, claves `error.*`).
import RouteError from '@/components/pages/RouteError'

export default function DependenciasError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.contacto-dependencias" {...props} />
}
