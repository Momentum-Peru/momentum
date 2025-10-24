# API de Proveedores

Esta documentación describe los endpoints disponibles para la gestión de proveedores en el sistema Tecmeing.

## Descripción General

Los proveedores son empresas o personas que Tecmeing contrata para proporcionar servicios o materiales. Incluyen proveedores de materiales, servicios de pintura, construcción, etc.

## Estructura de Datos

### Provider Schema

```typescript
interface Provider {
  _id: string;
  name: string;                    // Nombre del proveedor
  address?: string;               // Dirección legacy (compatibilidad)
  taxId?: string;                 // RUC/DNI del proveedor
  ubicacion?: {
    paisCodigo: string;           // Código del país (PE, AR, MX, etc.)
    provinciaCodigo?: string;     // Código de la provincia/estado
    distritoCodigo?: string;      // Código del distrito/municipio
    direccion?: string;           // Dirección específica
  };
  contacts: Array<{
    name: string;                 // Nombre del contacto
    email: string;                // Email del contacto
    phone?: string;               // Teléfono del contacto
    area: string;                 // Área/departamento del contacto
  }>;
  documents: string[];            // URLs de documentos en S3
  description?: string;           // Descripción del proveedor
  services: string[];             // Tipos de servicios que ofrece
  website?: string;               // Sitio web del proveedor
  rating?: number;                // Calificación (1-5)
  isActive: boolean;              // Estado activo/inactivo
  createdAt: Date;                // Fecha de creación
  updatedAt: Date;                // Fecha de última actualización
  ubicacionCompleta?: {           // Información completa de ubicación (enriquecida)
    pais: { codigo: string; nombre: string; nombreCompleto: string; };
    provincia?: { codigo: string; nombre: string; tipo: string; };
    distrito?: { codigo: string; nombre: string; tipo: string; };
  };
}
```

## Endpoints

### 1. Crear Proveedor

**POST** `/providers`

Crea un nuevo proveedor en el sistema.

#### Request Body

```json
{
  "name": "Proveedor de Materiales ABC",
  "address": "Av. Principal 123, Lima",
  "taxId": "20123456789",
  "ubicacion": {
    "paisCodigo": "PE",
    "provinciaCodigo": "LIMA",
    "distritoCodigo": "MIRAFLORES",
    "direccion": "Av. Principal 123, Miraflores"
  },
  "contacts": [
    {
      "name": "Juan Pérez",
      "email": "juan.perez@proveedor.com",
      "phone": "+51 987654321",
      "area": "Ventas"
    }
  ],
  "description": "Proveedor especializado en materiales de construcción",
  "services": ["materiales", "construcción", "cemento"],
  "website": "https://proveedor-abc.com",
  "rating": 4.5,
  "isActive": true
}
```

