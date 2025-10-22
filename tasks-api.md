# API de Gestión de Tareas (Kanban)

Este módulo proporciona un sistema completo de gestión de tareas tipo Kanban con funcionalidades avanzadas para seguimiento, asignación y colaboración.

## Características Principales

- **Estados Kanban**: Pendiente, En curso, Terminada
- **Prioridades**: Baja, Media, Alta, Crítica
- **Asignación de usuarios**: Cada tarea puede ser asignada a un usuario específico
- **Información/Observaciones**: Múltiples entradas de información por tarea
- **Archivos adjuntos**: Soporte para archivos tanto en tareas como en información
- **Categorización**: Tags y categorías para organización
- **Progreso**: Seguimiento de progreso porcentual
- **Fechas**: Fechas de vencimiento, inicio y finalización
- **Integración**: Con proyectos y clientes existentes

## Endpoints Disponibles

### Tareas Principales

#### Crear Tarea

```
POST /tasks
```

**Descripción**: Crea una nueva tarea en el sistema con toda la información necesaria para su gestión y seguimiento.

**Body:**

```json
{
  "title": "Implementar nueva funcionalidad",
  "description": "Descripción detallada de la tarea",
  "assignedTo": "507f1f77bcf86cd799439011",
  "createdBy": "507f1f77bcf86cd799439012",
  "priority": "Alta",
  "dueDate": "2024-02-15T00:00:00.000Z",
  "tags": ["desarrollo", "frontend"],
  "category": "Desarrollo",
  "projectId": "507f1f77bcf86cd799439013",
  "clientId": "507f1f77bcf86cd799439014"
}
```

**Ejemplo de uso:**

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implementar nueva funcionalidad",
    "description": "Desarrollar la funcionalidad de notificaciones push",
    "assignedTo": "507f1f77bcf86cd799439011",
    "createdBy": "507f1f77bcf86cd799439012",
    "priority": "Alta",
    "dueDate": "2024-02-15T00:00:00.000Z",
    "tags": ["desarrollo", "frontend", "notificaciones"],
    "category": "Desarrollo",
    "projectId": "507f1f77bcf86cd799439013",
    "clientId": "507f1f77bcf86cd799439014"
  }'
```

#### Obtener Todas las Tareas

```
GET /tasks
```

**Descripción**: Obtiene una lista paginada de tareas con filtros avanzados para búsqueda y organización.

**Parámetros de consulta:**

- `q`: Búsqueda general por texto
- `status`: Filtrar por estado (Pendiente, En curso, Terminada)
- `priority`: Filtrar por prioridad (Baja, Media, Alta, Crítica)
- `assignedTo`: Filtrar por usuario asignado
- `createdBy`: Filtrar por usuario creador
- `projectId`: Filtrar por proyecto
- `clientId`: Filtrar por cliente
- `category`: Filtrar por categoría
- `tags`: Filtrar por tags
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `sortBy`: Campo para ordenar
- `sortOrder`: Orden (asc/desc)

**Ejemplo de uso:**

```bash
curl "http://localhost:3000/tasks?status=Pendiente&priority=Alta&assignedTo=507f1f77bcf86cd799439011&page=1&limit=10"
```

#### Obtener Tarea por ID

```
GET /tasks/:id
```

**Descripción**: Obtiene los detalles completos de una tarea específica incluyendo información, archivos adjuntos y datos poblados de usuarios.

**Ejemplo de uso:**

```bash
curl http://localhost:3000/tasks/507f1f77bcf86cd799439015
```

#### Actualizar Tarea

```
PATCH /tasks/:id
```

**Descripción**: Actualiza los campos de una tarea existente, permitiendo modificar cualquier propiedad excepto el ID.

**Ejemplo de uso:**

```bash
curl -X PATCH http://localhost:3000/tasks/507f1f77bcf86cd799439015 \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 75,
    "description": "Funcionalidad implementada, pendiente de pruebas"
  }'
```

#### Actualizar Estado de Tarea

```
PATCH /tasks/:id/status
```

**Descripción**: Cambia el estado de una tarea y automáticamente gestiona fechas relacionadas (startDate, completedDate) y progreso.

**Body:**

```json
{
  "status": "En curso",
  "note": "Iniciando trabajo en la tarea"
}
```

**Ejemplo de uso:**

```bash
curl -X PATCH http://localhost:3000/tasks/507f1f77bcf86cd799439015/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "En curso",
    "note": "Iniciando el desarrollo de la funcionalidad"
  }'
