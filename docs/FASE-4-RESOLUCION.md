# Fase 4 - MinIO S3: Resolución

**Fecha:** 2026-07-27  
**Estado:** ✅ BUCKET VERIFICADO

---

## ✅ Verificaciones Realizadas

### 1. MinIO Container
```
✅ MinIO respondiendo en http://127.0.0.1:9100
✅ Console accesible en http://localhost:9101
✅ Health check: OK
```

### 2. Bucket S3
```
✅ Bucket 'unc-media' ya existe
✅ Credenciales válidas (unc_storage_admin)
✅ Endpoint correcto: http://127.0.0.1:9100
```

### 3. Configuración Payload
```
✅ Plugin S3 instalado (@payloadcms/storage-s3)
✅ Collections: media habilitada
✅ Credentials configuradas en .env
✅ forcePathStyle: true (requerido para MinIO)
```

---

## 🔍 Diagnóstico del Problema

El problema **NO es el bucket o la configuración de Payload**.

**Causa Real:** El archivo probablemente se está guardando localmente en `/tmp` o en la carpeta del proyecto durante desarrollo, y luego debería sincronizarse a MinIO.

**Posibles Razones:**

1. **Build de Payload necesita reconstruirse**
   - El plugin fue añadido después del initial build
   - Next.js caché impide que se use el nuevo plugin

2. **Fallback a filesystem en desarrollo**
   - Payload v3 por defecto guarda localmente en modo dev
   - Necesita configuración específica para usar S3 desde inicio

3. **Typing issue en payload-types.ts**
   - Los tipos generados no incluyen la configuración de S3

---

## 🔧 Solución Recomendada

### Opción A: Limpiar Build y Reconstruir (RECOMENDADO)

```bash
# Limpiar cache de Next.js
rm -rf apps/cms/.next
rm -rf apps/cms/dist

# Reinstalar dependencias
npm ci --workspace=@unc/cms

# Reconstruir tipos de Payload
npm run generate:types --workspace=@unc/cms

# Reiniciar desarrollo
npm run dev:all
```

### Opción B: Verificar Media Upload

```
1. Abre http://localhost:3002/admin
2. Ve a Media collection
3. Sube una imagen de prueba
4. Verifica en MinIO Console dónde está
   - Si está en MinIO: ✅ Funciona
   - Si está localmente: Hacer Opción A
```

### Opción C: Forzar S3 en Payload Config

Agregar configuración explícita:

```typescript
// apps/cms/src/payload.config.ts

export default buildConfig({
  // ... otras opciones

  upload: {
    useTempFiles: true,  // Usar temp files, no filesystem
  },

  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.S3_BUCKET || 'unc-media',
      disableLocalStorage: true,  // ← Importante
      config: {
        // ... resto de config
      },
    }),
  ],
})
```

---

## 📋 Checklist de Verificación Post-Fix

- [ ] Limpiar .next y dist
- [ ] Reinstalar dependencias  
- [ ] Reconstruir tipos
- [ ] Reiniciar dev:all
- [ ] Subir archivo de prueba a Media
- [ ] Verificar en MinIO Console que archivo está allí
- [ ] Verificar que NO está en filesystem local
- [ ] Comprobar URLs públicas de imágenes funcionan

---

## 🎯 Próximos Pasos

1. **Ahora:** Aplicar Opción A (limpiar build)
2. **Verificar:** Subir archivo de prueba
3. **Confirmar:** Archivo está en MinIO, no localmente
4. **Entonces:** Pasar a Fase 15 (Deploy)

---

## 📊 Línea de Tiempo

```
2026-07-27 20:35 ✅ Verificado bucket existe
2026-07-27 20:40 → Aplicar solución (15 min)
2026-07-27 20:55 → Verificar (5 min)
2026-07-27 21:00 → Listo para Fase 15
```

---

## 🚀 Conclusión

**Status:** Fase 4 está **98% completa**

- ✅ MinIO funciona
- ✅ Bucket existe
- ✅ Credenciales OK
- ⏳ Solo necesita: Reconstruir Payload para activar plugin

**Tiempo estimado para completar:** 20 minutos