#### Response

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Proveedor de Materiales ABC",
  "address": "Av. Principal 123, Lima",
  "taxId": "20123456789",
  "ubicacion": {
    "paisCodigo": "PE",
    "provinciaCodigo": "LIMA",
    "distritoCodigo": "MIRAFLORES",
    "direccion": "Av. Principal 123, Miraflores"
  },
  "contacts": [
    {
      "name": "Juan Pérez",
      "email": "juan.perez@proveedor.com",
      "phone": "+51 987654321",
      "area": "Ventas"
    }
  ],
  "documents": [],
  "description": "Proveedor especializado en materiales de construcción",
  "services": ["materiales", "construcción", "cemento"],
  "website": "https://proveedor-abc.com",
  "rating": 4.5,
  "isActive": true,
  "createdAt": "2023-09-05T10:30:00.000Z",
  "updatedAt": "2023-09-05T10:30:00.000Z",
  "ubicacionCompleta": {
    "pais": {
      "codigo": "PE",
      "nombre": "Perú",
      "nombreCompleto": "República del Perú"
    },
    "provincia": {
      "codigo": "LIMA",
      "nombre": "Lima",
      "tipo": "Región"
    },
    "distrito": {
      "codigo": "MIRAFLORES",
      "nombre": "Miraflores",
      "tipo": "Distrito"
    }
  }
}
```

### 2. Obtener Todos los Proveedores

**GET** `/providers`

Obtiene una lista de todos los proveedores con filtros opcionales.

#### Query Parameters

- `q` (string, opcional): Término de búsqueda
- `service` (string, opcional): Filtrar por tipo de servicio
- `isActive` (boolean, opcional): Filtrar por estado activo

#### Ejemplos de Uso

```
GET /providers
GET /providers?q=materiales
GET /providers?service=pintura
GET /providers?isActive=true
GET /providers?q=construcción&service=cemento&isActive=true
```

#### Response

```json
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Proveedor de Materiales ABC",
    "taxId": "20123456789",
    "ubicacion": {
      "paisCodigo": "PE",
      "provinciaCodigo": "LIMA",
      "distritoCodigo": "MIRAFLORES"
    },
    "contacts": [
      {
        "name": "Juan Pérez",
        "email": "juan.perez@proveedor.com",
        "phone": "+51 987654321",
        "area": "Ventas"
      }
    ],
    "documents": [],
    "description": "Proveedor especializado en materiales de construcción",
    "services": ["materiales", "construcción", "cemento"],
    "website": "https://proveedor-abc.com",
    "rating": 4.5,
    "isActive": true,
    "createdAt": "2023-09-05T10:30:00.000Z",
    "updatedAt": "2023-09-05T10:30:00.000Z",
    "ubicacionCompleta": {
      "pais": {
        "codigo": "PE",
        "nombre": "Perú",
        "nombreCompleto": "República del Perú"
      },
      "provincia": {
        "codigo": "LIMA",
        "nombre": "Lima",
        "tipo": "Región"
      },
      "distrito": {
        "codigo": "MIRAFLORES",
        "nombre": "Miraflores",
        "tipo": "Distrito"
      }
    }
  }
]
```

### 3. Obtener Estadísticas de Proveedores

**GET** `/providers/stats`

Obtiene estadísticas generales de los proveedores.

#### Response

```json
{
  "total": 150,
  "active": 142,
  "inactive": 8,
  "withRating": 120,
  "averageRating": 4.2
}
```

### 4. Obtener Proveedores Mejor Calificados

**GET** `/providers/top-rated`

Obtiene los proveedores con mejor calificación.

#### Query Parameters

- `limit` (number, opcional): Número máximo de proveedores a retornar (default: 10)

#### Ejemplo de Uso

```
GET /providers/top-rated?limit=5
```

#### Response

```json
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Proveedor de Materiales ABC",
    "rating": 4.8,
    "services": ["materiales", "construcción"],
    "isActive": true,
    "ubicacionCompleta": {
      "pais": {
        "codigo": "PE",
        "nombre": "Perú"
      }
    }
  }
]
```

### 5. Obtener Proveedores por Servicio

**GET** `/providers/service/:service`

Obtiene proveedores que ofrecen un tipo de servicio específico.

#### Path Parameters

- `service` (string): Tipo de servicio

#### Ejemplo de Uso

```
GET /providers/service/pintura
GET /providers/service/materiales
```

#### Response

```json
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Proveedor de Pintura XYZ",
    "services": ["pintura", "acabados"],
    "rating": 4.5,
    "isActive": true
  }
]
```

### 6. Obtener Proveedores por Ubicación

#### Por País

**GET** `/providers/country/:paisCodigo`

```
GET /providers/country/PE
```

#### Por Provincia

**GET** `/providers/country/:paisCodigo/province/:provinciaCodigo`

```
GET /providers/country/PE/province/LIMA
```

#### Por Distrito

**GET** `/providers/country/:paisCodigo/province/:provinciaCodigo/district/:distritoCodigo`

```
GET /providers/country/PE/province/LIMA/district/MIRAFLORES
```

### 7. Obtener Proveedor por ID

**GET** `/providers/:id`

Obtiene un proveedor específico por su ID.

#### Path Parameters

- `id` (string): ID del proveedor

#### Response

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Proveedor de Materiales ABC",
  "taxId": "20123456789",
  "ubicacion": {
    "paisCodigo": "PE",
    "provinciaCodigo": "LIMA",
    "distritoCodigo": "MIRAFLORES",
    "direccion": "Av. Principal 123, Miraflores"
  },
  "contacts": [
    {
      "name": "Juan Pérez",
      "email": "juan.perez@proveedor.com",
      "phone": "+51 987654321",
      "area": "Ventas"
    }
  ],
  "documents": [],
  "description": "Proveedor especializado en materiales de construcción",
  "services": ["materiales", "construcción", "cemento"],
  "website": "https://proveedor-abc.com",
  "rating": 4.5,
  "isActive": true,
  "createdAt": "2023-09-05T10:30:00.000Z",
  "updatedAt": "2023-09-05T10:30:00.000Z",
  "ubicacionCompleta": {
    "pais": {
      "codigo": "PE",
      "nombre": "Perú",
      "nombreCompleto": "República del Perú"
    },
    "provincia": {
      "codigo": "LIMA",
      "nombre": "Lima",
      "tipo": "Región"
    },
    "distrito": {
      "codigo": "MIRAFLORES",
      "nombre": "Miraflores",
      "tipo": "Distrito"
    }
  }
}
```

### 8. Actualizar Proveedor

**PATCH** `/providers/:id`

