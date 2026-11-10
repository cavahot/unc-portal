// MENU-CMS-01: validación de los enlaces del global Navegación (megamenú del portal).
// Qué hace: recorre los enlaces (y sus hijos) y devuelve `true` o el mensaje del primer enlace inválido: un enlace de tipo
//   «Relación (Página)» debe apuntar a una página que exista y esté PUBLICADA, y uno «Manual» debe tener dirección
//   (MENU-CMS-03: en el panel real se guardó un subenlace «Manual» con la URL vacía y el portal lo dibujaba sin destino).
// Por qué existe: el recorrido real (2026-11-09) mostró que un enlace a una página en borrador se guardaba sin aviso y el
//   portal lo dibujaba como «#» (enlace muerto) hasta que alguien publicara la página.
// Amenaza que evita: un menú público con enlaces rotos por una edición sin revisar. Límite: no revisa los enlaces
//   «Manual» (su URL la sanea el portal con `safeHref`) y no impide despublicar luego una página ya enlazada; en ese caso
//   el portal omite el enlace (lib/cms/navegacion.ts).
export interface NavLinkInput {
  label?: string | null
  type?: string | null
  url?: string | null
  page?: number | string | { id?: number | string; _status?: string | null } | null
  children?: NavLinkInput[] | null
}

/** Busca una página por id; `null` si no existe o no es legible. Se inyecta para poder probar sin Payload. */
export type PageLookup = (id: number | string) => Promise<{ _status?: string | null } | null>

const nombre = (l: NavLinkInput) => `«${(l.label ?? '').trim() || 'sin título'}»`

/** Devuelve `true` o el mensaje del primer enlace inválido (se muestra tal cual al editor). */
export async function validateNavegacionLinks(
  links: NavLinkInput[] | null | undefined,
  lookup: PageLookup,
): Promise<true | string> {
  for (const link of links ?? []) {
    for (const item of [link, ...(link.children ?? [])]) {
      if (item.type !== 'relationship') {
        // Tipo «Manual» (también por defecto): sin dirección el enlace no lleva a ninguna parte; «#» marca un grupo.
        if (!(item.url ?? '').trim()) {
          return `El enlace ${nombre(item)} es de tipo «Manual» pero no tiene dirección. Escriba la ruta (por ejemplo, /biblioteca) o «#» si es un grupo sin página propia.`
        }
        continue
      }
      const ref = item.page
      const id = ref && typeof ref === 'object' ? ref.id : ref
      if (id === undefined || id === null || id === '') {
        return `El enlace ${nombre(item)} es de tipo «Relación» pero no tiene página. Elija una página o cambie el tipo a «Manual».`
      }
      const page = await lookup(id)
      if (!page) {
        return `El enlace ${nombre(item)} apunta a una página que no existe.`
      }
      if (page._status !== 'published') {
        return `El enlace ${nombre(item)} apunta a una página que aún no está publicada. Publíquela primero: mientras tanto el enlace no aparecería en el menú.`
      }
    }
  }
  return true
}
