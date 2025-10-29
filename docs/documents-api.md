# API de Documentos Tributarios

Esta documentación describe los endpoints disponibles para la gestión de documentos tributarios en el sistema Tecmeing.

## Base URL
```
/api/documents
```

## Modelo de Datos

### Document
```typescript
{
  _id: string;                    // ID único del documento
  numeroDocumento: number;        // Número de documento (requerido)
  serie?: number;                 // Serie del documento (opcional)
  proyectoId: string;             // ID del proyecto (requerido)
  categoria?: string;             // Categoría del documento (opcional)
  fechaEmision?: Date;            // Fecha de emisión (opcional)
  fechaVencimiento?: Date;        // Fecha de vencimiento (opcional)
  documentoReferencia?: number;   // Documento de referencia (opcional)
  total: number;                  // Total del documento (requerido)
  documentos: string[];           // URLs de documentos subidos
  isActive: boolean;              // Estado del documento
  createdAt: Date;               // Fecha de creación
  updatedAt: Date;                // Fecha de actualización
}
```

## Endpoints

### 1. Crear Documento Tributario

**POST** `/documents`

Crea un nuevo documento tributario.

#### Payload
```json
{
  "numeroDocumento": 12345,
  "serie": 1,
  "proyectoId": "64a1b2c3d4e5f6789abcdef0",
  "categoria": "Factura",
  "fechaEmision": "2024-01-15T00:00:00.000Z",
  "fechaVencimiento": "2024-02-15T00:00:00.000Z",
  "documentoReferencia": 98765,
  "total": 1500.50,
  "documentos": []
}
```

