// GLO-GN-02: carga del documento «UNC-Glosario-Guarani-completado» al glosario del CMS (colección privada).
// Qué prueba: lectura de las tablas del documento, plan de carga (crear / completar / omitir) y las reglas que
// impiden publicar sin revisión (RDD: el documento declara que son propuestas y exige revisión lingüística).
// Amenazas: (1) una propuesta nacida «aprobada» u «oficial» que el portal publicaría sin revisión humana;
// (2) pisar una traducción ya existente o revisada; (3) duplicar filas al re-ejecutar; (4) variantes del puso
// o diéresis que rompen la búsqueda. Límite: sin red ni Payload; el CMS se prueba aparte.
import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos
import { parseCompletado, planCompletado, FUENTE_UI } from '../../scripts/lib/glosarioCompletado.mjs'

const MD = `
# 1. Términos del glosario sin traducción (3)

| **#** | **Término en español** | **Tipo** | **Nota o contexto original** | **Guaraní** | **Fuente · APA 7 y criterio** |
| ----- | ---- | ---- | ---- | ---- | ---- |
| 1     | comparación | neologismo | Nota previa. | Ñembojoja | SENATICS (s. f.)<br><br>Referencias S: APA 7.<br><br>Criterio: Propuesta contextual. Sustantivación de mbojoja. |
| 2     | escala | neologismo |  | Ñeha’ãha | SENATICS (s. f.)<br><br>Referencias S: x<br><br>Criterio: Propuesta contextual. Para instrumento. |
| 3     | vacio | neologismo |  |  | SENATICS (s. f.) |

# 2. Etiquetas cortas de la interfaz sin traducción (3)

| **#** | **Texto en español** | **Dónde aparece** | **Guaraní** | **Nota original** | **Fuente · APA 7 y criterio** |
| ----- | ---- | ---- | ---- | ---- | ---- |
| 1     | Academia | common:academia, nav:items.academia | Ñemoarandu |  | SENATICS (s. f.); Mozilla (s. f.)<br><br>Referencias S, M: x<br><br>Criterio: Propuesta contextual. Traducción propuesta. |
| 2     | Academia | otro:lugar | Ñemoarandu |  | SENATICS (s. f.)<br><br>Criterio: Propuesta contextual. Repetida. |
| 3     | Sin dato | x:y |  |  | SENATICS (s. f.) |

# 3. Frases largas (1)

| **#** | **Texto en español** | **Dónde aparece** | **Guaraní** | **Fuente** |
| ----- | ---- | ---- | ---- | ---- |
| 1     | {count} conceptos | a:b | {count} mba'e rehegua | SENATICS (s. f.) |
`

const parsed = parseCompletado(MD)

describe('GLO-GN-02 lectura del documento', () => {
  it('lee las filas de cada sección por el nombre de la columna, no por la posición', () => {
    expect(parsed.sec1.map((r: { terminoEs: string }) => r.terminoEs)).toEqual(['comparación', 'escala', 'vacio'])
    expect(parsed.sec2).toHaveLength(3)
    expect(parsed.sec3).toHaveLength(1)
    expect(parsed.sec1[0]).toMatchObject({ terminoGn: 'Ñembojoja', tipo: 'neologismo', notaOriginal: 'Nota previa.' })
  })

  it('separa el apoyo léxico del criterio de la columna de fuente', () => {
    expect(parsed.sec1[0].apoyo).toBe('SENATICS (s. f.)')
    expect(parsed.sec1[0].criterio).toBe('Propuesta contextual. Sustantivación de mbojoja.')
    expect(parsed.sec2[0].apoyo).toBe('SENATICS (s. f.); Mozilla (s. f.)')
  })

  it('la celda vacía de Guaraní queda vacía (no se inventa una traducción)', () => {
    expect(parsed.sec1[2].terminoGn).toBe('')
  })
})

