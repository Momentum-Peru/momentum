---
name: api-and-http
description: Patrones de servicios HTTP, environment e interceptors en Tecmeing. Usar al crear o modificar servicios que llaman APIs, interceptors o configuración de environment.
---

# API y HTTP (Tecmeing)

## URLs de API

- Base URL en `src/environments/environment.ts` (y variantes `environment.development.ts`, `environment.production.ts`).
- Usar `environment.apiUrl` en servicios; no hardcodear dominios.

```typescript
import { environment } from '../../../environments/environment';

private readonly baseUrl = environment.apiUrl;
```

## Servicios HTTP

- Inyectar `HttpClient` con `inject(HttpClient)`.
- Un servicio por dominio o recurso (ej. `DashboardApiService`, `TasksApiService`).
- Tipar respuestas con interfaces en `shared/interfaces/`.
- Devolver `Observable<T>`; no suscribirse dentro del servicio salvo casos justificados.

Ejemplo de estructura:

```typescript
@Injectable({ providedIn: 'root' })
export class XxxApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getItems(params?: XxxFilters): Observable<XxxResponse> {
    const queryParams = this.buildParams(params);
    return this.http.get<XxxResponse>(`${this.baseUrl}/xxx`, { params: queryParams });
  }
}
```

## Interceptors existentes

- **tokenInterceptor**: adjunta token de autenticación.
- **tenantInterceptor**: adjunta tenant/contexto multi-tenant.
- **authInterceptor**: manejo de respuestas 401 (redirección a login).
- **logsInterceptor**: logging de peticiones/respuestas.

No duplicar lógica de auth o tenant en servicios; mantenerla en interceptors.

## Manejo de errores

- Errores HTTP centralizados en interceptors cuando sea posible.
- En servicios, usar operadores RxJS (`catchError`, `retry`) si hace falta; re-lanzar o mapear a un tipo de error conocido para que el componente o interceptor reaccione.

## Recursos

- Interfaces: `src/app/shared/interfaces/`.
- Environment: `src/environments/`.
