#!/usr/bin/env node
/**
 * MIG-IMG fase 3: cargador masivo de imágenes de noticias (WordPress -> Media de Payload -> noticias).
 * Spec: docs/specs/migration/MIG-IMG-imagenes-de-noticias.md §11 y «Implementación del cargador».
 *
 * Fases (se pueden combinar `--only-upload --link`):
 *   --dry-run      Fase 0: SIN red ni CMS. Lee el volcado XML y la carpeta de uploads, valida los bytes y
 *                  escribe manifest.json + mig-img-report.json en --out (fuera del repositorio).
 *   --only-upload  Fase 1: sube a `media` lo válido y referenciado (idempotente por sourcePath/sha256).
 *   --link         Fase 2: enlaza featuredImage/gallery por slug con el flujo editorial.
 *   --check-alt    Informe (solo lectura) de media ya cargada con alt pobre o con letras decorativas Unicode.
 *   --fix-alt      Corrige esos alt por PATCH {alt} (solo filas con sourcePath y con un sustituto bueno).
 *
 * Opciones: --xml=<volcado.xml> --uploads=<dir con AAAA/MM/> --out=<dir> --cms=<url> --allow-remote
 *           --delay-ms=1500 --limit=N (fase 1: archivos; fase 2: noticias con trabajo real) --include-orphans
 * Credenciales SOLO por entorno: CMS_EMAIL/CMS_PASSWORD (autor y subida) y, para publicar,
 * CMS_REVIEWER_EMAIL/CMS_REVIEWER_PASSWORD y CMS_PUBLISHER_EMAIL/CMS_PUBLISHER_PASSWORD (tres
 * identidades distintas). Nunca se aceptan contraseñas por argumento ni se imprimen.
 * Salida: solo conteos y nombres de archivo/slug. Código: 0 ok; 1 errores no reintentables o identidades
 * inválidas; 2 uso/guardia; 3 solo errores reintentables (repetir el mismo comando).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireCmsEmail, resolveCmsTarget } from './lib/cmsTarget.mjs'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { safeLocalPath } from './lib/wpContent.mjs'
import {
  buildNoticiaEntries,
  buildReport,
  createCmsClient,
  describeFile,
  duplicateAliases,
  loginCms,
  parseAttachmentTexts,
  parseWpPosts,
  resolveEditorialIdentities,
  runFixAlt,
  runLink,
  runUpload,
  selectUploads,
  uploadCandidates,
} from './lib/mediaLoader.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VALUE_OPTIONS = new Set(['xml', 'uploads', 'out', 'cms', 'delay-ms', 'limit'])
const FLAG_OPTIONS = new Set(['dry-run', 'only-upload', 'link', 'allow-remote', 'include-orphans', 'fix-alt', 'check-alt'])

class UsageError extends Error {}

/** Interpreta argv. Rechaza opciones desconocidas SIN repetir su valor (podría ser una contraseña). */
function parseArgs(argv) {
  const opts = {}
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg)
    const name = m ? m[1] : arg.split('=')[0]
    if (!m || !(VALUE_OPTIONS.has(name) || FLAG_OPTIONS.has(name))) throw new UsageError(`Argumento no reconocido: ${name}`)
    if (FLAG_OPTIONS.has(name) && m[2] !== undefined) throw new UsageError(`La opción ${name} no lleva valor.`)
    if (VALUE_OPTIONS.has(name) && (m[2] === undefined || m[2] === '')) throw new UsageError(`La opción ${name} requiere un valor.`)
    opts[name] = m[2] ?? true
  }
  return opts
}

/** El informe incluye rutas y hashes locales: nunca debe quedar dentro del repositorio (riesgo de commit). */
function assertOutsideRepo(dir) {
  const rel = path.relative(REPO_ROOT, path.resolve(dir))
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
    throw new UsageError('--out está dentro del repositorio; use un directorio fuera de él (los artefactos no se versionan).')
  }
}

/** Lista AAAA/MM/archivo de la carpeta de uploads (ignora lo que no tenga esa forma; devuelve cuántos ignoró). */
function scanUploads(dir) {
  const rels = []
  let ignored = 0
  for (const y of readdirSync(dir, { withFileTypes: true })) {
    if (y.isDirectory() && /^\d{4}$/.test(y.name)) {
      for (const m of readdirSync(path.join(dir, y.name), { withFileTypes: true })) {
        if (m.isDirectory() && /^\d{2}$/.test(m.name)) {
          for (const f of readdirSync(path.join(dir, y.name, m.name), { withFileTypes: true })) {
            if (f.isFile()) rels.push(`${y.name}/${m.name}/${f.name}`)
            else ignored++
          }
        } else ignored++
      }
    } else ignored++
  }
  return { rels: rels.sort(), ignored }
}

