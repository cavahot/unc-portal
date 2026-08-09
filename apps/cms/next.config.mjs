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
}

export default withPayload(nextConfig)