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
  
  // Flag para evitar llamadas duplicadas
  private isLoadingPermissions = false;
  private lastLoadedUserId: string | null = null;

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

  // Computed para obtener las rutas con permiso de edición
  // Para gerencia: retorna todas las rutas disponibles del sistema
  editAllowedRoutes = computed(() => {
    // Si es gerencia, retornar todas las rutas disponibles del sistema
    if (this.isGerencia()) {
      return this.menuConfigService.getProtectedRoutes();
    }
    
    return this.userPermissions()
      .filter((permission) => permission.isActive && permission.permissionType === 'edit')
      .map((permission) => permission.route);
  });

  /**
   * Carga los permisos del usuario actual
   */
  loadUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.id) {
      this.userPermissions.set([]);
      this.lastLoadedUserId = null;
      return;
    }

    // Evitar llamadas duplicadas: si ya se están cargando permisos para el mismo usuario, no hacer nada
    if (this.isLoadingPermissions && this.lastLoadedUserId === currentUser.id) {
      return;
    }

    // Si los permisos ya están cargados para este usuario, no recargar
    if (this.lastLoadedUserId === currentUser.id && this.userPermissions().length > 0) {
      return;
    }

    this.isLoadingPermissions = true;
    this.lastLoadedUserId = currentUser.id;

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
        this.isLoadingPermissions = false;
      },
      error: () => {
        this.userPermissions.set([]);
        this.isLoadingPermissions = false;
      },
    });
  }

  /**
   * Verifica si el usuario tiene permiso para acceder a una ruta específica
   * El dashboard siempre está disponible sin restricciones
   * Para gerencia: todas las rutas están disponibles
   * 
   * También verifica si alguna ruta permitida es un prefijo de la ruta solicitada.
   * Por ejemplo, si el usuario tiene permiso para '/documents', puede acceder a
   * '/documents/ventas' y '/documents/compras'.
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
    
    const allowedRoutes = this.allowedRoutes();
    
    // Verificar coincidencia exacta
    if (allowedRoutes.includes(route)) {
      return true;
    }
    
    // Verificar si alguna ruta permitida es un prefijo de la ruta solicitada
    const normalizedRoute = route.endsWith('/') && route !== '/' ? route.slice(0, -1) : route;
    return allowedRoutes.some((allowedRoute) => {
      const normalizedAllowed = allowedRoute.endsWith('/') && allowedRoute !== '/' 
        ? allowedRoute.slice(0, -1) 
        : allowedRoute;
      
      if (normalizedRoute === normalizedAllowed) {
        return true;
      }
      
      // Verificar si la ruta solicitada es hija de la ruta permitida
      if (normalizedRoute.startsWith(normalizedAllowed + '/')) {
        return true;
      }
      
      return false;
    });
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
   * 
   * También verifica si alguna ruta permitida es un prefijo de la ruta solicitada.
   * Por ejemplo, si el usuario tiene permiso para '/documents', puede acceder a
   * '/documents/ventas' y '/documents/compras'.
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
    
    // Verificar coincidencia exacta
    if (allowedRoutes.includes(route)) {
      return true;
    }
    
    // Verificar si alguna ruta permitida es un prefijo de la ruta solicitada
    // Esto permite que rutas hijas sean accesibles si se tiene permiso a la ruta padre
    // Por ejemplo: si tiene permiso a '/documents', puede acceder a '/documents/ventas'
    const normalizedRoute = route.endsWith('/') && route !== '/' ? route.slice(0, -1) : route;
    const hasAccess = allowedRoutes.some((allowedRoute) => {
      // Normalizar la ruta permitida
      const normalizedAllowed = allowedRoute.endsWith('/') && allowedRoute !== '/' 
        ? allowedRoute.slice(0, -1) 
        : allowedRoute;
      
      // Verificar si la ruta solicitada comienza con la ruta permitida seguida de '/'
      // Esto asegura que '/documents' permita '/documents/ventas' pero no '/documents-other'
      if (normalizedRoute === normalizedAllowed) {
        return true; // Coincidencia exacta (ya verificada arriba, pero por seguridad)
      }
      
      // Verificar si la ruta solicitada es hija de la ruta permitida
      if (normalizedRoute.startsWith(normalizedAllowed + '/')) {
        return true;
      }
      
      return false;
    });
    
    return hasAccess;
  }

  /**
   * Verifica si el usuario tiene permiso de edición para una ruta específica
   * Útil para mostrar/ocultar botones de crear, editar, eliminar
   * El dashboard siempre tiene permiso de edición
   * Para gerencia: todas las rutas tienen permiso de edición
   */
  canEdit(route: string): boolean {
    // El dashboard siempre tiene permiso de edición
    if (route === '/dashboard') {
      return true;
    }
    
    // Para gerencia: todas las rutas tienen permiso de edición
    if (this.isGerencia()) {
      return true;
    }
    
    const editAllowedRoutes = this.editAllowedRoutes();
    const hasEditAccess = editAllowedRoutes.includes(route);
    return hasEditAccess;
  }

  /**
   * Obtiene el tipo de permiso para una ruta específica
   * Retorna 'edit', 'view' o null si no tiene permiso
   */
  getPermissionType(route: string): 'view' | 'edit' | null {
    // El dashboard siempre tiene permiso de edición
    if (route === '/dashboard') {
      return 'edit';
    }
    
    // Para gerencia: todas las rutas tienen permiso de edición
    if (this.isGerencia()) {
      return 'edit';
    }
    
    const permission = this.userPermissions().find(
      (p) => p.route === route && p.isActive
    );
    
    return permission?.permissionType || null;
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
    // Limpiar el caché para forzar una recarga
    this.lastLoadedUserId = null;
    this.isLoadingPermissions = false;
    this.loadUserPermissions();
  }
}
