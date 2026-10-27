// CONTENT-LAW-01: la ley de creación de la UNC es la Ley N° 3.201/2007 (decisión confirmada por el
// Product Owner, 2026-10-24; BACN ficha 10576). Los números 3.399 y 3.751/09 fueron errores de contenido.
// Amenaza que evita: que un texto institucional vuelva a publicar una ley de creación equivocada.
// Límite: revisa los catálogos de mensajes y el código del portal; no valida contenido que vive en el CMS.
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const WRONG = /3[.,]399|3[.,]751/

function listFiles(dir: string, exts: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (name === 'node_modules' || name === '.next') return []
    return statSync(full).isDirectory() ? listFiles(full, exts) : exts.includes(path.extname(full)) ? [full] : []
  })
}

describe('Ley de creación de la UNC', () => {
  it('ningún catálogo de mensajes cita una ley de creación equivocada (3.399 / 3.751)', () => {
    const offenders = listFiles(path.join(ROOT, 'messages'), ['.json'])
      .filter((file) => WRONG.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file))
    expect(offenders).toEqual([])
  })

  it('el código del portal no hardcodea una ley de creación equivocada', () => {
    const dirs = ['app', 'components', 'lib'].map((d) => path.join(ROOT, d))
    const offenders = dirs
      .flatMap((dir) => listFiles(dir, ['.ts', '.tsx']))
      .filter((file) => WRONG.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file))
    expect(offenders).toEqual([])
  })

  it('la descripción institucional cita la Ley N° 3.201/2007 en los cuatro idiomas', () => {
    for (const locale of ['es', 'en', 'pt-BR', 'gn']) {
      const raw = readFileSync(path.join(ROOT, 'messages', locale, 'pages.institucional.json'), 'utf8')
      expect(raw, locale).toMatch(/3[.,]201\/2007/)
    }
  })
})
