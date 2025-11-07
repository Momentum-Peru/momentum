import {
  Component,
  signal,
  HostListener,
  inject,
  OnInit,
  OnDestroy,
  computed,
  effect,
} from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../pages/login/services/auth.service';
import { MenuService } from '../../shared/services/menu.service';
import { MenuConfigService } from '../../shared/services/menu-config.service';
import { Button } from 'primeng/button';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [Button, RouterModule, PanelMenuModule],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu implements OnInit, OnDestroy {
  private router = inject(Router);
  private menuService = inject(MenuService);
  private menuConfig = inject(MenuConfigService);

  // Hacer el servicio público para acceso desde el template
  authService = inject(AuthService);

  // Estado del menú hamburguesa
  isMenuOpen = signal(false);

  // Ruta actual
  currentRoute = signal('');

  // Nombre de usuario
  userName = signal('Usuario');

  // Suscripción para limpiar
  private userSubscription?: Subscription;

  // Items del menú con submenús (estructura PrimeNG)
  menuItems = signal<MenuItem[]>([]);

  // Items directos (sin submenús) separados para renderizado manual
  directMenuItems = signal<MenuItem[]>([]);

  // Items con submenús para PanelMenu
  submenuItems = signal<MenuItem[]>([]);

  // Estado de carga de permisos
  isLoadingPermissions = signal(true);

  // Computed para verificar si el usuario tiene algún permiso
  hasAnyPermission = computed(() => {
    // Si aún está cargando, no mostrar el mensaje de "sin permisos"
    if (this.isLoadingPermissions()) {
      return true; // Mostrar loading o esperar
    }
    return this.directMenuItems().length > 0 || this.submenuItems().length > 0;
  });

  constructor() {
    // Effect para recargar el menú cuando cambien los permisos
    effect(() => {
      // Acceder a allowedRoutes para que el effect se ejecute cuando cambie
      this.menuService.allowedRoutes();
      const currentUser = this.authService.getCurrentUser();

      // Cuando los permisos cambien, recargar items del menú
      if (currentUser?.id) {
        // Solo recargar si hay un usuario autenticado
        this.loadMenuItems();
        // Marcar que los permisos se han cargado (al menos se intentó)
        this.isLoadingPermissions.set(false);
      } else {
        // Si no hay usuario, mantener estado de carga
        this.isLoadingPermissions.set(true);
      }
    });
  }

  ngOnInit() {
    // Cargar información inicial del usuario
    this.loadUserInfo();

    // Inicializar la ruta actual (solo la ruta, sin query params)
    const initialUrl = this.router.url.split('?')[0];
    this.currentRoute.set(initialUrl);
    this.loadMenuItems();

    // Suscribirse a cambios de ruta
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Solo la ruta, sin query params
        const url = event.url.split('?')[0];
        this.currentRoute.set(url);
        this.loadMenuItems(); // Recargar items para actualizar estado activo
        // Cerrar el menú móvil al navegar
        this.closeMenu();
      });

    // Suscribirse a cambios del usuario
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.loadUserInfo();
      // Marcar como cargando cuando cambie el usuario
      if (user?.id) {
        this.isLoadingPermissions.set(true);
        // Refrescar permisos cuando cambie el usuario
        this.menuService.refreshPermissions();
      } else {
        this.isLoadingPermissions.set(false);
      }
    });

    // Inicializar el servicio de menú para cargar permisos
    // Esto debe hacerse después de verificar que hay un usuario
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.menuService.initialize();
    } else {
      // Si no hay usuario, marcar como no cargando
      this.isLoadingPermissions.set(false);
    }
  }

  /**
   * Carga los items del menú filtrando por permisos
   */
  private loadMenuItems(): void {
    const allItems = this.menuConfig.getMenuItemsWithSubmenus();
    const filteredItems = this.filterMenuItemsByPermissions(allItems);

    // Separar items directos de items con submenús
    const directItems: MenuItem[] = [];
    const submenuItems: MenuItem[] = [];

    filteredItems.forEach((item) => {
      if (item.items && item.items.length > 0) {
        submenuItems.push(item);
      } else {
        directItems.push(item);
      }
    });

    this.directMenuItems.set(directItems);
    this.submenuItems.set(submenuItems);
    this.menuItems.set(filteredItems);
  }

  /**
   * Verifica si algún item dentro de un grupo tiene una ruta activa
   */
  private hasActiveChild(items: MenuItem[] | undefined): boolean {
    if (!items) return false;
    return items.some((subItem) => {
      const routerLink = this.getRouterLink(subItem);
      return routerLink && this.isActiveRoute(routerLink);
    });
  }

  /**
   * Filtra los items del menú según los permisos del usuario
   */
  private filterMenuItemsByPermissions(items: MenuItem[]): MenuItem[] {
    return items
      .map((item) => {
        // Si tiene submenús, filtrarlos también
        if (item.items && item.items.length > 0) {
          const filteredSubItems = item.items
            .filter((subItem) => {
              if (subItem.routerLink) {
                return this.menuService.canAccess(subItem.routerLink as string);
              }
              return true;
            })
            .map((subItem) => {
              // Marcar como activo si la ruta coincide
              const routerLink = this.getRouterLink(subItem);
              const isActive = routerLink && this.isActiveRoute(routerLink);

              // Combinar styleClass existente con la clase activa si aplica
              const existingStyleClass = subItem.styleClass || '';
              const activeStyleClass = isActive ? 'p-menuitem-link-active' : '';
              const combinedStyleClass = [existingStyleClass, activeStyleClass]
                .filter(Boolean)
                .join(' ');

              const itemWithClass: MenuItem = {
                ...subItem,
                ...(combinedStyleClass && { styleClass: combinedStyleClass }),
                // Agregar routerLinkActiveOptions para que PrimeNG detecte la ruta activa
                routerLinkActiveOptions: { exact: false },
                // Agregar routerLinkActiveClass para asegurar que se aplique la clase
                routerLinkActiveClass: 'p-menuitem-link-active',
              };
              return itemWithClass;
            });

          // Si no tiene submenús válidos, retornar null para excluirlo
          if (filteredSubItems.length === 0) {
            return null;
          }

          // Verificar si algún subitem está activo para expandir el panel automáticamente
          const hasActive = this.hasActiveChild(filteredSubItems);

          // Retornar el item con submenús filtrados y expandido si tiene un item activo
          return {
            ...item,
            items: filteredSubItems,
            expanded: hasActive, // Expandir automáticamente si tiene un item activo
          };
        }

        // Si es un item sin submenús, verificar permiso
        if (item.routerLink) {
          if (this.menuService.canAccess(item.routerLink as string)) {
            // Marcar como activo si la ruta coincide (aunque routerLinkActive también lo manejará)
            const routerLink = this.getRouterLink(item);
            const isActive = this.isActiveRoute(routerLink);
            return {
              ...item,
              ...(isActive && { styleClass: 'menu-item-active' }),
            };
          }
          return null;
        }

        return item;
      })
      .filter((item): item is MenuItem => item !== null);
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Carga la información del usuario
   */
  private loadUserInfo(): void {
    const user = this.authService.getCurrentUser();

    if (user) {
      const displayName = user.name || user.email || 'Usuario';
      this.userName.set(displayName);
    } else {
      this.userName.set('Usuario');
    }
  }

  /**
   * Verifica si una ruta está activa
   */
  isActiveRoute(route: string | undefined): boolean {
    if (!route) return false;
    const current = this.currentRoute();

    // Normalizar rutas (eliminar trailing slash si existe, excepto para '/')
    const normalizedRoute = route.endsWith('/') && route !== '/' ? route.slice(0, -1) : route;
    const normalizedCurrent = current.endsWith('/') && current !== '/' ? current.slice(0, -1) : current;

    // Comparar rutas exactas
    if (normalizedCurrent === normalizedRoute) return true;

    // Si la ruta del menú no es '/', verificar si la ruta actual empieza con ella
    if (normalizedRoute !== '/' && normalizedRoute !== '') {
      // Verificar si la ruta actual empieza con la ruta del menú seguida de '/'
      // Esto permite que /clients/edit coincida con /clients
      return normalizedCurrent.startsWith(normalizedRoute + '/') || normalizedCurrent === normalizedRoute;
    }

    // Para '/', solo coincidir exactamente
    return false;
  }

  /**
   * Obtiene la ruta como string desde un MenuItem
   */
  getRouterLink(item: MenuItem): string {
    if (typeof item.routerLink === 'string') {
      return item.routerLink;
    }
    if (Array.isArray(item.routerLink) && item.routerLink.length > 0) {
      return item.routerLink[0] as string;
    }
    return '';
  }

  // Método removido - las clases ahora están directamente en el HTML

  /**
   * Maneja la expansión/colapso de paneles del menú
   */
  onPanelToggle(): void {
    // Event handler para cuando se expande/colapsa un panel
    // Puede ser usado para tracking o animaciones adicionales
  }

  /**
   * Alterna el estado del menú
   */
  toggleMenu(): void {
    this.isMenuOpen.update((value) => !value);
  }

  /**
   * Cierra el menú
   */
  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  /**
   * Escucha cambios de tamaño de pantalla para cerrar el menú en desktop
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    // Si la pantalla es mayor a md (768px), cerrar el menú
    const target = event.target as Window;
    if (target.innerWidth >= 768) {
      this.closeMenu();
    }
  }

  /**
   * Escucha la tecla Escape para cerrar el menú
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMenuOpen()) {
      this.closeMenu();
    }
  }

  /**
   * Maneja el cierre de sesión
   */
  onLogout(): void {
    this.closeMenu();
    this.authService.logout();
  }

  /**
   * Refresca la información del usuario (método público para debug)
   */
  refreshUserInfo(): void {
    this.loadUserInfo();
  }
}
