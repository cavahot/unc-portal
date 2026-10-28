#!/usr/bin/env node
// S3-SEAWEEDFS-01 — crea (idempotente) y verifica el bucket del almacén S3 (SeaweedFS) del CMS.
// Qué hace: con las claves del ENTORNO crea el bucket por la API S3 (CreateBucket) y confirma con HeadBucket.
//   Con `--check` solo verifica (HeadBucket), sin crear nada. Reemplaza scripts/minio/* y scripts/setup/init-minio.sh.
// Por qué: SeaweedFS no crea el bucket solo y el CMS (@payloadcms/storage-s3) falla al subir si no existe. Debe
//   ejecutarse DESPUÉS de que el contenedor `s3` esté healthy y ANTES de arrancar el CMS con MEDIA_STORAGE=s3.
// Amenazas que evita: credenciales en git (SEC-MINIO-01) -> se leen solo de process.env y NUNCA se imprimen;
//   política pública accidental -> este script no escribe políticas ni ACL: la lectura anónima se define en el
//   JSON de identidades que renderiza infrastructure/docker/s3/entrypoint.sh (solo con S3_PUBLIC_READ=1).
// Límite: crea/verifica un solo bucket; no migra datos. Variables: S3_ENDPOINT (por defecto
//   http://127.0.0.1:9100, el puerto local del compose), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (obligatorias),
//   S3_BUCKET (unc-media), S3_REGION (us-east-1).
// Uso: S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... node scripts/s3/setup-bucket.mjs [--check]
import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'

const check = process.argv.includes('--check')
const endpoint = process.env.S3_ENDPOINT || 'http://127.0.0.1:9100'
const bucket = process.env.S3_BUCKET || 'unc-media'
const region = process.env.S3_REGION || 'us-east-1'
const accessKeyId = process.env.S3_ACCESS_KEY_ID
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

// Falla cerrado y con mensaje claro si faltan las claves (sin mostrar ningún valor).
if (!accessKeyId || !secretAccessKey) {
  console.error('Defina S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY en el entorno (no se versionan).')
  process.exit(2)
}

// Path-style obligatorio: el almacén se sirve por IP/host interno, no por subdominios de bucket.
const client = new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } })

/** Devuelve true si el bucket existe y las credenciales pueden verlo. */
async function exists() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
    return true
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound' || err?.name === 'NoSuchBucket') return false
    throw err
  }
}

try {
  if (check) {
    if (await exists()) {
      console.log(`OK: el bucket '${bucket}' existe en ${endpoint}`)
      process.exit(0)
    }
    console.error(`FALTA: el bucket '${bucket}' no existe en ${endpoint} (ejecute el script sin --check)`)
    process.exit(1)
  }
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
    console.log(`Bucket '${bucket}' creado en ${endpoint}`)
  } catch (err) {
    // Idempotente: si ya existe (de este usuario) no es un error.
    if (err?.name === 'BucketAlreadyOwnedByYou' || err?.name === 'BucketAlreadyExists') {
      console.log(`Bucket '${bucket}' ya existe en ${endpoint}`)
    } else {
      throw err
    }
  }
  if (!(await exists())) {
    console.error(`ERROR: el bucket '${bucket}' no responde a HeadBucket tras crearlo`)
    process.exit(1)
  }
  console.log(`Verificado: '${bucket}' accesible con las credenciales del entorno`)
} catch (err) {
  // Solo nombre y código HTTP: el mensaje del SDK podría incluir cabeceras de la petición.
  console.error(`ERROR S3 (${err?.name ?? 'desconocido'}, HTTP ${err?.$metadata?.httpStatusCode ?? 'n/a'}) contra ${endpoint}`)
  process.exit(1)
}
