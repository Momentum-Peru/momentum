# 🌍 API de Clientes y Ubicaciones - Endpoints y Payloads

## Descripción General

El módulo de clientes permite gestionar información completa de clientes con sistema de ubicaciones geográficas jerárquico (País → Provincia → Distrito) para países latinoamericanos. Incluye validación automática de ubicaciones y enriquecimiento de datos.

## 🔧 Campos del Modelo de Cliente

### Campos Obligatorios

- **name**: Nombre del cliente
- **contacts**: Array de contactos del cliente

### Campos Opcionales

- **address**: Dirección del cliente (legacy)
- **taxId**: RUC/DNI del cliente
- **ubicacion**: Objeto con información geográfica completa
- **documents**: Array de URLs de documentos

### Estructura de Ubicación

```json
{
  "paisCodigo": "PE", // Código del país (ISO 3166-1 alpha-2)
  "provinciaCodigo": "LIMA", // Código de la provincia/estado
  "distritoCodigo": "MIRAFLORES", // Código del distrito/municipio
  "direccion": "Av. Larco 123" // Dirección específica
}
```

### Estructura de Contacto

```json
{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "phone": "+51 999 999 999",
  "area": "Ventas"
}
```

---

## 📡 Endpoints de Ubicaciones

### 1. **Obtener Todos los Países**

```http
GET /locations/countries
```

**Response:**

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "codigo": "PE",
    "nombre": "Perú",
    "nombreCompleto": "República del Perú",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "codigo": "AR",
    "nombre": "Argentina",
    "nombreCompleto": "República Argentina",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 2. **Obtener País por Código**

```http
GET /locations/countries/:codigo
```

**Ejemplo:**

```http
GET /locations/countries/PE
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "codigo": "PE",
  "nombre": "Perú",
  "nombreCompleto": "República del Perú",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 3. **Obtener Provincias por País**

```http
GET /locations/countries/:paisCodigo/provinces
```

**Ejemplo:**

```http
GET /locations/countries/PE/provinces
```

**Response:**

```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "codigo": "LIMA",
    "nombre": "Lima",
    "paisCodigo": "PE",
    "tipo": "Región",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439014",
    "codigo": "AREQUIPA",
    "nombre": "Arequipa",
    "paisCodigo": "PE",
    "tipo": "Región",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 4. **Obtener Provincia Específica**

```http
GET /locations/countries/:paisCodigo/provinces/:codigo
```

**Ejemplo:**

```http
GET /locations/countries/PE/provinces/LIMA
```

---

### 5. **Obtener Distritos por Provincia**

```http
GET /locations/provinces/:provinciaCodigo/districts
```

**Ejemplo:**

```http
GET /locations/provinces/LIMA/districts
```

**Response:**

