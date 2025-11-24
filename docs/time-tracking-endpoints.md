# Documentación de Endpoints - Time Tracking (Marcación de Hora)

## Descripción General

El módulo de Time Tracking permite registrar marcaciones de hora (ingreso y salida) asociadas a registros de asistencia con reconocimiento facial. Cada marcación incluye fecha/hora completa, tipo (INGRESO/SALIDA), ubicación opcional (latitud/longitud) y puede estar asociada a un proyecto.

## Autenticación

Todos los endpoints requieren autenticación mediante JWT Bearer Token:

```http
Authorization: Bearer <token>
X-Tenant-Id: <company_id>
```

## Endpoints

### 1. Crear Marcación de Hora

**POST** `/time-tracking`

Crea un nuevo registro de marcación de hora asociado a una marcación con reconocimiento facial.

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `X-Tenant-Id: <company_id>` (requerido)
- `Content-Type: application/json`

**Body:**
```json
{
  "date": "2024-01-15T09:00:00.000Z",
  "type": "INGRESO",
  "userId": "507f1f77bcf86cd799439011",
  "projectId": "507f1f77bcf86cd799439012",
  "attendanceRecordId": "507f1f77bcf86cd799439013",
  "location": {
    "latitude": -34.603722,
    "longitude": -58.381592
  }
}
```

**Campos:**
- `date` (string, requerido): Fecha y hora de la marcación en formato ISO datetime completo
- `type` (enum, requerido): Tipo de marcación - `INGRESO` o `SALIDA`
- `userId` (string, requerido): ID del usuario (ObjectId válido)
- `projectId` (string, opcional): ID del proyecto relacionado
- `attendanceRecordId` (string, requerido): ID del registro de asistencia relacionado
- `location` (object, opcional): Ubicación de la marcación
  - `latitude` (number, requerido si location está presente): Latitud (-90 a 90)
  - `longitude` (number, requerido si location está presente): Longitud (-180 a 180)

**Respuesta Exitosa (201):**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "date": "2024-01-15T09:00:00.000Z",
  "type": "INGRESO",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "projectId": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Proyecto Alpha",
    "code": "PROJ-001"
  },
  "location": {
    "latitude": -34.603722,
    "longitude": -58.381592
  },
  "attendanceRecordId": "507f1f77bcf86cd799439013",
  "createdAt": "2024-01-15T09:00:00.000Z",
  "updatedAt": "2024-01-15T09:00:00.000Z"
}
```

**Permisos:**
- Los usuarios regulares solo pueden crear marcaciones para sí mismos
- Los supervisores pueden crear marcaciones para cualquier usuario registrado

**Errores:**
- `400`: Datos de entrada inválidos o falta el attendanceRecordId
- `403`: No puedes crear registros para otros usuarios (solo aplica a usuarios regulares)

---

### 2. Obtener Todas las Marcaciones

**GET** `/time-tracking`

Obtiene todos los registros de marcación con filtros opcionales.

**Query Parameters (todos opcionales):**
- `userId` (string): Filtrar por ID de usuario
- `projectId` (string): Filtrar por ID de proyecto
- `startDate` (string): Fecha de inicio (formato ISO)
- `endDate` (string): Fecha de fin (formato ISO)
- `type` (enum): Tipo de marcación - `INGRESO` o `SALIDA`

**Ejemplo:**
```
GET /time-tracking?userId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-31&type=INGRESO
```

**Respuesta Exitosa (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "date": "2024-01-15T09:00:00.000Z",
    "type": "INGRESO",
    "userId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Juan Pérez",
      "email": "juan@example.com"
    },
    "projectId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Proyecto Alpha",
      "code": "PROJ-001"
    },
    "location": {
      "latitude": -34.603722,
      "longitude": -58.381592
    },
    "attendanceRecordId": {
      "_id": "507f1f77bcf86cd799439013",
      "type": "ENTRADA",
      "timestamp": "2024-01-15T09:00:00.000Z",
      "location": "Oficina Central"
    }
  }
]
```

---

### 3. Obtener Marcación por ID

**GET** `/time-tracking/:id`

Obtiene un registro de marcación específico por su ID.

**Parámetros:**
- `id` (string): ID del registro de marcación

**Ejemplo:**
```
GET /time-tracking/507f1f77bcf86cd799439014
```

**Respuesta Exitosa (200):**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "date": "2024-01-15T09:00:00.000Z",
  "type": "INGRESO",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "projectId": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Proyecto Alpha",
    "code": "PROJ-001"
  },
  "location": {
    "latitude": -34.603722,
    "longitude": -58.381592
  },
  "attendanceRecordId": {
    "_id": "507f1f77bcf86cd799439013",
    "type": "ENTRADA",
    "timestamp": "2024-01-15T09:00:00.000Z",
    "location": "Oficina Central"
  },
  "createdAt": "2024-01-15T09:00:00.000Z",
  "updatedAt": "2024-01-15T09:00:00.000Z"
}
```

**Errores:**
- `404`: Registro de tiempo no encontrado

---

### 4. Obtener Marcaciones por Usuario

**GET** `/time-tracking/user/:userId`

Obtiene todos los registros de marcación de un usuario específico.

**Parámetros:**
- `userId` (string): ID del usuario

**Query Parameters (todos opcionales):**
- `startDate` (string): Fecha de inicio (formato ISO)
- `endDate` (string): Fecha de fin (formato ISO)
- `type` (enum): Tipo de marcación - `INGRESO` o `SALIDA`

**Ejemplo:**
```
GET /time-tracking/user/507f1f77bcf86cd799439011?startDate=2024-01-01&endDate=2024-01-31
```

**Respuesta Exitosa (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "date": "2024-01-15T09:00:00.000Z",
    "type": "INGRESO",
    "userId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Juan Pérez",
      "email": "juan@example.com"
    },
    "projectId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Proyecto Alpha",
      "code": "PROJ-001"
    },
    "location": {
      "latitude": -34.603722,
      "longitude": -58.381592
    }
  }
]
```

