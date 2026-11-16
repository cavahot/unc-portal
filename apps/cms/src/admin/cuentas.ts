// SEC-CUENTAS-03: registro de las piezas del panel de cuentas que payload.config.ts y Users.ts deben enchufar.
// Qué es: configuración declarativa (rutas de componentes con la convención path + exportName del resto del panel).
// Por qué existe: mantiene el cableado en un solo lugar sin tocar la configuración desde este módulo.
// Límite: solo describe; el servidor sigue siendo quien impone el cambio obligatorio (S1).
import type { UIField } from 'payload'

export const cuentasAdmin = {
  /** `admin.components.providers`: redirección obligatoria y aviso de vencimiento. */
  provider: { path: './admin/components/cuentas/CambioClaveGuard', exportName: 'CambioClaveGuard' },
  /** Entrada para `admin.components.views` bajo la clave `CambiarClave`. */
  viewKey: 'CambiarClave',
  view: {
    Component: { path: './admin/components/cuentas/CambiarClaveView', exportName: 'CambiarClaveView' },
    path: '/cambiar-clave',
  },
  /** Reemplazo de la vista integrada `forgot` (clave reservada de Payload): la recuperación por correo está cerrada. */
  forgotView: {
    Component: { path: './admin/components/cuentas/RecuperacionCerradaView', exportName: 'RecuperacionCerradaView' },
    path: '/forgot',
  },
  /** Campo `ui` para la barra lateral de la ficha de Users (el botón solo aparece a un superadmin sobre otra cuenta). */
  restablecerClaveField: {
    name: 'restablecerClave',
    type: 'ui',
    admin: {
      position: 'sidebar',
      components: { Field: { path: './admin/components/cuentas/RestablecerClaveField', exportName: 'RestablecerClaveField' } },
    },
  } satisfies UIField,
} as const
