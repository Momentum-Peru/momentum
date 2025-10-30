# API de Reportes Diarios (Daily Reports)

Esta documentación describe todos los endpoints disponibles para gestionar reportes diarios.

## Base URL

```
/daily-reports
```

## Autenticación

Todos los endpoints requieren autenticación JWT. El token debe enviarse en el header `Authorization`:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Crear Reporte Diario

Crea un nuevo reporte diario.

**Endpoint:** `POST /daily-reports`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Payload:**

```json
{
  "date": "2024-01-15",
  "time": "14:30",
  "description": "Descripción detallada del reporte diario. Puede incluir información sobre las actividades realizadas, observaciones importantes, etc.",
  "audioDescription": "https://example.com/audio/report.mp3",
  "videoDescription": "https://example.com/video/report.mp4",
  "photoDescription": "https://example.com/photo/report.jpg",
  "documents": ["https://example.com/doc1.pdf", "https://example.com/doc2.pdf"],
  "userId": "507f1f77bcf86cd799439011",
  "projectId": "507f1f77bcf86cd799439012"
}
```

**Campos:**

| Campo              | Tipo              | Requerido | Descripción                                 |
| ------------------ | ----------------- | --------- | ------------------------------------------- |
| `date`             | string (ISO date) | Sí        | Fecha del reporte (formato: YYYY-MM-DD)     |
| `time`             | string            | Sí        | Hora del reporte (formato: HH:mm)           |
| `description`      | string            | Sí        | Descripción del reporte (5-5000 caracteres) |
| `audioDescription` | string            | No        | URL del archivo de audio                    |
| `videoDescription` | string            | No        | URL del archivo de video                    |
| `photoDescription` | string            | No        | URL del archivo de foto                     |
| `documents`        | string[]          | No        | Array de URLs de documentos                 |
| `userId`           | string (ObjectId) | Sí        | ID del usuario que crea el reporte          |
| `projectId`        | string (ObjectId) | No        | ID del proyecto relacionado                 |

**Respuesta Exitosa (201):**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "date": "2024-01-15T00:00:00.000Z",
  "time": "14:30",
  "description": "Descripción detallada del reporte diario...",
  "audioDescription": "https://example.com/audio/report.mp3",
  "videoDescription": "https://example.com/video/report.mp4",
  "photoDescription": "https://example.com/photo/report.jpg",
  "documents": ["https://example.com/doc1.pdf", "https://example.com/doc2.pdf"],
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "projectId": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Proyecto XYZ",
    "code": "PROJ-001"
  },
  "createdAt": "2024-01-15T14:30:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z"
}
```

**Errores:**

- `400 Bad Request`: Datos de entrada inválidos
- `403 Forbidden`: No puedes crear reportes para otros usuarios
- `401 Unauthorized`: Token inválido o expirado

---

### 2. Listar Reportes Diarios

Obtiene una lista de reportes diarios con filtros opcionales.

**Endpoint:** `GET /daily-reports`

**Headers:**

- `Authorization: Bearer <token>`

**Query Parameters:**

| Parámetro   | Tipo              | Requerido | Descripción                                                     |
| ----------- | ----------------- | --------- | --------------------------------------------------------------- |
| `userId`    | string            | No        | Filtrar por ID de usuario                                       |
| `projectId` | string            | No        | Filtrar por ID de proyecto                                      |
| `startDate` | string (ISO date) | No        | Fecha de inicio (YYYY-MM-DD)                                    |
| `endDate`   | string (ISO date) | No        | Fecha de fin (YYYY-MM-DD)                                       |
| `q`         | string            | No        | Búsqueda por texto (busca en descripción y archivos multimedia) |

**Ejemplo:**

```
GET /daily-reports?userId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-31
```

**Respuesta Exitosa (200):**

```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "date": "2024-01-15T00:00:00.000Z",
    "time": "14:30",
    "description": "Descripción del reporte...",
    "audioDescription": null,
    "videoDescription": null,
    "photoDescription": "https://example.com/photo.jpg",
    "documents": [],
    "userId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Juan Pérez",
      "email": "juan@example.com"
    },
    "projectId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Proyecto XYZ",
      "code": "PROJ-001"
    },
    "createdAt": "2024-01-15T14:30:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
]
```

---

### 3. Obtener Reportes por Fecha

Obtiene todos los reportes de una fecha específica. Permite múltiples reportes por fecha.

**Endpoint:** `GET /daily-reports/date/:date`

**Headers:**

- `Authorization: Bearer <token>`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción                 |
| --------- | ----------------- | --------- | --------------------------- |
| `date`    | string (ISO date) | Sí        | Fecha en formato YYYY-MM-DD |

**Ejemplo:**

```
GET /daily-reports/date/2024-01-15
```

**Respuesta Exitosa (200):**

```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "date": "2024-01-15T00:00:00.000Z",
    "time": "08:00",
    "description": "Reporte de la mañana...",
    "userId": { ... },
    "projectId": { ... },
    "createdAt": "2024-01-15T08:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439014",
    "date": "2024-01-15T00:00:00.000Z",
    "time": "14:30",
    "description": "Reporte de la tarde...",
    "userId": { ... },
    "projectId": { ... },
    "createdAt": "2024-01-15T14:30:00.000Z"
  }
]
```

---

### 4. Obtener Reporte por ID

Obtiene un reporte diario específico por su ID.

**Endpoint:** `GET /daily-reports/:id`

**Headers:**

- `Authorization: Bearer <token>`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción    |
| --------- | ----------------- | --------- | -------------- |
| `id`      | string (ObjectId) | Sí        | ID del reporte |

**Respuesta Exitosa (200):**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "date": "2024-01-15T00:00:00.000Z",
  "time": "14:30",
  "description": "Descripción del reporte...",
  "audioDescription": null,
  "videoDescription": null,
  "photoDescription": "https://example.com/photo.jpg",
  "documents": [],
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "projectId": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Proyecto XYZ",
    "code": "PROJ-001"
  },
  "createdAt": "2024-01-15T14:30:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z"
}
```

