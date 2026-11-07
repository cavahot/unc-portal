// TITULOS-01: marca de color de cada tipo de universidad (spec docs/specs/portal/TITULOS.md §2.1).
// Qué hace: traduce el `acento` del CMS (lista cerrada) a una clase de Tailwind propia.
// Amenaza que evita: llevar un valor del CMS a un atributo `style` o a una clase arbitraria (inyección de CSS);
// aquí solo hay tres clases fijas. Límite: es un marcador decorativo de 10 px, nunca el color de la página.
import type { TituloAcento } from '@/lib/cms/titulos'

export const ACENTO_BG: Record<TituloAcento, string> = {
  verde: 'bg-[#00A300]',
  azul: 'bg-[#2563EB]',
  violeta: 'bg-[#7C3AED]',
}
