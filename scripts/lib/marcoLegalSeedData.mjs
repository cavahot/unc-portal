/**
 * marcoLegalSeedData.mjs — MLG-01
 *
 * Los 44 documentos que hoy publica https://www.unc.edu.py/marco-legal/ (tabla «Documento | Enlace»), en el
 * mismo orden. Inventario entregado por el orquestador el 24-10-26 (RDD-MLG-03); la categoría es la asignación
 * acordada para el portal nuevo. Spec: docs/specs/portal/MARCO-LEGAL.md §5.
 *
 * Clave natural: `title` (exacto). El título 7 conserva la errata de comillas del sitio publicado
 * («Título VI » Del Régimen Disciplinario»»): se corrige desde el panel, no aquí, para que el seed siga
 * reconociendo la fila ya cargada.
 * Límite: los ids de Drive no se verificaron uno por uno; el archivo debe seguir compartido públicamente.
 */

export const MARCO_LEGAL_DOCS = [
  { title: 'Estatuto UNC', driveId: '1I0rEzgzZcOFulmBzOrc9JHEC2oltTY68', category: 'estatuto' },
  { title: 'Reglamento General UNC: Título I «De la naturaleza, fines y composición de la Universidad»', driveId: '1qsB0cPzlIUX2734kbj0sm-smahnnIspd', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título II «De los órganos de gobierno, forma de integración, deberes y atribuciones»', driveId: '1vDeyN6Jvk6lg3YdfgSLRgbL_lYnozN4V', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título III «Del Régimen Electoral»', driveId: '1298PVVEPOzZZw9vcXQfnQQWQW1Z_Hcpq', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título IV «De las Unidades Académicas»', driveId: '1hYHozQYsKlBFVqCFyGFOpVo5tgB19FB9', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título V «Del Régimen Académico»', driveId: '1c5cpR3wP3YLHneAG9d1XgE6VdTNzWR0U', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título VI » Del Régimen Disciplinario»', driveId: '1SXFvrFrvHQnuM1lPX3J62qQPh3PfWfiA', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título VII «De las becas y ayudas económicas»', driveId: '17MFvM3WIRrvbUMQfykcQaWaaA8KAgcMn', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título VIII «De los programas de posgrado»', driveId: '1DyaUHktdfnX5UGZIn8ji7aM2luFWoovF', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título IX «De la extensión universitaria»', driveId: '1FbM7fxBl5zVWKFmebc7NIkRvxHoutFRO', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título X «De la carrera docente»', driveId: '1jP1tR4FfDhRCIkqNByxGKXIvg7EjkG6X', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título XI «De la investigación»', driveId: '1STqe3lrymOSY8vLKxJ-aPnGN4l-Tq8ov', category: 'reglamento-general' },
  { title: 'Reglamento General UNC: Título XII «De los mecanismos de selección, promoción y evaluación de funcionarios administrativos de la UNC»', driveId: '1Znre4aCmBwZWXREJTXJU7FXBZK7PziCh', category: 'reglamento-general' },
  { title: 'Reglamento de Funcionamiento CSU', driveId: '1J6J62UcGtL_abXqnCgma6S61E8opPJKb', category: 'reglamentos-especiales' },
  { title: 'Código de Ética UNC', driveId: '1z00oUla3Bz8m7ePzoR6YbitiFeAKXsCJ', category: 'codigos' },
  { title: 'Código de Ética UNC-Versión 2', driveId: '18avjC_E37WXMGTNA8r9XxfLs-zNggAzg', category: 'codigos' },
  { title: 'Código de Buen Gobierno UNC', driveId: '1O6MhMywuXalF8eWotgmWv9Qeanki58tv', category: 'codigos' },
  { title: 'Plan Estratégico Institucional UNC 2017-2022', driveId: '14QgcgKm1vnO4iSIjruGWhEgxFnxtcogS', category: 'planes' },
  { title: 'Política de Control Interno UNC-V3', driveId: '1x1AthCSLZmrUIrIuc9ldTNExhuF5xAUY', category: 'politicas' },
  { title: 'Política de Talento Humano UNC', driveId: '1sPStXfAPJvqYecJIaUx1tMQKd3enalTC', category: 'politicas' },
  { title: 'Plan de Formación de Investigadores', driveId: '1JS6DtnKjdUWeLiqxot77W44NZEm2XYgl', category: 'planes' },
  { title: 'Políticas de Información y Comunicación UNC', driveId: '1xdRC0efzmShUXRqOpAbkWlyNo0wqTtru', category: 'politicas' },
  { title: 'Plan de Comunicación UNC', driveId: '1qE7ecXupBWU33qiX1EYiA04HhEnfwwyh', category: 'planes' },
  { title: 'Políticas de Extensión Universitaria UNC', driveId: '1JYAssk0YASYrcDaW3idGAtFDEOIprcNp', category: 'politicas' },
  { title: 'Políticas de Investigación y Publicación UNC', driveId: '1qwzZZowPI3q9nKYx45UuyZ6EdxPHWZud', category: 'politicas' },
  { title: 'Políticas de Vinculación UNC', driveId: '1yKM61Iml9fY2eCROYt_zHkrUg60XT_M4', category: 'politicas' },
  { title: 'Manual de Funciones Rectorado UNC', driveId: '1UbJqhsuyLDHnUgZv7OAAzJHMPChXcG1g', category: 'manuales' },
  { title: 'Plan de Seguridad Universitario UNC', driveId: '1B0Tu5Ze6bKP6fQGPlGko_l5ektJuFydz', category: 'planes' },
  { title: 'Procedimiento Recorrido Expedientes Rectorado', driveId: '1Eirfg4BBX5bK_LtrfE1jcbWj7j1yAzcX', category: 'procedimientos' },
  { title: 'Procedimiento Recorrido Solicitud Contratos Rectorado', driveId: '1l75KHTk8YKZve9WsnZOjKFHCNQPgygoU', category: 'procedimientos' },
  { title: 'Reglamento de Gestiones y Actos de la Secretaría General del Rectorado', driveId: '1U-ftpwOxU7UM0nv_sFRBjDgJVnte7lNI', category: 'reglamentos-especiales' },
  { title: 'Procedimiento de actualización legajo funcionarios Rectorado UNC', driveId: '1FhihkYp29_jusUYsm9JVq_ovyRVAppSI', category: 'procedimientos' },
  { title: 'Protocolo Sanitario – Pandemia Rectorado UNC', driveId: '12qtbAX6d6Brt9cNYoIDJwzVngFcMquCI', category: 'protocolos' },
  { title: 'Protocolo Sanitario – Pandemia UNC', driveId: '1ThlMvPFLTyVDMkLOWzfn6-_YftDeUK88', category: 'protocolos' },
  { title: 'Reglamento Movilidad UNC', driveId: '1jbtqc3UF9zbuDvjNcvwSMi5xmAINpqNf', category: 'reglamentos-especiales' },
  { title: 'Reglamento de Tesis – Maestría en Educación UNC', driveId: '1TMC6xIHEfNpg08IjCnAuLqjp8Ecacc8T', category: 'reglamentos-especiales' },
  { title: 'Reglamento cursos de posgrado del Rectorado UNC', driveId: '1wVVo0ClfwBMeKGTJOnWuxuEsFBGUi0d3', category: 'reglamentos-especiales' },
  { title: 'Reglamento UNC – Ley de Gratuidad', driveId: '1P7_oouyDPmfyPiV0S2hDq1DX-nPBCgJA', category: 'reglamentos-especiales' },
  { title: 'Manual de Buenas Prácticas – Enfoque inclusivo UNC', driveId: '13oRo1rTwKpXqwGWtSXyS16_GTfb0Vjq8', category: 'manuales' },
  { title: 'Delineamiento nominación Docentes de Medio Tiempo y Tiempo Completo', driveId: '1fDNMSwgGGgjo6Md-uchLCKVRHB-zBzMg', category: 'reglamentos-especiales' },
  { title: 'Proyecto Marco Internacionalización Educación Superior – UNC', driveId: '1-uzqsH7Y2vAVcMPr2ukLjrGdDT3WXMxM', category: 'planes' },
  { title: 'Políticas y Líneas de Acción Institucional', driveId: '1dSUlvbk1UBh7082SAdx5RMxQN2pn6wor', category: 'politicas' },
  { title: 'Ley Nro. 3201/2007 – Creación UNC', driveId: '1Jm07lULWCC1Vrf0Piw1DClvluDU2d43x', category: 'ley-creacion' },
  { title: 'Plan básico de digitalización de trámites', driveId: '1wUXJy7kpMyf4y6Uy7s8ANlh6_8SDEgpy', category: 'planes' },
]

/** URL canónica de vista de Drive (sin `?usp=sharing`, que no aporta nada y varía entre copias). */
export function driveViewUrl(driveId) {
  return `https://drive.google.com/file/d/${driveId}/view`
}

/**
 * Cuerpo para `POST /api/marco-legal`. `order` = posición en la tabla del sitio publicado (1..44), así la
 * página conserva el orden relativo de la fuente dentro de cada categoría. `active: true` porque estos
 * documentos ya son públicos; `estado: 'vigente'` hasta que el PO indique lo contrario.
 */
export function toCmsPayloadMarcoLegal(item, index) {
  return {
    title: item.title,
    category: item.category,
    externalUrl: driveViewUrl(item.driveId),
    order: index + 1,
    active: true,
    estado: 'vigente',
  }
}

/**
 * Campos que el seed puede corregir en una fila existente (solo con `--update`). `active`, `estado`,
 * `nota`, `description` y `fechaDocumento` son decisiones del PO en el panel: nunca se tocan.
 */
export const SEED_MANAGED_FIELDS = ['category', 'externalUrl', 'order']
