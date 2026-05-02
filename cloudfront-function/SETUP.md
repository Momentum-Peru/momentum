# CloudFront Setup — SPA Router

Ejecutar una sola vez para habilitar el routing de ambas apps bajo el mismo dominio.

## Requisitos

- AWS CLI instalada y configurada (`aws configure`)
- Credenciales con permisos sobre CloudFront

## Paso 1 — Crear y publicar la función

Abrir PowerShell en esta carpeta y ejecutar:

```powershell
cd C:\Marcos\Proyectos\Tecmeing\code\tecmeing\cloudfront-function
.\associate-function.ps1
```

Salida esperada:
```
-> Obteniendo config del distribution...
-> ETag: ETVPDKIKX0DER
-> Actualizando distribution...
-> Status: InProgress
Listo. Espera 2-3 min para que CloudFront propague.
```

## Paso 2 — Esperar propagación

CloudFront tarda 2-3 minutos en propagar el cambio.
Verificar en AWS Console → CloudFront → `EGH0ZDJVBXGMH` → pestaña **General** → Status: **Deployed**.

## Paso 3 — Verificar

Reemplazar `TU_DOMINIO` con el dominio real (ej: `app.tecmeing.com` o `xxxx.cloudfront.net`):

| URL | Resultado esperado |
|-----|--------------------|
| `https://TU_DOMINIO/` | App tecmeing |
| `https://TU_DOMINIO/rrhh/` | App momentum-rrhh |
| `https://TU_DOMINIO/rrhh/login` | Login de momentum-rrhh (SPA routing) |
| `https://TU_DOMINIO/rrhh/dashboard` | Dashboard de momentum-rrhh (SPA routing) |

## Qué hace la función

El archivo `spa-router.js` le dice a CloudFront:

- Solicitudes a `/rrhh/*` sin extensión → servir `/rrhh/index.html` (Angular toma el control)
- Solicitudes a `/*` sin extensión → servir `/index.html` (tecmeing toma el control)
- Archivos con extensión (`.js`, `.css`, `.png`, etc.) → servir directamente desde S3

## Si el script falla

Verificar que la función fue creada previamente:

```powershell
aws cloudfront list-functions --query "FunctionList.Items[].Name"
```

Debe aparecer `tecmeing-spa-router`. Si no aparece, volver a ejecutar primero:

```powershell
$FUNCTION_NAME = "tecmeing-spa-router"
$FUNCTION_FILE = "C:\Marcos\Proyectos\Tecmeing\code\tecmeing\cloudfront-function\spa-router.js"

aws cloudfront create-function `
  --name $FUNCTION_NAME `
  --function-config "Comment=SPA router tecmeing + momentum-rrhh,Runtime=cloudfront-js-2.0" `
  --function-code "fileb://$FUNCTION_FILE"

$ETAG = (aws cloudfront describe-function --name $FUNCTION_NAME | ConvertFrom-Json).ETag
aws cloudfront publish-function --name $FUNCTION_NAME --if-match $ETAG
```

Y luego ejecutar `associate-function.ps1`.
