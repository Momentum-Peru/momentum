# 📋 Nuevos Endpoints - Sistema de Gastos Diarios y Proyectos

## Descripción General

Este documento contiene todos los nuevos endpoints implementados para el sistema de gastos diarios y proyectos. El sistema permite a los trabajadores registrar información diaria de gastos, compras y actividades en campo.

---

## 🏷️ Categorías de Gastos

### **Base URL:** `/expense-categories`

| Método   | Endpoint                                | Descripción                                      |
| -------- | --------------------------------------- | ------------------------------------------------ |
| `POST`   | `/expense-categories`                   | Crear nueva categoría de gasto                   |
| `GET`    | `/expense-categories`                   | Obtener todas las categorías                     |
| `GET`    | `/expense-categories?activeOnly=true`   | Obtener solo categorías activas                  |
| `GET`    | `/expense-categories/active`            | Obtener categorías activas (endpoint específico) |
| `GET`    | `/expense-categories/:id`               | Obtener categoría por ID                         |
| `GET`    | `/expense-categories/code/:code`        | Obtener categoría por código                     |
| `PATCH`  | `/expense-categories/:id`               | Actualizar categoría                             |
| `PATCH`  | `/expense-categories/:id/toggle-active` | Activar/desactivar categoría                     |
| `DELETE` | `/expense-categories/:id`               | Eliminar categoría                               |

### **Ejemplos de Uso:**

#### Crear Categoría

```http
POST /expense-categories
Content-Type: application/json

{
  "name": "Transporte",
  "description": "Gastos relacionados con transporte y movilidad",
  "code": "TRANS",
  "color": "#3B82F6",
  "sortOrder": 1
}
```

#### Obtener Categoría por Código

```http
GET /expense-categories/code/TRANS
```

---

## 🏗️ Proyectos

### **Base URL:** `/projects`

| Método   | Endpoint                                                         | Descripción                           |
| -------- | ---------------------------------------------------------------- | ------------------------------------- |
| `POST`   | `/projects`                                                      | Crear nuevo proyecto                  |
| `GET`    | `/projects`                                                      | Obtener todos los proyectos           |
| `GET`    | `/projects?clientId=:id&status=:status&activeOnly=true&q=:query` | Filtrar proyectos                     |
| `GET`    | `/projects/active`                                               | Obtener proyectos activos             |
| `GET`    | `/projects/stats`                                                | Obtener estadísticas de proyectos     |
| `GET`    | `/projects/client/:clientId`                                     | Obtener proyectos por cliente         |
| `GET`    | `/projects/client/:clientId?activeOnly=true`                     | Obtener proyectos activos por cliente |
| `GET`    | `/projects/:id`                                                  | Obtener proyecto por ID               |
| `GET`    | `/projects/code/:code`                                           | Obtener proyecto por código           |
| `PATCH`  | `/projects/:id`                                                  | Actualizar proyecto                   |
| `PATCH`  | `/projects/:id/status`                                           | Actualizar estado del proyecto        |
| `PATCH`  | `/projects/:id/toggle-active`                                    | Activar/desactivar proyecto           |
| `DELETE` | `/projects/:id`                                                  | Eliminar proyecto                     |

### **Query Parameters para `/projects`:**

- `clientId` (opcional): Filtrar por cliente
- `status` (opcional): Filtrar por estado (`PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`)
- `activeOnly` (opcional): Solo proyectos activos (`true`/`false`)
- `q` (opcional): Búsqueda en nombre, descripción, código

### **Ejemplos de Uso:**

#### Crear Proyecto

```http
POST /projects
Content-Type: application/json

{
  "name": "Instalación Sistema Eléctrico",
  "description": "Instalación completa del sistema eléctrico en edificio comercial",
  "code": "PROJ-2024-001",
  "clientId": "507f1f77bcf86cd799439020",
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-03-15T00:00:00.000Z",
  "status": "PLANNING",
  "location": "Av. Principal 123, Lima",
  "budget": 50000,
  "notes": "Proyecto prioritario para el cliente"
}
```

