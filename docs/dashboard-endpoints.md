# Documentación de Endpoints - Dashboard

## Descripción General

El módulo de Dashboard proporciona información agregada y reportes de diferentes módulos del sistema. Incluye KPIs, gráficos, tablas y reportes de horas (solo para rol gerencia).

## Autenticación

Todos los endpoints requieren autenticación mediante JWT Bearer Token:

```http
Authorization: Bearer <token>
X-Tenant-Id: <company_id> (opcional para gerencia)
```

**Nota:** El header `X-Tenant-Id` es opcional para usuarios con rol `gerencia`. Si no se proporciona, se muestran datos agregados de todas las empresas.

## Endpoints

### 1. Obtener Datos del Dashboard

**GET** `/dashboard`

Obtiene datos agregados del dashboard incluyendo KPIs, gráficos y tablas según los filtros proporcionados.

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `X-Tenant-Id: <company_id>` (opcional para gerencia, requerido para otros roles)

**Query Parameters (todos opcionales):**
- `period` (enum): Período de tiempo - `7d`, `30d`, `90d`, `1y`, `custom` (default: `30d`)
- `startDate` (string): Fecha de inicio (formato ISO) - requerido si `period=custom`
- `endDate` (string): Fecha de fin (formato ISO) - requerido si `period=custom`
- `projectId` (string): ID del proyecto para filtrar
- `clientId` (string): ID del cliente para filtrar
- `tenantId` (string): ID de empresa/tenant para filtrar (solo para rol gerencia)
- `companyId` (string): Alias de tenantId (se mapea a tenantId)
- `chartType` (enum): Tipo de gráfico preferido - `bar`, `line`, `pie`, `doughnut` (default: `bar`)
- `timezone` (string): Zona horaria (default: `UTC`)

**Ejemplo:**
```
GET /dashboard?period=30d&projectId=507f1f77bcf86cd799439012
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalClients": {
        "title": "Total Clientes",
        "value": 150,
        "change": 5,
        "changeType": "increase"
      },
      "totalProjects": {
        "title": "Total Proyectos",
        "value": 45,
        "change": 2,
        "changeType": "increase"
      },
      "totalQuotes": {
        "title": "Total Cotizaciones",
        "value": 320,
        "change": -10,
        "changeType": "decrease"
      },
      "totalOrders": {
        "title": "Total Órdenes",
        "value": 180,
        "change": 15,
        "changeType": "increase"
      },
      "totalUsers": {
        "title": "Total Usuarios",
        "value": 25,
        "change": 0,
        "changeType": "neutral"
      },
      "totalRequirements": {
        "title": "Total Requerimientos",
        "value": 95,
        "change": 8,
        "changeType": "increase"
      }
    },
    "charts": {
      "dailyReports": {
        "labels": ["2024-01-01", "2024-01-02", "2024-01-03"],
        "datasets": [
          {
            "label": "Reportes Diarios",
            "data": [10, 15, 12]
          }
        ]
      },
      "projectReports": {
        "labels": ["Proyecto A", "Proyecto B", "Proyecto C"],
        "datasets": [
          {
            "label": "Reportes por Proyecto",
            "data": [25, 30, 20]
          }
        ]
      },
      "quotesByStatus": {
        "labels": ["Pendiente", "Aprobada", "Rechazada"],
        "datasets": [
          {
            "label": "Cotizaciones por Estado",
            "data": [50, 200, 70]
          }
        ]
      }
    },
    "tables": {
      "dailyReports": [
        {
          "date": "2024-01-01",
          "count": 10
        }
      ],
      "projectReports": [
        {
          "projectId": "507f1f77bcf86cd799439012",
          "projectName": "Proyecto Alpha",
          "count": 25
        }
      ]
    }
  },
  "metadata": {
    "generatedAt": "2024-01-15T10:00:00.000Z",
    "period": "30d",
    "filters": {
      "startDate": "2023-12-16T00:00:00.000Z",
      "endDate": "2024-01-15T23:59:59.999Z",
      "projectId": "507f1f77bcf86cd799439012",
      "tenantId": "507f1f77bcf86cd799439011"
    },
    "chartRecommendations": {
      "dailyReports": "Recomendado: Line Chart para mostrar tendencias temporales...",
      "projectReports": "Recomendado: Bar Chart para comparar valores entre proyectos..."
    },
    "performance": {
      "processingTimeMs": 245,
      "dataPoints": 150
    }
  }
}
```

