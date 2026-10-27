// GLO-GN-01: parser CSV (RFC 4180) sin dependencias, usado por la siembra del glosario y el actualizador.
// Por qué propio: el repositorio no admite dependencias nuevas y `split(',')` rompe con comillas, comas y
// saltos de línea dentro de un campo (el glosario del PO tiene notas con comas y comillas simples).

/**
 * Convierte texto CSV en una matriz de filas (arreglos de celdas).
 * - Quita el BOM UTF-8 inicial (el CSV del PO lo trae) para que la primera cabecera no quede «﻿termino_es».
 * - Admite campos entre comillas dobles con `""` como comilla escapada, comas y saltos de línea internos.
 * - Acepta fin de línea CRLF o LF; ignora la última línea vacía.
 * Límite: separador fijo (por defecto coma); no detecta codificación (se espera UTF-8).
 */
export function parseCsv(text, { delimiter = ',' } = {}) {
  let s = String(text)
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"' && field === '') {
      quoted = true
      i++
      continue
    }
    if (ch === delimiter) {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (ch === '\r' || ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += ch === '\r' && s[i + 1] === '\n' ? 2 : 1
      continue
    }
    field += ch
    i++
  }
  if (quoted) throw new Error('CSV mal formado: comilla doble sin cerrar.')
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/**
 * Igual que `parseCsv`, pero devuelve objetos con las claves de la primera fila (cabeceras recortadas).
 * Lanza si una fila tiene más celdas que cabeceras (señal de columnas corridas); las filas vacías se omiten.
 */
export function parseCsvRecords(text, options) {
  const [header, ...rest] = parseCsv(text, options)
  if (!header) return []
  const keys = header.map((h) => h.trim())
  const out = []
  rest.forEach((cells, n) => {
    if (cells.length === 1 && cells[0] === '') return
    if (cells.length > keys.length) throw new Error(`CSV: la fila ${n + 2} tiene ${cells.length} celdas y la cabecera ${keys.length}.`)
    const rec = {}
    keys.forEach((k, j) => {
      rec[k] = cells[j] ?? ''
    })
    out.push(rec)
  })
  return out
}
