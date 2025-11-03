# API de CRM (Customer Relationship Management)

Esta documentación describe todos los endpoints disponibles para gestionar el sistema CRM, incluyendo leads, contactos y seguimientos.

## Base URL

```
/crm
```

## Autenticación

Todos los endpoints requieren autenticación JWT. El token debe enviarse en el header `Authorization`:

```
Authorization: Bearer <token>
```

---

## Módulo: Leads (Posibles Clientes)

### Base URL

```
/crm/leads
```

### 1. Crear Lead

Crea un nuevo lead (posible cliente).

**Endpoint:** `POST /crm/leads`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Payload:**

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
  "companyId": "507f1f77bcf86cd799439012"
}
```

**Campos:**

| Campo                      | Tipo              | Requerido | Descripción                                                                                       |
| -------------------------- | ----------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `name`                     | string            | Sí        | Nombre del lead (2-120 caracteres)                                                                |
| `contact`                  | object            | Sí        | Información del contacto principal                                                                |
| `contact.name`             | string            | Sí        | Nombre completo del contacto (2-100 caracteres)                                                   |
| `contact.email`            | string            | Sí        | Email del contacto (formato válido)                                                               |
| `contact.phone`            | string            | No        | Teléfono del contacto (5-20 caracteres)                                                           |
| `contact.position`         | string            | No        | Cargo del contacto (2-50 caracteres)                                                              |
| `contact.department`       | string            | No        | Departamento del contacto (2-50 caracteres)                                                       |
| `company`                  | object            | No        | Información de la empresa                                                                         |
| `company.name`             | string            | No        | Nombre de la empresa (2-120 caracteres)                                                           |
| `company.taxId`            | string            | No        | Identificación fiscal RUC/DNI (5-20 caracteres)                                                   |
| `company.sector`           | string            | No        | Sector de la empresa (2-50 caracteres)                                                            |
| `company.companySize`      | string            | No        | Tamaño de la empresa (2-50 caracteres)                                                            |
| `company.website`          | string            | No        | Sitio web (5-200 caracteres)                                                                      |
| `location`                 | object            | No        | Ubicación del lead                                                                                |
| `location.paisCodigo`      | string            | No        | Código del país (2-3 caracteres)                                                                  |
| `location.provinciaCodigo` | string            | No        | Código de la provincia (2-50 caracteres)                                                          |
| `location.distritoCodigo`  | string            | No        | Código del distrito (2-50 caracteres)                                                             |
| `location.direccion`       | string            | No        | Dirección específica (5-200 caracteres)                                                           |
| `status`                   | enum              | No        | Estado del lead (NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, CONVERTED, LOST). Default: NEW |
| `source`                   | enum              | No        | Origen del lead (WEBSITE, REFERRAL, SOCIAL_MEDIA, EMAIL, PHONE, EVENT, OTHER). Default: OTHER     |
| `estimatedValue`           | number            | No        | Valor estimado del lead (≥ 0)                                                                     |
| `notes`                    | string            | No        | Notas adicionales (máx. 1000 caracteres)                                                          |
| `assignedTo`               | string (ObjectId) | No        | ID del usuario asignado al lead                                                                   |
| `companyId`                | string (ObjectId) | No        | ID de la empresa de Momentum a la que pertenece el lead                                           |

**Estados de Lead:**

- `NEW`: Nuevo lead
- `CONTACTED`: Lead contactado
- `QUALIFIED`: Lead calificado
- `PROPOSAL`: Propuesta enviada
- `NEGOTIATION`: En negociación
- `CONVERTED`: Convertido en cliente
- `LOST`: Perdido

**Orígenes de Lead:**

- `WEBSITE`: Sitio web
- `REFERRAL`: Referencia
- `SOCIAL_MEDIA`: Redes sociales
- `EMAIL`: Email
- `PHONE`: Teléfono
- `EVENT`: Evento
- `OTHER`: Otro

**Respuesta Exitosa (201):**

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
  "companyId": "507f1f77bcf86cd799439012",
  "documents": [],
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Errores:**

- `400 Bad Request`: Datos de entrada inválidos
- `401 Unauthorized`: Token inválido o expirado

---

### 2. Listar Leads

Obtiene una lista de leads con filtros opcionales.

**Endpoint:** `GET /crm/leads`

**Query Parameters:**

| Parámetro    | Tipo              | Requerido | Descripción                                                                            |
| ------------ | ----------------- | --------- | -------------------------------------------------------------------------------------- |
| `status`     | enum              | No        | Filtrar por estado (NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, CONVERTED, LOST) |
| `source`     | string            | No        | Filtrar por origen                                                                     |
| `assignedTo` | string (ObjectId) | No        | Filtrar por usuario asignado                                                           |
| `companyId`  | string (ObjectId) | No        | Filtrar por empresa de Momentum                                                        |
| `search`     | string            | No        | Búsqueda por texto en nombre, email, empresa, notas                                    |

**Ejemplo:**

```
GET /crm/leads?status=NEW&companyId=507f1f77bcf86cd799439012&search=TechCorp
```

**Respuesta Exitosa (200):**

```json
[
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
    "assignedTo": "507f1f77bcf86cd799439011",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

---

### 3. Obtener Estadísticas de Leads

Obtiene estadísticas agregadas de leads.

**Endpoint:** `GET /crm/leads/statistics`

**Query Parameters:**

| Parámetro    | Tipo              | Requerido | Descripción                     |
| ------------ | ----------------- | --------- | ------------------------------- |
| `assignedTo` | string (ObjectId) | No        | Filtrar por usuario asignado    |
| `companyId`  | string (ObjectId) | No        | Filtrar por empresa de Momentum |

**Ejemplo:**

```
GET /crm/leads/statistics?assignedTo=507f1f77bcf86cd799439011&companyId=507f1f77bcf86cd799439012
```

**Respuesta Exitosa (200):**

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
    "REFERRAL": 40,
    "EMAIL": 30,
    "SOCIAL_MEDIA": 20,
    "PHONE": 10
  },
  "totalValue": 7500000
}
```

---

### 4. Obtener Lead por ID

Obtiene un lead específico por su ID.

**Endpoint:** `GET /crm/leads/:id`

**Ejemplo:**

```
GET /crm/leads/507f1f77bcf86cd799439011
```

**Respuesta Exitosa (200):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "TechCorp S.A.",
  "contact": { ... },
  "company": { ... },
  "location": { ... },
  "status": "NEW",
  "source": "WEBSITE",
  "estimatedValue": 50000,
  "notes": "Interesado en solución ERP",
  "assignedTo": "507f1f77bcf86cd799439011",
  "companyId": "507f1f77bcf86cd799439012",
  "documents": [],
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Errores:**

- `404 Not Found`: Lead no encontrado
- `400 Bad Request`: ID inválido

---

### 5. Actualizar Lead

Actualiza un lead existente.

**Endpoint:** `PATCH /crm/leads/:id`

**Payload:** Todos los campos son opcionales, solo se actualizan los campos enviados.

```json
{
  "status": "CONTACTED",
  "notes": "Cliente contactado, agendar reunión",
  "estimatedValue": 60000
}
```

**Respuesta Exitosa (200):** Retorna el lead actualizado.

**Errores:**

- `404 Not Found`: Lead no encontrado
- `400 Bad Request`: Datos de entrada inválidos

---

### 6. Eliminar Lead

Elimina un lead.

**Endpoint:** `DELETE /crm/leads/:id`

**Respuesta Exitosa (200):**

```json
{
  "deleted": true
}
```

**Errores:**

- `404 Not Found`: Lead no encontrado

---

### 7. Convertir Lead a Cliente

Convierte un lead en cliente y actualiza su estado.

**Endpoint:** `POST /crm/leads/:id/convert-to-client/:clientId`

**Parámetros:**

- `id`: ID del lead
- `clientId`: ID del cliente creado

**Ejemplo:**

```
POST /crm/leads/507f1f77bcf86cd799439011/convert-to-client/507f1f77bcf86cd799439012
```

**Respuesta Exitosa (200):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "CONVERTED",
  "convertedToClientId": "507f1f77bcf86cd799439012",
  "convertedAt": "2024-01-20T10:00:00.000Z",
  ...
}
```

