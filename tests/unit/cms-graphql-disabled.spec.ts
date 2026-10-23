// DEP-03 D2 / SEC-03: GraphQL desactivado en el CMS.
// Hecho observado (docs/evidence/dep-03-validation.md, D2): `configToSchema` falla con el tipo `Faq`
// duplicado (bloque `faq` vs colección `faqs`), así que /api/graphql no responde de todos modos.
// Decisión del Product Owner: el portal no consume GraphQL (sin consultas en el repo), así que se
// desactiva en vez de renombrar tipos; reduce superficie de ataque (introspección, consultas anidadas).
// Límite: contrato sobre la configuración; Payload responde 404 en el handler cuando `disable` es true
// (@payloadcms/next routes/graphql/handler.js). No prueba el arranque contra Postgres.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('DEP-03 D2: GraphQL desactivado', () => {
  it('payload.config.ts declara graphQL.disable = true', () => {
    const source = readFileSync(resolve(process.cwd(), 'apps/cms/src/payload.config.ts'), 'utf8')
    expect(source).toMatch(/graphQL:\s*\{[^}]*disable:\s*true/s)
  })
})
