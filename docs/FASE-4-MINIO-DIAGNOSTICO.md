# Fase 4 - MinIO S3: Diagnóstico del Problema

**Fecha:** 2026-07-27  
**Problema:** Plugin S3 guardando localmente en lugar de en MinIO

---

## 🔍 Diagnóstico Actual

### 1. Estado de Servicios

```
✅ MinIO: Respondiendo en http://127.0.0.1:9100
✅ Console: http://localhost:9101
✅ Credentials: Configuradas correctamente
✓ Endpoint: http://127.0.0.1:9100
✓ Access Key: unc_storage_admin
✓ Secret Key: d427a7aac123c8feb38d3c04b3ea09344f04dd79401c5fd6
```

### 2. Configuración Payload

**Archivo:** `apps/cms/src/payload.config.ts` (línea 88-102)

```typescript
plugins: [
  s3Storage({
    collections: {
      media: true,  // ← Media collection habilitada para S3
    },
    bucket: process.env.S3_BUCKET || 'unc-media',
    config: {
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      endpoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:9100',
      forcePathStyle: true,  // ← Importante para MinIO
      region: process.env.S3_REGION || 'us-east-1',
    },
  }),
]
```

**Status:** ✅ Correctamente configurado

---

## 🐛 Posibles Causas del Problema

### Hipótesis 1: Bucket No Existe
**Síntoma:** "The specified bucket does not exist" en logs  
**Solución:** Crear bucket `unc-media` en MinIO

### Hipótesis 2: Credenciales Inválidas
**Síntoma:** "Access Denied" en logs  
**Verificación:**
```bash
# Probar conectividad
curl -v http://127.0.0.1:9100/unc-media/
```

### Hipótesis 3: Plugin S3 v3 vs v4 Mismatch
**Síntoma:** Archivos guardándose localmente sin error  
**Solución:** Revisar versión de `@payloadcms/storage-s3`

### Hipótesis 4: Payload Collection Config
**Síntoma:** Media collection no está configurada correctamente  
**Ubicación:** `apps/cms/src/collections/Media.ts`

---

## ✅ Pasos de Verificación

### Paso 1: Verificar Bucket en Console

```
1. Abre http://localhost:9101
2. Login:
   - Usuario: unc_storage_admin
   - Contraseña: d427a7aac123c8feb38d3c04b3ea09344f04dd79401c5fd6
3. ¿Existe bucket "unc-media"?
   - Si NO: Crear
   - Si SÍ: Pasar a Paso 2
```

### Paso 2: Revisar Logs de Payload

```bash
# En terminal de CMS (durante dev:all)
# Buscar mensajes con "S3" o "storage"
```

### Paso 3: Probar Upload de Media

```
1. Ir a CMS Admin: http://localhost:3002/admin
2. Ir a Media collection
3. Subir una imagen
4. ¿Dónde se guarda?
   - En MinIO (✅ Correcto)
   - En filesystem (❌ Problema)
```

### Paso 4: Verificar Configuración de Media Collection

**Archivo:** `apps/cms/src/collections/Media.ts`

```typescript
export const Media = buildCollection({
  slug: 'media',
  access: {
    // ...
  },
  upload: true,  // ← Debe estar habilitado
  fields: [
    // ...
  ],
})
```

---

## 🔧 Soluciones Posibles

### Solución A: Crear Bucket Manualmente

```powershell
# Ejecutar script de setup
.\scripts\minio\check-minio.ps1
```

### Solución B: Reinstalar Plugin

```bash
npm install @payloadcms/storage-s3@latest --workspace=@unc/cms
```

### Solución C: Verificar Media Collection

Asegurar que Media collection tiene:
- `upload: true`
- No tiene otro storage configurado
- `hooks` no interfieren

### Solución D: Limpiar Build de Payload

```bash
rm -rf apps/cms/.next apps/cms/dist
npm run build --workspace=@unc/cms
```

---

## 📊 Investigación Detallada

### Revisar Versión del Plugin

```bash
npm list @payloadcms/storage-s3 --workspace=@unc/cms
```

**Versión esperada:** v1.0.0+ para Payload v3

### Revisar payload-types.ts

```bash
grep -n "Media" apps/cms/src/payload-types.ts | head -20
```

### Ver donde se guardan archivos actualmente

```powershell
Get-ChildItem -Recurse -Path C:\Users\UNC\unc-portal -Include "*.jpg", "*.png", "*.webp" -ErrorAction SilentlyContinue | Where-Object {$_.FullName -like "*media*"} | Select-Object FullName
```

---

## 🚀 Plan de Acción

1. ✅ Verificar que MinIO corre en puerto 9100
2. ⏳ Verificar que bucket `unc-media` existe
3. ⏳ Subir archivo de prueba al CMS
4. ⏳ Verificar dónde se guardó
5. ⏳ Si está en filesystem: Investigar plugin
6. ⏳ Limpiar y re-compilar Payload
7. ⏳ Probar nuevamente

---

## 📚 Referencias

- [Payload CMS S3 Storage Plugin](https://payloadcms.com/docs/plugins/cloud-storage)
- [MinIO Documentation](https://min.io/docs/)
- [AWS S3 API Reference](https://docs.aws.amazon.com/s3/latest/api/)

---

**Estado:** 🔴 Investigando  
**Bloqueador:** Deploy  
**Tiempo estimado:** 2-3 horas
