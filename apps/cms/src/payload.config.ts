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
// LT-01: hitos de la línea de tiempo de /historia (docs/specs/portal/LINEA-TIEMPO.md).
import { LineaTiempo } from './collections/LineaTiempo'
// GLO-GN-01: glosario español → guaraní interno (docs/specs/i18n/GLOSARIO-GUARANI.md).
import { GlosarioGuarani } from './collections/GlosarioGuarani'
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
import { TransparenciaItems } from './collections/TransparenciaItems'
import Convenios from './collections/Convenios'
import TribunalMiembros from './collections/TribunalMiembros'
import TribunalDocumentos from './collections/TribunalDocumentos'
import ArancelesRectorado from './collections/ArancelesRectorado'
// FAC-01: aranceles de cada facultad (spec docs/specs/portal/FACULTADES.md §3.3).
import ArancelesFacultad from './collections/ArancelesFacultad'
import { FAQs } from './collections/FAQs'
import { Reconocimientos } from './collections/Reconocimientos'
import { Acreditaciones } from './collections/Acreditaciones'
import { Navegacion } from './globals/Navegacion'
import { Transparencia } from './globals/Transparencia'
import { EnlacesExternos } from './globals/EnlacesExternos'
import { Estadisticas } from './globals/Estadisticas'
import { getDatabaseURL } from './config/database'
import { buildUploadOptions, resolveMediaStorage } from './config/mediaStorage'
import { hasRole } from './access/roles'
import { resolvePayloadSecret } from './config/secrets'
import { ADMIN_ROUTE } from './config/adminRoute'
import { signPreviewToken } from './utilities/previewToken'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// ARCH-DB-01: no permite arrancar Payload con una URI vacía o de ejemplo.
// La conectividad real se verifica aparte en un PostgreSQL sintético.
const databaseURL = getDatabaseURL()

// MIG-IMG fase 1: el almacenamiento de `media` se elige de forma EXPLÍCITA con MEDIA_STORAGE
// ('local' por defecto | 's3'). Falla cerrada al arrancar si 's3' queda a medio configurar. Antes el
// plugin S3 se activaba solo por tener dos variables y, con el almacén S3 caído, toda subida fallaba.
// Límite: despliegues que usaban S3 solo por tener las claves deben fijar MEDIA_STORAGE=s3.
const mediaStorage = resolveMediaStorage(process.env)

// DEP-16/D: roles que pueden abrir un preview firmado. Excluye auditor, consulta y gestor
// multimedia (no editan contenido). El CMS sigue decidiendo qué borradores ve cada rol (DEP-02).
const PREVIEW_ROLES = ['superadmin', 'web-admin', 'publisher', 'reviewer', 'editor', 'correspondent'] as const

const smtpPort = Number(process.env.SMTP_PORT || 1025)
const smtpSecure = process.env.SMTP_SECURE === 'true'
const smtpUser = process.env.SMTP_USER
const smtpPassword = process.env.SMTP_PASSWORD

