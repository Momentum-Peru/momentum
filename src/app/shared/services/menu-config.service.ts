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

export interface HubSectionItem {
  label: string;
  icon: string;
  routerLink: string;
  description?: string;
}

export interface HubSection {
  key: string;
  label: string;
  icon: string;
  description: string;
  hubPath: string;
  colorFrom: string;
  colorTo: string;
  colorPrimary: string;
  colorLight: string;
  relatedRoutes: string[];
  items: HubSectionItem[];
}

/** Ítem asignable en la pantalla de permisos (agrupado por menú). */
export interface MenuPermissionSectionItem {
  path: string;
  label: string;
  icon: string;
}

export interface MenuPermissionSection {
  key: string;
  label: string;
  icon: string;
  items: MenuPermissionSectionItem[];
}

@Injectable({
  providedIn: 'root',
})
export class MenuConfigService {
  // Configuración centralizada de todas las rutas del sistema
  private readonly routesConfig: RouteConfig[] = [
    { path: '/dashboard', label: 'Inicio', icon: 'pi pi-home' },
    { path: '/docs', label: 'Documentación', icon: 'pi pi-book' },
    { path: '/projects/dashboard', label: 'Dashboard de centros de costo', icon: 'pi pi-chart-line' },
    { path: '/clients', label: 'Clientes', icon: 'pi pi-briefcase' },
    { path: '/projects', label: 'Centros de costo', icon: 'pi pi-folder' },
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
    { path: '/leads', label: 'Contactos', icon: 'pi pi-user-plus' },
    { path: '/follow-ups', label: 'Seguimientos', icon: 'pi pi-calendar-plus' },
    { path: '/companies-crm', label: 'Empresas Momentum', icon: 'pi pi-building' },
    { path: '/crm-stats', label: 'Estadísticas CRM', icon: 'pi pi-chart-bar' },
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

    { path: '/logistics/quote-entry', label: 'Ingresar cotizaciones', icon: 'pi pi-pencil' },
    { path: '/logistics/compare-quotes', label: 'Comparar cotizaciones', icon: 'pi pi-compare' },
    { path: '/logistics/deliveries', label: 'Confirmación de entrega', icon: 'pi pi-check-circle' },
    { path: '/approvals', label: 'Aprobaciones', icon: 'pi pi-check-circle' },
    { path: '/sales/modelado-3d', label: 'Modelado 3D', icon: 'pi pi-box' },
    { path: '/meetings', label: 'Reuniones', icon: 'pi pi-video' },
    { path: '/dashboard-gerencia', label: 'Dashboard gerencia', icon: 'pi pi-chart-line' },
    { path: '/gerencia-boards', label: 'Tableros gerencia', icon: 'pi pi-th-large' },
    { path: '/companies', label: 'Empresas (sistema)', icon: 'pi pi-building' },
    { path: '/fi', label: 'Futuro imposible', icon: 'pi pi-flag' },
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
        label: 'Documentación',
        icon: 'pi pi-book',
        routerLink: '/docs',
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
        label: 'Centros de costo',
        icon: 'pi pi-folder',
        routerLink: '/projects',
      },
      {
        label: 'Ventas',
        icon: 'pi pi-dollar',
        items: [
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
          {
            label: 'Modelado 3D',
            icon: 'pi pi-box',
            routerLink: '/sales/modelado-3d',
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
            label: 'Ingresar cotizaciones',
            icon: 'pi pi-pencil',
            routerLink: '/logistics/quote-entry',
          },
          {
            label: 'Comparar cotizaciones',
            icon: 'pi pi-compare',
            routerLink: '/logistics/compare-quotes',
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
            label: 'Contactos',
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
            label: 'Aprobaciones',
            icon: 'pi pi-check-circle',
            routerLink: '/approvals',
          },
          {
            label: 'Empresas',
            icon: 'pi pi-building',
            routerLink: '/companies',
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
   * Convierte routerLink de PrimeNG a string.
   */
  private extractMenuRouterLink(routerLink: MenuItem['routerLink']): string | null {
    if (routerLink == null) return null;
    if (Array.isArray(routerLink)) {
      const first = routerLink[0];
      return typeof first === 'string' ? first : null;
    }
    return typeof routerLink === 'string' ? routerLink : null;
  }

  /**
   * Ruta persistida en permisos: documentos ventas/compras comparten `/documents`.
   */
  private resolvePermissionPath(routerLink: string): string {
    if (routerLink === '/documents/ventas' || routerLink === '/documents/compras') {
      return '/documents';
    }
    return routerLink;
  }

  private normalizePath(p: string): string {
    return p.endsWith('/') && p !== '/' ? p.slice(0, -1) : p;
  }

  /**
   * Estructura para /menu-permissions: mismos grupos que el nav lateral + “Otras rutas”.
   */
  getMenuPermissionSections(): MenuPermissionSection[] {
    const menuRoots = this.getMenuItemsWithSubmenus();
    const routeSet = new Set(this.routesConfig.map((r) => r.path));
    const globalSeen = new Set<string>();
    const sections: MenuPermissionSection[] = [];

    for (let i = 0; i < menuRoots.length; i++) {
      const mi = menuRoots[i];
      const key = `nav-${i}-${(mi.label ?? 'item').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
      const sectionIcon = (mi.icon as string) || 'pi pi-folder';
      const sectionLabel = (mi.label as string) || 'Menú';

      /** path -> labels acumuladas (misma ruta de permiso) */
      const bucket = new Map<string, { labels: string[]; icon: string }>();

      if (mi.items?.length) {
        for (const sub of mi.items) {
          const link = this.extractMenuRouterLink(sub.routerLink);
          if (!link) continue;
          const permPath = this.resolvePermissionPath(link);
          if (!routeSet.has(permPath)) continue;
          const subLabel = (sub.label as string) || permPath;
          const subIcon = (sub.icon as string) || 'pi pi-circle';
          const cur = bucket.get(permPath);
          if (cur) {
            cur.labels.push(subLabel);
          } else {
            bucket.set(permPath, { labels: [subLabel], icon: subIcon });
          }
        }
      } else {
        const link = this.extractMenuRouterLink(mi.routerLink);
        if (!link) continue;
        const permPath = this.resolvePermissionPath(link);
        if (!routeSet.has(permPath)) continue;
        bucket.set(permPath, {
          labels: [sectionLabel],
          icon: sectionIcon,
        });
      }

      const items: MenuPermissionSectionItem[] = [];
      for (const [permPath, { labels, icon }] of bucket) {
        const n = this.normalizePath(permPath);
        if (globalSeen.has(n)) continue;
        globalSeen.add(n);
        const cfg = this.getRouteConfig(permPath);
        const label =
          labels.length > 1
            ? `${cfg?.label ?? permPath} (${labels.join(' · ')})`
            : labels[0] || cfg?.label || permPath;
        items.push({
          path: permPath,
          label,
          icon: icon || cfg?.icon || 'pi pi-circle',
        });
      }

      if (items.length > 0) {
        sections.push({ key, label: sectionLabel, icon: sectionIcon, items });
      }
    }

    const orphanItems: MenuPermissionSectionItem[] = [];
    for (const path of this.getProtectedRoutes()) {
      const n = this.normalizePath(path);
      if (globalSeen.has(n)) continue;
      globalSeen.add(n);
      const cfg = this.getRouteConfig(path);
      orphanItems.push({
        path,
        label: cfg?.label || path,
        icon: cfg?.icon || 'pi pi-link',
      });
    }
    if (orphanItems.length > 0) {
      orphanItems.sort((a, b) => a.label.localeCompare(b.label, 'es'));
      sections.push({
        key: 'otras-rutas-sistema',
        label: 'Otras rutas del sistema',
        icon: 'pi pi-server',
        items: orphanItems,
      });
    }

    return sections;
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

  private readonly hubSections: HubSection[] = [
    {
      key: 'mi-espacio',
      label: 'Mi espacio',
      icon: 'pi pi-briefcase',
      description: 'Tu espacio personal de trabajo y productividad',
      hubPath: '/hub/mi-espacio',
      colorFrom: '#1D4ED8',
      colorTo: '#1E3A8A',
      colorPrimary: '#3B82F6',
      colorLight: '#DBEAFE',
      relatedRoutes: ['/tasks', '/agenda', '/meetings', '/contacts', '/daily-reports', '/time-tracking'],
      items: [
        { label: 'Tareas', icon: 'pi pi-check-square', routerLink: '/tasks', description: 'Gestiona tus tareas pendientes' },
        { label: 'Mi agenda', icon: 'pi pi-book', routerLink: '/agenda', description: 'Organiza tu calendario' },
        { label: 'Reuniones', icon: 'pi pi-video', routerLink: '/meetings', description: 'Gestiona tus reuniones' },
        { label: 'Mis contactos', icon: 'pi pi-address-book', routerLink: '/contacts', description: 'Tu libreta de contactos' },
        { label: 'Reportes diarios', icon: 'pi pi-calendar', routerLink: '/daily-reports', description: 'Reportes de actividades' },
        { label: 'Marcación de hora', icon: 'pi pi-clock', routerLink: '/time-tracking', description: 'Control de asistencia' },
      ],
    },
    {
      key: 'ventas',
      label: 'Ventas',
      icon: 'pi pi-dollar',
      description: 'Gestión del pipeline de ventas y seguimiento comercial',
      hubPath: '/hub/ventas',
      colorFrom: '#047857',
      colorTo: '#065F46',
      colorPrimary: '#10B981',
      colorLight: '#D1FAE5',
      relatedRoutes: ['/projects/dashboard', '/requirements', '/quotes', '/tdrs', '/orders', '/sales/modelado-3d'],
      items: [
        { label: 'Dashboard', icon: 'pi pi-chart-line', routerLink: '/projects/dashboard', description: 'Métricas de ventas' },
        { label: 'Requerimientos', icon: 'pi pi-inbox', routerLink: '/requirements', description: 'Solicitudes de clientes' },
        { label: 'Cotizaciones', icon: 'pi pi-dollar', routerLink: '/quotes', description: 'Propuestas económicas' },
        { label: 'TDRs', icon: 'pi pi-file', routerLink: '/tdrs', description: 'Términos de referencia' },
        { label: 'Órdenes', icon: 'pi pi-shopping-cart', routerLink: '/orders', description: 'Órdenes de venta' },
        { label: 'Modelado 3D', icon: 'pi pi-box', routerLink: '/sales/modelado-3d', description: 'Planos 3D por proyecto de modelado (ventas)' },
      ],
    },
    {
      key: 'ingenieria',
      label: 'Ingeniería',
      icon: 'pi pi-cog',
      description: 'Documentación técnica y gestión de proyectos de ingeniería',
      hubPath: '/hub/ingenieria',
      colorFrom: '#6D28D9',
      colorTo: '#4C1D95',
      colorPrimary: '#8B5CF6',
      colorLight: '#EDE9FE',
      relatedRoutes: ['/engineering'],
      items: [
        { label: 'Documentación', icon: 'pi pi-file-edit', routerLink: '/engineering', description: 'Documentos técnicos' },
      ],
    },
    {
      key: 'administracion',
      label: 'Administración',
      icon: 'pi pi-building',
      description: 'Gestión administrativa y financiera de la empresa',
      hubPath: '/hub/administracion',
      colorFrom: '#B45309',
      colorTo: '#92400E',
      colorPrimary: '#F59E0B',
      colorLight: '#FEF3C7',
      relatedRoutes: ['/clients', '/documents', '/material-requests', '/petty-cash'],
      items: [
        { label: 'Clientes', icon: 'pi pi-briefcase', routerLink: '/clients', description: 'Gestión de clientes' },
        { label: 'Ventas', icon: 'pi pi-dollar', routerLink: '/documents/ventas', description: 'Documentos de venta' },
        { label: 'Compras', icon: 'pi pi-shopping-cart', routerLink: '/documents/compras', description: 'Documentos de compra' },
        { label: 'Solicitudes de materiales', icon: 'pi pi-shopping-bag', routerLink: '/material-requests', description: 'Solicitudes internas' },
        { label: 'Caja chica', icon: 'pi pi-wallet', routerLink: '/petty-cash', description: 'Gastos menores' },
      ],
    },
    {
      key: 'logistica',
      label: 'Logística',
      icon: 'pi pi-truck',
      description: 'Gestión de proveedores, compras y cadena de suministro',
      hubPath: '/hub/logistica',
      colorFrom: '#B91C1C',
      colorTo: '#7F1D1D',
      colorPrimary: '#EF4444',
      colorLight: '#FEE2E2',
      relatedRoutes: ['/providers', '/logistics', '/purchases'],
      items: [
        { label: 'Proveedores', icon: 'pi pi-building', routerLink: '/providers', description: 'Gestión de proveedores' },
        { label: 'Productos y Servicios', icon: 'pi pi-box', routerLink: '/logistics/products', description: 'Catálogo de productos' },
        { label: 'Solicitudes de cotización', icon: 'pi pi-inbox', routerLink: '/logistics/quotes', description: 'Solicitudes de precios' },
        { label: 'Ingresar cotizaciones', icon: 'pi pi-pencil', routerLink: '/logistics/quote-entry', description: 'Registro de cotizaciones' },
        { label: 'Comparar cotizaciones', icon: 'pi pi-arrows-h', routerLink: '/logistics/compare-quotes', description: 'Análisis comparativo' },
        { label: 'Órdenes de compra', icon: 'pi pi-shopping-cart', routerLink: '/purchases/orders', description: 'Órdenes a proveedores' },
        { label: 'Confirmación de entrega', icon: 'pi pi-check-circle', routerLink: '/logistics/deliveries', description: 'Control de entregas' },
        { label: 'Facturas', icon: 'pi pi-file', routerLink: '/purchases/vouchers', description: 'Comprobantes de pago' },
      ],
    },
    {
      key: 'rrhh',
      label: 'Recursos Humanos',
      icon: 'pi pi-users',
      description: 'Gestión del talento humano y nómina de empleados',
      hubPath: '/hub/rrhh',
      colorFrom: '#0F766E',
      colorTo: '#134E4A',
      colorPrimary: '#14B8A6',
      colorLight: '#CCFBF1',
      relatedRoutes: ['/employees', '/payroll', '/payroll-calculation', '/tickets'],
      items: [
        { label: 'Empleados', icon: 'pi pi-user', routerLink: '/employees', description: 'Gestión de empleados' },
        { label: 'Planillas y pagos', icon: 'pi pi-wallet', routerLink: '/payroll', description: 'Nómina de empleados' },
        { label: 'Cálculo de planilla', icon: 'pi pi-calculator', routerLink: '/payroll-calculation', description: 'Cálculo de haberes' },
        { label: 'Tickets', icon: 'pi pi-ticket', routerLink: '/tickets', description: 'Solicitudes internas' },
      ],
    },
    {
      key: 'crm',
      label: 'CRM',
      icon: 'pi pi-sitemap',
      description: 'Gestión de relaciones con clientes y seguimiento comercial',
      hubPath: '/hub/crm',
      colorFrom: '#BE185D',
      colorTo: '#831843',
      colorPrimary: '#EC4899',
      colorLight: '#FCE7F3',
      relatedRoutes: ['/leads', '/follow-ups', '/companies-crm', '/crm-stats'],
      items: [
        { label: 'Contactos', icon: 'pi pi-user-plus', routerLink: '/leads', description: 'Leads y prospectos' },
        { label: 'Seguimientos', icon: 'pi pi-calendar-plus', routerLink: '/follow-ups', description: 'Actividades de seguimiento' },
        { label: 'Empresas', icon: 'pi pi-building', routerLink: '/companies-crm', description: 'Empresas y cuentas' },
        { label: 'Estadísticas', icon: 'pi pi-chart-bar', routerLink: '/crm-stats', description: 'KPIs y métricas del CRM' },
      ],
    },
    {
      key: 'configuracion',
      label: 'Configuración',
      icon: 'pi pi-sliders-h',
      description: 'Configuración del sistema, usuarios y permisos',
      hubPath: '/hub/configuracion',
      colorFrom: '#374151',
      colorTo: '#111827',
      colorPrimary: '#6B7280',
      colorLight: '#F3F4F6',
      relatedRoutes: ['/users', '/menu-permissions', '/user-tenants-assignment', '/areas', '/work-shifts', '/face-recognition-register', '/profile', '/digital-signature', '/approvals', '/companies', '/logs'],
      items: [
        { label: 'Usuarios', icon: 'pi pi-users', routerLink: '/users', description: 'Gestión de usuarios' },
        { label: 'Permisos', icon: 'pi pi-shield', routerLink: '/menu-permissions', description: 'Control de accesos' },
        { label: 'Asignación de empresas', icon: 'pi pi-building', routerLink: '/user-tenants-assignment', description: 'Empresas por usuario' },
        { label: 'Áreas', icon: 'pi pi-sitemap', routerLink: '/areas', description: 'Estructura organizacional' },
        { label: 'Turnos', icon: 'pi pi-calendar-times', routerLink: '/work-shifts', description: 'Horarios de trabajo' },
        { label: 'Registro facial', icon: 'pi pi-id-card', routerLink: '/face-recognition-register', description: 'Biometría facial' },
        { label: 'Mi perfil', icon: 'pi pi-user-edit', routerLink: '/profile', description: 'Datos personales' },
        { label: 'Firma digital', icon: 'pi pi-pencil', routerLink: '/digital-signature', description: 'Firma electrónica' },
        { label: 'Aprobaciones', icon: 'pi pi-check-circle', routerLink: '/approvals', description: 'Flujos de aprobación' },
        { label: 'Empresas', icon: 'pi pi-building', routerLink: '/companies', description: 'Empresas del sistema' },
        { label: 'Logs del sistema', icon: 'pi pi-list', routerLink: '/logs', description: 'Auditoría del sistema' },
      ],
    },
  ];

  getHubSections(): HubSection[] {
    return this.hubSections;
  }

  getHubSection(key: string): HubSection | undefined {
    return this.hubSections.find(s => s.key === key);
  }

  getHubSectionByLabel(label: string): HubSection | undefined {
    return this.hubSections.find(s => s.label.toLowerCase() === label.toLowerCase());
  }
}