**Errores:**
- `400`: El tenantId proporcionado no es un ObjectId válido
- `404`: La empresa especificada no existe o está inactiva

---

### 2. Obtener Detalle de Marcaciones de Hora (Solo Gerencia)

**GET** `/dashboard/time-tracking/details`

Obtiene todas las marcaciones de hora con detalles completos. **Solo disponible para usuarios con rol `gerencia`**.

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `X-Tenant-Id: <company_id>` (opcional - si no se proporciona, muestra todas las empresas)

**Query Parameters (todos opcionales):**
- `period` (enum): Período de tiempo - `7d`, `30d`, `90d`, `1y`, `custom` (default: `30d`)
- `startDate` (string): Fecha de inicio (formato ISO)
- `endDate` (string): Fecha de fin (formato ISO)
- `projectId` (string): ID del proyecto para filtrar
- `userId` (string): ID del usuario para filtrar
- `tenantId` (string): ID de empresa/tenant para filtrar
- `companyId` (string): Alias de tenantId

**Ejemplo:**
```
GET /dashboard/time-tracking/details?period=30d&projectId=507f1f77bcf86cd799439012&userId=507f1f77bcf86cd799439011
```

**Respuesta Exitosa (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "date": "2024-01-15T09:00:00.000Z",
    "type": "INGRESO",
    "location": {
      "latitude": -34.603722,
      "longitude": -58.381592
    },
    "userId": "507f1f77bcf86cd799439011",
    "projectId": "507f1f77bcf86cd799439012",
    "attendanceRecordId": "507f1f77bcf86cd799439013",
    "createdAt": "2024-01-15T09:00:00.000Z",
    "user": {
      "name": "Juan Pérez",
      "email": "juan@example.com"
    },
    "project": {
      "name": "Proyecto Alpha",
      "code": "PROJ-001"
    }
  },
  {
    "_id": "507f1f77bcf86cd799439015",
    "date": "2024-01-15T17:00:00.000Z",
    "type": "SALIDA",
    "location": {
      "latitude": -34.603722,
      "longitude": -58.381592
    },
    "userId": "507f1f77bcf86cd799439011",
    "projectId": "507f1f77bcf86cd799439012",
    "attendanceRecordId": "507f1f77bcf86cd799439016",
    "createdAt": "2024-01-15T17:00:00.000Z",
    "user": {
      "name": "Juan Pérez",
      "email": "juan@example.com"
    },
    "project": {
      "name": "Proyecto Alpha",
      "code": "PROJ-001"
    }
  }
]
```

**Errores:**
- `403`: Solo usuarios con rol de gerencia pueden acceder a los reportes de horas
- `400`: El tenantId proporcionado no es un ObjectId válido
- `404`: La empresa especificada no existe o está inactiva

---

### 3. Obtener Marcaciones por Usuario (Solo Gerencia)

**GET** `/dashboard/time-tracking/by-user`

Obtiene un resumen de marcaciones agrupadas por usuario con contadores de ingresos y salidas. **Solo disponible para usuarios con rol `gerencia`**.

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `X-Tenant-Id: <company_id>` (opcional - si no se proporciona, muestra todas las empresas)

**Query Parameters (todos opcionales):**
- `period` (enum): Período de tiempo - `7d`, `30d`, `90d`, `1y`, `custom` (default: `30d`)
- `startDate` (string): Fecha de inicio (formato ISO)
- `endDate` (string): Fecha de fin (formato ISO)
- `projectId` (string): ID del proyecto para filtrar
- `tenantId` (string): ID de empresa/tenant para filtrar
- `companyId` (string): Alias de tenantId

**Ejemplo:**
```
GET /dashboard/time-tracking/by-user?period=30d&projectId=507f1f77bcf86cd799439012
```

**Respuesta Exitosa (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userName": "Juan Pérez",
    "userEmail": "juan@example.com",
    "totalMarcaciones": 60,
    "ingresos": 30,
    "salidas": 30
  },
  {
    "_id": "507f1f77bcf86cd799439017",
    "userName": "María García",
    "userEmail": "maria@example.com",
    "totalMarcaciones": 58,
    "ingresos": 29,
    "salidas": 29
  },
  {
    "_id": "507f1f77bcf86cd799439018",
    "userName": "Carlos López",
    "userEmail": "carlos@example.com",
    "totalMarcaciones": 55,
    "ingresos": 28,
    "salidas": 27
  }
]
```

