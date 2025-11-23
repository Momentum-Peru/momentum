# Documentación de API - Módulo CRM

Esta documentación describe todos los endpoints disponibles en el módulo CRM del sistema Tecmeing.

## Tabla de Contenidos

1. [Leads](#leads)
2. [Seguimientos (Follow-ups)](#seguimientos-follow-ups)
3. [Análisis de Audio con IA](#análisis-de-audio-con-ia)

## Autenticación y Tenant

Todos los endpoints requieren autenticación mediante Bearer Token y el header `X-Tenant-Id`:

```http
Authorization: Bearer <token>
X-Tenant-Id: <companyId>
```

---

## Leads

Base: `/crm/leads`

### POST `/crm/leads`

Crea un nuevo lead en el sistema.

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `X-Tenant-Id: <companyId>` (requerido)
- `Content-Type: application/json`

**Body:**
```json
{
  "name": "TechCorp S.A.",
  "contact": {
    "name": "Juan Pérez",
    "email": "juan.perez@techcorp.com",
    "phone": "+51 987654321",
    "position": "Gerente de TI",
    "department": "Tecnología"
  },
  "company": {
    "name": "TechCorp S.A.",
    "taxId": "20123456789",
    "sector": "Tecnología",
    "companySize": "50-100 empleados",
    "website": "https://www.techcorp.com"
  },
  "location": {
    "paisCodigo": "PE",
    "provinciaCodigo": "15",
    "distritoCodigo": "01",
    "direccion": "Av. Principal 123"
  },
  "status": "NEW",
  "source": "WEBSITE",
  "estimatedValue": 50000,
  "notes": "Interesado en solución ERP",
  "assignedTo": "507f1f77bcf86cd799439011",
  "companyId": "507f1f77bcf86cd799439011"
}
```

**Campos:**
- `name` (string, requerido): Nombre del lead
- `contact` (object, requerido): Información del contacto principal
  - `name` (string, requerido): Nombre completo
  - `email` (string, requerido): Email válido
  - `phone` (string, opcional): Teléfono
  - `position` (string, opcional): Cargo
  - `department` (string, opcional): Departamento
- `company` (object, opcional): Información de la empresa
- `location` (object, opcional): Ubicación del lead
- `status` (enum, opcional): Estado del lead. Valores: `NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL`, `NEGOTIATION`, `CONVERTED`, `LOST`. Default: `NEW`
- `source` (enum, opcional): Origen del lead. Valores: `WEBSITE`, `REFERRAL`, `SOCIAL_MEDIA`, `EMAIL`, `PHONE`, `EVENT`, `OTHER`. Default: `OTHER`
- `estimatedValue` (number, opcional): Valor estimado del lead
- `notes` (string, opcional): Notas adicionales
- `assignedTo` (ObjectId, opcional): ID del usuario asignado
- `companyId` (ObjectId, opcional): ID de la empresa de Momentum

**Respuestas:**
- `201 Created`: Lead creado exitosamente
- `400 Bad Request`: Datos de entrada inválidos
- `401 Unauthorized`: Token inválido o faltante
- `403 Forbidden`: Sin acceso al tenant
- `404 Not Found`: Empresa no encontrada (si se proporciona companyId)

**Ejemplo de respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "TechCorp S.A.",
  "contact": {
    "name": "Juan Pérez",
    "email": "juan.perez@techcorp.com",
    "phone": "+51 987654321",
    "position": "Gerente de TI",
    "department": "Tecnología"
  },
  "status": "NEW",
  "source": "WEBSITE",
  "estimatedValue": 50000,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

---

### GET `/crm/leads`

Lista todos los leads con filtros opcionales.

**Query Parameters:**
- `status` (enum, opcional): Filtrar por estado
- `source` (string, opcional): Filtrar por origen
- `assignedTo` (ObjectId, opcional): Filtrar por usuario asignado
- `companyId` (ObjectId, opcional): Filtrar por empresa de Momentum
- `search` (string, opcional): Búsqueda por texto (nombre, email, empresa, notas)

**Ejemplo:**
```http
GET /crm/leads?status=NEW&search=TechCorp
```

**Respuestas:**
- `200 OK`: Lista de leads obtenida exitosamente
- `400 Bad Request`: Parámetros de consulta inválidos

---

### GET `/crm/leads/statistics`

Obtiene estadísticas de leads.

**Query Parameters:**
- `assignedTo` (ObjectId, opcional): Filtrar por usuario asignado
- `companyId` (ObjectId, opcional): Filtrar por empresa de Momentum

**Respuesta:**
```json
{
  "total": 150,
  "byStatus": {
    "NEW": 45,
    "CONTACTED": 30,
    "QUALIFIED": 25,
    "PROPOSAL": 20,
    "NEGOTIATION": 15,
    "CONVERTED": 10,
    "LOST": 5
  },
  "bySource": {
    "WEBSITE": 50,
    "REFERRAL": 30,
    "EMAIL": 20,
    "OTHER": 50
  },
  "totalValue": 5000000
}
```

---

### GET `/crm/leads/:id`

Obtiene un lead específico por su ID.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del lead

**Respuestas:**
- `200 OK`: Lead obtenido exitosamente
- `400 Bad Request`: ID inválido
- `404 Not Found`: Lead no encontrado

---

### PATCH `/crm/leads/:id`

Actualiza un lead existente.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del lead

**Body:** (todos los campos son opcionales)
```json
{
  "name": "TechCorp S.A. Actualizado",
  "status": "CONTACTED",
  "estimatedValue": 60000,
  "notes": "Notas actualizadas"
}
```

**Validaciones:**
- Las transiciones de estado deben seguir el flujo válido:
  - `NEW` → `CONTACTED` o `LOST`
  - `CONTACTED` → `QUALIFIED`, `LOST` o `NEW`
  - `QUALIFIED` → `PROPOSAL`, `CONTACTED` o `LOST`
  - `PROPOSAL` → `NEGOTIATION`, `QUALIFIED` o `LOST`
  - `NEGOTIATION` → `CONVERTED`, `PROPOSAL` o `LOST`
  - `CONVERTED` → (estado final, no se puede cambiar)
  - `LOST` → `NEW` o `CONTACTED` (reactivación)

**Respuestas:**
- `200 OK`: Lead actualizado exitosamente
- `400 Bad Request`: Transición de estado inválida o datos inválidos
- `404 Not Found`: Lead no encontrado

---

### POST `/crm/leads/:id/status`

Actualiza únicamente el estado de un lead y registra la fecha de último contacto.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del lead

**Body:**
```json
{
  "status": "CONTACTED"
}
```

**Respuestas:**
- `200 OK`: Estado actualizado exitosamente
- `400 Bad Request`: Transición de estado inválida
- `404 Not Found`: Lead no encontrado

---

### DELETE `/crm/leads/:id`

Elimina un lead del sistema.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del lead

**Respuestas:**
- `200 OK`: Lead eliminado exitosamente
- `400 Bad Request`: ID inválido
- `404 Not Found`: Lead no encontrado

---

### POST `/crm/leads/:id/convert-to-client/:clientId`

Convierte un lead en cliente.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del lead
- `clientId` (ObjectId, requerido): ID del cliente creado

**Respuestas:**
- `200 OK`: Lead convertido exitosamente
- `400 Bad Request`: IDs inválidos
- `404 Not Found`: Lead o cliente no encontrado

**Nota:** Este endpoint cambia automáticamente el estado del lead a `CONVERTED` y registra la fecha de conversión.

---

### POST `/crm/leads/:id/documents`

Sube un documento a un lead.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del lead

**Content-Type:** `multipart/form-data`

**Body:**
- `file` (File, requerido): Archivo a subir (máximo 20MB)

**Formatos soportados:**
- Imágenes: jpg, jpeg, png, gif, webp, bmp, svg, tiff, heic, heif, ico, jfif, pjpeg, pjp, avif, apng
- Videos: mp4, mov, avi, mkv, webm, mpeg, mpg, m4v, 3gp, 3g2, flv, wmv, ts, m2ts, ogv
- Audio: mp3, wav, aac, ogg, m4a, flac, wma, aiff, opus
- Documentos: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, rtf, odt, ods, odp, csv
- Comprimidos: zip, rar, 7z, tar, gz

**Respuestas:**
- `200 OK`: Documento subido exitosamente
- `400 Bad Request`: Archivo inválido o demasiado grande
- `404 Not Found`: Lead no encontrado

---

### GET `/crm/leads/:id/follow-ups`

Obtiene todos los seguimientos asociados a un lead.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del lead

**Respuestas:**
- `200 OK`: Lista de seguimientos obtenida exitosamente
- `400 Bad Request`: ID inválido
- `404 Not Found`: Lead no encontrado

---

### POST `/crm/leads/:id/audio/presigned-url`

Genera una URL firmada (presigned URL) para subir un archivo de audio directamente a S3.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del lead

**Body:**
```json
{
  "fileName": "conversacion.mp3",
  "contentType": "audio/mpeg",
  "expirationTime": 3600
}
```

**Campos:**
- `fileName` (string, requerido): Nombre del archivo con extensión
- `contentType` (string, requerido): Tipo MIME del archivo (ej: `audio/mpeg`, `audio/wav`)
- `expirationTime` (number, opcional): Tiempo de expiración en segundos (mínimo 60, máximo 604800). Default: 3600

**Respuesta:**
```json
{
  "presignedUrl": "https://bucket.s3.region.amazonaws.com/crm/leads/lead-id/audio/timestamp_conversacion.mp3?X-Amz-Algorithm=...",
  "publicUrl": "https://bucket.s3.region.amazonaws.com/crm/leads/lead-id/audio/timestamp_conversacion.mp3",
  "key": "crm/leads/lead-id/audio/timestamp_conversacion.mp3"
}
```

**Flujo de uso:**
1. Frontend solicita la presigned URL a este endpoint
2. Frontend recibe la `presignedUrl` y `publicUrl`
3. Frontend sube el archivo directamente a S3 usando la `presignedUrl` (PUT request)
4. Frontend envía la `publicUrl` al endpoint de análisis de audio

**Respuestas:**
- `200 OK`: URL generada exitosamente
- `400 Bad Request`: Datos inválidos
- `404 Not Found`: Lead no encontrado

---

## Seguimientos (Follow-ups)

Base: `/crm/follow-ups`

### POST `/crm/follow-ups`

Crea un nuevo seguimiento.

**Body:**
```json
{
  "title": "Llamada de seguimiento inicial",
  "description": "Cliente interesado en solución ERP",
  "type": "CALL",
  "status": "SCHEDULED",
  "scheduledDate": "2024-01-15T10:00:00.000Z",
  "leadId": "507f1f77bcf86cd799439011",
  "clientId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439011",
  "attachments": ["https://s3.../documento.pdf"],
  "outcome": "Cliente mostró interés, enviar propuesta",
  "nextFollowUpDate": "2024-01-20T10:00:00.000Z"
}
```

**Campos:**
- `title` (string, requerido): Título del seguimiento
- `description` (string, requerido): Descripción o notas
- `type` (enum, requerido): Tipo de seguimiento. Valores: `CALL`, `EMAIL`, `MEETING`, `NOTE`, `PROPOSAL`, `OTHER`
- `status` (enum, opcional): Estado. Valores: `SCHEDULED`, `COMPLETED`, `CANCELLED`. Default: `SCHEDULED`
- `scheduledDate` (ISO date, requerido): Fecha y hora programada
- `leadId` (ObjectId, opcional): ID del lead relacionado (debe proporcionarse al menos leadId o clientId)
- `clientId` (ObjectId, opcional): ID del cliente relacionado
- `userId` (ObjectId, requerido): ID del usuario que realiza el seguimiento
- `attachments` (array de strings, opcional): URLs de documentos adjuntos
- `outcome` (string, opcional): Resultado del seguimiento
- `nextFollowUpDate` (ISO date, opcional): Fecha del próximo seguimiento sugerido

**Respuestas:**
- `201 Created`: Seguimiento creado exitosamente
- `400 Bad Request`: Datos inválidos o falta leadId/clientId

---

### GET `/crm/follow-ups`

Lista todos los seguimientos con filtros opcionales.

**Query Parameters:**
- `leadId` (ObjectId, opcional): Filtrar por lead
- `clientId` (ObjectId, opcional): Filtrar por cliente
- `userId` (ObjectId, opcional): Filtrar por usuario
- `status` (enum, opcional): Filtrar por estado
- `type` (enum, opcional): Filtrar por tipo
- `startDate` (ISO date, opcional): Fecha de inicio
- `endDate` (ISO date, opcional): Fecha de fin

**Ejemplo:**
```http
GET /crm/follow-ups?leadId=507f1f77bcf86cd799439011&status=SCHEDULED
```

---

### GET `/crm/follow-ups/upcoming`

Obtiene seguimientos próximos.

**Query Parameters:**
- `userId` (ObjectId, opcional): Filtrar por usuario
- `days` (number, opcional): Número de días a adelantar (default: 7)

**Ejemplo:**
```http
GET /crm/follow-ups/upcoming?userId=507f1f77bcf86cd799439011&days=14
```

---

### GET `/crm/follow-ups/lead/:leadId`

Obtiene todos los seguimientos de un lead específico.

**Path Parameters:**
- `leadId` (ObjectId, requerido): ID del lead

---

### GET `/crm/follow-ups/client/:clientId`

Obtiene todos los seguimientos de un cliente específico.

**Path Parameters:**
- `clientId` (ObjectId, requerido): ID del cliente

---

### GET `/crm/follow-ups/:id`

Obtiene un seguimiento específico por su ID.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del seguimiento

---

### PATCH `/crm/follow-ups/:id`

Actualiza un seguimiento existente.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del seguimiento

**Body:** (todos los campos son opcionales)
```json
{
  "status": "COMPLETED",
  "outcome": "Cliente aceptó la propuesta",
  "completedDate": "2024-01-15T11:00:00.000Z"
}
```

**Nota:** Si se marca como `COMPLETED`, se establece automáticamente la fecha de completación.

---

### DELETE `/crm/follow-ups/:id`

Elimina un seguimiento del sistema.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del seguimiento

---

## Análisis de Audio con IA

### POST `/crm/analyze-audio`

Analiza una conversación de audio usando IA (OpenAI Whisper + GPT-4o).

**Body:**
```json
{
  "audioUrl": "https://bucket.s3.region.amazonaws.com/crm/leads/lead-id/audio/conversacion.mp3",
  "leadId": "507f1f77bcf86cd799439011"
}
```

**Campos:**
- `audioUrl` (string, requerido): URL del archivo de audio en S3
- `leadId` (string, opcional): ID del lead al que asociar el análisis

**Respuesta:**
```json
{
  "summary": "Conversación sobre implementación de solución ERP. El cliente mostró interés en las funcionalidades de gestión de inventario y facturación electrónica. Se discutieron los tiempos de implementación y el presupuesto disponible.",
  "agreements": [
    "Reunión de seguimiento el próximo lunes a las 10:00 AM",
    "Envío de propuesta técnica detallada antes del viernes",
    "Demo de la solución la próxima semana"
  ],
  "improvementPoints": [
    "Cliente mencionó preocupaciones sobre el tiempo de implementación (esperaba menos tiempo)",
    "Necesita más información sobre la integración con su sistema actual"
  ],
  "followUpActions": [
    "Enviar propuesta detallada con cronograma de implementación",
    "Programar demo técnica enfocada en integraciones",
    "Preparar caso de éxito similar para compartir"
  ],
  "sentiment": "positive",
  "confidence": 0.95
}
```

**Campos de respuesta:**
- `summary` (string): Resumen ejecutivo de la conversación
- `agreements` (array de strings): Lista de acuerdos alcanzados
- `improvementPoints` (array de strings): Puntos de mejora o áreas de oportunidad identificadas
- `followUpActions` (array de strings): Acciones específicas de seguimiento recomendadas
- `sentiment` (enum): Sentimiento general: `positive`, `neutral`, `negative`
- `confidence` (number): Nivel de confianza del análisis (0-1)

**Nota:** Si se proporciona `leadId`, se actualiza automáticamente la fecha de último contacto del lead.

**Respuestas:**
- `200 OK`: Análisis completado exitosamente
- `400 Bad Request`: Error al analizar el audio (URL inválida, formato no soportado, etc.)

---

### POST `/crm/leads/:id/analyze-audio`

Analiza audio y lo asocia directamente a un lead específico.

**Path Parameters:**
- `id` (ObjectId, requerido): ID del lead

**Body:**
```json
{
  "audioUrl": "https://bucket.s3.region.amazonaws.com/crm/leads/lead-id/audio/conversacion.mp3"
}
```

**Respuestas:**
- `200 OK`: Análisis completado exitosamente
- `400 Bad Request`: Error al analizar el audio
- `404 Not Found`: Lead no encontrado

**Nota:** Este endpoint actualiza automáticamente la fecha de último contacto del lead.

---

## Flujo de Estados de Leads

El sistema implementa un flujo de estados controlado para los leads:

```
NEW → CONTACTED → QUALIFIED → PROPOSAL → NEGOTIATION → CONVERTED
  ↓         ↓           ↓           ↓            ↓
 LOST     LOST       LOST        LOST         LOST
  ↓
(NEW o CONTACTED) ← Reactivación desde LOST
```

**Estados:**
- `NEW`: Lead recién creado, sin contacto inicial
- `CONTACTED`: Se ha establecido contacto inicial con el lead
- `QUALIFIED`: Lead calificado como potencial cliente
- `PROPOSAL`: Se ha enviado una propuesta al lead
- `NEGOTIATION`: En proceso de negociación
- `CONVERTED`: Lead convertido en cliente (estado final)
- `LOST`: Lead perdido (puede reactivarse)

**Transiciones válidas:**
- `NEW` puede cambiar a: `CONTACTED`, `LOST`
- `CONTACTED` puede cambiar a: `QUALIFIED`, `LOST`, `NEW`
- `QUALIFIED` puede cambiar a: `PROPOSAL`, `CONTACTED`, `LOST`
- `PROPOSAL` puede cambiar a: `NEGOTIATION`, `QUALIFIED`, `LOST`
- `NEGOTIATION` puede cambiar a: `CONVERTED`, `PROPOSAL`, `LOST`
- `CONVERTED`: Estado final, no se puede cambiar
- `LOST` puede cambiar a: `NEW`, `CONTACTED` (reactivación)

---

## Códigos de Error Comunes

- `400 Bad Request`: Datos de entrada inválidos, transición de estado inválida, archivo inválido
- `401 Unauthorized`: Token de autenticación inválido o faltante
- `403 Forbidden`: Usuario sin acceso al tenant especificado
- `404 Not Found`: Recurso no encontrado (lead, seguimiento, empresa, etc.)
- `500 Internal Server Error`: Error interno del servidor

---

## Notas Importantes

1. **Multi-tenancy:** Todos los endpoints respetan el aislamiento por tenant mediante el header `X-Tenant-Id`.

2. **Validación de Estados:** Las transiciones de estado están validadas para mantener la integridad del flujo del CRM.

3. **Análisis de Audio:** El servicio de análisis de audio utiliza:
   - OpenAI Whisper para transcripción
   - GPT-4o para análisis y extracción de información estructurada
   - Requiere configuración de `OPENAI_API_KEY` en variables de entorno

4. **Presigned URLs:** Las URLs firmadas expiran después del tiempo especificado (default: 1 hora). El frontend debe subir el archivo antes de que expire.

5. **Formato de Fechas:** Todas las fechas deben estar en formato ISO 8601 (ej: `2024-01-15T10:00:00.000Z`).

---

## Ejemplos de Uso Completo

### Flujo completo: Crear lead, subir audio, analizar y crear seguimiento

1. **Crear lead:**
```http
POST /crm/leads
Content-Type: application/json

{
  "name": "TechCorp S.A.",
  "contact": {
    "name": "Juan Pérez",
    "email": "juan.perez@techcorp.com"
  },
  "source": "WEBSITE"
}
```

2. **Obtener presigned URL para audio:**
```http
POST /crm/leads/{leadId}/audio/presigned-url
Content-Type: application/json

{
  "fileName": "conversacion.mp3",
  "contentType": "audio/mpeg"
}
```

3. **Subir audio a S3** (usando la presignedUrl recibida)

4. **Analizar audio:**
```http
POST /crm/leads/{leadId}/analyze-audio
Content-Type: application/json

{
  "audioUrl": "https://bucket.s3.region.amazonaws.com/..."
}
```

5. **Crear seguimiento basado en el análisis:**
```http
POST /crm/follow-ups
Content-Type: application/json

{
  "title": "Seguimiento post-conversación",
  "description": "Basado en análisis de audio: Cliente interesado en demo técnica",
  "type": "CALL",
  "scheduledDate": "2024-01-20T10:00:00.000Z",
  "leadId": "{leadId}",
  "userId": "{userId}",
  "followUpActions": ["Enviar propuesta detallada", "Programar demo técnica"]
}
```

---

**Última actualización:** Enero 2024