```json
[
  {
    "_id": "507f1f77bcf86cd799439015",
    "codigo": "LIMA_CENTRO",
    "nombre": "Lima",
    "provinciaCodigo": "LIMA",
    "paisCodigo": "PE",
    "tipo": "Distrito",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439016",
    "codigo": "MIRAFLORES",
    "nombre": "Miraflores",
    "provinciaCodigo": "LIMA",
    "paisCodigo": "PE",
    "tipo": "Distrito",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 6. **Obtener Distritos por País**

```http
GET /locations/countries/:paisCodigo/districts
```

**Ejemplo:**

```http
GET /locations/countries/PE/districts
```

---

### 7. **Obtener Distrito Específico**

```http
GET /locations/provinces/:provinciaCodigo/districts/:codigo
```

**Ejemplo:**

```http
GET /locations/provinces/LIMA/districts/MIRAFLORES
```

---

### 8. **Búsqueda General de Ubicaciones**

```http
GET /locations/search?q=termino
```

**Ejemplo:**

```http
GET /locations/search?q=Lima
```

**Response:**

```json
{
  "countries": [],
  "provinces": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "codigo": "LIMA",
      "nombre": "Lima",
      "paisCodigo": "PE",
      "tipo": "Región"
    }
  ],
  "districts": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "codigo": "LIMA_CENTRO",
      "nombre": "Lima",
      "provinciaCodigo": "LIMA",
      "paisCodigo": "PE",
      "tipo": "Distrito"
    }
  ]
}
```

---

### 9. **Obtener Ubicación Completa**

```http
GET /locations/complete?pais=PE&provincia=LIMA&distrito=MIRAFLORES
```

**Response:**

```json
{
  "country": {
    "_id": "507f1f77bcf86cd799439011",
    "codigo": "PE",
    "nombre": "Perú",
    "nombreCompleto": "República del Perú"
  },
  "province": {
    "_id": "507f1f77bcf86cd799439013",
    "codigo": "LIMA",
    "nombre": "Lima",
    "paisCodigo": "PE",
    "tipo": "Región"
  },
  "district": {
    "_id": "507f1f77bcf86cd799439016",
    "codigo": "MIRAFLORES",
    "nombre": "Miraflores",
    "provinciaCodigo": "LIMA",
    "paisCodigo": "PE",
    "tipo": "Distrito"
  }
}
```

---

## 📡 Endpoints de Clientes

### 1. **Crear Cliente**

```http
POST /clients
Content-Type: application/json
```

**Payload:**

```json
{
  "name": "Empresa ABC S.A.C.",
  "address": "Av. Larco 123, Miraflores", // Campo legacy
  "taxId": "20123456789",
  "ubicacion": {
    "paisCodigo": "PE",
    "provinciaCodigo": "LIMA",
    "distritoCodigo": "MIRAFLORES",
    "direccion": "Av. Larco 123, Oficina 456"
  },
  "contacts": [
    {
      "name": "Juan Pérez",
      "email": "juan.perez@empresaabc.com",
      "phone": "+51 999 999 999",
      "area": "Ventas"
    },
    {
      "name": "María García",
      "email": "maria.garcia@empresaabc.com",
      "phone": "+51 888 888 888",
      "area": "Administración"
    }
  ]
}
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439020",
  "name": "Empresa ABC S.A.C.",
  "address": "Av. Larco 123, Miraflores",
  "taxId": "20123456789",
  "ubicacion": {
    "paisCodigo": "PE",
    "provinciaCodigo": "LIMA",
    "distritoCodigo": "MIRAFLORES",
    "direccion": "Av. Larco 123, Oficina 456"
  },
  "ubicacionCompleta": {
    "country": {
      "_id": "507f1f77bcf86cd799439011",
      "codigo": "PE",
      "nombre": "Perú",
      "nombreCompleto": "República del Perú"
    },
    "province": {
      "_id": "507f1f77bcf86cd799439013",
      "codigo": "LIMA",
      "nombre": "Lima",
      "paisCodigo": "PE",
      "tipo": "Región"
    },
    "district": {
      "_id": "507f1f77bcf86cd799439016",
      "codigo": "MIRAFLORES",
      "nombre": "Miraflores",
      "provinciaCodigo": "LIMA",
      "paisCodigo": "PE",
      "tipo": "Distrito"
    }
  },
  "contacts": [
    {
      "name": "Juan Pérez",
      "email": "juan.perez@empresaabc.com",
      "phone": "+51 999 999 999",
      "area": "Ventas"
    },
    {
      "name": "María García",
      "email": "maria.garcia@empresaabc.com",
      "phone": "+51 888 888 888",
      "area": "Administración"
    }
  ],
  "documents": [],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. **Obtener Todos los Clientes**

```http
GET /clients
GET /clients?q=busqueda
```

**Query Parameters:**

- `q` (opcional): Término de búsqueda en nombre, taxId, contactos y dirección

**Response:** Array de clientes con información de ubicación enriquecida

---

### 3. **Filtrar Clientes por País**

```http
GET /clients/country/:paisCodigo
```

**Ejemplo:**

```http
GET /clients/country/PE
```

**Response:** Array de clientes del país especificado

---

### 4. **Filtrar Clientes por Provincia**

```http
GET /clients/country/:paisCodigo/province/:provinciaCodigo
```

**Ejemplo:**

```http
GET /clients/country/PE/province/LIMA
```

**Response:** Array de clientes de la provincia especificada

---

### 5. **Filtrar Clientes por Distrito**

```http
GET /clients/country/:paisCodigo/province/:provinciaCodigo/district/:distritoCodigo
```

**Ejemplo:**

```http
GET /clients/country/PE/province/LIMA/district/MIRAFLORES
```

**Response:** Array de clientes del distrito especificado

---

### 6. **Obtener Cliente por ID**

```http
GET /clients/:id
```

**Response:** Cliente individual con información de ubicación enriquecida

---

### 7. **Actualizar Cliente**

```http
PATCH /clients/:id
Content-Type: application/json
```

**Payload:** (Todos los campos son opcionales)

```json
{
  "name": "Empresa ABC S.A.C. - Actualizada",
  "ubicacion": {
    "paisCodigo": "AR",
    "provinciaCodigo": "CABA",
    "distritoCodigo": "PALERMO",
    "direccion": "Av. Santa Fe 1234"
  },
  "contacts": [
    {
      "name": "Carlos Rodríguez",
      "email": "carlos.rodriguez@empresaabc.com",
      "phone": "+54 11 1234 5678",
      "area": "Gerencia"
    }
  ]
}
```

**Response:** Cliente actualizado con información de ubicación enriquecida

---

### 8. **Eliminar Cliente**

