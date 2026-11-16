// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S1, S2, S5 y «Contrato servidor ↔ panel»).
// Qué comprueba: los endpoints propios de `users`:
//   - POST /cambiar-clave: 401 sin sesión o con la contraseña actual incorrecta (verificada con login, que cuenta el
//     intento fallido), 400 con `errors` si la nueva no cumple, 200 `{ ok: true }` y cierre de las DEMÁS sesiones.
//   - POST /:id/restablecer-clave: solo superadmin y nunca sobre su propia cuenta (403), genera 16 caracteres que cumplen
//     la política, responde con `Cache-Control: no-store` y cierra TODAS las sesiones de la cuenta.
//   - POST /forgot-password y /reset-password: 403 con el mensaje del contrato.
// Amenaza: cambio de contraseña sin conocer la actual, restablecimientos por roles sin permiso, contraseña en caché,
//   sesiones robadas que sobreviven al cambio y recuperación por correo que salta la política.
// Límite: Payload simulado; la prueba contra Postgres local está en el informe (sonda con handleEndpoints).
import { AuthenticationError, ValidationError } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isPasswordAcceptable } from '../../apps/cms/src/config/passwordPolicy'
import { cambiarClaveEndpoint } from '../../apps/cms/src/endpoints/users/cambiarClave'
import { generatePassword, restablecerClaveEndpoint } from '../../apps/cms/src/endpoints/users/restablecerClave'
import { forgotPasswordClosedEndpoint, RECOVERY_CLOSED_MESSAGE, resetPasswordClosedEndpoint } from '../../apps/cms/src/endpoints/users/recuperacionCerrada'

const FUERTE = 'Rx7#tq92Lmv5'
const NUEVA = 'Kp4$wz81Nbq3'
const EMAIL = 'cuenta.prueba@example.invalid'

/** JWT sintético sin firma válida: el endpoint solo lee el `sid` de la sesión que acaba de crear la verificación. */
const fakeToken = (sid: string) =>
  ['h', Buffer.from(JSON.stringify({ sid })).toString('base64url'), 's'].join('.')

const makePayload = () => ({
  login: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
  findByID: vi.fn(),
  create: vi.fn().mockResolvedValue({}),
  db: {
    findOne: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  },
})

type P = ReturnType<typeof makePayload>

const makeReq = (payload: P, user: unknown, body: unknown, routeParams: Record<string, unknown> = {}) =>
  ({
    user,
    payload,
    routeParams,
    context: {},
    headers: new Headers(),
    json: async () => body,
  }) as never

const self = { id: 7, email: EMAIL, role: 'editor', collection: 'users', _sid: 'actual', mustChangePassword: true, passwordChangedAt: null }
const superadmin = { id: 1, email: 'admin.prueba@example.invalid', role: 'superadmin', collection: 'users', _sid: 's-admin', mustChangePassword: false, passwordChangedAt: new Date().toISOString() }