#### Filtrar Proyectos

```http
GET /projects?clientId=507f1f77bcf86cd799439020&status=ACTIVE&activeOnly=true&q=eléctrico
```

#### Actualizar Estado del Proyecto

```http
PATCH /projects/:id/status
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

#### Obtener Estadísticas

```http
GET /projects/stats
```

**Response:**

```json
{
  "total": 25,
  "active": 20,
  "byStatus": {
    "PLANNING": 5,
    "ACTIVE": 15,
    "ON_HOLD": 3,
    "COMPLETED": 2,
    "CANCELLED": 0
  }
}
```

---

## 💰 Gastos Diarios

### **Base URL:** `/daily-expenses`

| Método   | Endpoint                                                                                         | Descripción                             |
| -------- | ------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `POST`   | `/daily-expenses`                                                                                | Crear nuevo gasto diario                |
| `GET`    | `/daily-expenses`                                                                                | Obtener todos los gastos diarios        |
| `GET`    | `/daily-expenses?userId=:id&projectId=:id&status=:status&startDate=:date&endDate=:date&q=:query` | Filtrar gastos                          |
| `GET`    | `/daily-expenses/stats`                                                                          | Obtener estadísticas de gastos          |
| `GET`    | `/daily-expenses/stats?userId=:id&projectId=:id&startDate=:date&endDate=:date`                   | Estadísticas filtradas                  |
| `GET`    | `/daily-expenses/user/:userId`                                                                   | Obtener gastos por usuario              |
| `GET`    | `/daily-expenses/user/:userId?startDate=:date&endDate=:date`                                     | Gastos por usuario con filtro de fecha  |
| `GET`    | `/daily-expenses/project/:projectId`                                                             | Obtener gastos por proyecto             |
| `GET`    | `/daily-expenses/project/:projectId?startDate=:date&endDate=:date`                               | Gastos por proyecto con filtro de fecha |
| `GET`    | `/daily-expenses/:id`                                                                            | Obtener gasto diario por ID             |
| `PATCH`  | `/daily-expenses/:id`                                                                            | Actualizar gasto diario                 |
| `PATCH`  | `/daily-expenses/:id/submit`                                                                     | Enviar para aprobación                  |
| `PATCH`  | `/daily-expenses/:id/approve`                                                                    | Aprobar o rechazar gasto                |
| `DELETE` | `/daily-expenses/:id`                                                                            | Eliminar gasto diario                   |
| `POST`   | `/daily-expenses/:id/observations/:observationIndex/documents`                                   | Subir documento a observación           |
| `DELETE` | `/daily-expenses/:id/observations/:observationIndex/documents`                                   | Eliminar documento de observación       |
| `POST`   | `/daily-expenses/:id/purchases/:purchaseIndex/documents`                                         | Subir documento a compra                |
| `DELETE` | `/daily-expenses/:id/purchases/:purchaseIndex/documents`                                         | Eliminar documento de compra            |

### **Query Parameters para `/daily-expenses`:**

- `userId` (opcional): Filtrar por usuario
- `projectId` (opcional): Filtrar por proyecto
- `status` (opcional): Filtrar por estado (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`)
- `startDate` (opcional): Fecha de inicio (formato ISO)
- `endDate` (opcional): Fecha de fin (formato ISO)
- `q` (opcional): Búsqueda en título, observaciones, resumen, descripción de compras

### **Estados de Gastos Diarios:**

- `DRAFT`: Borrador (editable por el propietario)
- `SUBMITTED`: Enviado para aprobación
- `APPROVED`: Aprobado
- `REJECTED`: Rechazado

### **Ejemplos de Uso:**

#### Crear Gasto Diario

