# API de Empleados

Esta documentación describe los endpoints disponibles para la gestión de empleados en el sistema Momentum.

## Descripción General

El módulo de empleados permite gestionar la información personal y laboral de los empleados de la empresa. Cada empleado está vinculado a un usuario del sistema mediante el campo `userId`, lo que permite asociar la información del empleado con su cuenta de usuario.

## 🏗️ Arquitectura del Sistema

### **Principios SOLID Aplicados:**

- **Single Responsibility**: 
  - `EmployeesService`: Responsable únicamente de la lógica de negocio de empleados
  - `EmployeesController`: Responsable únicamente del manejo de HTTP
  - `EmployeeSchema`: Define la estructura de datos de empleados

- **Open/Closed Principle**: 
  - El servicio es extensible para nuevos campos sin modificar código existente

- **Dependency Inversion Principle**: 
  - El servicio depende de abstracciones (Model de Mongoose) no de implementaciones concretas

### **Optimización de Consultas:**

El sistema implementa índices estratégicos en la base de datos para optimizar las consultas frecuentes:

- Índice único en `dni` (búsquedas rápidas por DNI)
- Índice único en `correo` (búsquedas rápidas por correo)
- Índice único en `numeroSeguroSocial` (búsquedas rápidas por número de seguro social)
- Índice en `userId` (búsquedas rápidas por usuario)
- Índice en `nombre` y `apellido` (búsquedas por nombre completo)
- Índice compuesto en `userId` y `createdAt` (ordenamiento por fecha)
- Índice compuesto en `userId` y `dni` (búsquedas por usuario y DNI)

---

## Estructura de Datos

### Employee Schema

```typescript
interface Employee {
  _id: string;                        // ID único del empleado
  nombre: string;                     // Nombre del empleado (2-100 caracteres)
  apellido: string;                   // Apellido del empleado (2-100 caracteres)
  dni: string;                        // Número de DNI (8 dígitos, único)
  correo: string;                     // Correo electrónico (único)
  telefono?: string;                   // Teléfono del empleado (opcional)
  direccion?: string;                  // Dirección del empleado (opcional, max 500 caracteres)
  numeroSeguroSocial: string;          // Número de seguro social (único)
  userId: {
    _id: string;                      // ID del usuario
    name: string;                     // Nombre del usuario
    email: string;                    // Email del usuario
    role: string;                     // Rol del usuario
  };                                  // Usuario asociado (populado)
  createdAt: Date;                    // Fecha de creación
  updatedAt: Date;                    // Fecha de última actualización
}
```

---

## Endpoints

### 1. Crear Empleado

**POST** `/employees`

Crea un nuevo empleado en el sistema. El empleado debe estar vinculado a un usuario existente mediante `userId`.

#### Request Body

```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "12345678",
  "correo": "juan.perez@example.com",
  "telefono": "+51987654321",
  "direccion": "Av. Principal 123, Lima",
  "numeroSeguroSocial": "12345678901",
  "userId": "507f1f77bcf86cd799439011"
}
```

#### Validaciones

- `nombre`: Requerido, entre 2 y 100 caracteres
- `apellido`: Requerido, entre 2 y 100 caracteres
- `dni`: Requerido, exactamente 8 dígitos, único en el sistema
- `correo`: Requerido, formato de email válido, único en el sistema
- `telefono`: Opcional, formato válido de teléfono
- `direccion`: Opcional, máximo 500 caracteres
- `numeroSeguroSocial`: Requerido, único en el sistema
- `userId`: Requerido, debe ser un ObjectId válido de MongoDB, debe existir un usuario con ese ID, no puede haber otro empleado vinculado al mismo usuario

#### Response (201 Created)

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "12345678",
  "correo": "juan.perez@example.com",
  "telefono": "+51987654321",
  "direccion": "Av. Principal 123, Lima",
  "numeroSeguroSocial": "12345678901",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "usuario@example.com",
    "role": "user"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: Datos inválidos o userId no válido
- `409 Conflict`: Ya existe un empleado con ese DNI, correo, número de seguro social o vinculado a ese usuario

---

### 2. Obtener Todos los Empleados

**GET** `/employees`

Obtiene una lista de todos los empleados con filtros opcionales.

#### Query Parameters

- `q` (string, opcional): Término de búsqueda que busca en nombre, apellido, DNI, correo y número de seguro social
- `userId` (string, opcional): Filtrar por ID de usuario

#### Ejemplos de Uso

```
GET /employees
GET /employees?q=juan
GET /employees?userId=507f1f77bcf86cd799439011
GET /employees?q=12345678&userId=507f1f77bcf86cd799439011
```

#### Response (200 OK)

```json
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "nombre": "Juan",
    "apellido": "Pérez",
    "dni": "12345678",
    "correo": "juan.perez@example.com",
    "telefono": "+51987654321",
    "direccion": "Av. Principal 123, Lima",
    "numeroSeguroSocial": "12345678901",
    "userId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Juan Pérez",
      "email": "usuario@example.com",
      "role": "user"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "nombre": "María",
    "apellido": "García",
    "dni": "87654321",
    "correo": "maria.garcia@example.com",
    "telefono": "+51912345678",
    "direccion": "Av. Secundaria 456, Lima",
    "numeroSeguroSocial": "98765432109",
    "userId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "María García",
      "email": "maria@example.com",
      "role": "admin"
    },
    "createdAt": "2024-01-16T10:30:00.000Z",
    "updatedAt": "2024-01-16T10:30:00.000Z"
  }
]
```

