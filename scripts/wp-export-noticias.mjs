#!/usr/bin/env node
/**
 * wp-export-noticias.mjs — SEED-PROD B2
 *
 * Genera, a partir del volcado phpMyAdmin XML completo de WordPress, un extracto con SOLO lo que necesitan
 * migrate-wordpress.mjs y load-news-images.mjs para cargar las noticias (ver scripts/lib/wpExportNoticias.mjs).
 * Es el archivo que se entrega al desarrollador; el volcado completo no sale del equipo de la institución.
 *
 * Uso:
 *   node scripts/wp-export-noticias.mjs --xml=<volcado-completo.xml> --out=<fuera-del-repo>/noticias-wp.xml
 *
 * No usa red ni credenciales. Rechaza escribir dentro del repositorio para que el extracto no termine en un commit.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sanitizeWpXml } from './lib/wpExportNoticias.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** true si `target` queda dentro de `root` (incluido el propio root). */
export function isInside(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

const argValue = (argv, key) => argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3)

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const argv = process.argv.slice(2)
    const input = argValue(argv, 'xml')
    const output = argValue(argv, 'out')
    if (!input || !output) throw new Error('Uso: --xml=<volcado.xml> --out=<archivo fuera del repositorio>')
    if (isInside(ROOT, output)) throw new Error('--out apunta dentro del repositorio; elija una carpeta externa.')
    const { xml, counts } = sanitizeWpXml(readFileSync(input, 'utf8'))
    writeFileSync(output, xml, 'utf8')
    console.log(`Extracto escrito en ${output}`)
    console.log(`Resumen: ${JSON.stringify(counts)}`)
  } catch (err) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }
}
