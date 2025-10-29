# API de Cotizaciones (Quotes)

## Descripción General

La API de cotizaciones permite gestionar el ciclo completo de vida de las cotizaciones, incluyendo creación, actualización, gestión de estados, subida de documentos y generación de reportes PDF.

## Campos del Recurso

### Quote Schema
```typescript
{
  clientId: ObjectId,        // Referencia al cliente (requerido)
  state: string,             // Estado: 'Pendiente', 'Enviada', 'Rechazada', 'Cancelada', 'Observada', 'Aprobada'
  projectId: ObjectId,       // Referencia al proyecto (requerido)
  number: string,            // Número secuencial único (generado automáticamente)
  createDate: Date,          // Fecha de creación (requerido)
  sendDate: Date,            // Fecha de envío (opcional)
  documents: string[],       // URLs de documentos subidos
  items: QuoteItem[],        // Items de la cotización
  total: number,             // Total calculado
  notes: string,             // Notas adicionales
  createdAt: Date,           // Timestamp de creación
  updatedAt: Date            // Timestamp de actualización
}
```

### QuoteItem Schema
```typescript
{
  description: string,       // Descripción del item
  qty: number,              // Cantidad (mínimo 1)
  price: number             // Precio unitario (mínimo 0)
}
```

## Endpoints

### 1. Crear Cotización
**POST** `/quotes`

**Payload:**
```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "projectId": "507f1f77bcf86cd799439012",
  "state": "Pendiente",
  "createDate": "2024-01-15T10:30:00.000Z",
  "sendDate": "2024-01-16T14:00:00.000Z",
  "documents": ["https://s3.amazonaws.com/bucket/doc1.pdf"],
  "items": [
    {
      "description": "Desarrollo de aplicación web",
      "qty": 40,
      "price": 150.00
    },
    {
      "description": "Diseño de interfaz",
      "qty": 20,
      "price": 100.00
    }
  ],
  "notes": "Cotización para proyecto de desarrollo"
}
```

**Respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "clientId": "507f1f77bcf86cd799439011",
  "state": "Pendiente",
  "projectId": "507f1f77bcf86cd799439012",
  "number": "000001",
  "createDate": "2024-01-15T10:30:00.000Z",
  "sendDate": "2024-01-16T14:00:00.000Z",
  "documents": ["https://s3.amazonaws.com/bucket/doc1.pdf"],
  "items": [...],
  "total": 8000.00,
  "notes": "Cotización para proyecto de desarrollo",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. Listar Cotizaciones
**GET** `/quotes`

**Query Parameters:**
- `q`: Búsqueda general (número, notas)
- `clientId`: Filtrar por cliente
- `projectId`: Filtrar por proyecto
- `state`: Filtrar por estado
- `sortBy`: Campos para ordenar (separados por coma)
- `sortOrder`: Orden (asc/desc)
- `page`: Página (default: 1)
- `limit`: Límite por página (default: 10)

**Ejemplo:**
```
GET /quotes?clientId=507f1f77bcf86cd799439011&state=Pendiente&page=1&limit=5
```

**Respuesta:**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "clientId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Empresa ABC"
      },
      "projectId": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Proyecto Web",
        "code": "WEB-001"
      },
      "state": "Pendiente",
      "number": "000001",
      "total": 8000.00,
      "createDate": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 3. Obtener Cotización por ID
**GET** `/quotes/:id`

**Respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "clientId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Empresa ABC",
    "taxId": "12345678901"
  },
  "projectId": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Proyecto Web",
    "code": "WEB-001",
    "status": "ACTIVE"
  },
  "state": "Pendiente",
  "number": "000001",
  "createDate": "2024-01-15T10:30:00.000Z",
  "sendDate": "2024-01-16T14:00:00.000Z",
  "documents": ["https://s3.amazonaws.com/bucket/doc1.pdf"],
  "items": [
    {
      "description": "Desarrollo de aplicación web",
      "qty": 40,
      "price": 150.00
    }
  ],
  "total": 8000.00,
  "notes": "Cotización para proyecto de desarrollo",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 4. Actualizar Cotización
**PATCH** `/quotes/:id`

**Payload:**
```json
{
  "state": "Enviada",
  "sendDate": "2024-01-16T14:00:00.000Z",
  "items": [
    {
      "description": "Desarrollo de aplicación web actualizado",
      "qty": 45,
      "price": 160.00
    }
  ],
  "notes": "Cotización actualizada con nuevos requerimientos"
}
```

### 5. Actualizar Estado de Cotización
**PATCH** `/quotes/:id/state`

**Payload:**
```json
{
  "state": "Enviada"
}
```

**Nota:** Si el estado se cambia a "Enviada", se actualiza automáticamente el campo `sendDate`.

### 6. Eliminar Cotización
**DELETE** `/quotes/:id`

**Respuesta:** `204 No Content`

### 7. Subir Múltiples Documentos
**POST** `/quotes/:id/documents`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `files`: Array de archivos (máximo 10)

**Respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "documents": [
    "https://s3.amazonaws.com/bucket/quotes/507f1f77bcf86cd799439013/document_1642248000000_0_contrato.pdf",
    "https://s3.amazonaws.com/bucket/quotes/507f1f77bcf86cd799439013/document_1642248000000_1_especificaciones.pdf"
  ],
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 8. Agregar URLs de Documentos
**POST** `/quotes/:id/documents/urls`