```http
DELETE /clients/:id
```

**Response:**

```json
{
  "deleted": true
}
```

---

### 9. **Subir Documento**

```http
POST /clients/:id/documents
Content-Type: multipart/form-data
```

**Form Data:**

- `file`: Archivo a subir (PDF, DOC, DOCX, etc.)

**Response:** Cliente actualizado con la nueva URL del documento

---

## ✅ Validaciones de Campos

### **Campos Obligatorios de Cliente:**

| Campo      | Tipo   | Validación          |
| ---------- | ------ | ------------------- |
| `name`     | String | 2-120 caracteres    |
| `contacts` | Array  | Al menos 1 contacto |

### **Campos Opcionales de Cliente:**

| Campo       | Tipo   | Validación           |
| ----------- | ------ | -------------------- |
| `address`   | String | Campo legacy         |
| `taxId`     | String | RUC/DNI              |
| `ubicacion` | Object | Ubicación geográfica |

### **Validaciones de Ubicación:**

| Campo             | Tipo   | Validación                                    |
| ----------------- | ------ | --------------------------------------------- |
| `paisCodigo`      | String | 2-3 caracteres, debe existir                  |
| `provinciaCodigo` | String | 2-50 caracteres, debe existir en el país      |
| `distritoCodigo`  | String | 2-50 caracteres, debe existir en la provincia |
| `direccion`       | String | 5-200 caracteres                              |

### **Validaciones de Contacto:**

| Campo   | Tipo   | Validación       |
| ------- | ------ | ---------------- |
| `name`  | String | 2-100 caracteres |
| `email` | String | Email válido     |
| `phone` | String | Opcional         |
| `area`  | String | 2-50 caracteres  |

---

## 🌎 Países Disponibles

El sistema incluye datos de **19 países latinoamericanos**:

- **Argentina** (AR)
- **Bolivia** (BO)
- **Brasil** (BR)
- **Chile** (CL)
- **Colombia** (CO)
- **Costa Rica** (CR)
- **Cuba** (CU)
- **República Dominicana** (DO)
- **Ecuador** (EC)
- **El Salvador** (SV)
- **Guatemala** (GT)
- **Honduras** (HN)
- **México** (MX)
- **Nicaragua** (NI)
- **Panamá** (PA)
- **Paraguay** (PY)
- **Perú** (PE)
- **Uruguay** (UY)
- **Venezuela** (VE)

---

## 🔍 Características de Búsqueda

### **Búsqueda de Clientes:**

- `name`: Nombre del cliente
- `taxId`: RUC/DNI
- `contacts.name`: Nombre de contactos
- `contacts.email`: Email de contactos
- `ubicacion.direccion`: Dirección específica

### **Búsqueda de Ubicaciones:**

- `nombre`: Nombre de países, provincias o distritos
- Búsqueda case-insensitive
- Resultados agrupados por tipo

---

## 📊 Enriquecimiento de Datos

Todos los endpoints de clientes incluyen automáticamente:

- **ubicacionCompleta**: Información completa del país, provincia y distrito
- **Validación automática**: Verificación de existencia de ubicaciones
- **Datos jerárquicos**: Estructura completa de ubicación geográfica

---

## 🚨 Códigos de Error

- `400 Bad Request`: Datos de entrada inválidos
- `404 Not Found`: Cliente o ubicación no encontrada
- `409 Conflict`: Cliente duplicado
- `500 Internal Server Error`: Error del servidor

---

## 📝 Notas Importantes

1. **Validación automática**: Las ubicaciones se validan automáticamente al crear/actualizar clientes
2. **Enriquecimiento**: Los datos de ubicación se enriquecen automáticamente en las respuestas
3. **Compatibilidad**: Se mantiene el campo `address` para compatibilidad con versiones anteriores
4. **Jerarquía**: La estructura País → Provincia → Distrito es obligatoria para validaciones
5. **Datos precargados**: El sistema incluye datos de países latinoamericanos principales
6. **Búsqueda inteligente**: La búsqueda incluye información geográfica
7. **Filtros geográficos**: Endpoints específicos para filtrar por ubicación
8. **Escalabilidad**: Fácil agregar más países y ubicaciones

---

## 🚀 Flujo de Trabajo Recomendado

1. **Obtener países**: `GET /locations/countries`
2. **Seleccionar país**: `GET /locations/countries/:codigo`
3. **Obtener provincias**: `GET /locations/countries/:codigo/provinces`
4. **Seleccionar provincia**: `GET /locations/provinces/:codigo/districts`
5. **Obtener distritos**: `GET /locations/provinces/:codigo/districts`
6. **Crear cliente**: `POST /clients` con ubicación completa
7. **Filtrar por ubicación**: Usar endpoints específicos de filtrado
