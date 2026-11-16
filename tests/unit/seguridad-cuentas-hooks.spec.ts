// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S1, S2, S4).
// Qué comprueba: el hook de ciclo de vida de la contraseña de `users` aplica la política en TODA vía que fija una
//   contraseña (alta, edición, primer registro), rechaza las 5 anteriores con un hash propio, fija `passwordChangedAt` y
//   decide `mustChangePassword` según quién actúa; además, que nadie (ni la Local API) reescribe esos campos sin contraseña.
// Amenaza: contraseñas débiles o repetidas, y saltarse el cambio obligatorio editando los campos de estado.
// Límite: ejecuta el hook con solicitudes sintéticas; la escritura real en Postgres la cubre la sonda local del informe.
import { describe, expect, it } from 'vitest'

import { enforcePasswordLifecycle } from '../../apps/cms/src/hooks/users/passwordLifecycle'
import { hashPasswordForHistory, matchesPasswordHistory } from '../../apps/cms/src/utilities/passwordHash'

const FUERTE = 'Rx7#tq92Lmv5'
const OTRA = 'Kp4$wz81Nbq3'
const EMAIL = 'cuenta.prueba@example.invalid'

type Args = {
  data: Record<string, unknown>
  operation: 'create' | 'update'
  originalDoc?: Record<string, unknown>
  user?: Record<string, unknown> | null
  context?: Record<string, unknown>
  pathname?: string
}

const run = async ({ data, operation, originalDoc, user = null, context = {}, pathname = '/api/users' }: Args) =>
  (await enforcePasswordLifecycle({
    data,
    operation,
    originalDoc,
    req: { user, context, pathname } as never,
    context,
    collection: {} as never,
  } as never)) as Record<string, unknown>

/** El hook lanza un ValidationError de Payload (400); el motivo legible va en `data.errors[0].message` (campo `password`). */
const rejection = async (promise: Promise<unknown>, pattern: RegExp) => {
  const err = (await promise.then(
    () => {
      throw new Error('se esperaba un rechazo')
    },
    (e) => e,
  )) as { status?: number; data?: { errors?: Array<{ message: string; path: string }> } }
  expect(err.status).toBe(400)
  expect(err.data?.errors?.[0]?.path).toBe('password')
  expect(err.data?.errors?.[0]?.message).toMatch(pattern)
}

const superadmin = { id: 1, role: 'superadmin', collection: 'users', mustChangePassword: false, passwordChangedAt: new Date().toISOString() }

