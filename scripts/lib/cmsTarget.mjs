// SEC-REVIEW: guardia de destino, correo y hosts de origen para los guiones de la raíz que escriben en el CMS
// (migrate-wordpress, patch-missing-images). Misma política que seed-convenios / seed-autoridades.
// JS puro, sin dependencias. Los mensajes de error NUNCA incluyen contraseñas.

/** Hosts desde los que se permite descargar páginas/imágenes de origen (sitio WordPress institucional). */
export const ALLOWED_SOURCE_HOSTS = ['unc.edu.py', 'www.unc.edu.py']

/**
 * true solo para hosts de desarrollo local. Amenaza que evita: tratar como local un host ajeno.
 * Límite: compara el nombre de host, no resuelve DNS.
 */
export function isLocalCmsUrl(url) {
  try {
    const h = new URL(url).hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
  } catch {
    return false
  }
}

/**
 * Valida el destino del CMS y devuelve la URL sin barras finales. Local: siempre. Remoto: solo con
 * `allowRemote` Y https. Amenaza que evita: enviar credenciales o escribir contenido en un host equivocado.
 * Límite: no comprueba que el host sea realmente el CMS esperado.
 */
export function resolveCmsTarget({ url, allowRemote = false } = {}) {
  const target = String(url ?? '').replace(/\/+$/, '')
  let parsed
  try {
    parsed = new URL(target)
  } catch {
    throw new Error(`URL del CMS inválida: ${target}`)
  }
  if (isLocalCmsUrl(target)) return target
  if (!allowRemote) {
    throw new Error(`Este guion solo escribe en un CMS local; destino rechazado: ${target}. Use --allow-remote para un destino https explícito.`)
  }
  if (parsed.protocol !== 'https:') throw new Error('Con --allow-remote el CMS debe usar https.')
  return target
}

/**
 * Exige CMS_EMAIL (sin valor por defecto). Amenaza que evita: iniciar sesión con una cuenta administradora
 * adivinable escrita en el repositorio. Límite: no valida que el correo exista ni su rol.
 */
export function requireCmsEmail(env = process.env) {
  const email = String(env.CMS_EMAIL ?? '').trim()
  if (!email) throw new Error('Falta CMS_EMAIL (usuario superadmin o web-admin).')
  return email
}

/** true si la URL es https y su host está en la lista de orígenes permitidos. */
export function isAllowedSourceUrl(url, hosts = ALLOWED_SOURCE_HOSTS) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && hosts.includes(u.hostname)
  } catch {
    return false
  }
}

/**
 * fetch restringido al allowlist: rechaza hosts no permitidos y sigue redirecciones a mano (máx. 3),
 * validando cada salto. Amenaza que evita: SSRF / descarga desde hosts arbitrarios por una redirección.
 * Límite: no valida el contenido descargado (tipo, tamaño); eso lo decide quien llama.
 */
export async function fetchAllowedHost(url, init = {}, doFetch = globalThis.fetch, hosts = ALLOWED_SOURCE_HOSTS) {
  let current = url
  for (let hop = 0; hop <= 3; hop++) {
    if (!isAllowedSourceUrl(current, hosts)) throw new Error(`Host no permitido: ${current}`)
    const res = await doFetch(current, { ...init, redirect: 'manual' })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) throw new Error('Redirección sin destino')
      current = new URL(loc, current).toString()
      continue
    }
    return res
  }
  throw new Error('Demasiadas redirecciones')
}
