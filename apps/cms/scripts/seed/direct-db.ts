import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

loadEnv({
  path: path.resolve(__dirname, '../../.env'),
})

const { Client } = pg

async function seedDatabase() {
  console.log('[SeedDB] Starting database seeding...\n')

  const client = new Client({
    connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('[SeedDB] ✓ Connected to database\n')

    const noticias = [
      {
        title: 'Inicio de clases 2026',
        slug: 'inicio-clases-2026',
        summary: 'La Universidad Nacional de Concepción inicia el año lectivo 2026 con todas sus carreras.',
        category: 'institucional',
        featured: true,
        published_at: '2026-07-15',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        title: 'Nueva carrera de Inteligencia Artificial',
        slug: 'carrera-inteligencia-artificial',
        summary: 'La UNC lanza su nueva carrera de Ingeniería en Inteligencia Artificial.',
        category: 'academica',
        featured: true,
        published_at: '2026-07-10',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        title: 'Convenio internacional de investigación',
        slug: 'convenio-investigacion-internacional',
        summary: 'UNC firma convenio con universidades europeas para proyectos de investigación.',
        category: 'investigacion',
        featured: true,
        published_at: '2026-07-05',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    for (const noticia of noticias) {
      console.log(`[SeedDB] Checking: ${noticia.title}...`)

      // Check if exists
      const existing = await client.query(
        'SELECT id FROM noticias WHERE slug = $1',
        [noticia.slug],
      )

      if (existing.rows.length > 0) {
        console.log('[SeedDB] ✓ Already exists\n')
        continue
      }

      // Insert
      try {
        await client.query(
          `INSERT INTO noticias (title, slug, summary, category, featured, published_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            noticia.title,
            noticia.slug,
            noticia.summary,
            noticia.category,
            noticia.featured,
            noticia.published_at,
            noticia.created_at,
            noticia.updated_at,
          ],
        )
        console.log('[SeedDB] ✓ Created\n')
      } catch (e) {
        console.error('[SeedDB] ✗ Insert failed:', e instanceof Error ? e.message : e)
      }
    }

    console.log('[SeedDB] ✓ Database seeding complete!')
  } catch (err) {
    console.error('[SeedDB] Error:', err instanceof Error ? err.message : err)
  } finally {
    await client.end()
    process.exit(0)
  }
}

seedDatabase()
