// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S5 «todo auditado»).
// Qué comprueba: los hooks de `users` registran ingreso, salida, alta, baja, cambio de rol (antes/después), cambio de
//   contraseña propio con su motivo (voluntario, primer ingreso o restablecida, vencida) y restablecimiento por un
//   administrador (generada o creada, si exige cambio); que la verificación de la contraseña actual no se registra como un
//   ingreso; y que NINGÚN evento lleva contraseña, hash, sal ni historial.
// Amenaza: cambios de credenciales o de privilegios sin rastro, o rastro que filtra secretos.
// Límite: la escritura real del log se hace por Local API (logAudit); aquí se observa con un Payload simulado.
import { describe, expect, it, vi } from 'vitest'

import { Auditoria } from '../../apps/cms/src/collections/Auditoria'
import { Users } from '../../apps/cms/src/collections/Users'
import {
  auditUserAfterChange,
  auditUserAfterDelete,
  auditUserLogin,
  auditUserLogout,
} from '../../apps/cms/src/hooks/users/auditUsers'
import { extractChanges } from '../../apps/cms/src/utilities/auditChanges'

const EMAIL = 'cuenta.prueba@example.invalid'
const ADMIN = 'admin.prueba@example.invalid'
const SECRET = 'Rx7#tq92Lmv5'
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

const makeReq = (user: unknown, context: Record<string, unknown> = {}) => {
  const create = vi.fn().mockResolvedValue({})
  return { req: { user, context, headers: new Headers(), payload: { create } } as never, create }
}
const events = (create: ReturnType<typeof vi.fn>) =>
  create.mock.calls.filter((c) => c[0].collection === 'auditoria').map((c) => c[0].data)

const admin = { id: 1, email: ADMIN, role: 'superadmin', collection: 'users' }
const doc = (extra: Record<string, unknown> = {}) => ({
  id: 9,
  email: EMAIL,
  role: 'editor',
  mustChangePassword: false,
  passwordChangedAt: '2026-11-12T10:00:00.000Z',
  passwordHistory: ['scrypt$secreto'],
  ...extra,
})

const assertNoSecrets = (create: ReturnType<typeof vi.fn>) => {
  const all = JSON.stringify(create.mock.calls)
  expect(all).not.toContain(SECRET)
  expect(all).not.toMatch(/scrypt\$|passwordHistory|"hash"|"salt"/)
}

describe('S5: eventos de sesión', () => {
  it('login registra el ingreso', async () => {
    const { req, create } = makeReq(null)
    await auditUserLogin({ req, user: { ...doc(), collection: 'users' }, context: {} } as never)
    expect(events(create)[0]).toMatchObject({ accion: 'login', usuario: EMAIL, resultado: 'exito', coleccion: 'users' })
    assertNoSecrets(create)
  })

  it('la verificación de la contraseña actual (cambiar-clave) no cuenta como ingreso', async () => {
    const { req, create } = makeReq(null, { verificacionClave: true })
    await auditUserLogin({ req, user: doc(), context: { verificacionClave: true } } as never)
    expect(events(create)).toHaveLength(0)
  })

  it('logout registra la salida', async () => {
    const { req, create } = makeReq({ ...doc(), collection: 'users' })
    await auditUserLogout({ req, context: {} } as never)
    expect(events(create)[0]).toMatchObject({ accion: 'logout', usuario: EMAIL })
  })
})

describe('S5: alta, baja y cambio de rol', () => {
  it('alta de cuenta', async () => {
    const { req, create } = makeReq(admin)
    await auditUserAfterChange({ req, operation: 'create', doc: doc({ mustChangePassword: true }), previousDoc: {}, context: {} } as never)
    expect(events(create)[0]).toMatchObject({ accion: 'crear', usuario: ADMIN, coleccion: 'users' })
    expect(events(create)[0].cambiosRelevantes).toMatchObject({ role: 'editor', mustChangePassword: true })
    assertNoSecrets(create)
  })

  it('cambio de rol con antes y después', async () => {
    const { req, create } = makeReq(admin)
    await auditUserAfterChange({ req, operation: 'update', doc: doc({ role: 'publisher' }), previousDoc: doc(), context: {} } as never)
    const ev = events(create).find((e) => e.accion === 'cambiar_rol')
    expect(ev?.cambiosRelevantes).toEqual({ role: { antes: 'editor', despues: 'publisher' } })
  })

  it('baja de cuenta', async () => {
    const { req, create } = makeReq(admin)
    await auditUserAfterDelete({ req, id: 9, doc: doc(), context: {} } as never)
    expect(events(create)[0]).toMatchObject({ accion: 'eliminar', usuario: ADMIN, coleccion: 'users' })
    assertNoSecrets(create)
  })

  it('una edición sin cambio de rol ni de contraseña no genera eventos de seguridad', async () => {
    const { req, create } = makeReq(admin)
    await auditUserAfterChange({ req, operation: 'update', doc: doc({ telefono: '1' }), previousDoc: doc(), context: {} } as never)
    expect(events(create)).toHaveLength(0)
  })
})

