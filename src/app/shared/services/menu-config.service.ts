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
    { path: '/projects/dashboard', label: 'Dashboard de Proyectos', icon: 'pi pi-chart-line' },
    { path: '/clients', label: 'Clientes', icon: 'pi pi-briefcase' },
    { path: '/projects', label: 'Proyectos', icon: 'pi pi-folder' },
    { path: '/engineering', label: 'Ingeniería', icon: 'pi pi-cog' },
    { path: '/orders', label: 'Órdenes', icon: 'pi pi-shopping-cart' },
    { path: '/requirements', label: 'Requerimientos', icon: 'pi pi-inbox' },
    { path: '/tdrs', label: 'TDRs', icon: 'pi pi-file' },
    { path: '/quotes', label: 'Cotizaciones', icon: 'pi pi-dollar' },
    { path: '/providers', label: 'Proveedores', icon: 'pi pi-building' },
    { path: '/documents', label: 'Documentos', icon: 'pi pi-file' },
    { path: '/tasks', label: 'Tareas', icon: 'pi pi-check-square' },
    { path: '/daily-reports', label: 'Reportes Diarios', icon: 'pi pi-calendar' },
    { path: '/time-tracking', label: 'Marcación de Hora', icon: 'pi pi-clock' },
    { path: '/employees', label: 'Empleados', icon: 'pi pi-user' },
    { path: '/areas', label: 'Áreas', icon: 'pi pi-sitemap' },
    { path: '/face-recognition-register', label: 'Registro Facial', icon: 'pi pi-id-card' },
    { path: '/users', label: 'Usuarios', icon: 'pi pi-users' },
    { path: '/menu-permissions', label: 'Permisos', icon: 'pi pi-shield' },
    { path: '/user-tenants-assignment', label: 'Asignación de Empresas', icon: 'pi pi-building' },
    { path: '/leads', label: 'Leads', icon: 'pi pi-user-plus' },
    { path: '/follow-ups', label: 'Seguimientos', icon: 'pi pi-calendar-plus' },
    { path: '/companies-crm', label: 'Empresas Momentum', icon: 'pi pi-building' },
    { path: '/fi', label: 'Futuros Imposibles', icon: 'pi pi-bolt' },
    { path: '/logs', label: 'Logs del Sistema', icon: 'pi pi-list' },
    { path: '/payroll', label: 'Planillas y Pagos', icon: 'pi pi-wallet' },
    { path: '/profile', label: 'Mi Perfil', icon: 'pi pi-user-edit' },
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
        label: 'DASHBOARD',
        icon: 'pi pi-chart-line',
        routerLink: '/dashboard',
      },
      {
        label: 'PROYECTOS',
        icon: 'pi pi-folder',
        items: [
          {
            label: 'RQ Requerimiento',
            icon: 'pi pi-inbox',
            routerLink: '/requirements',
          },
          {
            label: 'TDR Cliente',
            icon: 'pi pi-file',
            routerLink: '/tdrs',
            queryParams: { type: 'client' },
          },
          {
            label: 'TDR Tecmeing',
            icon: 'pi pi-file',
            routerLink: '/tdrs',
            queryParams: { type: 'tecmeing' },
          },
          {
            label: 'Proyecto Cotización',
            icon: 'pi pi-dollar',
            routerLink: '/projects',
            queryParams: { status: 'EN_COTIZACION' },
          },
          {
            label: 'Proyecto Aprobado',
            icon: 'pi pi-check-circle',
            routerLink: '/projects',
            queryParams: { status: 'APROBADO' },
          },
          {
            label: 'Proyecto en Ejecución',
            icon: 'pi pi-cog',
            routerLink: '/projects',
            queryParams: { status: 'EN_EJECUCION' },
          },
          {
            label: 'Proyecto en Observación',
            icon: 'pi pi-exclamation-triangle',
            routerLink: '/projects',
            queryParams: { status: 'EN_OBSERVACION' },
          },
          {
            label: 'Proyecto Culminado al 100%',
            icon: 'pi pi-check',
            routerLink: '/projects',
            queryParams: { status: 'TERMINADO' },
          },
          {
            label: 'Proyecto Archivados',
            icon: 'pi pi-folder',
            routerLink: '/projects',
            queryParams: { isActive: 'false' },
          },
        ],
      },
      {
        label: 'FUTUROS IMPOSIBLES',
        icon: 'pi pi-bolt',
        routerLink: '/fi',
      },
      {
        label: 'ADMINISTRACIÓN',
        icon: 'pi pi-cog',
        items: [
          {
            label: 'Clientes',
            icon: 'pi pi-briefcase',
            routerLink: '/clients',
          },
          {
            label: 'Proveedores',
            icon: 'pi pi-building',
            routerLink: '/providers',
          },
          {
            label: 'Documentos Tributarios',
            icon: 'pi pi-file',
            routerLink: '/documents',
          },
        ],
      },
      {
        label: 'RECURSOS HUMANOS',
        icon: 'pi pi-users',
        items: [
          {
            label: 'Empleados',
            icon: 'pi pi-user',
            routerLink: '/employees',
          },
          {
            label: 'Planillas y Pagos',
            icon: 'pi pi-wallet',
            routerLink: '/payroll',
          },
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
            label: 'Marcación de Hora',
            icon: 'pi pi-clock',
            routerLink: '/time-tracking',
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
      {
        label: 'CONFIGURACIÓN',
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
          {
            label: 'Asignación de Empresas',
            icon: 'pi pi-building',
            routerLink: '/user-tenants-assignment',
          },
          {
            label: 'Áreas',
            icon: 'pi pi-sitemap',
            routerLink: '/areas',
          },
          {
            label: 'Registro Facial',
            icon: 'pi pi-id-card',
            routerLink: '/face-recognition-register',
          },
          {
            label: 'Mi Perfil',
            icon: 'pi pi-user-edit',
            routerLink: '/profile',
          },
          {
            label: 'Logs del Sistema',
            icon: 'pi pi-list',
            routerLink: '/logs',
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
