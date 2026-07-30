import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

loadEnv({
  path: path.resolve(__dirname, '../../.env'),
})

async function seedWithAuth() {
  console.log('[SeedAuth] Creating news items via authenticated API...\n')

  const CMS_URL = 'http://localhost:3002'

  try {
    // Step 1: Login first
    console.log('[SeedAuth] Attempting to login...')
    const loginRes = await fetch(`${CMS_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@unc.edu.py',
        password: 'Admin@2026',
      }),
    })

    if (!loginRes.ok) {
      console.log('[SeedAuth] ⚠ Login failed. Using guest API...\n')
    } else {
      const loginData = await loginRes.json()
      console.log('[SeedAuth] ✓ Logged in\n')

      // If login successful, we would use the token
      // But for now, we'll skip to direct API approach
    }

    const noticias = [
      {
        title: 'Inicio de clases 2026',
        slug: 'inicio-clases-2026',
        summary: 'La Universidad Nacional de Concepción inicia el año lectivo 2026 con todas sus carreras.',
        category: 'institucional',
        publishedAt: '2026-07-15',
        featured: true,
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  { text: 'Comienza un nuevo período académico con nuevas oportunidades.' },
                ],
              },
            ],
          },
        },
      },
      {
        title: 'Nueva carrera de Inteligencia Artificial',
        slug: 'carrera-inteligencia-artificial',
        summary: 'La UNC lanza su nueva carrera de Ingeniería en Inteligencia Artificial.',
        category: 'academica',
        publishedAt: '2026-07-10',
        featured: true,
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  { text: 'Especialización en machine learning y deep learning.' },
                ],
              },
            ],
          },
        },
      },
      {
        title: 'Convenio internacional de investigación',
        slug: 'convenio-investigacion-internacional',
        summary: 'UNC firma convenio con universidades europeas para proyectos de investigación.',
        category: 'investigacion',
        publishedAt: '2026-07-05',
        featured: true,
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ text: 'Investigación en biotecnología y energías renovables.' }],
              },
            ],
          },
        },
      },
    ]

    for (const noticia of noticias) {
      console.log(`[SeedAuth] Creating: ${noticia.title}...`)

      const res = await fetch(`${CMS_URL}/api/noticias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noticia),
      })

      const data = await res.json()

      if (res.ok) {
        console.log(`[SeedAuth] ✓ Created (ID: ${data.id})\n`)
      } else {
        console.log(`[SeedAuth] ⚠ Failed: ${data.errors?.[0]?.message || 'Unknown error'}\n`)
      }
    }

    console.log('[SeedAuth] ✓ Done!')
    process.exit(0)
  } catch (err) {
    console.error('[SeedAuth] Error:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

seedWithAuth()
