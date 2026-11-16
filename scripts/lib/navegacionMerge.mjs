// MENU-CMS-07: agrega al menú GUARDADO los subenlaces del menú base que le faltan (p. ej. «Docencia» bajo «Academia»).
// Qué hace: compara el global `navegacion` guardado con `NAVEGACION_SEED` y devuelve el menú con los subenlaces nuevos
//   insertados junto a sus vecinos del menú base. Nunca borra, mueve ni cambia un enlace existente.
// Por qué existe: el menú guardado en la base no cambia cuando el código agrega una sección; `seed-navegacion` se omite si
//   ya hay menú, y editarlo a mano en el panel es propenso a errores (incidente del 2026-11-10).
// Límite: solo agrega subenlaces bajo enlaces principales que ya existen (por etiqueta); no agrega enlaces principales.

const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

/** Direcciones «Manual» usadas en todo el menú guardado (un enlace movido a otro grupo no se duplica). */
function usedUrls(links) {
  const used = new Set()
  for (const link of Array.isArray(links) ? links : []) {
    for (const item of [link, ...(Array.isArray(link.children) ? link.children : [])]) {
      if (item?.type !== 'relationship' && norm(item?.url)) used.add(norm(item.url))
    }
  }
  return used
}

/**
 * @param {Array} saved  enlaces del global `navegacion` (depth 0)
 * @param {Array} seed   NAVEGACION_SEED
 * @param {{ maxChildren?: number }} [opts]
 * @returns {{ links: Array, added: Array<{ parent: string, label: string, url: string }>, skipped: Array<{ parent: string, label: string, reason: string }> }}
 */
export function mergeMissingSeedLinks(saved, seed, { maxChildren = 20 } = {}) {
  const links = (Array.isArray(saved) ? saved : []).map((l) => ({ ...l, children: Array.isArray(l.children) ? [...l.children] : l.children }))
  const used = usedUrls(saved)
  const added = []
  const skipped = []

  for (const seedParent of seed) {
    const seedChildren = Array.isArray(seedParent.children) ? seedParent.children : []
    if (seedChildren.length === 0) continue
    const parent = links.find((l) => norm(l.label) === norm(seedParent.label))
    if (!parent) continue

    seedChildren.forEach((child, index) => {
      if (used.has(norm(child.url))) return
      const children = Array.isArray(parent.children) ? parent.children : []
      if (children.length >= maxChildren) {
        skipped.push({ parent: parent.label, label: child.label, reason: `el grupo ya tiene ${maxChildren} subenlaces` })
        return
      }
      // Posición: antes del siguiente vecino del menú base que esté guardado; si no, después del anterior; si no, al final.
      const indexOf = (url) => children.findIndex((c) => norm(c?.url) === norm(url))
      const next = seedChildren.slice(index + 1).map((c) => indexOf(c.url)).find((i) => i >= 0)
      const prev = seedChildren.slice(0, index).reverse().map((c) => indexOf(c.url)).find((i) => i >= 0)
      const at = next !== undefined ? next : prev !== undefined ? prev + 1 : children.length
      const nuevo = { label: child.label, type: 'manual', url: child.url, newTab: false }
      parent.children = [...children.slice(0, at), nuevo, ...children.slice(at)]
      used.add(norm(child.url))
      added.push({ parent: parent.label, label: child.label, url: child.url })
    })
  }
  return { links, added, skipped }
}
