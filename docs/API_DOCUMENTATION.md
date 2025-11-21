# API de Reconocimiento Facial - Documentación

## Descripción General

Esta API permite registrar descriptores faciales de usuarios y marcar asistencia mediante reconocimiento facial. **El procesamiento de imágenes y extracción de descriptores se realiza en el frontend usando face.js api**. El backend solo almacena los descriptores y realiza comparaciones.

### Flujo de Trabajo

1. **Frontend**: Extrae el descriptor facial de la imagen usando face.js api
2. **Frontend**: Envía la imagen (para almacenamiento) y el descriptor (array de 128 números) al backend
3. **Backend**: Almacena la imagen en S3 y el descriptor en la base de datos
4. **Backend**: Para el match, compara el descriptor recibido con los descriptores almacenados

### Base URL

```
http://localhost:3026/face-recognition
```

---

## Endpoints

### 1. Registrar Descriptor Facial

**POST** `/face-recognition/register`

Registra un descriptor facial para un usuario. El descriptor debe ser extraído en el frontend usando face.js api.

#### Query Parameters

| Parámetro | Tipo   | Requerido | Descripción           |
|-----------|--------|-----------|-----------------------|
| tenantId  | string | Sí        | ID del tenant         |

#### Body (multipart/form-data)

| Campo      | Tipo   | Requerido | Descripción                                                                 |
|------------|--------|-----------|-----------------------------------------------------------------------------|
| image      | file   | Sí        | Imagen con el rostro del usuario (JPEG, PNG, WebP)                        |
| userId     | string | Sí        | ID del usuario al que se asociará el descriptor facial (ObjectId válido)  |
| descriptor | string | Sí        | Descriptor facial extraído en el frontend (array de 128 números como JSON) |

#### Ejemplo de Request

```bash
curl -X POST "http://localhost:3026/face-recognition/register?tenantId=507f1f77bcf86cd799439011" \
  -F "image=@rostro.jpg" \
  -F "userId=507f1f77bcf86cd799439011" \
  -F "descriptor=[0.123, -0.456, 0.789, ...]"
```

#### Ejemplo de Request (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('userId', '507f1f77bcf86cd799439011');
formData.append('descriptor', JSON.stringify(faceDescriptor)); // Array de 128 números

const response = await fetch(
  'http://localhost:3026/face-recognition/register?tenantId=507f1f77bcf86cd799439011',
  {
    method: 'POST',
    body: formData,
  }
);
```

#### Ejemplo de Response (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439011",
  "descriptor": [0.123, -0.456, 0.789, /* ... 125 números más ... */],
  "imageUrl": "https://bucket.s3.amazonaws.com/face-recognition/user123/1234567890-reference.jpg",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Códigos de Estado

- `201 Created`: Descriptor facial registrado exitosamente
- `400 Bad Request`: Error en la validación de datos o descriptor inválido
- `409 Conflict`: Ya existe un descriptor facial activo para este usuario

#### Errores Comunes

- `"El descriptor facial debe ser un array de exactamente 128 números"`: El descriptor no tiene 128 valores
- `"El ID del usuario no es válido"`: El userId no es un ObjectId válido
- `"Ya existe un descriptor facial activo para este usuario"`: El usuario ya tiene un descriptor registrado

---

### 2. Marcar Asistencia

**POST** `/face-recognition/attendance`

Marca la entrada o salida de un usuario comparando el descriptor facial con los descriptores registrados. El descriptor debe ser extraído en el frontend usando face.js api.

#### Query Parameters

| Parámetro | Tipo   | Requerido | Descripción   |
|-----------|--------|-----------|---------------|
| tenantId  | string | Sí        | ID del tenant |

#### Body (multipart/form-data)

| Campo      | Tipo   | Requerido | Descripción                                                                 |
|------------|--------|-----------|-----------------------------------------------------------------------------|
| image      | file   | Sí        | Imagen con el rostro del usuario (JPEG, PNG, WebP)                        |
| descriptor | string | Sí        | Descriptor facial extraído en el frontend (array de 128 números como JSON) |
| type       | string | No        | Tipo de marcación: `ENTRADA` o `SALIDA`. Si no se proporciona, se determina automáticamente |
| location   | string | No        | Ubicación donde se realiza la marcación (máx. 500 caracteres)              |
| notes      | string | No        | Notas adicionales sobre la marcación (máx. 1000 caracteres)                 |

#### Ejemplo de Request

```bash
curl -X POST "http://localhost:3026/face-recognition/attendance?tenantId=507f1f77bcf86cd799439011" \
  -F "image=@rostro_marcacion.jpg" \
  -F "descriptor=[0.123, -0.456, 0.789, ...]" \
  -F "type=ENTRADA" \
  -F "location=Oficina Principal - Lima" \
  -F "notes=Marcación realizada desde dispositivo móvil"
```

#### Ejemplo de Request (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('descriptor', JSON.stringify(faceDescriptor)); // Array de 128 números
formData.append('type', 'ENTRADA'); // Opcional
formData.append('location', 'Oficina Principal - Lima'); // Opcional
formData.append('notes', 'Marcación desde móvil'); // Opcional

const response = await fetch(
  'http://localhost:3026/face-recognition/attendance?tenantId=507f1f77bcf86cd799439011',
  {
    method: 'POST',
    body: formData,
  }
);
```

#### Ejemplo de Response (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "tenantId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439011",
  "type": "ENTRADA",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "imageUrl": "https://bucket.s3.amazonaws.com/attendance/user123/1234567890-entrada.jpg",
  "confidence": 0.95,
  "location": "Oficina Principal - Lima",
  "notes": "Marcación realizada desde dispositivo móvil",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Códigos de Estado

- `201 Created`: Asistencia marcada exitosamente
- `400 Bad Request`: Error en la validación, descriptor inválido o no se pudo identificar al usuario
- `404 Not Found`: No hay descriptores faciales registrados

