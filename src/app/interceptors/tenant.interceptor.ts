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

  const tenantId = tenantService.tenantId();

  if (isGerencia) {
    // Gerencia puede consultar sin tenant seleccionado para obtener datos agregados.
    // Si existe un tenant seleccionado, enviamos el header para respetar el aislamiento.
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
