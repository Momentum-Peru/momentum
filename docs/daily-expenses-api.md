# 💰 API de Gastos Diarios y Proyectos - Endpoints y Payloads

## Descripción General

El sistema de gastos diarios permite a los trabajadores registrar información diaria de gastos, compras y actividades en campo. Incluye gestión de proyectos relacionados con clientes, categorización de gastos y flujo de aprobación.

## 🏗️ Arquitectura del Sistema

### **Recursos Principales:**

1. **ExpenseCategory**: Categorías de gastos (Transporte, Alimentación, etc.)
2. **Project**: Proyectos relacionados con clientes
3. **DailyExpense**: Reportes diarios de gastos con compras

### **Principios SOLID Aplicados:**

- **Single Responsibility**: Cada servicio maneja una entidad específica
- **Open/Closed**: Fácil extensión sin modificar código existente
- **Dependency Inversion**: Servicios dependen de abstracciones (interfaces)

---

## 📊 Estructura de Datos

### **Estructura de Compra (Purchase)**

```json
{
  "description": "Taxi al sitio de trabajo",
  "amount": 25.5,
  "categoryId": "507f1f77bcf86cd799439011",
  "notes": "Viaje de ida y vuelta",
  "vendor": "Taxi Express",
  "purchaseDate": "2024-01-15T08:30:00.000Z"
}
```

### **Estructura de Observación (Observation)**

```json
{
  "description": "Clima favorable, trabajo sin interrupciones",
  "notes": "Notas adicionales sobre las condiciones",
  "observationDate": "2024-01-15T00:00:00.000Z",
  "observationTime": "08:30",
  "documents": ["https://ejemplo.com/foto1.jpg"]
}
```

### **Estructura de Gasto Diario (DailyExpense)**

```json
{
  "title": "Trabajo en sitio - Proyecto ABC",
  "date": "2024-01-15T00:00:00.000Z",
  "observations": [
    {
      "description": "Clima favorable, trabajo sin interrupciones",
      "notes": "Condiciones ideales para el trabajo",
      "observationDate": "2024-01-15T00:00:00.000Z",
      "observationTime": "08:30",
      "documents": []
    }
  ],
  "purchases": [
    {
      "description": "Taxi al sitio",
      "amount": 25.5,
      "categoryId": "507f1f77bcf86cd799439011",
      "vendor": "Taxi Express"
    }
  ],
  "totalAmount": 25.5,
  "dailySummary": "Instalación de sistema eléctrico en planta baja",
  "userId": "507f1f77bcf86cd799439012",
  "projectId": "507f1f77bcf86cd799439013",
  "status": "DRAFT"
}
```

---

## 📡 Endpoints de Categorías de Gastos

### 1. **Crear Categoría de Gasto**

```http
POST /expense-categories
Content-Type: application/json
```

**Payload:**

```json
{
  "name": "Transporte",
  "description": "Gastos relacionados con transporte y movilidad",
  "code": "TRANS",
  "color": "#3B82F6",
  "sortOrder": 1
}
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Transporte",
  "description": "Gastos relacionados con transporte y movilidad",
  "code": "TRANS",
  "isActive": true,
  "color": "#3B82F6",
  "sortOrder": 1,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. **Obtener Todas las Categorías**

```http
GET /expense-categories
GET /expense-categories?activeOnly=true
```

**Query Parameters:**

- `activeOnly` (opcional): Solo categorías activas

**Response:** Array de categorías ordenadas por `sortOrder`

---

### 3. **Obtener Categorías Activas**

```http
GET /expense-categories/active
```

**Response:** Array de categorías activas

---

### 4. **Obtener Categoría por ID**

```http
GET /expense-categories/:id
```

---

### 5. **Obtener Categoría por Código**

```http
GET /expense-categories/code/:code
```

**Ejemplo:**

```http
GET /expense-categories/code/TRANS
```

---

### 6. **Actualizar Categoría**

```http
PATCH /expense-categories/:id
Content-Type: application/json
```

**Payload:** (Todos los campos son opcionales)

```json
{
  "name": "Transporte Actualizado",
  "description": "Nueva descripción",
  "color": "#1E40AF"
}
```

---

### 7. **Activar/Desactivar Categoría**

```http
PATCH /expense-categories/:id/toggle-active
```

---

### 8. **Eliminar Categoría**

```http
DELETE /expense-categories/:id
```

---

## 📡 Endpoints de Proyectos

### 1. **Crear Proyecto**

```http
POST /projects
Content-Type: application/json
```

**Payload:**

```json
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

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "name": "Instalación Sistema Eléctrico",
  "description": "Instalación completa del sistema eléctrico en edificio comercial",
  "code": "PROJ-2024-001",
  "clientId": {
    "_id": "507f1f77bcf86cd799439020",
    "name": "Empresa ABC S.A.C.",
    "taxId": "20123456789"
  },
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-03-15T00:00:00.000Z",
  "status": "PLANNING",
  "location": "Av. Principal 123, Lima",
  "budget": 50000,
  "notes": "Proyecto prioritario para el cliente",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. **Obtener Todos los Proyectos**