**Errores:**

- `404 Not Found`: Lead o cliente no encontrado
- `400 Bad Request`: IDs inválidos

---

### 8. Subir Documento a Lead

Sube un documento a un lead.

**Endpoint:** `POST /crm/leads/:id/documents`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body:**

- `file`: Archivo a subir (form-data)

**Ejemplo usando curl:**

```bash
curl -X POST \
  http://localhost:3000/crm/leads/507f1f77bcf86cd799439011/documents \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@documento.pdf'
```

**Respuesta Exitosa (200):** Retorna el lead con el documento agregado.

---

## Módulo: Empresas (Companies)

### Base URL

```
/crm/companies
```

### 1. Crear Empresa

Crea una nueva empresa de Momentum.

**Endpoint:** `POST /crm/companies`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Payload:**

```json
{
  "name": "Momentum Tech S.A.",
  "code": "MOMTECH-001",
  "taxId": "20123456789",
  "description": "Empresa líder en soluciones tecnológicas",
  "email": "contacto@momentumtech.com",
  "phone": "+51 987654321",
  "website": "https://www.momentumtech.com",
  "address": "Av. Principal 123, Lima",
  "isActive": true
}
```

**Campos:**

| Campo         | Tipo    | Requerido | Descripción                                      |
| ------------- | ------- | --------- | ------------------------------------------------ |
| `name`        | string  | Sí        | Nombre de la empresa (2-120 caracteres)          |
| `code`        | string  | No        | Código único de la empresa (2-50 caracteres)     |
| `taxId`       | string  | No        | Identificación fiscal RUC/DNI (5-20 caracteres)  |
| `description` | string  | No        | Descripción de la empresa (máx. 500 caracteres)  |
| `email`       | string  | No        | Email principal (formato válido)                 |
| `phone`       | string  | No        | Teléfono principal (5-20 caracteres)             |
| `website`     | string  | No        | Sitio web (5-200 caracteres)                     |
| `address`     | string  | No        | Dirección de la empresa (5-200 caracteres)       |
| `isActive`    | boolean | No        | Indica si la empresa está activa (default: true) |