---

### 3. Obtener Empleado por ID

**GET** `/employees/:id`

Obtiene un empleado específico por su ID.

#### Path Parameters

- `id` (string): ID del empleado (ObjectId de MongoDB)

#### Response (200 OK)

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "12345678",
  "correo": "juan.perez@example.com",
  "telefono": "+51987654321",
  "direccion": "Av. Principal 123, Lima",
  "numeroSeguroSocial": "12345678901",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "usuario@example.com",
    "role": "user"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: ID inválido
- `404 Not Found`: Empleado no encontrado

---

### 4. Obtener Empleados por ID de Usuario

**GET** `/employees/user/:userId`

Obtiene todos los empleados vinculados a un usuario específico.

#### Path Parameters

- `userId` (string): ID del usuario (ObjectId de MongoDB)

#### Response (200 OK)

```json
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "nombre": "Juan",
    "apellido": "Pérez",
    "dni": "12345678",
    "correo": "juan.perez@example.com",
    "telefono": "+51987654321",
    "direccion": "Av. Principal 123, Lima",
    "numeroSeguroSocial": "12345678901",
    "userId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Juan Pérez",
      "email": "usuario@example.com",
      "role": "user"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Errores Posibles

- `400 Bad Request`: ID de usuario inválido

**Nota**: Normalmente solo habrá un empleado por usuario, pero el endpoint retorna un array para mantener consistencia con otros endpoints.

---

### 5. Obtener Empleado por DNI

**GET** `/employees/dni/:dni`

Obtiene un empleado específico por su número de DNI.

#### Path Parameters

- `dni` (string): Número de DNI (8 dígitos)

#### Ejemplo de Uso

```
GET /employees/dni/12345678
```

#### Response (200 OK)

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "12345678",
  "correo": "juan.perez@example.com",
  "telefono": "+51987654321",
  "direccion": "Av. Principal 123, Lima",
  "numeroSeguroSocial": "12345678901",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "usuario@example.com",
    "role": "user"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Errores Posibles

- `404 Not Found`: Empleado no encontrado

---

### 6. Actualizar Empleado

**PATCH** `/employees/:id`

Actualiza un empleado existente. Todos los campos son opcionales, solo se actualizan los campos proporcionados.

#### Path Parameters

- `id` (string): ID del empleado (ObjectId de MongoDB)

#### Request Body (todos los campos son opcionales)

```json
{
  "nombre": "Juan Carlos",
  "apellido": "Pérez García",
  "dni": "12345678",
  "correo": "juan.carlos.perez@example.com",
  "telefono": "+51987654322",
  "direccion": "Av. Nueva 456, Lima",
  "numeroSeguroSocial": "12345678901",
  "userId": "507f1f77bcf86cd799439011"
}
```

#### Validaciones

Las mismas validaciones que en la creación, pero aplicadas solo a los campos que se están actualizando. Además:
- No se puede actualizar a un DNI que ya existe en otro empleado
- No se puede actualizar a un correo que ya existe en otro empleado
- No se puede actualizar a un número de seguro social que ya existe en otro empleado
- No se puede actualizar a un userId que ya tiene otro empleado vinculado

#### Response (200 OK)

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "nombre": "Juan Carlos",
  "apellido": "Pérez García",
  "dni": "12345678",
  "correo": "juan.carlos.perez@example.com",
  "telefono": "+51987654322",
  "direccion": "Av. Nueva 456, Lima",
  "numeroSeguroSocial": "12345678901",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "usuario@example.com",
    "role": "user"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T11:00:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: Datos inválidos o IDs inválidos
- `404 Not Found`: Empleado no encontrado
- `409 Conflict`: Conflicto con datos únicos de otro empleado

---

### 7. Eliminar Empleado

**DELETE** `/employees/:id`

Elimina un empleado del sistema.

#### Path Parameters

- `id` (string): ID del empleado (ObjectId de MongoDB)

#### Response (200 OK)

```json
{
  "deleted": true,
  "id": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

#### Errores Posibles

- `400 Bad Request`: ID inválido
- `404 Not Found`: Empleado no encontrado

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200    | OK - Operación exitosa |
| 201    | Created - Recurso creado exitosamente |
| 400    | Bad Request - Datos de entrada inválidos |
| 404    | Not Found - Recurso no encontrado |
| 409    | Conflict - Conflicto con datos únicos (DNI, correo, número de seguro social o usuario duplicado) |
| 500    | Internal Server Error - Error del servidor |

---

## Validaciones Detalladas

### Campos Obligatorios para Crear Empleado

- **nombre**: 
  - Tipo: string
  - Longitud: 2-100 caracteres
  - Requerido: Sí

- **apellido**: 
  - Tipo: string
  - Longitud: 2-100 caracteres
  - Requerido: Sí

- **dni**: 
  - Tipo: string
  - Formato: Exactamente 8 dígitos numéricos
  - Patrón: `^\\d{8}$`
  - Único: Sí
  - Requerido: Sí

- **correo**: 
  - Tipo: string
  - Formato: Email válido
  - Único: Sí
  - Requerido: Sí
  - Normalización: Se convierte a minúsculas automáticamente

- **numeroSeguroSocial**: 
  - Tipo: string
  - Único: Sí
  - Requerido: Sí

- **userId**: 
  - Tipo: string (ObjectId de MongoDB)
  - Formato: ObjectId válido de MongoDB
  - Requerido: Sí
  - Validación: Debe existir un usuario con ese ID y no puede haber otro empleado vinculado al mismo usuario

### Campos Opcionales

- **telefono**: 
  - Tipo: string
  - Formato: Formato válido de teléfono
  - Patrón: `^[+]?[(]?[0-9]{1,4}[)]?[-\\s.]?[(]?[0-9]{1,4}[)]?[-\\s.]?[0-9]{1,9}$`
  - Requerido: No

- **direccion**: 
  - Tipo: string
  - Longitud máxima: 500 caracteres
  - Requerido: No

---

## Índices de Base de Datos

El sistema implementa los siguientes índices para optimizar las consultas:

### Índices Únicos

1. **dni**: Índice único para garantizar que no haya DNI duplicados
2. **correo**: Índice único para garantizar que no haya correos duplicados
3. **numeroSeguroSocial**: Índice único para garantizar que no haya números de seguro social duplicados

### Índices Simples

1. **nombre**: Índice para búsquedas rápidas por nombre
2. **apellido**: Índice para búsquedas rápidas por apellido
3. **userId**: Índice para búsquedas rápidas por usuario
4. **createdAt**: Índice descendente para ordenamiento por fecha de creación

### Índices Compuestos

1. **{ userId: 1, createdAt: -1 }**: Búsqueda por usuario ordenada por fecha de creación
2. **{ nombre: 1, apellido: 1 }**: Búsqueda por nombre completo
3. **{ userId: 1, dni: 1 }**: Búsqueda por usuario y DNI

---

## Notas de Implementación

1. **Principios SOLID**: El código sigue los principios SOLID con separación clara de responsabilidades entre controlador, servicio y schema.

2. **Consultas Optimizadas**: Se implementaron índices estratégicos para consultas rápidas, especialmente en campos únicos y campos de búsqueda frecuente.

3. **Validación de Unicidad**: El sistema valida que no existan duplicados en DNI, correo, número de seguro social y userId antes de crear o actualizar.

4. **Población de Datos**: Las respuestas incluyen automáticamente información del usuario asociado (name, email, role) mediante populate de Mongoose.

5. **Búsqueda Flexible**: Soporte para búsqueda por texto en múltiples campos (nombre, apellido, DNI, correo, número de seguro social).

6. **Normalización de Datos**: El correo se normaliza automáticamente a minúsculas antes de guardar.

7. **Validación de ObjectId**: Se valida que los IDs proporcionados sean ObjectIds válidos de MongoDB antes de realizar consultas.

8. **Relación con Usuarios**: Cada empleado está vinculado a un usuario mediante referencia, lo que permite asociar información personal con la cuenta de usuario del sistema.

---

## Ejemplos de Uso

### Crear un Empleado

```bash
curl -X POST http://localhost:3000/employees \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Pérez",
    "dni": "12345678",
    "correo": "juan.perez@example.com",
    "telefono": "+51987654321",
    "direccion": "Av. Principal 123, Lima",
    "numeroSeguroSocial": "12345678901",
    "userId": "507f1f77bcf86cd799439011"
  }'
```

### Buscar Empleados por Nombre

```bash
curl -X GET "http://localhost:3000/employees?q=juan"
```

### Obtener Empleados de un Usuario

```bash
curl -X GET "http://localhost:3000/employees/user/507f1f77bcf86cd799439011"
```

### Obtener Empleado por DNI

```bash
curl -X GET "http://localhost:3000/employees/dni/12345678"
```

### Actualizar Empleado

```bash
curl -X PATCH http://localhost:3000/employees/64f8a1b2c3d4e5f6a7b8c9d0 \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "+51987654322",
    "direccion": "Av. Nueva 456, Lima"
  }'
```

### Eliminar Empleado

```bash
curl -X DELETE http://localhost:3000/employees/64f8a1b2c3d4e5f6a7b8c9d0
```

---

## Consideraciones de Seguridad

1. **Autenticación**: Aunque no se muestra en los ejemplos, se recomienda implementar autenticación JWT para proteger los endpoints.

2. **Autorización**: Se recomienda implementar controles de acceso basados en roles para operaciones sensibles como eliminar empleados.

3. **Validación de Datos**: Todos los datos de entrada se validan antes de procesar, evitando inyecciones y datos malformados.

4. **Datos Sensibles**: El DNI y número de seguro social son datos sensibles. Se recomienda encriptar estos campos en producción o aplicar políticas de acceso estrictas.

