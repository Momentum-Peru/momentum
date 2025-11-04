import { Injectable } from '@angular/core';
import { MenuItem } from 'primeng/api';

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
    { path: '/projects', label: 'Proyectos', icon: 'pi pi-folder' },
    { path: '/orders', label: 'Órdenes', icon: 'pi pi-shopping-cart' },
    { path: '/requirements', label: 'Requerimientos', icon: 'pi pi-inbox' },
    { path: '/tdrs', label: 'TDRs', icon: 'pi pi-file' },
    { path: '/quotes', label: 'Cotizaciones', icon: 'pi pi-dollar' },
    { path: '/providers', label: 'Proveedores', icon: 'pi pi-building' },
    { path: '/documents', label: 'Documentos', icon: 'pi pi-file' },
    { path: '/tasks', label: 'Tareas', icon: 'pi pi-check-square' },
    { path: '/daily-reports', label: 'Reportes Diarios', icon: 'pi pi-calendar' },
    { path: '/employees', label: 'Empleados', icon: 'pi pi-user' },
    { path: '/users', label: 'Usuarios', icon: 'pi pi-users' },
    { path: '/menu-permissions', label: 'Permisos', icon: 'pi pi-shield' },
    { path: '/leads', label: 'Leads', icon: 'pi pi-user-plus' },
    { path: '/contacts-crm', label: 'Contactos CRM', icon: 'pi pi-address-book' },
    { path: '/follow-ups', label: 'Seguimientos', icon: 'pi pi-calendar-plus' },
    { path: '/companies-crm', label: 'Empresas Momentum', icon: 'pi pi-building' },
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
   * Obtiene la estructura del menú con submenús organizados
   * Retorna items de PrimeNG MenuItem para usar con PanelMenu
   */
  getMenuItemsWithSubmenus(): MenuItem[] {
    return [
      {
        label: 'Dashboard',
        icon: 'pi pi-chart-line',
        routerLink: '/dashboard',
      },
      {
        label: 'Administración',
        icon: 'pi pi-cog',
        items: [
          {
            label: 'Clientes',
            icon: 'pi pi-briefcase',
            routerLink: '/clients',
          },
          {
            label: 'Proyectos',
            icon: 'pi pi-folder',
            routerLink: '/projects',
          },
          {
            label: 'Órdenes',
            icon: 'pi pi-shopping-cart',
            routerLink: '/orders',
          },
          {
            label: 'Requerimientos',
            icon: 'pi pi-inbox',
            routerLink: '/requirements',
          },
          {
            label: 'TDRs',
            icon: 'pi pi-file',
            routerLink: '/tdrs',
          },
          {
            label: 'Cotizaciones',
            icon: 'pi pi-dollar',
            routerLink: '/quotes',
          },
          {
            label: 'Proveedores',
            icon: 'pi pi-building',
            routerLink: '/providers',
          },
          {
            label: 'Documentos',
            icon: 'pi pi-file',
            routerLink: '/documents',
          },
        ],
      },
      {
        label: 'Talento Humano',
        icon: 'pi pi-users',
        items: [
          {
            label: 'Tareas',
            icon: 'pi pi-check-square',
            routerLink: '/tasks',
          },
          {
            label: 'Reportes Diarios',
            icon: 'pi pi-calendar',
            routerLink: '/daily-reports',
          },
          {
            label: 'Empleados',
            icon: 'pi pi-user',
            routerLink: '/employees',
          },
        ],
      },
      {
        label: 'Configuración',
        icon: 'pi pi-sliders-h',
        items: [
          {
            label: 'Usuarios',
            icon: 'pi pi-users',
            routerLink: '/users',
          },
          {
            label: 'Permisos',
            icon: 'pi pi-shield',
            routerLink: '/menu-permissions',
          },
        ],
      },
      {
        label: 'CRM',
        icon: 'pi pi-sitemap',
        items: [
          {
            label: 'Leads',
            icon: 'pi pi-user-plus',
            routerLink: '/leads',
          },
          {
            label: 'Contactos CRM',
            icon: 'pi pi-address-book',
            routerLink: '/contacts-crm',
          },
          {
            label: 'Seguimientos',
            icon: 'pi pi-calendar-plus',
            routerLink: '/follow-ups',
          },
          {
            label: 'Empresas',
            icon: 'pi pi-building',
            routerLink: '/companies-crm',
          },
        ],
      },
    ];
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