```

#### Eliminar Tarea

```
DELETE /tasks/:id
```

**Descripción**: Elimina permanentemente una tarea del sistema.

**Ejemplo de uso:**

```bash
curl -X DELETE http://localhost:3000/tasks/507f1f77bcf86cd799439015
```

### Vista Kanban

#### Obtener Tablero Kanban

```
GET /tasks/kanban
```

**Descripción**: Obtiene todas las tareas organizadas por estado para crear una vista de tablero Kanban.

Retorna las tareas organizadas por estado:

```json
{
  "Pendiente": [...],
  "En curso": [...],
  "Terminada": [...]
}
```

**Ejemplo de uso:**

```bash
curl http://localhost:3000/tasks/kanban
```

**Respuesta:**

```json
{
  "Pendiente": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "title": "Implementar nueva funcionalidad",
      "status": "Pendiente",
      "priority": "Alta",
      "assignedTo": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Juan Pérez",
        "email": "juan@ejemplo.com"
      },
      "dueDate": "2024-02-15T00:00:00.000Z",
      "tags": ["desarrollo", "frontend"],
      "progress": 0
    }
  ],
  "En curso": [],
  "Terminada": []
}
```

### Estadísticas

#### Obtener Estadísticas

```
GET /tasks/statistics
```

**Descripción**: Proporciona estadísticas agregadas del sistema de tareas incluyendo conteos por estado, prioridad y tareas vencidas.

**Ejemplo de uso:**

```bash
curl http://localhost:3000/tasks/statistics
```

**Respuesta:**

```json
{
  "byStatus": [
    { "_id": "Pendiente", "count": 5 },
    { "_id": "En curso", "count": 3 },
    { "_id": "Terminada", "count": 12 }
  ],
  "byPriority": [
    { "_id": "Baja", "count": 2 },
    { "_id": "Media", "count": 8 },
    { "_id": "Alta", "count": 7 },
    { "_id": "Crítica", "count": 3 }
  ],
  "totalTasks": 20,
  "overdueTasks": 2
}
```

### Filtros por Entidad

#### Tareas por Usuario

```
GET /tasks/user/:userId
```

**Descripción**: Obtiene todas las tareas asignadas a un usuario específico o creadas por él, con filtro opcional por estado.

**Ejemplo de uso:**

```bash
curl "http://localhost:3000/tasks/user/507f1f77bcf86cd799439011?status=Pendiente"
```

#### Tareas por Proyecto

```
GET /tasks/project/:projectId
```

**Descripción**: Obtiene todas las tareas asociadas a un proyecto específico, con filtro opcional por estado.

**Ejemplo de uso:**

```bash
curl "http://localhost:3000/tasks/project/507f1f77bcf86cd799439013?status=En curso"
```

#### Tareas por Cliente

```
GET /tasks/client/:clientId
```

**Descripción**: Obtiene todas las tareas asociadas a un cliente específico, con filtro opcional por estado.

**Ejemplo de uso:**

```bash
curl "http://localhost:3000/tasks/client/507f1f77bcf86cd799439014?status=Terminada"
```

### Información y Observaciones

#### Agregar Información a Tarea

```
POST /tasks/:id/info
```

**Descripción**: Agrega una nueva entrada de información, observación o comentario a una tarea específica.

**Body:**

```json
{
  "content": "Observación importante sobre el progreso",
  "createdBy": "507f1f77bcf86cd799439011",
  "type": "observation"
}
```

**Ejemplo de uso:**

```bash
curl -X POST http://localhost:3000/tasks/507f1f77bcf86cd799439015/info \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Se encontró un problema con la API de notificaciones. Necesitamos revisar la documentación.",
    "createdBy": "507f1f77bcf86cd799439011",
    "type": "observation"
  }'
```

### Archivos Adjuntos

#### Subir Archivos a Tarea

```
POST /tasks/:id/attachments
```

**Descripción**: Sube uno o múltiples archivos directamente a una tarea específica.

**Content-Type**: multipart/form-data

**Form Data:**

- `files`: Archivos a subir (máximo 10)
- `uploadedBy`: ID del usuario que sube
- `description`: Descripción opcional

**Ejemplo de uso:**

```bash
curl -X POST http://localhost:3000/tasks/507f1f77bcf86cd799439015/attachments \
  -F "files=@documento.pdf" \
  -F "files=@imagen.png" \
  -F "uploadedBy=507f1f77bcf86cd799439011" \
  -F "description=Documentos de referencia para la implementación"
```

#### Agregar URL de Archivo

```
POST /tasks/:id/attachments/url
```

**Descripción**: Agrega un archivo a una tarea mediante su URL, útil para archivos ya almacenados externamente.

**Body:**

```json
{
  "fileName": "documento.pdf",
  "originalName": "documento_original.pdf",
  "url": "https://s3.amazonaws.com/bucket/file.pdf",
  "mimeType": "application/pdf",
  "size": "1024000",
  "uploadedBy": "507f1f77bcf86cd799439011",
  "description": "Documento de referencia"
}
```

**Ejemplo de uso:**

```bash
curl -X POST http://localhost:3000/tasks/507f1f77bcf86cd799439015/attachments/url \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "documento.pdf",
    "originalName": "documento_original.pdf",
    "url": "https://s3.amazonaws.com/bucket/file.pdf",
    "mimeType": "application/pdf",
    "size": "1024000",
    "uploadedBy": "507f1f77bcf86cd799439011",
    "description": "Documento de referencia"
  }'