#### Errores Comunes

- `"El descriptor facial debe ser un array de exactamente 128 números"`: El descriptor no tiene 128 valores
- `"No se pudo identificar al usuario. El rostro no coincide con ningún registro."`: El descriptor no coincide con ningún usuario registrado (umbral de similitud: 0.6)
- `"No hay descriptores faciales registrados para comparar"`: No hay usuarios con descriptores registrados en el tenant

#### Determinación Automática de Tipo

Si no se proporciona el campo `type`, el sistema determina automáticamente el tipo de marcación:

- Si no hay registros previos del usuario → `ENTRADA`
- Si la última marcación fue `SALIDA` → `ENTRADA`
- Si la última marcación fue `ENTRADA` → `SALIDA`

---

### 3. Obtener Descriptores de un Usuario

**GET** `/face-recognition/descriptors/user/:userId`

Retorna todos los descriptores faciales activos asociados a un usuario.

#### Path Parameters

| Parámetro | Tipo   | Requerido | Descripción   |
|-----------|--------|-----------|---------------|
| userId    | string | Sí        | ID del usuario |

#### Query Parameters

| Parámetro | Tipo   | Requerido | Descripción   |
|-----------|--------|-----------|---------------|
| tenantId  | string | Sí        | ID del tenant |

#### Ejemplo de Request

```bash
curl -X GET "http://localhost:3026/face-recognition/descriptors/user/507f1f77bcf86cd799439011?tenantId=507f1f77bcf86cd799439011"
```

#### Ejemplo de Response (200 OK)

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "tenantId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439011",
    "descriptor": [0.123, -0.456, 0.789, /* ... 125 números más ... */],
    "imageUrl": "https://bucket.s3.amazonaws.com/face-recognition/user123/1234567890-reference.jpg",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Códigos de Estado

- `200 OK`: Lista de descriptores obtenida exitosamente
- `400 Bad Request`: ID de usuario inválido

---

### 4. Eliminar Descriptor Facial

**DELETE** `/face-recognition/descriptors/:id`

Elimina (soft delete) un descriptor facial por su ID.

#### Path Parameters

| Parámetro | Tipo   | Requerido | Descripción         |
|-----------|--------|-----------|---------------------|
| id        | string | Sí        | ID del descriptor   |

#### Query Parameters

| Parámetro | Tipo   | Requerido | Descripción   |
|-----------|--------|-----------|---------------|
| tenantId  | string | Sí        | ID del tenant |

#### Ejemplo de Request

```bash
curl -X DELETE "http://localhost:3026/face-recognition/descriptors/507f1f77bcf86cd799439011?tenantId=507f1f77bcf86cd799439011"
```

#### Códigos de Estado

- `204 No Content`: Descriptor eliminado exitosamente
- `400 Bad Request`: ID inválido
- `404 Not Found`: Descriptor no encontrado

---

### 5. Obtener Registros de Asistencia

**GET** `/face-recognition/attendance`

Retorna los registros de asistencia con filtros opcionales por usuario y rango de fechas.

#### Query Parameters

| Parámetro | Tipo   | Requerido | Descripción                                    |
|-----------|--------|-----------|------------------------------------------------|
| tenantId  | string | Sí        | ID del tenant                                  |
| userId    | string | No        | ID del usuario (filtro opcional)             |
| startDate | string | No        | Fecha de inicio (formato ISO: YYYY-MM-DDTHH:mm:ss.sssZ) |
| endDate   | string | No        | Fecha de fin (formato ISO: YYYY-MM-DDTHH:mm:ss.sssZ)     |

#### Ejemplo de Request

```bash
# Obtener todos los registros del tenant
curl -X GET "http://localhost:3026/face-recognition/attendance?tenantId=507f1f77bcf86cd799439011"

# Obtener registros de un usuario específico
curl -X GET "http://localhost:3026/face-recognition/attendance?tenantId=507f1f77bcf86cd799439011&userId=507f1f77bcf86cd799439011"

# Obtener registros en un rango de fechas
curl -X GET "http://localhost:3026/face-recognition/attendance?tenantId=507f1f77bcf86cd799439011&startDate=2024-01-01T00:00:00.000Z&endDate=2024-01-31T23:59:59.999Z"
```

#### Ejemplo de Response (200 OK)

```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "tenantId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439011",
    "type": "ENTRADA",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "imageUrl": "https://bucket.s3.amazonaws.com/attendance/user123/1234567890-entrada.jpg",
    "confidence": 0.95,
    "location": "Oficina Principal - Lima",
    "notes": "Marcación realizada desde dispositivo móvil",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "tenantId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439011",
    "type": "SALIDA",
    "timestamp": "2024-01-15T18:00:00.000Z",
    "imageUrl": "https://bucket.s3.amazonaws.com/attendance/user123/1234567891-salida.jpg",
    "confidence": 0.92,
    "location": "Oficina Principal - Lima",
    "notes": null,
    "createdAt": "2024-01-15T18:00:00.000Z",
    "updatedAt": "2024-01-15T18:00:00.000Z"
  }
]
```

#### Códigos de Estado

- `200 OK`: Lista de registros obtenida exitosamente
- `400 Bad Request`: Parámetros inválidos

---

## Estructura de Datos

### Descriptor Facial

El descriptor facial es un array de **exactamente 128 números** (floats) que representa las características biométricas del rostro. Este descriptor es extraído por face.js api en el frontend.

**Ejemplo:**
```json
[0.123, -0.456, 0.789, 0.234, -0.567, ...] // 128 números en total
```

### Umbral de Similitud

El sistema utiliza un umbral de similitud de **0.6** para determinar si dos descriptores corresponden a la misma persona. Este valor puede ajustarse según las necesidades del sistema.

