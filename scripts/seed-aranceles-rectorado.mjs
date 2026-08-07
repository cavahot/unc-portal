/**
 * Seed: Aranceles Rectorado
 * Carga los 24 aranceles vigentes en el CMS.
 * Idempotente: busca por concepto antes de crear.
 */

const CMS_URL  = process.env.CMS_URL  || 'http://localhost:3002'
const EMAIL    = process.env.SEED_EMAIL    || 'admin@unc.edu.py'
const PASSWORD = process.env.SEED_PASSWORD || 'Admin1234!'

async function login() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status} - ${await res.text()}`)
  const { token } = await res.json()
  return token
}

async function findOrCreate(token, data) {
  const qs   = new URLSearchParams({ 'where[concepto][equals]': data.concepto, limit: '1' })
  const find = await fetch(`${CMS_URL}/api/aranceles-rectorado?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const { docs } = await find.json()
  if (docs?.length) {
    console.log(`  ⚠  ya existe: ${data.concepto}`)
    return docs[0]
  }
  const create = await fetch(`${CMS_URL}/api/aranceles-rectorado`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify(data),
  })
  if (!create.ok) throw new Error(`Create failed: ${create.status} - ${await create.text()}`)
  const { doc } = await create.json()
  console.log(`  ✓  creado: ${data.concepto}`)
  return doc
}

const ARANCELES = [
  // ── Multas ──────────────────────────────────────────────────────────────
  { concepto: 'Multa por mora en matrícula — Posgrado/Maestría',   monto:   10000, grupo: 'multas',     orden: 1 },
  { concepto: 'Multa por mora en pago de cuota — Posgrado/Maestría', monto: 10000, grupo: 'multas',     orden: 2 },
  { concepto: 'Penalidad por incumplimiento de contrato',            monto:  60000, grupo: 'multas',     orden: 3 },

  // ── Venta de bienes y servicios ──────────────────────────────────────────
  { concepto: 'Constancias Varias',                                  monto:   50000, grupo: 'venta',    orden: 1 },
  { concepto: 'Expedición de título universitario',                  monto:  100000, grupo: 'venta',    orden: 2 },
  { concepto: 'Registro de título universitario',                    monto:  200000, grupo: 'venta',    orden: 3 },
  { concepto: 'Certificado de capacitación',                         monto:  100000, grupo: 'venta',    orden: 4 },
  { concepto: 'Credencial de estudiante / funcionario / docente',    monto:  100000, grupo: 'venta',    orden: 5 },
  { concepto: 'Certificados de estudios parcial y completo',         monto:   50000, grupo: 'venta',    orden: 6 },
  { concepto: 'Certificado de trabajo',                              monto:   30000, grupo: 'venta',    orden: 7 },
  { concepto: 'Resumen anual de haberes',                            monto:   50000, grupo: 'venta',    orden: 8 },

  // ── Aranceles educativos ─────────────────────────────────────────────────
  { concepto: 'Matrícula Posgrado — Didáctica',                      monto:  500000, grupo: 'educativos', orden: 1  },
  { concepto: 'Matrícula Maestría',                                  monto:  500000, grupo: 'educativos', orden: 2  },
  { concepto: 'Cuota Posgrado — Didáctica (módulo)',                 monto:  300000, grupo: 'educativos', orden: 3  },
  { concepto: 'Cuota Maestría — Educación Superior (módulo)',        monto:  400000, grupo: 'educativos', orden: 4  },
  { concepto: 'Legalización de documentos',                          monto:   50000, grupo: 'educativos', orden: 5  },
  { concepto: 'Autenticación de documentos',                         monto:  100000, grupo: 'educativos', orden: 6  },
  { concepto: 'Defensa de Tesis de Maestría',                        monto: 1000000, grupo: 'educativos', orden: 7  },
  { concepto: 'Matrícula Programa de Formación en Posgrado',         monto:  100000, grupo: 'educativos', orden: 8  },
  { concepto: 'Cuota mensual Programa de Formación',                 monto:  100000, grupo: 'educativos', orden: 9  },
  { concepto: 'Cuota Doctorado — Educación (módulo)',                monto:  750000, grupo: 'educativos', orden: 10 },
  { concepto: 'Tutoría final Tesis Doctoral',                        monto: 2500000, grupo: 'educativos', orden: 11 },
  { concepto: 'Presentación de proyecto de Tesis Doctoral',          monto:  500000, grupo: 'educativos', orden: 12 },
  { concepto: 'Examen extraordinario — Doctorado',                   monto:  300000, grupo: 'educativos', orden: 13 },
]

async function main() {
  console.log('🌱 Seeding Aranceles Rectorado…')
  const token = await login()
  console.log('✅ Login OK\n')

  for (const arancel of ARANCELES) {
    await findOrCreate(token, { ...arancel, activo: true })
  }

  console.log(`\n✅ Seed completado — ${ARANCELES.length} aranceles procesados.`)
}

main().catch((err) => {
  console.error('❌ Seed error:', err)
  process.exit(1)
})
