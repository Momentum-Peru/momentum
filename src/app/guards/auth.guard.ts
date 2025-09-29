import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../pages/login/services/auth.service';

/**
 * Guard específico para páginas públicas (login, registro)
 * Redirige al home si ya está autenticado
 */
export const publicGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verificar estado de autenticación de manera robusta
    const isAuthenticated = authService.isAuthenticated();

    if (isAuthenticated) {
        router.navigate(['/calendario']);
        return false;
    }

    return true;
};

/**
 * Guard específico para páginas que requieren autenticación
 * Redirige a login si no está autenticado
 */
export const requireAuthGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verificar estado de autenticación de manera robusta
    const isAuthenticated = authService.isAuthenticated();

    if (!isAuthenticated) {
        router.navigate(['/ingreso']);
        return false;
    }

    return true;
};

/**
 * Guard general que maneja ambos casos
 * @deprecated Usar publicGuard y requireAuthGuard específicos
 */
export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const isAuthenticated = authService.isAuthenticated();
    const currentPath = state.url;
    // Si está en la página de login y ya está autenticado, redirigir al home
    if (currentPath === '/ingreso' && isAuthenticated) {
        router.navigate(['/calendario']);
        return false;
    }

    // Si no está autenticado y no está en login ni registro, redirigir a login
    if (!isAuthenticated && currentPath !== '/ingreso' && currentPath !== '/registro') {
        router.navigate(['/ingreso']);
        return false;
    }

    // Permitir acceso a login y registro sin autenticación
    if ((currentPath === '/ingreso' || currentPath === '/registro') && !isAuthenticated) {
        return true;
    }

    // Permitir acceso si está autenticado
    return isAuthenticated;
};
