import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { GUARD_IDS, collectInputs, runGuards } from './guards.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REQUIRED_ARTIFACTS = [
  'AGENTS.md',
  'docs/engineering/SDD-RDD-HARNESS.md',
  'docs/research/evidence-register.md',
  'docs/specs/security/SEC-001-anonimo-no-lee-borradores.md',
  'docs/security/ATTACK-BOUNDARIES.md',
  'docs/security/TASK-SEC-001-hardening-portal-unc.md',
  // DEP-00: la remediación pre-deploy debe conservar su informe base y su backlog.
  'docs/security/AUDIT-DEPLOY-2026-10-19.md',
  'docs/security/TASK-DEPLOY-001-remediacion-auditoria-predeploy.md',
]

/**
 * Comprueba presencia de las especificaciones y evidencias sin crear carpetas
 * ni rellenar automáticamente decisiones del Product Owner (SEC-HARNESS-04).
 */
export function checkArtifacts(root = ROOT) {
  const missing = REQUIRED_ARTIFACTS.filter((relative) => !existsSync(path.join(root, relative)))
  return { passed: missing.length === 0, missing }
}

/**
 * Construye una lista explícita de comandos de solo lectura para que un agente
 * o desarrollador pueda revisar el alcance antes de ejecutarlos (SEC-HARNESS-01).
 */
export function getPlan(mode = 'quick') {
  if (mode !== 'quick' && mode !== 'full') throw new Error(`Modo no admitido: ${mode}`)
  const checks = [
    { id: 'unit', command: 'npm', args: ['test'], cwd: ROOT },
    { id: 'typecheck-portal', command: 'npm', args: ['run', 'typecheck'], cwd: ROOT },
    // DEP-00: guards de lectura en proceso (sin subproceso ni red); ver harness/guards.mjs.
    ...GUARD_IDS.map((id) => ({ id, guard: true, command: 'in-process', args: [], cwd: ROOT })),
  ]
  if (mode === 'full') {
    // Los comandos son fijos: ningún dato del usuario entra como argumento de shell.
    checks.push(
      { id: 'typecheck-cms', command: process.execPath, args: ['node_modules/typescript/bin/tsc', '--noEmit', '--project', 'apps/cms/tsconfig.json'], cwd: ROOT },
      { id: 'lint-portal', command: 'npm', args: ['run', 'lint'], cwd: ROOT },
      { id: 'lint-cms', command: 'npm', args: ['run', 'lint', '--workspace=@unc/cms'], cwd: ROOT },
    )
    return [...checks, { id: 'audit-deps', command: 'npm', args: ['audit', '--omit=dev', '--json'], cwd: ROOT, network: true }]
  }
  return checks
}

/**
 * Ejecuta cada comprobación con el runner inyectado y conserva todos los
 * resultados aunque uno falle; así la deuda preexistente no queda oculta.
 */
/**
 * Ejecuta un comando fijo del plan y devuelve su salida para la evidencia.
 * ARCH-DB-11: el runner no acepta texto del usuario como shell; solo ejecuta
 * comandos construidos por getPlan para evitar inyección en el arnés.
 */
export function defaultRunner(step) {
  // ARCH-DB-11: en Windows los scripts npm son .cmd y requieren cmd.exe.
  // Los argumentos provienen exclusivamente del plan fijo, no del usuario.
  const isWindowsNpm = process.platform === 'win32' && step.command === 'npm'
  const command = isWindowsNpm ? (process.env.ComSpec ?? 'cmd.exe') : step.command
  const args = isWindowsNpm
    ? ['/d', '/s', '/c', 'npm', ...step.args]
    : step.args
  const outcome = spawnSync(command, args, {
    cwd: step.cwd,
    encoding: 'utf8',
    shell: false,
  })

  return {
    status: outcome.status ?? 1,
    stdout: outcome.stdout ?? '',
    stderr: outcome.stderr ?? outcome.error?.message ?? '',
  }
}

/**
 * Ejecuta cada comprobación con el runner inyectado o con el runner real.
 * ARCH-DB-11: conserva todos los fallos para que un gate rojo no oculte los
 * siguientes controles ni se presente como un éxito parcial.
 */
export function runChecks(plan, runner = defaultRunner) {
  const results = plan.map((step) => {
    const outcome = runner(step)
    return {
      id: step.id,
      exitCode: outcome.status,
      passed: outcome.status === 0,
      stdout: outcome.stdout ?? '',
      stderr: outcome.stderr ?? '',
    }
  })
  return { passed: results.every((result) => result.passed), results }
}

/**
 * ARCH-DB-11: presenta el plan o ejecuta únicamente los gates declarados.
 * No inicia Docker, no migra bases y no ejecuta seeds o despliegues.
 */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flag = process.argv[2] ?? '--plan'
  const mode = flag === '--full' ? 'full' : 'quick'

  if (!['--plan', '--quick', '--full'].includes(flag)) {
    console.error('Uso: node harness/check.mjs --plan|--quick|--full')
    process.exitCode = 2
  } else if (flag === '--plan') {
    console.log(JSON.stringify({ mode, checks: getPlan(mode) }, null, 2))
  } else {
    const artifacts = checkArtifacts()
    // DEP-00: los guards corren en proceso y se reportan junto a los comandos; uno rojo no oculta al resto.
    const plan = getPlan(mode)
    const commands = artifacts.passed ? runChecks(plan.filter((step) => !step.guard)) : { passed: false, results: [] }
    const guards = artifacts.passed ? runGuards(collectInputs()) : []
    const report = {
      mode,
      artifacts,
      passed: commands.passed && guards.every((guard) => guard.passed),
      results: commands.results,
      guards,
    }
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = report.passed ? 0 : 1
  }
}