```http
POST /daily-expenses
Content-Type: application/json

{
  "title": "Trabajo en sitio - Proyecto ABC",
  "date": "2024-01-15T00:00:00.000Z",
  "observations": [
    {
      "description": "Clima favorable para trabajar",
      "notes": "Sin lluvia, temperatura ideal",
      "observationDate": "2024-01-15T08:00:00.000Z",
      "documents": []
    },
    {
      "description": "Problema con el acceso al sitio",
      "notes": "Puerta principal cerrada, usar entrada lateral",
      "observationDate": "2024-01-15T09:30:00.000Z",
      "documents": []
    }
  ],
  "purchases": [
    {
      "description": "Taxi al sitio de trabajo",
      "amount": 25.5,
      "categoryId": "507f1f77bcf86cd799439011",
      "notes": "Viaje de ida y vuelta",
      "vendor": "Taxi Express",
      "purchaseDate": "2024-01-15T08:30:00.000Z",
      "documents": []
    },
    {
      "description": "Almuerzo",
      "amount": 15.0,
      "categoryId": "507f1f77bcf86cd799439012",
      "vendor": "Restaurante El Buen Sabor",
      "documents": []
    }
  ],
  "dailySummary": "Instalación de sistema eléctrico en planta baja. Se completó el 60% del trabajo planificado.",
  "userId": "507f1f77bcf86cd799439012",
  "projectId": "507f1f77bcf86cd799439013",
  "status": "DRAFT"
}
```

#### Filtrar Gastos Diarios

```http
GET /daily-expenses?userId=507f1f77bcf86cd799439012&projectId=507f1f77bcf86cd799439013&status=DRAFT&startDate=2024-01-01&endDate=2024-01-31&q=taxi
```

#### Enviar para Aprobación

```http
PATCH /daily-expenses/:id/submit
```

#### Aprobar Gasto

```http
PATCH /daily-expenses/:id/approve
Content-Type: application/json

{
  "status": "APPROVED"
}
```

#### Rechazar Gasto

```http
PATCH /daily-expenses/:id/approve
Content-Type: application/json

{
  "status": "REJECTED",
  "rejectionReason": "Montos excesivos sin justificación"
}
```

#### Obtener Estadísticas de Gastos

```http
GET /daily-expenses/stats?userId=507f1f77bcf86cd799439012&projectId=507f1f77bcf86cd799439013&startDate=2024-01-01&endDate=2024-01-31
```

#### Subir Documento a Observación

```http
POST /daily-expenses/:id/observations/0/documents
Content-Type: multipart/form-data

file: [archivo de imagen o documento]
```

#### Subir Documento a Compra

```http
POST /daily-expenses/:id/purchases/0/documents
Content-Type: multipart/form-data

file: [archivo de imagen o documento]
```

#### Eliminar Documento de Observación

```http
DELETE /daily-expenses/:id/observations/0/documents
Content-Type: application/json

{
  "documentUrl": "https://ejemplo.com/documento.jpg"
}
```

#### Eliminar Documento de Compra

```http
DELETE /daily-expenses/:id/purchases/0/documents
Content-Type: application/json

{
  "documentUrl": "https://ejemplo.com/factura.pdf"
}
```

**Response:**

```json
{
  "totalExpenses": 1250.75,
  "totalReports": 15,
  "avgDailyExpense": 83.38,
  "byStatus": {
    "DRAFT": {
      "count": 3,
      "totalAmount": 150.25
    },
    "SUBMITTED": {
      "count": 5,
      "totalAmount": 400.5
    },
    "APPROVED": {
      "count": 7,
      "totalAmount": 700.0
    },
    "REJECTED": {
      "count": 0,
      "totalAmount": 0
    }
  }
}
```

---

## 🔄 Flujo de Trabajo Completo

### **1. Configuración Inicial**

```bash
# 1. Crear categorías de gastos (opcional, ya vienen por defecto)
POST /expense-categories

# 2. Crear proyecto
POST /projects
```

### **2. Trabajo Diario**

```bash
# 1. Crear gasto diario
POST /daily-expenses

# 2. Actualizar si es necesario (solo en estado DRAFT)
PATCH /daily-expenses/:id

# 3. Enviar para aprobación
PATCH /daily-expenses/:id/submit
```

### **3. Aprobación**

```bash
# 1. Aprobar gasto
PATCH /daily-expenses/:id/approve

# 2. O rechazar con razón
PATCH /daily-expenses/:id/approve
```