**Respuesta Exitosa (201):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Momentum Tech S.A.",
  "code": "MOMTECH-001",
  "taxId": "20123456789",
  "description": "Empresa líder en soluciones tecnológicas",
  "email": "contacto@momentumtech.com",
  "phone": "+51 987654321",
  "website": "https://www.momentumtech.com",
  "address": "Av. Principal 123, Lima",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Errores:**

- `400 Bad Request`: Datos de entrada inválidos
- `409 Conflict`: Nombre o código ya existe
- `401 Unauthorized`: Token inválido o expirado

---

### 2. Listar Empresas

Obtiene una lista de empresas con filtros opcionales.

**Endpoint:** `GET /crm/companies`

**Query Parameters:**

| Parámetro  | Tipo    | Requerido | Descripción                                             |
| ---------- | ------- | --------- | ------------------------------------------------------- |
| `search`   | string  | No        | Búsqueda por texto en nombre, código, RUC o descripción |
| `isActive` | boolean | No        | Filtrar por estado activo/inactivo                      |

**Ejemplo:**

```
GET /crm/companies?search=Momentum&isActive=true
```

**Respuesta Exitosa (200):** Array de empresas ordenadas por nombre.

---

### 3. Obtener Empresa por Código

Obtiene una empresa por su código único.

**Endpoint:** `GET /crm/companies/code/:code`

**Ejemplo:**

```
GET /crm/companies/code/MOMTECH-001
```

**Respuesta Exitosa (200):** Objeto de empresa.

**Errores:**

- `404 Not Found`: Empresa no encontrada

---

### 4. Obtener Empresa por ID

Obtiene una empresa específica por su ID.

**Endpoint:** `GET /crm/companies/:id`

**Ejemplo:**

```
GET /crm/companies/507f1f77bcf86cd799439011
```

**Respuesta Exitosa (200):** Objeto de empresa.

**Errores:**

- `404 Not Found`: Empresa no encontrada
- `400 Bad Request`: ID inválido

---

### 5. Actualizar Empresa

Actualiza una empresa existente.

**Endpoint:** `PATCH /crm/companies/:id`

**Payload:** Todos los campos son opcionales, solo se actualizan los campos enviados.

```json
{
  "description": "Empresa líder actualizada",
  "phone": "+51 987654322"
}
```

**Respuesta Exitosa (200):** Retorna la empresa actualizada.

**Errores:**

- `404 Not Found`: Empresa no encontrada
- `400 Bad Request`: Datos de entrada inválidos
- `409 Conflict`: Nombre o código duplicado

