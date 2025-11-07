# Modificaciones de Endpoints para Rol Gerencia - Dashboard

## Resumen

Este documento describe las modificaciones necesarias en el backend para soportar el rol "gerencia" en el dashboard, permitiendo que los usuarios con este rol puedan ver KPIs y datos filtrados por empresa.

## Endpoint: GET /dashboard

### Modificaciones Requeridas

El endpoint `/dashboard` debe aceptar un nuevo parámetro opcional para filtrar por empresa/tenant cuando el usuario tiene rol "gerencia".

### Parámetros de Query Actuales

Según `ENDPOINTS_COMPLETE.md`, el endpoint acepta:
- `period` (string, opcional): Período de tiempo (ej: "30d", "7d", "1y")
- `startDate` (string, opcional): Fecha de inicio (ISO)
- `endDate` (string, opcional): Fecha de fin (ISO)
- `projectId` (string, opcional): Filtrar por proyecto
- `clientId` (string, opcional): Filtrar por cliente

### Nuevos Parámetros de Query

Se debe agregar soporte para:

- `tenantId` (string, opcional): ID de empresa/tenant para filtrar datos por empresa
- `companyId` (string, opcional): Alias de `tenantId` para compatibilidad (debe mapearse a `tenantId` internamente)

### Comportamiento Esperado

1. **Rol Gerencia sin filtro de empresa:**
   - Si no se proporciona `tenantId` o `companyId`, el endpoint debe devolver datos agregados de **todas las empresas**.
   - Los KPIs deben mostrar totales consolidados de todas las empresas.

2. **Rol Gerencia con filtro de empresa:**
   - Si se proporciona `tenantId` o `companyId`, el endpoint debe devolver datos solo de esa empresa específica.
   - Los KPIs deben mostrar datos solo de la empresa seleccionada.

3. **Otros roles:**
   - El comportamiento actual se mantiene (datos filtrados por el tenant del header `X-Tenant-Id`).
   - El parámetro `tenantId`/`companyId` debe ser ignorado si el usuario no tiene rol "gerencia".

### Ejemplo de Request

```http
GET /dashboard?period=30d&tenantId=507f1f77bcf86cd799439011
Authorization: Bearer <token>
X-Tenant-Id: <companyId>  # Solo requerido para roles que no sean gerencia
```

### Validación

1. Verificar que el usuario tenga rol "gerencia" antes de procesar el parámetro `tenantId`/`companyId`.
2. Si el usuario es "gerencia" y se proporciona `tenantId`:
   - Validar que el `tenantId` sea un ObjectId válido.
   - Validar que la empresa exista y esté activa.
   - Si la empresa no existe o está inactiva, devolver 404 con mensaje apropiado.
3. Si el usuario NO es "gerencia":
   - Ignorar el parámetro `tenantId`/`companyId`.
   - Usar el `X-Tenant-Id` del header como de costumbre.

### Response

El formato de respuesta se mantiene igual según `ENDPOINTS_COMPLETE.md`:

```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalProjects": { ... },
      "totalClients": { ... },
      "totalQuotes": { ... },
      // ... otros KPIs
    },
    "charts": { ... },
    "tables": { ... }
  },
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "period": "30d",
    "filters": {
      "tenantId": "507f1f77bcf86cd799439011"  // Nuevo campo en metadata
    },
    "performance": {
      "processingTimeMs": 150
    }
  }
}
```

### Notas de Implementación

1. **Agregación de datos:**
   - Cuando el rol es "gerencia" y no hay `tenantId`, se deben agregar datos de todas las empresas activas.
   - Usar agregaciones de MongoDB eficientes para consolidar datos.

2. **Performance:**
   - Considerar cachear resultados agregados para mejorar el rendimiento.
   - Los datos agregados de todas las empresas pueden ser costosos, considerar límites de tiempo razonables.

3. **Seguridad:**
   - Asegurar que solo usuarios con rol "gerencia" puedan usar el parámetro `tenantId`.
   - Validar permisos antes de procesar la solicitud.

## Endpoint: GET /dashboard/kpis

Si existe un endpoint separado para KPIs, debe seguir las mismas reglas que `/dashboard`:

- Aceptar `tenantId` y `companyId` como parámetros opcionales.
- Solo procesar estos parámetros si el usuario tiene rol "gerencia".
- Devolver KPIs agregados o filtrados según corresponda.

## Endpoint: GET /dashboard/charts

Si existe un endpoint separado para gráficos, debe seguir las mismas reglas que `/dashboard`:

- Aceptar `tenantId` y `companyId` como parámetros opcionales.
- Solo procesar estos parámetros si el usuario tiene rol "gerencia".
- Devolver datos de gráficos agregados o filtrados según corresponda.

## Endpoint: GET /dashboard/tables

Si existe un endpoint separado para tablas, debe seguir las mismas reglas que `/dashboard`:

- Aceptar `tenantId` y `companyId` como parámetros opcionales.
- Solo procesar estos parámetros si el usuario tiene rol "gerencia".
- Devolver datos de tablas agregados o filtrados según corresponda.

## Consideraciones Adicionales

1. **Compatibilidad:**
   - El frontend enviará tanto `tenantId` como `companyId` para compatibilidad.
   - El backend debe aceptar ambos pero usar solo uno internamente (preferiblemente `tenantId`).

2. **Documentación:**
   - Actualizar `ENDPOINTS_COMPLETE.md` con los nuevos parámetros opcionales.
   - Documentar el comportamiento específico para el rol "gerencia".

3. **Testing:**
   - Probar con usuario "gerencia" sin `tenantId` (debe mostrar datos agregados).
   - Probar con usuario "gerencia" con `tenantId` válido (debe mostrar datos de esa empresa).
   - Probar con usuario "gerencia" con `tenantId` inválido (debe devolver 404).
   - Probar con usuario que NO es "gerencia" con `tenantId` (debe ignorar el parámetro).

---

**Fecha de creación:** 2025-11-05  
**Versión:** 1.0.0

