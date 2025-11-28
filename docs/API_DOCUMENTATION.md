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
