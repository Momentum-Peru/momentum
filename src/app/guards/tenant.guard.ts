import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TenantService } from '../core/services/tenant.service';

/**
 * Guard que requiere tener un tenant seleccionado.
 * SRP: Únicamente valida la existencia de tenant y redirige a selección.
 */
export const requireTenantGuard: CanActivateFn = () => {
  const tenantService = inject(TenantService);
  const router = inject(Router);

  if (tenantService.hasTenant()) {
    const id = tenantService.tenantId();
    if (tenantService.userHasAccess(id)) return true;
  }
  return router.createUrlTree(['/select-company']);
};


