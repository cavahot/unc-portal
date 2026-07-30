import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function main() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')

  const payload = await getPayload({ config })
  const users = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
  const user = users.docs[0]
  console.log('user found:', !!user, user?.email)

  const req: any = { user, payload, locale: undefined, t: (k: string) => k, i18n: { t: (k: string) => k } }

  const docAccessUrl = new URL(
    '../../../node_modules/payload/dist/collections/operations/docAccess.js',
    import.meta.url,
  )
  const { docAccessOperation } = await import(docAccessUrl.href)

  const collectionConfig = payload.collections['paginas'].config

  // Simulate the CREATE view (no id yet, like /admin/collections/paginas/create)
  const createPerms = await docAccessOperation({
    collection: { config: collectionConfig },
    req,
  })

  console.log('=== CREATE VIEW full fields permissions ===')
  console.log(JSON.stringify(createPerms.fields, null, 2))
  console.log('=== CREATE VIEW top-level permissions ===')
  console.log(JSON.stringify({ create: createPerms.create, read: createPerms.read, update: createPerms.update }, null, 2))

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
