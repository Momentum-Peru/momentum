$DISTRIBUTION_ID = "EGH0ZDJVBXGMH"
$FUNCTION_ARN = "arn:aws:cloudfront::749006369246:function/tecmeing-spa-router"

Write-Host "-> Obteniendo config del distribution..."
$raw = aws cloudfront get-distribution-config --id $DISTRIBUTION_ID | ConvertFrom-Json
$etag = $raw.ETag
$config = $raw.DistributionConfig

Write-Host "-> ETag: $etag"

$assoc = [PSCustomObject]@{
    FunctionARN = $FUNCTION_ARN
    EventType   = "viewer-request"
}

$fa = [PSCustomObject]@{
    Quantity = 1
    Items    = @($assoc)
}

$config.DefaultCacheBehavior | Add-Member -NotePropertyName FunctionAssociations -NotePropertyValue $fa -Force

$tmp = "$env:TEMP\cf-config.json"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($tmp, ($config | ConvertTo-Json -Depth 20), $utf8NoBom)
Write-Host "-> Config guardada en $tmp"

Write-Host "-> Actualizando distribution..."
$result = aws cloudfront update-distribution --id $DISTRIBUTION_ID --if-match $etag --distribution-config "file://$tmp" | ConvertFrom-Json

Write-Host "-> Status: $($result.Distribution.Status)"
Write-Host "Listo. Espera 2-3 min para que CloudFront propague."