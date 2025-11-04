# API de Áreas

Esta documentación describe los endpoints disponibles para la gestión de áreas de la empresa en el sistema Momentum.

## Descripción General

El módulo de áreas permite gestionar las diferentes áreas o departamentos de la empresa (como Contabilidad, Recursos Humanos, Tecnología, etc.). Cada área puede tener un nombre, código opcional, descripción y estado activo/inactivo.

## 🏗️ Arquitectura del Sistema

### **Principios SOLID Aplicados:**

- **Single Responsibility**: 
  - `AreasService`: Responsable únicamente de la lógica de negocio de áreas
  - `AreasController`: Responsable únicamente del manejo de HTTP
  - `AreaSchema`: Define la estructura de datos de áreas

- **Open/Closed Principle**: 
  - El servicio es extensible para nuevos campos sin modificar código existente

- **Dependency Inversion Principle**: 
  - El servicio depende de abstracciones (Model de Mongoose) no de implementaciones concretas

### **Optimización de Consultas:**

El sistema implementa índices estratégicos en la base de datos para optimizar las consultas frecuentes:

- Índice único en `nombre` (búsquedas rápidas por nombre, garantiza unicidad)
- Índice único en `codigo` (búsquedas rápidas por código, garantiza unicidad cuando existe)
- Índice en `isActive` (filtros rápidos por estado activo)
- Índice compuesto en `isActive` y `createdAt` (búsqueda por estado ordenada por fecha)
- Índice de texto completo en `nombre`, `descripción` y `codigo` (búsquedas full-text)

---

## Estructura de Datos

### Area Schema

```typescript
interface Area {
  _id: string;                        // ID único del área
  nombre: string;                      // Nombre del área (2-100 caracteres, único)
  codigo?: string;                     // Código único del área (opcional, máximo 20 caracteres)
  descripcion?: string;                // Descripción del área (opcional, máximo 500 caracteres)
  isActive: boolean;                   // Estado activo del área (default: true)
  createdAt: Date;                     // Fecha de creación
  updatedAt: Date;                     // Fecha de última actualización
}
```

---

## Endpoints

### 1. Crear Área

**POST** `/areas`

Crea un nuevo área en el sistema.

#### Request Body

```json
{
  "nombre": "Contabilidad",
  "codigo": "CONT",
  "descripcion": "Área encargada de la gestión contable y financiera de la empresa",
  "isActive": true
}
```

#### Validaciones

- `nombre`: Requerido, entre 2 y 100 caracteres, único en el sistema
- `codigo`: Opcional, máximo 20 caracteres, único en el sistema si se proporciona
- `descripcion`: Opcional, máximo 500 caracteres
- `isActive`: Opcional, valor booleano (default: true)

#### Response (201 Created)

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "nombre": "Contabilidad",
  "codigo": "CONT",
  "descripcion": "Área encargada de la gestión contable y financiera de la empresa",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: Datos inválidos
- `409 Conflict`: Ya existe un área con ese nombre o código

---

### 2. Obtener Todas las Áreas

**GET** `/areas`

Obtiene una lista de todas las áreas con filtros opcionales.

#### Query Parameters

- `q` (string, opcional): Término de búsqueda que busca en nombre, código y descripción
- `isActive` (boolean, opcional): Filtrar por estado activo (true/false)

#### Ejemplos de Uso

```
GET /areas
GET /areas?q=contabilidad
GET /areas?isActive=true
GET /areas?q=cont&isActive=true
```

#### Response (200 OK)

```json
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "nombre": "Contabilidad",
    "codigo": "CONT",
    "descripcion": "Área encargada de la gestión contable y financiera de la empresa",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "nombre": "Recursos Humanos",
    "codigo": "RRHH",
    "descripcion": "Área encargada de la gestión del talento humano",
    "isActive": true,
    "createdAt": "2024-01-16T10:30:00.000Z",
    "updatedAt": "2024-01-16T10:30:00.000Z"
  }
]
```

---

### 3. Obtener Áreas Activas

