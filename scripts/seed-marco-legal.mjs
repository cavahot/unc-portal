/**
 * Seed script — Marco Legal documents
 * Source: https://www.unc.edu.py/marco-legal/
 *
 * Usage:
 *   $env:CMS_EMAIL="admin@unc.edu.py"; $env:CMS_PASSWORD="yourPassword"
 *   node scripts/seed-marco-legal.mjs
 */

const CMS_URL = 'http://localhost:3002'
const CMS_EMAIL = process.env.CMS_EMAIL || 'admin@unc.edu.py'
const CMS_PASSWORD = process.env.CMS_PASSWORD || ''

const DOCUMENTS = [
  // ── Ley de Creación ─────────────────────────────────────────────────────
  {
    title: 'Ley Nro. 3201/2007 – Creación UNC',
    category: 'ley-creacion',
    externalUrl: 'https://drive.google.com/file/d/1Jm07lULWCC1Vrf0Piw1DClvluDU2d43x/view?usp=sharing',
    order: 1,
  },

  // ── Estatuto Universitario ───────────────────────────────────────────────
  {
    title: 'Estatuto UNC',
    category: 'estatuto',
    externalUrl: 'https://drive.google.com/file/d/1I0rEzgzZcOFulmBzOrc9JHEC2oltTY68/view?usp=sharing',
    order: 1,
  },

  // ── Reglamento General ───────────────────────────────────────────────────
  {
    title: 'Reglamento General UNC: Título I «De la naturaleza, fines y composición de la Universidad»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1qsB0cPzlIUX2734kbj0sm-smahnnIspd/view?usp=sharing',
    order: 1,
  },
  {
    title: 'Reglamento General UNC: Título II «De los órganos de gobierno, forma de integración, deberes y atribuciones»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1vDeyN6Jvk6lg3YdfgSLRgbL_lYnozN4V/view?usp=sharing',
    order: 2,
  },
  {
    title: 'Reglamento General UNC: Título III «Del Régimen Electoral»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1298PVVEPOzZZw9vcXQfnQQWQW1Z_Hcpq/view?usp=sharing',
    order: 3,
  },
  {
    title: 'Reglamento General UNC: Título IV «De las Unidades Académicas»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1hYHozQYsKlBFVqCFyGFOpVo5tgB19FB9/view?usp=sharing',
    order: 4,
  },
  {
    title: 'Reglamento General UNC: Título V «Del Régimen Académico»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1c5cpR3wP3YLHneAG9d1XgE6VdTNzWR0U/view?usp=sharing',
    order: 5,
  },
  {
    title: 'Reglamento General UNC: Título VI «Del Régimen Disciplinario»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1SXFvrFrvHQnuM1lPX3J62qQPh3PfWfiA/view?usp=sharing',
    order: 6,
  },
  {
    title: 'Reglamento General UNC: Título VII «De las becas y ayudas económicas»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/17MFvM3WIRrvbUMQfykcQaWaaA8KAgcMn/view?usp=sharing',
    order: 7,
  },
  {
    title: 'Reglamento General UNC: Título VIII «De los programas de posgrado»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1DyaUHktdfnX5UGZIn8ji7aM2luFWoovF/view?usp=sharing',
    order: 8,
  },
  {
    title: 'Reglamento General UNC: Título IX «De la extensión universitaria»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1FbM7fxBl5zVWKFmebc7NIkRvxHoutFRO/view?usp=sharing',
    order: 9,
  },
  {
    title: 'Reglamento General UNC: Título X «De la carrera docente»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1jP1tR4FfDhRCIkqNByxGKXIvg7EjkG6X/view?usp=sharing',
    order: 10,
  },
  {
    title: 'Reglamento General UNC: Título XI «De la investigación»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1STqe3lrymOSY8vLKxJ-aPnGN4l-Tq8ov/view?usp=sharing',
    order: 11,
  },
  {
    title: 'Reglamento General UNC: Título XII «De los mecanismos de selección, promoción y evaluación de funcionarios»',
    category: 'reglamento-general',
    externalUrl: 'https://drive.google.com/file/d/1Znre4aCmBwZWXREJTXJU7FXBZK7PziCh/view?usp=sharing',
    order: 12,
  },

  // ── Reglamentos Especiales ───────────────────────────────────────────────
  {
    title: 'Reglamento de Funcionamiento CSU',
    category: 'reglamentos-especiales',
    externalUrl: 'https://drive.google.com/file/d/1J6J62UcGtL_abXqnCgma6S61E8opPJKb/view?usp=sharing',
    order: 1,
  },
  {
    title: 'Reglamento Movilidad UNC',
    category: 'reglamentos-especiales',
    externalUrl: 'https://drive.google.com/file/d/1jbtqc3UF9zbuDvjNcvjNcvwSMi5xmAINpqNf/view?usp=sharing',
    order: 2,
  },
  {
    title: 'Reglamento de Tesis – Maestría en Educación UNC',
    category: 'reglamentos-especiales',
    externalUrl: 'https://drive.google.com/file/d/1TMC6xIHEfNpg08IjCnAuLqjp8Ecacc8T/view?usp=sharing',
    order: 3,
  },
  {
    title: 'Reglamento cursos de posgrado del Rectorado UNC',
    category: 'reglamentos-especiales',
    externalUrl: 'https://drive.google.com/file/d/1wVVo0ClfwBMeKGTJOnWuxuEsFBGUi0d3/view?usp=sharing',
    order: 4,
  },
  {
    title: 'Reglamento UNC – Ley de Gratuidad',
    category: 'reglamentos-especiales',
    externalUrl: 'https://drive.google.com/file/d/1P7_oouyDPmfyPiV0S2hDq1DX-nPBCgJA/view?usp=sharing',
    order: 5,
  },
  {
    title: 'Reglamento de Gestiones y Actos de la Secretaría General del Rectorado',
    category: 'reglamentos-especiales',
    externalUrl: 'https://drive.google.com/file/d/1U-ftpwOxU7UM0nv_sFRBjDgJVnte7lNI/view?usp=sharing',
    order: 6,
  },

  // ── Códigos Institucionales ──────────────────────────────────────────────
  {
    title: 'Código de Ética UNC',
    category: 'codigos',
    externalUrl: 'https://drive.google.com/file/d/1z00oUla3Bz8m7ePzoR6YbitiFeAKXsCJ/view?usp=sharing',
    order: 1,
  },
  {
    title: 'Código de Ética UNC – Versión 2',
    category: 'codigos',
    externalUrl: 'https://drive.google.com/file/d/18avjC_E37WXMGTNA8r9XxfLs-zNggAzg/view?usp=sharing',
    order: 2,
  },
  {
    title: 'Código de Buen Gobierno UNC',
    category: 'codigos',
    externalUrl: 'https://drive.google.com/file/d/1O6MhMywuXalF8eWotgmWv9Qeanki58tv/view?usp=sharing',
    order: 3,
  },

  // ── Políticas Institucionales ────────────────────────────────────────────
  {
    title: 'Política de Control Interno UNC – V3',
    category: 'politicas',
    externalUrl: 'https://drive.google.com/file/d/1x1AthCSLZmrUIrIuc9ldTNExhuF5xAUY/view?usp=sharing',
    order: 1,
  },
  {
    title: 'Política de Talento Humano UNC',
    category: 'politicas',
    externalUrl: 'https://drive.google.com/file/d/1sPStXfAPJvqYecJIaUx1tMQKd3enalTC/view?usp=sharing',
    order: 2,
  },
  {
    title: 'Políticas de Información y Comunicación UNC',
    category: 'politicas',
    externalUrl: 'https://drive.google.com/file/d/1xdRC0efzmShUXRqOpAbkWlyNo0wqTtru/view?usp=sharing',
    order: 3,
  },
  {
    title: 'Políticas de Extensión Universitaria UNC',
    category: 'politicas',
    externalUrl: 'https://drive.google.com/file/d/1JYAssk0YASYrcDaW3idGAtFDEOIprcNp/view?usp=sharing',
    order: 4,
  },
  {
    title: 'Políticas de Investigación y Publicación UNC',
    category: 'politicas',
    externalUrl: 'https://drive.google.com/file/d/1qwzZZowPI3q9nKYx45UuyZ6EdxPHWZud/view?usp=sharing',
    order: 5,
  },
  {
    title: 'Políticas de Vinculación UNC',
    category: 'politicas',
    externalUrl: 'https://drive.google.com/file/d/1yKM61Iml9fY2eCROYt_zHkrUg60XT_M4/view?usp=sharing',
    order: 6,
  },
  {
    title: 'Políticas y Líneas de Acción Institucional',
    category: 'politicas',
    externalUrl: 'https://drive.google.com/file/d/1dSUlvbk1UBh7082SAdx5RMxQN2pn6wor/view?usp=sharing',
    order: 7,
  },

  // ── Planes Estratégicos ──────────────────────────────────────────────────
  {
    title: 'Plan Estratégico Institucional UNC 2017–2022',
    category: 'planes',
    externalUrl: 'https://drive.google.com/file/d/14QgcgKm1vnO4iSIjruGWhEgxFnxtcogS/view?usp=sharing',
    order: 1,
  },
  {
    title: 'Plan de Formación de Investigadores',
    category: 'planes',
    externalUrl: 'https://drive.google.com/file/d/1JS6DtnKjdUWeLiqxot77W44NZEm2XYgl/view?usp=sharing',
    order: 2,
  },
  {
    title: 'Plan de Comunicación UNC',
    category: 'planes',
    externalUrl: 'https://drive.google.com/file/d/1qE7ecXupBWU33qiX1EYiA04HhEnfwwyh/view?usp=sharing',
    order: 3,
  },
  {
    title: 'Plan básico de digitalización de trámites',
    category: 'planes',
    externalUrl: 'https://drive.google.com/file/d/1wUXJy7kpMyf4y6Uy7s8ANlh6_8SDEgpy/view?usp=sharing',
    order: 4,
  },
  {
    title: 'Plan de Seguridad Universitario UNC',
    category: 'planes',
    externalUrl: 'https://drive.google.com/file/d/1B0Tu5Ze6bKP6fQGPlGko_l5ektJuFydz/view?usp=sharing',
    order: 5,
  },

  // ── Manuales ────────────────────────────────────────────────────────────
  {
    title: 'Manual de Funciones Rectorado UNC',
    category: 'manuales',
    externalUrl: 'https://drive.google.com/file/d/1UbJqhsuyLDHnUgZv7OAAzJHMPChXcG1g/view?usp=sharing',
    order: 1,
  },
  {
    title: 'Manual de Buenas Prácticas – Enfoque inclusivo UNC',
    category: 'manuales',
    externalUrl: 'https://drive.google.com/file/d/13oRo1rTwKpXqwGWtSXyS16_GTfb0Vjq8/view?usp=sharing',
    order: 2,
  },

  // ── Procedimientos ───────────────────────────────────────────────────────
  {
    title: 'Procedimiento Recorrido Expedientes Rectorado',
    category: 'procedimientos',
    externalUrl: 'https://drive.google.com/file/d/1Eirfg4BBX5bK_LtrfE1jcbWj7j1yAzcX/view?usp=sharing',
    order: 1,
  },
  {
    title: 'Procedimiento Recorrido Solicitud Contratos Rectorado',
    category: 'procedimientos',
    externalUrl: 'https://drive.google.com/file/d/1l75KHTk8YKZve9WsnZOjKFHCNQPgygoU/view?usp=sharing',
    order: 2,
  },
  {
    title: 'Procedimiento de actualización legajo funcionarios Rectorado UNC',
    category: 'procedimientos',
    externalUrl: 'https://drive.google.com/file/d/1FhihkYp29_jusUYsm9JVq_ovyRVAppSI/view?usp=sharing',
    order: 3,
  },
  {
    title: 'Delineamiento nominación Docentes de Medio Tiempo y Tiempo Completo',
    category: 'procedimientos',
    externalUrl: 'https://drive.google.com/file/d/1fDNMSwgGGgjo6Md-uchLCKVRHB-zBzMg/view?usp=sharing',
    order: 4,
  },

  // ── Protocolos ───────────────────────────────────────────────────────────
  {
    title: 'Protocolo Sanitario – Pandemia Rectorado UNC',
    category: 'protocolos',
    externalUrl: 'https://drive.google.com/file/d/12qtbAX6d6Brt9cNYoIDJwzVngFcMquCI/view?usp=sharing',
    order: 1,
  },
  {
    title: 'Protocolo Sanitario – Pandemia UNC',
    category: 'protocolos',
    externalUrl: 'https://drive.google.com/file/d/1ThlMvPFLTyVDMkLOWzfn6-_YftDeUK88/view?usp=sharing',
    order: 2,
  },
  {
    title: 'Proyecto Marco Internacionalización Educación Superior – UNC',
    category: 'protocolos',
    externalUrl: 'https://drive.google.com/file/d/1-uzqsH7Y2vAVcMPr2ukLjrGdDT3WXMxM/view?usp=sharing',
    order: 3,
  },
]

