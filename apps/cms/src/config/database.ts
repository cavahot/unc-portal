type DatabaseEnvironment = {
  DATABASE_URI?: string
  [key: string]: string | undefined
}

const PLACEHOLDER_MARKERS = [
  '***',
  'REEMPLAZAR',
  'CHANGE_ME',
  'TODO',
]

/**
 * ARCH-DB-01: valida la URI PostgreSQL antes de construir el adaptador Payload.
 * Evita arrancar con placeholders o con otro motor; no comprueba conectividad ni
 * devuelve secretos en los mensajes de error. La conexión se prueba en staging.
 * DEP-10 (RDD-DEP-35): un solo nombre, DATABASE_URI. Se quitó el fallback DATABASE_URL: el compose y
 * .env.prod.example solo definen DATABASE_URI y un segundo nombre ocultaría una URI mal configurada.
 */
export function getDatabaseURL(env: DatabaseEnvironment = process.env): string {
  const value = env.DATABASE_URI?.trim() || ''
  const upperValue = value.toUpperCase()

  const isPostgres = value.startsWith('postgresql://') || value.startsWith('postgres://')
  const hasPlaceholder = PLACEHOLDER_MARKERS.some((marker) => upperValue.includes(marker))

  if (!value || !isPostgres || hasPlaceholder) {
    throw new Error('DATABASE_URI no está configurada con una URI PostgreSQL válida.')
  }

  return value
}
