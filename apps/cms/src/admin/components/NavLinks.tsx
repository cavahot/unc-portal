'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminPath } from '../../config/adminRoute'

// SEC-09: enlaces del panel construidos con adminPath (routes.admin = /accesoSeguro); /admin daba 404.
const links = [
  { href: adminPath('/portal'), icon: '📊', label: 'Dashboard' },
  { href: adminPath('/portal-monitoring'), icon: '🔍', label: 'Monitoreo' },
  { href: adminPath('/portal-audit'), icon: '📋', label: 'Auditoría' },
]

export const CustomNavLinks: React.FC = () => {
  const pathname = usePathname()

  return (
    <div style={{ marginTop: '8px', marginBottom: '8px' }}>
      <div style={{
        padding: '8px 16px 4px',
        fontSize: '10px',
        fontWeight: '700',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--theme-text-secondary, #888)',
        borderTop: '1px solid var(--theme-border-color, #e2e8f0)',
        marginTop: '8px',
        paddingTop: '16px',
      }}>
        Portal UNC
      </div>
      {links.map(({ href, icon, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 16px',
              fontSize: '13.5px',
              fontWeight: active ? '600' : '400',
              color: active
                ? 'var(--theme-text, #0f172a)'
                : 'var(--theme-text-secondary, #64748b)',
              textDecoration: 'none',
              borderRadius: '6px',
              margin: '1px 8px',
              backgroundColor: active
                ? 'var(--theme-elevation-50, #f1f5f9)'
                : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: '15px' }}>{icon}</span>
            {label}
          </Link>
        )
      })}
    </div>
  )
}
