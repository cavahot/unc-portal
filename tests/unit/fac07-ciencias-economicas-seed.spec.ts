// FAC-07: contrato editorial mínimo de Ciencias Económicas.
// Qué hace: fija fuente oficial, cantidad de carreras y separación de aranceles para evitar regresiones.
// Amenaza: detecta si el seed vuelve a publicar una facultad incompleta o mezcla datos en la ruta.
// Límite: no valida la vigencia administrativa de los montos; esa decisión requiere revisión editorial.
import { describe, expect, it } from 'vitest'
import data from '../../scripts/lib/cienciasEconomicasSeedData.mjs'

describe('FAC-07 — datos de Ciencias Económicas', () => {
  it('mantiene procedencia oficial y catálogo completo', () => {
    expect(data.SOURCES.UNC).toBe('https://www.unc.edu.py/facultad-de-ciencias-economicas-y-administrativas/')
    expect(data.FACULTAD_SLUG).toBe('facultad-de-ciencias-economicas-y-administrativas')
    expect(data.CARRERAS.filter((row: { tipo: string }) => row.tipo === 'grado')).toHaveLength(4)
    expect(data.CARRERAS.filter((row: { tipo: string }) => row.tipo === 'posgrado')).toHaveLength(8)
    expect(data.CARRERAS.find((row: { slug: string }) => row.slug === 'ingenieria-comercial')?.resoluciones).toHaveLength(2)
    expect(data.CARRERAS.find((row: { slug: string }) => row.slug === 'licenciatura-en-administracion')?.resoluciones).toHaveLength(2)
    expect(data.CARRERAS.find((row: { slug: string }) => row.slug === 'contaduria-publica')?.resoluciones).toHaveLength(2)
  })

  it('usa claves naturales únicas para carreras y aranceles', () => {
    expect(new Set(data.CARRERAS.map((row: { slug: string }) => row.slug)).size).toBe(data.CARRERAS.length)
    expect(new Set(data.ARANCELES.map((row: { grupo: string; concepto: string }) => `${row.grupo}:${row.concepto}`)).size).toBe(data.ARANCELES.length)
  })
})
