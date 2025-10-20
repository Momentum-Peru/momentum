# 📋 API de Requerimientos - Endpoints y Payloads

## Descripción General

El módulo de requerimientos permite gestionar solicitudes internas con campos adicionales para un control completo del proceso de aprobación y seguimiento. Las personas (solicitante y aprobador) se manejan como objetos independientes con información completa.

## 🔧 Campos del Modelo

### Campos Obligatorios

- **codigo**: Código único del requerimiento
- **title**: Título del requerimiento
- **descripcion**: Descripción detallada
- **fechaEmision**: Fecha de emisión del requerimiento
- **codigoSolicitante**: Código del solicitante
- **centroCosto**: Centro de costo asociado
- **fechaRequerimiento**: Fecha límite del requerimiento
- **solicitante**: Objeto con información completa de la persona solicitante

### Campos Opcionales

- **fechaAprobacion**: Fecha de aprobación
- **estado**: Estado del requerimiento (VIGENTE, ANULADO, ACTIVACIÓN)
- **aprobador**: Objeto con información completa de la persona aprobadora
- **clientId**: ID del cliente (compatibilidad legacy)

### Estructura de Persona

Cada persona (solicitante/aprobador) contiene:

- **nombre**: Nombre completo de la persona
- **codigo**: Código único de la persona
- **cargo**: Cargo o posición de la persona

---

## 📡 Endpoints Disponibles

### 1. **Crear Requerimiento**

```http
POST /requirements
Content-Type: application/json
```

**Payload:**

```json
{
  "codigo": "REQ-2024-001",
  "title": "Solicitud de equipos informáticos",
  "descripcion": "Se requiere la adquisición de 5 computadoras portátiles para el área de desarrollo",
  "fechaEmision": "2024-01-15T00:00:00.000Z",
  "codigoSolicitante": "SOL-001",
  "centroCosto": "Desarrollo de Software",
  "fechaAprobacion": "2024-01-20T00:00:00.000Z",
  "fechaRequerimiento": "2024-01-25T00:00:00.000Z",
  "estado": "VIGENTE",
  "solicitante": {
    "nombre": "Juan Pérez García",
    "codigo": "EMP-001",
    "cargo": "Desarrollador Senior"
  },
  "aprobador": {
    "nombre": "María García López",
    "codigo": "EMP-002",
    "cargo": "Gerente de TI"
  },
  "clientId": "507f1f77bcf86cd799439013"
}
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "codigo": "REQ-2024-001",
  "title": "Solicitud de equipos informáticos",
  "descripcion": "Se requiere la adquisición de 5 computadoras portátiles...",
  "fechaEmision": "2024-01-15T00:00:00.000Z",
  "codigoSolicitante": "SOL-001",
  "centroCosto": "Desarrollo de Software",
  "fechaAprobacion": "2024-01-20T00:00:00.000Z",
  "fechaRequerimiento": "2024-01-25T00:00:00.000Z",
  "estado": "VIGENTE",
  "documentos": [],
  "solicitante": {
    "nombre": "Juan Pérez García",
    "codigo": "EMP-001",
    "cargo": "Desarrollador Senior"
  },
  "aprobador": {
    "nombre": "María García López",
    "codigo": "EMP-002",
    "cargo": "Gerente de TI"
  },
  "clientId": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Cliente ABC"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. **Obtener Todos los Requerimientos**

```http
GET /requirements
GET /requirements?q=busqueda
```

**Query Parameters:**

- `q` (opcional): Término de búsqueda en título, código, descripción, código solicitante, centro de costo, nombres y códigos de personas

**Response:**

```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "codigo": "REQ-2024-001",
    "title": "Solicitud de equipos informáticos",
    "descripcion": "Se requiere la adquisición de 5 computadoras portátiles...",
    "fechaEmision": "2024-01-15T00:00:00.000Z",
    "codigoSolicitante": "SOL-001",
    "centroCosto": "Desarrollo de Software",
    "fechaAprobacion": "2024-01-20T00:00:00.000Z",
    "fechaRequerimiento": "2024-01-25T00:00:00.000Z",
    "estado": "VIGENTE",
    "documentos": ["https://storage.com/doc1.pdf"],
    "solicitante": {
      "nombre": "Juan Pérez García",
      "codigo": "EMP-001",
      "cargo": "Desarrollador Senior"
    },
    "aprobador": {
      "nombre": "María García López",
      "codigo": "EMP-002",
      "cargo": "Gerente de TI"
    },
    "clientId": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Cliente ABC"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 3. **Obtener Requerimiento por ID**

```http
GET /requirements/:id
```

**Response:** (Mismo formato que el item individual del array anterior)

---

### 4. **Actualizar Requerimiento**

```http
PATCH /requirements/:id
Content-Type: application/json
```

**Payload:** (Todos los campos son opcionales)

```json
{
  "codigo": "REQ-2024-001-UPDATED",
  "title": "Solicitud actualizada de equipos",
  "descripcion": "Descripción actualizada del requerimiento",
  "fechaEmision": "2024-01-16T00:00:00.000Z",
  "codigoSolicitante": "SOL-002",
  "centroCosto": "Nuevo Centro de Costo",
  "fechaAprobacion": "2024-01-21T00:00:00.000Z",
  "fechaRequerimiento": "2024-01-26T00:00:00.000Z",
  "estado": "ANULADO",
  "solicitante": {
    "nombre": "Carlos Rodríguez",
    "codigo": "EMP-003",
    "cargo": "Analista de Sistemas"
  },
  "aprobador": {
    "nombre": "Ana Martínez",
    "codigo": "EMP-004",
    "cargo": "Directora de Operaciones"
  }
}
```

