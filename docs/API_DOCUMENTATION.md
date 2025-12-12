---

## API de Ingeniería

### Descripción General

Gestiona la información técnica y clasificación de los proyectos aprobados. Permite subir archivos directamente a S3 (cálculos estructurales, planos, cronogramas, listas de materiales) y gestionar múltiples documentos por tipo.

### Base URL

```
http://localhost:3027/engineering
```

### Endpoints

### 1. Crear o Actualizar Registro de Ingeniería (Clasificación)

**POST** `/engineering`

Crea o actualiza la ficha de ingeniería para un proyecto. Si ya existe un registro para el proyecto, actualiza el tipo. Si no existe, crea uno nuevo.

#### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |
| projectId | string | Sí | ID del proyecto (ObjectId) |
| type | string | Sí | `Mantenimiento`, `Fabricación`, `Montaje`, `Mixto` |

#### Respuesta

```json
{
  "_id": "...",
  "projectId": "...",
  "type": "Fabricación",
  "structuralCalculations": [],
  "schedules": [],
  "fabricationPlans": [],
  "assemblyPlans": [],
  "billOfMaterials": [],
  "otherDocuments": [],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

### 2. Subir Archivo de Ingeniería

**POST** `/engineering/project/:projectId/files`

Sube un archivo técnico y lo asocia al proyecto. El archivo se guarda en S3 y se agrega al array correspondiente según el tipo.

#### Parámetros de URL

| Parámetro | Tipo | Descripción |
| --------- | ---- | ----------- |
| projectId | string | ID del proyecto (ObjectId) |

#### Body (Multipart/Form-Data)

| Campo | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |
| file | File | Sí | Archivo a subir (Máx 50MB, cualquier formato) |
| type | string | Sí | Tipo de documento: `structural`, `schedule`, `fabrication`, `assembly`, `bom`, `other` |

#### Tipos de Documentos

- `structural`: Cálculos estructurales
- `schedule`: Cronogramas de ejecución
- `fabrication`: Planos de fabricación
- `assembly`: Planos de montaje
- `bom`: Lista de materiales (Bill of Materials)
- `other`: Otros documentos técnicos

#### Respuesta

```json
{
  "_id": "...",
  "projectId": {
    "_id": "...",
    "name": "Proyecto XYZ",
    "code": "123"
  },
  "type": "Fabricación",
  "structuralCalculations": [
    "https://bucket.s3.amazonaws.com/engineering/.../structural-1234567890-calculo.pdf"
  ],
  "schedules": [],
  "fabricationPlans": [],
  "assemblyPlans": [],
  "billOfMaterials": [],
  "otherDocuments": []
}
```

### 3. Eliminar Archivo de Ingeniería

**DELETE** `/engineering/project/:projectId/files?url={url}`

Elimina un documento del registro de ingeniería y del almacenamiento S3.

#### Parámetros

| Parámetro | Tipo | Descripción |
| --------- | ---- | ----------- |
| projectId | string | ID del proyecto (ObjectId) |
| url | string (query) | URL completa del documento a eliminar |

#### Respuesta

```json
{
  "_id": "...",
  "projectId": "...",
  "type": "Fabricación",
  "structuralCalculations": [],
  "schedules": [],
  ...
}
```

### 4. Obtener Ingeniería por Proyecto

**GET** `/engineering/project/:projectId`

Obtiene la información completa de ingeniería asociada a un proyecto, incluyendo todos los documentos subidos.

#### Parámetros de URL

| Parámetro | Tipo | Descripción |
| --------- | ---- | ----------- |
| projectId | string | ID del proyecto (ObjectId) |

#### Respuesta

```json
{
  "_id": "...",
  "projectId": {
    "_id": "...",
    "name": "Proyecto XYZ",
    "code": "123",
    "status": "EN_EJECUCION"
  },
  "type": "Fabricación",
  "structuralCalculations": [
    "https://bucket.s3.amazonaws.com/engineering/.../structural-1234567890-calculo.pdf"
  ],
  "schedules": [
    "https://bucket.s3.amazonaws.com/engineering/.../schedule-1234567891-cronograma.xlsx"
  ],
  "fabricationPlans": [],
  "assemblyPlans": [],
  "billOfMaterials": [
    "https://bucket.s3.amazonaws.com/engineering/.../bom-1234567892-lista-materiales.pdf"
  ],
  "otherDocuments": [],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T11:30:00.000Z"
}
```

### 5. Actualizar Clasificación

**PATCH** `/engineering/project/:projectId`

Actualiza la clasificación del proyecto (tipo de ingeniería).

#### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |
| type | string | No | `Mantenimiento`, `Fabricación`, `Montaje`, `Mixto` |

#### Notas

- Los documentos se gestionan mediante los endpoints de subida/eliminación de archivos
- No se pueden actualizar las URLs de documentos directamente, solo agregar o eliminar archivos

---

## API de Cotizaciones de Proveedores

### Descripción General

Permite al área de logística registrar y gestionar las cotizaciones solicitadas a proveedores para los materiales del proyecto.

### Base URL

```
http://localhost:3027/supplier-quotes
```

### Endpoints

### 1. Crear Cotización de Proveedor

**POST** `/supplier-quotes`

#### Body (JSON)

| Campo         | Tipo   | Requerido | Descripción                               |
| ------------- | ------ | --------- | ----------------------------------------- |
| projectId     | string | Sí        | ID del proyecto                           |
| providerId    | string | Sí        | ID del proveedor                          |
| requirementId | string | No        | ID del requerimiento asociado             |
| items         | string | Sí        | Descripción de items a cotizar            |
| totalCost     | number | No        | Costo total ofertado                      |
| deadline      | string | No        | Fecha límite de oferta/entrega (ISO Date) |
| status        | string | No        | `Pendiente`, `Aprobada`, `Rechazada`      |

### 2. Listar Cotizaciones

**GET** `/supplier-quotes`

Parámetros opcionales: `projectId` para filtrar por proyecto.

### 3. Actualizar Cotización

**PATCH** `/supplier-quotes/:id`

Actualiza el estado, costo o detalles de la cotización.

---

## Dashboard de Proyectos

**GET** `/dashboard`

Obtiene métricas consolidadas de proyectos y flujo de trabajo.

**Respuesta (KPIs principales):**

- `totalProjects`: Cantidad total de proyectos activos.
- `projectsByStatus`: Distribución de proyectos por estado.
- `totalQuotes`: Cotizaciones emitidas.
- `quotesByStatus`: Estado de cotizaciones (ratio de conversión).
- `totalOrders`: Órdenes de servicio recibidas.
- `totalTdrs`: Cantidad de TDRs gestionados.

---

## API de Futuros Imposibles (FI)

### Descripción General

Gestiona los **Futuros Imposibles (FI)**, su descripción detallada y el plan de acción asociado con un rango de fechas.

### Base URL

```
http://localhost:3027/fi
```

### Modelo FI (estructura general)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439011",
  "titulo": "Correr mi primer ultramaratón",
  "description": "Complete a 100 km ultramarathon in under 15 hours",
  "atravesar": "Build mental resilience and consistent training habits",
  "plan": "12-week progressive training plan with recovery blocks",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-31T00:00:00.000Z",
  "isActive": true,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T11:30:00.000Z"
}
```

