// Respaldo: la copia diaria se hace en el VPS (cron), no desde un runner de GitHub (tarea: paquete de despliegue / SEC-027).
// Qué hace: comprueba que `backup.yml` ya NO se programe solo (solo disparo manual) y que el instalador y la lista de
//   verificación indiquen el respaldo del VPS con copia externa, frase de paso fuera del servidor y restauración probada.
// Amenazas: (1) abrir Postgres a internet o guardar `DATABASE_URL` en GitHub para que un runner alcance la base; (2) un
//   artefacto cifrado de TODA la base en un repositorio PÚBLICO, expuesto a fuerza bruta de la frase fuera de línea; (3) un
//   flujo que falla cada día en silencio y acostumbra a ignorar las alertas; (4) un sitio publicado sin respaldo probado.
// Límite: análisis estático; no ejecuta el cron ni el respaldo (eso se prueba en el VPS con una restauración real).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const WF_TEXT = read('.github/workflows/backup.yml')
const WF = yaml.load(WF_TEXT)
// js-yaml interpreta la clave `on` como booleano `true` (YAML 1.1); se aceptan ambas.
const triggers = WF.on ?? WF[true]

test('(1) el flujo de GitHub ya no se programa solo: queda únicamente el disparo manual', () => {
  assert.ok(triggers && typeof triggers === 'object')
  assert.equal(triggers.schedule, undefined, 'no debe tener `schedule`')
  assert.ok('workflow_dispatch' in triggers)
})

test('(2) el comentario explica por qué y dónde se hace el respaldo real', () => {
  const header = WF_TEXT.split('\n').filter((l) => l.startsWith('#')).join('\n')
  assert.match(header, /VPS/)
  assert.match(header, /backup-prod\.sh/)
  assert.match(header, /no se programa|disparo manual|solo manual/i)
  assert.match(header, /PÚBLICO|público/)
})

test('(3) se conserva el cifrado y la alerta por si alguien lo dispara a mano', () => {
  assert.ok(WF_TEXT.includes('encrypt-dump.sh --check'))
  assert.ok(WF_TEXT.includes('Open or update failure issue'))
})

test('(4) el instalador indica el respaldo del VPS: cron, copia externa, frase aparte y restauración', () => {
  const inst = read('scripts/deploy/instalar.sh')
  assert.match(inst, /crontab\.example/)
  assert.match(inst, /configure-offsite\.sh/)
  assert.match(inst, /frase de paso/i)
  assert.match(inst, /restauraci[oó]n/i)
})

test('(5) la lista de verificación exige copia externa, frase fuera del servidor y restauración probada', () => {
  const lista = read('docs/deploy/CHECKLIST-PUBLICACION.md')
  assert.match(lista, /copia externa/i)
  assert.match(lista, /frase de paso/i)
  assert.match(lista, /restauraci[oó]n probada/i)
  assert.match(lista, /DATABASE_URL/)
})

test('(6) la guía explica por qué no se respalda desde GitHub', () => {
  const guia = read('docs/deploy/INSTALACION.md')
  assert.match(guia, /Respaldos/)
  assert.match(guia, /no se expone la base|Postgres.*cerrad/i)
})
