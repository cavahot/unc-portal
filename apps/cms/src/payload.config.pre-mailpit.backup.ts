import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { es } from '@payloadcms/translations/languages/es'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseURL =
  process.env.DATABASE_URI ||
  process.env.DATABASE_URL ||
  ''

export default buildConfig({
  admin: {
    user: Users.slug,

    importMap: {
      baseDir: path.resolve(dirname),
    },
  },

  /**
   * Idioma de la interfaz administrativa.
   * El panel de Payload utilizará español como idioma principal.
   */
  i18n: {
    fallbackLanguage: 'es',

    supportedLanguages: {
      es,
    },
  },

  collections: [
    Users,
    Media,
  ],

  editor: lexicalEditor(),

  secret: process.env.PAYLOAD_SECRET || '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: postgresAdapter({
    pool: {
      connectionString: databaseURL,
    },
  }),

  sharp,

  plugins: [],
})