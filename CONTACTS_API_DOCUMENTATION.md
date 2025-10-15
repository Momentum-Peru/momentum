# 📇 Documentación API - Gestión de Contactos

## Descripción General

El sistema de gestión de contactos permite administrar contactos locales y sincronizar con Google Contacts. Cada usuario puede tener sus propios contactos identificados por `userId`.

## Autenticación

Todos los endpoints requieren autenticación JWT. Incluir el token en el header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints de Contactos

### 1. Crear Contacto

**POST** `/contacts`

Crea un nuevo contacto para el usuario autenticado.

#### Parámetros del Body:

```json
{
  "name": "string (requerido)",
  "email": "string (opcional)",
  "phone": "string (opcional)",
  "company": "string (opcional)",
  "jobTitle": "string (opcional)",
  "address": "string (opcional)",
  "notes": "string (opcional)",
  "source": "local | google_contacts (opcional, default: local)",
  "googleContactId": "string (opcional)",
  "metadata": "object (opcional)"
}
```

#### Ejemplo de Request:

```json
{
  "name": "Marcos Torres",
  "email": "marcos@example.com",
  "phone": "+51987654321",
  "company": "Tech Corp",
  "jobTitle": "Desarrollador Senior",
  "address": "Lima, Perú",
  "notes": "Contacto importante para proyectos"
}
```

#### Respuesta Exitosa (201):

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "name": "Marcos Torres",
  "email": "marcos@example.com",
  "phone": "+51987654321",
  "company": "Tech Corp",
  "jobTitle": "Desarrollador Senior",
  "address": "Lima, Perú",
  "notes": "Contacto importante para proyectos",
  "source": "local",
  "googleContactId": null,
  "metadata": null,
  "isActive": true,
  "createdAt": "2025-10-11T20:30:00.000Z",
  "updatedAt": "2025-10-11T20:30:00.000Z"
}
```

### 2. Listar Contactos

**GET** `/contacts`

Obtiene todos los contactos del usuario con filtros opcionales.

#### Parámetros de Query:

- `search`: string (opcional) - Búsqueda por texto en nombre, email, teléfono o empresa
- `source`: string (opcional) - Filtrar por fuente: `local` o `google_contacts`
- `isActive`: boolean (opcional) - Filtrar por estado activo
- `page`: string (opcional) - Número de página (default: 1)
- `limit`: string (opcional) - Elementos por página (default: 10)

#### Ejemplo de Request:

```
GET /contacts?search=Marcos&source=local&page=1&limit=20
```

#### Respuesta Exitosa (200):

```json
{
  "contacts": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "name": "Marcos Torres",
      "email": "marcos@example.com",
      "phone": "+51987654321",
      "company": "Tech Corp",
      "jobTitle": "Desarrollador Senior",
      "address": "Lima, Perú",
      "notes": "Contacto importante para proyectos",
      "source": "local",
      "googleContactId": null,
      "metadata": null,
      "isActive": true,
      "createdAt": "2025-10-11T20:30:00.000Z",
      "updatedAt": "2025-10-11T20:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### 3. Buscar Contactos

**GET** `/contacts/search`

Busca contactos por criterios específicos.

#### Parámetros de Query:

- `name`: string (opcional) - Buscar por nombre
- `email`: string (opcional) - Buscar por email
- `phone`: string (opcional) - Buscar por teléfono
- `company`: string (opcional) - Buscar por empresa

#### Ejemplo de Request:

```
GET /contacts/search?name=Marcos&email=marcos@example.com
```

#### Respuesta Exitosa (200):

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "name": "Marcos Torres",
    "email": "marcos@example.com",
    "phone": "+51987654321",
    "company": "Tech Corp",
    "jobTitle": "Desarrollador Senior",
    "address": "Lima, Perú",
    "notes": "Contacto importante para proyectos",
    "source": "local",
    "googleContactId": null,
    "metadata": null,
    "isActive": true,
    "createdAt": "2025-10-11T20:30:00.000Z",
    "updatedAt": "2025-10-11T20:30:00.000Z"
  }
]
```

### 4. Obtener Contacto por ID

**GET** `/contacts/:id`

Obtiene un contacto específico por su ID.

#### Parámetros de URL:

- `id`: string (requerido) - ID del contacto

#### Ejemplo de Request:

```
GET /contacts/507f1f77bcf86cd799439011
```

#### Respuesta Exitosa (200):

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "name": "Marcos Torres",
  "email": "marcos@example.com",
  "phone": "+51987654321",
  "company": "Tech Corp",
  "jobTitle": "Desarrollador Senior",
  "address": "Lima, Perú",
  "notes": "Contacto importante para proyectos",
  "source": "local",
  "googleContactId": null,
  "metadata": null,
  "isActive": true,
  "createdAt": "2025-10-11T20:30:00.000Z",
  "updatedAt": "2025-10-11T20:30:00.000Z"
}
```