---

### 5. Obtener Marcaciones por Proyecto

**GET** `/time-tracking/project/:projectId`

Obtiene todos los registros de marcación de un proyecto específico.

**Parámetros:**
- `projectId` (string): ID del proyecto

**Query Parameters (todos opcionales):**
- `startDate` (string): Fecha de inicio (formato ISO)
- `endDate` (string): Fecha de fin (formato ISO)
- `type` (enum): Tipo de marcación - `INGRESO` o `SALIDA`

**Ejemplo:**
```
GET /time-tracking/project/507f1f77bcf86cd799439012?startDate=2024-01-01&endDate=2024-01-31
```

**Respuesta Exitosa (200):**
Array de registros de marcación (mismo formato que el endpoint anterior)

---

### 6. Obtener Marcaciones por Fecha

**GET** `/time-tracking/date/:date`

Obtiene todos los registros de marcación de una fecha específica.

**Parámetros:**
- `date` (string): Fecha en formato ISO (YYYY-MM-DD)

**Ejemplo:**
```
GET /time-tracking/date/2024-01-15
```

**Respuesta Exitosa (200):**
Array de registros de marcación (mismo formato que el endpoint anterior)

---

### 7. Actualizar Marcación

**PATCH** `/time-tracking/:id`

Actualiza un registro de marcación existente. Solo administradores, gerencia y supervisores pueden editar marcaciones.

**Parámetros:**
- `id` (string): ID del registro de marcación

**Body (todos los campos son opcionales):**
```json
{
  "date": "2024-01-15T09:30:00.000Z",
  "type": "SALIDA",
  "projectId": "507f1f77bcf86cd799439012",
  "location": {
    "latitude": -34.603722,
    "longitude": -58.381592
  }
}
```

**Respuesta Exitosa (200):**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "date": "2024-01-15T09:30:00.000Z",
  "type": "SALIDA",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "projectId": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Proyecto Alpha",
    "code": "PROJ-001"
  },
  "location": {
    "latitude": -34.603722,
    "longitude": -58.381592
  },
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Permisos:**
- Solo administradores, gerencia y supervisores pueden editar marcaciones
- Los supervisores pueden editar marcaciones de cualquier usuario

**Errores:**
- `400`: Datos de entrada inválidos
- `403`: No tienes permisos para editar esta marcación
- `404`: Registro de tiempo no encontrado

---

### 8. Eliminar Marcación

**DELETE** `/time-tracking/:id`

Elimina un registro de marcación. Solo administradores, gerencia y supervisores pueden eliminar marcaciones.

**Parámetros:**
- `id` (string): ID del registro de marcación

**Ejemplo:**
```
DELETE /time-tracking/507f1f77bcf86cd799439014
```

**Respuesta Exitosa (200):**
```json
{
  "deleted": true
}
```

**Permisos:**
- Solo administradores, gerencia y supervisores pueden eliminar marcaciones
- Los supervisores pueden eliminar marcaciones de cualquier usuario

**Errores:**
- `403`: No tienes permisos para eliminar esta marcación
- `404`: Registro de tiempo no encontrado

---

## Notas Importantes

1. **Multi-tenancy**: Todos los registros están aislados por `tenantId`. El header `X-Tenant-Id` es obligatorio.

2. **Asociación con AttendanceRecord**: Todos los registros nuevos deben estar asociados a un registro de asistencia (`attendanceRecordId` es obligatorio en la creación).

3. **Ubicación**: El campo `location` es opcional y permite almacenar coordenadas GPS de la marcación.

4. **Tipo de Marcación**: Solo se permiten dos tipos: `INGRESO` (entrada) y `SALIDA` (salida).

5. **Permisos**: 
   - Los usuarios regulares solo pueden crear marcaciones para sí mismos
   - Los supervisores pueden crear, editar y eliminar marcaciones de cualquier usuario registrado
   - Los administradores y gerencia pueden editar y eliminar cualquier marcación

6. **Fecha y Hora**: El campo `date` almacena fecha y hora completa (datetime), no solo la fecha.

---

## Ejemplos de Uso

### Crear Marcación de Ingreso

```bash
curl -X POST http://localhost:3027/time-tracking \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: 507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15T09:00:00.000Z",
    "type": "INGRESO",
    "userId": "507f1f77bcf86cd799439011",
    "attendanceRecordId": "507f1f77bcf86cd799439013",
    "location": {
      "latitude": -34.603722,
      "longitude": -58.381592
    }
  }'
```

### Obtener Marcaciones del Día

```bash
curl -X GET "http://localhost:3027/time-tracking/date/2024-01-15" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: 507f1f77bcf86cd799439011"
```

### Actualizar Marcación

```bash
curl -X PATCH http://localhost:3027/time-tracking/507f1f77bcf86cd799439014 \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: 507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SALIDA",
    "location": {
      "latitude": -34.603722,
      "longitude": -58.381592
    }
  }'
```