- **Distancia ≤ 0.6**: Match positivo (misma persona)
- **Distancia > 0.6**: No match (personas diferentes)

---

## Notas de Implementación

### Frontend

1. **Extracción del Descriptor**: Usar face.js api para extraer el descriptor facial de la imagen
2. **Envío de Datos**: Enviar tanto la imagen como el descriptor al backend
3. **Formato del Descriptor**: El descriptor debe enviarse como JSON string en multipart/form-data

### Backend

1. **Almacenamiento**: La imagen se almacena en S3, el descriptor en MongoDB
2. **Comparación**: El backend solo compara descriptores, no extrae descriptores de imágenes
3. **Validación**: Se valida que el descriptor tenga exactamente 128 valores numéricos

### Seguridad

- Todos los endpoints requieren autenticación (JWT)
- El `tenantId` se valida en cada request
- Los descriptores se almacenan de forma segura en la base de datos

---

## Ejemplos de Uso Completo

### Flujo de Registro

```javascript
// 1. Frontend: Extraer descriptor usando face.js api
const detection = await faceapi
  .detectSingleFace(imageElement)
  .withFaceLandmarks()
  .withFaceDescriptor();

const descriptor = Array.from(detection.descriptor); // Array de 128 números

// 2. Frontend: Enviar al backend
const formData = new FormData();
formData.append('image', imageFile);
formData.append('userId', userId);
formData.append('descriptor', JSON.stringify(descriptor));

const response = await fetch(
  `${API_URL}/face-recognition/register?tenantId=${tenantId}`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  }
);
```

### Flujo de Marcación

```javascript
// 1. Frontend: Extraer descriptor de la imagen de marcación
const detection = await faceapi
  .detectSingleFace(imageElement)
  .withFaceLandmarks()
  .withFaceDescriptor();

const descriptor = Array.from(detection.descriptor);

// 2. Frontend: Enviar al backend para comparar
const formData = new FormData();
formData.append('image', imageFile);
formData.append('descriptor', JSON.stringify(descriptor));
formData.append('location', 'Oficina Principal');

const response = await fetch(
  `${API_URL}/face-recognition/attendance?tenantId=${tenantId}`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  }
);

const attendanceRecord = await response.json();
console.log(`Usuario identificado: ${attendanceRecord.userId}`);
console.log(`Tipo: ${attendanceRecord.type}`);
console.log(`Confianza: ${attendanceRecord.confidence}`);
```

---

## Errores y Soluciones

### Error: "El descriptor facial debe ser un array de exactamente 128 números"

**Causa**: El descriptor no tiene 128 valores o no es un array válido.

**Solución**: Verificar que el descriptor extraído por face.js api tenga exactamente 128 valores numéricos.

### Error: "No se pudo identificar al usuario"

**Causa**: El descriptor no coincide con ningún usuario registrado (distancia > 0.6).

**Soluciones**:
- Verificar que el usuario tenga un descriptor registrado
- Asegurar que la imagen tenga buena calidad y iluminación
- Verificar que el descriptor se esté extrayendo correctamente en el frontend

### Error: "Ya existe un descriptor facial activo para este usuario"

**Causa**: El usuario ya tiene un descriptor registrado.

**Solución**: Eliminar el descriptor anterior antes de registrar uno nuevo usando el endpoint DELETE.

---

## Changelog

### Versión 2.0 (Actual)
- ✅ Extracción de descriptores movida al frontend
- ✅ Backend simplificado para solo almacenar y comparar descriptores
- ✅ Eliminación de dependencias de canvas y modelos de face-api.js en el backend
- ✅ Mejora en la validación de descriptores

### Versión 1.0 (Anterior)
- Extracción de descriptores en el backend
- Carga de modelos de face-api.js en el servidor
- Validación de imágenes en el backend

---

## API de Gestión de Planillas

### Descripción General

Esta API permite gestionar las planillas de pago y recibos por honorarios (RXH) de los empleados. Incluye funcionalidades para crear planillas, importar datos desde archivos Excel, y gestionar los detalles de cada planilla.

### Base URL

```
http://localhost:3027/payrolls
```

### Autenticación

Todos los endpoints requieren autenticación JWT mediante el header `Authorization: Bearer <token>`.

---

## Endpoints

### 1. Crear Planilla (Cabecera)

**POST** `/payrolls`

Crea una nueva planilla. El `tenantId` y `userId` se obtienen automáticamente del token JWT.

#### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| startDate | string | Sí | Fecha de inicio del periodo (YYYY-MM-DD) |
| endDate | string | Sí | Fecha de fin del periodo (YYYY-MM-DD) |
| totalToPay | number | Sí | Total a pagar en la planilla |
| paymentProof | string | No | URL de la constancia de pago global |
| status | string | No | Estado: `DRAFT`, `APPROVED`, `PAID`. Default: `DRAFT` |
| comments | string | No | Comentarios generales |

#### Ejemplo de Request

```bash
curl -X POST "http://localhost:3027/payrolls" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "totalToPay": 15000.50,
    "comments": "Planilla Enero 2024"
  }'
```

#### Ejemplo de Response (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439012",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T00:00:00.000Z",
  "totalToPay": 15000.50,
  "status": "DRAFT",
  "comments": "Planilla Enero 2024",
  "editedBy": "507f1f77bcf86cd799439013",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Códigos de Estado

- `201 Created`: Planilla creada exitosamente
- `400 Bad Request`: Error en la validación de datos
- `401 Unauthorized`: Token de autenticación inválido o faltante

---

### 2. Listar Planillas

**GET** `/payrolls`

Obtiene todas las planillas del tenant actual, ordenadas por fecha de creación (más recientes primero).

#### Ejemplo de Request

```bash
curl -X GET "http://localhost:3027/payrolls" \
  -H "Authorization: Bearer <token>"
```