---

### 6. Activar Empresa

Activa una empresa.

**Endpoint:** `POST /crm/companies/:id/activate`

**Respuesta Exitosa (200):** Retorna la empresa activada.

**Errores:**

- `404 Not Found`: Empresa no encontrada

---

### 7. Desactivar Empresa

Desactiva una empresa.

**Endpoint:** `POST /crm/companies/:id/deactivate`

**Respuesta Exitosa (200):** Retorna la empresa desactivada.

**Errores:**

- `404 Not Found`: Empresa no encontrada

---

### 8. Eliminar Empresa

Elimina una empresa.

**Endpoint:** `DELETE /crm/companies/:id`

**Respuesta Exitosa (200):**

```json
{
  "deleted": true
}
```

**Errores:**

- `404 Not Found`: Empresa no encontrada

---

## Módulo: Contactos

### Base URL

```
/crm/contacts
```

### 1. Crear Contacto

Crea un nuevo contacto asociado a un cliente.

**Endpoint:** `POST /crm/contacts`

**Payload:**

```json
{
  "name": "Juan Pérez",
  "email": "juan.perez@example.com",
  "phone": "+51 987654321",
  "mobile": "+51 987654322",
  "position": "Gerente de TI",
  "department": "Tecnología",
  "clientId": "507f1f77bcf86cd799439011",
  "isPrimary": true,
  "notes": "Prefiere contacto por email",
  "assignedTo": "507f1f77bcf86cd799439011"
}
```

**Campos:**

| Campo        | Tipo              | Requerido | Descripción                                         |
| ------------ | ----------------- | --------- | --------------------------------------------------- |
| `name`       | string            | Sí        | Nombre completo del contacto (2-100 caracteres)     |
| `email`      | string            | Sí        | Email del contacto (formato válido)                 |
| `phone`      | string            | No        | Teléfono del contacto (5-20 caracteres)             |
| `mobile`     | string            | No        | Teléfono móvil alternativo (5-20 caracteres)        |
| `position`   | string            | No        | Cargo del contacto (2-50 caracteres)                |
| `department` | string            | No        | Departamento del contacto (2-50 caracteres)         |
| `clientId`   | string (ObjectId) | Sí        | ID del cliente al que pertenece                     |
| `isPrimary`  | boolean           | No        | Indica si es el contacto principal (default: false) |
| `notes`      | string            | No        | Notas adicionales (máx. 500 caracteres)             |
| `assignedTo` | string (ObjectId) | No        | ID del usuario asignado para seguimiento            |

**Respuesta Exitosa (201):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Juan Pérez",
  "email": "juan.perez@example.com",
  "phone": "+51 987654321",
  "mobile": "+51 987654322",
  "position": "Gerente de TI",
  "department": "Tecnología",
  "clientId": "507f1f77bcf86cd799439012",
  "isPrimary": true,
  "notes": "Prefiere contacto por email",
  "assignedTo": "507f1f77bcf86cd799439011",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

---

### 2. Listar Contactos

Obtiene una lista de contactos con filtros opcionales.

**Endpoint:** `GET /crm/contacts`

**Query Parameters:**

| Parámetro    | Tipo              | Requerido | Descripción                                              |
| ------------ | ----------------- | --------- | -------------------------------------------------------- |
| `clientId`   | string (ObjectId) | No        | Filtrar por cliente                                      |
| `assignedTo` | string (ObjectId) | No        | Filtrar por usuario asignado                             |
| `isPrimary`  | boolean           | No        | Filtrar por contacto principal                           |
| `search`     | string            | No        | Búsqueda por texto en nombre, email, cargo, departamento |

**Ejemplo:**

```
GET /crm/contacts?clientId=507f1f77bcf86cd799439011&isPrimary=true
```

**Respuesta Exitosa (200):** Array de contactos.

---

### 3. Obtener Contactos de un Cliente

Obtiene todos los contactos asociados a un cliente.

**Endpoint:** `GET /crm/contacts/client/:clientId`

**Ejemplo:**

```
GET /crm/contacts/client/507f1f77bcf86cd799439011
```

**Respuesta Exitosa (200):** Array de contactos ordenados por contacto principal primero.

---

### 4. Obtener Contacto por ID

**Endpoint:** `GET /crm/contacts/:id`

**Respuesta Exitosa (200):** Objeto de contacto.

