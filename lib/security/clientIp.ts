/**
 * DEP-06 / RDD-DEP-15: IP de cliente confiable para los límites de tasa.
 *
 * Qué hace: devuelve la IP del cliente leyendo SOLO `x-real-ip`.
 * Por qué: nginx fija `X-Real-IP $remote_addr` (infrastructure/nginx/nginx.conf:102), lo que
 * SUSTITUYE cualquier valor enviado por el cliente. `X-Forwarded-For` conserva a la izquierda
 * lo que el cliente envíe, así que NO se lee nunca; `request.ip` no existe en Next 16.
 * Amenaza que evita: evadir el 429 rotando `x-forwarded-for`.
 * Límite: solo es confiable si el portal únicamente es alcanzable a través de nginx
 * (compose.prod.yaml: red `internal`, sin `ports`). Si se publicara directo, el cliente
 * podría fijar `x-real-ip`. Si hay CDN/balanceador delante, `$remote_addr` sería el suyo
 * (todos compartirían cuota) y habría que configurar `set_real_ip_from` (DEP-12).
 */

/**
 * Identificador del cubo compartido cuando no hay `x-real-ip` válido (acceso directo,
 * desarrollo local, llamadas servidor-a-servidor como el hook de revalidación del CMS).
 * Falla hacia LIMITAR: un cubo único no puede evadirse rotando cabeceras; la alternativa
 * (cuota por petición o por `x-forwarded-for`) sí permitiría evadir el límite.
 */
export const NO_IP = 'no-ip'

// IPv4 o IPv6 literal: solo dígitos hexadecimales, ':' y '.', máximo 45 caracteres.
const IP_LITERAL = /^[0-9a-fA-F:.]{2,45}$/

/** Devuelve la IP confiable del cliente o `NO_IP`; nunca lee `x-forwarded-for`. */
export function getClientIp(headers: Headers): string {
  const value = headers.get('x-real-ip')?.trim()
  return value && IP_LITERAL.test(value) ? value : NO_IP
}
