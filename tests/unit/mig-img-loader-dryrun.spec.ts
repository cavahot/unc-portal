// MIG-IMG fase 3 (P-12): scripts/load-news-images.mjs como PROCESO real, con datos sintéticos en un
// directorio temporal. Amenazas: (1) que --dry-run toque la red o pida credenciales; (2) que los artefactos
// (manifiesto/informe con rutas y hashes locales) queden dentro del repositorio y terminen en un commit;
// (3) que una contraseña llegue a la salida o a los archivos; (4) que las fases con escritura arranquen sin
// CMS_PASSWORD o contra un host remoto sin --allow-remote. Límite: no ejecuta contra ningún CMS.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = path.resolve(__dirname, '..', '..')
const SCRIPT = path.join(ROOT, 'scripts', 'load-news-images.mjs')
const SECRET = 'secreto-que-nunca-debe-salir-99'
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 7)])

let work: string
let uploads: string
let xml: string
let stub: string

const row = (cols: Record<string, string>) =>
  `<table name="uncm1_posts">${Object.entries(cols).map(([k, v]) => `<column name="${k}">${v}</column>`).join('')}</table>`

beforeAll(() => {
  work = mkdtempSync(path.join(tmpdir(), 'mig-img-test-'))
  uploads = path.join(work, 'uploads')
  mkdirSync(path.join(uploads, '2024', '05'), { recursive: true })
  writeFileSync(path.join(uploads, '2024', '05', 'a.png'), PNG)
  writeFileSync(path.join(uploads, '2024', '05', 'huerfana.png'), Buffer.concat([PNG, Buffer.from('x')]))
  writeFileSync(path.join(uploads, '2024', '05', 'mala.jpg'), '<!doctype html><script>1</script>')
  const img = (n: string) => `&lt;img src=&quot;https://www.unc.edu.py/wp-content/uploads/2024/05/${n}&quot; alt=&quot;&quot;&gt;`
  xml = path.join(work, 'dump.xml')
  writeFileSync(
    xml,
    [
      row({ ID: '1', post_type: 'post', post_status: 'publish', post_name: 'con-imagen', post_title: 'Con imagen', post_date: '2024-05-03 10:00:00', post_date_gmt: '2024-05-03 14:00:00', post_content: img('a.png') + img('mala.jpg') }),
      row({ ID: '2', post_type: 'post', post_status: 'publish', post_name: 'sin-imagen', post_title: 'Sin imagen', post_date: '2019-02-03 10:00:00', post_date_gmt: '2019-02-03 14:00:00', post_content: img('no-existe.png') }),
    ].join('\n'),
  )
  stub = path.join(work, 'no-fetch.mjs')
  writeFileSync(stub, "globalThis.fetch = () => { throw new Error('FETCH_LLAMADO') }\n")
})
afterAll(() => rmSync(work, { recursive: true, force: true }))

function run(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(stub).href, SCRIPT, ...args], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '', ...env },
    timeout: 60_000,
  })
}

describe('--dry-run', () => {
  it('no usa la red ni pide credenciales; escribe manifiesto e informe FUERA del repo con conteos', () => {
    const out = path.join(work, 'out')
    const r = run([`--xml=${xml}`, `--uploads=${uploads}`, `--out=${out}`, '--dry-run'], { CMS_PASSWORD: SECRET })
    expect(r.status).toBe(0)
    expect(readdirSync(out).sort()).toEqual(['manifest.json', 'mig-img-report.json'])
    const report = JSON.parse(readFileSync(path.join(out, 'mig-img-report.json'), 'utf8'))
    expect(report.files).toMatchObject({ total: 3, valid: 2, rejected: 1, rejectedByReason: { tipo: 1 } })
    expect(report.noticias).toMatchObject({ total: 2, withFeatured: 1, withoutImage: 1, withoutImageByYear: { 2019: 1 } })
    expect(report.orphans).toEqual(['2024/05/huerfana.png'])
    expect(report.referencedButRejected).toEqual(['2024/05/mala.jpg'])
    const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'))
    expect(manifest.noticias.map((n: { slug: string }) => n.slug)).toEqual(['con-imagen', 'sin-imagen'])
    expect(manifest.files[0]).toHaveProperty('sha256')
  })

  it('la salida y los archivos no contienen la contraseña', () => {
    const out = path.join(work, 'out2')
    const r = run([`--xml=${xml}`, `--uploads=${uploads}`, `--out=${out}`, '--dry-run'], { CMS_PASSWORD: SECRET })
    const all = [r.stdout, r.stderr, ...readdirSync(out).map((f) => readFileSync(path.join(out, f), 'utf8'))].join('\n')
    expect(all).not.toContain(SECRET)
  })

  it('se niega a escribir el informe dentro del repositorio', () => {
    const r = run([`--xml=${xml}`, `--uploads=${uploads}`, `--out=${path.join(ROOT, 'tmp-mig-img')}`, '--dry-run'])
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/repositorio/)
  })
})

describe('fases con escritura: guardias antes de cualquier red', () => {
  const base = () => [`--xml=${xml}`, `--uploads=${uploads}`, `--out=${path.join(work, 'out3')}`]

  it('sin modo -> uso y código distinto de 0', () => {
    expect(run(base()).status).not.toBe(0)
  })
  it('--only-upload sin CMS_PASSWORD falla antes de red', () => {
    const r = run([...base(), '--only-upload'], { CMS_EMAIL: 'a@b.c' })
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/CMS_PASSWORD/)
    expect(r.stderr).not.toContain('FETCH_LLAMADO')
  })
  it('--only-upload sin CMS_EMAIL falla antes de red', () => {
    const r = run([...base(), '--only-upload'], { CMS_PASSWORD: SECRET })
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/CMS_EMAIL/)
  })
  it('destino remoto sin --allow-remote se rechaza', () => {
    const r = run([...base(), '--only-upload', '--cms=https://cms.ejemplo.test'], { CMS_EMAIL: 'a@b.c', CMS_PASSWORD: SECRET })
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/local|allow-remote/)
    expect(r.stderr).not.toContain(SECRET)
  })
  it('la contraseña por argumento no se acepta', () => {
    const r = run([...base(), '--only-upload', `--password=${SECRET}`], { CMS_EMAIL: 'a@b.c' })
    expect(r.status).not.toBe(0)
    expect(r.stderr).not.toContain(SECRET)
  })
})
