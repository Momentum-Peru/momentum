import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantService } from '../core/services/tenant.service';
import { AuthService } from '../pages/login/services/auth.service';
import { environment } from '../../environments/environment';

/**
 * Interceptor que agrega el header X-Tenant-Id a todas las peticiones,
 * excepto a las rutas de companies y auth.
 * Para el rol gerencia, permite omitir el header cuando se especifica tenantId en query params.
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantService = inject(TenantService);
  const authService = inject(AuthService);
  const isInternalRequest = req.url.startsWith(environment.apiUrl);

  // Excepciones: auth y companies no requieren X-Tenant-Id
  const isAuth = req.url.includes('/auth/');
  const isCompanies = req.url.includes('/companies');

  if (!isInternalRequest) {
    return next(req);
  }

  if (isAuth || isCompanies) {
    return next(req);
  }

  // Para rol gerencia: NO enviar header X-Tenant-Id para permitir datos agregados
  // El backend detectará el rol gerencia y devolverá datos agregados si no hay tenantId en query params
  const user = authService.getCurrentUser();
  const isGerencia = user?.role === 'gerencia';

  const tenantId = tenantService.tenantId();

  if (isGerencia) {
    // Gerencia puede consultar sin tenant seleccionado para obtener datos agregados.
    // Para rutas de boards, tasks y logs, gerencia puede ver todos los datos sin restricción de tenant
    const isBoardsOrTasksOrLogsRoute = req.url.includes('/boards') || req.url.includes('/tasks') || req.url.includes('/logs');
    
    // Si es una ruta de boards, tasks o logs, no enviar el header para que gerencia vea todos los datos
    // PERO solo para consultas (GET). Para modificaciones (POST/PUT/DELETE) necesitamos el contexto del tenant.
    if (isBoardsOrTasksOrLogsRoute && req.method === 'GET') {
      return next(req);
    }
    
    // Para otras rutas, si existe un tenant seleccionado, enviamos el header para respetar el aislamiento.
    const hasValidTenant = tenantId && /^[a-fA-F0-9]{24}$/.test(tenantId);
    if (!hasValidTenant) {
      return next(req);
    }
  }

  // Para otros roles o gerencia con tenant válido: comportamiento normal
  if (!tenantId || !/^[a-fA-F0-9]{24}$/.test(tenantId)) {
    // Sin tenant seleccionado, continúa sin header
    return next(req);
  }

  const withTenant = req.clone({
    setHeaders: { 'X-Tenant-Id': tenantId },
  });

  return next(withTenant);
};
