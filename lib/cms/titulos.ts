// TITULOS-01 (T2): dominio de /titulos (spec docs/specs/portal/TITULOS.md §2).
// Funciones puras: sin red ni React, para que la consulta, la página y las pruebas compartan las mismas reglas.
// Qué hace: convierte el documento del global `titulos-inscripcion` del CMS en datos listos para pintar, validando
// de nuevo lo que el CMS ya valida (defensa en profundidad: la respuesta de la red no es de confianza ciega).
// Amenazas que evita: (1) un `acento` libre llevado a un atributo del HTML; (2) un enlace del CONES hacia otro host;
// (3) un monto de arancel inventado o desactualizado (solo sale de la fila publicada de `aranceles-rectorado`);
// (4) pintar filas vacías o incompletas. Límite: no traduce el contenido (el CMS es solo en español).
import { MAX_MONTO } from './aranceles'

/** Hosts EXACTOS aceptados para la nota del CONES. La misma lista vive en el CMS (`CONES_HOSTS`); lo comprueba un test. */
export const CONES_HOSTS = ['www.cones.gov.py', 'cones.gov.py'] as const

/** Colores de acento permitidos (lista cerrada, igual al `select` del CMS; lo comprueba un test). */
export const ACENTOS = ['verde', 'azul', 'violeta'] as const
export type TituloAcento = (typeof ACENTOS)[number]

export interface TituloTipo {
  slug: string
  etiqueta: string
  titulo: string
  subtitulo: string | null
  acento: TituloAcento
  requisitos: string[]
}

export interface TituloPaso {
  /** Posición (1, 2, 3…) calculada aquí: el editor solo ordena la lista. */
  numero: number
  responsable: string
  descripcion: string
}

export interface TitulosInscripcionData {
  titulo: string
  descripcion: string
  unidad: string
  /** Horas hábiles. `null` si el CMS trae un plazo incoherente: se omite sin ocultar el resto de la página. */
  plazo: { min: number; max: number } | null
  /** Solo de una fila publicada y poblada de `aranceles-rectorado`; si no, `null` (la página enlaza a los aranceles). */
  arancel: { concepto: string; monto: number } | null
  /** `url` es `null` si el host no es del CONES: se muestra el texto sin enlace. */
  notaCones: { texto: string; url: string | null } | null
  tipos: TituloTipo[]
  pasos: TituloPaso[]
  updatedAt: string | null
}

type Json = Record<string, unknown>

/** Objeto plano (no `null`, no arreglo). */
export function isPlainObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

function safeConesUrl(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    return (CONES_HOSTS as readonly string[]).includes(url.hostname.toLowerCase()) ? url.toString() : null
  } catch {
    return null
  }
}

function mapAcento(value: unknown): TituloAcento {
  return (ACENTOS as readonly unknown[]).includes(value) ? (value as TituloAcento) : 'verde'
}

function mapPlazo(min: unknown, max: unknown): { min: number; max: number } | null {
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1
  return ok(min) && ok(max) && min <= max ? { min, max } : null
}

function mapArancel(value: unknown): { concepto: string; monto: number } | null {
  // Un id suelto (relación sin poblar) o `null` no es una fila publicada: no hay monto que mostrar.
  if (!isPlainObject(value) || value.active === false) return null
  const concepto = text(value.concepto)
  const monto = value.monto
  if (!concepto || typeof monto !== 'number' || !Number.isFinite(monto) || monto <= 0 || monto > MAX_MONTO) return null
  return { concepto, monto }
}

function mapNota(value: unknown): { texto: string; url: string | null } | null {
  if (!isPlainObject(value)) return null
  const texto = text(value.texto)
  return texto ? { texto, url: safeConesUrl(value.url) } : null
}

function mapTipos(value: unknown): TituloTipo[] {
  if (!Array.isArray(value)) return []
  const tipos: TituloTipo[] = []
  for (const row of value) {
    if (!isPlainObject(row)) continue
    const slug = text(row.slug)
    const etiqueta = text(row.etiqueta)
    const titulo = text(row.titulo)
    const requisitos = (Array.isArray(row.requisitos) ? row.requisitos : [])
      .map((r) => (isPlainObject(r) ? text(r.texto) : ''))
      .filter(Boolean)
    // Un tipo sin identificador, rótulo, título o requisitos no aporta nada que mostrar.
    if (!slug || !etiqueta || !titulo || requisitos.length === 0) continue
    tipos.push({ slug, etiqueta, titulo, subtitulo: text(row.subtitulo) || null, acento: mapAcento(row.acento), requisitos })
  }
  return tipos
}

function mapPasos(value: unknown): TituloPaso[] {
  if (!Array.isArray(value)) return []
  const valid = value
    .map((row) => (isPlainObject(row) ? { responsable: text(row.responsable), descripcion: text(row.descripcion) } : null))
    .filter((p): p is { responsable: string; descripcion: string } => Boolean(p && p.responsable && p.descripcion))
  return valid.map((p, i) => ({ numero: i + 1, ...p }))
}

/**
 * Convierte el documento del CMS en datos para la página, o `null` si no hay contenido publicable: faltan el
 * título, la descripción o la unidad, o no hay ni un tipo con requisitos ni un paso.
 */
export function mapTitulosInscripcion(raw: unknown): TitulosInscripcionData | null {
  if (!isPlainObject(raw)) return null
  const titulo = text(raw.titulo)
  const descripcion = text(raw.descripcion)
  const unidad = text(raw.unidad)
  const tipos = mapTipos(raw.tipos)
  const pasos = mapPasos(raw.pasos)
  if (!titulo || !descripcion || !unidad || tipos.length === 0 || pasos.length === 0) return null
  return {
    titulo,
    descripcion,
    unidad,
    plazo: mapPlazo(raw.plazoMinHoras, raw.plazoMaxHoras),
    arancel: mapArancel(raw.arancel),
    notaCones: mapNota(raw.notaCones),
    tipos,
    pasos,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  }
}
