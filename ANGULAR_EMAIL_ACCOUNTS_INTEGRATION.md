# Sistema de Gestión de Cuentas de Email - Endpoints y Contexto

## Endpoints Disponibles

### CRUD Operations

#### POST /email-accounts

**Crear cuenta de email**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Body**:

```json
{
  "name": "string (required)",
  "provider": "smtp | imap | gmail_oauth2 | outlook_oauth2 (required)",
  "host": "string (optional)",
  "port": "number (optional)",
  "email": "string (optional)",
  "password": "string (optional)",
  "secure": "boolean (optional)",
  "accessToken": "string (optional)",
  "refreshToken": "string (optional)",
  "tokenExpiresAt": "string (optional)",
  "clientId": "string (optional)",
  "clientSecret": "string (optional)",
  "scopes": "string[] (optional)",
  "metadata": "any (optional)"
}
```

- **Response**: `EmailAccount`

#### GET /email-accounts

**Listar cuentas con filtros**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Query Params**:
  - `userId`: string (optional)
  - `provider`: string (optional)
  - `status`: string (optional)
  - `page`: number (optional, default: 1)
  - `limit`: number (optional, default: 10)
- **Response**:

```json
{
  "accounts": "EmailAccount[]",
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

#### GET /email-accounts/my-accounts

**Obtener cuentas del usuario autenticado**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Response**: `EmailAccount[]`

#### GET /email-accounts/:id

**Obtener cuenta por ID**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Response**: `EmailAccount`

#### PUT /email-accounts/:id

**Actualizar cuenta**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Body**: Mismos campos que POST (todos opcionales)
- **Response**: `EmailAccount`

#### DELETE /email-accounts/:id

**Eliminar cuenta**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Response**: `204 No Content`

### SMTP Testing

#### POST /email-accounts/:id/test-smtp

**Testear conexión SMTP y enviar email de prueba**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Body**:

```json
{
  "testEmail": "string (required)",
  "subject": "string (optional)",
  "message": "string (optional)"
}
```

- **Response**:

```json
{
  "success": "boolean",
  "message": "string",
  "details": {
    "messageId": "string",
    "accepted": "string[]",
    "rejected": "string[]"
  }
}
```

#### POST /email-accounts/:id/verify-smtp

**Verificar conexión SMTP sin enviar email**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Body**: `{}`
- **Response**:

```json
{
  "success": "boolean",
  "message": "string"
}
```

### OAuth2 Operations

#### POST /email-accounts/oauth2/authorization-url

**Generar URL de autorización OAuth2**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Body**:

```json
{
  "provider": "gmail_oauth2 | outlook_oauth2"
}
```

- **Response**:

```json
{
  "authorizationUrl": "string",
  "state": "string"
}
```

#### POST /email-accounts/oauth2/exchange-tokens

**Intercambiar código de autorización por tokens**

- **Body**:

```json
{
  "code": "string",
  "state": "string",
  "provider": "gmail_oauth2 | outlook_oauth2"
}
```

- **Response**:

```json
{
  "success": "boolean",
  "accountId": "string",
  "message": "string"
}
```

#### POST /email-accounts/:id/refresh-token

**Refrescar access token OAuth2**

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Body**: `{}`
- **Response**:

```json
{
  "success": "boolean",
  "accessToken": "string",
  "message": "string"
}
```

## Estructuras de Datos

### EmailAccount

```json
{
  "_id": "string",
  "userId": "string",
  "name": "string",
  "provider": "smtp | imap | gmail_oauth2 | outlook_oauth2",
  "status": "active | inactive | error | testing",
  "host": "string (optional)",
  "port": "number (optional)",
  "email": "string (optional)",
  "secure": "boolean (optional)",
  "lastTestAt": "Date (optional)",
  "lastTestResult": "string (optional)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Prompt de Contexto

Implementar un sistema completo de gestión de cuentas de email en Angular 20 usando componentes standalone. El sistema debe permitir:

**Funcionalidades principales:**

- Crear, editar, listar y eliminar cuentas de email (SMTP, IMAP, Gmail OAuth2, Outlook OAuth2)
- Testear conexiones SMTP con envío de emails de prueba
- Integración OAuth2 completa para Google y Microsoft
- Verificación de conexiones sin envío de emails
- Refresh automático de tokens OAuth2

**Características técnicas:**

- Componentes standalone de Angular 20
- Signals para estado reactivo
- Formularios reactivos con validación
- Interceptores para JWT automático
- Manejo completo de errores y loading states
- UI moderna y responsive

**Flujo OAuth2:**

1. Usuario hace clic en botón "Conectar con Gmail/Outlook"
2. Se genera URL de autorización con state token
3. Usuario autoriza en el proveedor
4. Callback procesa código y state
5. Se intercambian tokens y se crea/actualiza cuenta
6. Redirección automática con feedback visual

**Componentes requeridos:**

- Botón OAuth2 con estados de carga
- Formulario para cuentas manuales (SMTP/IMAP)
- Lista de cuentas con acciones (test, editar, eliminar)
- Página de callback OAuth2
- Página principal que integra todo

**Servicios requeridos:**

- Servicio de cuentas de email (CRUD + SMTP + OAuth2)
- Servicio de autenticación JWT
- Interceptor para headers automáticos

**Consideraciones:**

- Usar `inject()` en lugar de constructor injection
- Implementar manejo de errores en todos los componentes
- Validación de formularios con Angular validators
- Persistencia de tokens en localStorage
- Verificación de state tokens para seguridad OAuth2
- Estados de carga y feedback visual en todas las operaciones