/** Escritura atómica (tmp + rename): un corte a mitad no deja un JSON truncado que impida reanudar. */
function writeJson(file, data) {
  const tmp = `${file}.tmp`
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`)
  renameSync(tmp, file)
}

/** Identidad opcional (revisor/publicador): correo y contraseña juntos; la contraseña pasa por requireCmsPassword. */
function optionalIdentity(label, emailVar, passwordVar, env) {
  const email = (env[emailVar] ?? '').trim()
  const hasPassword = (env[passwordVar] ?? '').trim() !== ''
  if (!email && !hasPassword) return null
  if (!email || !hasPassword) throw new UsageError(`${label}: defina ${emailVar} y ${passwordVar} juntos.`)
  try {
    return { email, password: requireCmsPassword({ ...env, CMS_PASSWORD: env[passwordVar] }) }
  } catch (error) {
    throw new UsageError(`${label} (${passwordVar}): ${error.message.replace('CMS_PASSWORD', passwordVar)}`)
  }
}

async function main(argv, env) {
  const opts = parseArgs(argv)
  const dryRun = Boolean(opts['dry-run'])
  const upload = Boolean(opts['only-upload'])
  const link = Boolean(opts.link)
  const fixAlt = Boolean(opts['fix-alt'])
  const checkAlt = Boolean(opts['check-alt'])
  if (!dryRun && !upload && !link && !fixAlt && !checkAlt) throw new UsageError('Indique una fase: --dry-run, --only-upload, --link, --check-alt y/o --fix-alt.')
  if (dryRun && (upload || link || fixAlt || checkAlt)) throw new UsageError('--dry-run no se combina con las demás fases.')

  const uploadsDir = path.resolve(opts.uploads ?? process.cwd())
  const xmlPath = path.resolve(opts.xml ?? path.join(uploadsDir, '..', 'm1gr4unc_dbWP.xml'))
  const outDir = path.resolve(opts.out ?? path.join(os.tmpdir(), 'mig-img'))
  assertOutsideRepo(outDir)
  const delayMs = opts['delay-ms'] === undefined ? 1500 : Number(opts['delay-ms'])
  const limit = opts.limit === undefined ? Infinity : Number(opts.limit)
  if (!Number.isInteger(delayMs) || delayMs < 0) throw new UsageError('--delay-ms debe ser un entero >= 0.')
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) throw new UsageError('--limit debe ser un entero >= 1.')

  // Guardias de escritura ANTES de leer nada pesado y de cualquier red.
  let cmsUrl = null
  let email = null
  let password = null
  let reviewer = null
  let publisher = null
  if (!dryRun) {
    try {
      cmsUrl = resolveCmsTarget({ url: opts.cms ?? 'http://localhost:3002', allowRemote: Boolean(opts['allow-remote']) })
      email = requireCmsEmail(env)
      password = requireCmsPassword(env)
      if (link) {
        reviewer = optionalIdentity('Revisor', 'CMS_REVIEWER_EMAIL', 'CMS_REVIEWER_PASSWORD', env)
        publisher = optionalIdentity('Publicador', 'CMS_PUBLISHER_EMAIL', 'CMS_PUBLISHER_PASSWORD', env)
      }
    } catch (error) {
      throw error instanceof UsageError ? error : new UsageError(error.message)
    }
  }

  if (!existsSync(xmlPath)) throw new UsageError('No se encontró el volcado XML (--xml).')
  if (!existsSync(uploadsDir)) throw new UsageError('No se encontró la carpeta de uploads (--uploads).')
  mkdirSync(outDir, { recursive: true })

  // Fase 0 (siempre): inventario, manifiesto e informe. Sin red.
  const xmlText = readFileSync(xmlPath, 'utf8')
  const posts = parseWpPosts(xmlText)
  const { rels, ignored } = scanUploads(uploadsDir)
  const attachmentTexts = parseAttachmentTexts(xmlText)
  const noticias = buildNoticiaEntries(posts, { uploadsDir, fileExists: existsSync, attachmentTexts })
  const readLocal = (rel) => readFileSync(safeLocalPath(uploadsDir, rel))
  const files = rels.map((rel) => describeFile(rel, readLocal(rel)))
  const includeOrphans = Boolean(opts['include-orphans'])
  const candidates = { noticias, files, includeOrphans }
  const aliases = duplicateAliases(uploadCandidates(candidates))
  const report = { generatedAt: new Date().toISOString(), ignoredOutsidePattern: ignored, posts: posts.length, ...buildReport({ noticias, files }) }
  writeJson(path.join(outDir, 'manifest.json'), { version: 1, noticias, files, aliases })
  writeJson(path.join(outDir, 'mig-img-report.json'), report)
  console.log(`[fase 0] archivos: ${report.files.total} (válidos ${report.files.valid}, rechazados ${report.files.rejected}); noticias: ${report.noticias.total} (con imagen ${report.noticias.withFeatured}, sin imagen ${report.noticias.withoutImage}); huérfanas: ${report.orphans.length}`)
  console.log(`[fase 0] informe y manifiesto en ${outDir}`)
  if (dryRun) return 0

  // Progreso reanudable (no contiene credenciales ni tokens).
  const progressFile = path.join(outDir, 'progress.json')
  const progress = existsSync(progressFile) ? JSON.parse(readFileSync(progressFile, 'utf8')) : { version: 1, files: {}, links: {} }
  const saveProgress = (p) => writeJson(progressFile, p)
  // Los archivos referenciados pero rechazados localmente no bloquean el enlace del resto de la noticia.
  for (const f of files) if (f.status === 'rechazado' && !progress.files[f.relPath]) progress.files[f.relPath] = { state: 'rechazado', reason: f.reason }
  saveProgress(progress)

  const client = createCmsClient({ baseUrl: cmsUrl, delayMs })
  const log = (line) => console.log(line)
  const token = await loginCms(client, email, password)
  let fatal = 0
  let retryable = 0

  if (upload) {
    const altByRel = {}
    for (const n of noticias) for (const item of [n.featured, ...n.gallery]) if (item && !altByRel[item.relPath]) altByRel[item.relPath] = item.alt
    const selected = selectUploads(candidates)
    const s = await runUpload({ client, token, files: selected, readFile: readLocal, altByRel, progress, saveProgress, log, limit })
    console.log(`[fase 1] subidos ${s.subido}, existentes ${s.existente}, rechazados ${s.rechazado}, reanudados ${s.reanudado}, errores reintentables ${s.errorRetryable}, no reintentables ${s.errorFatal}`)
    fatal += s.errorFatal
    retryable += s.errorRetryable
  }

  if (link) {
    const tokens = { author: token }
    if (reviewer) tokens.reviewer = await loginCms(client, reviewer.email, reviewer.password)
    if (publisher) tokens.publisher = await loginCms(client, publisher.email, publisher.password)
    const ids = await resolveEditorialIdentities({ client, tokens })
    if (!ids.ok) {
      for (const problem of ids.problems) console.error(`[fase 2] ${problem}`)
      return 1
    }
    console.log(`[fase 2] modo ${ids.mode === 'full' ? 'completo (autor, revisor y publicador)' : 'solo borradores'}`)
    const s = await runLink({ client, tokens, mode: ids.mode, noticias, aliases, progress, saveProgress, log, limit })
    console.log(`[fase 2] enlazadas ${s.enlazada}, sin cambios ${s.sin_cambios}, pendientes ${s.pendiente}, bloqueadas ${s.bloqueada}, sin imagen ${s.sin_imagen}, reanudadas ${s.reanudado}, conflictos ${s.conflicto}, errores reintentables ${s.errorRetryable}, no reintentables ${s.errorFatal}`)
    fatal += s.errorFatal
    retryable += s.errorRetryable
  }
  if (fixAlt || checkAlt) {
    const altByRel = {}
    for (const n of noticias) for (const item of [n.featured, ...n.gallery]) if (item && !altByRel[item.relPath]) altByRel[item.relPath] = item.alt
    const s = await runFixAlt({ client, token, altByRel, write: fixAlt, log })
    console.log(`[alt] revisadas ${s.scanned}, con alt pobre/ilegible ${s.poor}, sin sustituto ${s.sinSustituto}, corregidas ${s.fixed}, errores reintentables ${s.errorRetryable}, no reintentables ${s.errorFatal}`)
    fatal += s.errorFatal
    retryable += s.errorRetryable
  }
  return fatal > 0 ? 1 : retryable > 0 ? 3 : 0
}

main(process.argv.slice(2), process.env).then(
  (code) => process.exit(code),
  (error) => {
    console.error(error.message)
    process.exit(error instanceof UsageError ? 2 : 1)
  },
)