describe('GLO-GN-02 plan de carga', () => {
  const existing = [
    { id: 11, terminoEs: 'comparación', terminoGn: '', fuente: 'Glosario del PO', confianza: 'X', revisado: false, estadoRevision: 'pendiente', nota: 'Nota previa.' },
    { id: 12, terminoEs: 'escala', terminoGn: 'ya-traducido', fuente: 'Glosario del PO', confianza: 'B', revisado: false, estadoRevision: 'pendiente' },
  ]
  const plan = planCompletado({ parsed, existing })
  const byEs = (es: string) => plan.actions.filter((a: { data: { terminoEs: string } }) => a.data.terminoEs === es)

  it('completa la fila existente sin traducción y la deja pendiente, nunca aprobada ni oficial', () => {
    const [a] = byEs('comparación')
    expect(a.op).toBe('update')
    expect(a.id).toBe(11)
    expect(a.data.terminoGn).toBe('Ñembojoja')
    expect(a.data.confianza).toBe('C') // X (sin evidencia) → C: hay una propuesta, pero no corpus ni fuente oficial
    expect(a.data).not.toHaveProperty('estadoRevision')
    expect(a.data).not.toHaveProperty('oficial')
    expect(a.data).not.toHaveProperty('revisado')
    expect(a.data.nota).toContain('Nota previa.') // conserva la nota anterior
    expect(a.data.nota).toContain('pendiente de revisión')
  })

  it('NO pisa una traducción existente: la omite y la informa', () => {
    expect(byEs('escala').every((a: { op: string }) => a.op === 'skip')).toBe(true)
    expect(plan.skipped.some((s: { reason: string; terminoEs: string }) => s.terminoEs === 'escala' && /ya tiene traducción/.test(s.reason))).toBe(true)
  })

  it('omite lo que no tiene traducción en el documento', () => {
    expect(byEs('vacio')).toHaveLength(0)
    expect(plan.skipped.some((s: { reason: string }) => /sin traducción/.test(s.reason))).toBe(true)
  })

  it('crea las etiquetas de la interfaz como localización, pendientes, no oficiales y con confianza C', () => {
    const [a] = byEs('Academia')
    expect(a.op).toBe('create')
    expect(a.data).toMatchObject({
      terminoGn: 'Ñemoarandu',
      tipo: 'localizacion',
      confianza: 'C',
      fuente: FUENTE_UI,
      estadoRevision: 'pendiente',
      oficial: false,
      revisado: false,
      origen: 'panel',
    })
    expect(a.data.fuenteUrl).toBeUndefined()
    expect(a.data.nota).toContain('common:academia')
  })

  it('un texto repetido en el documento se crea una sola vez (clave terminoEs + fuente)', () => {
    expect(byEs('Academia').filter((a: { op: string }) => a.op === 'create')).toHaveLength(1)
  })

  it('es idempotente: lo ya cargado con la misma clave se omite', () => {
    const again = planCompletado({ parsed, existing: [...existing, { id: 99, terminoEs: 'Academia', terminoGn: 'Ñemoarandu', fuente: FUENTE_UI, revisado: false, estadoRevision: 'pendiente' }] })
    expect(again.actions.filter((a: { data: { terminoEs: string } }) => a.data.terminoEs === 'Academia')).toHaveLength(0)
  })

  it('no toca filas revisadas ni aprobadas', () => {
    const locked = planCompletado({
      parsed,
      existing: [{ id: 11, terminoEs: 'comparación', terminoGn: '', fuente: 'x', confianza: 'X', revisado: true, estadoRevision: 'pendiente' }],
    })
    expect(locked.actions.filter((a: { data: { terminoEs: string } }) => a.data.terminoEs === 'comparación' && a.op === 'update')).toHaveLength(0)
  })

  it('normaliza el puso y las vocales nasales con la regla del repositorio', () => {
    const p = parseCompletado(MD)
    const out = planCompletado({ parsed: p, existing })
    const [esc] = out.actions.filter((a: { data: { terminoEs: string } }) => a.data.terminoEs === 'escala')
    expect(esc).toBeUndefined() // escala ya tenía traducción
    const mdPuso = MD.replace('Ñemoarandu |  | SENATICS (s. f.); Mozilla', "Ñeha’ãha |  | SENATICS (s. f.); Mozilla")
    const created = planCompletado({ parsed: parseCompletado(mdPuso), existing }).actions.find((a: { data: { terminoEs: string } }) => a.data.terminoEs === 'Academia')
    expect(created.data.terminoGn).toBe("Ñeha'ãha") // ’ → '
  })

  it('las frases largas (sección 3) NO van al glosario: son para messages/gn', () => {
    expect(plan.actions.some((a: { data: { terminoEs: string } }) => a.data.terminoEs === '{count} conceptos')).toBe(false)
  })
})