#### Ejemplo de Response (200 OK)

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "tenantId": "507f1f77bcf86cd799439012",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T00:00:00.000Z",
    "totalToPay": 15000.50,
    "status": "DRAFT",
    "comments": "Planilla Enero 2024",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Códigos de Estado

- `200 OK`: Lista obtenida exitosamente
- `401 Unauthorized`: Token de autenticación inválido

---

### 3. Descargar Plantilla Excel

**GET** `/payrolls/template`

Descarga una plantilla Excel para cargar datos de planillas o recibos por honorarios. La plantilla incluye validaciones de datos y una fila de ejemplo.

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| type | string | No | Tipo de plantilla: `PLANILLA` o `RXH`. Default: `PLANILLA` |

#### Ejemplo de Request

```bash
# Descargar plantilla de Planilla
curl -X GET "http://localhost:3027/payrolls/template?type=PLANILLA" \
  -H "Authorization: Bearer <token>" \
  --output plantilla_planilla.xlsx

# Descargar plantilla de RxH
curl -X GET "http://localhost:3027/payrolls/template?type=RXH" \
  -H "Authorization: Bearer <token>" \
  --output plantilla_rxh.xlsx
```

#### Ejemplo de Request (JavaScript/Fetch)

```javascript
const response = await fetch(
  'http://localhost:3027/payrolls/template?type=PLANILLA',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'plantilla_planilla.xlsx';
a.click();
window.URL.revokeObjectURL(url);
```

#### Códigos de Estado

- `200 OK`: Plantilla descargada exitosamente
- `400 Bad Request`: Tipo de plantilla inválido
- `401 Unauthorized`: Token de autenticación inválido

#### Notas

- La plantilla de **PLANILLA** incluye campos específicos: Sistema Pensión, Aporte Pensión, Aporte EsSalud
- La plantilla de **RXH** incluye el campo de Retención
- El archivo descargado es un archivo Excel (.xlsx) con validaciones de datos y una fila de ejemplo
- La primera fila contiene los encabezados de la planilla (fechas, estado, comentarios)
- Las filas siguientes contienen los detalles de cada empleado

---

### 4. Obtener Planilla por ID

**GET** `/payrolls/:id`

Obtiene una planilla específica por su ID.

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| id | string | Sí | ID de la planilla (ObjectId de MongoDB) |

#### Ejemplo de Request

```bash
curl -X GET "http://localhost:3027/payrolls/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>"
```

#### Ejemplo de Response (200 OK)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439012",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T00:00:00.000Z",
  "totalToPay": 15000.50,
  "status": "DRAFT",
  "comments": "Planilla Enero 2024",
  "paymentProof": "https://s3.aws.com/proof.pdf",
  "editedBy": "507f1f77bcf86cd799439013",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Códigos de Estado

- `200 OK`: Planilla obtenida exitosamente
- `404 Not Found`: Planilla no encontrada
- `401 Unauthorized`: Token de autenticación inválido

---

### 5. Actualizar Planilla

**PUT** `/payrolls/:id`

Actualiza los datos de una planilla existente.

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| id | string | Sí | ID de la planilla |

#### Body (JSON)

Todos los campos son opcionales. Solo se actualizarán los campos enviados.

| Campo | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| startDate | string | No | Fecha de inicio (YYYY-MM-DD) |
| endDate | string | No | Fecha de fin (YYYY-MM-DD) |
| totalToPay | number | No | Total a pagar |
| paymentProof | string | No | URL de constancia de pago |
| status | string | No | Estado: `DRAFT`, `APPROVED`, `PAID` |
| comments | string | No | Comentarios |

#### Ejemplo de Request

```bash
curl -X PUT "http://localhost:3027/payrolls/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "totalToPay": 16000.00
  }'
```

#### Códigos de Estado

- `200 OK`: Planilla actualizada exitosamente
- `404 Not Found`: Planilla no encontrada
- `400 Bad Request`: Error en la validación
- `401 Unauthorized`: Token de autenticación inválido

---

### 6. Eliminar Planilla

**DELETE** `/payrolls/:id`

Elimina una planilla y todos sus detalles asociados.

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| id | string | Sí | ID de la planilla |

#### Ejemplo de Request

```bash
curl -X DELETE "http://localhost:3027/payrolls/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>"
```

#### Códigos de Estado

- `200 OK`: Planilla eliminada exitosamente
- `404 Not Found`: Planilla no encontrada
- `401 Unauthorized`: Token de autenticación inválido

---

### 7. Importar Planilla desde Excel

**POST** `/payrolls/:id/import`

Importa los detalles de una planilla desde un archivo Excel. **Reemplaza todos los detalles existentes** de la planilla con los datos del archivo.

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| id | string | Sí | ID de la planilla |

#### Body (multipart/form-data)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| file | file | Sí | Archivo Excel (.xlsx) con los datos de la planilla (máx. 5MB) |

#### Validaciones del Archivo

- **Tamaño máximo**: 5MB
- **Formato**: `.xlsx` (Excel 2007+)
- **Estructura**: Debe seguir el formato de la plantilla descargada
- **Empleados**: Los DNI deben existir en el sistema de empleados

#### Procesamiento

1. Lee la primera fila de datos (fila 2) para actualizar la cabecera de la planilla
2. Procesa cada fila de empleados
3. Busca los empleados por DNI en el sistema
4. Elimina los detalles existentes de la planilla
5. Crea los nuevos detalles
6. Recalcula el `totalToPay` de la planilla

#### Ejemplo de Request

```bash
curl -X POST "http://localhost:3027/payrolls/507f1f77bcf86cd799439011/import" \
  -H "Authorization: Bearer <token>" \
  -F "file=@planilla_enero.xlsx"
```

#### Ejemplo de Request (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('file', excelFile);

const response = await fetch(
  'http://localhost:3027/payrolls/507f1f77bcf86cd799439011/import',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  }
);