```http
GET /projects
GET /projects?clientId=507f1f77bcf86cd799439020&status=ACTIVE&activeOnly=true&q=eléctrico
```

**Query Parameters:**

- `clientId` (opcional): Filtrar por cliente
- `status` (opcional): Filtrar por estado
- `activeOnly` (opcional): Solo proyectos activos
- `q` (opcional): Búsqueda en nombre, descripción, código

---

### 3. **Obtener Proyectos Activos**

```http
GET /projects/active
```

---

### 4. **Obtener Estadísticas de Proyectos**

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

### 5. **Obtener Proyectos por Cliente**

```http
GET /projects/client/:clientId?activeOnly=true
```

---

### 6. **Obtener Proyecto por ID**

```http
GET /projects/:id
```

---

### 7. **Obtener Proyecto por Código**

```http
GET /projects/code/:code
```

---

### 8. **Actualizar Proyecto**

```http
PATCH /projects/:id
Content-Type: application/json
```

---

### 9. **Actualizar Estado del Proyecto**

```http
PATCH /projects/:id/status
Content-Type: application/json
```

**Payload:**

```json
{
  "status": "ACTIVE"
}
```

**Estados válidos:** `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`

---

### 10. **Activar/Desactivar Proyecto**

```http
PATCH /projects/:id/toggle-active
```

---

### 11. **Eliminar Proyecto**

```http
DELETE /projects/:id
```

---

## 📡 Endpoints de Gastos Diarios

### 1. **Crear Gasto Diario**

```http
POST /daily-expenses
Content-Type: application/json
```

**Payload:**

```json
{
  "title": "Trabajo en sitio - Proyecto ABC",
  "date": "2024-01-15T00:00:00.000Z",
  "observations": [
    {
      "description": "Clima favorable, trabajo sin interrupciones",
      "notes": "Condiciones ideales para el trabajo",
      "observationDate": "2024-01-15T00:00:00.000Z",
      "observationTime": "08:30",
      "documents": []
    },
    {
      "description": "Problema con el suministro eléctrico",
      "notes": "Se resolvió rápidamente",
      "observationDate": "2024-01-15T00:00:00.000Z",
      "observationTime": "14:15",
      "documents": ["https://ejemplo.com/foto-problema.jpg"]
    }
  ],
  "purchases": [
    {
      "description": "Taxi al sitio de trabajo",
      "amount": 25.5,
      "categoryId": "507f1f77bcf86cd799439011",
      "notes": "Viaje de ida y vuelta",
      "vendor": "Taxi Express",
      "purchaseDate": "2024-01-15T08:30:00.000Z"
    },
    {
      "description": "Almuerzo",
      "amount": 15.0,
      "categoryId": "507f1f77bcf86cd799439012",
      "vendor": "Restaurante El Buen Sabor"
    }
  ],
  "dailySummary": "Instalación de sistema eléctrico en planta baja. Se completó el 60% del trabajo planificado.",
  "userId": "507f1f77bcf86cd799439012",
  "projectId": "507f1f77bcf86cd799439013",
  "status": "DRAFT"
}
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "title": "Trabajo en sitio - Proyecto ABC",
  "date": "2024-01-15T00:00:00.000Z",
  "observations": [
    {
      "description": "Clima favorable, trabajo sin interrupciones",
      "notes": "Condiciones ideales para el trabajo",
      "observationDate": "2024-01-15T00:00:00.000Z",
      "observationTime": "08:30",
      "documents": []
    },
    {
      "description": "Problema con el suministro eléctrico",
      "notes": "Se resolvió rápidamente",
      "observationDate": "2024-01-15T00:00:00.000Z",
      "observationTime": "14:15",
      "documents": ["https://ejemplo.com/foto-problema.jpg"]
    }
  ],
  "purchases": [
    {
      "description": "Taxi al sitio de trabajo",
      "amount": 25.5,
      "categoryId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Transporte",
        "code": "TRANS",
        "color": "#3B82F6"
      },
      "notes": "Viaje de ida y vuelta",
      "vendor": "Taxi Express",
      "purchaseDate": "2024-01-15T08:30:00.000Z"
    }
  ],
  "totalAmount": 40.5,
  "dailySummary": "Instalación de sistema eléctrico en planta baja. Se completó el 60% del trabajo planificado.",
  "userId": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Juan Pérez",
    "email": "juan.perez@empresa.com"
  },
  "projectId": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Instalación Sistema Eléctrico",
    "code": "PROJ-2024-001",
    "clientId": "507f1f77bcf86cd799439020"
  },
  "status": "DRAFT",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. **Obtener Todos los Gastos Diarios**

```http
GET /daily-expenses
GET /daily-expenses?userId=507f1f77bcf86cd799439012&projectId=507f1f77bcf86cd799439013&status=DRAFT&startDate=2024-01-01&endDate=2024-01-31&q=taxi
```

**Query Parameters:**

- `userId` (opcional): Filtrar por usuario
- `projectId` (opcional): Filtrar por proyecto
- `status` (opcional): Filtrar por estado
- `startDate` (opcional): Fecha de inicio
- `endDate` (opcional): Fecha de fin
- `q` (opcional): Búsqueda en título, observaciones, resumen, descripción de compras

---

### 3. **Obtener Estadísticas de Gastos**

```http
GET /daily-expenses/stats?userId=507f1f77bcf86cd799439012&projectId=507f1f77bcf86cd799439013&startDate=2024-01-01&endDate=2024-01-31
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

