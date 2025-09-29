import { Routes } from '@angular/router';
import { requireAuthGuard, publicGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: 'ingreso',
        loadComponent: () => import('./pages/login/login').then(m => m.Login),
        canActivate: [publicGuard]
    },
    {
        path: 'registro',
        loadComponent: () => import('./pages/register/register').then(m => m.Register),
        canActivate: [publicGuard]
    },
    {
        path: 'auth/callback',
        loadComponent: () => import('./pages/google-callback/google-callback').then(m => m.GoogleCallbackComponent),
    },
    {
        path: '',
        loadComponent: () => import('./layouts/main/main').then(m => m.Main),
        canActivate: [requireAuthGuard],
        children: [
            {
                path: 'calendario',
                loadComponent: () => import('./pages/calendar/calendar').then(m => m.Calendar),
            },
        ],
    },
    // Ruta por defecto - redirigir según autenticación
    {
        path: '**',
        redirectTo: 'calendario',
        pathMatch: 'full'
    }

];
