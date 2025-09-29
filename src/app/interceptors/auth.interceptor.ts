import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../pages/login/services/auth.service';

/**
 * Interceptor que maneja errores 401 (No autorizado)
 * Redirige automáticamente al login cuando el token expira o es inválido
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Solo manejar errores 401
            if (error.status === 401) {
                // No redirigir si ya está en la página de login
                const currentPath = router.url;
                if (currentPath !== '/ingreso' && currentPath !== '/registro') {
                    // Limpiar sesión y redirigir al login
                    authService.logout();
                }
            }

            // Re-lanzar el error para que los componentes puedan manejarlo
            return throwError(() => error);
        })
    );
};