**Errores:**

- `404 Not Found`: Reporte no encontrado
- `401 Unauthorized`: Token inválido o expirado

---

### 5. Obtener Reportes por Usuario

Obtiene todos los reportes de un usuario específico.

**Endpoint:** `GET /daily-reports/user/:userId`

**Headers:**

- `Authorization: Bearer <token>`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción    |
| --------- | ----------------- | --------- | -------------- |
| `userId`  | string (ObjectId) | Sí        | ID del usuario |

**Query Parameters:**

| Parámetro   | Tipo              | Requerido | Descripción     |
| ----------- | ----------------- | --------- | --------------- |
| `startDate` | string (ISO date) | No        | Fecha de inicio |
| `endDate`   | string (ISO date) | No        | Fecha de fin    |

**Ejemplo:**

```
GET /daily-reports/user/507f1f77bcf86cd799439011?startDate=2024-01-01&endDate=2024-01-31
```

**Respuesta:** Array de reportes (similar a la respuesta del endpoint de listar)

---

### 6. Obtener Reportes por Proyecto

Obtiene todos los reportes de un proyecto específico.

**Endpoint:** `GET /daily-reports/project/:projectId`

**Headers:**

- `Authorization: Bearer <token>`

**URL Parameters:**

| Parámetro   | Tipo              | Requerido | Descripción     |
| ----------- | ----------------- | --------- | --------------- |
| `projectId` | string (ObjectId) | Sí        | ID del proyecto |

**Query Parameters:**

| Parámetro   | Tipo              | Requerido | Descripción     |
| ----------- | ----------------- | --------- | --------------- |
| `startDate` | string (ISO date) | No        | Fecha de inicio |
| `endDate`   | string (ISO date) | No        | Fecha de fin    |

---

### 7. Actualizar Reporte Diario

Actualiza un reporte diario existente. Solo el propietario puede actualizar sus reportes.

**Endpoint:** `PATCH /daily-reports/:id`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción    |
| --------- | ----------------- | --------- | -------------- |
| `id`      | string (ObjectId) | Sí        | ID del reporte |

**Payload:**

Todos los campos son opcionales. Solo incluye los campos que deseas actualizar.

```json
{
  "date": "2024-01-16",
  "time": "15:00",
  "description": "Descripción actualizada...",
  "audioDescription": "https://example.com/new-audio.mp3",
  "videoDescription": null,
  "photoDescription": "https://example.com/new-photo.jpg",
  "documents": ["https://example.com/new-doc.pdf"],
  "projectId": "507f1f77bcf86cd799439012"
}
```

**Respuesta Exitosa (200):**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "date": "2024-01-16T00:00:00.000Z",
  "time": "15:00",
  "description": "Descripción actualizada...",
  "audioDescription": "https://example.com/new-audio.mp3",
  "videoDescription": null,
  "photoDescription": "https://example.com/new-photo.jpg",
  "documents": [
    "https://example.com/new-doc.pdf"
  ],
  "userId": { ... },
  "projectId": { ... },
  "createdAt": "2024-01-15T14:30:00.000Z",
  "updatedAt": "2024-01-16T15:00:00.000Z"
}
```

**Errores:**

- `400 Bad Request`: Datos de entrada inválidos
- `403 Forbidden`: No puedes editar reportes de otros usuarios
- `404 Not Found`: Reporte no encontrado
- `401 Unauthorized`: Token inválido o expirado

---

### 8. Eliminar Reporte Diario

Elimina un reporte diario. Solo el propietario puede eliminar sus reportes.

**Endpoint:** `DELETE /daily-reports/:id`

**Headers:**

- `Authorization: Bearer <token>`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción    |
| --------- | ----------------- | --------- | -------------- |
| `id`      | string (ObjectId) | Sí        | ID del reporte |

**Respuesta Exitosa (200):**

```json
{
  "deleted": true
}
```

**Errores:**

- `403 Forbidden`: No puedes eliminar reportes de otros usuarios
- `404 Not Found`: Reporte no encontrado
- `401 Unauthorized`: Token inválido o expirado

---

### 9. Subir Documento a Reporte

Sube un documento al reporte.

**Endpoint:** `POST /daily-reports/:id/documents`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción    |
| --------- | ----------------- | --------- | -------------- |
| `id`      | string (ObjectId) | Sí        | ID del reporte |

**Body (form-data):**

| Campo  | Tipo | Requerido | Descripción                      |
| ------ | ---- | --------- | -------------------------------- |
| `file` | File | Sí        | Archivo a subir (cualquier tipo) |

**Respuesta Exitosa (200):**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "documents": [
    "https://storage.example.com/daily-reports/507f1f77bcf86cd799439013/1234567890_documento.pdf"
  ],
  ...
}
```

