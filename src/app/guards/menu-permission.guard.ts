import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MenuPermissionsApiService } from '../shared/services/menu-permissions-api.service';
import { AuthService } from '../pages/login/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class MenuPermissionGuard implements CanActivate {
  private readonly menuPermissionsApi = inject(MenuPermissionsApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const requiredRoute = route.data['menuPermission'] as string;

    // Si no se especifica un permiso requerido, permitir el acceso
    if (!requiredRoute) {
      return of(true);
    }

    // El dashboard siempre está disponible sin restricciones
    if (requiredRoute === '/dashboard') {
      return of(true);
    }

    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/ingreso']);
      return of(false);
    }

    // Obtener el usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.router.navigate(['/ingreso']);
      return of(false);
    }

    // Para gerencia: permitir acceso a todas las rutas sin verificar permisos
    if (this.authService.isGerencia()) {
      return of(true);
    }

    // Verificar si el usuario tiene permiso para acceder a la ruta
    return this.menuPermissionsApi.checkPermission(currentUser.id, requiredRoute).pipe(
      map((response) => {
        if (response.hasPermission) {
          return true;
        } else {
          this.redirectToUnauthorized();
          return false;
        }
      }),
      catchError((error) => {
        console.error('Error checking menu permission:', error);
        // En caso de error, redirigir a página de no autorizado
        this.redirectToUnauthorized();
        return of(false);
      })
    );
  }

  private redirectToUnauthorized(): void {
    this.router.navigate(['/unauthorized']);
  }
}
