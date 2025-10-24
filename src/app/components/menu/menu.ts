import {
  Component,
  signal,
  HostListener,
  inject,
  OnInit,
  OnDestroy,
  computed,
} from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../pages/login/services/auth.service';
import { MenuService } from '../../shared/services/menu.service';
import { Button } from 'primeng/button';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [Button, RouterModule],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu implements OnInit, OnDestroy {
  private router = inject(Router);
  private menuService = inject(MenuService);

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

  // Items del menú (todos los elementos disponibles)
  allMenuItems = signal([
    { link: '/dashboard', label: 'Dashboard', icon: 'pi pi-chart-line' },
    { link: '/clients', label: 'Clientes', icon: 'pi pi-briefcase' },
    { link: '/requirements', label: 'Requerimientos', icon: 'pi pi-inbox' },
    { link: '/tdrs', label: 'TDRs', icon: 'pi pi-file' },
    { link: '/quotes', label: 'Cotizaciones', icon: 'pi pi-dollar' },
    { link: '/orders', label: 'Órdenes', icon: 'pi pi-shopping-cart' },
    { link: '/projects', label: 'Proyectos', icon: 'pi pi-folder' },
    { link: '/documents', label: 'Documentos', icon: 'pi pi-file' },
    { link: '/tasks', label: 'Tareas', icon: 'pi pi-check-square' },
    { link: '/daily-reports', label: 'Reportes Diarios', icon: 'pi pi-calendar' },
    { link: '/users', label: 'Usuarios', icon: 'pi pi-users' },
    { link: '/menu-permissions', label: 'Permisos', icon: 'pi pi-shield' },
  ]);

  // Items del menú filtrados por permisos
  menuItems = computed(() => {
    const filtered = this.allMenuItems().filter((item) => this.menuService.canAccess(item.link));
    console.log('Menu items filtered by permissions:', filtered);
    return filtered;
  });

  // Computed para verificar si el usuario tiene algún permiso
  hasAnyPermission = computed(() => {
    return this.menuItems().length > 0;
  });

  ngOnInit() {
    // Inicializar el servicio de menú para cargar permisos
    this.menuService.initialize();

    // Suscribirse a cambios de ruta
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
      });

    // Suscribirse a cambios del usuario
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.loadUserInfo();
      // Refrescar permisos cuando cambie el usuario
      this.menuService.refreshPermissions();
    });

    // Cargar información inicial del usuario
    this.loadUserInfo();
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
  isActiveRoute(route: string): boolean {
    return this.currentRoute() === route;
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
  onResize(event: any): void {
    // Si la pantalla es mayor a md (768px), cerrar el menú
    if (event.target.innerWidth >= 768) {
      this.closeMenu();
    }
  }

  /**
   * Escucha la tecla Escape para cerrar el menú
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
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