export default buildConfig({
  // DEP-03 D2 / SEC-03: GraphQL desactivado. El portal no lo consume (solo usa REST/Local API) y el
  // esquema no se construye (tipo `Faq` duplicado). Amenaza que evita: superficie extra de consulta
  // (introspección, consultas anidadas) con las mismas ACL a vigilar. Límite: /api/graphql responde 404;
  // para reactivarlo hay que renombrar el tipo duplicado y repetir las pruebas GraphQL de DEP-03.
  graphQL: {
    disable: true,
  },
  routes: {
    admin: ADMIN_ROUTE,
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      // DEP-16/D (RDD-DEP-40): genera el enlace de preview con un token HMAC de 5 min, NO con el
      // secreto crudo. Esta función corre SOLO en el servidor: handleLivePreview (@payloadcms/ui
      // dist/utilities/handleLivePreview.js:73-85) la invoca desde el RSC de Document y desde la
      // acción de servidor buildFormState, y la config de cliente descarta `url`
      // (payload dist/config/client.js:92-102). Amenaza: secreto en historial/logs/Referer. Solo
      // firma para sesiones con rol editorial (req.user); sin sesión, sin rol, con secreto débil o
      // sin slug devuelve '' (no hay preview) y no registra el valor. Límite: el token es un bearer
      // de 5 min atado a slug y tipo; la generación real en staging sigue como hipótesis (spec §H1).
      url: ({ data, collectionConfig, req }) => {
        try {
          if (!hasRole(req?.user, PREVIEW_ROLES) || typeof data?.slug !== 'string') return ''
          const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000'
          const type = collectionConfig?.slug === 'paginas' ? 'page' : 'noticia'
          const token = signPreviewToken({ slug: data.slug, type }, process.env.PREVIEW_SECRET)
          return `${portalUrl}/api/preview?token=${encodeURIComponent(token)}`
        } catch (error) {
          console.error('[DEP-16] No se pudo firmar el enlace de preview:', error instanceof Error ? error.message : 'error')
          return ''
        }
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
    LineaTiempo,
    Auditoria,
    Autoridades,
    TransparenciaItems,
    Ley5189,
    Ley5282,
    Convenios,
    TribunalMiembros,
    TribunalDocumentos,
    ArancelesRectorado,
    ArancelesFacultad,
    FAQs,
    Reconocimientos,
    Acreditaciones,
    GlosarioGuarani,
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

  // DEP-16/A (RDD-DEP-38): falla cerrada si PAYLOAD_SECRET falta, es corto o de ejemplo (nunca vacío).
  secret: resolvePayloadSecret(),

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: postgresAdapter({
    // ARCH-DB-02: obliga a Payload a buscar migraciones en una ruta versionable
    // del repositorio; evita depender de autodetección o cambios manuales.
    migrationDir: path.resolve(dirname, 'migrations'),
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

  // MIG-IMG fase 1: tope por archivo en las subidas multipart (REST y panel) con abortOnLimit=true:
  // sin él Payload guardaría el archivo TRUNCADO sin error (processMultipart.js:67-83). Tope desde
  // MEDIA_MAX_BYTES (10 MiB por defecto). Límite: la Local API no pasa por multipart; el hook de bytes
  // de Media repite el tope.
  upload: buildUploadOptions(process.env),

  plugins: [
    // S3 solo si MEDIA_STORAGE=s3 (validado arriba: exige claves, bucket y endpoint).
    // En modo 'local' los archivos van al directorio persistente MEDIA_DIR (collections/Media.ts).
    ...(mediaStorage.mode === 's3'
      ? [
          s3Storage({
            bucket: process.env.S3_BUCKET || 'unc-media',
            collections: {
              media: {
                // Servir los archivos directo desde el almacén S3 (SeaweedFS) / CDN, sin pasar por el proxy con auth de Payload.
                // The bucket policy already enforces public read; no extra gate needed.
                disablePayloadAccessControl: true,

                // Build the public URL that gets stored in the DB and returned to the portal.
                // S3_PUBLIC_URL:  https://files.unc.edu.py    (production — nginx → almacén S3, solo GET)
                // S3_ENDPOINT:    http://127.0.0.1:9100       (local dev — SeaweedFS path-style)
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
                accessKeyId:     process.env.S3_ACCESS_KEY_ID as string, // validadas por resolveMediaStorage('s3')
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
              },
              // Siempre el endpoint interno/directo del almacén S3 para subidas (no la URL pública).
              // SeaweedFS exige forcePathStyle y región us-east-1 (verificado en el spike 12/12).
              endpoint:      process.env.S3_ENDPOINT || 'http://127.0.0.1:9100',
              forcePathStyle: true,
              region:         process.env.S3_REGION || 'us-east-1',
            },
          }),
        ]
      : []),
  ],
})
