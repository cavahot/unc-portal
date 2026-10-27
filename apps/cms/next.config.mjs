import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withPayload } from '@payloadcms/next/withPayload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/*
 * Raíz absoluta del monorepo:
 * C:\Users\UNC\unc-portal
 *
 * Permite que Turbopack encuentre las dependencias
 * elevadas al node_modules principal.
 */
const monorepoRoot = path.resolve(__dirname, '../..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required by apps/cms/Dockerfile for the production Docker image.
  output: 'standalone',

  // When building from the monorepo root (as the Dockerfile does), Next.js
  // must trace files relative to the repo root so that server.js lands at the
  // root of .next/standalone/ instead of being nested at apps/cms/server.js.
  outputFileTracingRoot: monorepoRoot,

  turbopack: {
    root: monorepoRoot,
  },

  experimental: {
    // MIG-IMG fase 1: el proxy de Next recorta el cuerpo de las peticiones a 10 MB por defecto («Request
    // body exceeded 10MB ... Only the first 10MB will be available»). Una subida cercana al máximo de
    // archivo (MEDIA_MAX_BYTES, 10 MiB) llegaba incompleta a Payload y fallaba con 500 «Unexpected end of
    // form» en lugar de un 413 limpio. 12mb queda por encima del techo de archivo (11 MiB) + sobrecarga
    // multipart, así Payload aplica su límite con abortOnLimit. Límite: si se sube MEDIA_MAX_BYTES hay que
    // subir este valor, el techo de config/mediaStorage.ts y el client_max_body_size de nginx.
    proxyClientMaxBodySize: '12mb',
  },
}

export default withPayload(nextConfig)