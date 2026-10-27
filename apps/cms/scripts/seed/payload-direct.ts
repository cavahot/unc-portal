import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import { requireSeedAdminPassword } from './seedAdminPassword'
import type { Noticia } from '../../src/payload-types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

loadEnv({
  path: path.resolve(__dirname, '../../.env'),
})

// Import config after env is loaded
const configModule = await import('../../src/payload.config.js')
const config = configModule.default

// SEC-09: arma el contenido enriquecido (Lexical) con los literales exactos que exige Noticia['content'];
// un objeto literal suelto infiere `type: string` y no compila. Solo para datos de siembra.
const textContent = (text: string): Noticia['content'] => ({
  root: {
    type: 'root',
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', version: 1, text }],
      },
    ],
  },
})

async function seedPayload() {
  console.log('[PayloadSeed] Starting Payload seeding...\n')

  try {
    // SEC-08: valida la contraseña ANTES de cualquier lectura/escritura; falla si falta, es débil o NODE_ENV=production.
    const seedAdminPassword = requireSeedAdminPassword()
    const payload = await getPayload({ config })

    // Create admin user if needed
    const users = await payload.find({
      collection: 'users',
      where: { email: { equals: 'admin@unc.edu.py' } },
    })

    if (users.docs.length === 0) {
      console.log('[PayloadSeed] Creating admin user...')
      await payload.create({
        collection: 'users',
        data: {
          email: 'admin@unc.edu.py',
          password: seedAdminPassword,
          role: 'superadmin',
        },
      })
      console.log('[PayloadSeed] ✓ Admin created\n')
    } else {
      console.log('[PayloadSeed] Admin user exists\n')
    }

    const noticias = [
      {
        title: 'Inicio de clases 2026',
        slug: 'inicio-clases-2026',
        summary: 'La Universidad Nacional de Concepción inicia el año lectivo 2026 con todas sus carreras.',
        category: 'institucional' as const,
        publishedAt: '2026-07-15',
        featured: true,
        _status: 'published' as const,
        content: textContent('Comienza un nuevo período académico con nuevas oportunidades.'),
      },
      {
        title: 'Nueva carrera de Inteligencia Artificial',
        slug: 'carrera-inteligencia-artificial',
        summary: 'La UNC lanza su nueva carrera de Ingeniería en Inteligencia Artificial.',
        category: 'academica' as const,
        publishedAt: '2026-07-10',
        featured: true,
        _status: 'published' as const,
        content: textContent('Especialización en machine learning y deep learning.'),
      },
      {
        title: 'Convenio internacional de investigación',
        slug: 'convenio-investigacion-internacional',
        summary: 'UNC firma convenio con universidades europeas para proyectos de investigación.',
        category: 'investigacion' as const,
        publishedAt: '2026-07-05',
        featured: true,
        _status: 'published' as const,
        content: textContent('Investigación en biotecnología y energías renovables.'),
      },
    ]

    for (const noticia of noticias) {
      console.log(`[PayloadSeed] Creating: ${noticia.title}...`)

      // Check if exists
      const existing = await payload.find({
        collection: 'noticias',
        where: { slug: { equals: noticia.slug } },
      })

      if (existing.docs.length > 0) {
        console.log('[PayloadSeed] ✓ Already exists\n')
        continue
      }

      try {
        await payload.create({
          collection: 'noticias',
          data: noticia,
        })
        console.log('[PayloadSeed] ✓ Created\n')
      } catch (e) {
        console.error('[PayloadSeed] Error creating:', e instanceof Error ? e.message : e)
      }
    }

    console.log('[PayloadSeed] ✓ Complete!')
    process.exit(0)
  } catch (err) {
    console.error('[PayloadSeed] Error:', err instanceof Error ? err.message : err)
    if (err instanceof Error) {
      console.error(err.stack)
    }
    process.exit(1)
  }
}

seedPayload()
