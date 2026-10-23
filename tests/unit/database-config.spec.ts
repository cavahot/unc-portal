import { describe, expect, it } from 'vitest'

import { getDatabaseURL } from '../../apps/cms/src/config/database'

describe('ARCH-DB-01: validación segura de DATABASE_URI', () => {
  it('prioriza una DATABASE_URI válida', () => {
    expect(getDatabaseURL({
      DATABASE_URI: 'postgresql://app:secret@db:5432/unc_portal',
      DATABASE_URL: 'postgresql://fallback@db/other',
    })).toBe('postgresql://app:secret@db:5432/unc_portal')
  })

  // DEP-10 (RDD-DEP-35): un solo nombre por concepto. Sin fallback a DATABASE_URL: el compose y el
  // ejemplo solo definen DATABASE_URI, y un segundo nombre ocultaría una URI mal configurada.
  it('ya no acepta DATABASE_URL como alternativa', () => {
    expect(() => getDatabaseURL({
      DATABASE_URI: '',
      DATABASE_URL: 'postgres://app:secret@db:5432/unc_portal',
    })).toThrow(/DATABASE_URI/)
    expect(() => getDatabaseURL({ DATABASE_URL: 'postgres://app:secret@db:5432/unc_portal' })).toThrow(/DATABASE_URI/)
  })

  it.each([
    'postgresql://app:***@db:5432/unc_portal',
    'postgresql://app:REEMPLAZAR_SECRETO@db:5432/unc_portal',
    'mysql://app:secret@db:3306/unc_portal',
    '',
  ])('rechaza una configuración no utilizable: %s', (value) => {
    expect(() => getDatabaseURL({ DATABASE_URI: value })).toThrow(/DATABASE_URI/)
  })

  it('no incluye la URI completa en el mensaje de error', () => {
    const secretURL = 'postgresql://app:SECRET_NO_LOGUEAR@db:5432/unc_portal'
    expect(() => getDatabaseURL({ DATABASE_URI: 'REEMPLAZAR_SECRET' })).toThrowError(
      new Error('DATABASE_URI no está configurada con una URI PostgreSQL válida.'),
    )
    expect(() => getDatabaseURL({ DATABASE_URI: secretURL.replace('postgresql:', 'mysql:') })).toThrowError(
      new Error('DATABASE_URI no está configurada con una URI PostgreSQL válida.'),
    )
  })
})