**GET** `/areas/active`

Obtiene todas las áreas activas, ordenadas por nombre.

#### Response (200 OK)

```json
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "nombre": "Contabilidad",
    "codigo": "CONT",
    "descripcion": "Área encargada de la gestión contable y financiera de la empresa",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 4. Obtener Área por ID

**GET** `/areas/:id`

Obtiene un área específica por su ID.

#### Path Parameters

- `id` (string): ID del área (ObjectId de MongoDB)

#### Response (200 OK)

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "nombre": "Contabilidad",
  "codigo": "CONT",
  "descripcion": "Área encargada de la gestión contable y financiera de la empresa",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: ID inválido
- `404 Not Found`: Área no encontrada

---

### 5. Obtener Área por Código

**GET** `/areas/codigo/:codigo`

Obtiene un área específica por su código.

#### Path Parameters

- `codigo` (string): Código del área

#### Ejemplo de Uso

```
GET /areas/codigo/CONT
```

#### Response (200 OK)

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "nombre": "Contabilidad",
  "codigo": "CONT",
  "descripcion": "Área encargada de la gestión contable y financiera de la empresa",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Errores Posibles

- `404 Not Found`: Área no encontrada

---

### 6. Actualizar Área

**PATCH** `/areas/:id`

Actualiza un área existente. Todos los campos son opcionales, solo se actualizan los campos proporcionados.

#### Path Parameters

- `id` (string): ID del área (ObjectId de MongoDB)

#### Request Body (todos los campos son opcionales)

```json
{
  "nombre": "Contabilidad y Finanzas",
  "codigo": "CONT-FIN",
  "descripcion": "Área encargada de la gestión contable, financiera y fiscal",
  "isActive": true
}
```

#### Validaciones

Las mismas validaciones que en la creación, pero aplicadas solo a los campos que se están actualizando. Además:
- No se puede actualizar a un nombre que ya existe en otra área
- No se puede actualizar a un código que ya existe en otra área

#### Response (200 OK)

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "nombre": "Contabilidad y Finanzas",
  "codigo": "CONT-FIN",
  "descripcion": "Área encargada de la gestión contable, financiera y fiscal",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T11:00:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: Datos inválidos o IDs inválidos
- `404 Not Found`: Área no encontrada
- `409 Conflict`: Conflicto con datos únicos de otra área

---

### 7. Cambiar Estado Activo de un Área

**PUT** `/areas/:id/toggle-active`

Cambia el estado activo/inactivo de un área.

#### Path Parameters

- `id` (string): ID del área (ObjectId de MongoDB)

#### Request Body

```json
{
  "isActive": false
}
```

#### Response (200 OK)

```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "nombre": "Contabilidad",
  "codigo": "CONT",
  "descripcion": "Área encargada de la gestión contable y financiera de la empresa",
  "isActive": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T11:00:00.000Z"
}
```

#### Errores Posibles

- `400 Bad Request`: ID inválido
- `404 Not Found`: Área no encontrada

---

### 8. Eliminar Área

**DELETE** `/areas/:id`

Elimina un área del sistema.

#### Path Parameters

- `id` (string): ID del área (ObjectId de MongoDB)

#### Response (200 OK)

```json
{
  "deleted": true,
  "id": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

#### Errores Posibles

- `400 Bad Request`: ID inválido
- `404 Not Found`: Área no encontrada

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200    | OK - Operación exitosa |
| 201    | Created - Recurso creado exitosamente |
| 400    | Bad Request - Datos de entrada inválidos |
| 404    | Not Found - Recurso no encontrado |
| 409    | Conflict - Conflicto con datos únicos (nombre o código duplicado) |
| 500    | Internal Server Error - Error del servidor |

---

## Validaciones Detalladas

### Campos Obligatorios para Crear Área

- **nombre**: 
  - Tipo: string
  - Longitud: 2-100 caracteres
  - Requerido: Sí
  - Único: Sí
  - Normalización: Se trima automáticamente

### Campos Opcionales

- **codigo**: 
  - Tipo: string
  - Longitud máxima: 20 caracteres
  - Requerido: No
  - Único: Sí (si se proporciona)
  - Normalización: Se trima automáticamente

- **descripcion**: 
  - Tipo: string
  - Longitud máxima: 500 caracteres
  - Requerido: No
  - Normalización: Se trima automáticamente

- **isActive**: 
  - Tipo: boolean
  - Requerido: No
  - Valor por defecto: true

---

## Índices de Base de Datos

El sistema implementa los siguientes índices para optimizar las consultas:

### Índices Únicos

1. **nombre**: Índice único para garantizar que no haya nombres duplicados
2. **codigo**: Índice único sparse para garantizar que no haya códigos duplicados (permite múltiples valores null)

### Índices Simples

1. **isActive**: Índice para filtros rápidos por estado activo
2. **createdAt**: Índice descendente para ordenamiento por fecha de creación

### Índices Compuestos

1. **{ isActive: 1, createdAt: -1 }**: Búsqueda por estado activo ordenada por fecha de creación

### Índices de Texto Completo

1. **{ nombre: 'text', descripcion: 'text', codigo: 'text' }**: Búsqueda full-text en múltiples campos

---

## Notas de Implementación

1. **Principios SOLID**: El código sigue los principios SOLID con separación clara de responsabilidades entre controlador, servicio y schema.

2. **Consultas Optimizadas**: Se implementaron índices estratégicos para consultas rápidas, especialmente en campos únicos y campos de búsqueda frecuente.

3. **Validación de Unicidad**: El sistema valida que no existan duplicados en nombre y código antes de crear o actualizar.

4. **Búsqueda Flexible**: Soporte para búsqueda por texto en múltiples campos (nombre, código, descripción).

5. **Normalización de Datos**: Los campos de texto se normalizan automáticamente (trim) antes de guardar.

6. **Validación de ObjectId**: Se valida que los IDs proporcionados sean ObjectIds válidos de MongoDB antes de realizar consultas.

7. **Estado Activo/Inactivo**: Control de estado para habilitar/deshabilitar áreas sin eliminarlas.

8. **Índice Sparse**: El índice de código es sparse, lo que permite múltiples áreas sin código (null) mientras mantiene la unicidad cuando se proporciona un código.

---

## Ejemplos de Uso

### Crear un Área

```bash
curl -X POST http://localhost:3000/areas \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Contabilidad",
    "codigo": "CONT",
    "descripcion": "Área encargada de la gestión contable y financiera de la empresa",
    "isActive": true
  }'
```

### Buscar Áreas por Nombre

```bash
curl -X GET "http://localhost:3000/areas?q=contabilidad"
```

### Obtener Áreas Activas

```bash
curl -X GET "http://localhost:3000/areas/active"
```

### Obtener Área por Código

```bash
curl -X GET "http://localhost:3000/areas/codigo/CONT"
```

### Actualizar Área

```bash
curl -X PATCH http://localhost:3000/areas/64f8a1b2c3d4e5f6a7b8c9d0 \
  -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Nueva descripción del área"
  }'
```

### Cambiar Estado Activo

```bash
curl -X PUT http://localhost:3000/areas/64f8a1b2c3d4e5f6a7b8c9d0/toggle-active \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### Eliminar Área

```bash
curl -X DELETE http://localhost:3000/areas/64f8a1b2c3d4e5f6a7b8c9d0
```

---

## Consideraciones de Seguridad

1. **Autenticación**: Aunque no se muestra en los ejemplos, se recomienda implementar autenticación JWT para proteger los endpoints.

2. **Autorización**: Se recomienda implementar controles de acceso basados en roles para operaciones sensibles como eliminar áreas.

3. **Validación de Datos**: Todos los datos de entrada se validan antes de procesar, evitando inyecciones y datos malformados.

4. **Integridad Referencial**: Si las áreas se relacionan con otros recursos (como empleados), se debe considerar la implementación de validaciones adicionales o restricciones de eliminación.

