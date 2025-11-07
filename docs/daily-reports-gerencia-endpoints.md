# Modificaciones de Endpoints para Rol Gerencia - Reportes Diarios

## Resumen

Este documento describe las modificaciones necesarias en el backend para soportar el rol "gerencia" en la vista de reportes diarios, permitiendo que los usuarios con este rol puedan ver todos los reportes diarios de todos los usuarios y todas las empresas.

## Endpoint: GET /daily-reports

### Modificaciones Requeridas

El endpoint `/daily-reports` debe aceptar un nuevo parámetro opcional para filtrar por empresa/tenant cuando el usuario tiene rol "gerencia", y debe permitir ver todos los reportes sin filtrar por `userId` cuando el usuario es gerencia.

### Parámetros de Query Actuales

Según `daily-reports-api.md`, el endpoint ya acepta:
- `userId` (string, opcional): Filtrar por ID de usuario ✅ **Ya implementado en el backend**
- `projectId` (string, opcional): Filtrar por proyecto
- `startDate` (string, opcional): Fecha de inicio (ISO)
- `endDate` (string, opcional): Fecha de fin (ISO)
- `q` (string, opcional): Término de búsqueda

### Nuevos Parámetros de Query

Se debe agregar soporte para:

- `tenantId` (string, opcional): ID de empresa/tenant para filtrar reportes por empresa (solo para rol gerencia) ⚠️ **Nuevo - Requiere implementación**

### Comportamiento Esperado

1. **Rol Gerencia sin filtro de empresa:**
   - Si no se proporciona `tenantId`, el endpoint debe devolver **todos los reportes diarios de todas las empresas**.
   - Si no se proporciona `userId`, el endpoint debe devolver **todos los reportes de todos los usuarios**.
   - Los reportes deben incluir información de la empresa (tenantId) y del usuario que los creó.

2. **Rol Gerencia con filtro de empresa:**
   - Si se proporciona `tenantId`, el endpoint debe devolver reportes solo de esa empresa específica.
   - Si no se proporciona `userId`, debe devolver reportes de todos los usuarios de esa empresa.
   - Si se proporciona `userId`, debe devolver reportes de ese usuario específico dentro de la empresa seleccionada.

3. **Rol Gerencia con filtro de usuario:**
   - Si se proporciona `userId` (sin `tenantId`), el endpoint debe devolver reportes de ese usuario de todas las empresas.
   - Si se proporciona `userId` y `tenantId`, el endpoint debe devolver reportes de ese usuario solo de esa empresa.
   - El parámetro `userId` ya está implementado en el backend según `daily-reports-api.md`.

4. **Otros roles (no gerencia):**
   - El comportamiento actual se mantiene (datos filtrados por el tenant del header `X-Tenant-Id`).
   - El parámetro `tenantId` debe ser ignorado si el usuario no tiene rol "gerencia".
   - Si no se proporciona `userId`, debe filtrar por el usuario autenticado (comportamiento actual).
   - El parámetro `userId` funciona normalmente para otros roles (solo pueden ver sus propios reportes o los de usuarios de su empresa si tienen permisos).

### Ejemplo de Request

**Gerencia sin filtro (todas las empresas, todos los usuarios):**
```http
GET /daily-reports
Authorization: Bearer <token>
# NO enviar header X-Tenant-Id
```

**Gerencia con filtro de empresa (todos los usuarios de esa empresa):**
```http
GET /daily-reports?tenantId=507f1f77bcf86cd799439011
Authorization: Bearer <token>
# NO enviar header X-Tenant-Id
```

**Gerencia con filtro de empresa y usuario específico:**
```http
GET /daily-reports?tenantId=507f1f77bcf86cd799439011&userId=507f1f77bcf86cd799439012
Authorization: Bearer <token>
# NO enviar header X-Tenant-Id
```

**Gerencia con filtro de usuario (todas las empresas):**
```http
GET /daily-reports?userId=507f1f77bcf86cd799439012
Authorization: Bearer <token>
# NO enviar header X-Tenant-Id
```

