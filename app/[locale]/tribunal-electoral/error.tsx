'use client'

// INST-02: límite de error de /tribunal-electoral. En producción, una caída del CMS en las consultas del tribunal
// (DEP-19b: no se muestran datos de demostración) llega aquí en lugar de a la pantalla de error global.
// Usa el límite compartido con los textos de esta página (`pages.tribunal-electoral`, claves `error.*`).
import RouteError from '@/components/pages/RouteError'

export default function TribunalElectoralError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.tribunal-electoral" {...props} />
}
