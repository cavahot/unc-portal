#!/usr/bin/env bash
# =============================================================
# init-minio.sh — Inicializa el bucket de producción en MinIO
# =============================================================
# Uso:
#   bash scripts/setup/init-minio.sh
#
# Requiere:
#   - Stack de Docker Compose corriendo (compose.prod.yaml)
#   - El contenedor unc-minio-prod en estado healthy
#   - Las vars MINIO_ROOT_USER y MINIO_ROOT_PASSWORD en .env.prod
# =============================================================
set -euo pipefail

CONTAINER="unc-minio-prod"
ENV_FILE="infrastructure/docker/.env.prod"

echo "============================================"
echo "  Inicialización de MinIO — Portal UNC"
echo "============================================"
echo ""

# 1. Cargar variables de entorno de producción
if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗  No se encontró $ENV_FILE"
  echo "   Copiá .env.prod.example → .env.prod y completá los valores."
  exit 1
fi

# Exportar solo las variables que necesitamos (sin ejecutar código)
MINIO_ROOT_USER=$(grep -E '^MINIO_ROOT_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
MINIO_ROOT_PASSWORD=$(grep -E '^MINIO_ROOT_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
S3_BUCKET=$(grep -E '^S3_BUCKET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")

if [[ -z "$MINIO_ROOT_USER" ]] || [[ -z "$MINIO_ROOT_PASSWORD" ]]; then
  echo "✗  MINIO_ROOT_USER o MINIO_ROOT_PASSWORD no están definidos en $ENV_FILE"
  exit 1
fi

S3_BUCKET="${S3_BUCKET:-unc-media}"

# 2. Verificar que el contenedor esté corriendo
echo "→ Verificando contenedor MinIO..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "✗  El contenedor $CONTAINER no está corriendo."
  echo "   Levantá el stack primero: docker compose ... up -d"
  exit 1
fi
echo "✓  Contenedor activo"

# 3. Esperar que MinIO esté ready
echo ""
echo "→ Esperando que MinIO esté listo..."
for i in $(seq 1 20); do
  if docker exec "$CONTAINER" mc ready local &>/dev/null 2>&1; then
    echo "✓  MinIO respondiendo"
    break
  fi
  if [[ $i -eq 20 ]]; then
    echo "✗  MinIO no respondió en 20 intentos. Revisá los logs:"
    echo "   docker logs $CONTAINER"
    exit 1
  fi
  echo "   Intento $i/20..."
  sleep 3
done

# 4. Configurar alias con las credenciales de producción
echo ""
echo "→ Configurando alias de MinIO..."
docker exec "$CONTAINER" mc alias set prod \
  http://localhost:9000 \
  "$MINIO_ROOT_USER" \
  "$MINIO_ROOT_PASSWORD" \
  --api S3v4 > /dev/null
echo "✓  Alias configurado"

# 5. Crear el bucket si no existe
echo ""
echo "→ Verificando bucket '$S3_BUCKET'..."
if docker exec "$CONTAINER" mc ls "prod/$S3_BUCKET" &>/dev/null 2>&1; then
  echo "✓  Bucket ya existe — omitiendo creación"
else
  echo "   Creando bucket '$S3_BUCKET'..."
  docker exec "$CONTAINER" mc mb "prod/$S3_BUCKET"
  echo "✓  Bucket creado"
fi

# 6. Política de acceso anónimo (SEC-MINIO-01: opt-in, acotada, sin listado)
# `mc anonymous set download` concede SOLO s3:GetObject: se puede leer un objeto cuya clave se
# conoce, pero NO listar el bucket (no hay s3:ListBucket) ni escribir. Amenaza que evita: publicar
# por omisión cualquier objeto futuro del bucket. Límite: la política es por prefijo, no por objeto;
# Media guarda las claves planas (sin `prefix`, MIG-IMG §4.1) y el bucket contiene únicamente la
# colección `media` (payload.config.ts, s3Storage), por eso el prefijo por defecto es la raíz.
# Si algún día el bucket aloja contenido no público, defina MINIO_PUBLIC_MEDIA_PREFIX (y el
# `prefix` de Media) antes de habilitar esto.
echo ""
if [[ "${MINIO_PUBLIC_READ:-0}" == "1" ]]; then
  MINIO_PUBLIC_MEDIA_PREFIX="${MINIO_PUBLIC_MEDIA_PREFIX:-}"
  if [[ -z "$MINIO_PUBLIC_MEDIA_PREFIX" ]]; then
    echo "⚠  ADVERTENCIA: sin MINIO_PUBLIC_MEDIA_PREFIX la lectura anónima cubre TODO el bucket '$S3_BUCKET'."
  fi
  echo "→ Aplicando lectura anónima (solo GET de objetos conocidos, sin listado)..."
  docker exec "$CONTAINER" mc anonymous set download "prod/$S3_BUCKET/${MINIO_PUBLIC_MEDIA_PREFIX}"
  echo "✓  Política: download sobre prod/$S3_BUCKET/${MINIO_PUBLIC_MEDIA_PREFIX}"
else
  echo "→ Bucket privado: no se aplicó lectura anónima (defina MINIO_PUBLIC_READ=1 para publicarla; ver SEC-MINIO-01)."
fi

# 7. Verificar
echo ""
POLICY=$(docker exec "$CONTAINER" mc anonymous get "prod/$S3_BUCKET" 2>/dev/null || echo "unknown")
echo "============================================"
echo "  ✅ MinIO inicializado correctamente"
echo "============================================"
echo "  Bucket:  $S3_BUCKET"
echo "  Acceso:  $POLICY"
echo ""
echo "  Próximo paso: restaurar la base de datos"
echo "    bash scripts/setup/restore-db-prod.sh"
