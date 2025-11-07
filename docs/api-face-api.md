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

