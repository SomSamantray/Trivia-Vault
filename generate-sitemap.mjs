// Auto-generates public/sitemap.xml from src/data/articles-cms.json
// Runs automatically after every `vite build` via package.json

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://www.tr33via.online'

const MONTHS = {
  january: '01', february: '02', march: '03',    april: '04',
  may:     '05', june:     '06', july:  '07',    august: '08',
  september: '09', october: '10', november: '11', december: '12',
}

function toIsoDate(publishDate) {
  if (!publishDate) return new Date().toISOString().split('T')[0]
  const [monthName, year] = publishDate.toLowerCase().split(' ')
  const month = MONTHS[monthName] ?? '01'
  return `${year ?? new Date().getFullYear()}-${month}-01`
}

const articles = JSON.parse(
  readFileSync(resolve(__dirname, 'src/data/articles-cms.json'), 'utf8')
)

const today = new Date().toISOString().split('T')[0]

const urlEntries = [
  // Homepage
  `  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <lastmod>${today}</lastmod>
  </url>`,

  // One entry per article
  ...articles.map(a => `  <url>
    <loc>${BASE_URL}/#/article/${a.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${toIsoDate(a.publishDate)}</lastmod>
  </url>`),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>
`

writeFileSync(resolve(__dirname, 'public/sitemap.xml'), xml)
console.log(`✓ sitemap.xml — ${articles.length} article(s) + homepage`)
