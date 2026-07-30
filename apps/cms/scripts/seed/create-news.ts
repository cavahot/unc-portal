async function createNews() {
  console.log('[CreateNews] Creating sample news items...\n')

  const CMS_URL = 'http://localhost:3002'

  const noticias = [
    {
      title: 'Inicio de clases 2026',
      slug: 'inicio-clases-2026',
      summary: 'La Universidad Nacional de Concepción inicia el año lectivo 2026 con todas sus carreras.',
      category: 'institucional',
      publishedAt: '2026-07-15',
      featured: true,
      _status: 'published',
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ text: 'Comienza un nuevo período académico con nuevas oportunidades.' }],
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
      _status: 'published',
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ text: 'Especialización en machine learning y deep learning.' }],
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
      _status: 'published',
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

  try {
    for (const noticia of noticias) {
      console.log(`[CreateNews] Creating: ${noticia.title}...`)

      try {
        // Try to check if it already exists
        const checkRes = await fetch(
          `${CMS_URL}/api/noticias?where[slug][equals]=${encodeURIComponent(noticia.slug)}&limit=1`,
        )
        const existing = await checkRes.json()

        if (existing.docs && existing.docs.length > 0) {
          console.log(`[CreateNews] ✓ Already exists\n`)
          continue
        }
      } catch (e) {
        // If check fails, try to create anyway
      }

      const res = await fetch(`${CMS_URL}/api/noticias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noticia),
      })

      if (res.ok) {
        console.log('[CreateNews] ✓ Created\n')
      } else {
        const error = await res.json()
        const errorMsg = error.errors?.[0]?.message || 'Unknown error'
        console.log(`[CreateNews] ⚠ Failed: ${errorMsg}\n`)
      }
    }

    console.log('[CreateNews] ✓ Done!')
    process.exit(0)
  } catch (err) {
    console.error('[CreateNews] Error:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

createNews()