**Otro rol (comportamiento normal):**
```http
GET /daily-reports?userId=507f1f77bcf86cd799439012
Authorization: Bearer <token>
X-Tenant-Id: 507f1f77bcf86cd799439011
```

### Validación

1. Verificar que el usuario tenga rol "gerencia" antes de procesar el parámetro `tenantId`.
2. Si el usuario es "gerencia" y se proporciona `tenantId`:
   - Validar que el `tenantId` sea un ObjectId válido.
   - Validar que la empresa exista y esté activa.
   - Si la empresa no existe o está inactiva, devolver 404 con mensaje apropiado.
3. Si el usuario NO es "gerencia":
   - Ignorar el parámetro `tenantId` si se proporciona.
   - Usar el `X-Tenant-Id` del header como de costumbre.
   - Si no se proporciona `userId`, usar el ID del usuario autenticado.

### Response

El formato de respuesta se mantiene igual, pero los reportes deben incluir información adicional cuando es gerencia:

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "userName": "Juan Pérez",  // Nuevo campo recomendado
    "tenantId": "507f1f77bcf86cd799439013",  // Nuevo campo recomendado
    "companyName": "Empresa Ejemplo S.A.",  // Nuevo campo recomendado
    "date": "2024-01-15",
    "time": "10:30",
    "projectId": "507f1f77bcf86cd799439014",
    "description": "Trabajo en funcionalidad X",
    "audioDescription": null,
    "videoDescription": null,
    "photoDescription": null,
    "documents": [],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### Notas de Implementación

1. **Agregación de datos:**
   - Cuando el rol es "gerencia" y no hay `tenantId`, se deben obtener reportes de todas las empresas activas.
   - Usar agregaciones de MongoDB eficientes para consolidar datos de múltiples tenants.

2. **Performance:**
   - Considerar cachear resultados agregados para mejorar el rendimiento.
   - Los datos agregados de todas las empresas pueden ser costosos, considerar límites de tiempo razonables.
   - Implementar paginación si el volumen de datos es muy grande.

3. **Seguridad:**
   - Asegurar que solo usuarios con rol "gerencia" puedan usar el parámetro `tenantId`.
   - Validar permisos antes de procesar la solicitud.
   - No exponer información sensible de otras empresas si el usuario no tiene permisos.

4. **Información adicional:**
   - Se recomienda incluir `userName` y `companyName` en la respuesta para facilitar la visualización en el frontend.
   - Esto evita hacer múltiples consultas adicionales para obtener nombres de usuarios y empresas.

## Endpoint: GET /daily-reports/stats

Si existe un endpoint separado para estadísticas, debe seguir las mismas reglas:

- Aceptar `tenantId` como parámetro opcional.
- Solo procesar este parámetro si el usuario tiene rol "gerencia".
- Devolver estadísticas agregadas o filtradas según corresponda.

## Consideraciones Adicionales

1. **Compatibilidad:**
   - El frontend enviará `tenantId` en los query params cuando el usuario es gerencia y selecciona una empresa.
   - El backend debe aceptar este parámetro y procesarlo correctamente.

2. **Documentación:**
   - Actualizar `ENDPOINTS_COMPLETE.md` con los nuevos parámetros opcionales.
   - Documentar el comportamiento específico para el rol "gerencia".

3. **Testing:**
   - Probar con usuario "gerencia" sin `tenantId` (debe mostrar reportes de todas las empresas y usuarios).
   - Probar con usuario "gerencia" con `tenantId` válido (debe mostrar reportes de esa empresa).
   - Probar con usuario "gerencia" con `tenantId` inválido (debe devolver 404).
   - Probar con usuario que NO es "gerencia" con `tenantId` (debe ignorar el parámetro).
   - Probar con usuario normal sin `userId` (debe usar el ID del usuario autenticado).

---

**Fecha de creación:** 2025-11-05  
**Versión:** 1.0.0

