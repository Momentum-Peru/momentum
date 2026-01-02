import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { PermissionsService } from '../core/services/permissions.service';
import { firstValueFrom } from 'rxjs';

/**
 * Guard que verifica que el usuario tenga permisos de ubicación y cámara
 * Este guard permite el acceso pero el componente App se encargará de mostrar
 * el modal de permisos cuando falten
 */
export const permissionsGuard: CanActivateFn = async () => {
  const permissionsService = inject(PermissionsService);

  try {
    // Verificar permisos pero no bloquear el acceso
    // El componente App se encargará de mostrar el modal si faltan permisos
    const status = await firstValueFrom(permissionsService.checkPermissions());
    
    // Siempre permitir acceso - el componente App manejará la UI
    return true;
  } catch (error) {
    console.error('Error al verificar permisos:', error);
    // En caso de error, permitir acceso (no bloquear por seguridad)
    return true;
  }
};
