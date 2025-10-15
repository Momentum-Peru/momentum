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
        path: 'auth/email/google/callback',
        loadComponent: () => import('./pages/email-oauth-callback/email-oauth-callback').then(m => m.EmailOAuthCallbackComponent),
    },
    {
        path: 'auth/email/outlook/callback',
        loadComponent: () => import('./pages/email-oauth-callback/email-oauth-callback').then(m => m.EmailOAuthCallbackComponent),
    },
    {
        path: 'auth/contacts/google/callback',
        loadComponent: () => import('./pages/google-contacts-callback/google-contacts-callback').then(m => m.GoogleContactsCallbackComponent),
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
            {
                path: 'telefono',
                loadComponent: () => import('./pages/telefono/telefono').then(m => m.Telefono),
            },
            {
                path: 'cuentas-email',
                loadComponent: () => import('./pages/email-accounts/email-accounts').then(m => m.EmailAccountsComponent),
            },
            {
                path: 'contactos',
                loadComponent: () => import('./pages/contacts/contacts').then(m => m.ContactsComponent),
            },
            {
                path: '**',
                redirectTo: 'calendario',
                pathMatch: 'full'
            }

        ],
    },
    // Ruta por defecto - redirigir según autenticación
    {
        path: '**',
        redirectTo: '',
        pathMatch: 'full'
    }

];
