# API de Perfil de Usuario

Esta documentación describe los endpoints disponibles para la gestión del perfil de usuario en el sistema Momentum.

## Descripción General

El módulo de perfil permite a los usuarios autenticados gestionar su propia información personal. Los usuarios pueden ver, actualizar su nombre y subir/eliminar su foto de perfil. **Por seguridad, no se permite modificar el email ni el rol del usuario.**

## 🏗️ Arquitectura del Sistema

### **Principios SOLID Aplicados:**

- **Single Responsibility**: 
  - `ProfileService`: Responsable únicamente de la lógica de negocio del perfil
  - `ProfileController`: Responsable únicamente del manejo de HTTP
  - `UpdateProfileDto`: Define la estructura de datos para actualizar el perfil

- **Open/Closed Principle**: 
  - El servicio es extensible para nuevos campos de perfil sin modificar código existente

- **Liskov Substitution Principle**: 
  - Los servicios implementan interfaces claras y pueden ser sustituidos

- **Interface Segregation Principle**: 
  - DTOs específicos para cada operación (UpdateProfileDto)

- **Dependency Inversion Principle**: 
  - El servicio depende de abstracciones (UploadService, Model de Mongoose) no de implementaciones concretas

### **Optimización de Consultas:**

El sistema utiliza los índices existentes en el schema de User para optimizar las consultas:

- Índice único en `_id` (búsquedas rápidas por ID de usuario)
- Índice en `email` (búsquedas rápidas por email)
- Índice compuesto en `email` y `isActive` (búsquedas con filtro de estado)
- Índice compuesto en `isActive` y `createdAt` (búsqueda por estado ordenada por fecha)

---

## Estructura de Datos

### User Profile Schema

El perfil utiliza el schema de User existente con los siguientes campos relevantes:

```typescript
interface UserProfile {
  id: string;                        // ID único del usuario
  email: string;                      // Email del usuario (NO EDITABLE)
  name: string;                       // Nombre del usuario (EDITABLE)
  role: string;                       // Rol del usuario (NO EDITABLE)
  isActive: boolean;                  // Estado activo del usuario
  profilePicture?: string;            // URL de la foto de perfil (EDITABLE)
  lastLogin?: Date;                  // Fecha del último login
  tenantIds?: string[];              // IDs de tenants asignados
  createdAt: Date;                   // Fecha de creación
  updatedAt: Date;                   // Fecha de última actualización
}
```

---

## Endpoints

Todos los endpoints requieren autenticación JWT mediante el header `Authorization: Bearer <token>`.

### 1. Obtener Perfil del Usuario Autenticado

**GET** `/profile`

Obtiene la información del perfil del usuario autenticado.

#### Headers

```
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "role": "user",
  "isActive": true,
  "profilePicture": "https://bucket.s3.region.amazonaws.com/profiles/userId/1234567890-photo.jpg",
  "lastLogin": "2024-01-15T10:30:00.000Z",
  "tenantIds": ["64f0a3c7b1e2a9d5f0c12345"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: Usuario no autenticado
- `401 Unauthorized`: Token de acceso requerido o inválido
- `404 Not Found`: Usuario no encontrado

---

### 2. Actualizar Perfil del Usuario Autenticado

**PATCH** `/profile`

Actualiza la información del perfil del usuario autenticado. Solo permite actualizar el nombre. **No permite actualizar email ni role por seguridad.**

#### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body

```json
{
  "name": "Juan Carlos Pérez"
}
```

#### Validaciones

- `name`: Opcional, entre 2 y 50 caracteres, se trima automáticamente

#### Campos NO Editables

- `email`: No se puede modificar por seguridad
- `role`: No se puede modificar por seguridad
- `isActive`: No se puede modificar desde el perfil
- `tenantIds`: No se puede modificar desde el perfil

#### Response (200 OK)

```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "usuario@ejemplo.com",
  "name": "Juan Carlos Pérez",
  "role": "user",
  "isActive": true,
  "profilePicture": "https://bucket.s3.region.amazonaws.com/profiles/userId/1234567890-photo.jpg",
  "lastLogin": "2024-01-15T10:30:00.000Z",
  "tenantIds": ["64f0a3c7b1e2a9d5f0c12345"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-16T11:00:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: Datos inválidos o usuario no autenticado
- `401 Unauthorized`: Token de acceso requerido o inválido
- `404 Not Found`: Usuario no encontrado

---

### 3. Subir Foto de Perfil

**POST** `/profile/photo`

Sube una foto de perfil para el usuario autenticado. Si el usuario ya tiene una foto de perfil, la anterior se elimina automáticamente de S3.

#### Headers

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)

