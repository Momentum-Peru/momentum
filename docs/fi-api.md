# Futuros Imposibles (FI) - API

Colección de endpoints para gestionar Futuros Imposibles (FI), su plan de acción con rango de fechas, y los accionables diarios. Todas las rutas están sujetas a multi-tenant mediante el header `X-Tenant-Id` (cuando aplique), y usan autenticación como el resto del sistema.

- Base path: `/fi`

## Tipos

- Estado de accionable: `"pendiente"` | `"cumplido"`

## FI

### Crear FI
- Método: POST `/fi`
- Body:
```json
{
  "titulo": "Correr mi primer ultramaratón",
  "atravesar": "Resistencia mental y hábitos de entrenamiento",
  "plan": {
    "descripcion": "Plan general de entrenamiento",
    "fechaInicio": "2025-01-01",
    "fechaFin": "2025-01-31"
  },
  "isActive": true
}
```
- Respuesta: 201 Created (objeto FI)
- Notas: `fechaFin` no puede ser menor que `fechaInicio`.

### Listar FIs
- Método: GET `/fi`
- Query:
  - `q` (opcional): texto a buscar en título, atravesar y plan.descripcion
  - `isActive` (opcional): boolean
- Respuesta: 200 OK (array de FIs)

### Obtener FI por ID
- Método: GET `/fi/{id}`
- Respuesta: 200 OK (objeto FI)

### Actualizar FI
- Método: PATCH `/fi/{id}`
- Body (parcial):
```json
{
  "titulo": "Nuevo título",
  "atravesar": "Nueva descripción de atravesar",
  "plan": {
    "descripcion": "Nuevo plan",
    "fechaInicio": "2025-01-05",
    "fechaFin": "2025-02-01"
  },
  "isActive": true
}
```
- Respuesta: 200 OK (FI actualizado)
- Notas: Si se actualiza el plan, `fechaFin` debe ser >= `fechaInicio`.

### Eliminar FI
- Método: DELETE `/fi/{id}`
- Respuesta: 200 OK `{ "deleted": true, "id": "..." }`
- Nota: Elimina también los accionables del FI.

## Accionables

Los accionables son actividades diarias relacionadas a un FI. Por diseño, existe como máximo un accionable por día para cada FI (restricción única por `{ fiId, fecha }`).

### Crear accionable
- Método: POST `/fi/{id}/actionables`
- Body:
```json
{
  "fecha": "2025-01-05",
  "descripcion": "Entrenamiento de 10km a ritmo base"
}
```
- Respuesta: 201 Created (accionable)
- Validaciones:
  - La fecha debe estar dentro del rango del plan del FI
  - No puede existir otro accionable en la misma fecha para el mismo FI

### Listar accionables (rango)
- Método: GET `/fi/{id}/actionables?from=2025-01-01&to=2025-01-31`
- Query:
  - `from` (opcional): ISO date. Por defecto usa `plan.fechaInicio`
  - `to` (opcional): ISO date. Por defecto usa `plan.fechaFin`
- Respuesta: 200 OK (array de accionables ordenados por fecha ascendente)

### Actualizar accionable
- Método: PATCH `/fi/{id}/actionables/{actionableId}`
- Body (parcial):
```json
{
  "fecha": "2025-01-06",
  "descripcion": "Series en pista 8x800",
  "estado": "pendiente"
}
```
- Respuesta: 200 OK (accionable actualizado)
- Validaciones:
  - La nueva fecha debe estar dentro del rango del plan
  - No puede duplicar otro accionable en la nueva fecha

### Actualizar estado del accionable
- Método: PUT `/fi/{id}/actionables/{actionableId}/status`
- Body:
```json
{ "estado": "cumplido" }
```
- Respuesta: 200 OK (accionable actualizado)

### Eliminar accionable
- Método: DELETE `/fi/{id}/actionables/{actionableId}`
- Respuesta: 200 OK `{ "deleted": true, "id": "..." }`

## Calendario

Devuelve los días del rango del plan con el accionable (si existe) para cada fecha, para facilitar la visualización tipo calendario en frontend.

### Obtener calendario
- Método: GET `/fi/{id}/calendar?from=2025-01-01&to=2025-01-31`
- Respuesta: 200 OK
```json
{
  "fiId": "507f1f77bcf86cd799439011",
  "rango": { "from": "2025-01-01", "to": "2025-01-31" },
  "dias": [
    { "fecha": "2025-01-01", "accionable": null },
    { "fecha": "2025-01-02", "accionable": {
      "_id": "607f1f77bcf86cd799439022",
      "fiId": "507f1f77bcf86cd799439011",
      "fecha": "2025-01-02T00:00:00.000Z",
      "descripcion": "Rodaje suave 6km",
      "estado": "pendiente",
      "createdAt": "...",
      "updatedAt": "..."
    }}
  ]
}
```

## Notas de diseño
- Tenant: todos los documentos incluyen `tenantId` y el sistema aplica el filtro automáticamente.
- Índices: 
  - FI: texto en `titulo`, `atravesar`, `plan.descripcion`; índices por fechas y tenant.
  - Accionables: índice único `{ fiId, fecha }`.
- Fechas: se normalizan a medianoche UTC para consistencia y para cumplir la unicidad por día.