describe('S5: cambio de contraseña propio con motivo', () => {
  const changed = doc({ passwordChangedAt: '2026-11-12T12:00:00.000Z' })
  const casos: Array<[string, Record<string, unknown>, string]> = [
    ['voluntario', { passwordChangedAt: daysAgo(10) }, 'voluntario'],
    ['primer ingreso o restablecida', { mustChangePassword: true }, 'primer_ingreso_o_restablecida'],
    ['vencida', { passwordChangedAt: daysAgo(120) }, 'vencida'],
    ['sin fecha previa (vencida)', { passwordChangedAt: null }, 'vencida'],
  ]
  for (const [nombre, previo, motivo] of casos) {
    it(nombre, async () => {
      const { req, create } = makeReq({ ...doc(), collection: 'users' }, { selfChange: true })
      await auditUserAfterChange({ req, operation: 'update', doc: changed, previousDoc: doc(previo), context: { selfChange: true } } as never)
      const ev = events(create).find((e) => e.accion === 'cambiar_clave')
      expect(ev).toMatchObject({ usuario: EMAIL, resultado: 'exito' })
      expect(ev?.cambiosRelevantes).toMatchObject({ motivo })
      assertNoSecrets(create)
    })
  }
})

describe('S5: restablecimiento por un administrador', () => {
  it('desde el endpoint (modo generar, exige cambio)', async () => {
    const ctx = { modoRestablecimiento: 'generar', exigirCambio: true }
    const { req, create } = makeReq(admin, ctx)
    await auditUserAfterChange({
      req,
      operation: 'update',
      doc: doc({ mustChangePassword: true, passwordChangedAt: '2026-11-12T12:00:00.000Z' }),
      previousDoc: doc(),
      context: ctx,
    } as never)
    const ev = events(create).find((e) => e.accion === 'restablecer_clave')
    expect(ev).toMatchObject({ usuario: ADMIN, rol: 'superadmin' })
    expect(ev?.cambiosRelevantes).toEqual({ modo: 'generar', exigirCambio: true })
    expect(String(ev?.documento)).toContain(EMAIL)
    assertNoSecrets(create)
  })

  it('desde la edición de la ficha (modo crear)', async () => {
    const { req, create } = makeReq(admin)
    await auditUserAfterChange({
      req,
      operation: 'update',
      doc: doc({ mustChangePassword: true, passwordChangedAt: '2026-11-12T12:00:00.000Z' }),
      previousDoc: doc(),
      context: {},
    } as never)
    expect(events(create).find((e) => e.accion === 'restablecer_clave')?.cambiosRelevantes).toEqual({ modo: 'crear', exigirCambio: true })
  })
})

describe('S5: configuración del log', () => {
  it('Auditoria acepta cambiar_clave y restablecer_clave', () => {
    const accion = Auditoria.fields.find((f) => 'name' in f && f.name === 'accion') as { options: Array<{ value: string }> }
    const values = accion.options.map((o) => o.value)
    expect(values).toEqual(expect.arrayContaining(['login', 'logout', 'crear', 'eliminar', 'cambiar_rol', 'cambiar_clave', 'restablecer_clave']))
  })

  it('extractChanges nunca copia el historial de contraseñas', () => {
    expect(extractChanges({}, { passwordHistory: ['scrypt$x'], nota: 'a' })).toEqual({ nota: { antes: undefined, despues: 'a' } })
  })

  it('Users registra los hooks de auditoría y de ciclo de vida', () => {
    expect(Users.hooks?.afterLogin).toContain(auditUserLogin)
    expect(Users.hooks?.afterLogout).toContain(auditUserLogout)
    expect(Users.hooks?.afterChange).toContain(auditUserAfterChange)
    expect(Users.hooks?.afterDelete).toContain(auditUserAfterDelete)
  })
})
