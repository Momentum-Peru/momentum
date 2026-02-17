import { Component, signal, OnInit, inject, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MsalRedirectComponent } from '@azure/msal-angular';
import { PermissionsService } from './core/services/permissions.service';
import { AuthService } from './pages/login/services/auth.service';
import { PermissionsRequiredComponent } from './components/permissions-required/permissions-required';
import { filter, firstValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PermissionsRequiredComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly permissionsService = inject(PermissionsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly title = signal('Momentum');
  showPermissionsRequired = signal<boolean>(false);

  private routeSubscription?: Subscription;
  private checkInterval?: any;

  ngOnInit(): void {
    // Verificar permisos al iniciar
    this.checkPermissionsForCurrentRoute();

    // Escuchar cambios de ruta
    this.routeSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkPermissionsForCurrentRoute();
      });

    // Verificar permisos periódicamente (cada 2 segundos) cuando se muestre el modal
    // Esto permite detectar cuando el usuario otorga permisos manualmente
    this.checkInterval = setInterval(() => {
      if (this.showPermissionsRequired()) {
        this.checkPermissionsForCurrentRoute();
      }
    }, 2000);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  /**
   * Verifica si se deben mostrar los permisos según la ruta actual
   */
  private async checkPermissionsForCurrentRoute(): Promise<void> {
    const currentUrl = this.router.url;

    // Rutas públicas que no requieren permisos
    const publicRoutes = ['/ingreso', '/registro', '/unauthorized', '/solicitud-contacto', '/sergio-nolasco'];
    const isPublic = publicRoutes.some(route => currentUrl.startsWith(route));

    // Si es una ruta pública, no verificar permisos
    if (isPublic) {
      this.showPermissionsRequired.set(false);
      return;
    }

    // Si el usuario no está autenticado, no verificar permisos (el auth guard se encargará)
    if (!this.authService.isAuthenticated()) {
      this.showPermissionsRequired.set(false);
      return;
    }

    // Verificar permisos solo para rutas protegidas
    try {
      const status = await firstValueFrom(this.permissionsService.checkPermissions());
      this.showPermissionsRequired.set(!status.allGranted);
    } catch (error) {
      console.error('Error al verificar permisos:', error);
      // En caso de error, no mostrar el modal (permitir acceso)
      this.showPermissionsRequired.set(false);
    }
  }
}
