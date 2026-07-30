import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

loadEnv({
  path: path.resolve(__dirname, '../../.env'),
})

const { Client } = pg

async function publishNews() {
  console.log('[PublishNews] Starting to publish news items...\n')

  const client = new Client({
    connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('[PublishNews] ✓ Connected to database\n')

    // Update all noticias with _status = 'published'
    const result = await client.query(
      `UPDATE noticias SET _status = $1, updated_at = NOW() WHERE _status = $2 RETURNING id, title`,
      ['published', 'draft'],
    )

    console.log(`[PublishNews] ✓ Published ${result.rowCount} news items:\n`)
    result.rows.forEach((row: any) => {
      console.log(`  • ${row.title} (ID: ${row.id})`)
    })

    console.log('\n[PublishNews] ✓ Complete!')
  } catch (err) {
    console.error('[PublishNews] Error:', err instanceof Error ? err.message : err)
  } finally {
    await client.end()
    process.exit(0)
  }
}

publishNews()