describe('S2: política aplicada en el servidor en cada vía', () => {
  it('rechaza una contraseña débil al crear (superadmin)', async () => {
    await rejection(run({ data: { email: EMAIL, password: 'corta1!A' }, operation: 'create', user: superadmin }), /no cumple la política/)
  })

  it('rechaza una contraseña débil al editar (superadmin sobre otra cuenta)', async () => {
    await expect(
      run({ data: { password: 'solominusculas' }, operation: 'update', user: superadmin, originalDoc: { id: 9, email: EMAIL } }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rechaza una contraseña débil en el primer registro', async () => {
    await rejection(
      run({ data: { email: EMAIL, password: 'password' }, operation: 'create', pathname: '/api/users/first-register' }),
      /no cumple la política/,
    )
  })

  it('rechaza una contraseña que contiene el usuario del correo', async () => {
    await rejection(
      run({ data: { email: EMAIL, password: 'cuenta.prueba#12A' }, operation: 'create', user: superadmin }),
      /usuario de correo/,
    )
  })

  it('el mensaje de error nunca incluye la contraseña rechazada', async () => {
    const err = await run({ data: { email: EMAIL, password: 'Secreta99' }, operation: 'create', user: superadmin }).catch((e) => e)
    expect(JSON.stringify({ m: err.message, d: err.data })).not.toContain('Secreta99')
  })

  it('acepta una contraseña que cumple y no deja texto plano en el historial', async () => {
    const out = await run({ data: { email: EMAIL, password: FUERTE }, operation: 'create', user: superadmin })
    expect(out.password).toBe(FUERTE) // Payload la hashea después; el hook no la altera
    const history = out.passwordHistory as string[]
    expect(history).toHaveLength(1)
    expect(history[0]).not.toContain(FUERTE)
    expect(await matchesPasswordHistory(FUERTE, history)).toBe(true)
  })
})

describe('S2: historial de las 5 anteriores', () => {
  it('rechaza repetir una contraseña del historial', async () => {
    const history = [await hashPasswordForHistory(FUERTE)]
    await rejection(
      run({ data: { password: FUERTE }, operation: 'update', user: { ...superadmin, id: 9 }, context: { selfChange: true }, originalDoc: { id: 9, email: EMAIL, passwordHistory: history } }),
      /anteriores/,
    )
  })

  it('conserva solo las últimas 5 (la más antigua sale)', async () => {
    const olds = ['Hb3%kd71Pzx8', 'Wm5&rt24Jcv9', 'Qa8!ns63Ylu2', 'Ft6?gk59Dwe4', 'Zc2#pm87Xbr5']
    const history = await Promise.all(olds.map((p) => hashPasswordForHistory(p)))
    const out = await run({
      data: { password: OTRA },
      operation: 'update',
      user: superadmin,
      originalDoc: { id: 9, email: EMAIL, passwordHistory: history },
    })
    const next = out.passwordHistory as string[]
    expect(next).toHaveLength(5)
    expect(await matchesPasswordHistory(OTRA, next)).toBe(true)
    expect(await matchesPasswordHistory(olds[0], next)).toBe(false)
    expect(await matchesPasswordHistory(olds[4], next)).toBe(true)
  })

  it('el hash propio lleva sal aleatoria: dos hashes de la misma contraseña difieren', async () => {
    const a = await hashPasswordForHistory(FUERTE)
    const b = await hashPasswordForHistory(FUERTE)
    expect(a).not.toBe(b)
    expect(await matchesPasswordHistory(FUERTE, [a])).toBe(true)
    expect(await matchesPasswordHistory(OTRA, [a, b])).toBe(false)
  })
})

describe('S1 / S4: mustChangePassword y passwordChangedAt según quién fija la contraseña', () => {
  it('superadmin crea una cuenta: exige cambio y fecha de cambio = ahora', async () => {
    const before = Date.now()
    const out = await run({ data: { email: EMAIL, password: FUERTE }, operation: 'create', user: superadmin })
    expect(out.mustChangePassword).toBe(true)
    expect(new Date(out.passwordChangedAt as string).getTime()).toBeGreaterThanOrEqual(before - 5)
  })

  it('Local API sin usuario: exige cambio, salvo exigirCambio === false en el contexto', async () => {
    expect((await run({ data: { email: EMAIL, password: FUERTE }, operation: 'create' })).mustChangePassword).toBe(true)
    expect(
      (await run({ data: { email: EMAIL, password: FUERTE }, operation: 'create', context: { exigirCambio: false } })).mustChangePassword,
    ).toBe(false)
  })

  it('primer registro: no exige cambio (quien la eligió es el propio titular)', async () => {
    const out = await run({ data: { email: EMAIL, password: FUERTE }, operation: 'create', pathname: '/api/users/first-register' })
    expect(out.mustChangePassword).toBe(false)
  })

  it('cambio propio por el endpoint (contexto selfChange): no exige cambio', async () => {
    const self = { id: 9, role: 'editor', collection: 'users' }
    const a = await run({ data: { password: FUERTE }, operation: 'update', user: self, context: { selfChange: true }, originalDoc: { id: 9, email: EMAIL, mustChangePassword: true } })
    expect(a.mustChangePassword).toBe(false)
    const b = await run({ data: { password: FUERTE }, operation: 'update', user: null, context: { selfChange: true }, originalDoc: { id: 9, email: EMAIL } })
    expect(b.mustChangePassword).toBe(false)
  })

  // Una sesión robada no debe poder fijar una contraseña nueva sin conocer la actual (PATCH /api/users/:id o el
  // botón «Cambiar contraseña» del panel de Payload): la única vía propia es POST /api/users/cambiar-clave.
  it('la propia cuenta no puede fijar su contraseña por la edición normal (sin la actual), ni siquiera el superadmin', async () => {
    const editor = { id: 9, role: 'editor', collection: 'users', passwordChangedAt: new Date().toISOString() }
    await rejection(run({ data: { password: FUERTE }, operation: 'update', user: editor, originalDoc: { id: 9, email: EMAIL } }), /Cambiar contraseña/)
    await rejection(run({ data: { password: FUERTE }, operation: 'update', user: superadmin, originalDoc: { id: 1, email: EMAIL } }), /Cambiar contraseña/)
  })

  it('superadmin fija la contraseña de otra cuenta: exige cambio; exigirCambio false lo desactiva', async () => {
    const a = await run({ data: { password: FUERTE }, operation: 'update', user: superadmin, originalDoc: { id: 9, email: EMAIL } })
    expect(a.mustChangePassword).toBe(true)
    const b = await run({
      data: { password: FUERTE },
      operation: 'update',
      user: superadmin,
      context: { exigirCambio: false },
      originalDoc: { id: 9, email: EMAIL },
    })
    expect(b.mustChangePassword).toBe(false)
  })

  it('sin contraseña nueva, los campos de estado conservan el valor guardado aunque el llamador los envíe', async () => {
    const stored = { id: 9, email: EMAIL, mustChangePassword: true, passwordChangedAt: '2026-01-01T00:00:00.000Z', passwordHistory: ['x'] }
    const out = await run({
      data: { telefono: '1', mustChangePassword: false, passwordChangedAt: new Date().toISOString(), passwordHistory: [] },
      operation: 'update',
      user: superadmin,
      originalDoc: stored,
    })
    expect(out.mustChangePassword).toBe(true)
    expect(out.passwordChangedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(out.passwordHistory).toEqual(['x'])
  })

  it('alta sin contraseña desde la Local API no puede fijar los campos de estado', async () => {
    const out = await run({ data: { email: EMAIL, mustChangePassword: false, passwordChangedAt: '2030-01-01T00:00:00.000Z' }, operation: 'create' })
    expect(out.mustChangePassword).toBe(true)
    expect(out.passwordChangedAt).toBeNull()
  })
})
