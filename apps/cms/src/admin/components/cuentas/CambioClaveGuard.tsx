'use client'

// SEC-CUENTAS-03 (S1, S4): proveedor del panel que obliga a cambiar la contraseña y avisa del vencimiento.
// Qué hace: si la cuenta debe cambiarla (marca del servidor o vencida) redirige toda ruta del panel a
//   /cambiar-clave (salvo esa vista y el cierre de sesión); si faltan 14 días o menos muestra un aviso descartable.
// Por qué existe: guía a la persona; el bloqueo REAL de acciones lo hace el servidor, aquí solo se evita una pantalla rota.
// Límite: leer el estado desde el navegador no es un control de seguridad; un cliente alterado se topa con el servidor.
import React, { useEffect, useState } from 'react'
import { useAuth } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import { CAMBIAR_CLAVE_PATH, bannerInfo, redirectTarget, type CuentaUsuario } from './logic'

export const CambioClaveGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [oculto, setOculto] = useState(false)
  const cuenta = (user ?? null) as CuentaUsuario | null
  const destino = redirectTarget(pathname, cuenta)
  const aviso = bannerInfo(cuenta)

  useEffect(() => {
    if (destino) router.replace(destino)
  }, [destino, router])

  return (
    <>
      {aviso && !oculto && pathname !== CAMBIAR_CLAVE_PATH && (
        <div role="status" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', background: 'var(--theme-warning-100, #fff4d6)', color: 'var(--theme-warning-900, #5c4400)', fontSize: '14px' }}>
          <span>{aviso.text}</span>
          <a href={CAMBIAR_CLAVE_PATH} style={{ fontWeight: 600, color: 'inherit' }}>
            Cambiar contraseña
          </a>
          <button type="button" onClick={() => setOculto(true)} aria-label="Cerrar aviso" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', fontSize: '16px' }}>
            ×
          </button>
        </div>
      )}
      {children}
    </>
  )
}