### 5. Actualizar Contacto

**PUT** `/contacts/:id`

Actualiza un contacto existente.

#### Parámetros de URL:

- `id`: string (requerido) - ID del contacto

#### Parámetros del Body:

```json
{
  "name": "string (opcional)",
  "email": "string (opcional)",
  "phone": "string (opcional)",
  "company": "string (opcional)",
  "jobTitle": "string (opcional)",
  "address": "string (opcional)",
  "notes": "string (opcional)",
  "source": "local | google_contacts (opcional)",
  "googleContactId": "string (opcional)",
  "metadata": "object (opcional)",
  "isActive": "boolean (opcional)"
}
```

#### Ejemplo de Request:

```json
{
  "name": "Marcos Torres Actualizado",
  "company": "Nueva Empresa",
  "jobTitle": "Tech Lead"
}
```

#### Respuesta Exitosa (200):

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "name": "Marcos Torres Actualizado",
  "email": "marcos@example.com",
  "phone": "+51987654321",
  "company": "Nueva Empresa",
  "jobTitle": "Tech Lead",
  "address": "Lima, Perú",
  "notes": "Contacto importante para proyectos",
  "source": "local",
  "googleContactId": null,
  "metadata": null,
  "isActive": true,
  "createdAt": "2025-10-11T20:30:00.000Z",
  "updatedAt": "2025-10-11T20:35:00.000Z"
}
```

### 6. Eliminar Contacto

**DELETE** `/contacts/:id`

Elimina un contacto existente.

#### Parámetros de URL:

- `id`: string (requerido) - ID del contacto

#### Ejemplo de Request:

```
DELETE /contacts/507f1f77bcf86cd799439011
```

#### Respuesta Exitosa (200):

```json
{
  "message": "Contacto eliminado exitosamente"
}
```

### 7. Buscar Contacto por Email

**GET** `/contacts/by-email/:email`

Busca un contacto específico por su email.

#### Parámetros de URL:

- `email`: string (requerido) - Email del contacto

#### Ejemplo de Request:

```
GET /contacts/by-email/marcos@example.com
```

#### Respuesta Exitosa (200):

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "name": "Marcos Torres",
  "email": "marcos@example.com",
  "phone": "+51987654321",
  "company": "Tech Corp",
  "jobTitle": "Desarrollador Senior",
  "address": "Lima, Perú",
  "notes": "Contacto importante para proyectos",
  "source": "local",
  "googleContactId": null,
  "metadata": null,
  "isActive": true,
  "createdAt": "2025-10-11T20:30:00.000Z",
  "updatedAt": "2025-10-11T20:30:00.000Z"
}
```

### 8. Buscar Contactos por Nombre

**GET** `/contacts/by-name/:name`

Busca contactos por nombre (búsqueda aproximada).

#### Parámetros de URL:

- `name`: string (requerido) - Nombre del contacto

#### Ejemplo de Request:

```
GET /contacts/by-name/Marcos
```

