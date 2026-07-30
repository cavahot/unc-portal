import { getPayload } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'
import { config as loadEnv } from 'dotenv'
import config from '../../src/payload.config.js'

loadEnv({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env'),
})

// ─── Ley 5.189/2014 — 10 items ───────────────────────────────────────────────
const LEY_5189 = [
  { label: 'Organigrama', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Dirección y Teléfono de la Entidad y de todas las Dependencias', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Nómina del Personal', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Presupuesto de Ingresos – Gastos', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Anexo del Personal', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ejecución Presupuestaria', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Registro Mensual de Viáticos e Informe de Actividades', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Listado de Bienes Patrimoniales', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Listado de Funcionarios Comisionados de otras Instituciones', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Otras Informaciones', url: '' /* TODO: add Google Drive URL */ },
]

// ─── Ley 5.282/2014 — 17 items (Art. 8) ─────────────────────────────────────
const LEY_5282 = [
  { label: 'Ítem 1 – Estructura orgánica', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 2 – Facultades, deberes, funciones y/o atribuciones', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 3 – Marco normativo', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 4 – Descripción general y proceso de toma de decisiones', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 5 – Listado actualizado de funcionarios públicos', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 6 – Descripción de la política institucional y planes de acción', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 7 – Descripción de los programas institucionales en ejecución', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 8 – Informes de auditoría', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 9 – Informes de viajes oficiales', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 10 – Convenios y contratos celebrados', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 11 – Cartas oficiales', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 12 – Informes finales de consultorías', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 13 – Cuadros de resultados', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 14 – Lista de poderes vigentes otorgados a abogados', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 15 – Sistema de mantenimiento, clasificación e índice de documentos', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 16 – Descripción de los procedimientos para acceso a documentos', url: '' /* TODO: add Google Drive URL */ },
  { label: 'Ítem 17 – Mecanismos de participación ciudadana', url: '' /* TODO: add Google Drive URL */ },
]

async function seedTransparencia() {
  console.log('[Seed] Initializing Payload...\n')

  const payload = await getPayload({ config })

  console.log('[Seed] Upserting Transparencia global...')

  await payload.updateGlobal({
    slug: 'transparencia',
    data: {
      ley5189: LEY_5189,
      ley5282: LEY_5282,
    },
  })

  console.log('[Seed] Transparencia global updated successfully.')
  console.log(`  ley5189: ${LEY_5189.length} items`)
  console.log(`  ley5282: ${LEY_5282.length} items`)
  console.log('\n[Seed] Done.')

  process.exit(0)
}

seedTransparencia().catch((err) => {
  console.error('[Seed] Error:', err)
  process.exit(1)
})