**Errores:**

- `400 Bad Request`: Archivo no proporcionado o inválido
- `403 Forbidden`: No puedes modificar reportes de otros usuarios
- `404 Not Found`: Reporte no encontrado

---

### 10. Eliminar Documento de Reporte

Elimina un documento del reporte.

**Endpoint:** `DELETE /daily-reports/:id/documents`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción    |
| --------- | ----------------- | --------- | -------------- |
| `id`      | string (ObjectId) | Sí        | ID del reporte |

**Payload:**

```json
{
  "documentUrl": "https://storage.example.com/daily-reports/507f1f77bcf86cd799439013/1234567890_documento.pdf"
}
```

**Campos:**

| Campo         | Tipo   | Requerido | Descripción                  |
| ------------- | ------ | --------- | ---------------------------- |
| `documentUrl` | string | Sí        | URL del documento a eliminar |

---

### 11. Subir Audio a Reporte

Sube un archivo de audio al reporte.

**Endpoint:** `POST /daily-reports/:id/audio`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción    |
| --------- | ----------------- | --------- | -------------- |
| `id`      | string (ObjectId) | Sí        | ID del reporte |

**Body (form-data):**

| Campo  | Tipo | Requerido | Descripción      |
| ------ | ---- | --------- | ---------------- |
| `file` | File | Sí        | Archivo de audio |

**Respuesta:** Reporte actualizado con `audioDescription` actualizado

---

### 12. Subir Video a Reporte

Sube un archivo de video al reporte.

**Endpoint:** `POST /daily-reports/:id/video`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción    |
| --------- | ----------------- | --------- | -------------- |
| `id`      | string (ObjectId) | Sí        | ID del reporte |

**Body (form-data):**

| Campo  | Tipo | Requerido | Descripción      |
| ------ | ---- | --------- | ---------------- |
| `file` | File | Sí        | Archivo de video |

**Respuesta:** Reporte actualizado con `videoDescription` actualizado

---

### 13. Subir Foto a Reporte

Sube una foto al reporte.

**Endpoint:** `POST /daily-reports/:id/photo`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**URL Parameters:**

| Parámetro | Tipo              | Requerido | Descripción    |
| --------- | ----------------- | --------- | -------------- |
| `id`      | string (ObjectId) | Sí        | ID del reporte |

**Body (form-data):**

| Campo  | Tipo | Requerido | Descripción       |
| ------ | ---- | --------- | ----------------- |
| `file` | File | Sí        | Archivo de imagen |

**Respuesta:** Reporte actualizado con `photoDescription` actualizado

---

## Códigos de Estado HTTP

| Código | Descripción                                        |
| ------ | -------------------------------------------------- |
| 200    | OK - Operación exitosa                             |
| 201    | Created - Recurso creado exitosamente              |
| 400    | Bad Request - Datos de entrada inválidos           |
| 401    | Unauthorized - Token inválido o expirado           |
| 403    | Forbidden - No tienes permisos para esta operación |
| 404    | Not Found - Recurso no encontrado                  |
| 500    | Internal Server Error - Error del servidor         |

## Notas Importantes

1. **Múltiples reportes por fecha**: El sistema permite crear múltiples reportes para la misma fecha. Cada reporte se diferencia por su hora (`time`) y fecha/hora de creación.

2. **Propiedad de reportes**: Solo el usuario propietario puede editar o eliminar sus propios reportes.

3. **Formatos de fecha y hora**:
   - `date`: Formato ISO (YYYY-MM-DD)
   - `time`: Formato HH:mm (24 horas)

4. **Archivos multimedia**: Los archivos de audio, video y foto se suben mediante endpoints separados. Una vez subidos, las URLs se guardan automáticamente en el campo correspondiente del reporte.

5. **Documentos**: Se pueden subir múltiples documentos a un mismo reporte. Los documentos pueden ser de cualquier tipo de archivo.

6. **Población de datos**: Las respuestas incluyen automáticamente información del usuario y proyecto asociados (si aplica).
