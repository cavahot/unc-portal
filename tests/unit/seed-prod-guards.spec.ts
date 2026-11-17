// SEED-PROD B4: seed-tribunal y seed-faqs deben aplicar la misma guardia que el resto de las siembras antes de
// iniciar sesión. Amenaza: enviar CMS_EMAIL/CMS_PASSWORD a un host equivocado o usar una cuenta adivinable
// (`admin@unc.edu.py` por defecto). Límite: se prueba la guardia (sale antes de la red), no la siembra contra un CMS.
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const STRONG = 'Prueba-Sintetica-2026!'
const SCRIPTS = ['scripts/seed-tribunal.mjs', 'scripts/seed-faqs.mjs']

/** Ejecuta el guion con un entorno mínimo controlado (sin heredar credenciales del equipo). */
function runScript(script: string, env: Record<string, string>, args: string[] = []) {
  const r = spawnSync(process.execPath, [script, ...args], {
    env: { PATH: process.env.PATH ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '', ...env },
    encoding: 'utf8',
    timeout: 15000,
  })
  return { code: r.status, out: `${r.stdout}${r.stderr}` }
}

describe.each(SCRIPTS)('%s: guardia de destino y credenciales', (script) => {
  it('rechaza un CMS remoto sin --allow-remote y no imprime la contraseña', () => {
    const r = runScript(script, { CMS_URL: 'https://cms.example.invalid', CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/destino rechazado/)
    expect(r.out).not.toContain(STRONG)
  })

  it('rechaza http remoto aunque se pase --allow-remote', () => {
    const r = runScript(script, { CMS_URL: 'http://cms.example.invalid', CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG }, ['--allow-remote'])
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/https/)
  })

  it('exige CMS_EMAIL (sin correo por defecto)', () => {
    const r = runScript(script, { CMS_URL: 'http://localhost:3002', CMS_PASSWORD: STRONG })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/CMS_EMAIL/)
  })

  it('rechaza una contraseña débil (SEC-08)', () => {
    const r = runScript(script, { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: 'corta' })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/SEC-08/)
  })
})
