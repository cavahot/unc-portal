// SEED-PROD-IMG: recuperación de imágenes 2016-2023 de noticias desde el Internet Archive (Wayback Machine).
// Amenazas: (1) escribir fuera de la carpeta de uploads con una ruta manipulada; (2) guardar como imagen una página
// HTML de error del archivo; (3) descargar de hosts no previstos; (4) pisar archivos ya recuperados.
// Límite: no comprueba que la imagen archivada sea la misma versión que publicó WordPress (es la captura más antigua).
import { describe, expect, it, vi } from 'vitest'
import { parseCdx, planRecovery, runRecovery, waybackRawUrl } from '../../scripts/lib/waybackRecovery.mjs'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52])
const CDX = [
  'http://www.unc.edu.py/wp-content/uploads/2019/05/foto%20uno.png 20190601000000',
  'http://unc.edu.py/wp-content/uploads/2019/05/foto%20uno.png 20180101000000',
  'http://www.unc.edu.py/wp-content/uploads/2022/06/otra.jpg 20220701000000',
  'http://www.unc.edu.py/wp-content/uploads/2022/06/../../evil.png 20220701000000',
  'linea rota',
].join('\n')

describe('parseCdx', () => {
  it('indexa por ruta AAAA/MM/archivo decodificada y se queda con la captura más antigua', () => {
    const map = parseCdx(CDX)
    expect(map.get('2019/05/foto uno.png')).toEqual({ original: 'http://unc.edu.py/wp-content/uploads/2019/05/foto%20uno.png', timestamp: '20180101000000' })
    expect(map.has('2022/06/otra.jpg')).toBe(true)
  })
  it('descarta rutas que no son AAAA/MM/archivo (sin ../)', () => {
    expect([...parseCdx(CDX).keys()].some((k) => k.includes('..'))).toBe(false)
  })
})

describe('planRecovery', () => {
  const cdx = parseCdx(CDX)
  it('solo planifica faltantes con captura, que no existan ya en disco', () => {
    const plan = planRecovery({ missing: ['2019/05/foto uno.png', '2022/06/otra.jpg', '2020/01/sin-captura.jpg'], cdx, exists: (rel) => rel === '2022/06/otra.jpg' })
    expect(plan.map((p) => p.rel)).toEqual(['2019/05/foto uno.png'])
    expect(plan[0].url).toBe(waybackRawUrl(cdx.get('2019/05/foto uno.png')))
  })
  it('ignora rutas inseguras aunque vengan en la lista de faltantes', () => {
    expect(planRecovery({ missing: ['../x.png', '2019/05/../../x.png'], cdx, exists: () => false })).toEqual([])
  })
})

describe('waybackRawUrl', () => {
  it('pide la versión cruda (id_) en web.archive.org', () => {
    expect(waybackRawUrl({ original: 'http://www.unc.edu.py/wp-content/uploads/a.png', timestamp: '20190101000000' })).toBe(
      'https://web.archive.org/web/20190101000000id_/http://www.unc.edu.py/wp-content/uploads/a.png',
    )
  })
})

describe('runRecovery', () => {
  const plan = [
    { rel: '2019/05/ok.png', url: 'https://web.archive.org/web/1id_/http://www.unc.edu.py/wp-content/uploads/2019/05/ok.png' },
    { rel: '2019/05/html.png', url: 'https://web.archive.org/web/1id_/http://www.unc.edu.py/wp-content/uploads/2019/05/html.png' },
    { rel: '2019/05/404.png', url: 'https://web.archive.org/web/1id_/http://www.unc.edu.py/wp-content/uploads/2019/05/404.png' },
  ]
  const fakeFetch = vi.fn(async (url: string) => {
    if (url.endsWith('ok.png')) return { ok: true, status: 200, arrayBuffer: async () => PNG }
    if (url.endsWith('html.png')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('<!doctype html><title>Wayback</title>') }
    return { ok: false, status: 404, arrayBuffer: async () => Buffer.alloc(0) }
  })

  it('guarda solo bytes de imagen válidos y cuenta cada resultado', async () => {
    const written: Record<string, Buffer> = {}
    const counts = await runRecovery({
      plan,
      fetchImpl: fakeFetch,
      write: (rel: string, data: Buffer) => { written[rel] = data },
      sleep: async () => {},
      log: () => {},
    })
    expect(Object.keys(written)).toEqual(['2019/05/ok.png'])
    expect(counts).toMatchObject({ recuperadas: 1, rechazadas: 1, noDisponibles: 1, errores: 0 })
  })

  it('rechaza un plan con un host distinto de web.archive.org sin pedir nada', async () => {
    const f = vi.fn()
    await expect(runRecovery({ plan: [{ rel: '2019/05/a.png', url: 'https://example.invalid/a.png' }], fetchImpl: f, write: () => {}, sleep: async () => {}, log: () => {} })).rejects.toThrow(/web.archive.org/)
    expect(f).not.toHaveBeenCalled()
  })
})
