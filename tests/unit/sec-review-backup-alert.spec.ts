// SEC-REVIEW: un respaldo diario que falla debe dejar rastro visible (issue), no solo un log que nadie lee.
// Amenaza: fallos silenciosos del backup durante días = sin copia cuando haga falta restaurar. Límite: se lee el
// YAML (no se ejecuta en GitHub); el permiso `issues: write` debe quedar solo en el job, nunca a nivel de workflow.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'

type Step = { name?: string; if?: string; env?: Record<string, string>; run?: string }
type Wf = { permissions?: Record<string, string>; jobs: Record<string, { permissions?: Record<string, string>; steps: Step[] }> }

const wf = parse(readFileSync(path.resolve(__dirname, '..', '..', '.github/workflows/backup.yml'), 'utf8')) as Wf
const job = wf.jobs.database
const alertStep = job.steps[job.steps.length - 1]

describe('backup.yml: alerta por issue ante fallo', () => {
  it('el último paso corre solo si falla y abre un issue con título fijo', () => {
    expect(alertStep.if).toBe('failure()')
    expect(alertStep.run).toContain('gh issue create')
    expect(alertStep.run).toContain("Backup diario falló")
  })

  it('evita duplicados: busca un issue abierto con ese título y comenta en vez de crear otro', () => {
    expect(alertStep.run).toContain('gh issue list --state open')
    expect(alertStep.run).toContain('gh issue comment')
  })

  it('el cuerpo incluye la URL de la ejecución', () => {
    expect(alertStep.env?.RUN_URL).toContain('github.run_id')
    expect(alertStep.run).toContain('$RUN_URL')
  })

  it('issues: write solo en el job; el workflow queda en contents: read', () => {
    expect(wf.permissions).toEqual({ contents: 'read' })
    expect(job.permissions).toEqual({ contents: 'read', issues: 'write' })
  })

  it('el paso de alerta no interpola secretos (solo github.token para gh)', () => {
    const text = JSON.stringify(alertStep)
    expect(text).not.toMatch(/secrets\.(?!GITHUB_TOKEN)/)
    expect(text).not.toMatch(/DATABASE_URL|PASSPHRASE/)
    const secretsInEnv = Object.values(alertStep.env ?? {}).filter((v) => /secrets\./.test(v))
    expect(secretsInEnv).toEqual([])
  })
})
