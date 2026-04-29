$FUNCTION_NAME = "tecmeing-spa-router"
$SCRIPT_DIR   = Split-Path -Parent $MyInvocation.MyCommand.Path
$CODE_FILE    = Join-Path $SCRIPT_DIR "spa-router.js"

Write-Host "-> Obteniendo ETag de la funcion..."
$etag = aws cloudfront describe-function --name $FUNCTION_NAME --query 'ETag' --output text

Write-Host "-> ETag: $etag"
Write-Host "-> Actualizando codigo de la funcion..."
aws cloudfront update-function `
    --name $FUNCTION_NAME `
    --function-config "Comment=SPA router tecmeing + momentum-rrhh,Runtime=cloudfront-js-2.0" `
    --function-code "fileb://$CODE_FILE" `
    --if-match $etag | Out-Null

Write-Host "-> Publicando funcion..."
$etag2 = aws cloudfront describe-function --name $FUNCTION_NAME --query 'ETag' --output text
aws cloudfront publish-function --name $FUNCTION_NAME --if-match $etag2 | Out-Null

Write-Host "Listo. La funcion '$FUNCTION_NAME' fue actualizada y publicada."
Write-Host "Espera 1-2 min para que CloudFront propague."
