import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantService } from '../core/services/tenant.service';
import { AuthService } from '../pages/login/services/auth.service';

/**
 * Interceptor que agrega el header X-Tenant-Id a todas las peticiones,
 * excepto a las rutas de companies y auth.
 * Para el rol gerencia, permite omitir el header cuando se especifica tenantId en query params.
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantService = inject(TenantService);
  const authService = inject(AuthService);

  // Excepciones: auth y companies no requieren X-Tenant-Id
  const isAuth = req.url.includes('/auth/');
  const isCompanies = req.url.includes('/companies');

  if (isAuth || isCompanies) {
    return next(req);
  }

  // Para rol gerencia: NO enviar header X-Tenant-Id para permitir datos agregados
  // El backend detectará el rol gerencia y devolverá datos agregados si no hay tenantId en query params
  const user = authService.getCurrentUser();
  const isGerencia = user?.role === 'gerencia';
  
  if (isGerencia) {
    // Para gerencia, verificar si hay tenantId en los query params
    // Si la URL contiene tenantId o companyId, el backend lo usará desde los query params
    // Si NO hay tenantId en query params, NO enviar header para obtener datos agregados de todas las empresas
    const urlString = req.url;
    const hasTenantIdParam = urlString.includes('tenantId=') || urlString.includes('companyId=');
    
    // Si hay tenantId en query params, el backend lo usará desde ahí
    // Si NO hay tenantId, NO enviar header para que el backend devuelva datos agregados
    // En ambos casos, no enviamos el header X-Tenant-Id para gerencia
    return next(req);
  }

  // Para otros roles: comportamiento normal
  const tenantId = tenantService.tenantId();
  if (!tenantId || !/^[a-fA-F0-9]{24}$/.test(tenantId)) {
    // Sin tenant seleccionado, continúa sin header
    return next(req);
  }

  const withTenant = req.clone({
    setHeaders: { 'X-Tenant-Id': tenantId },
  });

  return next(withTenant);
};


