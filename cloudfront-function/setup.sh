#!/bin/bash
# Setup inicial — ejecutar UNA sola vez con AWS CLI configurado
set -e

FUNCTION_NAME="tecmeing-spa-router"
DISTRIBUTION_ID="EGH0ZDJVBXGMH"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── 1. Crear o actualizar la CloudFront Function ─────────────────────────
echo "→ Verificando función CloudFront..."
EXISTING=$(aws cloudfront list-functions \
  --query "FunctionList.Items[?Name=='$FUNCTION_NAME'].Name" \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING" ]; then
  ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query 'ETag' --output text)
  aws cloudfront update-function \
    --name "$FUNCTION_NAME" \
    --function-config "Comment=SPA router tecmeing + momentum-rrhh,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$SCRIPT_DIR/spa-router.js" \
    --if-match "$ETAG"
  echo "→ Función actualizada."
else
  aws cloudfront create-function \
    --name "$FUNCTION_NAME" \
    --function-config "Comment=SPA router tecmeing + momentum-rrhh,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$SCRIPT_DIR/spa-router.js"
  echo "→ Función creada."
fi

ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query 'ETag' --output text)
aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG"
echo "✓ Función '$FUNCTION_NAME' publicada."

# ─── 2. Instrucciones para asociar la función en CloudFront ───────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " PASO MANUAL — AWS Console (solo una vez)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo " CloudFront → $DISTRIBUTION_ID → Behaviors"
echo " Editar el behavior 'Default (*)'"
echo ""
echo " Function associations → Viewer request:"
echo "   Tipo: CloudFront Functions"
echo "   Función: $FUNCTION_NAME"
echo ""
echo " Guardar y esperar ~3-5 min."
echo "═══════════════════════════════════════════════════════════"
