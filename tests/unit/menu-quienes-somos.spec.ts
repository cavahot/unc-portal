// INST-01: el menú Institucional incluye «Quiénes somos» como primera opción del submenú, con un enlace que cae en la
// sección «Quiénes somos» de /institucional. Amenaza que evita: un enlace al ancla que deje de existir si se renombra
// el id de la sección (el menú llevaría al inicio de la página sin avisar). Límite: render del servidor con next-intl
// simulado; no ejercita el menú abierto ni el desplazamiento en el navegador.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/i18n/navigation', () => ({
  Link: (props: any) => React.createElement('a', { ...props, href: String(props.href) }, props.children),
  usePathname: () => '/',
}))
vi.mock('@/components/layout/LocaleSwitcher', () => ({ default: () => null }))

import { fallbackMenuData } from '@/components/navigation/MegaMenu'

const root = process.cwd()

describe('menú Institucional: Quiénes somos', () => {
  const institucional = fallbackMenuData.find((item) => item.href === '/institucional')

  it('aparece en el submenú, antes de Historia, apuntando a la sección de /institucional', () => {
    const labels = (institucional?.children ?? []).map((c) => c.label)
    expect(labels[0]).toBe('Quiénes somos')
    expect(labels.indexOf('Quiénes somos')).toBeLessThan(labels.indexOf('Historia'))
    expect(institucional?.children?.[0].href).toBe('/institucional#inst-sobre')
  })

  it('el ancla del enlace existe en la página de la institución', () => {
    const page = readFileSync(resolve(root, 'app/[locale]/institucional/page.tsx'), 'utf8')
    expect(page).toContain('id="inst-sobre"')
  })
})
