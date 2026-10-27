import { describe, expect, it } from 'vitest'
import {
  buildDraftPayload,
  buildStepBody,
  checkIdentities,
  remainingSteps,
} from '../../scripts/lib/wpPublishFlow.mjs'

/**
 * MIG-WP: flujo editorial del importador WordPress -> Payload (matriz SEC-03, DEP-03).
 * Propósito: el CMS rechaza crear contenido ya publicado y exige draft -> en_revision (autor) ->
 * aprobado (revisor) -> publicado (publicador), con «nadie aprueba ni publica lo propio». Estas pruebas
 * fijan la lógica pura (cargas, secuencia, reanudación e identidades). Límite: no ejecutan el CMS real.
 */

describe('buildDraftPayload', () => {
  it('nace en Borrador y conserva la fecha de WordPress', () => {
    const p = buildDraftPayload({ title: 'T', publishedAt: '2026-07-24T14:20:24.000Z', featured: false })
    expect(p.approvalStatus).toBe('draft')
    expect(p._status).toBe('draft')
    expect(p.publishedAt).toBe('2026-07-24T14:20:24.000Z')
    expect(p.title).toBe('T')
  })
  it('descarta cualquier estado publicado que venga en la entrada', () => {
    const p = buildDraftPayload({ approvalStatus: 'publicado', _status: 'published', title: 'T' })
    expect(p.approvalStatus).toBe('draft')
    expect(p._status).toBe('draft')
  })
})

describe('remainingSteps', () => {
  const doc = (approvalStatus: string, _status: string) => ({ approvalStatus, _status })
  it('desde borrador: revisión (autor), aprobación (revisor), publicación (publicador)', () => {
    const r = remainingSteps(doc('draft', 'draft'))
    expect(r.blocked).toBeUndefined()
    expect(r.steps.map((s: { actor: string; to: string }) => [s.actor, s.to])).toEqual([
      ['author', 'en_revision'],
      ['reviewer', 'aprobado'],
      ['publisher', 'publicado'],
    ])
  })
  it('reanuda desde en_revision y desde aprobado', () => {
    expect(remainingSteps(doc('en_revision', 'draft')).steps.map((s: { to: string }) => s.to)).toEqual(['aprobado', 'publicado'])
    expect(remainingSteps(doc('aprobado', 'draft')).steps.map((s: { to: string }) => s.to)).toEqual(['publicado'])
  })
  it('ya publicado: no queda nada', () => {
    expect(remainingSteps(doc('publicado', 'published')).steps).toEqual([])
  })
  it('rechazado queda bloqueado (decisión humana), sin pasos', () => {
    const r = remainingSteps(doc('rechazado', 'draft'))
    expect(r.steps).toEqual([])
    expect(r.blocked).toMatch(/rechazad/i)
  })
  it('un documento heredado sin approvalStatus se deriva de _status', () => {
    expect(remainingSteps({ _status: 'published' }).steps).toEqual([])
    expect(remainingSteps({ _status: 'draft' }).steps).toHaveLength(3)
  })
})

describe('buildStepBody', () => {
  it('envía solo los campos de estado, sin contenido ni historial', () => {
    expect(buildStepBody('en_revision')).toEqual({ approvalStatus: 'en_revision', _status: 'draft' })
    expect(buildStepBody('aprobado')).toEqual({ approvalStatus: 'aprobado', _status: 'draft' })
    expect(buildStepBody('publicado')).toEqual({ approvalStatus: 'publicado', _status: 'published' })
  })
  it('rechaza un destino desconocido', () => {
    expect(() => buildStepBody('xyz')).toThrow()
  })
})

describe('checkIdentities', () => {
  const a = { id: 1, role: 'superadmin' }
  const r = { id: 2, role: 'reviewer' }
  const p = { id: 3, role: 'publisher' }
  it('modo completo con tres identidades distintas y roles correctos', () => {
    expect(checkIdentities({ author: a, reviewer: r, publisher: p })).toEqual({ ok: true, mode: 'full', problems: [] })
  })
  it('sin revisor ni publicador: solo borradores', () => {
    expect(checkIdentities({ author: a })).toEqual({ ok: true, mode: 'draft-only', problems: [] })
  })
  it('definir solo uno de los dos es un error', () => {
    const res = checkIdentities({ author: a, reviewer: r })
    expect(res.ok).toBe(false)
    expect(res.problems.join(' ')).toMatch(/publicador/i)
  })
  it('exige roles correctos', () => {
    const res = checkIdentities({ author: a, reviewer: { id: 2, role: 'editor' }, publisher: { id: 3, role: 'viewer' } })
    expect(res.ok).toBe(false)
    expect(res.problems).toHaveLength(2)
  })
  it('exige identidades distintas (nadie aprueba ni publica lo propio)', () => {
    const res = checkIdentities({ author: a, reviewer: r, publisher: { id: 1, role: 'superadmin' } })
    expect(res.ok).toBe(false)
    expect(res.problems.join(' ')).toMatch(/distint/i)
  })
  it('compara ids numéricos y de texto como iguales', () => {
    const res = checkIdentities({ author: a, reviewer: r, publisher: { id: '1', role: 'publisher' } })
    expect(res.ok).toBe(false)
  })
})
