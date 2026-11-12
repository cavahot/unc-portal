// SEC-027 (matriz de roles): reglas que deciden si la respuesta del CMS a cada sonda cumple la política de acceso.
// Spec: docs/security/SEC-027-MATRIZ-ROLES.md. Qué comprueba: que los jueces aprueban lo permitido, RECHAZAN las
//   filtraciones (lista de usuarios ajenos, escalada de rol, datos del creador, borradores ajenos) y cubren a todos los
//   actores. Por qué: el guion `probe-roles.ts` solo vale si sus jueces detectan el fallo; aquí se prueban con respuestas
//   sintéticas que representan tanto el caso bueno como el malo. Límite: no hace red; la corrida real es contra el CMS local.
import { describe, expect, it } from 'vitest'
import { ACTORS, PROBES, type Actor, type Observed } from '../../apps/cms/scripts/security/roleMatrix'

const ctx = { selfId: 41, roleAfter: undefined as string | undefined }
const ok = (body: unknown = {}): Observed => ({ status: 200, body })
const created: Observed = { status: 201, body: { doc: { id: 9 } } }
const denied: Observed = { status: 403, body: { errors: [{ message: 'You are not allowed to perform this action.' }] } }
const unauth: Observed = { status: 401, body: {} }
const notFound: Observed = { status: 404, body: {} }
const probe = (id: string) => {
  const p = PROBES.find((x) => x.id === id)
  if (!p) throw new Error(`sin sonda ${id}`)
  return p
}
const judge = (id: string, actor: Actor, obs: Observed, extra: Record<string, unknown> = {}) => probe(id).judge(actor, obs, { ...ctx, ...extra })

describe('cobertura', () => {
  it('9 actores (anónimo y 8 roles no superadmin) y 11 sondas P1–P11', () => {
    expect(ACTORS).toEqual(['anonimo', 'web-admin', 'publisher', 'reviewer', 'editor', 'correspondent', 'media-manager', 'auditor', 'viewer'])
    expect(PROBES.map((p) => p.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11'])
    for (const p of PROBES) for (const a of ACTORS) expect(typeof p.expectation(a), `${p.id}/${a}`).toBe('string')
  })
})

describe('P1 / P11 — lista de usuarios (REST y GraphQL)', () => {
  it('cada rol ve solo su cuenta; si ve otra, falla', () => {
    expect(judge('P1', 'editor', ok({ docs: [{ id: 41 }] }))).toBe(true)
    expect(judge('P1', 'editor', ok({ docs: [{ id: 41 }, { id: 4 }] }))).toBe(false)
    expect(judge('P11', 'viewer', ok({ data: { Users: { docs: [{ id: '41' }] } } }))).toBe(true)
    expect(judge('P11', 'viewer', ok({ data: { Users: { docs: [{ id: '41' }, { id: '4', email: 'x@y' }] } } }))).toBe(false)
  })
  // Corrida real 2026-11-09: /api/graphql responde 404 a todos porque GraphQL está desactivado a propósito
  // (apps/cms/src/payload.config.ts, `graphQL.disable`). Sin endpoint no hay datos: cumple para cualquier actor.
  it('GraphQL desactivado (404): cumple para todos los actores', () => {
    for (const a of ACTORS) expect(judge('P11', a, notFound), a).toBe(true)
  })

  it('anónimo: denegado; un 200 con usuarios es fallo', () => {
    expect(judge('P1', 'anonimo', denied)).toBe(true)
    expect(judge('P1', 'anonimo', unauth)).toBe(true)
    expect(judge('P1', 'anonimo', ok({ docs: [{ id: 4 }] }))).toBe(false)
    expect(judge('P11', 'anonimo', ok({ data: { Users: null }, errors: [{ message: 'forbidden' }] }))).toBe(true)
    expect(judge('P11', 'anonimo', ok({ data: { Users: { docs: [{ id: '4' }] } } }))).toBe(false)
  })
})

describe('P2 / P3 — crear cuentas y escalar el propio rol', () => {
  it('crear una cuenta: siempre denegado', () => {
    for (const a of ACTORS) {
      expect(judge('P2', a, denied), a).toBe(true)
      expect(judge('P2', a, created), a).toBe(false)
    }
  })
  it('escalada: cumple si el rol sigue siendo el mismo, aunque el CMS responda 200', () => {
    expect(judge('P3', 'editor', ok(), { roleAfter: 'editor' })).toBe(true)
    expect(judge('P3', 'editor', ok(), { roleAfter: 'superadmin' })).toBe(false)
    expect(judge('P3', 'anonimo', denied)).toBe(true)
  })
})

describe('P4–P8 — permitido solo a ciertos roles', () => {
  it('auditoría: solo auditor', () => {
    expect(judge('P4', 'auditor', ok({ docs: [] }))).toBe(true)
    expect(judge('P4', 'editor', denied)).toBe(true)
    expect(judge('P4', 'editor', ok({ docs: [{ id: 1 }] }))).toBe(false)
  })
  it('menú: solo web-admin', () => {
    expect(judge('P5', 'web-admin', ok())).toBe(true)
    expect(judge('P5', 'publisher', ok())).toBe(false)
    expect(judge('P5', 'anonimo', denied)).toBe(true)
  })
  it('crear noticia: editor y corresponsal', () => {
    expect(judge('P6', 'editor', created)).toBe(true)
    expect(judge('P6', 'correspondent', created)).toBe(true)
    expect(judge('P6', 'reviewer', created)).toBe(false)
    expect(judge('P6', 'publisher', denied)).toBe(true)
  })
  it('borrar inexistente: el permitido llega a 404, el resto queda en 403', () => {
    expect(judge('P7', 'publisher', notFound)).toBe(true)
    expect(judge('P7', 'editor', notFound)).toBe(false)
    expect(judge('P7', 'editor', denied)).toBe(true)
    expect(judge('P8', 'media-manager', notFound)).toBe(true)
    expect(judge('P8', 'viewer', notFound)).toBe(false)
  })
})

describe('P9 — borradores ajenos', () => {
  it('roles editoriales leen; corresponsal, auditor, viewer y anónimo no', () => {
    expect(judge('P9', 'reviewer', ok({ id: 9 }))).toBe(true)
    expect(judge('P9', 'correspondent', notFound)).toBe(true)
    expect(judge('P9', 'correspondent', ok({ id: 9 }))).toBe(false)
    expect(judge('P9', 'anonimo', ok({ id: 9 }))).toBe(false)
    expect(judge('P9', 'viewer', denied)).toBe(true)
  })
})

describe('P10 — datos del creador en una noticia publicada', () => {
  it('anónimo no recibe createdBy; nadie recibe correo, sesiones ni teléfono ajenos', () => {
    expect(judge('P10', 'anonimo', ok({ id: 1 }))).toBe(true)
    expect(judge('P10', 'anonimo', ok({ id: 1, createdBy: 4 }))).toBe(false)
    expect(judge('P10', 'editor', ok({ id: 1, createdBy: 4 }))).toBe(true)
    expect(judge('P10', 'editor', ok({ id: 1, createdBy: { id: 4, name: 'X' } }))).toBe(true)
    expect(judge('P10', 'editor', ok({ id: 1, createdBy: { id: 4, email: 'a@b' } }))).toBe(false)
    expect(judge('P10', 'reviewer', ok({ id: 1, createdBy: { id: 4, sessions: [] } }))).toBe(false)
    expect(judge('P10', 'viewer', ok({ id: 1, createdBy: { id: 4, telefono: null } }))).toBe(false)
  })
})
