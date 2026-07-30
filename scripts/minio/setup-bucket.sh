#!/bin/bash

# Script para verificar y crear bucket en MinIO

MINIO_ENDPOINT="127.0.0.1:9100"
MINIO_ACCESS_KEY="unc_storage_admin"
MINIO_SECRET_KEY="d427a7aac123c8feb38d3c04b3ea09344f04dd79401c5fd6"
BUCKET_NAME="unc-media"

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

# Configurar política pública de lectura
echo "🔐 Configurando permisos..."
mc policy set public unc-local/$BUCKET_NAME

echo ""
echo "✅ Configuración de MinIO completada"
echo ""
echo "Información:"
echo "  Endpoint: http://$MINIO_ENDPOINT"
echo "  Bucket: $BUCKET_NAME"
echo "  Usuario: $MINIO_ACCESS_KEY"
echo "  Console: http://localhost:9101"
