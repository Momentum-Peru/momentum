import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../pages/login/services/auth.service';

/**
 * Interceptor que agrega automáticamente el token de autorización a todas las peticiones HTTP
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);

    // Obtener el token actual
    const token = authService.getToken();

    // Si hay token y la petición no es de login/register, agregar el header de autorización
    if (token && !req.url.includes('/auth/login') && !req.url.includes('/auth/register') && !req.url.includes('/auth/google')) {
        const authReq = req.clone({
            setHeaders: {
                'Authorization': `Bearer ${token}`
            }
        });
        return next(authReq);
    }

    // Si no hay token o es una petición de autenticación, continuar sin modificar
    return next(req);
};