#### Respuesta Exitosa (200):

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "name": "Marcos Torres",
    "email": "marcos@example.com",
    "phone": "+51987654321",
    "company": "Tech Corp",
    "jobTitle": "Desarrollador Senior",
    "address": "Lima, Perú",
    "notes": "Contacto importante para proyectos",
    "source": "local",
    "googleContactId": null,
    "metadata": null,
    "isActive": true,
    "createdAt": "2025-10-11T20:30:00.000Z",
    "updatedAt": "2025-10-11T20:30:00.000Z"
  }
]
```

## Endpoints de Google Contacts OAuth

### 1. Obtener URL de Autorización

**GET** `/contacts/google-oauth/authorization-url`

Genera la URL de autorización para conectar Google Contacts.

#### Ejemplo de Request:

```
GET /contacts/google-oauth/authorization-url
```

#### Respuesta Exitosa (200):

```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=https://www.googleapis.com/auth/contacts.readonly&response_type=code&access_type=offline&prompt=consent&state=507f1f77bcf86cd799439012"
}
```

### 2. Intercambiar Código por Tokens

**POST** `/contacts/google-oauth/exchange-code`

Intercambia el código de autorización por tokens de acceso.

#### Parámetros del Body:

```json
{
  "code": "string (requerido)",
  "state": "string (requerido)"
}
```

#### Ejemplo de Request:

```json
{
  "code": "4/0AX4XfWh...",
  "state": "507f1f77bcf86cd799439012"
}
```

#### Respuesta Exitosa (200):

```json
{
  "success": true,
  "tokenId": "507f1f77bcf86cd799439013"
}
```

#### Respuesta de Error (400):

```json
{
  "success": false,
  "error": "Error al intercambiar código por tokens"
}
```

### 3. Verificar Estado de Conexión

**GET** `/contacts/google-oauth/status`

Verifica el estado de conexión con Google Contacts.

#### Ejemplo de Request:

```
GET /contacts/google-oauth/status
```

#### Respuesta Exitosa (200):

```json
{
  "connected": true,
  "email": "usuario@gmail.com",
  "lastSync": "2025-10-11T20:30:00.000Z",
  "contactCount": 150
}
```

#### Respuesta No Conectado (200):

```json
{
  "connected": false
}
```

### 4. Sincronizar Contactos

**POST** `/contacts/google-oauth/sync`

Sincroniza contactos desde Google Contacts.

#### Ejemplo de Request:

```
POST /contacts/google-oauth/sync
```

#### Respuesta Exitosa (200):

```json
{
  "synced": 150,
  "errors": 0
}
```

### 5. Desconectar Google Contacts

**POST** `/contacts/google-oauth/disconnect`

Desconecta la cuenta de Google Contacts.

#### Ejemplo de Request:

```
POST /contacts/google-oauth/disconnect
```

#### Respuesta Exitosa (200):

```json
{
  "message": "Google Contacts desconectado exitosamente"
}
```

## Códigos de Error Comunes

### 400 - Bad Request

```json
{
  "statusCode": 400,
  "message": "Error al crear el contacto",
  "error": "Bad Request"
}
```

### 401 - Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 - Not Found

```json
{
  "statusCode": 404,
  "message": "Contacto no encontrado",
  "error": "Not Found"
}
```

### 500 - Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Error interno del servidor",
  "error": "Internal Server Error"
}
```

## Variables de Entorno Requeridas

```env
# Google Contacts OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CONTACTS_CALLBACK_URL=http://localhost:3000/auth/contacts/google/callback
```

## Ejemplos de Uso con cURL

### Crear un Contacto

```bash
curl -X POST http://localhost:3000/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+51987654321",
    "company": "Empresa ABC"
  }'
```

### Listar Contactos

```bash
curl -X GET "http://localhost:3000/contacts?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Buscar Contactos

```bash
curl -X GET "http://localhost:3000/contacts/search?name=Juan" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Obtener URL de Autorización Google

```bash
curl -X GET http://localhost:3000/contacts/google-oauth/authorization-url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Notas Importantes

1. **Autenticación**: Todos los endpoints requieren un token JWT válido
2. **Aislamiento de Datos**: Cada usuario solo puede acceder a sus propios contactos
3. **Fuentes de Contactos**: Los contactos pueden ser locales o sincronizados desde Google Contacts
4. **Búsqueda**: La búsqueda es case-insensitive y busca en múltiples campos
5. **Paginación**: Los endpoints de listado soportan paginación
6. **Validación**: Todos los campos opcionales son validados según su tipo
7. **Google Contacts**: Requiere configuración OAuth2 en Google Console

## Integración con AI Agent

El sistema de contactos está integrado con el AI Agent a través de MCP (Model Context Protocol). El agente puede:

- Listar contactos del usuario
- Buscar contactos por nombre, email o teléfono
- Obtener información detallada de contactos
- Verificar estado de Google Contacts
- Sincronizar contactos desde Google

### Comandos del AI Agent:

- "Lista mis contactos"
- "Busca contactos de Marcos"
- "Información de Juan Pérez"
- "Estado de Google Contacts"
- "Sincronizar contactos"
