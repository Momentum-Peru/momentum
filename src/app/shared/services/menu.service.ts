import { Injectable, inject, signal, computed } from '@angular/core';
import { MenuPermissionsApiService } from './menu-permissions-api.service';
import { AuthService } from '../../pages/login/services/auth.service';
import { MenuPermission } from '../interfaces/menu-permission.interface';

// Eliminamos MenuItem ya que no necesitamos crear menús
// Solo verificamos permisos de acceso

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly menuPermissionsApi = inject(MenuPermissionsApiService);
  private readonly authService = inject(AuthService);

  // Signal para almacenar los permisos del usuario actual
  private userPermissions = signal<MenuPermission[]>([]);

  // Ya no necesitamos generar menús, solo verificamos permisos

  // Computed para obtener las rutas permitidas
  allowedRoutes = computed(() => {
    return this.userPermissions()
      .filter((permission) => permission.isActive)
      .map((permission) => permission.route);
  });

  /**
   * Carga los permisos del usuario actual
   */
  loadUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.id) {
      this.userPermissions.set([]);
      return;
    }

    this.menuPermissionsApi.getByUserId(currentUser.id).subscribe({
      next: (permissions) => {
        const normalized = permissions.map((p) => ({
          ...p,
          userId: typeof p.userId === 'string' ? p.userId : p.userId._id,
        }));
        this.userPermissions.set(normalized);
      },
      error: () => {
        this.userPermissions.set([]);
      },
    });
  }

  /**
   * Verifica si el usuario tiene permiso para acceder a una ruta específica
   * El dashboard siempre está disponible sin restricciones
   */
  hasPermission(route: string): boolean {
    // El dashboard siempre está disponible sin restricciones
    if (route === '/dashboard') {
      return true;
    }
    
    return this.allowedRoutes().includes(route);
  }

  /**
   * Obtiene los permisos del usuario actual
   */
  getUserPermissions(): MenuPermission[] {
    return this.userPermissions();
  }

  /**
   * Obtiene las rutas permitidas del usuario actual
   */
  getAllowedRoutes(): string[] {
    return this.allowedRoutes();
  }

  /**
   * Verifica si el usuario puede acceder a una ruta específica
   * Útil para mostrar/ocultar elementos del menú
   * El dashboard siempre está disponible sin restricciones
   */
  canAccess(route: string): boolean {
    // El dashboard siempre está disponible sin restricciones
    if (route === '/dashboard') {
      return true;
    }
    
    const allowedRoutes = this.allowedRoutes();
    const hasAccess = allowedRoutes.includes(route);
    return hasAccess;
  }

  // Eliminamos getMenu() ya que no generamos menús

  /**
   * Inicializa el servicio cargando los permisos del usuario
   */
  initialize(): void {
    this.loadUserPermissions();
  }

  /**
   * Refresca los permisos del usuario
   * Útil después de cambios en los permisos
   */
  refreshPermissions(): void {
    this.loadUserPermissions();
  }
}