### **4. Reportes y Consultas**

```bash
# 1. Ver estadísticas generales
GET /daily-expenses/stats

# 2. Filtrar por usuario
GET /daily-expenses/user/:userId?startDate=2024-01-01&endDate=2024-01-31

# 3. Filtrar por proyecto
GET /daily-expenses/project/:projectId?startDate=2024-01-01&endDate=2024-01-31

# 4. Ver proyectos activos
GET /projects/active

# 5. Ver categorías disponibles
GET /expense-categories/active
```

---

## 📊 Características Especiales

### **Cálculo Automático**

- El campo `totalAmount` se calcula automáticamente sumando todos los montos de las compras
- No es necesario enviarlo en el payload

### **Validaciones Automáticas**

- Los proyectos deben estar relacionados con clientes válidos
- Las categorías deben existir en el sistema
- Solo el propietario puede editar gastos en estado `DRAFT`

### **Búsqueda Inteligente**

- Búsqueda en múltiples campos simultáneamente
- Filtros por fecha, usuario, proyecto, estado
- Búsqueda case-insensitive

### **Datos Precargados**

- 7 categorías de gastos se crean automáticamente al iniciar el sistema
- Colores y códigos predefinidos para mejor UX

### **Múltiples Observaciones con Documentos**

- Cada gasto diario puede tener múltiples observaciones
- Cada observación puede incluir:
  - Descripción detallada
  - Notas adicionales
  - Fecha específica de la observación
  - Múltiples documentos/fotos adjuntos
- Los documentos se pueden subir y eliminar individualmente

### **Múltiples Compras con Documentos**

- Cada gasto diario puede tener múltiples compras
- Cada compra puede incluir:
  - Descripción del gasto
  - Monto
  - Categoría
  - Notas adicionales
  - Proveedor/vendedor
  - Fecha específica de la compra
  - Múltiples documentos/fotos adjuntos (facturas, recibos, etc.)
- Los documentos se pueden subir y eliminar individualmente

---

## 🚨 Códigos de Error

| Código | Descripción                        |
| ------ | ---------------------------------- |
| `400`  | Datos de entrada inválidos         |
| `401`  | No autenticado                     |
| `403`  | Sin permisos para la acción        |
| `404`  | Recurso no encontrado              |
| `409`  | Conflicto (código duplicado, etc.) |
| `500`  | Error del servidor                 |

---

## 📝 Notas Importantes

1. **Autenticación**: Todos los endpoints requieren autenticación (JWT token)
2. **Permisos**: Solo el propietario puede editar/eliminar sus gastos en estado `DRAFT`
3. **Estados**: Los gastos siguen un flujo estricto de estados
4. **Fechas**: Todas las fechas deben estar en formato ISO 8601
5. **Montos**: Los montos deben ser números positivos
6. **Relaciones**: Los proyectos deben estar relacionados con clientes existentes
7. **Categorías**: Las categorías se crean automáticamente al iniciar el sistema
8. **Documentos**: Solo se pueden subir/eliminar documentos en gastos con estado `DRAFT`
9. **Índices**: Los índices de observaciones y compras empiezan en 0
10. **Archivos**: Los documentos pueden ser imágenes (JPG, PNG) o archivos PDF
11. **Tamaño**: Los archivos están limitados por la configuración del servidor

---

## 🎯 Categorías por Defecto

El sistema incluye automáticamente estas categorías:

| Código  | Nombre         | Descripción         | Color   |
| ------- | -------------- | ------------------- | ------- |
| `TRANS` | Transporte     | Gastos de movilidad | #3B82F6 |
| `FOOD`  | Alimentación   | Comida y bebida     | #10B981 |
| `HOTEL` | Hospedaje      | Alojamiento         | #8B5CF6 |
| `MAT`   | Materiales     | Suministros         | #F59E0B |
| `TOOLS` | Herramientas   | Equipos             | #EF4444 |
| `COMM`  | Comunicaciones | Teléfono/internet   | #06B6D4 |
| `OTHER` | Otros          | Gastos varios       | #6B7280 |
