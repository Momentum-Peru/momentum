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
    { path: '/dashboard', label: 'Inicio', icon: 'pi pi-home' },
    { path: '/projects/dashboard', label: 'Dashboard de proyectos', icon: 'pi pi-chart-line' },
    { path: '/clients', label: 'Clientes', icon: 'pi pi-briefcase' },
    { path: '/projects', label: 'Proyectos', icon: 'pi pi-folder' },
    { path: '/engineering', label: 'Ingeniería', icon: 'pi pi-cog' },
    { path: '/orders', label: 'Órdenes', icon: 'pi pi-shopping-cart' },
    { path: '/requirements', label: 'Requerimientos', icon: 'pi pi-inbox' },
    { path: '/tdrs', label: 'Tdrs', icon: 'pi pi-file' },
    { path: '/quotes', label: 'Cotizaciones', icon: 'pi pi-dollar' },
    { path: '/providers', label: 'Proveedores', icon: 'pi pi-building' },
    { path: '/documents', label: 'Documentos', icon: 'pi pi-file' },
    { path: '/tasks', label: 'Tareas', icon: 'pi pi-check-square' },
    { path: '/agenda', label: 'Mi agenda', icon: 'pi pi-book' },
    { path: '/contacts', label: 'Mis contactos', icon: 'pi pi-address-book' },
    { path: '/daily-reports', label: 'Reportes diarios', icon: 'pi pi-calendar' },
    { path: '/time-tracking', label: 'Marcación de hora', icon: 'pi pi-clock' },
    { path: '/employees', label: 'Empleados', icon: 'pi pi-user' },
    { path: '/areas', label: 'Áreas', icon: 'pi pi-sitemap' },
    { path: '/tickets', label: 'Tickets', icon: 'pi pi-ticket' },
    { path: '/material-requests', label: 'Solicitudes de materiales', icon: 'pi pi-shopping-bag' },
    { path: '/petty-cash', label: 'Caja chica', icon: 'pi pi-wallet' },
    { path: '/face-recognition-register', label: 'Registro facial', icon: 'pi pi-id-card' },
    { path: '/users', label: 'Usuarios', icon: 'pi pi-users' },
    { path: '/menu-permissions', label: 'Permisos', icon: 'pi pi-shield' },
    { path: '/user-tenants-assignment', label: 'Asignación de empresas', icon: 'pi pi-building' },
    { path: '/leads', label: 'Leads', icon: 'pi pi-user-plus' },
    { path: '/follow-ups', label: 'Seguimientos', icon: 'pi pi-calendar-plus' },
    { path: '/companies-crm', label: 'Empresas Momentum', icon: 'pi pi-building' },
    { path: '/logs', label: 'Logs del sistema', icon: 'pi pi-list' },
    { path: '/payroll', label: 'Planillas y pagos', icon: 'pi pi-wallet' },
    { path: '/payroll-calculation', label: 'Cálculo de planilla', icon: 'pi pi-calculator' },
    { path: '/profile', label: 'Mi perfil', icon: 'pi pi-user-edit' },
    { path: '/digital-signature', label: 'Firma digital', icon: 'pi pi-pencil' },
    { path: '/work-shifts', label: 'Turnos', icon: 'pi pi-calendar-times' },
    { path: '/purchases/requirements', label: 'Requerimientos de compra', icon: 'pi pi-inbox' },
    { path: '/purchases/orders', label: 'Órdenes de compra', icon: 'pi pi-shopping-cart' },
    { path: '/purchases/vouchers', label: 'Comprobantes CXP', icon: 'pi pi-file' },
    { path: '/logistics/products', label: 'Productos y Servicios', icon: 'pi pi-box' },
    { path: '/logistics/quotes', label: 'Solicitudes de cotización', icon: 'pi pi-inbox' },
    { path: '/logistics/deliveries', label: 'Confirmación de entrega', icon: 'pi pi-check-circle' },
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
        label: 'Inicio',
        icon: 'pi pi-home',
        routerLink: '/dashboard',
      },
      {
        label: 'Mi espacio',
        icon: 'pi pi-briefcase',
        items: [
          {
            label: 'Tareas',
            icon: 'pi pi-check-square',
            routerLink: '/tasks',
          },
          {
            label: 'Mi agenda',
            icon: 'pi pi-book',
            routerLink: '/agenda',
          },
          {
            label: 'Reuniones',
            icon: 'pi pi-video',
            routerLink: '/meetings',
          },
          {
            label: 'Mis contactos',
            icon: 'pi pi-address-book',
            routerLink: '/contacts',
          },
          {
            label: 'Reportes diarios',
            icon: 'pi pi-calendar',
            routerLink: '/daily-reports',
          },
          {
            label: 'Marcación de hora',
            icon: 'pi pi-clock',
            routerLink: '/time-tracking',
          },
        ],
      },
      {
        label: 'Ventas',
        icon: 'pi pi-folder',
        items: [
          {
            label: 'Proyectos',
            icon: 'pi pi-folder',
            routerLink: '/projects',
          },
          {
            label: 'Dashboard',
            icon: 'pi pi-chart-line',
            routerLink: '/projects/dashboard',
          },
          {
            label: 'Requerimientos',
            icon: 'pi pi-inbox',
            routerLink: '/requirements',
          },
          {
            label: 'Cotizaciones',
            icon: 'pi pi-dollar',
            routerLink: '/quotes',
          },
          {
            label: 'TDRs',
            icon: 'pi pi-file',
            routerLink: '/tdrs',
          },
          {
            label: 'Órdenes',
            icon: 'pi pi-shopping-cart',
            routerLink: '/orders',
          },
        ],
      },
      {
        label: 'Ingeniería',
        icon: 'pi pi-cog',
        items: [
          {
            label: 'Documentación',
            icon: 'pi pi-file-edit',
            routerLink: '/engineering',
          },
        ],
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
            label: 'Ventas',
            icon: 'pi pi-dollar',
            routerLink: '/documents/ventas',
          },
          {
            label: 'Compras',
            icon: 'pi pi-shopping-cart',
            routerLink: '/documents/compras',
          },
          {
            label: 'Solicitudes de materiales',
            icon: 'pi pi-shopping-bag',
            routerLink: '/material-requests',
          },
          {
            label: 'Caja chica',
            icon: 'pi pi-wallet',
            routerLink: '/petty-cash',
          },
        ],
      },
      {
        label: 'Logística',
        icon: 'pi pi-truck',
        items: [
          {
            label: 'Proveedores',
            icon: 'pi pi-building',
            routerLink: '/providers',
          },
          {
            label: 'Productos y Servicios',
            icon: 'pi pi-box',
            routerLink: '/logistics/products',
          },
          {
            label: 'Solicitudes de cotización',
            icon: 'pi pi-inbox',
            routerLink: '/logistics/quotes',
          },
          {
            label: 'Órdenes de compra',
            icon: 'pi pi-shopping-cart',
            routerLink: '/purchases/orders',
          },
          {
            label: 'Confirmación de entrega',
            icon: 'pi pi-check-circle',
            routerLink: '/logistics/deliveries',
          },
          {
            label: 'Facturas',
            icon: 'pi pi-file',
            routerLink: '/purchases/vouchers',
          },
        ],
      },
      {
        label: 'Recursos humanos',
        icon: 'pi pi-users',
        items: [
          {
            label: 'Empleados',
            icon: 'pi pi-user',
            routerLink: '/employees',
          },
          {
            label: 'Planillas y pagos',
            icon: 'pi pi-wallet',
            routerLink: '/payroll',
          },
          {
            label: 'Cálculo de planilla',
            icon: 'pi pi-calculator',
            routerLink: '/payroll-calculation',
          },
          {
            label: 'Tickets',
            icon: 'pi pi-ticket',
            routerLink: '/tickets',
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
          {
            label: 'Asignación de empresas',
            icon: 'pi pi-building',
            routerLink: '/user-tenants-assignment',
          },
          {
            label: 'Áreas',
            icon: 'pi pi-sitemap',
            routerLink: '/areas',
          },
          {
            label: 'Turnos',
            icon: 'pi pi-calendar-times',
            routerLink: '/work-shifts',
          },
          {
            label: 'Registro facial',
            icon: 'pi pi-id-card',
            routerLink: '/face-recognition-register',
          },
          {
            label: 'Mi perfil',
            icon: 'pi pi-user-edit',
            routerLink: '/profile',
          },
          {
            label: 'Firma digital',
            icon: 'pi pi-pencil',
            routerLink: '/digital-signature',
          },
          {
            label: 'Logs del sistema',
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
