import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
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

const smtpPort = Number(process.env.SMTP_PORT || 1025)
const smtpSecure = process.env.SMTP_SECURE === 'true'
const smtpUser = process.env.SMTP_USER
const smtpPassword = process.env.SMTP_PASSWORD

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },

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

  email: nodemailerAdapter({
    defaultFromAddress:
      process.env.SMTP_FROM_ADDRESS || 'portal@unc.edu.py',
    defaultFromName:
      process.env.SMTP_FROM_NAME || 'Portal Institucional UNC',
    transportOptions: {
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: smtpPort,
      secure: smtpSecure,
      ...(smtpUser && smtpPassword
        ? {
            auth: {
              user: smtpUser,
              pass: smtpPassword,
            },
          }
        : {}),
    },
  }),

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
