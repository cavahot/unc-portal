// GLO-GN-01: integridad y ortografía de los catálogos messages/gn/*.json frente a messages/es.
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §6 y escenario 13.
// Amenazas: (1) claves faltantes o sobrantes (next-intl muestra la clave cruda o falla); (2) marcadores ICU o
// etiquetas perdidos o renombrados (texto roto o error de formato en /gn); (3) cadenas vacías; (4) URL y
// cifras alteradas en la traducción; (5) puso escrito con caracteres distintos o `'` que ICU interpreta como
// comillas; (6) vocales nasales degradadas del CSV de la SPL; (7) contradicción de un término A del glosario.
// Límite: no prueba que el guaraní sea correcto; eso exige revisión nativa (docs/specs/i18n/GUARANI-REVISION.md).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse, TYPE } from '@formatjs/icu-messageformat-parser'

import { buildIndex, checkConsistency, coverage, findTerms, normalizeGn } from '../../scripts/lib/glosarioGn.mjs'
import { GLOSARIO_GN_SEED } from '../../scripts/lib/glosarioGnSeedData.mjs'

const ROOT = resolve(process.cwd(), 'messages')
type Json = { [k: string]: string | Json }
const load = (loc: string, f: string) => JSON.parse(readFileSync(resolve(ROOT, loc, f), 'utf8')) as Json
const flat = (o: Json, p = ''): Array<[string, string]> =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`)))
const files = readdirSync(resolve(ROOT, 'es')).filter((f) => f.endsWith('.json')).sort()

/** Nombres de argumentos ICU y etiquetas (recorre plural/select), como multiconjunto ordenado. */
function icuShape(msg: string): string[] {
  const out: string[] = []
  const walk = (els: ReturnType<typeof parse>) => {
    for (const el of els) {
      if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) out.push(`arg:${el.value}`)
      if (el.type === TYPE.plural || el.type === TYPE.select) {
        out.push(`${el.type === TYPE.plural ? 'plural' : 'select'}:${el.value}`)
        for (const opt of Object.values(el.options)) walk(opt.value)
      }
      if (el.type === TYPE.tag) {
        out.push(`tag:${el.value}`)
        walk(el.children)
      }
    }
  }
  walk(parse(msg))
  return out.sort()
}
const urls = (s: string) => (s.match(/https?:\/\/[^\s"'<>)]+/g) ?? []).sort()

/**
 * Excepciones justificadas a la consistencia de términos A (clave → motivo). Un término A del glosario
 * puede tener otra acepción en el portal; aquí se documenta en vez de silenciar la prueba.
 */
const A_TERM_EXCEPTIONS: Record<string, string> = {
  'pages.legalizaciones.json:services.description':
    'nivel (A = yvatejoja) es nivel físico según la nota del glosario; «a nivel nacional e internacional» va como perífrasis «tetã ha tetã ambuépe».',
  'pages.extension.json:cta.description':
    'proponer (A = jerure): el propio glosario anota «más bien pedir/solicitar; revisar»; queda para el revisor nativo.',
}

describe('catálogos gn: estructura', () => {
  it('mismos archivos que es', () => {
    expect(readdirSync(resolve(ROOT, 'gn')).filter((f) => f.endsWith('.json')).sort()).toEqual(files)
  })

  it.each(files)('%s: mismas claves, ninguna vacía, mismos marcadores ICU, etiquetas y URL', (f) => {
    const es = Object.fromEntries(flat(load('es', f)))
    const gn = Object.fromEntries(flat(load('gn', f)))
    expect(Object.keys(gn).sort()).toEqual(Object.keys(es).sort())
    for (const [k, v] of Object.entries(gn)) {
      expect(v.trim().length, `${f}:${k} vacío`).toBeGreaterThan(0)
      expect(icuShape(v), `${f}:${k} ICU`).toEqual(icuShape(es[k]))
      expect(urls(v), `${f}:${k} URL`).toEqual(urls(es[k]))
    }
  })
})

describe('catálogos gn: ortografía', () => {
  const all = files.flatMap((f) => flat(load('gn', f)).map(([k, v]) => ({ f, k, v })))

  it('puso único U+0027: sin ’ ‘ ´ ꞌ ʼ', () => {
    const bad = all.filter(({ v }) => /[’‘´ꞌʼ]/.test(v)).map(({ f, k }) => `${f}:${k}`)
    expect(bad).toEqual([])
  })
  it('sin nasales degradadas (ä ë ï ö ÿ) ni ĝ; texto en NFC', () => {
    const bad = all.filter(({ v }) => /[äëïöÿÄËÏÖŸĝĜ]/.test(v) || v !== v.normalize('NFC')).map(({ f, k }) => `${f}:${k}`)
    expect(bad).toEqual([])
  })
  it('ningún puso inmediatamente antes de { } # (ICU lo tomaría como comillas)', () => {
    const bad = all.filter(({ v }) => /'[{}#']/.test(v)).map(({ f, k }) => `${f}:${k}`)
    expect(bad).toEqual([])
  })
  it('normalizeGn no cambia ninguna cadena (ortografía ya normalizada)', () => {
    const bad = all.filter(({ v }) => normalizeGn(v) !== v).map(({ f, k }) => `${f}:${k}`)
    expect(bad).toEqual([])
  })
})

describe('biblioteca glosarioGn', () => {
  const index = buildIndex(GLOSARIO_GN_SEED as never)

  it('coincidencia más larga, palabras completas, sin tildes ni mayúsculas', () => {
    const hits = findTerms('La UNIVERSIDAD y su Investigación; tecnología de la información; universitario', index)
    expect(hits.map((h: { termKey: string }) => h.termKey)).toEqual(['universidad', 'investigacion', 'tecnologia de la informacion'])
  })
  it('ignora marcadores ICU y etiquetas; acepta plural simple', () => {
    expect(findTerms('{universidad} <docente>x</docente> docentes', index).map((h: { texto: string }) => h.texto)).toEqual(['docentes'])
  })
  it('informa lagunas (X) y formas requeridas (A/B)', () => {
    const c = coverage('Educación superior y estudiante', index)
    expect(c.lagunas.map((h: { termKey: string }) => h.termKey)).toEqual(['educacion superior'])
    expect(c.requeridos[0].formas).toContain("temimbo'e")
  })
  it('consistencia: acepta sufijos y préstamo; señala la forma ausente', () => {
    expect(checkConsistency('Estudiantes', "Temimbo'ekuéra", index)).toEqual([])
    expect(checkConsistency('Profesor', 'Mbo\'ehára', index)).toEqual([])
    expect(checkConsistency('Profesor', 'Temimbo\'e', index).map((m: { termKey: string }) => m.termKey)).toEqual(['profesor'])
  })

  it('ningún término A del glosario contradicho en cadenas traducidas (salvo excepción justificada)', () => {
    const offenders: string[] = []
    for (const f of files) {
      const es = Object.fromEntries(flat(load('es', f)))
      for (const [k, v] of flat(load('gn', f))) {
        if (v === es[k]) continue
        const misses = checkConsistency(es[k], v, index).filter((m: { confianza: string }) => m.confianza === 'A')
        if (misses.length && !A_TERM_EXCEPTIONS[`${f}:${k}`]) offenders.push(`${f}:${k} → ${misses.map((m: { termKey: string }) => m.termKey).join(', ')}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
