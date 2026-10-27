# Script para verificar MinIO y crear bucket si es necesario

$MinioEndpoint = "http://127.0.0.1:9100"
# SEC-MINIO-01: credenciales solo desde el entorno; el script nunca las imprime.
if (-not $env:MINIO_ACCESS_KEY) { Write-Host "Defina MINIO_ACCESS_KEY en el entorno (no se versiona)." -ForegroundColor Red; exit 1 }
$AccessKey = $env:MINIO_ACCESS_KEY
if (-not $env:MINIO_SECRET_KEY) { Write-Host "Defina MINIO_SECRET_KEY en el entorno (no se versiona)." -ForegroundColor Red; exit 1 }
$SecretKey = $env:MINIO_SECRET_KEY
$BucketName = "unc-media"
$Region = "us-east-1"

Write-Host "🔍 Verificando MinIO..." -ForegroundColor Cyan

# Verificar conexión básica
try {
    $response = Invoke-WebRequest -Uri "$MinioEndpoint/minio/health/live" -ErrorAction Stop
    Write-Host "✅ MinIO está respondiendo en $MinioEndpoint" -ForegroundColor Green
} catch {
    Write-Host "❌ MinIO no responde en $MinioEndpoint" -ForegroundColor Red
    exit 1
}

# Crear bucket usando REST API de MinIO
Write-Host "📁 Verificando bucket '$BucketName'..." -ForegroundColor Cyan

# Generar fecha en formato ISO 8601 para AWS Signature V4
$date = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
$dateShort = [DateTime]::UtcNow.ToString("yyyyMMdd")

# Intentar crear bucket
$bucketUrl = "$MinioEndpoint/$BucketName"

try {
    $response = Invoke-WebRequest -Uri $bucketUrl -Method HEAD -ErrorAction SilentlyContinue
    Write-Host "✅ Bucket '$BucketName' ya existe" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Bucket no existe. Intentando crear..." -ForegroundColor Yellow

    # Usar AWS CLI si está disponible
    if (Get-Command aws -ErrorAction SilentlyContinue) {
        Write-Host "📦 Usando AWS CLI..." -ForegroundColor Cyan

        # Configurar credenciales temporales
        $env:AWS_ACCESS_KEY_ID = $AccessKey
        $env:AWS_SECRET_ACCESS_KEY = $SecretKey

        try {
            aws s3 mb s3://$BucketName `
                --endpoint-url $MinioEndpoint `
                --region $Region

            Write-Host "✅ Bucket creado exitosamente" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error al crear bucket: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  AWS CLI no instalado. Intenta crear manualmente." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Opción 1: Usar MinIO Console"
        Write-Host "  1. Abre http://localhost:9101"
        Write-Host "  2. Inicie sesión con el usuario y la clave de MinIO que provee su gestor de secretos"
        Write-Host "  3. Crea bucket 'unc-media'"
        Write-Host ""
        Write-Host "Opción 2: Instalar AWS CLI"
        Write-Host "  choco install awscli"
        Write-Host ""
    }
}

Write-Host ""
Write-Host "ℹ️  Información de MinIO:" -ForegroundColor Cyan
Write-Host "  Endpoint: $MinioEndpoint"
Write-Host "  Bucket: $BucketName"
Write-Host "  Usuario: $AccessKey"
Write-Host "  Console: http://localhost:9101"