**Errores:**

- `404 Not Found`: Contacto no encontrado

---

### 5. Actualizar Contacto

**Endpoint:** `PATCH /crm/contacts/:id`

**Payload:** Todos los campos son opcionales.

**Nota:** Si se marca un contacto como principal (`isPrimary: true`), automáticamente se desmarcarán los demás contactos principales del mismo cliente.

---

### 6. Eliminar Contacto

**Endpoint:** `DELETE /crm/contacts/:id`

**Respuesta Exitosa (200):**

```json
{
  "deleted": true
}
```

---

## Módulo: Seguimientos (Follow-ups)

### Base URL

```
/crm/follow-ups
```

### 1. Crear Seguimiento

Crea un nuevo seguimiento asociado a un lead, contacto o cliente.

**Endpoint:** `POST /crm/follow-ups`

**Payload:**

```json
{
  "title": "Llamada de seguimiento inicial",
  "description": "Cliente interesado en solución ERP, discutir requerimientos",
  "type": "CALL",
  "status": "SCHEDULED",
  "scheduledDate": "2024-01-15T10:00:00.000Z",
  "leadId": "507f1f77bcf86cd799439011",
  "contactId": "507f1f77bcf86cd799439012",
  "clientId": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439014",
  "attachments": ["https://example.com/doc.pdf"],
  "outcome": "Cliente mostró interés, enviar propuesta",
  "nextFollowUpDate": "2024-01-20T10:00:00.000Z"
}
```

**Campos:**

| Campo              | Tipo              | Requerido | Descripción                                                       |
| ------------------ | ----------------- | --------- | ----------------------------------------------------------------- |
| `title`            | string            | Sí        | Título del seguimiento (3-100 caracteres)                         |
| `description`      | string            | Sí        | Descripción o notas (5-1000 caracteres)                           |
| `type`             | enum              | Sí        | Tipo de seguimiento (CALL, EMAIL, MEETING, NOTE, PROPOSAL, OTHER) |
| `status`           | enum              | No        | Estado (SCHEDULED, COMPLETED, CANCELLED). Default: SCHEDULED      |
| `scheduledDate`    | string (ISO)      | Sí        | Fecha y hora programada                                           |
| `leadId`           | string (ObjectId) | No\*      | ID del lead relacionado                                           |
| `contactId`        | string (ObjectId) | No\*      | ID del contacto relacionado                                       |
| `clientId`         | string (ObjectId) | No\*      | ID del cliente relacionado                                        |
| `userId`           | string (ObjectId) | Sí        | ID del usuario que realiza el seguimiento                         |
| `attachments`      | string[]          | No        | URLs de documentos adjuntos                                       |
| `outcome`          | string            | No        | Resultado del seguimiento (máx. 500 caracteres)                   |
| `nextFollowUpDate` | string (ISO)      | No        | Fecha del próximo seguimiento sugerido                            |

\* Debe proporcionarse al menos uno de: `leadId`, `contactId` o `clientId`.

**Tipos de Seguimiento:**

- `CALL`: Llamada telefónica
- `EMAIL`: Email
- `MEETING`: Reunión
- `NOTE`: Nota
- `PROPOSAL`: Propuesta
- `OTHER`: Otro

**Estados:**

- `SCHEDULED`: Programado
- `COMPLETED`: Completado
- `CANCELLED`: Cancelado