describe('POST /api/users/cambiar-clave', () => {
  let payload: P
  beforeEach(() => {
    payload = makePayload()
    payload.db.findOne.mockResolvedValue({ id: 7, sessions: [{ id: 'actual' }, { id: 'otra' }, { id: 'verif' }] })
  })

  it('está declarado como POST /cambiar-clave', () => {
    expect(cambiarClaveEndpoint).toMatchObject({ method: 'post', path: '/cambiar-clave' })
  })

  it('401 sin sesión', async () => {
    const res = await cambiarClaveEndpoint.handler(makeReq(payload, null, { actual: FUERTE, nueva: NUEVA }))
    expect(res.status).toBe(401)
    expect(payload.login).not.toHaveBeenCalled()
  })

  it('400 si faltan campos', async () => {
    const res = await cambiarClaveEndpoint.handler(makeReq(payload, self, { actual: FUERTE }))
    expect(res.status).toBe(400)
    expect((await res.json()).errors[0].message).toEqual(expect.any(String))
  })

  it('401 si la actual es incorrecta: la verifica login (intento fallido contado) y no cambia nada', async () => {
    payload.login.mockRejectedValue(new AuthenticationError())
    const res = await cambiarClaveEndpoint.handler(makeReq(payload, self, { actual: 'Incorrecta#123', nueva: NUEVA }))
    expect(res.status).toBe(401)
    expect(payload.login).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'users', data: { email: EMAIL, password: 'Incorrecta#123' } }),
    )
    expect(payload.update).not.toHaveBeenCalled()
    // S5: el intento fallido queda auditado sin la contraseña
    const audit = payload.create.mock.calls.find((c) => c[0].collection === 'auditoria')?.[0]
    expect(audit?.data).toMatchObject({ accion: 'cambiar_clave', resultado: 'error', usuario: EMAIL })
    expect(JSON.stringify(payload.create.mock.calls)).not.toMatch(/Incorrecta#123|Kp4\$wz81Nbq3/)
  })

  it('200 { ok: true }: actualiza como cambio propio y cierra las demás sesiones (conserva la actual)', async () => {
    payload.login.mockResolvedValue({ token: fakeToken('verif'), user: { id: 7 } })
    const req = makeReq(payload, self, { actual: FUERTE, nueva: NUEVA })
    const res = await cambiarClaveEndpoint.handler(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: 7,
        data: { password: NUEVA },
        overrideAccess: true,
        req,
        context: expect.objectContaining({ selfChange: true }),
      }),
    )
    const saved = payload.db.updateOne.mock.calls.at(-1)?.[0]
    expect(saved.data.sessions).toEqual([{ id: 'actual' }])
  })

  it('400 con errors si la nueva no cumple; la sesión creada por la verificación se descarta', async () => {
    payload.login.mockResolvedValue({ token: fakeToken('verif'), user: { id: 7 } })
    payload.update.mockRejectedValue(
      new ValidationError({ collection: 'users', errors: [{ message: 'La contraseña no cumple la política: x.', path: 'password' }] }),
    )
    const res = await cambiarClaveEndpoint.handler(makeReq(payload, self, { actual: FUERTE, nueva: 'debil' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ errors: [{ message: 'La contraseña no cumple la política: x.' }] })
    const saved = payload.db.updateOne.mock.calls.at(-1)?.[0]
    expect(saved.data.sessions).toEqual([{ id: 'actual' }, { id: 'otra' }])
  })

  it('400 si la nueva es igual a la actual', async () => {
    payload.login.mockResolvedValue({ token: fakeToken('verif'), user: { id: 7 } })
    const res = await cambiarClaveEndpoint.handler(makeReq(payload, self, { actual: FUERTE, nueva: FUERTE }))
    expect(res.status).toBe(400)
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('POST /api/users/:id/restablecer-clave', () => {
  let payload: P
  beforeEach(() => {
    payload = makePayload()
    payload.findByID.mockResolvedValue({ id: 9, email: 'docente.x@example.invalid', nombre: 'Ana', apellido: 'Pérez' })
    payload.db.findOne.mockResolvedValue({ id: 9, sessions: [{ id: 'a' }, { id: 'b' }] })
  })
  const call = (user: unknown, body: unknown, id: unknown = 9) =>
    restablecerClaveEndpoint.handler(makeReq(payload, user, body, { id }))

  it('está declarado como POST /:id/restablecer-clave', () => {
    expect(restablecerClaveEndpoint).toMatchObject({ method: 'post', path: '/:id/restablecer-clave' })
  })

  it('403 sin sesión, con otro rol o con superadmin que debe cambiar su propia contraseña', async () => {
    for (const user of [null, { ...superadmin, role: 'web-admin' }, { ...superadmin, mustChangePassword: true }]) {
      const res = await call(user, { modo: 'generar', exigirCambio: true })
      expect(res.status).toBe(403)
    }
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('403 sobre la propia cuenta', async () => {
    const res = await call(superadmin, { modo: 'generar', exigirCambio: true }, '1')
    expect(res.status).toBe(403)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('400 con modo desconocido o «crear» sin clave', async () => {
    expect((await call(superadmin, { modo: 'otro', exigirCambio: true })).status).toBe(400)
    expect((await call(superadmin, { modo: 'crear', exigirCambio: true })).status).toBe(400)
  })

  it('400 con errors si «crear» no cumple la política (antes de tocar la cuenta)', async () => {
    const res = await call(superadmin, { modo: 'crear', clave: 'corta', exigirCambio: true })
    expect(res.status).toBe(400)
    expect((await res.json()).errors[0].message).toMatch(/no cumple la política/)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('404 si la cuenta no existe', async () => {
    payload.findByID.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }))
    expect((await call(superadmin, { modo: 'generar', exigirCambio: true })).status).toBe(404)
  })

  it('generar: 200 con clave de 16 que cumple, nombre, no-store, exige cambio y cierra todas las sesiones', async () => {
    const res = await call(superadmin, { modo: 'generar', exigirCambio: true })
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('no-store')
    const body = await res.json()
    expect(body).toEqual({ ok: true, clave: expect.any(String), nombre: 'Ana Pérez' })
    expect(body.clave).toHaveLength(16)
    expect(isPasswordAcceptable(body.clave, { email: 'docente.x@example.invalid' })).toBe(true)
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: 9,
        data: { password: body.clave },
        overrideAccess: true,
        context: expect.objectContaining({ exigirCambio: true, modoRestablecimiento: 'generar' }),
      }),
    )
    expect(payload.db.updateOne.mock.calls.at(-1)?.[0].data.sessions).toEqual([])
  })

  it('crear con exigirCambio false: pasa la clave elegida y la decisión al hook', async () => {
    const res = await call(superadmin, { modo: 'crear', clave: FUERTE, exigirCambio: false })
    expect(res.status).toBe(200)
    expect((await res.json()).clave).toBe(FUERTE)
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { password: FUERTE }, context: expect.objectContaining({ exigirCambio: false, modoRestablecimiento: 'crear' }) }),
    )
  })

  it('sin nombre ni apellido devuelve el correo como nombre', async () => {
    payload.findByID.mockResolvedValue({ id: 9, email: 'docente.x@example.invalid' })
    const body = await (await call(superadmin, { modo: 'generar', exigirCambio: true })).json()
    expect(body.nombre).toBe('docente.x@example.invalid')
  })

  it('el generador produce siempre 16 caracteres que cumplen la política', () => {
    for (let i = 0; i < 300; i++) {
      const pw = generatePassword('docente.x@example.invalid')
      expect(pw).toHaveLength(16)
      expect(isPasswordAcceptable(pw, { email: 'docente.x@example.invalid' }), pw).toBe(true)
    }
  })
})

describe('recuperación por correo cerrada (S2)', () => {
  it('forgot-password y reset-password responden 403 con el mensaje del contrato', async () => {
    expect(forgotPasswordClosedEndpoint).toMatchObject({ method: 'post', path: '/forgot-password' })
    expect(resetPasswordClosedEndpoint).toMatchObject({ method: 'post', path: '/reset-password' })
    for (const ep of [forgotPasswordClosedEndpoint, resetPasswordClosedEndpoint]) {
      const res = await ep.handler({} as never)
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ errors: [{ message: RECOVERY_CLOSED_MESSAGE }] })
    }
    expect(RECOVERY_CLOSED_MESSAGE).toBe('La recuperación de contraseña la realiza un administrador del portal.')
  })
})
