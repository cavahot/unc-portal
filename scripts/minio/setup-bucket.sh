#!/bin/bash

# Script de DESARROLLO para verificar y crear el bucket en MinIO local.
# SEC-MINIO-01: las credenciales ya NO viven en este archivo (estuvieron versionadas y
# se consideran filtradas). Se leen del entorno; el script nunca las imprime.
#   Uso: MINIO_ACCESS_KEY=... MINIO_SECRET_KEY=... bash scripts/minio/setup-bucket.sh
#   Opcionales: MINIO_ENDPOINT (127.0.0.1:9100), BUCKET_NAME (unc-media),
#               MINIO_PUBLIC_READ=1 (publica el bucket completo; solo desarrollo).

MINIO_ENDPOINT="${MINIO_ENDPOINT:-127.0.0.1:9100}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:?Defina MINIO_ACCESS_KEY en el entorno (no se versiona)}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:?Defina MINIO_SECRET_KEY en el entorno (no se versiona)}"
BUCKET_NAME="${BUCKET_NAME:-unc-media}"

echo "🔧 Verificando configuración de MinIO..."

# Instalar mc (MinIO Client) si no existe
if ! command -v mc &> /dev/null; then
    echo "📦 Instalando MinIO Client (mc)..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl https://dl.min.io/client/mc/release/linux-amd64/mc --create-dirs -o /usr/local/bin/mc
        chmod +x /usr/local/bin/mc
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install minio/stable/mc
    else
        echo "❌ Por favor instala mc manualmente desde https://min.io/docs/minio/linux/reference/minio-mc.html"
        exit 1
    fi
fi

# Configurar alias para MinIO
echo "⚙️  Configurando alias de MinIO..."
mc alias set unc-local \
  http://$MINIO_ENDPOINT \
  $MINIO_ACCESS_KEY \
  $MINIO_SECRET_KEY \
  --api S3v4

# Verificar conexión
echo "🔗 Verificando conexión a MinIO..."
if mc ls unc-local &> /dev/null; then
    echo "✅ Conexión exitosa"
else
    echo "❌ No se pudo conectar a MinIO en $MINIO_ENDPOINT"
    exit 1
fi

# Verificar si bucket existe
echo "🔍 Verificando bucket: $BUCKET_NAME..."
if mc ls unc-local/$BUCKET_NAME &> /dev/null; then
    echo "✅ Bucket '$BUCKET_NAME' ya existe"
else
    echo "📁 Creando bucket '$BUCKET_NAME'..."
    mc mb unc-local/$BUCKET_NAME
    if [ $? -eq 0 ]; then
        echo "✅ Bucket creado exitosamente"
    else
        echo "❌ Error al crear bucket"
        exit 1
    fi
fi

# Política del bucket. SEC-MINIO-01: por defecto el bucket queda PRIVADO. Publicar todo el
# bucket es una decisión explícita (MINIO_PUBLIC_READ=1) solo para desarrollo local: con la
# política `public` cualquiera que alcance el puerto puede leer y escribir según el verbo.
# Límite: esto no protege un MinIO expuesto; en producción rige scripts/setup/init-minio.sh.
echo "🔐 Configurando permisos..."
if [ "${MINIO_PUBLIC_READ:-0}" = "1" ]; then
    echo "⚠️  ADVERTENCIA: MINIO_PUBLIC_READ=1, se publica TODO el bucket '$BUCKET_NAME' (solo desarrollo)."
    mc anonymous set download unc-local/$BUCKET_NAME
else
    echo "🔒 Bucket privado (defina MINIO_PUBLIC_READ=1 solo si necesita lectura anónima en desarrollo)."
fi

echo ""
echo "✅ Configuración de MinIO completada"
echo ""
echo "Información:"
echo "  Endpoint: http://$MINIO_ENDPOINT"
echo "  Bucket: $BUCKET_NAME"
echo "  Usuario: $MINIO_ACCESS_KEY"
echo "  Console: http://localhost:9101"