```

#### Eliminar Archivo Adjunto

```
DELETE /tasks/:id/attachments/:attachmentId
```

**Descripción**: Elimina un archivo adjunto específico de una tarea.

**Ejemplo de uso:**

```bash
curl -X DELETE http://localhost:3000/tasks/507f1f77bcf86cd799439015/attachments/507f1f77bcf86cd799439017
```

#### Subir Archivos a Información Específica

```
POST /tasks/:id/info/:infoId/attachments
```

**Descripción**: Sube archivos específicamente a una entrada de información/observación de una tarea.

**Content-Type**: multipart/form-data

**Ejemplo de uso:**

```bash
curl -X POST http://localhost:3000/tasks/507f1f77bcf86cd799439015/info/507f1f77bcf86cd799439016/attachments \
  -F "files=@screenshot.png" \
  -F "uploadedBy=507f1f77bcf86cd799439011" \
  -F "description=Captura de pantalla del error encontrado"
```

## Flujo Completo de Trabajo

1. **Crear tarea**: POST /tasks
2. **Asignar a usuario**: PATCH /tasks/:id (cambiar assignedTo)
3. **Cambiar a "En curso"**: PATCH /tasks/:id/status
4. **Agregar observaciones**: POST /tasks/:id/info
5. **Subir archivos**: POST /tasks/:id/attachments
6. **Actualizar progreso**: PATCH /tasks/:id (cambiar progress)
7. **Marcar como terminada**: PATCH /tasks/:id/status con "Terminada"

## Búsqueda Avanzada

**Ejemplo de búsqueda por texto:**

```bash
curl "http://localhost:3000/tasks?q=notificaciones&status=En curso&priority=Alta"
```

## Respuestas de Error Comunes

### Tarea no encontrada

```json
{
  "statusCode": 404,
  "message": "Tarea no encontrada",
  "error": "Not Found"
}
```

### ID inválido

```json
{
  "statusCode": 400,
  "message": "ID no es un ObjectId válido",
  "error": "Bad Request"
}
```

### Usuario no encontrado

```json
{
  "statusCode": 400,
  "message": "assignedTo no es un ObjectId válido",
  "error": "Bad Request"
}
```

## Esquemas de Base de Datos

### Task Schema

```typescript
{
  title: string
  description?: string
  status: 'Pendiente' | 'En curso' | 'Terminada'
  priority: 'Baja' | 'Media' | 'Alta' | 'Crítica'
  assignedTo: ObjectId (User)
  createdBy: ObjectId (User)
  dueDate?: Date
  startDate?: Date
  completedDate?: Date
  info: TaskInfo[]
  attachments: TaskAttachment[]
  tags: string[]
  progress?: number (0-100)
  category?: string
  projectId?: ObjectId (Project)
  clientId?: ObjectId (Client)
}
```

### TaskInfo Schema

```typescript
{
  content: string
  createdBy: ObjectId (User)
  attachments: TaskAttachment[]
  type?: string
}
```

### TaskAttachment Schema

```typescript
{
  fileName: string
  originalName: string
  url: string
  mimeType: string
  size: number
  uploadedBy: ObjectId (User)
  description?: string
}
```

## Índices Optimizados

El sistema incluye índices compuestos optimizados para consultas frecuentes:

- `{ assignedTo: 1, status: 1 }`
- `{ createdBy: 1, status: 1 }`
- `{ status: 1, priority: 1 }`
- `{ projectId: 1, status: 1 }`
- `{ clientId: 1, status: 1 }`
- `{ dueDate: 1 }`
- `{ tags: 1 }`
- `{ category: 1, status: 1 }`
- Índice de texto para búsquedas: `{ title: 'text', description: 'text', tags: 'text' }`

## Principios SOLID Aplicados

1. **Single Responsibility**: Cada servicio tiene una responsabilidad específica
2. **Open/Closed**: Fácil extensión sin modificar código existente
3. **Liskov Substitution**: Interfaces consistentes entre servicios
4. **Interface Segregation**: DTOs específicos para cada operación
5. **Dependency Inversion**: Inyección de dependencias para servicios

## Características de Rendimiento

- Consultas optimizadas con índices compuestos
- Paginación en todas las listas
- Búsquedas de texto optimizadas
- Populate selectivo para reducir transferencia de datos
- Agregaciones eficientes para estadísticas
