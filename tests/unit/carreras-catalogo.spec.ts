// INST-04: modelo del catálogo de carreras (`mapCarreraCatalogo`, `agruparPorFacultad`).
// Amenazas: (1) un enlace de resolución con host ajeno, `http:` o `javascript:` llegando a un href; (2) una carrera
// perdida en silencio porque su tipo es desconocido; (3) un dato inventado cuando el CMS no lo trae (duración, título);
// (4) una carrera inactiva o sin slug que aparece en el catálogo; (5) grupos desordenados o sin la facultad correcta.
// Límite: funciones puras; no prueban el CMS ni el render.
import { describe, expect, it } from 'vitest'
import { agruparPorFacultad, mapCarreraCatalogo } from '../../lib/cms/carrerasCatalogo'

const FAC_A = { slug: 'facultad-a', nombre: 'Facultad de Álgebra' }
const FAC_B = { slug: 'facultad-b', nombre: 'Facultad de Zoología' }
const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'una-carrera',
  nombre: 'Una carrera',
  tipo: 'grado',
  sede: 'Concepción',
  facultad: FAC_A,
  activa: true,
  resoluciones: [{ numero: '165/15', enlace: 'https://drive.google.com/file/d/abc/view', detalle: 'Actualización' }],
  ...over,
})

describe('INST-04 mapCarreraCatalogo', () => {
  it('mapea una fila completa y conserva solo los datos que existen', () => {
    const c = mapCarreraCatalogo(row())!
    expect(c).toMatchObject({ id: 1, slug: 'una-carrera', nombre: 'Una carrera', tipo: 'grado', sede: 'Concepción', facultad: FAC_A })
    expect(c.duracion).toBeUndefined()
    expect(c.titulo).toBeUndefined()
    expect(c.modalidad).toBeUndefined()
    expect(c.resoluciones).toEqual([{ numero: '165/15', href: 'https://drive.google.com/file/d/abc/view', detalle: 'Actualización' }])
  })

  it('descarta filas inactivas, sin id, sin slug o sin nombre', () => {
    expect(mapCarreraCatalogo(row({ activa: false }))).toBeNull()
    expect(mapCarreraCatalogo(row({ id: undefined }))).toBeNull()
    expect(mapCarreraCatalogo(row({ slug: ' ' }))).toBeNull()
    expect(mapCarreraCatalogo(row({ nombre: '' }))).toBeNull()
    expect(mapCarreraCatalogo(null)).toBeNull()
    expect(mapCarreraCatalogo('x')).toBeNull()
  })

  it('un tipo desconocido no oculta la carrera (queda sin tipo) y una duración fuera de rango se ignora', () => {
    expect(mapCarreraCatalogo(row({ tipo: 'maestria' }))?.tipo).toBeUndefined()
    expect(mapCarreraCatalogo(row({ duracion: 40 }))?.duracion).toBeUndefined()
    expect(mapCarreraCatalogo(row({ duracion: 5 }))?.duracion).toBe(5)
  })

  it('un enlace de resolución con host ajeno, http o javascript: pierde el enlace pero conserva el número', () => {
    for (const enlace of ['https://drive.google.com.evil.example/x', 'http://drive.google.com/x', 'javascript:alert(1)', '//evil.example/x']) {
      const c = mapCarreraCatalogo(row({ resoluciones: [{ numero: '165/15', enlace }] }))!
      expect(c.resoluciones, enlace).toEqual([{ numero: '165/15' }])
    }
  })

  it('una resolución con un número que no tiene la forma N/AA se descarta', () => {
    const c = mapCarreraCatalogo(row({ resoluciones: [{ numero: '<script>', enlace: 'https://drive.google.com/x' }] }))!
    expect(c.resoluciones).toEqual([])
  })

  it('la facultad sin slug o sin nombre queda en null (no se inventa)', () => {
    expect(mapCarreraCatalogo(row({ facultad: { slug: 'x' } }))?.facultad).toBeNull()
    expect(mapCarreraCatalogo(row({ facultad: 7 }))?.facultad).toBeNull()
  })
})

describe('INST-04 agruparPorFacultad', () => {
  const rows = [
    row({ id: 1, slug: 'z-grado', nombre: 'Zeta', facultad: FAC_B, orden: 2 }),
    row({ id: 2, slug: 'a-grado', nombre: 'Alfa', facultad: FAC_B, orden: 1 }),
    row({ id: 3, slug: 'pos', nombre: 'Posgrado uno', tipo: 'posgrado', facultad: FAC_B }),
    row({ id: 4, slug: 'otra', nombre: 'Otra', facultad: FAC_A }),
    row({ id: 5, slug: 'sin-fac', nombre: 'Sin facultad', facultad: null }),
    row({ id: 6, slug: 'sin-tipo', nombre: 'Sin tipo', tipo: undefined, facultad: FAC_A }),
    row({ id: 7, slug: 'inactiva', activa: false }),
  ]

  it('agrupa por facultad en orden alfabético y deja las carreras sin facultad al final', () => {
    const g = agruparPorFacultad(rows)
    expect(g.map((x) => x.key)).toEqual(['facultad-a', 'facultad-b', 'sin-facultad'])
    expect(g.map((x) => x.total)).toEqual([2, 3, 1])
    expect(g[2].facultad).toBeNull()
  })

  it('separa grado, posgrado y sin tipo, ordena por «orden» y nombre y omite listas vacías', () => {
    const [a, b] = agruparPorFacultad(rows)
    expect(b.listas.map((l) => l.tipo)).toEqual(['grado', 'posgrado'])
    expect(b.listas[0].items.map((c) => c.nombre)).toEqual(['Alfa', 'Zeta'])
    expect(a.listas.map((l) => l.tipo)).toEqual(['grado', 'otros'])
  })

  it('no pierde ninguna carrera válida y descarta la inactiva', () => {
    const total = agruparPorFacultad(rows).reduce((n, g) => n + g.total, 0)
    expect(total).toBe(6)
  })

  it('una entrada que no es lista da un resultado vacío', () => {
    expect(agruparPorFacultad(undefined)).toEqual([])
    expect(agruparPorFacultad({})).toEqual([])
  })
})