**Response:** Requerimiento actualizado con populate de relaciones

---

### 5. **Eliminar Requerimiento**

```http
DELETE /requirements/:id
```

**Response:**

```json
{
  "deleted": true
}
```

---

### 6. **Filtrar por Estado**

```http
GET /requirements/status/:estado
```

**Parámetros:**

- `estado`: `VIGENTE`, `ANULADO`, o `ACTIVACIÓN`

**Ejemplos:**

```http
GET /requirements/status/VIGENTE
GET /requirements/status/ANULADO
GET /requirements/status/ACTIVACIÓN
```

**Response:** Array de requerimientos con el estado especificado

---

### 7. **Filtrar por Solicitante**

```http
GET /requirements/solicitante/:solicitanteCodigo
```

**Ejemplo:**

```http
GET /requirements/solicitante/EMP-001
```

**Response:** Array de requerimientos del solicitante especificado

---

### 8. **Filtrar por Aprobador**

```http
GET /requirements/aprobador/:aprobadorCodigo
```

**Ejemplo:**

```http
GET /requirements/aprobador/EMP-002
```

**Response:** Array de requerimientos del aprobador especificado

---

### 9. **Filtrar por Centro de Costo**

```http
GET /requirements/centro-costo/:centroCosto
```

**Ejemplo:**

```http
GET /requirements/centro-costo/Desarrollo
```

**Response:** Array de requerimientos que coincidan con el centro de costo (búsqueda parcial)

---

### 10. **Subir Documento**

```http
POST /requirements/:id/documents
Content-Type: multipart/form-data
```

**Form Data:**

- `file`: Archivo a subir (PDF, DOC, DOCX, etc.)

**Response:** Requerimiento actualizado con la nueva URL del documento agregada al array `documentos`

---

## ✅ Validaciones de Campos

### **Campos Obligatorios:**

| Campo                | Tipo   | Validación                |
| -------------------- | ------ | ------------------------- |
| `codigo`             | String | 3-50 caracteres, único    |
| `title`              | String | 3-160 caracteres          |
| `descripcion`        | String | 10-1000 caracteres        |
| `fechaEmision`       | Date   | Fecha válida (ISO string) |
| `codigoSolicitante`  | String | 3-50 caracteres           |
| `centroCosto`        | String | 3-100 caracteres          |
| `fechaRequerimiento` | Date   | Fecha válida (ISO string) |
| `solicitante`        | Object | Objeto Persona válido     |

### **Campos Opcionales:**

| Campo             | Tipo     | Validación                         |
| ----------------- | -------- | ---------------------------------- |
| `fechaAprobacion` | Date     | Fecha válida (ISO string)          |
| `estado`          | Enum     | `VIGENTE`, `ANULADO`, `ACTIVACIÓN` |
| `aprobador`       | Object   | Objeto Persona válido              |
| `clientId`        | ObjectId | ID válido de MongoDB               |

### **Validaciones de Persona:**

| Campo    | Tipo   | Validación       |
| -------- | ------ | ---------------- |
| `nombre` | String | 2-100 caracteres |
| `codigo` | String | 3-50 caracteres  |
| `cargo`  | String | 3-100 caracteres |

### **Estados Válidos:**

- `VIGENTE` (por defecto)
- `ANULADO`
- `ACTIVACIÓN`

---

## 🔍 Características de Búsqueda

La búsqueda general (`GET /requirements?q=termino`) busca en los siguientes campos:

- `title`
- `codigo`
- `descripcion`
- `codigoSolicitante`
- `centroCosto`
- `solicitante.nombre`
- `solicitante.codigo`
- `aprobador.nombre`
- `aprobador.codigo`
- `clientId`

---

## 📊 Relaciones Populate

Los endpoints que devuelven requerimientos incluyen automáticamente:

- **clientId**: Información del cliente (name)

**Nota:** Las personas (solicitante y aprobador) ya no requieren populate ya que se almacenan como objetos completos en el documento.

---

## 🚨 Códigos de Error

- `400 Bad Request`: Datos de entrada inválidos
- `404 Not Found`: Requerimiento no encontrado
- `409 Conflict`: Código duplicado
- `500 Internal Server Error`: Error del servidor

---

## 📝 Notas Importantes

1. **Fechas**: Se aceptan en formato ISO string y se convierten automáticamente a Date
2. **Código único**: El campo `codigo` debe ser único en toda la colección
3. **Documentos**: Se almacenan como URLs en el array `documentos`
4. **Personas**: Los solicitantes y aprobadores se almacenan como objetos completos, no como referencias
5. **Compatibilidad**: Se mantiene el campo `clientId` para compatibilidad con versiones anteriores
6. **Ordenamiento**: Los resultados se ordenan por fecha de creación descendente por defecto
7. **Búsqueda mejorada**: La búsqueda ahora incluye nombres y códigos de personas