```
file: [archivo de imagen]
```

#### Validaciones

- **Tipo de archivo**: Solo imágenes (JPEG, PNG, GIF, WebP, BMP, SVG, TIFF, HEIC, HEIF, ICO, JFIF, PJPEG, PJP, AVIF, APNG)
- **Tamaño máximo**: 20MB
- **Campo**: El archivo debe enviarse en el campo `file`

#### Formatos de Imagen Soportados

- JPEG/JPG
- PNG
- GIF
- WebP
- BMP
- SVG
- TIFF
- HEIC/HEIF (formato de iPhone)
- ICO
- JFIF
- PJPEG/PJP
- AVIF
- APNG

#### Response (200 OK)

```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "role": "user",
  "isActive": true,
  "profilePicture": "https://bucket.s3.region.amazonaws.com/profiles/64f8a1b2c3d4e5f6a7b8c9d0/1705324800000-photo.jpg",
  "lastLogin": "2024-01-15T10:30:00.000Z",
  "tenantIds": ["64f0a3c7b1e2a9d5f0c12345"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-16T11:30:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: 
  - No se proporcionó archivo
  - Archivo demasiado grande (máximo 20MB)
  - Formato de archivo no válido
  - Usuario no autenticado
- `401 Unauthorized`: Token de acceso requerido o inválido
- `404 Not Found`: Usuario no encontrado

#### Notas

- La foto anterior se elimina automáticamente de S3 si existe
- El archivo se almacena en S3 en la ruta: `profiles/{userId}/{timestamp}-{filename}`
- Si la eliminación de la foto anterior falla, no se bloquea la operación (solo se registra un warning)

---

### 4. Eliminar Foto de Perfil

**DELETE** `/profile/photo`

Elimina la foto de perfil del usuario autenticado. La foto se elimina tanto de la base de datos como de S3.

#### Headers

```
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "role": "user",
  "isActive": true,
  "profilePicture": null,
  "lastLogin": "2024-01-15T10:30:00.000Z",
  "tenantIds": ["64f0a3c7b1e2a9d5f0c12345"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-16T12:00:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: Usuario no autenticado
- `401 Unauthorized`: Token de acceso requerido o inválido
- `404 Not Found`: Usuario no encontrado

#### Notas

- Si el usuario no tiene foto de perfil, la operación se completa exitosamente sin errores
- La foto se elimina de S3 si existe
- Si la eliminación de S3 falla, no se bloquea la operación (solo se registra un warning)

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200    | OK - Operación exitosa |
| 400    | Bad Request - Datos de entrada inválidos |
| 401    | Unauthorized - Token de acceso requerido o inválido |
| 404    | Not Found - Usuario no encontrado |
| 500    | Internal Server Error - Error del servidor |

---

## Validaciones Detalladas

### Campos Editables

- **name**: 
  - Tipo: string
  - Longitud: 2-50 caracteres
  - Requerido: No (opcional en actualización)
  - Normalización: Se trima automáticamente

### Campos NO Editables

- **email**: No se puede modificar por seguridad
- **role**: No se puede modificar por seguridad
- **isActive**: No se puede modificar desde el perfil
- **tenantIds**: No se puede modificar desde el perfil

### Validaciones de Foto de Perfil

- **Tipo de archivo**: Solo imágenes (ver lista de formatos soportados arriba)
- **Tamaño máximo**: 20MB
- **Campo**: Debe enviarse como `file` en multipart/form-data

---

## Índices de Base de Datos

El sistema utiliza los índices existentes en el schema de User:

### Índices Únicos

1. **_id**: Índice único para búsquedas rápidas por ID de usuario
2. **email**: Índice único para garantizar unicidad de emails

### Índices Simples

1. **isActive**: Índice para filtros rápidos por estado activo
2. **createdAt**: Índice descendente para ordenamiento por fecha de creación

### Índices Compuestos

1. **{ email: 1, isActive: 1 }**: Búsqueda por email con filtro de estado activo
2. **{ isActive: 1, createdAt: -1 }**: Búsqueda por estado activo ordenada por fecha de creación

---

## Notas de Implementación

1. **Principios SOLID**: El código sigue los principios SOLID con separación clara de responsabilidades entre controlador, servicio y DTOs.

2. **Consultas Optimizadas**: Se utilizan los índices existentes en el schema de User para consultas rápidas por ID.

3. **Seguridad**: 
   - Solo el usuario autenticado puede ver y editar su propio perfil
   - No se permite modificar email ni role por seguridad
   - Validación estricta de tipos de archivo para fotos de perfil

4. **Gestión de Archivos**: 
   - Las fotos se almacenan en S3
   - La foto anterior se elimina automáticamente al subir una nueva
   - Manejo de errores no críticos en la eliminación de archivos

5. **Normalización de Datos**: Los campos de texto se normalizan automáticamente (trim) antes de guardar.

6. **Validación de Usuario**: Se valida que el usuario exista y esté activo antes de realizar cualquier operación.

---

## Ejemplos de Uso

### Obtener Perfil

```bash
curl -X GET http://localhost:3000/profile \
  -H "Authorization: Bearer <token>"
```

### Actualizar Nombre

```bash
curl -X PATCH http://localhost:3000/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Carlos Pérez"
  }'
```

### Subir Foto de Perfil

```bash
curl -X POST http://localhost:3000/profile/photo \
  -H "Authorization: Bearer <token>" \
  -F "file=@/ruta/a/la/imagen.jpg"
```

### Eliminar Foto de Perfil

```bash
curl -X DELETE http://localhost:3000/profile/photo \
  -H "Authorization: Bearer <token>"
```

---

## Consideraciones de Seguridad

1. **Autenticación**: Todos los endpoints requieren autenticación JWT válida.

2. **Autorización**: Solo el usuario autenticado puede ver y editar su propio perfil. No se puede acceder al perfil de otros usuarios.

3. **Validación de Datos**: Todos los datos de entrada se validan antes de procesar, evitando inyecciones y datos malformados.

4. **Protección de Campos Sensibles**: 
   - El email no se puede modificar para prevenir cambios no autorizados
   - El rol no se puede modificar para mantener la integridad del sistema de permisos

5. **Validación de Archivos**: 
   - Validación estricta de tipos de archivo (solo imágenes)
   - Límite de tamaño para prevenir abuso de almacenamiento
   - Sanitización de nombres de archivo

6. **Gestión Segura de Archivos**: 
   - Los archivos se almacenan en S3 con nombres únicos
   - Las fotos anteriores se eliminan automáticamente para evitar acumulación de archivos

---

## Payloads Completos

### Request: Actualizar Perfil

```json
{
  "name": "Juan Carlos Pérez"
}
```

### Response: Perfil Completo

```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "usuario@ejemplo.com",
  "name": "Juan Carlos Pérez",
  "role": "user",
  "isActive": true,
  "profilePicture": "https://bucket.s3.region.amazonaws.com/profiles/64f8a1b2c3d4e5f6a7b8c9d0/1705324800000-photo.jpg",
  "lastLogin": "2024-01-15T10:30:00.000Z",
  "tenantIds": ["64f0a3c7b1e2a9d5f0c12345"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-16T11:00:00.000Z"
}
```

### Request: Subir Foto (Form Data)

```
Content-Type: multipart/form-data

file: [binary data]
```

### Response: Error de Validación

```json
{
  "statusCode": 400,
  "message": "El archivo es demasiado grande. El tamaño máximo permitido es 20MB.",
  "error": "Bad Request"
}
```

### Response: Error de Autenticación

```json
{
  "statusCode": 401,
  "message": "Token de acceso requerido",
  "error": "Unauthorized"
}
```

### Response: Usuario No Encontrado

```json
{
  "statusCode": 404,
  "message": "Usuario no encontrado",
  "error": "Not Found"
}
```

---

## Flujo de Operaciones

### Flujo: Actualizar Perfil

1. Usuario autenticado envía PATCH `/profile` con nuevo nombre
2. Sistema valida el token JWT
3. Sistema valida los datos del DTO
4. Sistema busca el usuario por ID (usando índice de _id)
5. Sistema valida que el usuario exista y esté activo
6. Sistema actualiza solo los campos permitidos
7. Sistema retorna el usuario actualizado

### Flujo: Subir Foto de Perfil

1. Usuario autenticado envía POST `/profile/photo` con archivo
2. Sistema valida el token JWT
3. Sistema valida el archivo (tipo y tamaño)
4. Sistema busca el usuario por ID (usando índice de _id)
5. Sistema valida que el usuario exista y esté activo
6. Si existe foto anterior, sistema la elimina de S3
7. Sistema sube la nueva foto a S3
8. Sistema actualiza el campo `profilePicture` en la base de datos
9. Sistema retorna el usuario actualizado

### Flujo: Eliminar Foto de Perfil

1. Usuario autenticado envía DELETE `/profile/photo`
2. Sistema valida el token JWT
3. Sistema busca el usuario por ID (usando índice de _id)
4. Sistema valida que el usuario exista y esté activo
5. Si existe foto, sistema la elimina de S3
6. Sistema actualiza el campo `profilePicture` a null
7. Sistema retorna el usuario actualizado

