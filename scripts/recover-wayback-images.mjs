#!/usr/bin/env node
/**
 * recover-wayback-images.mjs — SEED-PROD-IMG
 *
 * Recupera del Internet Archive las imágenes de noticias que faltan en la carpeta de uploads (las de 2016-2023 ya no
 * existen en el sitio). Lee la lista de faltantes del `manifest.json` que genera `load-news-images.mjs --dry-run`.
 * Las guarda en la misma carpeta (`AAAA/MM/archivo`) para que el cargador las suba después como cualquier otra.
 *
 * Uso:
 *   node scripts/load-news-images.mjs --xml=<extracto.xml> --uploads=<dir> --out=<dir-salida> --dry-run
 *   node scripts/recover-wayback-images.mjs --manifest=<dir-salida>/manifest.json --uploads=<dir>            # plan
 *   node scripts/recover-wayback-images.mjs --manifest=<dir-salida>/manifest.json --uploads=<dir> --apply    # descarga
 *
 * Red: solo web.archive.org (2 consultas CDX + 1 descarga cada `--delay-ms`, 2000 por defecto). No usa credenciales.
 * Idempotente: nunca sobrescribe un archivo existente; repetir solo descarga lo que siga faltando.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseCdx, planRecovery, runRecovery } from './lib/waybackRecovery.mjs'

const CDX_HOSTS = ['www.unc.edu.py', 'unc.edu.py']
const argValue = (argv, key) => argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Rutas faltantes únicas de todas las noticias del manifiesto. */
export function missingFromManifest(manifest) {
  const out = new Set()
  for (const n of manifest?.noticias ?? []) for (const rel of n.missing ?? []) out.add(rel)
  return [...out]
}

/** Consulta la API CDX: capturas 200 de imágenes bajo wp-content/uploads, una por URL. */
async function fetchCdx(host) {
  const url = `https://web.archive.org/cdx/search/cdx?url=${host}/wp-content/uploads/&matchType=prefix&filter=statuscode:200&filter=mimetype:image.*&fl=original,timestamp&collapse=urlkey`
  const res = await fetch(url, { headers: { 'User-Agent': 'unc-portal-migracion/1.0' } })
  if (!res.ok) throw new Error(`La consulta CDX de ${host} respondió HTTP ${res.status}`)
  return res.text()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ;(async () => {
    const argv = process.argv.slice(2)
    const manifestPath = argValue(argv, 'manifest')
    const uploads = argValue(argv, 'uploads')
    const delayMs = Number(argValue(argv, 'delay-ms') ?? 2000)
    if (!manifestPath || !uploads) throw new Error('Uso: --manifest=<manifest.json> --uploads=<carpeta> [--apply] [--delay-ms=2000]')
    if (!Number.isFinite(delayMs) || delayMs < 500) throw new Error('--delay-ms debe ser 500 o más (cortesía con el Internet Archive).')
    const missing = missingFromManifest(JSON.parse(readFileSync(manifestPath, 'utf8')))
    const cdx = parseCdx((await Promise.all(CDX_HOSTS.map(fetchCdx))).join('\n'))
    const plan = planRecovery({ missing, cdx, exists: (rel) => existsSync(path.join(uploads, rel)) })
    console.log(`Faltantes: ${missing.length}; capturas en el archivo: ${cdx.size}; a descargar: ${plan.length}`)
    if (!argv.includes('--apply')) {
      for (const p of plan) console.log(`  [plan] ${p.rel}`)
      console.log('Simulacro: no se descargó nada. Agregue --apply para descargar.')
      return
    }
    const counts = await runRecovery({
      plan,
      sleep,
      delayMs,
      log: (m) => console.log(m),
      write: (rel, data) => {
        const file = path.join(uploads, rel)
        mkdirSync(path.dirname(file), { recursive: true })
        writeFileSync(file, data, { flag: 'wx' })
      },
    })
    console.log(`Resumen: ${JSON.stringify(counts)}`)
  })().catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
