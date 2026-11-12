// SEC-CUENTAS-04: recuperación de emergencia de un superadmin desde el servidor (odd/tasks/seguridad-cuentas.md, S8).
// Qué comprueba: sin --confirmar no cambia nada; con --confirmar fija una contraseña generada que cumple la política,
// exige el cambio, desbloquea, cierra sesiones y deja auditado quién la ejecutó; solo actúa sobre superadmins.
// Amenaza: quedarse sin ningún administrador (la recuperación por correo está cerrada) sin reabrir una vía web.
// Límite: `payload` simulado; la prueba real contra el CMS local va en el log de la tarea.
import { describe, expect, it, vi } from 'vitest'

const logAudit = vi.fn()
vi.mock('../../apps/cms/src/utilities/audit', () => ({
  logAudit: (...args: unknown[]) => logAudit(...args),
  getClientIP: () => 'unknown',
}))

import { isPasswordAcceptable } from '../../apps/cms/src/config/passwordPolicy'
import { parseRecoveryArgs, recuperarSuperadmin } from '../../apps/cms/src/bin/recuperarSuperadmin'
import { auditUserAfterChange } from '../../apps/cms/src/hooks/users/auditUsers'

const EMAIL = 'admin.prueba@example.invalid'

/** Payload simulado con una cuenta y sus sesiones; registra lo que se escribe. */
function fakePayload(account: Record<string, unknown> | null) {
  const stored = account ? { ...account, sessions: [{ id: 's1' }, { id: 's2' }] } : null
  return {
    find: vi.fn(async () => ({ docs: stored ? [stored] : [] })),
    update: vi.fn(async () => stored),
    unlock: vi.fn(async () => true),
    db: {
      findOne: vi.fn(async () => (stored ? { ...stored } : null)),
      updateOne: vi.fn(async () => ({})),
    },
  }
}

describe('S8: argumentos', () => {
  it('lee --email, --operador y --confirmar', () => {
    expect(parseRecoveryArgs(['--email', EMAIL, '--operador', 'Mesa de ayuda TI', '--confirmar'])).toEqual({
      email: EMAIL,
      operador: 'Mesa de ayuda TI',
      confirmar: true,
    })
    expect(parseRecoveryArgs(['--email', EMAIL, '--operador', 'X'])).toMatchObject({ confirmar: false })
  })
})

describe('S8: recuperación de emergencia', () => {
  const superadmin = { id: 7, email: EMAIL, role: 'superadmin' }

  it('sin --confirmar solo informa el plan y no escribe nada', async () => {
    const payload = fakePayload(superadmin)
    const out = await recuperarSuperadmin(payload as never, { email: EMAIL, operador: 'Mesa de ayuda TI', confirmar: false })
    expect(out).toMatchObject({ ok: true, simulacion: true })
    expect(out).not.toHaveProperty('clave')
    expect(payload.update).not.toHaveBeenCalled()
    expect(payload.unlock).not.toHaveBeenCalled()
    expect(payload.db.updateOne).not.toHaveBeenCalled()
  })

  it('con --confirmar fija una contraseña generada que cumple la política, exige el cambio, desbloquea y cierra sesiones', async () => {
    const payload = fakePayload(superadmin)
    const out = (await recuperarSuperadmin(payload as never, { email: EMAIL, operador: 'Mesa de ayuda TI', confirmar: true })) as {
      ok: boolean
      clave: string
    }
    expect(out.ok).toBe(true)
    expect(out.clave).toHaveLength(16)
    expect(isPasswordAcceptable(out.clave, { email: EMAIL })).toBe(true)

    const call = payload.update.mock.calls[0][0] as Record<string, any>
    expect(call).toMatchObject({ collection: 'users', id: 7, overrideAccess: true, data: { password: out.clave } })
    expect(call.context).toMatchObject({ exigirCambio: true, recuperacionEmergencia: { operador: 'Mesa de ayuda TI' } })
    expect(payload.unlock).toHaveBeenCalledWith(expect.objectContaining({ collection: 'users', data: { email: EMAIL }, overrideAccess: true }))
    const saved = payload.db.updateOne.mock.calls[0][0] as { data: { sessions: unknown[] } }
    expect(saved.data.sessions).toEqual([])
  })

  // Hallazgo A2 del verificador: si un paso posterior falla, la contraseña ya cambió; sin mostrarla, el operador quedaría
  // sin la provisoria. Debe devolverse igual, con el aviso de qué paso falló.
  it('si falla el desbloqueo o el cierre de sesiones después del cambio, devuelve igual la contraseña con avisos', async () => {
    const payload = fakePayload(superadmin)
    payload.unlock.mockRejectedValueOnce(new Error('db caída'))
    payload.db.updateOne.mockRejectedValueOnce(new Error('db caída'))
    const out = (await recuperarSuperadmin(payload as never, { email: EMAIL, operador: 'Mesa de ayuda TI', confirmar: true })) as {
      ok: boolean
      clave: string
      avisos: string[]
    }
    expect(out.ok).toBe(true)
    expect(out.clave).toHaveLength(16)
    expect(out.avisos).toHaveLength(2)
    expect(out.avisos.join(' ')).toMatch(/desbloquear/)
    expect(out.avisos.join(' ')).toMatch(/sesiones/)
    expect(out.avisos.join(' ')).not.toContain('db caída')
  })

  it('solo actúa sobre superadmins: las demás cuentas las restablece un superadmin desde el panel', async () => {
    const payload = fakePayload({ id: 8, email: EMAIL, role: 'editor' })
    const out = await recuperarSuperadmin(payload as never, { email: EMAIL, operador: 'Mesa de ayuda TI', confirmar: true })
    expect(out).toMatchObject({ ok: false })
    expect((out as { error: string }).error).toMatch(/superadmin/)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('cuenta inexistente o datos faltantes: error sin escribir', async () => {
    const vacio = fakePayload(null)
    expect(await recuperarSuperadmin(vacio as never, { email: EMAIL, operador: 'Mesa de ayuda TI', confirmar: true })).toMatchObject({ ok: false })
    const p = fakePayload(superadmin)
    expect(await recuperarSuperadmin(p as never, { email: '', operador: 'Mesa de ayuda TI', confirmar: true })).toMatchObject({ ok: false })
    expect(await recuperarSuperadmin(p as never, { email: EMAIL, operador: '', confirmar: true })).toMatchObject({ ok: false })
    expect(p.update).not.toHaveBeenCalled()
    expect(vacio.update).not.toHaveBeenCalled()
  })

  it('la auditoría registra la recuperación de emergencia con el operador, sin la contraseña', async () => {
    logAudit.mockClear()
    const req = { user: null, payload: {}, context: { exigirCambio: true, modoRestablecimiento: 'generar', recuperacionEmergencia: { operador: 'Mesa de ayuda TI' } } }
    await auditUserAfterChange({
      req,
      operation: 'update',
      doc: { id: 7, email: EMAIL, role: 'superadmin', mustChangePassword: true, passwordChangedAt: '2026-11-12T23:00:00.000Z' },
      previousDoc: { id: 7, email: EMAIL, role: 'superadmin', passwordChangedAt: null },
    } as never)
    const entry = logAudit.mock.calls[0][0] as Record<string, any>
    expect(entry).toMatchObject({ accion: 'restablecer_clave', rol: 'system' })
    expect(entry.usuario).toMatch(/recuperación de emergencia/i)
    expect(entry.usuario).toContain('Mesa de ayuda TI')
    expect(entry.cambiosRelevantes).toMatchObject({ modo: 'emergencia', exigirCambio: true })
  })
})