### 4. **Obtener Gastos por Usuario**

```http
GET /daily-expenses/user/:userId?startDate=2024-01-01&endDate=2024-01-31
```

---

### 5. **Obtener Gastos por Proyecto**

```http
GET /daily-expenses/project/:projectId?startDate=2024-01-01&endDate=2024-01-31
```

---

### 6. **Obtener Gasto Diario por ID**

```http
GET /daily-expenses/:id
```

---

### 7. **Actualizar Gasto Diario**

```http
PATCH /daily-expenses/:id
Content-Type: application/json
```

**Nota:** Solo se pueden editar gastos en estado `DRAFT` y solo por el propietario.

---

### 8. **Enviar para Aprobación**

```http
PATCH /daily-expenses/:id/submit
```

**Nota:** Cambia el estado de `DRAFT` a `SUBMITTED`.

---

### 9. **Aprobar o Rechazar Gasto**

```http
PATCH /daily-expenses/:id/approve
Content-Type: application/json
```

**Payload:**

```json
{
  "status": "APPROVED"
}
```

**O para rechazar:**

```json
{
  "status": "REJECTED",
  "rejectionReason": "Montos excesivos sin justificación"
}
```

---

### 10. **Eliminar Gasto Diario**

```http
DELETE /daily-expenses/:id
```

**Nota:** Solo se pueden eliminar gastos en estado `DRAFT` y solo por el propietario.

---

## ✅ Validaciones de Campos

### **Campos Obligatorios de Categoría:**

| Campo         | Tipo   | Validación             |
| ------------- | ------ | ---------------------- |
| `name`        | String | 2-50 caracteres        |
| `description` | String | 5-200 caracteres       |
| `code`        | String | 2-10 caracteres, único |

### **Campos Obligatorios de Proyecto:**

| Campo         | Tipo     | Validación             |
| ------------- | -------- | ---------------------- |
| `name`        | String   | 2-100 caracteres       |
| `description` | String   | 10-500 caracteres      |
| `code`        | String   | 2-20 caracteres, único |
| `clientId`    | ObjectId | Debe existir           |
| `startDate`   | Date     | Fecha válida           |

### **Campos Obligatorios de Gasto Diario:**

| Campo          | Tipo     | Validación         |
| -------------- | -------- | ------------------ |
| `title`        | String   | 5-100 caracteres   |
| `date`         | Date     | Fecha válida       |
| `purchases`    | Array    | Al menos 1 compra  |
| `dailySummary` | String   | 10-2000 caracteres |
| `userId`       | ObjectId | Debe existir       |
| `projectId`    | ObjectId | Debe existir       |

### **Validaciones de Observación:**