Actualiza un proveedor existente.

#### Path Parameters

- `id` (string): ID del proveedor

#### Request Body

```json
{
  "name": "Proveedor de Materiales ABC Actualizado",
  "description": "Nueva descripción del proveedor",
  "services": ["materiales", "construcción", "cemento", "hierro"],
  "website": "https://nuevo-sitio.com"
}
```

#### Response

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Proveedor de Materiales ABC Actualizado",
  "description": "Nueva descripción del proveedor",
  "services": ["materiales", "construcción", "cemento", "hierro"],
  "website": "https://nuevo-sitio.com",
  "updatedAt": "2023-09-05T11:30:00.000Z"
}
```

### 9. Cambiar Estado Activo/Inactivo

**PUT** `/providers/:id/toggle-active`

Cambia el estado activo/inactivo de un proveedor.

#### Path Parameters

- `id` (string): ID del proveedor

#### Response

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Proveedor de Materiales ABC",
  "isActive": false,
  "updatedAt": "2023-09-05T11:30:00.000Z"
}
```

### 10. Actualizar Calificación

**PUT** `/providers/:id/rating`

Actualiza la calificación de un proveedor.

#### Path Parameters

- `id` (string): ID del proveedor

#### Request Body

```json
{
  "rating": 4.8
}
```

#### Response

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Proveedor de Materiales ABC",
  "rating": 4.8,
  "updatedAt": "2023-09-05T11:30:00.000Z"
}
```

### 11. Eliminar Proveedor

**DELETE** `/providers/:id`

Elimina un proveedor del sistema.

#### Path Parameters

- `id` (string): ID del proveedor

#### Response

```json
{
  "deleted": true
}
```

### 12. Subir Documento

**POST** `/providers/:id/documents`

Sube un documento para un proveedor.

#### Path Parameters

- `id` (string): ID del proveedor

#### Request Body (multipart/form-data)

- `file` (file): Archivo a subir

#### Response

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Proveedor de Materiales ABC",
  "documents": [
    "https://s3.amazonaws.com/bucket/providers/64f8a1b2c3d4e5f6a7b8c9d0/documento.pdf"
  ],
  "updatedAt": "2023-09-05T11:30:00.000Z"
}
```

## Códigos de Estado HTTP

- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Datos de entrada inválidos
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error interno del servidor

## Validaciones

### Campos Requeridos para Crear Proveedor

- `name`: Nombre del proveedor (2-120 caracteres)
- `contacts`: Array de contactos (mínimo 1)
  - `name`: Nombre del contacto (2-100 caracteres)
  - `email`: Email válido
  - `area`: Área del contacto (2-50 caracteres)
- `services`: Array de servicios (mínimo 1)

### Campos Opcionales

- `address`: Dirección legacy (compatibilidad)
- `taxId`: RUC/DNI del proveedor
- `ubicacion`: Información de ubicación
- `description`: Descripción del proveedor (10-500 caracteres)
- `website`: URL válida del sitio web
- `rating`: Calificación entre 1 y 5
- `isActive`: Estado activo (default: true)

## Índices de Base de Datos

El sistema implementa los siguientes índices para optimizar las consultas:

- Índice simple en `name`
- Índice simple en `taxId`
- Índice simple en `contacts.email`
- Índice simple en `ubicacion.paisCodigo`
- Índice simple en `ubicacion.provinciaCodigo`
- Índice simple en `ubicacion.distritoCodigo`
- Índice simple en `services`
- Índice simple en `isActive`
- Índice simple en `rating` (descendente)
- Índice simple en `createdAt` (descendente)
- Índice compuesto en ubicación (`paisCodigo`, `provinciaCodigo`, `distritoCodigo`)
- Índice de texto completo en `name`, `description`, `contacts.name`, `contacts.email`, `services`

## Notas de Implementación

1. **Principios SOLID**: El código sigue los principios SOLID con separación clara de responsabilidades.

2. **Consultas Optimizadas**: Se implementaron índices estratégicos para consultas rápidas.

3. **Validación de Ubicación**: Se valida la existencia de países, provincias y distritos antes de guardar.

4. **Enriquecimiento de Datos**: Las respuestas incluyen información completa de ubicación.

5. **Búsqueda Flexible**: Soporte para búsqueda por texto, servicios y estado.

6. **Gestión de Documentos**: Integración con servicio de documentos para subir archivos.

7. **Estadísticas**: Endpoint dedicado para obtener métricas del sistema.

8. **Calificaciones**: Sistema de calificación de 1 a 5 estrellas.

9. **Estado Activo/Inactivo**: Control de estado para habilitar/deshabilitar proveedores.

10. **Compatibilidad**: Mantiene compatibilidad con estructura de clientes existente.
