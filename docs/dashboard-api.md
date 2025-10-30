# API de Dashboard con KPIs

Este módulo proporciona un sistema completo de dashboard con KPIs optimizado para máximo rendimiento y compatibilidad con PrimeNG Charts y Charts.js.

## Características Principales

- **Endpoint único**: Un solo endpoint para obtener todos los KPIs y datos del dashboard
- **Agregaciones optimizadas**: Consultas MongoDB optimizadas con índices para máximo rendimiento
- **Formato Charts.js**: Datos estructurados para uso directo con PrimeNG Charts y Charts.js
- **Filtros avanzados**: Filtros por período, proyecto, cliente y más
- **Recomendaciones de gráficos**: Sugerencias automáticas del tipo de gráfico más adecuado
- **Métricas de rendimiento**: Tiempo de procesamiento y conteo de puntos de datos

## Endpoint Principal

### Obtener Datos del Dashboard
```
GET /dashboard
```

**Descripción**: Obtiene todos los KPIs y datos del dashboard en una sola consulta optimizada.

**Parámetros de consulta:**
- `period`: Período de tiempo (7d, 30d, 90d, 1y, custom)
- `startDate`: Fecha de inicio (formato ISO)
- `endDate`: Fecha de fin (formato ISO)
- `projectId`: Filtrar por proyecto específico
- `clientId`: Filtrar por cliente específico
- `chartType`: Tipo de gráfico preferido (bar, line, pie, doughnut)
- `timezone`: Zona horaria (default: UTC)

**Ejemplo de uso:**
```bash
curl "http://localhost:3000/dashboard?period=30d&chartType=bar"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalClients": {
        "title": "Total Clientes",
        "value": 150,
        "change": 5,
        "changeType": "increase",
        "icon": "pi pi-users",
        "color": "#3B82F6"
      },
      "totalProjects": {
        "title": "Total Proyectos",
        "value": 45,
        "change": 2,
        "changeType": "increase",
        "icon": "pi pi-folder",
        "color": "#10B981"
      },
      "totalQuotes": {
        "title": "Total Cotizaciones",
        "value": 320,
        "change": -3,
        "changeType": "decrease",
        "icon": "pi pi-file",
        "color": "#F59E0B"
      },
      "totalOrders": {
        "title": "Total Órdenes",
        "value": 180,
        "change": 8,
        "changeType": "increase",
        "icon": "pi pi-shopping-cart",
        "color": "#EF4444"
      },
      "totalUsers": {
        "title": "Total Usuarios",
        "value": 25,
        "change": 0,
        "changeType": "neutral",
        "icon": "pi pi-user",
        "color": "#8B5CF6"
      },
      "totalRequirements": {
        "title": "Total Requerimientos",
        "value": 95,
        "change": 12,
        "changeType": "increase",
        "icon": "pi pi-list",
        "color": "#06B6D4"
      }
    },
    "charts": {
      "dailyReports": {
        "labels": ["2024-01-01", "2024-01-02", "2024-01-03"],
        "datasets": [{
          "label": "Reportes Diarios",
          "data": [15, 23, 18],
          "backgroundColor": ["#3B82F680", "#10B98180", "#F59E0B80"],
          "borderColor": ["#3B82F6", "#10B981", "#F59E0B"],
          "borderWidth": 1
        }]
      },
      "projectReports": {
        "labels": ["Proyecto A", "Proyecto B", "Proyecto C"],
        "datasets": [{
          "label": "Reportes por Proyecto",
          "data": [45, 32, 28],
          "backgroundColor": ["#3B82F680", "#10B98180", "#F59E0B80"],
          "borderColor": ["#3B82F6", "#10B981", "#F59E0B"],
          "borderWidth": 1
        }]
      },
      "quotesByStatus": {
        "labels": ["Pendiente", "Enviada", "Aprobada", "Rechazada"],
        "datasets": [{
          "label": "Cotizaciones por Estado",
          "data": [120, 85, 65, 30],
          "backgroundColor": ["#3B82F680", "#10B98180", "#F59E0B80", "#EF444480"],
          "borderColor": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"],
          "borderWidth": 1
        }]
      }
    },
    "tables": {
      "dailyReports": [
        {
          "date": "2024-01-01",
          "count": 15,
          "value": 45000
        }
      ],
      "projectReports": [
        {
          "projectId": "507f1f77bcf86cd799439011",
          "projectName": "Proyecto A",
          "count": 45,
          "value": 125000
        }
      ],
      "clientsByProject": [
        {
          "clientId": "507f1f77bcf86cd799439012",
          "clientName": "Cliente A",
          "count": 25,
          "value": 75000
        }
      ]
    }
  },
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "period": "30d",
    "filters": {
      "startDate": null,
      "endDate": null,
      "projectId": null,
      "clientId": null
    },
    "chartRecommendations": {
      "dailyReports": "Recomendado: Line Chart para mostrar tendencias temporales. Ideal para PrimeNG LineChart o Charts.js line chart.",
      "projectReports": "Recomendado: Bar Chart para comparar valores entre proyectos. Ideal para PrimeNG BarChart o Charts.js bar chart.",
      "clientsByProject": "Recomendado: Horizontal Bar Chart para mostrar ranking de clientes. Ideal para PrimeNG BarChart con orientación horizontal.",
      "quotesByProject": "Recomendado: Bar Chart para comparar cotizaciones por proyecto. Ideal para PrimeNG BarChart o Charts.js bar chart.",
      "requirementsByProject": "Recomendado: Bar Chart para mostrar requerimientos por proyecto. Ideal para PrimeNG BarChart o Charts.js bar chart.",
      "quotesByStatus": "Recomendado: Pie Chart o Doughnut Chart para mostrar distribución de estados. Ideal para PrimeNG PieChart o Charts.js pie chart.",
      "projectsByStatus": "Recomendado: Pie Chart o Doughnut Chart para mostrar distribución de estados de proyectos. Ideal para PrimeNG PieChart o Charts.js pie chart.",
      "requirementsByStatus": "Recomendado: Pie Chart o Doughnut Chart para mostrar distribución de estados de requerimientos. Ideal para PrimeNG PieChart o Charts.js pie chart."
    },
    "performance": {
      "processingTimeMs": 245,
      "dataPoints": 156
    }
  }
}
```