| Campo             | Tipo   | Validación               |
| ----------------- | ------ | ------------------------ |
| `description`     | String | 5-500 caracteres         |
| `notes`           | String | Máximo 1000 caracteres   |
| `observationDate` | Date   | Fecha válida (opcional)  |
| `observationTime` | String | Formato HH:mm (opcional) |
| `documents`       | Array  | URLs válidas (opcional)  |

### **Validaciones de Compra:**

| Campo         | Tipo     | Validación       |
| ------------- | -------- | ---------------- |
| `description` | String   | 5-200 caracteres |
| `amount`      | Number   | ≥ 0              |
| `categoryId`  | ObjectId | Debe existir     |

---

## 🔄 Estados del Sistema

### **Estados de Proyecto:**

- `PLANNING`: En planificación
- `ACTIVE`: Activo
- `ON_HOLD`: En pausa
- `COMPLETED`: Completado
- `CANCELLED`: Cancelado

### **Estados de Gasto Diario:**

- `DRAFT`: Borrador (editable)
- `SUBMITTED`: Enviado para aprobación
- `APPROVED`: Aprobado
- `REJECTED`: Rechazado

---

## 🚀 Flujo de Trabajo Recomendado

### **1. Configuración Inicial:**

1. Crear categorías de gastos: `POST /expense-categories`
2. Crear proyectos: `POST /projects`

### **2. Trabajo Diario:**

1. Crear gasto diario: `POST /daily-expenses`
2. Agregar compras con categorías
3. Escribir resumen del día

### **3. Aprobación:**

1. Enviar para aprobación: `PATCH /daily-expenses/:id/submit`
2. Aprobar/rechazar: `PATCH /daily-expenses/:id/approve`

### **4. Reportes:**

1. Ver estadísticas: `GET /daily-expenses/stats`
2. Filtrar por usuario/proyecto/fecha

---

## 🔍 Características de Búsqueda

### **Búsqueda de Proyectos:**

- `name`: Nombre del proyecto
- `description`: Descripción
- `code`: Código del proyecto
- `location`: Ubicación

### **Búsqueda de Gastos Diarios:**

- `title`: Título del reporte
- `observations`: Observaciones
- `dailySummary`: Resumen del día
- `purchases.description`: Descripción de compras
- `purchases.vendor`: Proveedor

---

## 📊 Optimizaciones para Consultas Rápidas

### **Índices Implementados:**

- **Categorías**: `code`, `isActive + sortOrder`, `name`
- **Proyectos**: `clientId + isActive`, `code`, `status + isActive`, `startDate`, `name`, `createdAt`
- **Gastos Diarios**: `userId + date`, `projectId + date`, `date`, `status + date`, `userId + status`, `projectId + status`, `createdAt`

### **Populate Optimizado:**

- Datos relacionados se cargan automáticamente
- Información completa en una sola consulta
- Reducción de llamadas a la base de datos

---

## 🚨 Códigos de Error

- `400 Bad Request`: Datos de entrada inválidos
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: Sin permisos para la acción
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Conflicto (código duplicado, etc.)
- `500 Internal Server Error`: Error del servidor

---

## 📝 Notas Importantes

1. **Cálculo Automático**: El total de gastos se calcula automáticamente
2. **Validación Jerárquica**: Proyectos deben estar relacionados con clientes válidos
3. **Control de Acceso**: Solo el propietario puede editar gastos en estado DRAFT
4. **Flujo de Aprobación**: Estados controlados para evitar modificaciones no autorizadas
5. **Datos Precargados**: Categorías por defecto se crean automáticamente
6. **Búsqueda Inteligente**: Múltiples campos de búsqueda en una sola consulta
7. **Estadísticas en Tiempo Real**: Cálculos automáticos de totales y promedios
8. **Escalabilidad**: Índices optimizados para consultas rápidas
9. **Observaciones con Hora**: Las observaciones pueden incluir hora específica (formato HH:mm) para mejor seguimiento temporal
10. **Observaciones Múltiples**: Cada gasto diario puede tener múltiples observaciones con fechas y horas independientes

---

## 🎯 Categorías por Defecto

El sistema incluye automáticamente estas categorías:

- **Transporte** (TRANS) - Gastos de movilidad
- **Alimentación** (FOOD) - Comida y bebida
- **Hospedaje** (HOTEL) - Alojamiento
- **Materiales** (MAT) - Suministros
- **Herramientas** (TOOLS) - Equipos
- **Comunicaciones** (COMM) - Teléfono/internet
- **Otros** (OTHER) - Gastos varios
