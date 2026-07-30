import * as https from 'https'
import * as http from 'http'
import { load } from 'cheerio'

export interface ScrapedItem {
  title: string
  slug: string
  summary: string
  url: string
}

export async function fetchHTML(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, { timeout: 10000 }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

export async function scrapeUNCNews(): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  // 1. Scrapear homepage
  console.log('[Scraper] Fetching homepage...')
  let html = await fetchHTML('https://www.unc.edu.py')
  let $ = load(html)

  $('h2, h3, a[href*="noticias"], a[href*="noticia"]').each((i, el) => {
    if (items.length >= 15) return

    const $el = $(el)
    const title = $el.text().trim()
    let link = $el.attr('href') || ''

    if (!link) link = $el.closest('a').attr('href') || ''

    if (title.length > 10 && title.length < 200 && !seen.has(title)) {
      const url = link.startsWith('http') ? link : `https://www.unc.edu.py${link}`
      if (url.includes('unc.edu.py')) {
        seen.add(title)
        items.push({
          title,
          slug: slugify(title),
          summary: title.substring(0, 120),
          url,
        })
      }
    }
  })

  // 2. Scrapear sección noticias si existe
  console.log('[Scraper] Checking noticias section...')
  try {
    html = await fetchHTML('https://www.unc.edu.py/noticias')
    $ = load(html)

    $('h2, h3, .post-title, .news-item, article').each((i, el) => {
      if (items.length >= 15) return

      const $el = $(el)
      const titleEl = $el.find('h2, h3, .title').first()
      const title = titleEl.text().trim() || $el.text().trim().substring(0, 150)
      let link = $el.find('a').first().attr('href') || ''

      if (title.length > 10 && title.length < 200 && !seen.has(title)) {
        const url = link.startsWith('http') ? link : `https://www.unc.edu.py${link}`
        if (url.includes('unc.edu.py')) {
          seen.add(title)
          items.push({
            title,
            slug: slugify(title),
            summary: title.substring(0, 120),
            url,
          })
        }
      }
    })
  } catch (err) {
    console.log('[Scraper] Noticias section not found, continuing...')
  }

  // 3. Scrapear eventos/actividades si existen
  console.log('[Scraper] Checking events section...')
  try {
    html = await fetchHTML('https://www.unc.edu.py/eventos')
    $ = load(html)

    $('h2, h3, .event-title, .event-item').each((i, el) => {
      if (items.length >= 15) return

      const $el = $(el)
      const title = $el.text().trim()
      let link = $el.closest('a').attr('href') || $el.find('a').first().attr('href') || ''

      if (title.length > 10 && title.length < 200 && !seen.has(title)) {
        const url = link.startsWith('http') ? link : `https://www.unc.edu.py${link}`
        if (url.includes('unc.edu.py')) {
          seen.add(title)
          items.push({
            title,
            slug: slugify(title),
            summary: title.substring(0, 120),
            url,
          })
        }
      }
    })
  } catch (err) {
    console.log('[Scraper] Events section not found, continuing...')
  }

  console.log(`[Scraper] Found ${items.length} total items`)
  return items.slice(0, 15)
}
