import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADMIN_ROUTE, adminPath } from '../../apps/cms/src/config/adminRoute'

/**
 * SEC-09 / DEP-04: el panel de Payload vive en `routes.admin` (/accesoSeguro). Amenaza/propósito:
 * enlaces o redirecciones hardcodeados a `/admin` caen en 404 (el operador pierde el acceso al panel
 * y a monitoreo/auditoría). La ruta debe tener una única fuente de verdad (`config/adminRoute.ts`).
 * Límite: solo revisa los archivos listados; las rutas `/api/...` no cuentan como enlaces al panel.
 */

const cms = (p: string) => readFileSync(path.resolve(__dirname, '../../apps/cms/src', p), 'utf8')

// Literal que apunta al panel: comilla/backtick seguida de /admin (con o sin subruta) y no /api/.
const HARDCODED_PANEL = /['"`]\/admin(?:[/?'"`])/

describe('ruta del panel de administración', () => {
  it.each([
    'admin/components/NavLinks.tsx',
    'admin/views/PortalDashboard.tsx',
    '(frontend)/page.tsx',
  ])('%s no hardcodea /admin hacia el panel', (file) => {
    const rel = file === '(frontend)/page.tsx' ? 'app/(frontend)/page.tsx' : file
    expect(cms(rel)).not.toMatch(HARDCODED_PANEL)
  })

  it('payload.config.ts usa ADMIN_ROUTE en routes.admin', () => {
    expect(cms('payload.config.ts')).toMatch(/routes:\s*\{\s*admin:\s*ADMIN_ROUTE\s*,?\s*\}/)
  })

  it('adminPath compone la ruta con el prefijo del panel', () => {
    expect(ADMIN_ROUTE).toBe('/accesoSeguro')
    expect(adminPath('/portal')).toBe('/accesoSeguro/portal')
    expect(adminPath()).toBe('/accesoSeguro')
  })
})
