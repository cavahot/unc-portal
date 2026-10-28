#!/usr/bin/env bash
# =============================================================
# rename-certs.sh — Copia certificados Let's Encrypt al directorio
#                   que nginx espera, con los nombres correctos.
# =============================================================
# Uso:
#   bash scripts/setup/rename-certs.sh
#
# Requiere:
#   - Haber corrido certbot previamente para cms.unc.edu.py (Let's Encrypt)
#   - Ejecutar desde la raíz del repositorio
#   - Permisos de root (certbot almacena las claves en /etc/letsencrypt/)
# =============================================================
set -euo pipefail

LE_BASE="/etc/letsencrypt/live"
CERTS_DIR="infrastructure/nginx/certs"

# Mapa de dominio → nombre de archivo en nginx.conf
declare -A DOMAINS=(
  ["www.unc.edu.py"]="www"
  ["cms.unc.edu.py"]="cms"
)

# DOMINIOS-SSL-01: www.unc.edu.py usa un certificado comercial Sectigo, NO de Let's Encrypt: no hay carpeta
# en /etc/letsencrypt. Se copia a mano como www_fullchain.pem (certificado + intermedios, en ese orden) y
# www_privkey.pem, que nunca se versionan. Aquí solo se verifica que ya estén, para no fallar en falso.

echo "============================================"
echo "  Copiando certificados SSL → nginx/certs"
echo "============================================"
echo ""

mkdir -p "$CERTS_DIR"

ERRORS=0

for domain in "${!DOMAINS[@]}"; do
  name="${DOMAINS[$domain]}"
  src="$LE_BASE/$domain"

  if [[ "$name" == "www" ]]; then
    if [[ -f "$CERTS_DIR/${name}_fullchain.pem" ]] && [[ -f "$CERTS_DIR/${name}_privkey.pem" ]]; then
      EXPIRY=$(openssl x509 -noout -enddate -in "$CERTS_DIR/${name}_fullchain.pem" 2>/dev/null | cut -d= -f2 || echo "desconocido")
      echo "✓  $domain (Sectigo, copia manual ya presente)"
      echo "   Vence: $EXPIRY  — renovación manual anual: reemplazar www_fullchain.pem y www_privkey.pem"
      echo ""
    else
      echo "✗  Falta el certificado Sectigo de $domain en $CERTS_DIR"
      echo "   Esperados: ${name}_fullchain.pem (cert + intermedios) y ${name}_privkey.pem (ver DEPLOY.md)"
      ERRORS=$((ERRORS + 1))
    fi
    continue
  fi

  if [[ ! -d "$src" ]]; then
    echo "✗  No se encontró el certificado para $domain"
    echo "   Esperado en: $src"
    echo "   Ejecutá: certbot certonly --standalone -d $domain   (con nginx detenido, puerto 80 libre)"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  if [[ ! -f "$src/fullchain.pem" ]] || [[ ! -f "$src/privkey.pem" ]]; then
    echo "✗  Certificado incompleto para $domain (faltan fullchain.pem o privkey.pem)"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  cp "$src/fullchain.pem" "$CERTS_DIR/${name}_fullchain.pem"
  cp "$src/privkey.pem"   "$CERTS_DIR/${name}_privkey.pem"
  chmod 640 "$CERTS_DIR/${name}_privkey.pem"

  EXPIRY=$(openssl x509 -noout -enddate -in "$src/fullchain.pem" 2>/dev/null | cut -d= -f2 || echo "desconocido")
  echo "✓  $domain"
  echo "   → ${name}_fullchain.pem + ${name}_privkey.pem"
  echo "   Vence: $EXPIRY"
  echo ""
done

if [[ $ERRORS -gt 0 ]]; then
  echo "✗  $ERRORS dominio(s) fallaron. Resolvé los errores antes de levantar nginx."
  exit 1
fi

echo "============================================"
echo "  ✅ Certs copiados a $CERTS_DIR"
echo "============================================"
echo ""
echo "  Si nginx ya está corriendo, recargá la config:"
echo "  docker compose -f infrastructure/docker/compose.prod.yaml \\"
echo "    --env-file infrastructure/docker/.env.prod \\"
echo "    exec nginx nginx -s reload"
