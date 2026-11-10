// NAV-SCROLL-01: al cambiar de idioma (o navegar) la página nueva empieza arriba, en el hero.
// Qué comprueba: si `<html>` tiene `scroll-behavior: smooth` (app/globals.css), el `<html>` del layout raíz lleva
// `data-scroll-behavior="smooth"`. Por qué: desde Next 16 solo con ese atributo Next desactiva el desplazamiento suave durante
// la navegación (node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md). Sin él, el desplazamiento al inicio
// quedaba a medias y la portada en guaraní abría en la sección de noticias (reproducido el 2026-11-10: scrollY 2895).
// Límite: verifica la configuración; el comportamiento se comprobó en el navegador.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('app/globals.css', 'utf8')
const layout = readFileSync('app/layout.tsx', 'utf8')

describe('NAV-SCROLL-01: navegación que empieza arriba', () => {
  it('el html con desplazamiento suave declara data-scroll-behavior="smooth" en el layout raíz', () => {
    expect(css).toMatch(/html\s*\{[^}]*scroll-behavior:\s*smooth/)
    expect(layout).toMatch(/<html[^>]*data-scroll-behavior="smooth"/)
  })
})
