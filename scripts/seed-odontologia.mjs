#!/usr/bin/env node
/**
 * seed-odontologia.mjs — FAC-01 (envoltorio de FAC-02)
 *
 * Mantiene la CLI y los exports de FAC-01 sobre el sembrador genérico `seed-facultad.mjs`, que ahora contiene la
 * lógica (CMS local por defecto, https con --allow-remote, solo completa campos vacíos, idempotente por clave natural).
 * Diferencia deliberada con el genérico: aquí se siembra salvo que se pase --dry-run (comportamiento histórico).
 *
 * Uso:
 *   node scripts/seed-odontologia.mjs --dry-run
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-odontologia.mjs
 *   CMS_URL=https://... node scripts/seed-odontologia.mjs --allow-remote
 */
import { pathToFileURL } from 'node:url'
import * as odontologia from './lib/odontologiaSeedData.mjs'
import { carreraPayload, emptyFieldsPatch, fieldValues, isLocalCmsUrl, run as runFacultad } from './seed-facultad.mjs'

export { carreraPayload, emptyFieldsPatch, isLocalCmsUrl }

/** Valores de la facultad sin la procedencia (lo que viaja al CMS). */
export const facultadValues = () => fieldValues(odontologia.FACULTAD_FIELDS)

/** Ejecuta la siembra de Odontología; `deps` permite inyectar env, fetch, log y pace (pruebas). */
export const run = ({ dryRun = false, allowRemote = false, deps = {} } = {}) =>
  runFacultad({ data: odontologia, dryRun, allowRemote, deps })

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ dryRun: process.argv.includes('--dry-run'), allowRemote: process.argv.includes('--allow-remote') }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
