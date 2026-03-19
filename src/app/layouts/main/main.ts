import { Component, inject, computed, signal, OnInit, effect, HostListener, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Menu } from '../../components/menu/menu';
import { NotificationsBellComponent } from '../../components/notifications-bell/notifications-bell';
import { AuthService } from '../../pages/login/services/auth.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { TenantService } from '../../core/services/tenant.service';
import { ProfileApiService } from '../../shared/services/profile-api.service';
import { UserProfile } from '../../shared/interfaces/profile.interface';
import { MenuConfigService, HubSection } from '../../shared/services/menu-config.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterOutlet, Menu, NotificationsBellComponent, ConfirmDialogModule, ToastModule, Button],
  templateUrl: './main.html',
  styleUrl: './main.scss',
  providers: [ConfirmationService],
})
export class Main implements OnInit, OnDestroy {
  authService = inject(AuthService);
  confirmationService = inject(ConfirmationService);
  tenant = inject(TenantService);
  router = inject(Router);
  profileApi = inject(ProfileApiService);
  menuConfig = inject(MenuConfigService);

  tenantName = computed(() => this.tenant.tenantName());
  userProfile = signal<UserProfile | null>(null);
  userName = signal<string>('');
  userEmail = signal<string>('');
  userProfilePicture = signal<string | null>(null);
  showUserMenu = signal<boolean>(false);

  // Ruta actual reactiva para detectar el hub padre
  currentUrl = signal<string>('');
  private routerSub?: Subscription;

  // Hub padre de la página actual (null si no pertenece a ningún hub)
  parentHub = computed<HubSection | null>(() => {
    const url = this.currentUrl().split('?')[0];
    // No mostrar en la propia página hub
    if (url.startsWith('/hub/')) return null;
    const sections = this.menuConfig.getHubSections();
    return sections.find(s =>
      s.relatedRoutes.some(r => url === r || url.startsWith(r + '/'))
    ) ?? null;
  });

  constructor() {
    // Efecto para actualizar información del usuario cuando cambia el perfil
    effect(() => {
      const profile = this.userProfile();
      if (profile) {
        this.userName.set(profile.name);
        this.userEmail.set(profile.email);
        this.userProfilePicture.set(profile.profilePicture || null);
      } else {
        // Si no hay perfil cargado, usar datos del usuario autenticado
        const user = this.authService.getCurrentUser();
        if (user) {
          this.userName.set(user.name || user.email || 'Usuario');
          this.userEmail.set(user.email || '');
          this.userProfilePicture.set(user.profilePicture || null);
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
    // Inicializar URL actual
    this.currentUrl.set(this.router.url);
    // Actualizar en cada navegación
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => this.currentUrl.set(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  goToParentHub(): void {
    const hub = this.parentHub();
    if (hub) this.router.navigate([hub.hubPath]);
  }

  /**
   * Carga el perfil del usuario autenticado
   */
  loadUserProfile(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      // Establecer valores iniciales desde el usuario autenticado
      this.userName.set(user.name || user.email || 'Usuario');
      this.userEmail.set(user.email || '');
      this.userProfilePicture.set(user.profilePicture || null);

      // Cargar perfil completo desde la API para obtener datos actualizados
      this.profileApi.getProfile().subscribe({
        next: (profile) => {
          this.userProfile.set(profile);
        },
        error: (error) => {
          console.warn('No se pudo cargar el perfil completo:', error);
          // Si falla, mantener los datos del usuario autenticado
        },
      });
    }
  }

  /**
   * Alterna la visibilidad del menú de usuario
   */
  toggleUserMenu(): void {
    this.showUserMenu.update((value) => !value);
  }

  /**
   * Cierra el menú de usuario
   */
  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  /**
   * Cierra el menú cuando se hace clic fuera
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showUserMenu()) {
      const target = event.target as HTMLElement;
      const menuElement = document.querySelector('[data-user-menu]');
      const buttonElement = document.querySelector('[data-user-menu-button]');

      if (menuElement && buttonElement) {
        const clickedInsideMenu = menuElement.contains(target);
        const clickedOnButton = buttonElement.contains(target);

        if (!clickedInsideMenu && !clickedOnButton) {
          this.closeUserMenu();
        }
      }
    }
  }

  /**
   * Navega a la página de editar perfil
   */
  goToProfile(): void {
    this.closeUserMenu();
    this.router.navigate(['/profile']);
  }

  confirmLogout() {
    this.confirmationService.confirm({
      message: '¿Estás seguro de querer cerrar sesión?',
      acceptLabel: 'Si',
      rejectLabel: 'No',
      accept: () => {
        this.authService.logout();
      },
    });
  }

  changeCompany() {
    this.tenant.clearTenant();
    this.router.navigateByUrl('/select-company');
  }
}
