# Documentación Completa de Endpoints - Tecmeing Backend

## Información General

**Base URL**: `http://localhost:3026`

**Autenticación**: La mayoría de los endpoints requieren un token JWT en el header:
```
Authorization: Bearer <token>
```

**Multi-tenant**: La mayoría de los endpoints requieren el header `X-Tenant-Id` para identificar la empresa/tenant:
```
X-Tenant-Id: <companyId>
```

**Nota sobre el rol de Gerencia**: El rol `gerencia` puede ver información de todas las empresas y todos los módulos. El manejo del rol se realiza desde el frontend, pero todos los endpoints están disponibles para este rol.

---

## Índice

1. [Autenticación](#autenticación)
2. [Usuarios](#usuarios)
3. [Empresas (Companies)](#empresas-companies)
4. [Clientes](#clientes)
5. [Proyectos](#proyectos)
6. [Tareas](#tareas)
7. [Cotizaciones](#cotizaciones)
8. [Empleados](#empleados)
9. [CRM](#crm)
10. [Reconocimiento Facial](#reconocimiento-facial)
11. [Dashboard](#dashboard)
12. [Reportes Diarios](#reportes-diarios)
13. [Órdenes](#órdenes)
14. [TDRs](#tdrs)
15. [Requerimientos](#requerimientos)
16. [Áreas](#áreas)
17. [Proveedores](#proveedores)
18. [Documentos](#documentos)
19. [Seguimiento de Tiempo](#seguimiento-de-tiempo)
20. [Permisos de Menú](#permisos-de-menú)

---

## Autenticación

### POST /auth/register

Registra un nuevo usuario en el sistema.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "miPassword123",
  "name": "Juan Pérez",
  "role": "user" // Opcional: "user", "admin", "gerencia"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "role": "user",
    "isActive": true,
    "tenantIds": []
  }
}
```

### POST /auth/login

Autentica un usuario existente.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "miPassword123"
}
```

**Response (200):** Mismo formato que `/auth/register`

### GET /auth/profile

Obtiene el perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "role": "user",
  "isActive": true,
  "tenantIds": []
}
```

---

## Usuarios

### GET /users

Obtiene lista paginada de usuarios. Requiere roles: `admin`, `gerencia`, `user`.

**Query Parameters:**
- `page` (number, opcional): Número de página (default: 1)
- `limit` (number, opcional): Límite por página (default: 10)
- `role` (string, opcional): Filtrar por rol
- `isActive` (boolean, opcional): Filtrar por estado activo/inactivo
- `search` (string, opcional): Buscar por nombre o email
- `tenantId` (string, opcional): Filtrar por ID de tenant

**Response (200):**
```json
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "usuario@ejemplo.com",
      "name": "Juan Pérez",
      "role": "user",
      "isActive": true,
      "tenantIds": []
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

### GET /users/:id

Obtiene un usuario específico por ID. Requiere roles: `admin`, `gerencia`.

**Response (200):** Objeto de usuario completo

### POST /users

Crea un nuevo usuario.

**Body:**
```json
{
  "email": "nuevo@ejemplo.com",
  "password": "password123",
  "name": "Nuevo Usuario",
  "role": "user", // Opcional: "user", "admin", "gerencia"
  "tenantIds": [] // Opcional: Array de IDs de tenants
}
```

### PATCH /users/:id

Actualiza un usuario. Requiere roles: `admin`, `gerencia`.

**Body:**
```json
{
  "name": "Nombre Actualizado",
  "role": "admin",
  "isActive": true,
  "tenantIds": ["507f1f77bcf86cd799439011"]
}
```

### DELETE /users/:id

Desactiva un usuario (soft delete).

---

## Empresas (Companies)

**Nota**: Los endpoints de empresas NO requieren el header `X-Tenant-Id` ya que son el recurso raíz del sistema multi-tenant.

### GET /companies

Lista todas las empresas con filtros opcionales. **Disponible para el rol de gerencia para ver todas las empresas**.

**Query Parameters:**
- `search` (string, opcional): Búsqueda por texto en nombre, código, RUC o descripción
- `isActive` (boolean, opcional): Filtrar por estado activo/inactivo

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Empresa Ejemplo S.A.",
    "code": "EMP-001",
    "taxId": "20123456789",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### GET /companies/:id

Obtiene una empresa por ID.

### GET /companies/code/:code

Obtiene una empresa por código.

### POST /companies

Crea una nueva empresa.

**Body:**
```json
{
  "name": "Nueva Empresa S.A.",
  "code": "NUEVA-001",
  "taxId": "20123456789",
  "description": "Descripción de la empresa"
}
```

### PATCH /companies/:id

Actualiza una empresa.

### POST /companies/:id/activate

Activa una empresa.

### POST /companies/:id/deactivate

Desactiva una empresa.

### DELETE /companies/:id

Elimina una empresa.

---

## Clientes

### GET /clients

Obtiene todos los clientes.

**Query Parameters:**
- `q` (string, opcional): Término de búsqueda

**Response (200):** Array de clientes

### GET /clients/:id

Obtiene un cliente por ID.

### GET /clients/country/:paisCodigo

Obtiene clientes por código de país.

### GET /clients/country/:paisCodigo/province/:provinciaCodigo

Obtiene clientes por país y provincia.

### GET /clients/country/:paisCodigo/province/:provinciaCodigo/district/:distritoCodigo

Obtiene clientes por país, provincia y distrito.

### POST /clients

Crea un nuevo cliente.

**Body:**
```json
{
  "name": "Cliente Ejemplo",
  "email": "cliente@ejemplo.com",
  "phone": "+51 999 999 999",
  "address": "Dirección del cliente"
}
```

### PATCH /clients/:id

Actualiza un cliente.

### DELETE /clients/:id

Elimina un cliente.

### POST /clients/:id/documents

Sube un documento para un cliente.

**Body (multipart/form-data):**
- `file`: Archivo a subir

---

## Proyectos

### GET /projects

Obtiene todos los proyectos.

**Query Parameters:**
- `clientId` (string, opcional): Filtrar por ID de cliente
- `status` (string, opcional): Filtrar por estado
- `activeOnly` (boolean, opcional): Solo proyectos activos
- `q` (string, opcional): Término de búsqueda

**Response (200):** Array de proyectos

### GET /projects/active

Obtiene solo los proyectos activos.

### GET /projects/stats

Obtiene estadísticas de proyectos.

### GET /projects/next-code

Obtiene el siguiente código disponible para un proyecto.

### GET /projects/options

Obtiene opciones para proyectos.

### GET /projects/client/:clientId

Obtiene proyectos por cliente.

**Query Parameters:**
- `activeOnly` (boolean, opcional): Solo proyectos activos

### GET /projects/:id

Obtiene un proyecto por ID.

### GET /projects/code/:code

Obtiene un proyecto por código.

### POST /projects

Crea un nuevo proyecto.

**Body:**
```json
{
  "name": "Proyecto Ejemplo",
  "code": "PROJ-001",
  "clientId": "507f1f77bcf86cd799439011",
  "status": "ACTIVE",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.999Z"
}
```

### PATCH /projects/:id

Actualiza un proyecto.

### PATCH /projects/:id/status

Actualiza el estado de un proyecto.

**Body:**
```json
{
  "status": "COMPLETED"
}
```

### DELETE /projects/:id

Elimina un proyecto.

---

## Tareas

### GET /tasks

Obtiene todas las tareas.

**Query Parameters:**
- Ver `TaskQueryDto` para parámetros completos

**Response (200):** Array de tareas

### GET /tasks/kanban

Obtiene el tablero Kanban de tareas.

### GET /tasks/statistics

Obtiene estadísticas de tareas.

### GET /tasks/user/:userId

Obtiene tareas por usuario.

**Query Parameters:**
- `status` (string, opcional): Filtrar por estado

### GET /tasks/project/:projectId

Obtiene tareas por proyecto.

**Query Parameters:**
- `status` (string, opcional): Filtrar por estado

### GET /tasks/client/:clientId

Obtiene tareas por cliente.

**Query Parameters:**
- `status` (string, opcional): Filtrar por estado

### GET /tasks/:id

Obtiene una tarea por ID.

### POST /tasks

Crea una nueva tarea.

**Body:**
```json
{
  "title": "Tarea Ejemplo",
  "description": "Descripción de la tarea",
  "projectId": "507f1f77bcf86cd799439011",
  "assignedTo": "507f1f77bcf86cd799439011",
  "status": "TODO",
  "priority": "MEDIUM"
}
```

### PATCH /tasks/:id

Actualiza una tarea.

### PATCH /tasks/:id/status

Actualiza el estado de una tarea.

**Body:**
```json
{
  "status": "IN_PROGRESS"
}
```

### DELETE /tasks/:id

Elimina una tarea.

### POST /tasks/:id/info

Agrega información adicional a una tarea.

### POST /tasks/:id/attachments

Sube archivos adjuntos a una tarea.

**Body (multipart/form-data):**
- `files`: Array de archivos

---

## Cotizaciones

### GET /quotes

Obtiene todas las cotizaciones.

**Query Parameters:**
- Ver `QuoteQueryDto` para parámetros completos

**Response (200):** Array de cotizaciones

### GET /quotes/statistics

Obtiene estadísticas de cotizaciones.

### GET /quotes/client/:clientId

Obtiene cotizaciones por cliente.

**Query Parameters:**
- `state` (string, opcional): Filtrar por estado

### GET /quotes/project/:projectId

Obtiene cotizaciones por proyecto.

**Query Parameters:**
- `state` (string, opcional): Filtrar por estado

### GET /quotes/:id

Obtiene una cotización por ID.

### POST /quotes

Crea una nueva cotización.

**Body:**
```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "projectId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "description": "Item 1",
      "quantity": 1,
      "unitPrice": 100.00
    }
  ],
  "state": "DRAFT"
}
```

### PATCH /quotes/:id

Actualiza una cotización.

### PATCH /quotes/:id/state

Actualiza el estado de una cotización.

**Body:**
```json
{
  "state": "APPROVED"
}
```

### DELETE /quotes/:id

Elimina una cotización.

### GET /quotes/:id/pdf

Genera y descarga el PDF de una cotización.

### POST /quotes/:id/documents

Sube documentos a una cotización.

**Body (multipart/form-data):**
- `files`: Array de archivos

---

## Empleados

### GET /employees

Obtiene todos los empleados.

**Query Parameters:**
- `q` (string, opcional): Término de búsqueda (nombre, apellido, DNI, correo, número de seguro social)
- `userId` (string, opcional): Filtrar por ID de usuario

**Response (200):** Array de empleados

### GET /employees/user/:userId

Obtiene empleados por ID de usuario.

### GET /employees/dni/:dni

Obtiene un empleado por DNI.

### GET /employees/:id

Obtiene un empleado por ID.

### POST /employees

Crea un nuevo empleado.

**Body:**
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "dni": "12345678",
  "email": "juan.perez@ejemplo.com",
  "phone": "+51 999 999 999",
  "userId": "507f1f77bcf86cd799439011"
}
```

### PATCH /employees/:id

Actualiza un empleado.

### DELETE /employees/:id

Elimina un empleado.

---

## CRM

### Leads

#### GET /crm/leads

Obtiene todos los leads.

**Query Parameters:**
- Ver documentación completa en `docs/CRM_API.md`

#### GET /crm/leads/:id

Obtiene un lead por ID.

#### POST /crm/leads

Crea un nuevo lead.

#### PATCH /crm/leads/:id

Actualiza un lead.

#### DELETE /crm/leads/:id

Elimina un lead.

### Contactos

#### GET /crm/contacts

Obtiene todos los contactos.

#### GET /crm/contacts/:id

Obtiene un contacto por ID.

#### POST /crm/contacts

Crea un nuevo contacto.

#### PATCH /crm/contacts/:id

Actualiza un contacto.

#### DELETE /crm/contacts/:id

Elimina un contacto.

### Follow-ups

#### GET /crm/follow-ups

Obtiene todos los follow-ups.

#### GET /crm/follow-ups/:id

Obtiene un follow-up por ID.

#### POST /crm/follow-ups

Crea un nuevo follow-up.

#### PATCH /crm/follow-ups/:id

Actualiza un follow-up.

#### DELETE /crm/follow-ups/:id

Elimina un follow-up.

**Nota**: Para documentación completa del módulo CRM, ver `docs/CRM_API.md`

---

## Reconocimiento Facial

### POST /face-recognition/register

Registra un descriptor facial para un usuario.

**Query Parameters:**
- `tenantId` (string, requerido): ID del tenant

**Body (multipart/form-data):**
- `image` (file, requerido): Imagen con el rostro del usuario
- `userId` (string, requerido): ID del usuario
- `descriptor` (string, requerido): Array de 128 números como JSON string

**Ejemplo:**
```bash
curl -X POST "http://localhost:3026/face-recognition/register?tenantId=507f1f77bcf86cd799439011" \
  -F "image=@rostro.jpg" \
  -F "userId=507f1f77bcf86cd799439011" \
  -F "descriptor=[0.123, -0.456, 0.789, ...]"
```

### POST /face-recognition/attendance

Marca asistencia mediante reconocimiento facial.

**Query Parameters:**
- `tenantId` (string, requerido): ID del tenant

**Body (multipart/form-data):**
- `image` (file, requerido): Imagen con el rostro del usuario
- `descriptor` (string, requerido): Array de 128 números como JSON string
- `type` (string, opcional): "ENTRADA" o "SALIDA"
- `location` (string, opcional): Ubicación de la marcación
- `notes` (string, opcional): Notas adicionales

**Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "tenantId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439011",
  "type": "ENTRADA",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "imageUrl": "https://bucket.s3.amazonaws.com/...",
  "confidence": 0.95,
  "location": "Oficina Principal",
  "notes": null
}
```

### GET /face-recognition/descriptors/user/:userId

Obtiene descriptores faciales de un usuario.

**Query Parameters:**
- `tenantId` (string, requerido): ID del tenant

### DELETE /face-recognition/descriptors/:id

Elimina un descriptor facial.

**Query Parameters:**
- `tenantId` (string, requerido): ID del tenant

### GET /face-recognition/attendance

Obtiene registros de asistencia.

**Query Parameters:**
- `tenantId` (string, requerido): ID del tenant
- `userId` (string, opcional): Filtrar por usuario
- `startDate` (string, opcional): Fecha de inicio (ISO)
- `endDate` (string, opcional): Fecha de fin (ISO)

---

## Dashboard

### GET /dashboard

Obtiene datos del dashboard.

**Query Parameters:**
- `period` (string, opcional): Período de tiempo (ej: "30d", "7d", "1y")
- `startDate` (string, opcional): Fecha de inicio (ISO)
- `endDate` (string, opcional): Fecha de fin (ISO)
- `projectId` (string, opcional): Filtrar por proyecto
- `clientId` (string, opcional): Filtrar por cliente

**Response (200):**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalProjects": 10,
      "activeProjects": 5,
      "totalClients": 20,
      "totalQuotes": 15
    },
    "charts": {
      "dailyReports": { "labels": [], "data": [] },
      "projectReports": { "labels": [], "data": [] }
    },
    "tables": {
      "recentProjects": [],
      "recentQuotes": []
    }
  },
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "period": "30d",
    "performance": {
      "processingTimeMs": 150
    }
  }
}
```

---

## Reportes Diarios

### GET /daily-reports

Obtiene todos los reportes diarios.

**Query Parameters:**
- Ver documentación completa en `docs/daily-reports-api.md`

### GET /daily-reports/:id

Obtiene un reporte diario por ID.

### POST /daily-reports

Crea un nuevo reporte diario.

### PATCH /daily-reports/:id

Actualiza un reporte diario.

### DELETE /daily-reports/:id

Elimina un reporte diario.

**Nota**: Para documentación completa, ver `docs/daily-reports-api.md`

---

## Órdenes

### GET /orders

Obtiene todas las órdenes.

**Query Parameters:**
- `q` (string, opcional): Término de búsqueda

### GET /orders/:id

Obtiene una orden por ID.

### POST /orders

Crea una nueva orden.

**Body:**
```json
{
  "code": "ORD-001",
  "clientId": "507f1f77bcf86cd799439011",
  "items": [],
  "status": "PENDING"
}
```

### PATCH /orders/:id

Actualiza una orden.

### DELETE /orders/:id

Elimina una orden.

### POST /orders/:id/documents

Sube documentos a una orden.

**Body (multipart/form-data):**
- `file`: Archivo a subir

---

## TDRs

### GET /tdrs

Obtiene todos los TDRs.

**Query Parameters:**
- `q` (string, opcional): Término de búsqueda

### GET /tdrs/:id

Obtiene un TDR por ID.

### POST /tdrs

Crea un nuevo TDR.

### PATCH /tdrs/:id

Actualiza un TDR.

### POST /tdrs/:id/approve

Aprueba un TDR.

### DELETE /tdrs/:id

Elimina un TDR.

### POST /tdrs/:id/documents

Sube documentos a un TDR.

**Body (multipart/form-data):**
- `file`: Archivo a subir

---

## Requerimientos

### GET /requirements

Obtiene todos los requerimientos.

**Query Parameters:**
- Ver documentación completa en `docs/requirements-api.md`

### GET /requirements/:id

Obtiene un requerimiento por ID.

### POST /requirements

Crea un nuevo requerimiento.

### PATCH /requirements/:id

Actualiza un requerimiento.

### DELETE /requirements/:id

Elimina un requerimiento.

**Nota**: Para documentación completa, ver `docs/requirements-api.md`

---

## Áreas

### GET /areas

Obtiene todas las áreas.

**Query Parameters:**
- Ver documentación completa en `docs/areas-api.md`

### GET /areas/:id

Obtiene un área por ID.

### POST /areas

Crea un nuevo área.

### PATCH /areas/:id

Actualiza un área.

### DELETE /areas/:id

Elimina un área.

**Nota**: Para documentación completa, ver `docs/areas-api.md`

---

## Proveedores

### GET /providers

Obtiene todos los proveedores.

**Query Parameters:**
- Ver documentación completa en `docs/providers-api.md`

### GET /providers/:id

Obtiene un proveedor por ID.

### POST /providers

Crea un nuevo proveedor.

### PATCH /providers/:id

Actualiza un proveedor.

### DELETE /providers/:id

Elimina un proveedor.

**Nota**: Para documentación completa, ver `docs/providers-api.md`

---

## Documentos

### GET /documents

Obtiene todos los documentos.

**Query Parameters:**
- Ver documentación completa en `docs/documents-api.md`

### GET /documents/:id

Obtiene un documento por ID.

### POST /documents

Sube un nuevo documento.

**Body (multipart/form-data):**
- `file`: Archivo a subir
- `entityType`: Tipo de entidad (ej: "projects", "clients")
- `entityId`: ID de la entidad

### DELETE /documents/:id

Elimina un documento.

**Nota**: Para documentación completa, ver `docs/documents-api.md`

---

## Seguimiento de Tiempo

### GET /time-tracking

Obtiene todos los registros de seguimiento de tiempo.

**Query Parameters:**
- Ver documentación completa en `docs/time-tracking.md`

### GET /time-tracking/:id

Obtiene un registro por ID.

### POST /time-tracking

Crea un nuevo registro de seguimiento de tiempo.

**Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "taskId": "507f1f77bcf86cd799439011",
  "startTime": "2024-01-15T09:00:00.000Z",
  "endTime": "2024-01-15T17:00:00.000Z",
  "description": "Trabajo en funcionalidad X"
}
```

### PATCH /time-tracking/:id

Actualiza un registro.

### DELETE /time-tracking/:id

Elimina un registro.

**Nota**: Para documentación completa, ver `docs/time-tracking.md`

---

## Permisos de Menú

### GET /menu-permissions

Obtiene todos los permisos de menú.

**Query Parameters:**
- Ver documentación completa en `docs/menu-permissions-api.md`

### GET /menu-permissions/user/:userId

Obtiene permisos de menú de un usuario.

### POST /menu-permissions

Crea un nuevo permiso de menú.

### PATCH /menu-permissions/:id

Actualiza un permiso de menú.

### DELETE /menu-permissions/:id

Elimina un permiso de menú.

**Nota**: Para documentación completa, ver `docs/menu-permissions-api.md`

---

## Roles y Permisos

### Roles Disponibles

- **user**: Usuario básico
- **admin**: Administrador con acceso completo
- **gerencia**: Gerencia con acceso a todas las empresas y módulos
- **supervisor**: Supervisor con permisos intermedios

### Notas sobre el Rol de Gerencia

El rol `gerencia` tiene las siguientes características:

1. **Acceso a todas las empresas**: Puede ver información de todas las empresas sin restricción de tenant
2. **Acceso a todos los módulos**: Puede acceder a todos los endpoints del sistema
3. **Manejo desde el frontend**: El control de acceso se realiza desde el frontend, pero todos los endpoints están disponibles
4. **Endpoints clave para gerencia**:
   - `GET /companies` - Ver todas las empresas
   - `GET /users?tenantId=...` - Ver usuarios de cualquier tenant
   - `GET /dashboard` - Dashboard con datos agregados
   - Todos los endpoints de módulos con filtros por tenant

---

## Códigos de Estado HTTP

- `200 OK`: Solicitud exitosa
- `201 Created`: Recurso creado exitosamente
- `204 No Content`: Solicitud exitosa sin contenido
- `400 Bad Request`: Error en los datos de entrada
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: No tiene permisos
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Conflicto (ej: duplicado)
- `500 Internal Server Error`: Error del servidor

---

## Notas Importantes

1. **Multi-tenant**: La mayoría de los endpoints requieren el header `X-Tenant-Id` excepto:
   - Endpoints de autenticación (`/auth/*`)
   - Endpoints de empresas (`/companies/*`)

2. **Autenticación**: Todos los endpoints (excepto `/auth/register` y `/auth/login`) requieren el header `Authorization: Bearer <token>`

3. **Validación**: Todos los endpoints validan los datos de entrada usando class-validator

4. **Paginación**: Los endpoints que devuelven listas suelen soportar paginación con `page` y `limit`

5. **Búsqueda**: Muchos endpoints soportan búsqueda con el parámetro `q` o `search`

6. **Filtros**: Los endpoints suelen soportar múltiples filtros opcionales para refinar las consultas

---

## Documentación Adicional

Para documentación más detallada de módulos específicos, consultar:

- `docs/CRM_API.md` - Módulo CRM completo
- `docs/daily-reports-api.md` - Reportes diarios
- `docs/tasks-api.md` - Tareas
- `docs/employees-api.md` - Empleados
- `docs/areas-api.md` - Áreas
- `docs/providers-api.md` - Proveedores
- `docs/requirements-api.md` - Requerimientos
- `docs/documents-api.md` - Documentos
- `docs/menu-permissions-api.md` - Permisos de menú
- `docs/tenancy-and-api.md` - Sistema multi-tenant

---

**Última actualización**: 2024-01-15
**Versión**: 1.0.0