// ── Auth ────────────────────────────────────────────────────────────────────

async function getToken() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CMS_EMAIL, password: CMS_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Auth failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data.token
}

async function createDoc(token, doc) {
  const res = await fetch(`${CMS_URL}/api/marco-legal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ ...doc, active: true }),
  })
  if (!res.ok) throw new Error(`POST failed (${res.status}): ${await res.text()}`)
  return res.json()
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── SEED MARCO LEGAL ──────────────────────────────────────')
  console.log(`   CMS: ${CMS_URL}`)
  console.log(`   Docs: ${DOCUMENTS.length} documentos`)

  if (!CMS_PASSWORD) {
    console.error('\n❌  Falta CMS_PASSWORD')
    console.error('   $env:CMS_EMAIL="tu@email.com"; $env:CMS_PASSWORD="tu_pass"')
    console.error('   node scripts/seed-marco-legal.mjs')
    process.exit(1)
  }

  let token
  try {
    token = await getToken()
    console.log('✅  Auth OK\n')
  } catch (err) {
    console.error(`❌  ${err.message}`)
    process.exit(1)
  }

  let ok = 0
  let fail = 0

  for (const doc of DOCUMENTS) {
    process.stdout.write(`   [${doc.category}] ${doc.title.slice(0, 60)}... `)
    try {
      await createDoc(token, doc)
      console.log('✅')
      ok++
    } catch (err) {
      console.log(`❌  ${err.message}`)
      fail++
    }
  }

  console.log(`\n── Resultado: ${ok} creados · ${fail} errores ─────────────`)
  if (ok > 0) console.log('   Recargá el CMS en http://localhost:3002/admin/collections/marco-legal')
}

main().catch((e) => { console.error(e); process.exit(1) })
