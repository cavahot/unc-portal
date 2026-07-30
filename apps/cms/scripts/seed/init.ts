import { getPayload } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'
import { config as loadEnv } from 'dotenv'
import config from '../../src/payload.config.js'

loadEnv({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env'),
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function init() {
  console.log('[Init] Starting CMS initialization...\n')

  try {
    const payload = await getPayload({ config })

    // Create test admin user if it doesn't exist
    const existing = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: 'admin@unc.edu.py',
        },
      },
    })

    if (existing.docs.length === 0) {
      console.log('[Init] Creating admin user...')
      await payload.create({
        collection: 'users',
        data: {
          email: 'admin@unc.edu.py',
          password: 'Admin@2026',
          role: 'superadmin',
        },
      })
      console.log('[Init] ✓ Admin user created: admin@unc.edu.py\n')
    } else {
      console.log('[Init] Admin user already exists\n')
    }

    // Create sample published news
    const noticias = [
      {
        title: 'Inicio de clases 2026',
        slug: 'inicio-clases-2026',
        summary: 'La Universidad Nacional de Concepción inicia el año lectivo 2026 con todas sus carreras.',
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    text: 'Comienza un nuevo período académico con nuevas oportunidades para estudiantes.',
                  },
                ],
              },
            ],
          },
        },
        category: 'institucional',
        publishedAt: '2026-07-15',
        featured: true,
        _status: 'published',
      },
      {
        title: 'Nueva carrera de Inteligencia Artificial',
        slug: 'carrera-inteligencia-artificial',
        summary: 'La UNC lanza su nueva carrera de Ingeniería en Inteligencia Artificial.',
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    text: 'La nueva carrera ofrece especialización en machine learning y deep learning.',
                  },
                ],
              },
            ],
          },
        },
        category: 'academica',
        publishedAt: '2026-07-10',
        featured: true,
        _status: 'published',
      },
      {
        title: 'Convenio internacional de investigación',
        slug: 'convenio-investigacion-internacional',
        summary: 'UNC firma convenio con universidades europeas para proyectos de investigación.',
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    text: 'El convenio abre oportunidades para investigadores en biotecnología y energías renovables.',
                  },
                ],
              },
            ],
          },
        },
        category: 'investigacion',
        publishedAt: '2026-07-05',
        featured: true,
        _status: 'published',
      },
    ]

    for (const noticia of noticias) {
      const existing = await payload.find({
        collection: 'noticias',
        where: {
          slug: {
            equals: noticia.slug,
          },
        },
      })

      if (existing.docs.length === 0) {
        console.log(`[Init] Creating noticia: ${noticia.title}...`)
        await payload.create({
          collection: 'noticias',
          data: noticia,
        })
        console.log(`[Init] ✓ Created\n`)
      } else {
        console.log(`[Init] Noticia already exists: ${noticia.title}\n`)
      }
    }

    console.log('[Init] ✓ CMS initialization complete!')
    process.exit(0)
  } catch (err) {
    console.error('[Init] Error:', err instanceof Error ? err.message : err)
    if (err instanceof Error) {
      console.error(err.stack)
    }
    process.exit(1)
  }
}

init()
