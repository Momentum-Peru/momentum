import { Injectable, inject, signal, computed } from '@angular/core';
import { MenuPermissionsApiService } from './menu-permissions-api.service';
import { AuthService } from '../../pages/login/services/auth.service';
import { MenuPermission } from '../interfaces/menu-permission.interface';
import { MenuConfigService } from './menu-config.service';

// Eliminamos MenuItem ya que no necesitamos crear menús
// Solo verificamos permisos de acceso

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly menuPermissionsApi = inject(MenuPermissionsApiService);
  private readonly authService = inject(AuthService);
  private readonly menuConfigService = inject(MenuConfigService);

  // Signal para almacenar los permisos del usuario actual
  private userPermissions = signal<MenuPermission[]>([]);

  // Ya no necesitamos generar menús, solo verificamos permisos

  // Computed para verificar si el usuario es gerencia
  private isGerencia = computed(() => this.authService.isGerencia());

  // Computed para obtener las rutas permitidas
  // Para gerencia: retorna todas las rutas disponibles del sistema
  allowedRoutes = computed(() => {
    // Si es gerencia, retornar todas las rutas disponibles del sistema
    if (this.isGerencia()) {
      return this.menuConfigService.getProtectedRoutes();
    }
    
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
        const normalized = permissions
          .filter((p) => p.userId !== null && p.userId !== undefined)
          .map((p) => ({
            ...p,
            userId:
              typeof p.userId === 'string'
                ? p.userId
                : p.userId !== null && typeof p.userId === 'object'
                  ? p.userId._id
                  : '',
          }))
          .filter((p) => p.userId !== '');
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
   * Para gerencia: todas las rutas están disponibles
   */
  hasPermission(route: string): boolean {
    // El dashboard siempre está disponible sin restricciones
    if (route === '/dashboard') {
      return true;
    }
    
    // Para gerencia: todas las rutas están disponibles
    if (this.isGerencia()) {
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
   * Para gerencia: todas las rutas están disponibles
   */
  canAccess(route: string): boolean {
    // El dashboard siempre está disponible sin restricciones
    if (route === '/dashboard') {
      return true;
    }
    
    // Para gerencia: todas las rutas están disponibles
    if (this.isGerencia()) {
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