const result = await response.json();
console.log(`Importados ${result.count} registros`);
if (result.errors.length > 0) {
  console.error('Errores:', result.errors);
}
```

#### Ejemplo de Response (200 OK)

```json
{
  "count": 25,
  "errors": []
}
```

#### Ejemplo de Response con Errores (200 OK)

```json
{
  "count": 23,
  "errors": [
    "DNI 12345678: Empleado no encontrado en el sistema",
    "Fila 15: Faltan datos obligatorios (DNI, Nombre o Apellido)"
  ]
}
```

#### Códigos de Estado

- `200 OK`: Importación completada (puede tener errores parciales)
- `400 Bad Request`: Error en la validación del archivo o datos
- `404 Not Found`: Planilla no encontrada
- `401 Unauthorized`: Token de autenticación inválido

#### Errores Comunes

- `"El archivo Excel no tiene hojas válidas"`: El archivo está corrupto o vacío
- `"Fila X: Faltan datos obligatorios (DNI, Nombre o Apellido)"`: Fila incompleta
- `"Fila X: Tipo de contrato inválido (Debe ser PLANILLA o RXH)"`: Valor inválido en el campo contractType
- `"DNI X: Empleado no encontrado en el sistema"`: El empleado no existe en la base de datos

---

### 8. Agregar Detalle a Planilla

**POST** `/payrolls/:id/details`

Agrega un empleado (detalle) a una planilla existente.

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| id | string | Sí | ID de la planilla |

#### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| employeeId | string | Sí | ID del empleado (ObjectId válido) |
| firstName | string | Sí | Nombre del empleado |
| lastName | string | Sí | Apellido del empleado |
| dni | string | Sí | DNI del empleado |
| contractType | string | Sí | `PLANILLA` o `RXH` |
| startDate | string | Sí | Fecha inicio periodo empleado (YYYY-MM-DD) |
| endDate | string | Sí | Fecha fin periodo empleado (YYYY-MM-DD) |
| workedHours | number | Sí | Horas trabajadas |
| absences | number | Sí | Días de inasistencia |
| discounts | number | Sí | Descuentos totales |
| bonuses | number | Sí | Bonificaciones |
| totalIncome | number | Sí | Ingreso total bruto |
| totalToPay | number | Sí | Total neto a pagar |
| comments | string | No | Comentarios del detalle |
| paymentProof | string | No | URL de constancia de pago individual |
| retention | number | No | Retención (solo para RXH) |
| pensionSystem | string | No | Sistema de pensiones: ONP/AFP (solo para PLANILLA) |
| pensionContribution | number | No | Aporte a pensión (solo para PLANILLA) |
| essaludContribution | number | No | Aporte a EsSalud (solo para PLANILLA) |

#### Ejemplo de Request (Planilla)

```bash
curl -X POST "http://localhost:3027/payrolls/507f1f77bcf86cd799439011/details" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "507f1f77bcf86cd799439014",
    "firstName": "Juan",
    "lastName": "Pérez",
    "dni": "12345678",
    "contractType": "PLANILLA",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "workedHours": 160,
    "absences": 0,
    "discounts": 50,
    "bonuses": 100,
    "totalIncome": 2000,
    "totalToPay": 1800,
    "pensionSystem": "AFP INTEGRA",
    "pensionContribution": 200,
    "essaludContribution": 180,
    "comments": "Pago regular"
  }'
```

#### Ejemplo de Request (RXH)

```bash
curl -X POST "http://localhost:3027/payrolls/507f1f77bcf86cd799439011/details" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "507f1f77bcf86cd799439015",
    "firstName": "Consultor",
    "lastName": "SAC",
    "dni": "20123456789",
    "contractType": "RXH",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "workedHours": 80,
    "absences": 0,
    "discounts": 0,
    "bonuses": 0,
    "totalIncome": 5000,
    "totalToPay": 4500,
    "retention": 500,
    "comments": "Servicios profesionales"
  }'
```

#### Ejemplo de Response (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439016",
  "payrollId": "507f1f77bcf86cd799439011",
  "employeeId": "507f1f77bcf86cd799439014",
  "firstName": "Juan",
  "lastName": "Pérez",
  "dni": "12345678",
  "contractType": "PLANILLA",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T00:00:00.000Z",
  "workedHours": 160,
  "absences": 0,
  "discounts": 50,
  "bonuses": 100,
  "totalIncome": 2000,
  "totalToPay": 1800,
  "pensionSystem": "AFP INTEGRA",
  "pensionContribution": 200,
  "essaludContribution": 180,
  "comments": "Pago regular",
  "editedBy": "507f1f77bcf86cd799439013",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Códigos de Estado

- `201 Created`: Detalle creado exitosamente
- `400 Bad Request`: Error en la validación de datos
- `404 Not Found`: Planilla no encontrada
- `401 Unauthorized`: Token de autenticación inválido

---

### 9. Obtener Detalles de Planilla

**GET** `/payrolls/:id/details`

Obtiene todos los detalles (empleados) de una planilla específica.

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| id | string | Sí | ID de la planilla |

#### Ejemplo de Request

```bash
curl -X GET "http://localhost:3027/payrolls/507f1f77bcf86cd799439011/details" \
  -H "Authorization: Bearer <token>"