**Campos de Respuesta:**
- `_id` (string): ID del usuario
- `userName` (string): Nombre del usuario
- `userEmail` (string): Email del usuario
- `totalMarcaciones` (number): Total de marcaciones del usuario en el período
- `ingresos` (number): Cantidad de marcaciones de tipo INGRESO
- `salidas` (number): Cantidad de marcaciones de tipo SALIDA

**Errores:**
- `403`: Solo usuarios con rol de gerencia pueden acceder a los reportes de horas
- `400`: El tenantId proporcionado no es un ObjectId válido
- `404`: La empresa especificada no existe o está inactiva

---

## Períodos Disponibles

- `7d`: Últimos 7 días
- `30d`: Últimos 30 días (default)
- `90d`: Últimos 90 días
- `1y`: Último año
- `custom`: Período personalizado (requiere `startDate` y `endDate`)

---

## Filtros del Dashboard

Todos los endpoints del dashboard respetan los siguientes filtros:

1. **Período de Tiempo**: Se puede especificar mediante `period` o `startDate`/`endDate`
2. **Proyecto**: Filtrar por `projectId`
3. **Cliente**: Filtrar por `clientId` (solo en endpoint principal)
4. **Usuario**: Filtrar por `userId` (solo en reportes de horas)
5. **Empresa/Tenant**: Filtrar por `tenantId` o `companyId` (solo para gerencia)

---

## Roles y Permisos

### Rol: Gerencia
- Acceso completo a todos los endpoints
- Puede ver datos de todas las empresas (si no se especifica `tenantId`)
- Puede filtrar por empresa específica usando `tenantId` o `companyId`
- Acceso exclusivo a reportes de horas (`/dashboard/time-tracking/*`)

### Otros Roles
- Acceso solo al endpoint principal `/dashboard`
- Solo pueden ver datos de su propia empresa (definida por `X-Tenant-Id`)
- No pueden acceder a reportes de horas

---

## Ejemplos de Uso

### Obtener Dashboard General

```bash
curl -X GET "http://localhost:3027/dashboard?period=30d" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: 507f1f77bcf86cd799439011"
```

### Obtener Dashboard con Filtros

```bash
curl -X GET "http://localhost:3027/dashboard?period=30d&projectId=507f1f77bcf86cd799439012&clientId=507f1f77bcf86cd799439019" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: 507f1f77bcf86cd799439011"
```

### Obtener Detalle de Marcaciones (Gerencia)

```bash
curl -X GET "http://localhost:3027/dashboard/time-tracking/details?period=30d&projectId=507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer <token>"
```

### Obtener Marcaciones por Usuario (Gerencia)

```bash
curl -X GET "http://localhost:3027/dashboard/time-tracking/by-user?period=30d" \
  -H "Authorization: Bearer <token>"
```

### Obtener Dashboard de Empresa Específica (Gerencia)

```bash
curl -X GET "http://localhost:3027/dashboard?period=30d&tenantId=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>"
```

---

## Notas Importantes

1. **Multi-tenancy**: El dashboard respeta el sistema multi-tenant. Los usuarios normales solo ven datos de su empresa, mientras que gerencia puede ver todas las empresas.

2. **Performance**: Los endpoints del dashboard están optimizados con agregaciones de MongoDB para máximo rendimiento.

3. **Reportes de Horas**: Los endpoints de reportes de horas (`/dashboard/time-tracking/*`) están disponibles exclusivamente para usuarios con rol `gerencia`.

4. **Filtros Combinados**: Todos los filtros pueden combinarse para obtener reportes más específicos.

5. **Ordenamiento**: 
   - Las marcaciones se ordenan por fecha descendente (más recientes primero)
   - Los reportes por usuario se ordenan por total de marcaciones descendente

