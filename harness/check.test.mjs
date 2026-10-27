import test from 'node:test'
import assert from 'node:assert/strict'
import { GUARD_IDS } from './guards.mjs'
import { getPlan, runChecks, checkArtifacts } from './check.mjs'

// SEC-HARNESS-01: el modo rápido debe poder inspeccionarse sin tocar red ni datos.
// DEP-00: el plan rápido ahora incluye los guards de lectura tras unit y typecheck.
test('el plan rápido contiene solo verificaciones locales de lectura', () => {
  const plan = getPlan('quick')
  assert.deepEqual(plan.map((step) => step.id), ['unit', 'typecheck-portal', ...GUARD_IDS])
  assert.equal(plan.some((step) => /seed|migrat|deploy|audit/i.test(step.args.join(' '))), false)
})

// SEC-HARNESS-02: el modo completo expone gates CMS y el único paso de red.
test('el plan completo añade CMS, lint y auditoría sin comandos destructivos', () => {
  const plan = getPlan('full')
  assert.deepEqual(plan.map((step) => step.id), [
    'unit', 'typecheck-portal', ...GUARD_IDS, 'typecheck-cms', 'lint-portal', 'lint-cms', 'audit-deps',
  ])
  assert.equal(plan.filter((step) => step.network).map((step) => step.id).join(','), 'audit-deps')
  assert.equal(plan.some((step) => /seed|migrat|deploy|install|update/i.test(step.args.join(' '))), false)
})

// SEC-HARNESS-03: un gate fallido debe quedar visible, sin ocultar los siguientes.
test('el runner informa fallos y continúa con los otros checks', () => {
  const steps = [{ id: 'ok' }, { id: 'fail' }, { id: 'after' }]
  const report = runChecks(steps, (step) => ({ status: step.id === 'fail' ? 2 : 0, stdout: '', stderr: '' }))
  assert.equal(report.passed, false)
  assert.deepEqual(report.results.map((result) => [result.id, result.exitCode]), [
    ['ok', 0], ['fail', 2], ['after', 0],
  ])
})

// SEC-HARNESS-04: el arnés no debe declarar listo un proceso sin sus artefactos.
test('la verificación documental marca ausencias sin crearlas', () => {
  const report = checkArtifacts('C:/ruta-que-no-existe-para-aura')
  assert.equal(report.passed, false)
  assert.ok(report.missing.includes('AGENTS.md'))
  assert.ok(report.missing.includes('docs/engineering/SDD-RDD-HARNESS.md'))
})

// SEC-HARNESS-05: el ejecutor real respeta el código de salida de un subproceso.
test('el runner predeterminado propaga el fallo sin ejecutar acciones extra', () => {
  const report = runChecks([{ id: 'probe', command: process.execPath, args: ['-e', 'process.exit(7)'], cwd: process.cwd() }])
  assert.deepEqual(report.results.map((result) => result.exitCode), [7])
  assert.equal(report.passed, false)
})
