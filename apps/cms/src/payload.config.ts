import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { es } from '@payloadcms/translations/languages/es'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { s3Storage } from '@payloadcms/storage-s3'
import sharp from 'sharp'

import { Carreras } from './collections/Carreras'
import { Facultades } from './collections/Facultades'
import { MarcoLegal } from './collections/MarcoLegal'
import { Media } from './collections/Media'
import { Noticias } from './collections/Noticias'
import { Paginas } from './collections/Paginas'
import { Revistas } from './collections/Revistas'
import { Tesis } from './collections/Tesis'
import { Users } from './collections/Users'
import { Auditoria } from './collections/Auditoria'
import { Autoridades } from './collections/Autoridades'
import { Ley5189 } from './collections/Ley5189'
import { Ley5282 } from './collections/Ley5282'
import Convenios from './collections/Convenios'
import TribunalMiembros from './collections/TribunalMiembros'
import TribunalDocumentos from './collections/TribunalDocumentos'
import ArancelesRectorado from './collections/ArancelesRectorado'
import { FAQs } from './collections/FAQs'
import { Navegacion } from './globals/Navegacion'
import { Transparencia } from './globals/Transparencia'
import { EnlacesExternos } from './globals/EnlacesExternos'
import { Estadisticas } from './globals/Estadisticas'

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
  routes: {
    admin: '/accesoSeguro',
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      url: ({ data, collectionConfig }) => {
        const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000'
        const secret = process.env.PREVIEW_SECRET || ''
        const type = collectionConfig?.slug === 'paginas' ? 'page' : 'noticia'
        return `${portalUrl}/api/preview?secret=${secret}&slug=${data.slug}&type=${type}`
      },
      collections: ['noticias', 'paginas'],
    },
    components: {
      afterNavLinks: [
        {
          path: './admin/components/NavLinks',
          exportName: 'CustomNavLinks',
        },
      ],
      views: {
        PortalDashboard: {
          Component: {
            path: './admin/views/PortalDashboard',
            exportName: 'PortalDashboard',
          },
          path: '/portal',
        },
        PortalMonitoring: {
          Component: {
            path: './admin/views/MonitoringView',
            exportName: 'MonitoringView',
          },
          path: '/portal-monitoring',
        },
        PortalAudit: {
          Component: {
            path: './admin/views/AuditView',
            exportName: 'AuditView',
          },
          path: '/portal-audit',
        },
      },
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
    Noticias,
    Paginas,
    Revistas,
    Tesis,
    Facultades,
    Carreras,
    MarcoLegal,
    Auditoria,
    Autoridades,
    Ley5189,
    Ley5282,
    Convenios,
    TribunalMiembros,
    TribunalDocumentos,
    ArancelesRectorado,
    FAQs,
  ],

  globals: [Navegacion, Transparencia, EnlacesExternos, Estadisticas],

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
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Enable SSL only when explicitly configured (e.g. external managed DB).
      // Within Docker Compose the Postgres container is on the same internal
      // network and has no TLS certs — forcing SSL there causes connection failures.
      ssl: process.env.POSTGRES_SSL === 'true'
        ? { rejectUnauthorized: true }
        : false,
    },
  }),

  sharp,

  plugins: [
    // S3 storage only when credentials are explicitly configured.
    // Without them, Payload falls back to local filesystem (safe for local dev).
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? [
          s3Storage({
            bucket: process.env.S3_BUCKET || 'unc-media',
            collections: {
              media: {
                // Serve files directly from MinIO/CDN — bypass Payload's auth proxy.
                // The bucket policy already enforces public read; no extra gate needed.
                disablePayloadAccessControl: true,

                // Build the public URL that gets stored in the DB and returned to the portal.
                // S3_PUBLIC_URL:  https://files.unc.edu.py    (production — nginx → MinIO)
                // S3_ENDPOINT:    http://127.0.0.1:9100       (local dev — MinIO path-style)
                generateFileURL: ({ filename, prefix }) => {
                  const base   = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT || 'http://127.0.0.1:9100'
                  const bucket = process.env.S3_BUCKET || 'unc-media'
                  // Encode only the filename, keep prefix path segments intact.
                  // Mirrors what the default generateURL.js does internally.
                  const encodedFile = encodeURIComponent(filename)
                  const key = prefix ? `${prefix}/${encodedFile}` : encodedFile
                  return `${base}/${bucket}/${key}`
                },
              },
            },
            config: {
              credentials: {
                accessKeyId:     process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
              },
              // Always the internal/direct MinIO endpoint for uploads (not the public URL).
              endpoint:      process.env.S3_ENDPOINT || 'http://127.0.0.1:9100',
              forcePathStyle: true,
              region:         process.env.S3_REGION || 'us-east-1',
            },
          }),
        ]
      : []),
  ],
})
