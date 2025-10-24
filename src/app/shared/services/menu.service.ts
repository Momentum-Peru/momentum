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
    console.log('Loading permissions for user:', currentUser);

    if (!currentUser?.id) {
      console.log('No user ID found, setting empty permissions');
      this.userPermissions.set([]);
      return;
    }

    console.log('Fetching permissions for user ID:', currentUser.id);
    this.menuPermissionsApi.getByUserId(currentUser.id).subscribe({
      next: (permissions) => {
        console.log('Loaded permissions:', permissions);
        this.userPermissions.set(permissions);
      },
      error: (error) => {
        console.error('Error loading user permissions:', error);
        this.userPermissions.set([]);
      },
    });
  }

  /**
   * Verifica si el usuario tiene permiso para acceder a una ruta específica
   */
  hasPermission(route: string): boolean {
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
   */
  canAccess(route: string): boolean {
    const allowedRoutes = this.allowedRoutes();
    const hasAccess = allowedRoutes.includes(route);
    console.log(`Checking access to ${route}:`, hasAccess, 'Allowed routes:', allowedRoutes);
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
