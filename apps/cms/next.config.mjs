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
  turbopack: {
    root: monorepoRoot,
  },
}

export default withPayload(nextConfig)