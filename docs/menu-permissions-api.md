# API de Permisos de Menú

Esta documentación describe los endpoints disponibles para la gestión de permisos de menú en el sistema Tecmeing.

## Descripción General

El sistema de permisos de menú permite asignar permisos específicos a usuarios para acceder a diferentes secciones del sistema. Cada permiso está asociado a una ruta específica y controla el acceso a través de guards.

## Base URL

```
/api/menu-permissions
```

## Autenticación

Todos los endpoints requieren autenticación JWT. Incluye el token en el header:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Crear Permiso de Menú

**POST** `/menu-permissions`

Crea un nuevo permiso de menú para un usuario.

#### Payload

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "route": "/dashboard",
  "menuName": "Dashboard",
  "description": "Acceso al panel principal del sistema",
  "isActive": true,
  "icon": "dashboard",
  "order": 1
}
```

#### Campos Requeridos

- `userId` (string): ID del usuario al que se le asigna el permiso
- `route` (string): Ruta del menú que se puede acceder (1-100 caracteres)
- `menuName` (string): Nombre del menú para mostrar (1-100 caracteres)
- `description` (string): Descripción del permiso (1-200 caracteres)

#### Campos Opcionales

- `isActive` (boolean): Estado activo del permiso (default: true)
- `icon` (string): Icono del menú (máximo 100 caracteres)
- `order` (number): Orden de visualización del menú (default: 0)

#### Respuesta Exitosa (201)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "route": "/dashboard",
  "menuName": "Dashboard",
  "description": "Acceso al panel principal del sistema",
  "isActive": true,
  "icon": "dashboard",
  "order": 1,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Errores

- `400`: Datos de entrada inválidos
- `409`: Ya existe un permiso para este usuario y ruta

---

### 2. Obtener Permisos con Filtros

**GET** `/menu-permissions`

Obtiene todos los permisos de menú con filtros y paginación.

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `userId` | string | No | Filtrar por ID de usuario | `507f1f77bcf86cd799439011` |
| `route` | string | No | Filtrar por ruta (búsqueda parcial) | `/dashboard` |
| `isActive` | boolean | No | Filtrar por estado activo | `true` |
| `page` | number | No | Número de página (default: 1) | `1` |
| `limit` | number | No | Elementos por página (default: 10, max: 100) | `10` |
| `sortBy` | string | No | Campo de ordenamiento (default: createdAt) | `createdAt` |
| `sortOrder` | string | No | Dirección del ordenamiento (asc/desc, default: desc) | `desc` |

#### Ejemplo de Request

```
GET /menu-permissions?userId=507f1f77bcf86cd799439011&page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

#### Respuesta Exitosa (200)

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "userId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Juan Pérez",
        "email": "juan@ejemplo.com",
        "role": "admin"
      },
      "route": "/dashboard",
      "menuName": "Dashboard",
      "description": "Acceso al panel principal del sistema",
      "isActive": true,
      "icon": "dashboard",
      "order": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

---

### 3. Obtener Estadísticas

**GET** `/menu-permissions/stats`

Obtiene estadísticas generales de los permisos de menú.

#### Respuesta Exitosa (200)

```json
{
  "totalPermissions": 25,
  "activePermissions": 20,
  "inactivePermissions": 5,
  "usersWithPermissions": 8
}
```

---

### 4. Obtener Permisos de un Usuario

**GET** `/menu-permissions/user/:userId`

Obtiene todos los permisos activos de un usuario específico, ordenados por orden y nombre.

#### Parámetros de Ruta

- `userId` (string): ID del usuario

#### Respuesta Exitosa (200)

