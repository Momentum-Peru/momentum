import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantService } from '../core/services/tenant.service';

/**
 * Interceptor que agrega el header X-Tenant-Id a todas las peticiones,
 * excepto a las rutas de companies y auth.
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantService = inject(TenantService);

  // Excepciones: auth y companies no requieren X-Tenant-Id
  const isAuth = req.url.includes('/auth/');
  const isCompanies = req.url.includes('/companies');

  if (isAuth || isCompanies) {
    return next(req);
  }

  const tenantId = tenantService.tenantId();
  if (!tenantId || !/^[a-fA-F0-9]{24}$/.test(tenantId)) {
    // Debug: sin tenant seleccionado, continúa sin header
    return next(req);
  }

  const withTenant = req.clone({
    setHeaders: { 'X-Tenant-Id': tenantId },
  });

  // Debug: request con tenant
  return next(withTenant);
};


