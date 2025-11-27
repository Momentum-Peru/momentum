import { HttpInterceptorFn, HttpEvent, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { AuthService } from '../pages/login/services/auth.service';
import { LogsApiService } from '../shared/services/logs-api.service';
import { environment } from '../../environments/environment';

/**
 * Interceptor que registra logs automáticamente para peticiones HTTP
 * Por ahora funciona para el módulo de usuarios, pero es extensible a otros módulos
 *
 * Principio de Responsabilidad Única: Solo se encarga de registrar logs de peticiones HTTP
 */
export const logsInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const logsService = inject(LogsApiService);

  // Excluir peticiones externas (como Google Maps)
  if (!req.url.startsWith(environment.apiUrl)) {
      return next(req);
  }

  // Obtener el usuario actual
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.id;

  // Si no hay usuario autenticado, no registrar logs
  if (!userId) {
    return next(req);
  }

  // Detectar el módulo y la acción basándose en la URL y el método HTTP
  const url = req.url;
  const method = req.method;

  // Configuración de módulos a monitorear
  // Por ahora solo usuarios, pero fácilmente extensible
  const moduleConfig: Record<string, { path: string; name: string }> = {
    users: {
      path: '/users',
      name: 'users',
    },
    // Aquí se pueden agregar más módulos en el futuro:
    // tasks: { path: '/tasks', name: 'tasks' },
    // boards: { path: '/boards', name: 'boards' },
  };

  // Determinar qué módulo corresponde a esta petición
  let moduleName: string | null = null;
  let action = 'consulta';
  let entityId: string | null = null;

  // Solo registrar logs para acciones de escritura (POST, PATCH, PUT, DELETE)
  // NO registrar logs para consultas (GET)
  const isWriteAction = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

  if (!isWriteAction) {
    // Si no es una acción de escritura, continuar sin registrar log
    return next(req);
  }

  for (const [, config] of Object.entries(moduleConfig)) {
    // Verificar que la URL comience con el path del módulo o lo contenga exactamente
    // Esto evita falsos positivos (ej: /notifications no debe activar /users)
    if (url.includes(config.path)) {
      moduleName = config.name;

      // Extraer el ID de la entidad si está en la URL
      // Ejemplo: /users/507f1f77bcf86cd799439011
      const idMatch = url.match(new RegExp(`${config.path}/([^/?]+)`));
      if (idMatch) {
        entityId = idMatch[1];
      }

      // Determinar la acción según el método HTTP
      switch (method) {
        case 'POST':
          action = 'crear';
          break;
        case 'PATCH':
        case 'PUT':
          action = 'actualizar';
          break;
        case 'DELETE':
          action = 'eliminar';
          break;
        default:
          action = 'consulta';
      }
      break;
    }
  }

  // Si no es un módulo monitoreado, continuar sin registrar log
  if (!moduleName) {
    return next(req);
  }

  // Excluir peticiones a logs para evitar recursión infinita
  if (url.includes('/logs')) {
    return next(req);
  }

  // Continuar con la petición original
  return next(req).pipe(
    tap({
      next: (event: HttpEvent<unknown>) => {
        // Solo registrar logs para respuestas exitosas (200, 201, etc.)
        // y que no sean eventos de progreso
        if (event.type === 4) {
          // HttpEventType.Response = 4
          const response = event as HttpResponse<unknown>;
          if (response.status >= 200 && response.status < 300) {
            // Preparar los detalles del log
            const detalle: Record<string, unknown> = {
              accion: action,
              entidad: moduleName,
              metodo: method,
              url: url,
            };

            // Agregar ID de la entidad si existe
            if (entityId) {
              detalle['entityId'] = entityId;
            }

            // Agregar datos del body si es POST, PATCH o PUT
            if (['POST', 'PATCH', 'PUT'].includes(method) && req.body) {
              // No incluir información sensible como contraseñas
              const bodyCopy = { ...(req.body as Record<string, unknown>) };
              if ('password' in bodyCopy) {
                delete bodyCopy['password'];
              }
              if ('token' in bodyCopy) {
                delete bodyCopy['token'];
              }
              detalle['datos'] = bodyCopy;
            }

            // Registrar el log de forma asíncrona sin bloquear la respuesta
            logsService
              .create({
                modulo: moduleName,
                userId: userId,
                detalle: detalle,
              })
              .subscribe({
                error: (error) => {
                  // No fallar la petición original si falla el log
                  console.error('[LogsInterceptor] Error al registrar log:', error);
                },
              });
          }
        }
      },
      error: (error) => {
        // También registrar logs de errores
        const detalle: Record<string, unknown> = {
          accion: action,
          entidad: moduleName,
          metodo: method,
          url: url,
          error: true,
          statusCode: error.status,
          mensaje: error.message || 'Error desconocido',
        };

        if (entityId) {
          detalle['entityId'] = entityId;
        }

        logsService
          .create({
            modulo: moduleName,
            userId: userId,
            detalle: detalle,
          })
          .subscribe({
            error: (logError) => {
              console.error('[LogsInterceptor] Error al registrar log de error:', logError);
            },
          });
      },
    })
  );
};