### Campos principales de FI

| Campo       | Tipo    | Requerido | Descripción                                                       |
| ----------  | ------- | --------- | ----------------------------------------------------------------- |
| `_id`       | string  | Sí        | ID único del FI (ObjectId)                                       |
| `tenantId`  | string  | Sí        | ID de la compañía (tenant)                                       |
| `titulo`    | string  | Sí        | Título del futuro imposible                                      |
| `description` | string | Sí       | Descripción detallada del futuro imposible                       |
| `atravesar` | string  | Sí        | Qué se debe atravesar para lograr el FI                          |
| `plan`      | string  | Sí        | Descripción del plan de acción                                   |
| `startDate` | string  | Sí        | Fecha de inicio del plan (ISO Date, almacenada como UTC midnight)|
| `endDate`   | string  | Sí        | Fecha fin del plan (ISO Date, almacenada como UTC midnight)      |
| `isActive`  | boolean | No        | Indica si el FI está activo (por defecto `true`)                 |
| `createdAt` | string  | Sí        | Fecha de creación (ISO Date)                                     |
| `updatedAt` | string  | Sí        | Fecha de última actualización (ISO Date)                         |

La búsqueda por texto (`q`) en `GET /fi` utiliza los campos `titulo`, `description`, `atravesar` y `plan`.

### 1. Crear FI

**POST** `/fi`

#### Body (JSON)

| Campo        | Tipo    | Requerido | Descripción                                           |
| ------------ | ------- | --------- | ----------------------------------------------------- |
| `titulo`     | string  | Sí        | Título del FI                                         |
| `description`| string  | Sí        | Descripción detallada del FI                          |
| `atravesar`  | string  | Sí        | Qué se debe atravesar                                 |
| `plan`       | string  | Sí        | Descripción del plan de acción                        |
| `startDate`  | string  | Sí        | Fecha de inicio del plan (ISO Date, sin hora)        |
| `endDate`    | string  | Sí        | Fecha fin del plan (ISO Date, sin hora)              |
| `isActive`   | boolean | No        | Estado activo. Por defecto `true`                     |

#### Notas

- El backend valida que `endDate` sea mayor o igual a `startDate`.
- Los campos de texto se normalizan con `trim()` y longitud mínima de 2 caracteres.

### 2. Listar FIs

**GET** `/fi`

Parámetros opcionales:

- `q` (string): Búsqueda por texto en `titulo`, `description`, `atravesar` y `plan`.
- `isActive` (boolean): Filtra por estado activo.

### 3. Obtener FI por ID

**GET** `/fi/:id`

Devuelve un FI completo por su ID.

### 4. Actualizar FI

**PATCH** `/fi/:id`

Permite actualización parcial de los campos del FI:

- `titulo`
- `description`
- `atravesar`
- `plan`
- `startDate`
- `endDate`
- `isActive`

Se valida que, tras la actualización, `endDate` no sea menor que `startDate`.

### 5. Eliminar FI

**DELETE** `/fi/:id`

Elimina el FI y todos sus accionables asociados.