#### Respuesta
```json
{
  "_id": "64a1b2c3d4e5f6789abcdef1",
  "numeroDocumento": 12345,
  "serie": 1,
  "proyectoId": {
    "_id": "64a1b2c3d4e5f6789abcdef0",
    "name": "Proyecto Ejemplo",
    "code": "PROJ-001"
  },
  "categoria": "Factura",
  "fechaEmision": "2024-01-15T00:00:00.000Z",
  "fechaVencimiento": "2024-02-15T00:00:00.000Z",
  "documentoReferencia": 98765,
  "total": 1500.50,
  "documentos": [],
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Códigos de Estado
- `201`: Documento creado exitosamente
- `400`: Datos de entrada inválidos
- `409`: Conflicto - documento ya existe

---

### 2. Obtener Documentos con Filtros

**GET** `/documents`

Obtiene una lista paginada de documentos tributarios con filtros opcionales.

#### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `proyectoId` | string | No | ID del proyecto |
| `categoria` | string | No | Categoría del documento |
| `numeroDocumento` | number | No | Número de documento |
| `serie` | number | No | Serie del documento |
| `fechaEmisionDesde` | string | No | Fecha de emisión desde (ISO) |
| `fechaEmisionHasta` | string | No | Fecha de emisión hasta (ISO) |
| `fechaVencimientoDesde` | string | No | Fecha de vencimiento desde (ISO) |
| `fechaVencimientoHasta` | string | No | Fecha de vencimiento hasta (ISO) |
| `totalMinimo` | number | No | Total mínimo |
| `totalMaximo` | number | No | Total máximo |
| `isActive` | boolean | No | Estado del documento (default: true) |
| `page` | number | No | Página (default: 1) |
| `limit` | number | No | Elementos por página (default: 10) |
| `sortBy` | string | No | Campo de ordenamiento (default: createdAt) |
| `sortOrder` | string | No | Orden (asc/desc, default: desc) |

#### Ejemplo de Request
```
GET /documents?proyectoId=64a1b2c3d4e5f6789abcdef0&categoria=Factura&page=1&limit=10
```

#### Respuesta
```json
{
  "documents": [
    {
      "_id": "64a1b2c3d4e5f6789abcdef1",
      "numeroDocumento": 12345,
      "serie": 1,
      "proyectoId": {
        "_id": "64a1b2c3d4e5f6789abcdef0",
        "name": "Proyecto Ejemplo",
        "code": "PROJ-001"
      },
      "categoria": "Factura",
      "fechaEmision": "2024-01-15T00:00:00.000Z",
      "fechaVencimiento": "2024-02-15T00:00:00.000Z",
      "documentoReferencia": 98765,
      "total": 1500.50,
      "documentos": [],
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

---

### 3. Obtener Documento por ID

**GET** `/documents/:id`

Obtiene un documento tributario específico por su ID.

#### Parámetros de Ruta
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | ID único del documento |

#### Respuesta
```json
{
  "_id": "64a1b2c3d4e5f6789abcdef1",
  "numeroDocumento": 12345,
  "serie": 1,
  "proyectoId": {
    "_id": "64a1b2c3d4e5f6789abcdef0",
    "name": "Proyecto Ejemplo",
    "code": "PROJ-001"
  },
  "categoria": "Factura",
  "fechaEmision": "2024-01-15T00:00:00.000Z",
  "fechaVencimiento": "2024-02-15T00:00:00.000Z",
  "documentoReferencia": 98765,
  "total": 1500.50,
  "documentos": [],
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Códigos de Estado
- `200`: Documento obtenido exitosamente
- `400`: ID inválido
- `404`: Documento no encontrado

---

### 4. Actualizar Documento Tributario

**PATCH** `/documents/:id`

Actualiza un documento tributario existente.

#### Parámetros de Ruta
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | ID único del documento |

#### Payload
```json
{
  "categoria": "Factura Actualizada",
  "total": 1750.75,
  "fechaVencimiento": "2024-03-15T00:00:00.000Z"
}
```

#### Respuesta
```json
{
  "_id": "64a1b2c3d4e5f6789abcdef1",
  "numeroDocumento": 12345,
  "serie": 1,
  "proyectoId": {
    "_id": "64a1b2c3d4e5f6789abcdef0",
    "name": "Proyecto Ejemplo",
    "code": "PROJ-001"
  },
  "categoria": "Factura Actualizada",
  "fechaEmision": "2024-01-15T00:00:00.000Z",
  "fechaVencimiento": "2024-03-15T00:00:00.000Z",
  "documentoReferencia": 98765,
  "total": 1750.75,
  "documentos": [],
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z"
}
```

#### Códigos de Estado
- `200`: Documento actualizado exitosamente
- `400`: Datos de entrada inválidos
- `404`: Documento no encontrado
- `409`: Conflicto - documento duplicado

---

### 5. Eliminar Documento Tributario

**DELETE** `/documents/:id`

Elimina un documento tributario (soft delete).

#### Parámetros de Ruta
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | ID único del documento |

#### Respuesta
- **Estado**: `204 No Content`
- **Cuerpo**: Vacío

#### Códigos de Estado
- `204`: Documento eliminado exitosamente
- `400`: ID inválido
- `404`: Documento no encontrado

---

### 6. Obtener Documentos por Proyecto

**GET** `/documents/project/:projectId`

Obtiene todos los documentos tributarios de un proyecto específico.

#### Parámetros de Ruta
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `projectId` | string | ID único del proyecto |

#### Respuesta
```json
[
  {
    "_id": "64a1b2c3d4e5f6789abcdef1",
    "numeroDocumento": 12345,
    "serie": 1,
    "proyectoId": {
      "_id": "64a1b2c3d4e5f6789abcdef0",
      "name": "Proyecto Ejemplo",
      "code": "PROJ-001"
    },
    "categoria": "Factura",
    "fechaEmision": "2024-01-15T00:00:00.000Z",
    "fechaVencimiento": "2024-02-15T00:00:00.000Z",
    "documentoReferencia": 98765,
    "total": 1500.50,
    "documentos": [],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 7. Obtener Documentos por Categoría

**GET** `/documents/category/:category`

Obtiene todos los documentos tributarios de una categoría específica.

#### Parámetros de Ruta
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `category` | string | Categoría del documento |

#### Respuesta
```json
[
  {
    "_id": "64a1b2c3d4e5f6789abcdef1",
    "numeroDocumento": 12345,
    "serie": 1,
    "proyectoId": {
      "_id": "64a1b2c3d4e5f6789abcdef0",
      "name": "Proyecto Ejemplo",
      "code": "PROJ-001"
    },
    "categoria": "Factura",
    "fechaEmision": "2024-01-15T00:00:00.000Z",
    "fechaVencimiento": "2024-02-15T00:00:00.000Z",
    "documentoReferencia": 98765,
    "total": 1500.50,
    "documentos": [],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 8. Obtener Total por Proyecto

**GET** `/documents/project/:projectId/total`

Calcula el total de todos los documentos tributarios de un proyecto.

#### Parámetros de Ruta
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `projectId` | string | ID único del proyecto |

#### Respuesta
```json
{
  "projectId": "64a1b2c3d4e5f6789abcdef0",
  "total": 1500.50
}
```

---

### 9. Subir Múltiples Documentos

**POST** `/documents/:id/upload`

Sube múltiples archivos a un documento tributario existente.

#### Parámetros de Ruta
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | ID único del documento |

#### Form Data
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `files` | File[] | Archivos a subir (máximo 10) |

#### Ejemplo de Request
```
POST /documents/64a1b2c3d4e5f6789abcdef1/upload
Content-Type: multipart/form-data

files: [archivo1.pdf, archivo2.jpg, archivo3.png]
```

#### Respuesta
```json
{
  "_id": "64a1b2c3d4e5f6789abcdef1",
  "numeroDocumento": 12345,
  "serie": 1,
  "proyectoId": {
    "_id": "64a1b2c3d4e5f6789abcdef0",
    "name": "Proyecto Ejemplo",
    "code": "PROJ-001"
  },
  "categoria": "Factura",
  "fechaEmision": "2024-01-15T00:00:00.000Z",
  "fechaVencimiento": "2024-02-15T00:00:00.000Z",
  "documentoReferencia": 98765,
  "total": 1500.50,
  "documentos": [
    "https://bucket.s3.region.amazonaws.com/documents/64a1b2c3d4e5f6789abcdef1/1705312200000-archivo1.pdf",
    "https://bucket.s3.region.amazonaws.com/documents/64a1b2c3d4e5f6789abcdef1/1705312200001-archivo2.jpg",
    "https://bucket.s3.region.amazonaws.com/documents/64a1b2c3d4e5f6789abcdef1/1705312200002-archivo3.png"
  ],
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

#### Códigos de Estado
- `200`: Documentos subidos exitosamente
- `400`: ID inválido o error en la subida
- `404`: Documento no encontrado

---

### 10. Eliminar Archivo Específico

**DELETE** `/documents/:id/files`

Elimina un archivo específico de un documento tributario.

#### Parámetros de Ruta
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | ID único del documento |

#### Payload
```json
{
  "fileUrl": "https://bucket.s3.region.amazonaws.com/documents/64a1b2c3d4e5f6789abcdef1/1705312200000-archivo1.pdf"
}
```

#### Respuesta
```json
{
  "_id": "64a1b2c3d4e5f6789abcdef1",
  "numeroDocumento": 12345,
  "serie": 1,
  "proyectoId": {
    "_id": "64a1b2c3d4e5f6789abcdef0",
    "name": "Proyecto Ejemplo",
    "code": "PROJ-001"
  },
  "categoria": "Factura",
  "fechaEmision": "2024-01-15T00:00:00.000Z",
  "fechaVencimiento": "2024-02-15T00:00:00.000Z",
  "documentoReferencia": 98765,
  "total": 1500.50,
  "documentos": [
    "https://bucket.s3.region.amazonaws.com/documents/64a1b2c3d4e5f6789abcdef1/1705312200001-archivo2.jpg",
    "https://bucket.s3.region.amazonaws.com/documents/64a1b2c3d4e5f6789abcdef1/1705312200002-archivo3.png"
  ],
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T12:15:00.000Z"
}
```

#### Códigos de Estado
- `200`: Archivo eliminado exitosamente
- `400`: ID inválido o error al eliminar
- `404`: Documento no encontrado

---

## Validaciones

### Campos Requeridos
- `numeroDocumento`: Número entero mayor a 0
- `proyectoId`: ID válido de MongoDB
- `total`: Número mayor o igual a 0

### Campos Opcionales
- `serie`: Número entero mayor a 0
- `categoria`: String
- `fechaEmision`: Fecha en formato ISO
- `fechaVencimiento`: Fecha en formato ISO
- `documentoReferencia`: Número entero mayor a 0
- `documentos`: Array de strings (URLs)

### Validaciones de Negocio
- No se permiten documentos duplicados con el mismo número y serie
- El proyecto debe existir en la base de datos
- Los archivos subidos se almacenan en S3 con nombres únicos
- Soft delete: los documentos eliminados se marcan como `isActive: false`

## Índices de Base de Datos

El sistema utiliza los siguientes índices para optimizar las consultas:

- `proyectoId + isActive`
- `numeroDocumento`
- `serie + numeroDocumento`
- `categoria + isActive`
- `fechaEmision` (descendente)
- `fechaVencimiento` (descendente)
- `documentoReferencia`
- `total` (descendente)
- `createdAt` (descendente)
- `updatedAt` (descendente)
- `proyectoId + fechaEmision + isActive` (compuesto)
- `categoria + proyectoId + isActive` (compuesto)

## Manejo de Errores

### Errores Comunes

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Datos de entrada inválidos",
  "error": "Bad Request"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Documento no encontrado",
  "error": "Not Found"
}
```

#### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Ya existe un documento con número 12345 y serie 1",
  "error": "Conflict"
}
```

## Consideraciones de Seguridad

- Todos los endpoints requieren autenticación (implementar según el sistema de autenticación del proyecto)
- Los archivos se suben a S3 con nombres únicos para evitar conflictos
- Validación estricta de tipos de archivo permitidos
- Soft delete para mantener integridad referencial
- Validación de existencia de proyectos antes de crear documentos