```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "route": "/dashboard",
    "menuName": "Dashboard",
    "description": "Acceso al panel principal del sistema",
    "isActive": true,
    "icon": "dashboard",
    "order": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Errores

- `400`: ID de usuario inválido

---

### 5. Obtener Rutas Permitidas de un Usuario

**GET** `/menu-permissions/user/:userId/routes`

Obtiene solo las rutas permitidas para un usuario específico.

#### Parámetros de Ruta

- `userId` (string): ID del usuario

#### Respuesta Exitosa (200)

```json
{
  "routes": ["/dashboard", "/projects", "/clients", "/quotes"]
}
```

#### Errores

- `400`: ID de usuario inválido

---

### 6. Verificar Permiso de Ruta

**GET** `/menu-permissions/check/:userId/:route`

Verifica si un usuario tiene permiso para acceder a una ruta específica.

#### Parámetros de Ruta

- `userId` (string): ID del usuario
- `route` (string): Ruta a verificar

#### Respuesta Exitosa (200)

```json
{
  "hasPermission": true,
  "userId": "507f1f77bcf86cd799439011",
  "route": "/dashboard"
}
```

#### Errores

- `400`: ID de usuario inválido

---

### 7. Obtener Permiso por ID

**GET** `/menu-permissions/:id`

Obtiene un permiso específico por su ID.

#### Parámetros de Ruta

- `id` (string): ID del permiso

#### Respuesta Exitosa (200)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "role": "admin"
  },
  "route": "/dashboard",
  "menuName": "Dashboard",
  "description": "Acceso al panel principal del sistema",
  "isActive": true,
  "icon": "dashboard",
  "order": 1,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Errores

- `400`: ID de permiso inválido
- `404`: Permiso no encontrado

---

### 8. Actualizar Permiso

**PATCH** `/menu-permissions/:id`

Actualiza un permiso de menú existente.

#### Parámetros de Ruta

- `id` (string): ID del permiso

#### Payload

```json
{
  "menuName": "Panel Principal",
  "description": "Acceso completo al panel principal",
  "isActive": false,
  "order": 2
}
```

#### Respuesta Exitosa (200)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "role": "admin"
  },
  "route": "/dashboard",
  "menuName": "Panel Principal",
  "description": "Acceso completo al panel principal",
  "isActive": false,
  "icon": "dashboard",
  "order": 2,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

#### Errores

- `400`: Datos de entrada inválidos
- `404`: Permiso no encontrado
- `409`: Ya existe un permiso para este usuario y ruta

---

### 9. Asignar Múltiples Permisos

**POST** `/menu-permissions/assign`

Asigna múltiples permisos a un usuario, reemplazando los existentes.

#### Payload

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "permissions": [
    {
      "route": "/dashboard",
      "menuName": "Dashboard",
      "description": "Acceso al panel principal",
      "icon": "dashboard",
      "order": 1
    },
    {
      "route": "/projects",
      "menuName": "Proyectos",
      "description": "Gestión de proyectos",
      "icon": "folder",
      "order": 2
    },
    {
      "route": "/clients",
      "menuName": "Clientes",
      "description": "Gestión de clientes",
      "icon": "users",
      "order": 3
    }
  ]
}
```

#### Respuesta Exitosa (200)

```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "userId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Juan Pérez",
      "email": "juan@ejemplo.com",
      "role": "admin"
    },
    "route": "/dashboard",
    "menuName": "Dashboard",
    "description": "Acceso al panel principal",
    "isActive": true,
    "icon": "dashboard",
    "order": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Errores

- `400`: Datos de entrada inválidos

---

### 10. Eliminar Permiso

**DELETE** `/menu-permissions/:id`

Elimina un permiso de menú específico.

#### Parámetros de Ruta

- `id` (string): ID del permiso

#### Respuesta Exitosa (204)

Sin contenido.

#### Errores

- `400`: ID de permiso inválido
- `404`: Permiso no encontrado

---

### 11. Eliminar Permisos de Usuario

**DELETE** `/menu-permissions/user/:userId`

Elimina todos los permisos de un usuario específico.

#### Parámetros de Ruta

- `userId` (string): ID del usuario

#### Respuesta Exitosa (204)

Sin contenido.

#### Errores

- `400`: ID de usuario inválido

---

## Uso del Guard de Permisos

Para proteger rutas con permisos de menú, utiliza el guard `MenuPermissionGuard` junto con el decorator `@RequireMenuPermission`:

```typescript
import { UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard'
import { MenuPermissionGuard, RequireMenuPermission } from '../../shared/guards/menu-permission.guard'

@Controller('dashboard')
@UseGuards(JwtAuthGuard, MenuPermissionGuard)
export class DashboardController {
  @Get()
  @RequireMenuPermission('/dashboard')
  async getDashboardData() {
    // Solo usuarios con permiso para /dashboard pueden acceder
  }
}
```

## Códigos de Error Comunes

| Código | Descripción |
|--------|-------------|
| `400` | Datos de entrada inválidos |
| `401` | No autenticado |
| `403` | No tienes permiso para acceder a este menú |
| `404` | Recurso no encontrado |
| `409` | Conflicto (permiso duplicado) |
| `500` | Error interno del servidor |

## Notas Importantes

1. **Índices de Base de Datos**: El sistema incluye índices optimizados para consultas rápidas por usuario, ruta y estado activo.

2. **Validación de Rutas**: Las rutas deben ser únicas por usuario. No se pueden crear permisos duplicados.

3. **Orden de Menú**: Los permisos se ordenan por el campo `order` y luego por `menuName` para una visualización consistente.

4. **Estado Activo**: Solo los permisos con `isActive: true` se consideran para verificación de acceso.

5. **Paginación**: El límite máximo por página es 100 elementos para evitar sobrecarga.

6. **Búsqueda**: El filtro por ruta utiliza búsqueda parcial (regex) para mayor flexibilidad.
