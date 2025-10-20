import { Routes } from '@angular/router';
import { requireAuthGuard, publicGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'ingreso',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [publicGuard],
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
    canActivate: [publicGuard],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main/main').then((m) => m.Main),
    canActivate: [requireAuthGuard],
    children: [
      {
        path: 'clients',
        loadComponent: () => import('./pages/clients/clients').then((m) => m.ClientsPage),
      },
      {
        path: 'requirements',
        loadComponent: () =>
          import('./pages/requirements/requirements').then((m) => m.RequirementsPage),
      },
      {
        path: 'tdrs',
        loadComponent: () => import('./pages/tdrs/tdrs').then((m) => m.TdrsPage),
      },
      {
        path: 'quotes',
        loadComponent: () => import('./pages/quotes/quotes').then((m) => m.QuotesPage),
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/orders').then((m) => m.OrdersPage),
      },
      {
        path: 'projects',
        loadComponent: () => import('./pages/projects/projects').then((m) => m.ProjectsPage),
      },
      {
        path: 'daily-reports',
        loadComponent: () =>
          import('./pages/daily-reports/daily-reports').then((m) => m.DailyExpensesPage),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users').then((m) => m.UsersPage),
      },

      {
        path: '**',
        redirectTo: 'clients',
        pathMatch: 'full',
      },
    ],
  },
  // Ruta por defecto - redirigir según autenticación
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
