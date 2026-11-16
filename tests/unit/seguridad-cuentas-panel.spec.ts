// SEC-CUENTAS-03: pruebas del panel de cuentas (odd/tasks/seguridad-cuentas.md, S1, S3, S4, S6).
// Qué comprueba: la lógica pura (redirección obligatoria, motivo, filas de la guía, cuerpos de petición, nombre a mostrar)
//   y el marcado estático de los diálogos. Límite: no hay navegador; los hooks de Payload se simulan.
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  bannerInfo,
  buildChangeBody,
  buildResetBody,
  canChange,
  canReset,
  changeDisabledReason,
  changeReason,
  displayName,
  passwordRows,
  redirectTarget,
} from '../../apps/cms/src/admin/components/cuentas/logic'
import { cuentasAdmin } from '../../apps/cms/src/admin/cuentas'

vi.mock('@payloadcms/ui', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'superadmin', email: 'root@unc.edu.py' } }),
  useDocumentInfo: () => ({ id: 'u2' }),
  useAllFormFields: () => [{}],
  useField: () => ({ value: '' }),
  useFormFields: () => ({ nombre: 'Ana', apellido: 'Gómez', email: 'ana@unc.edu.py' }),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/accesoSeguro/cambiar-clave', useRouter: () => ({ replace: () => {} }) }))

const GOOD = 'Mx7#kQ2wT9pL4'
const recent = new Date(Date.now() - 5 * 86400000).toISOString()
const old = new Date(Date.now() - 100 * 86400000).toISOString()
const nearly = new Date(Date.now() - 80 * 86400000).toISOString()

describe('redirectTarget (S1)', () => {
  it('sin sesión no redirige', () => {
    expect(redirectTarget('/accesoSeguro/collections/users', null)).toBeNull()
  })
  it('mustChangePassword lleva a la vista de cambio', () => {
    expect(redirectTarget('/accesoSeguro', { role: 'editor', mustChangePassword: true, passwordChangedAt: recent })).toBe('/accesoSeguro/cambiar-clave')
  })
  it('contraseña vencida o sin fecha lleva a la vista de cambio', () => {
    expect(redirectTarget('/accesoSeguro/portal', { role: 'editor', passwordChangedAt: old })).toBe('/accesoSeguro/cambiar-clave')
    expect(redirectTarget('/accesoSeguro/portal', { role: 'editor' })).toBe('/accesoSeguro/cambiar-clave')
  })
  it('no redirige en la vista de cambio ni en el cierre de sesión', () => {
    const u = { role: 'editor', mustChangePassword: true }
    expect(redirectTarget('/accesoSeguro/cambiar-clave', u)).toBeNull()
    expect(redirectTarget('/accesoSeguro/logout', u)).toBeNull()
  })
  it('cuenta al día no redirige', () => {
    expect(redirectTarget('/accesoSeguro', { role: 'editor', mustChangePassword: false, passwordChangedAt: recent })).toBeNull()
  })
})

describe('bannerInfo (S4)', () => {
  it('avisa con N días cuando faltan 14 o menos', () => {
    const b = bannerInfo({ role: 'editor', passwordChangedAt: nearly })
    expect(b?.text).toMatch(/^Su contraseña vence en \d+ días\. Cámbiela ahora\.$/)
  })
  it('no avisa si faltan más de 14 días ni si ya exige cambio', () => {
    expect(bannerInfo({ role: 'editor', passwordChangedAt: recent })).toBeNull()
    expect(bannerInfo({ role: 'editor', passwordChangedAt: old })).toBeNull()
  })
  it('singular con 1 día', () => {
    const d = new Date(Date.now() - 89 * 86400000 - 3600000).toISOString()
    expect(bannerInfo({ role: 'editor', passwordChangedAt: d })?.text).toContain('vence en 1 día.')
  })
})

describe('changeReason (S1)', () => {
  it('distingue primer ingreso, vencida y voluntario', () => {
    expect(changeReason({ role: 'editor', mustChangePassword: true, passwordChangedAt: recent })).toMatch(/primer ingreso|restablecida/)
    expect(changeReason({ role: 'editor', passwordChangedAt: old })).toMatch(/venci/)
    expect(changeReason({ role: 'editor', passwordChangedAt: recent })).toMatch(/Puede cambiar/)
  })
})

