import { scrapeUNCNews } from '../import/helpers/scraper'

async function seed() {
  console.log('[Seed] Starting UNC data scrape...\n')

  try {
    const items = await scrapeUNCNews()

    console.log(`\n[Seed] Scraped ${items.length} items:\n`)

    items.forEach((item, i) => {
      console.log(`${i + 1}. ${item.title}`)
      console.log(`   Slug: ${item.slug}`)
      console.log(`   URL: ${item.url}`)
      console.log()
    })

    console.log('[Seed] Demo complete! Items ready for Fase 5 (Noticias collection)')
    process.exit(0)
  } catch (err) {
    console.error('[Seed] Error:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

seed()
