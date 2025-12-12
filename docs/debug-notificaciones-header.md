# Debug: Notificaciones en el Header No Funcionan

## Problema
Las notificaciones aparecen en el tablero pero NO aparecen en la campana del header.

## Verificación Rápida

### 1. Abrir la Consola del Navegador (F12)

Busca estos mensajes en la consola:

```
[NotificationsService] Iniciando polling de notificaciones
[NotificationsService] Cargando conteo de notificaciones no leídas...
[NotificationsService] Conteo recibido: X
[NotificationsService] Ejecutando polling...
```

**Si NO ves estos mensajes:**
- El componente no se está inicializando correctamente
- El `ngOnInit` no se está ejecutando

**Si ves errores:**
- Revisa el error específico
- Verifica que el header `X-Tenant-Id` esté presente

### 2. Verificar las Peticiones HTTP (F12 → Network)

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña **Network**
3. Filtra por "notifications" o "unread"
4. Deberías ver peticiones cada 30 segundos a:
   - `GET /notifications/unread/count`
   - `GET /notifications/unread`

**Verifica:**
- ✅ Que las peticiones tengan el header `X-Tenant-Id`
- ✅ Que el código de respuesta sea `200 OK`
- ✅ Que la respuesta contenga `{ "count": X }`

**Si ves `400 Bad Request`:**
- Falta el header `X-Tenant-Id`
- Verifica que el `TenantService` tenga un `tenantId` válido

**Si ves `401 Unauthorized`:**
- Problema de autenticación
- Verifica que el token JWT sea válido

### 3. Verificar que el TenantId Esté Disponible

En la consola del navegador, ejecuta:

```javascript
// Verificar el tenantId actual
localStorage.getItem('tenantId')

// Verificar en el servicio (desde la consola)
// Esto requiere acceso al servicio, pero puedes verificar en Network
```

**Verifica en Network:**
- Abre una petición a `/notifications/unread/count`
- Ve a la pestaña "Headers"
- Busca `X-Tenant-Id` en "Request Headers"
- Debe tener un valor válido (24 caracteres hexadecimales)

### 4. Verificar que el Componente Esté Montado

El componente `NotificationsBellComponent` se instancia **dos veces**:
- Una para móvil (línea 23 en `main.html`)
- Una para desktop (línea 132 en `main.html`)

**Esto es normal** porque el servicio es singleton (`providedIn: 'root'`), así que el polling solo se inicia una vez.

**Si el componente no aparece:**
- Verifica que esté en el layout correcto
- Verifica que no haya errores de compilación

### 5. Verificar el Estado del Servicio

El servicio mantiene el estado en signals. Verifica en la consola:

```typescript
// Desde el componente (si tienes acceso)
console.log('Unread count:', this.notificationsService.unreadCount());
console.log('Notifications:', this.notificationsService.notifications());
```

## Soluciones Comunes

### Problema: "No veo los logs en la consola"

**Causa:** El componente no se está inicializando.

**Solución:**
1. Verifica que el componente esté en el layout
2. Verifica que no haya errores de compilación
3. Recarga la página completamente (Ctrl+F5)

### Problema: "Veo errores 400 Bad Request"

**Causa:** Falta el header `X-Tenant-Id`.

**Solución:**
1. Verifica que el usuario haya seleccionado una empresa
2. Verifica que el `TenantService` tenga un `tenantId` válido
3. Verifica que el interceptor `tenantInterceptor` esté configurado en `app.config.ts`

### Problema: "Las peticiones funcionan pero no se actualiza el badge"

**Causa:** El signal no se está actualizando o el componente no está detectando cambios.

**Solución:**
1. Verifica que el componente use `ChangeDetectionStrategy.OnPush` (ya está configurado)
2. Verifica que los signals estén correctamente conectados
3. Verifica que no haya errores en la consola

### Problema: "El polling no se ejecuta cada 30 segundos"

**Causa:** El intervalo no está funcionando o hay errores que lo detienen.

**Solución:**
1. Verifica los logs en la consola
2. Verifica que no haya errores en las peticiones
3. Verifica que el `pollingSubscription` no se esté cancelando

## Verificación del Interceptor

El interceptor `tenantInterceptor` debe estar configurado en `app.config.ts`:

```typescript
provideHttpClient(
  withInterceptors([tenantInterceptor, tokenInterceptor])
)
```

**Verifica:**
- ✅ Que el interceptor esté en la lista
- ✅ Que el `TenantService` esté inyectado correctamente
- ✅ Que el `tenantId` sea válido cuando se hace la petición

## Prueba Manual

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Network**
3. Filtra por "notifications"
4. Crea una nueva tarea asignada a otro usuario
5. Espera 30 segundos
6. Deberías ver una nueva petición a `/notifications/unread/count`
7. El conteo debería aumentar
8. El badge en la campana debería actualizarse

## Si Nada Funciona

1. **Limpia el localStorage:**
   ```javascript
   localStorage.removeItem('tenantId');
   localStorage.removeItem('tenantName');
   ```
   Luego recarga y selecciona la empresa nuevamente.

2. **Verifica el backend:**
   - Revisa los logs del servidor
   - Verifica que las notificaciones se estén creando en la BD
   - Verifica que el `tenantId` sea correcto

3. **Revisa la configuración:**
   - Verifica que `environment.apiUrl` sea correcto
   - Verifica que el endpoint `/notifications/unread/count` exista
   - Verifica que el usuario tenga permisos