**Respuesta Exitosa (201):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Llamada de seguimiento inicial",
  "description": "Cliente interesado en solución ERP, discutir requerimientos",
  "type": "CALL",
  "status": "SCHEDULED",
  "scheduledDate": "2024-01-15T10:00:00.000Z",
  "leadId": "507f1f77bcf86cd799439012",
  "contactId": "507f1f77bcf86cd799439013",
  "clientId": "507f1f77bcf86cd799439014",
  "userId": "507f1f77bcf86cd799439015",
  "attachments": ["https://example.com/doc.pdf"],
  "outcome": "Cliente mostró interés, enviar propuesta",
  "nextFollowUpDate": "2024-01-20T10:00:00.000Z",
  "createdAt": "2024-01-15T09:00:00.000Z",
  "updatedAt": "2024-01-15T09:00:00.000Z"
}
```

**Nota:** Si el seguimiento está asociado a un contacto y se marca como completado, se actualiza automáticamente la fecha de último seguimiento del contacto.

---

### 2. Listar Seguimientos

Obtiene una lista de seguimientos con filtros opcionales.

**Endpoint:** `GET /crm/follow-ups`

**Query Parameters:**

| Parámetro   | Tipo              | Requerido | Descripción               |
| ----------- | ----------------- | --------- | ------------------------- |
| `leadId`    | string (ObjectId) | No        | Filtrar por lead          |
| `contactId` | string (ObjectId) | No        | Filtrar por contacto      |
| `clientId`  | string (ObjectId) | No        | Filtrar por cliente       |
| `userId`    | string (ObjectId) | No        | Filtrar por usuario       |
| `status`    | enum              | No        | Filtrar por estado        |
| `type`      | enum              | No        | Filtrar por tipo          |
| `startDate` | string (ISO)      | No        | Fecha de inicio del rango |
| `endDate`   | string (ISO)      | No        | Fecha de fin del rango    |

**Ejemplo:**

```
GET /crm/follow-ups?clientId=507f1f77bcf86cd799439011&status=SCHEDULED
```

---

### 3. Obtener Seguimientos Próximos

Obtiene los seguimientos programados próximos.

**Endpoint:** `GET /crm/follow-ups/upcoming`

**Query Parameters:**

| Parámetro | Tipo              | Requerido | Descripción                             |
| --------- | ----------------- | --------- | --------------------------------------- |
| `userId`  | string (ObjectId) | No        | Filtrar por usuario                     |
| `days`    | number            | No        | Número de días a adelantar (default: 7) |

**Ejemplo:**

```
GET /crm/follow-ups/upcoming?userId=507f1f77bcf86cd799439011&days=14
```

**Respuesta Exitosa (200):** Array de seguimientos ordenados por fecha programada ascendente.

---

### 4. Obtener Seguimientos de un Lead

**Endpoint:** `GET /crm/follow-ups/lead/:leadId`

**Ejemplo:**

```
GET /crm/follow-ups/lead/507f1f77bcf86cd799439011
```

---

### 5. Obtener Seguimientos de un Contacto

**Endpoint:** `GET /crm/follow-ups/contact/:contactId`

---

### 6. Obtener Seguimientos de un Cliente

**Endpoint:** `GET /crm/follow-ups/client/:clientId`

---

### 7. Obtener Seguimiento por ID

**Endpoint:** `GET /crm/follow-ups/:id`

---

### 8. Actualizar Seguimiento

**Endpoint:** `PATCH /crm/follow-ups/:id`

**Nota:** Si se marca como completado (`status: "COMPLETED"`), se establece automáticamente la fecha de completación.

---

### 9. Eliminar Seguimiento

**Endpoint:** `DELETE /crm/follow-ups/:id`

---

## Códigos de Estado HTTP

- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Datos de entrada inválidos
- `401 Unauthorized`: Token inválido o expirado
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error del servidor

---

## Notas Importantes

1. **Conversión de Leads a Clientes:** Cuando un lead se convierte en cliente, debe existir previamente el cliente en el sistema (módulo de clients). El endpoint de conversión actualiza el estado del lead y guarda la referencia al cliente.

2. **Contactos Principales:** Solo puede haber un contacto principal (`isPrimary: true`) por cliente. Al marcar un contacto como principal, se desmarcan automáticamente los demás.

3. **Seguimientos Automáticos:** Cuando se completa un seguimiento asociado a un contacto, se actualiza automáticamente la fecha de último seguimiento del contacto.

4. **Búsquedas:** Las búsquedas de texto son case-insensitive y buscan en múltiples campos relevantes de cada entidad.

5. **Índices:** Los esquemas incluyen índices optimizados para búsquedas frecuentes por estado, fechas, usuarios asignados y relaciones.

6. **Validaciones:** Todos los ObjectIds son validados antes de realizar operaciones para prevenir errores de base de datos.

7. **Empresas de Momentum:** Los leads pueden estar asociados a una empresa de Momentum mediante el campo `companyId`. Esto permite identificar a qué empresa pertenece cada lead y filtrar leads por empresa.

8. **Unicidad en Empresas:** El nombre de la empresa debe ser único. El código también puede ser único si se proporciona. Si se intenta crear o actualizar una empresa con un nombre o código duplicado, se retornará un error 409 Conflict.
