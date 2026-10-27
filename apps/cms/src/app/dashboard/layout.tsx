import React from 'react'

/**
 * Layout raíz mínimo de /dashboard (DEP-SEC-01).
 * Por qué existe: Next 16.4 exige un layout raíz para cada página; sin él, la compilación de esta página falla y el
 * servidor de desarrollo del CMS responde 500 en todas sus rutas (panel y API). No agrega estilos ni lógica: la
 * autorización sigue en las rutas /api/dashboard/* (DEP-04), no en este layout.
 */
export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
