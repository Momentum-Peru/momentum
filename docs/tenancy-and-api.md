## Multi-tenant por Company (_id como tenantId)

Esta API es multi-tenant. Cada request debe incluir el header:

```http
X-Tenant-Id: <companyId>
```

Reglas:
- Si falta o es inválido, se devuelve 400. Si el tenant no existe o está inactivo, 404.
- Todas las colecciones (excepto `companies`) poseen el campo `tenantId: ObjectId` y están aisladas por tenant.
- El aislamiento se aplica automáticamente mediante un plugin global de Mongoose que:
  - Inserta `tenantId` en creaciones.
  - Filtra por `tenantId` en consultas `find`, `findOne`, `update*`, `delete*`.
  - Nota: en `aggregate()` se debe anteponer manualmente `$match: { tenantId }`.

### Usuarios con acceso a múltiples empresas

- El `User` tiene acceso a múltiples tenants mediante `tenantIds: ObjectId[]` (única fuente de verdad).
- El interceptor de tenant valida que, si `tenantIds` no está vacío, el `X-Tenant-Id` solicitado pertenezca a ese conjunto; en caso contrario responde 403.
- Endpoints exentos de validación de acceso: `/companies/*` y endpoints públicos de autenticación (`/auth/*`), aunque pueden requerir otros headers.

### Errores comunes

- 400: `X-Tenant-Id inválido` (no es un ObjectId válido)
- 403: `No tiene acceso al tenant especificado` (el usuario no lo tiene en `tenantIds`)
- 404: `Tenant no encontrado o inactivo`

## Recurso Companies (tenant root)

Base: `/companies`

- POST `/companies`
  - Crea una empresa (tenant). No requiere header `X-Tenant-Id`.
  - Body ejemplo:
    ```json
    { "name": "Momentum Tech S.A.", "code": "MOMTECH-001", "taxId": "20123456789" }
    ```
  - Respuestas: 201, 400, 409

- GET `/companies?search=&isActive=`
  - Lista empresas (tenant). No requiere header.
  - Query: `search` (texto), `isActive` (boolean)

- GET `/companies/:id`
- GET `/companies/code/:code`
- PATCH `/companies/:id`
- POST `/companies/:id/activate`
- POST `/companies/:id/deactivate`
- DELETE `/companies/:id`

## Headers comunes

Enviar en todos los endpoints (excepto `/companies/*` y algunos de `/auth/*`):
```http
Authorization: Bearer <token>
X-Tenant-Id: <companyId>
```

## Endpoints principales por módulo (resumen)

Nota: Todas las rutas bajo este resumen heredan filtrado por tenant mediante `X-Tenant-Id`.

- Users `/users` (CRUD y administración)
- Clients `/clients` (CRUD de clientes)
- Projects `/projects` (CRUD de proyectos)
- Quotes `/quotes`
- Orders `/orders`
- Tasks `/tasks`
- Documents `/documents`
- Daily Reports `/daily-reports`
- Providers `/providers`
- CRM
  - Leads `/crm/leads`
  - Contacts `/crm/contacts`
  - Follow-ups `/crm/follow-ups`
- Areas `/areas`
- Menu Permissions `/menu-permissions`
- Email Accounts `/email-accounts`
- Auth `/auth/*`

Para cada recurso, los payloads de creación y actualización corresponden a los DTOs del módulo (campos adicionales de auditoría y `tenantId` se gestionan automáticamente).

## Comportamiento técnico del tenant

- Header: `X-Tenant-Id` (ObjectId válido de `companies`).
- Interceptor global valida existencia e inactividad del tenant.
- Plugin Mongoose:
  - `pre('save')`: establece `tenantId` si falta.
  - `pre('find'|'findOne'|'countDocuments'|'findOneAndUpdate'|'update*'|'delete*')`: agrega filtro `{ tenantId }` si no está presente.
  - `aggregate()`: agregar `$match: { tenantId }` manualmente.
- `companies` no utiliza `tenantId` y es accesible sin header.

## Ejemplos

Crear cliente:
```http
POST /clients
X-Tenant-Id: 64f0a3c7b1e2a9d5f0c12345
Content-Type: application/json

{ "name": "Acme", "taxId": "20111111111" }
```

Listar tareas filtradas por tenant:
```http
GET /tasks?status=En%20curso
X-Tenant-Id: 64f0a3c7b1e2a9d5f0c12345
```

Curl de ejemplo con autenticación y tenant:
```bash
curl -H "Authorization: Bearer <TOKEN>" \
     -H "X-Tenant-Id: 64f0a3c7b1e2a9d5f0c12345" \
     https://api.example.com/projects
```