**Payload:**
```json
{
  "documentUrls": [
    "https://s3.amazonaws.com/bucket/external-doc1.pdf",
    "https://s3.amazonaws.com/bucket/external-doc2.pdf"
  ]
}
```

### 9. Eliminar Documento
**DELETE** `/quotes/:id/documents?url=https://s3.amazonaws.com/bucket/doc1.pdf`

**Respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "documents": [
    "https://s3.amazonaws.com/bucket/doc2.pdf"
  ],
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 10. Obtener Cotizaciones por Cliente
**GET** `/quotes/client/:clientId`

**Query Parameters:**
- `state`: Filtrar por estado (opcional)

**Ejemplo:**
```
GET /quotes/client/507f1f77bcf86cd799439011?state=Pendiente
```

### 11. Obtener Cotizaciones por Proyecto
**GET** `/quotes/project/:projectId`

**Query Parameters:**
- `state`: Filtrar por estado (opcional)

**Ejemplo:**
```
GET /quotes/project/507f1f77bcf86cd799439012?state=Enviada
```

### 12. Estadísticas de Cotizaciones
**GET** `/quotes/statistics`

**Respuesta:**
```json
{
  "byState": [
    {
      "_id": "Pendiente",
      "count": 15,
      "totalValue": 120000.00
    },
    {
      "_id": "Enviada",
      "count": 8,
      "totalValue": 85000.00
    },
    {
      "_id": "Aprobada",
      "count": 5,
      "totalValue": 65000.00
    }
  ],
  "totalQuotes": 28,
  "totalValue": 270000.00
}
```

### 13. Generar PDF de Cotización
**GET** `/quotes/:id/pdf`

**Respuesta:** Archivo PDF descargable

**Headers de Respuesta:**
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename=quote_000001.pdf`

## Códigos de Estado HTTP

- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado exitosamente
- `204 No Content`: Recurso eliminado exitosamente
- `400 Bad Request`: Datos de entrada inválidos
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error interno del servidor

## Validaciones

### Estados Válidos
- `Pendiente` (default)
- `Enviada`
- `Rechazada`
- `Cancelada`
- `Observada`
- `Aprobada`

### Validaciones de Campos
- `clientId`: Debe ser un ObjectId válido
- `projectId`: Debe ser un ObjectId válido
- `createDate`: Debe ser una fecha válida en formato ISO
- `sendDate`: Debe ser una fecha válida en formato ISO
- `items.qty`: Debe ser mayor a 0
- `items.price`: Debe ser mayor o igual a 0
- `total`: Se calcula automáticamente basado en los items

## Índices de Base de Datos

Para optimizar las consultas, se han creado los siguientes índices:

1. `{ clientId: 1, state: 1 }` - Consultas por cliente y estado
2. `{ projectId: 1, state: 1 }` - Consultas por proyecto y estado
3. `{ number: 1 }` - Búsqueda por número de cotización
4. `{ state: 1 }` - Filtrado por estado
5. `{ createDate: -1 }` - Ordenamiento por fecha de creación
6. `{ sendDate: -1 }` - Ordenamiento por fecha de envío
7. `{ createdAt: -1 }` - Ordenamiento por timestamp de creación
8. `{ clientId: 1, createdAt: -1 }` - Consultas por cliente ordenadas por fecha
9. `{ projectId: 1, createdAt: -1 }` - Consultas por proyecto ordenadas por fecha

## Principios SOLID Aplicados

### Single Responsibility Principle (SRP)
- `QuotesService`: Responsable únicamente de la lógica de negocio de cotizaciones
- `QuotesController`: Responsable únicamente de manejar las peticiones HTTP
- DTOs separados para diferentes operaciones

### Open/Closed Principle (OCP)
- El servicio está abierto para extensión pero cerrado para modificación
- Nuevos tipos de validaciones pueden agregarse sin modificar el código existente

### Liskov Substitution Principle (LSP)
- Los DTOs pueden ser sustituidos por sus tipos base sin afectar la funcionalidad

### Interface Segregation Principle (ISP)
- DTOs específicos para cada operación (Create, Update, Query, etc.)
- Servicios con métodos específicos para cada responsabilidad

### Dependency Inversion Principle (DIP)
- El controller depende de abstracciones (interfaces) no de implementaciones concretas
- Inyección de dependencias para servicios externos

## Notas de Implementación

1. **Generación de Números Secuenciales**: Los números de cotización se generan automáticamente en formato secuencial (000001, 000002, etc.)

2. **Validación de Referencias**: Se valida que los `clientId` y `projectId` sean ObjectIds válidos antes de crear o actualizar cotizaciones

3. **Cálculo Automático de Totales**: El total se calcula automáticamente basado en los items de la cotización

4. **Gestión de Estados**: El estado "Enviada" actualiza automáticamente el campo `sendDate`

5. **Subida de Documentos**: Soporte para subir múltiples archivos simultáneamente con límite de 10 archivos por petición

6. **Paginación**: Todas las consultas de listado incluyen paginación para optimizar el rendimiento

7. **Población de Referencias**: Las consultas incluyen información de clientes y proyectos relacionados para facilitar el uso en el frontend
