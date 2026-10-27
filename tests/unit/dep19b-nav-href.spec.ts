// DEP-19b (Frente 5): la navegación editable del CMS no puede producir `href` ejecutables.
// Amenaza: quien edite el global Navegación (o una cuenta comprometida) guarda `javascript:` como URL
// manual y el clic ejecuta código en el origen del portal. Límite: render del servidor con next-intl
// simulado; no ejercita el menú móvil abierto ni el hidratado en navegador.
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Simulaciones mínimas: next-intl y la navegación localizada no son el objeto de la prueba.
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/i18n/navigation', () => ({
  Link: (props: any) => React.createElement('a', { ...props, href: String(props.href) }, props.children),
  usePathname: () => '/',
}))
vi.mock('@/components/layout/LocaleSwitcher', () => ({ default: () => null }))

import MegaMenu, { mapCmsNavigation } from '@/components/navigation/MegaMenu'

const HOSTILE = ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,<script>1</script>', '//evil.com/x']

const nav = (url: string, childUrl: string = url): any => ({
  id: 1,
  links: [
    {
      id: 'a',
      label: 'Enlace',
      type: 'manual',
      url,
      children: [{ id: 'b', label: 'Hijo', type: 'manual', url: childUrl }],
    },
  ],
})

describe('mapCmsNavigation: URLs hostiles -> #', () => {
  it.each(HOSTILE)('padre e hijo con %j', (url) => {
    const [item] = mapCmsNavigation(nav(url))
    expect(item.href).toBe('#')
    expect(item.children?.[0].href).toBe('#')
  })
})

describe('mapCmsNavigation: enlaces legítimos intactos', () => {
  it.each(['https://unc.edu.py/x', 'mailto:a@unc.edu.py', 'tel:+595123', '/noticias', '#ancla'])('%s', (url) => {
    const [item] = mapCmsNavigation(nav(url))
    expect(item.href).toBe(url)
    expect(item.children?.[0].href).toBe(url)
  })

  it('relationship con página relacionada -> /<slug>', () => {
    const [item] = mapCmsNavigation({
      id: 1,
      links: [{ id: 'r', label: 'R', type: 'relationship', page: { slug: 'historia' } }],
    } as any)
    expect(item.href).toBe('/historia')
  })

  it('manual sin url -> #', () => {
    const [item] = mapCmsNavigation({ id: 1, links: [{ id: 'r', label: 'R', type: 'manual', url: null }] } as any)
    expect(item.href).toBe('#')
  })
})

describe('MegaMenu renderizado con URL hostil', () => {
  // Sin hijos el enlace de primer nivel se pinta ya en el primer render; los hijos solo aparecen al abrir
  // el submenú (estado de cliente), por eso su saneado se prueba en mapCmsNavigation.
  it.each(HOSTILE)('el HTML no contiene el payload %j', (url) => {
    const navigation = { id: 1, links: [{ id: 'a', label: 'Enlace', type: 'manual', url, children: [] }] } as any
    const html = renderToStaticMarkup(React.createElement(MegaMenu, { navigation }))
    expect(html.toLowerCase()).not.toContain('javascript:')
    expect(html).not.toContain('//evil.com')
    expect(html).not.toContain('data:text/html')
    expect(html).toContain('Enlace')
  })
})