```

#### Ejemplo de Response (200 OK)

```json
[
  {
    "_id": "507f1f77bcf86cd799439016",
    "payrollId": "507f1f77bcf86cd799439011",
    "employeeId": "507f1f77bcf86cd799439014",
    "firstName": "Juan",
    "lastName": "Pérez",
    "dni": "12345678",
    "contractType": "PLANILLA",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T00:00:00.000Z",
    "workedHours": 160,
    "absences": 0,
    "discounts": 50,
    "bonuses": 100,
    "totalIncome": 2000,
    "totalToPay": 1800,
    "pensionSystem": "AFP INTEGRA",
    "pensionContribution": 200,
    "essaludContribution": 180,
    "comments": "Pago regular",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Códigos de Estado

- `200 OK`: Lista de detalles obtenida exitosamente
- `404 Not Found`: Planilla no encontrada
- `401 Unauthorized`: Token de autenticación inválido

---

### 10. Actualizar Detalle

**PUT** `/payrolls/details/:detailId`

Actualiza un detalle específico de una planilla.

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| detailId | string | Sí | ID del detalle |

#### Body (JSON)

Todos los campos son opcionales. Solo se actualizarán los campos enviados.

| Campo | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| firstName | string | No | Nombre |
| lastName | string | No | Apellido |
| dni | string | No | DNI |
| contractType | string | No | `PLANILLA` o `RXH` |
| startDate | string | No | Fecha inicio (YYYY-MM-DD) |
| endDate | string | No | Fecha fin (YYYY-MM-DD) |
| workedHours | number | No | Horas trabajadas |
| absences | number | No | Días de inasistencia |
| discounts | number | No | Descuentos |
| bonuses | number | No | Bonificaciones |
| totalIncome | number | No | Ingreso total bruto |
| totalToPay | number | No | Total neto a pagar |
| comments | string | No | Comentarios |
| paymentProof | string | No | URL constancia de pago |
| retention | number | No | Retención (solo RXH) |
| pensionSystem | string | No | Sistema pensión (solo PLANILLA) |
| pensionContribution | number | No | Aporte pensión (solo PLANILLA) |
| essaludContribution | number | No | Aporte EsSalud (solo PLANILLA) |

#### Ejemplo de Request

```bash
curl -X PUT "http://localhost:3027/payrolls/details/507f1f77bcf86cd799439016" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "totalToPay": 1900,
    "bonuses": 150
  }'
```

#### Códigos de Estado

- `200 OK`: Detalle actualizado exitosamente
- `404 Not Found`: Detalle no encontrado
- `400 Bad Request`: Error en la validación
- `401 Unauthorized`: Token de autenticación inválido

---

### 11. Eliminar Detalle

**DELETE** `/payrolls/details/:detailId`

Elimina un detalle específico de una planilla.

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| detailId | string | Sí | ID del detalle |

#### Ejemplo de Request

```bash
curl -X DELETE "http://localhost:3027/payrolls/details/507f1f77bcf86cd799439016" \
  -H "Authorization: Bearer <token>"
```

#### Códigos de Estado

- `200 OK`: Detalle eliminado exitosamente
- `404 Not Found`: Detalle no encontrado
- `401 Unauthorized`: Token de autenticación inválido

---

## Estructura de Datos

### Planilla (Payroll)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439012",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T00:00:00.000Z",
  "totalToPay": 15000.50,
  "paymentProof": "https://s3.aws.com/proof.pdf",
  "status": "DRAFT",
  "comments": "Planilla Enero 2024",
  "editedBy": "507f1f77bcf86cd799439013",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Detalle de Planilla (PayrollDetail)

#### Para PLANILLA

```json
{
  "_id": "507f1f77bcf86cd799439016",
  "payrollId": "507f1f77bcf86cd799439011",
  "employeeId": "507f1f77bcf86cd799439014",
  "firstName": "Juan",
  "lastName": "Pérez",
  "dni": "12345678",
  "contractType": "PLANILLA",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T00:00:00.000Z",
  "workedHours": 160,
  "absences": 0,
  "discounts": 50,
  "bonuses": 100,
  "totalIncome": 2000,
  "totalToPay": 1800,
  "pensionSystem": "AFP INTEGRA",
  "pensionContribution": 200,
  "essaludContribution": 180,
  "comments": "Pago regular",
  "paymentProof": "https://s3.aws.com/proof-individual.pdf",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Para RXH

```json
{
  "_id": "507f1f77bcf86cd799439017",
  "payrollId": "507f1f77bcf86cd799439011",
  "employeeId": "507f1f77bcf86cd799439015",
  "firstName": "Consultor",
  "lastName": "SAC",
  "dni": "20123456789",
  "contractType": "RXH",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T00:00:00.000Z",
  "workedHours": 80,
  "absences": 0,
  "discounts": 0,
  "bonuses": 0,
  "totalIncome": 5000,
  "totalToPay": 4500,
  "retention": 500,
  "comments": "Servicios profesionales",
  "paymentProof": "https://s3.aws.com/proof-rxh.pdf",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## Flujo de Trabajo Recomendado

### 1. Crear y Cargar Planilla desde Excel

```javascript
// Paso 1: Crear la planilla
const createResponse = await fetch('http://localhost:3027/payrolls', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    totalToPay: 0, // Se actualizará después del import
    status: 'DRAFT',
    comments: 'Planilla Enero 2024',
  }),
});

const payroll = await createResponse.json();

// Paso 2: Importar archivo Excel
const formData = new FormData();
formData.append('file', excelFile);

const importResponse = await fetch(
  `http://localhost:3027/payrolls/${payroll._id}/import`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  }
);

const importResult = await importResponse.json();
console.log(`Importados ${importResult.count} registros`);
if (importResult.errors.length > 0) {
  console.warn('Errores:', importResult.errors);
}

// Paso 3: Obtener la planilla actualizada con detalles
const updatedPayroll = await fetch(
  `http://localhost:3027/payrolls/${payroll._id}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
).then(res => res.json());

const details = await fetch(
  `http://localhost:3027/payrolls/${payroll._id}/details`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
).then(res => res.json());

updatedPayroll.details = details;
```

### 2. Descargar Plantilla

```javascript
// Descargar plantilla de Planilla
const templateResponse = await fetch(
  'http://localhost:3027/payrolls/template?type=PLANILLA',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const blob = await templateResponse.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'plantilla_planilla.xlsx';
a.click();
window.URL.revokeObjectURL(url);
```

---

## Notas de Implementación

### Importación de Excel

- El archivo Excel debe seguir exactamente el formato de la plantilla descargada
- La primera fila (fila 1) contiene los encabezados
- La segunda fila (fila 2) contiene los datos de la cabecera de la planilla y el primer empleado
- Las filas siguientes contienen los demás empleados
- Los empleados se buscan por DNI en el sistema. Si un DNI no existe, se genera un error
- Al importar, se **reemplazan** todos los detalles existentes de la planilla

### Validaciones

- Los DNI deben existir en el sistema de empleados
- El `contractType` debe ser exactamente `PLANILLA` o `RXH`
- El `status` de la planilla debe ser `DRAFT`, `APPROVED` o `PAID`
- Las fechas deben estar en formato `YYYY-MM-DD`

### Seguridad

- Todos los endpoints requieren autenticación JWT
- El `tenantId` se obtiene automáticamente del token JWT
- Solo se pueden acceder a las planillas del tenant del usuario autenticado

---

## Errores Comunes

### Error: "Payroll with ID X not found"

**Causa**: El ID de la planilla no existe o pertenece a otro tenant.

**Solución**: Verificar que el ID sea correcto y que la planilla pertenezca al tenant del usuario.

### Error: "DNI X: Empleado no encontrado en el sistema"

**Causa**: El empleado con ese DNI no existe en la base de datos.

**Solución**: Crear el empleado primero en el sistema antes de importarlo a la planilla.

### Error: "El archivo Excel no tiene hojas válidas"

**Causa**: El archivo está corrupto, vacío o no es un archivo Excel válido.

**Solución**: Verificar que el archivo sea un `.xlsx` válido y que tenga al menos una hoja con datos.

### Error: "Fila X: Tipo de contrato inválido"

**Causa**: El valor en la columna `contractType` no es exactamente `PLANILLA` o `RXH`.

**Solución**: Verificar que el valor esté escrito correctamente y en mayúsculas.


 
 - - - 
 
 
 
 # #   A P I   d e   G e s t i � � n   d e   P l a n i l l a s 
 
 
 
 # # #   D e s c r i p c i � � n   G e n e r a l 
 
 
 
 E s t a   A P I   p e r m i t e   g e s t i o n a r   l a s   p l a n i l l a s   d e   p a g o   y   r e c i b o s   p o r   h o n o r a r i o s   ( R X H )   d e   l o s   e m p l e a d o s . 
 
 
 
 # # #   E n d p o i n t s 
 
 
 
 # # #   1 .   C r e a r   P l a n i l l a   ( C a b e c e r a ) 
 
 
 
 * * P O S T * *   ` / p a y r o l l s ` 
 
 
 
 C r e a   u n a   n u e v a   p l a n i l l a . 
 
 
 
 # # # #   B o d y   ( J S O N ) 
 
 
 
 |   C a m p o   |   T i p o   |   R e q u e r i d o   |   D e s c r i p c i � � n   | 
 
 | - - - | - - - | - - - | - - - | 
 
 |   s t a r t D a t e   |   s t r i n g   |   S � �   |   F e c h a   d e   i n i c i o   ( Y Y Y Y - M M - D D )   | 
 
 |   e n d D a t e   |   s t r i n g   |   S � �   |   F e c h a   d e   f i n   ( Y Y Y Y - M M - D D )   | 
 
 |   t o t a l T o P a y   |   n u m b e r   |   S � �   |   T o t a l   a   p a g a r   | 
 
 |   p a y m e n t P r o o f   |   s t r i n g   |   N o   |   U R L   d e   l a   c o n s t a n c i a   d e   p a g o   g l o b a l   | 
 
 |   s t a t u s   |   s t r i n g   |   N o   |   E s t a d o   ( D R A F T ,   A P P R O V E D ,   P A I D ) .   D e f a u l t :   D R A F T   | 
 
 |   c o m m e n t s   |   s t r i n g   |   N o   |   C o m e n t a r i o s   g e n e r a l e s   | 
 
 
 
 # # # #   E j e m p l o   d e   R e q u e s t 
 
 
 
 ` ` ` j s o n 
 
 { 
 
     " s t a r t D a t e " :   " 2 0 2 4 - 0 1 - 0 1 " , 
 
     " e n d D a t e " :   " 2 0 2 4 - 0 1 - 3 1 " , 
 
     " t o t a l T o P a y " :   1 5 0 0 0 . 5 0 , 
 
     " c o m m e n t s " :   " P l a n i l l a   E n e r o   2 0 2 4 " 
 
 } 
 
 ` ` ` 
 
 
 
 # # #   2 .   L i s t a r   P l a n i l l a s 
 
 
 
 * * G E T * *   ` / p a y r o l l s ` 
 
 
 
 O b t i e n e   t o d a s   l a s   p l a n i l l a s   d e l   t e n a n t   a c t u a l . 
 
 
 
 # # #   3 .   O b t e n e r   P l a n i l l a   p o r   I D 
 
 
 
 * * G E T * *   ` / p a y r o l l s / : i d ` 
 
 
 
 O b t i e n e   u n a   p l a n i l l a   e s p e c � � f i c a . 
 
 
 
 # # #   4 .   A c t u a l i z a r   P l a n i l l a 
 
 
 
 * * P U T * *   ` / p a y r o l l s / : i d ` 
 
 
 
 A c t u a l i z a   l o s   d a t o s   d e   u n a   p l a n i l l a . 
 
 
 
 # # #   5 .   E l i m i n a r   P l a n i l l a 
 
 
 
 * * D E L E T E * *   ` / p a y r o l l s / : i d ` 
 
 
 
 E l i m i n a   u n a   p l a n i l l a   y   s u s   d e t a l l e s   a s o c i a d o s . 
 
 
 
 # # #   6 .   A g r e g a r   D e t a l l e   a   P l a n i l l a 
 
 
 
 * * P O S T * *   ` / p a y r o l l s / : i d / d e t a i l s ` 
 
 
 
 A g r e g a   u n   e m p l e a d o   ( d e t a l l e )   a   u n a   p l a n i l l a   e x i s t e n t e . 
 
 
 
 # # # #   B o d y   ( J S O N ) 
 
 
 
 |   C a m p o   |   T i p o   |   R e q u e r i d o   |   D e s c r i p c i � � n   | 
 
 | - - - | - - - | - - - | - - - | 
 
 |   e m p l o y e e I d   |   s t r i n g   |   S � �   |   I D   d e l   e m p l e a d o   | 
 
 |   f i r s t N a m e   |   s t r i n g   |   S � �   |   N o m b r e   | 
 
 |   l a s t N a m e   |   s t r i n g   |   S � �   |   A p e l l i d o   | 
 
 |   d n i   |   s t r i n g   |   S � �   |   D N I   | 
 
 |   c o n t r a c t T y p e   |   s t r i n g   |   S � �   |   P L A N I L L A   o   R X H   | 
 
 |   s t a r t D a t e   |   s t r i n g   |   S � �   |   F e c h a   i n i c i o   p e r i o d o   e m p l e a d o   | 
 
 |   e n d D a t e   |   s t r i n g   |   S � �   |   F e c h a   f i n   p e r i o d o   e m p l e a d o   | 
 
 |   w o r k e d H o u r s   |   n u m b e r   |   S � �   |   H o r a s   t r a b a j a d a s   | 
 
 |   a b s e n c e s   |   n u m b e r   |   S � �   |   D � � a s   d e   i n a s i s t e n c i a   | 
 
 |   d i s c o u n t s   |   n u m b e r   |   S � �   |   D e s c u e n t o s   | 
 
 |   b o n u s e s   |   n u m b e r   |   S � �   |   B o n i f i c a c i o n e s   | 
 
 |   t o t a l I n c o m e   |   n u m b e r   |   S � �   |   I n g r e s o   t o t a l   b r u t o   | 
 
 |   t o t a l T o P a y   |   n u m b e r   |   S � �   |   T o t a l   n e t o   a   p a g a r   | 
 
 |   c o m m e n t s   |   s t r i n g   |   N o   |   C o m e n t a r i o s   | 
 
 |   p a y m e n t P r o o f   |   s t r i n g   |   N o   |   U R L   c o n s t a n c i a   p a g o   i n d i v i d u a l   | 
 
 |   r e t e n t i o n   |   n u m b e r   |   N o   |   R e t e n c i � � n   ( S o l o   R X H )   | 
 
 |   p e n s i o n S y s t e m   |   s t r i n g   |   N o   |   S i s t e m a   p e n s i � � n   ( S o l o   P l a n i l l a )   | 
 
 |   p e n s i o n C o n t r i b u t i o n   |   n u m b e r   |   N o   |   A p o r t e   p e n s i � � n   ( S o l o   P l a n i l l a )   | 
 
 |   e s s a l u d C o n t r i b u t i o n   |   n u m b e r   |   N o   |   A p o r t e   E s S a l u d   ( S o l o   P l a n i l l a )   | 
 
 
 
 # # # #   E j e m p l o   d e   R e q u e s t 
 
 
 
 ` ` ` j s o n 
 
 { 
 
     " e m p l o y e e I d " :   " 5 0 7 f 1 f 7 7 b c f 8 6 c d 7 9 9 4 3 9 0 1 1 " , 
 
     " f i r s t N a m e " :   " J u a n " , 
 
     " l a s t N a m e " :   " P � � r e z " , 
 
     " d n i " :   " 1 2 3 4 5 6 7 8 " , 
 
     " c o n t r a c t T y p e " :   " P L A N I L L A " , 
 
     " s t a r t D a t e " :   " 2 0 2 4 - 0 1 - 0 1 " , 
 
     " e n d D a t e " :   " 2 0 2 4 - 0 1 - 3 1 " , 
 
     " w o r k e d H o u r s " :   1 6 0 , 
 
     " a b s e n c e s " :   0 , 
 
     " d i s c o u n t s " :   5 0 , 
 
     " b o n u s e s " :   1 0 0 , 
 
     " t o t a l I n c o m e " :   2 0 0 0 , 
 
     " t o t a l T o P a y " :   1 8 0 0 , 
 
     " p e n s i o n S y s t e m " :   " A F P   I N T E G R A " , 
 
     " p e n s i o n C o n t r i b u t i o n " :   2 0 0 , 
 
     " e s s a l u d C o n t r i b u t i o n " :   1 8 0 
 
 } 
 
 ` ` ` 
 
 
 
 # # #   7 .   O b t e n e r   D e t a l l e s   d e   P l a n i l l a 
 
 
 
 * * G E T * *   ` / p a y r o l l s / : i d / d e t a i l s ` 
 
 
 
 O b t i e n e   t o d o s   l o s   d e t a l l e s   ( e m p l e a d o s )   d e   u n a   p l a n i l l a . 
 
 
 
 # # #   8 .   A c t u a l i z a r   D e t a l l e 
 
 
 
 * * P U T * *   ` / p a y r o l l s / d e t a i l s / : d e t a i l I d ` 
 
 
 
 A c t u a l i z a   u n   d e t a l l e   e s p e c � � f i c o . 
 
 
 
 # # #   9 .   E l i m i n a r   D e t a l l e 
 
 
 
 * * D E L E T E * *   ` / p a y r o l l s / d e t a i l s / : d e t a i l I d ` 
 
 
 
 E l i m i n a   u n   d e t a l l e   e s p e c � � f i c o . 
 
 