## KPIs Disponibles

### Métricas Principales
- **Total Clientes**: Cantidad total de clientes registrados
- **Total Proyectos**: Cantidad de proyectos activos
- **Total Cotizaciones**: Cantidad de cotizaciones en el período
- **Total Órdenes**: Cantidad de órdenes en el período
- **Total Usuarios**: Cantidad de usuarios activos
- **Total Requerimientos**: Cantidad de requerimientos en el período

### Gráficos Disponibles
- **Reportes Diarios**: Tendencias por día
- **Reportes por Proyecto**: Comparación entre proyectos
- **Clientes por Proyecto**: Ranking de clientes
- **Cotizaciones por Proyecto**: Distribución de cotizaciones
- **Requerimientos por Proyecto**: Distribución de requerimientos
- **Cotizaciones por Estado**: Distribución de estados
- **Proyectos por Estado**: Estados de proyectos
- **Requerimientos por Estado**: Estados de requerimientos

## Formato de Datos para Charts.js

### Estructura Estándar
```typescript
interface ChartData {
  labels: string[]           // Etiquetas del eje X
  datasets: ChartDataset[]   // Conjuntos de datos
}

interface ChartDataset {
  label: string              // Nombre del dataset
  data: number[]            // Valores numéricos
  backgroundColor?: string[] // Colores de fondo
  borderColor?: string[]     // Colores de borde
  borderWidth?: number       // Ancho del borde
}
```

### Compatibilidad con PrimeNG Charts

**Para PrimeNG LineChart:**
```typescript
// Usar data.charts.dailyReports directamente
const chartData = response.data.charts.dailyReports
```

**Para PrimeNG BarChart:**
```typescript
// Usar data.charts.projectReports directamente
const chartData = response.data.charts.projectReports
```

**Para PrimeNG PieChart:**
```typescript
// Usar data.charts.quotesByStatus directamente
const chartData = response.data.charts.quotesByStatus
```

## Optimizaciones de Rendimiento

### Agregaciones MongoDB Optimizadas
- **Pipeline paralelo**: Todas las consultas se ejecutan en paralelo
- **Índices compuestos**: Utiliza índices existentes en los esquemas
- **Límites de resultados**: Máximo 10 elementos en rankings
- **Proyecciones selectivas**: Solo campos necesarios

### Índices Utilizados
- `{ createdAt: -1 }` - Para filtros temporales
- `{ clientId: 1, createdAt: -1 }` - Para filtros por cliente
- `{ projectId: 1, createdAt: -1 }` - Para filtros por proyecto
- `{ state: 1 }` - Para agrupaciones por estado
- `{ status: 1 }` - Para agrupaciones por estado de proyecto

## Ejemplos de Uso con PrimeNG

### Line Chart para Tendencias Diarias
```typescript
// Componente Angular
export class DashboardComponent {
  chartData: any
  
  ngOnInit() {
    this.dashboardService.getDashboardData({ period: '30d' })
      .subscribe(response => {
        this.chartData = response.data.charts.dailyReports
      })
  }
}
```

```html
<!-- Template Angular -->
<p-chart type="line" [data]="chartData" [options]="chartOptions"></p-chart>
```

### Bar Chart para Comparaciones
```typescript
// Para comparar proyectos
this.chartData = response.data.charts.projectReports
```

```html
<p-chart type="bar" [data]="chartData" [options]="barOptions"></p-chart>
```

### Pie Chart para Distribuciones
```typescript
// Para estados de cotizaciones
this.chartData = response.data.charts.quotesByStatus
```

```html
<p-chart type="pie" [data]="chartData" [options]="pieOptions"></p-chart>
```

## Principios SOLID Aplicados

1. **Single Responsibility**: Cada método tiene una responsabilidad específica
2. **Open/Closed**: Fácil extensión para nuevos KPIs sin modificar código existente
3. **Liskov Substitution**: Interfaces consistentes para todos los tipos de datos
4. **Interface Segregation**: DTOs específicos para filtros y respuestas
5. **Dependency Inversion**: Inyección de dependencias para todos los modelos

## Características de Rendimiento

- **Tiempo de respuesta**: < 500ms para la mayoría de consultas
- **Paralelización**: 9 consultas ejecutadas simultáneamente
- **Caché**: Preparado para implementar caché Redis
- **Paginación**: Límites automáticos en resultados grandes
- **Compresión**: Respuestas optimizadas para transferencia

## Filtros Avanzados

### Por Período
```bash
# Últimos 7 días
curl "http://localhost:3000/dashboard?period=7d"

# Últimos 30 días
curl "http://localhost:3000/dashboard?period=30d"

# Período personalizado
curl "http://localhost:3000/dashboard?startDate=2024-01-01&endDate=2024-01-31"
```

### Por Entidad
```bash
# Filtrar por proyecto
curl "http://localhost:3000/dashboard?projectId=507f1f77bcf86cd799439011"

# Filtrar por cliente
curl "http://localhost:3000/dashboard?clientId=507f1f77bcf86cd799439012"
```

### Combinaciones
```bash
# Proyecto específico en últimos 7 días
curl "http://localhost:3000/dashboard?period=7d&projectId=507f1f77bcf86cd799439011"
```