describe('guía de checks (S3)', () => {
  it('agrega la fila de coincidencia y marca cada regla', () => {
    const rows = passwordRows('abc', 'abd', 'ana@unc.edu.py')
    expect(rows.at(-1)).toEqual({ id: 'coinciden', label: 'Las contraseñas coinciden', ok: false })
    expect(rows.length).toBeGreaterThan(9)
    expect(passwordRows(GOOD, GOOD, 'ana@unc.edu.py').every((r) => r.ok)).toBe(true)
  })
  it('sin confirmación (modo crear) no agrega la fila', () => {
    expect(passwordRows(GOOD, undefined, 'a@b.py').some((r) => r.id === 'coinciden')).toBe(false)
  })
  it('el botón de cambio se habilita solo con todo ok y explica por qué no', () => {
    expect(canChange('actual1', GOOD, GOOD, 'ana@unc.edu.py')).toBe(true)
    expect(canChange('', GOOD, GOOD, 'ana@unc.edu.py')).toBe(false)
    expect(canChange('x', GOOD, GOOD + '1', 'ana@unc.edu.py')).toBe(false)
    expect(changeDisabledReason('', GOOD, GOOD, 'a@b.py')).toMatch(/contraseña actual/)
    expect(changeDisabledReason('x', 'abc', 'abc', 'a@b.py')).toMatch(/Cumpla todas las reglas/)
    expect(changeDisabledReason('x', GOOD, GOOD, 'a@b.py')).toBeNull()
  })
})

describe('restablecimiento (S6)', () => {
  it('generar siempre habilitado; crear exige política', () => {
    expect(canReset({ modo: 'generar', clave: '', exigirCambio: true }, 'a@b.py')).toBe(true)
    expect(canReset({ modo: 'crear', clave: 'abc', exigirCambio: true }, 'a@b.py')).toBe(false)
    expect(canReset({ modo: 'crear', clave: GOOD, exigirCambio: true }, 'a@b.py')).toBe(true)
  })
  it('construye los cuerpos del contrato', () => {
    expect(buildChangeBody('a', 'n')).toEqual({ actual: 'a', nueva: 'n' })
    expect(buildResetBody({ modo: 'generar', clave: 'ignorada', exigirCambio: true })).toEqual({ modo: 'generar', exigirCambio: true })
    expect(buildResetBody({ modo: 'crear', clave: GOOD, exigirCambio: false })).toEqual({ modo: 'crear', clave: GOOD, exigirCambio: false })
  })
  it('nombre a mostrar con respaldo al correo', () => {
    expect(displayName({ nombre: 'Ana', apellido: 'Gómez', email: 'a@b.py' })).toBe('Ana Gómez')
    expect(displayName({ email: 'a@b.py' })).toBe('a@b.py')
  })
})

describe('marcado de los diálogos (S3, S6)', () => {
  it('el diálogo de restablecimiento reproduce el texto de Google Workspace', async () => {
    const { ResetDialog } = await import('../../apps/cms/src/admin/components/cuentas/RestablecerClaveField')
    const html = renderToStaticMarkup(createElement(ResetDialog, { nombre: 'Ana Gómez', email: 'ana@unc.edu.py', userId: 'u2', onClose: () => {}, onResult: () => {} }))
    for (const t of ['Restablecer la contraseña de', 'Ana Gómez', 'Generar una contraseña automáticamente', 'En el siguiente paso podrás ver y copiar la contraseña', 'Crear contraseña', 'Pedirle al usuario que cambie la contraseña cuando acceda', 'CANCELAR', 'RESTABLECER'])
      expect(html).toContain(t)
  })
  it('la pantalla de resultado no muestra la clave en claro por defecto', async () => {
    const { ResultDialog } = await import('../../apps/cms/src/admin/components/cuentas/RestablecerClaveField')
    const html = renderToStaticMarkup(createElement(ResultDialog, { nombre: 'Ana Gómez', clave: 'SecretoUnico#123', onDone: () => {} }))
    expect(html).toContain('La contraseña se restableció correctamente')
    expect(html).toContain('COPIAR LA CONTRASEÑA')
    expect(html).toContain('LISTO')
    expect(html).not.toContain('SecretoUnico#123')
  })
  it('la vista de cambio muestra título, campos y aria-live', async () => {
    const { CambiarClaveView } = await import('../../apps/cms/src/admin/components/cuentas/CambiarClaveView')
    const html = renderToStaticMarkup(createElement(CambiarClaveView))
    for (const t of ['Cambie su contraseña', 'Contraseña actual', 'Contraseña nueva', 'Confirmar contraseña nueva', 'Cerrar sesión', 'aria-live']) expect(html).toContain(t)
  })
})

describe('registro (cuentas.ts)', () => {
  it('expone proveedor, vista y campo con la convención path y exportName', () => {
    expect(cuentasAdmin.provider).toEqual({ path: './admin/components/cuentas/CambioClaveGuard', exportName: 'CambioClaveGuard' })
    expect(cuentasAdmin.view.path).toBe('/cambiar-clave')
    expect(cuentasAdmin.restablecerClaveField).toMatchObject({ type: 'ui', name: 'restablecerClave', admin: { position: 'sidebar' } })
  })
})
