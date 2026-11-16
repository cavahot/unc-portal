'use client'

// Límite de error general de las rutas localizadas: un error inesperado de render llega aquí con el estilo claro del portal,
// con textos por idioma (`pages.estados`, claves `error.*`), salida clara y referencia para soporte. Usa el límite compartido
// (RouteError), que reporta a Sentry y nunca muestra el mensaje del error. Antes era una pantalla oscura con textos fijos.
import RouteError from '@/components/pages/RouteError'

export default function LocaleError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError namespace="pages.estados" {...props} />
}
