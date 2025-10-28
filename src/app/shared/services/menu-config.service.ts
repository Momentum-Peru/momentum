import { Injectable } from '@angular/core';

export interface MenuRoute {
  path: string;
  label: string;
  icon: string;
}

export interface RouteConfig {
  path: string;
  label: string;
  icon: string;
  canActivate?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class MenuConfigService {
  // Configuración centralizada de todas las rutas del sistema
  private readonly routesConfig: RouteConfig[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'pi pi-chart-line' },
    { path: '/clients', label: 'Clientes', icon: 'pi pi-briefcase' },
    { path: '/providers', label: 'Proveedores', icon: 'pi pi-building' },
    { path: '/requirements', label: 'Requerimientos', icon: 'pi pi-inbox' },
    { path: '/tdrs', label: 'TDRs', icon: 'pi pi-file' },
    { path: '/quotes', label: 'Cotizaciones', icon: 'pi pi-dollar' },
    { path: '/orders', label: 'Órdenes', icon: 'pi pi-shopping-cart' },
    { path: '/projects', label: 'Proyectos', icon: 'pi pi-folder' },
    { path: '/documents', label: 'Documentos', icon: 'pi pi-file' },
    { path: '/tasks', label: 'Tareas', icon: 'pi pi-check-square' },
    { path: '/daily-reports', label: 'Reportes Diarios', icon: 'pi pi-calendar' },
    { path: '/users', label: 'Usuarios', icon: 'pi pi-users' },
    { path: '/menu-permissions', label: 'Permisos', icon: 'pi pi-shield' },
  ];

  /**
   * Obtiene todas las rutas protegidas del sistema
   */
  getProtectedRoutes(): string[] {
    return this.routesConfig.map((route) => route.path).sort();
  }

  /**
   * Obtiene las rutas con sus etiquetas e iconos para el menú
   */
  getMenuRoutes(): MenuRoute[] {
    return this.routesConfig.map((route) => ({
      path: route.path,
      label: route.label,
      icon: route.icon,
    }));
  }

  /**
   * Obtiene la configuración completa de rutas
   */
  getRoutesConfig(): RouteConfig[] {
    return [...this.routesConfig];
  }

  /**
   * Verifica si una ruta existe en el sistema
   */
  hasRoute(route: string): boolean {
    return this.routesConfig.some((config) => config.path === route);
  }

  /**
   * Obtiene la configuración de una ruta específica
   */
  getRouteConfig(route: string): RouteConfig | null {
    return this.routesConfig.find((config) => config.path === route) || null;
  }

  /**
   * Agrega una nueva ruta al sistema (para uso futuro)
   */
  addRoute(config: RouteConfig): void {
    const existingIndex = this.routesConfig.findIndex((r) => r.path === config.path);
    if (existingIndex >= 0) {
      this.routesConfig[existingIndex] = config;
    } else {
      this.routesConfig.push(config);
      this.routesConfig.sort((a, b) => a.path.localeCompare(b.path));
    }
  }
}
