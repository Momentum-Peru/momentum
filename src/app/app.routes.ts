import { Routes } from '@angular/router';
import { requireAuthGuard, publicGuard } from './guards/auth.guard';
import { MenuPermissionGuard } from './guards/menu-permission.guard';
import { requireTenantGuard } from './guards/tenant.guard';
import { permissionsGuard } from './guards/permissions.guard';

export const routes: Routes = [
  {
    path: 'sergio-nolasco',
    loadComponent: () =>
      import('./pages/personal-card/personal-card.page').then((m) => m.PersonalCardPage),
  },
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
    path: 'unauthorized',
    loadComponent: () =>
      import('./pages/unauthorized/unauthorized').then((m) => m.UnauthorizedPage),
  },
  {
    path: 'solicitud-contacto',
    loadComponent: () => import('./pages/lead-form/lead-form').then((m) => m.LeadFormComponent),
  },
  // Rutas públicas primero
  {
    path: 'landing',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.LandingPage),
  },
  {
    path: 'select-company',
    loadComponent: () =>
      import('./pages/select-company/select-company').then((m) => m.SelectCompanyPage),
    canActivate: [requireAuthGuard],
  },
  // Ruta raíz - redirige a landing (debe estar antes del layout principal)
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full',
  },
  // Rutas protegidas con layout principal
  {
    path: '',
    loadComponent: () => import('./layouts/main/main').then((m) => m.Main),
    canActivate: [requireAuthGuard, requireTenantGuard, permissionsGuard],
    children: [
      {
        path: 'clients',
        loadComponent: () => import('./pages/clients/clients').then((m) => m.ClientsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/clients' },
      },
      {
        path: 'requirements',
        loadComponent: () =>
          import('./pages/requirements/requirements').then((m) => m.RequirementsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/requirements' },
      },
      {
        path: 'tdrs',
        loadComponent: () => import('./pages/tdrs/tdrs').then((m) => m.TdrsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/tdrs' },
      },
      {
        path: 'quotes',
        loadComponent: () => import('./pages/quotes/quotes').then((m) => m.QuotesPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/quotes' },
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/orders').then((m) => m.OrdersPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/orders' },
      },
      {
        path: 'projects',
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./pages/projects-dashboard/projects-dashboard').then(
                (m) => m.ProjectsDashboardPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/projects/dashboard' },
          },
          {
            path: '',
            loadComponent: () => import('./pages/projects/projects').then((m) => m.ProjectsPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/projects' },
          },
        ],
      },
      {
        path: 'engineering',
        loadComponent: () =>
          import('./pages/engineering/engineering').then((m) => m.EngineeringPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/engineering' },
      },
      {
        path: 'daily-reports',
        loadComponent: () =>
          import('./pages/daily-reports/daily-reports').then((m) => m.DailyExpensesPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/daily-reports' },
      },
      {
        path: 'employees',
        loadComponent: () => import('./pages/employees/employees').then((m) => m.EmployeesPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/employees' },
      },
      {
        path: 'areas',
        loadComponent: () => import('./pages/areas/areas').then((m) => m.AreasPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/areas' },
      },
      {
        path: 'meetings',
        loadComponent: () => import('./pages/meetings/meetings').then((m) => m.MeetingsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/meetings' },
      },
      {
        path: 'tickets',
        loadComponent: () => import('./pages/tickets/tickets').then((m) => m.TicketsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/tickets' },
      },
      {
        path: 'material-requests',
        loadComponent: () =>
          import('./pages/material-requests/material-requests').then((m) => m.MaterialRequestsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/material-requests' },
      },
      {
        path: 'petty-cash',
        loadComponent: () => import('./pages/petty-cash/petty-cash').then((m) => m.PettyCashPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/petty-cash' },
      },
      {
        path: 'face-recognition-register',
        loadComponent: () =>
          import('./pages/face-recognition-register/face-recognition-register').then(
            (m) => m.FaceRecognitionRegisterPage,
          ),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/face-recognition-register' },
      },
      {
        path: 'time-tracking',
        loadComponent: () =>
          import('./pages/time-tracking/time-tracking').then((m) => m.TimeTrackingPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/time-tracking' },
      },
      {
        path: 'payroll-calculation',
        loadComponent: () =>
          import('./pages/payroll-calculation/payroll-calculation').then(
            (m) => m.PayrollCalculationPage,
          ),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/payroll-calculation' },
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users').then((m) => m.UsersPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/users' },
      },
      {
        path: 'tasks',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/tasks/tasks').then((m) => m.TasksPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/tasks' },
          },
          {
            path: ':boardId',
            loadComponent: () => import('./pages/tasks/tasks').then((m) => m.TasksPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/tasks' },
          },
        ],
      },
      {
        path: 'documents',
        children: [
          {
            path: 'compras',
            loadComponent: () => import('./pages/documents/documents').then((m) => m.DocumentsPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/documents', tipo: 'compra' },
          },
          {
            path: 'ventas',
            loadComponent: () => import('./pages/documents/documents').then((m) => m.DocumentsPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/documents', tipo: 'venta' },
          },
          {
            path: '',
            redirectTo: 'compras',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
        data: { menuPermission: '/dashboard' },
      },
      {
        path: 'dashboard-gerencia',
        loadComponent: () =>
          import('./pages/dashboard-gerencia/dashboard-gerencia').then(
            (m) => m.DashboardGerenciaPage,
          ),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/dashboard-gerencia' },
      },
      {
        path: 'gerencia-boards',
        loadComponent: () =>
          import('./pages/gerencia-boards/gerencia-boards').then((m) => m.GerenciaBoardsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/gerencia-boards' },
      },
      {
        path: 'menu-permissions',
        loadComponent: () =>
          import('./pages/menu-permissions/menu-permissions').then((m) => m.MenuPermissionsPage),
        canActivate: [MenuPermissionGuard],
        // data: { menuPermission: '/menu-permissions' },
      },
      {
        path: 'providers',
        loadComponent: () => import('./pages/providers/providers').then((m) => m.ProvidersPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/providers' },
      },
      {
        path: 'leads',
        loadComponent: () => import('./pages/leads/leads').then((m) => m.LeadsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/leads' },
      },
      {
        path: 'fi',
        loadComponent: () => import('./pages/fi/fi-list.page').then((m) => m.FiListPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/fi' },
      },
      {
        path: 'fi/:id',
        loadComponent: () => import('./pages/fi/fi-detail.page').then((m) => m.FiDetailPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/fi' },
      },
      {
        path: 'fi/:id/day/:date',
        loadComponent: () => import('./pages/fi/fi-day-detail.page').then((m) => m.FiDayDetailPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/fi' },
      },
      {
        path: 'follow-ups',
        loadComponent: () => import('./pages/follow-ups/follow-ups').then((m) => m.FollowUpsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/follow-ups' },
      },
      {
        path: 'companies-crm',
        loadComponent: () =>
          import('./pages/companies-crm/companies-crm').then((m) => m.CompaniesCrmPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/companies-crm' },
      },
      {
        path: 'user-tenants-assignment',
        loadComponent: () =>
          import('./pages/user-tenants-assignment/user-tenants-assignment').then(
            (m) => m.UserTenantsAssignmentPage,
          ),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/user-tenants-assignment' },
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfilePage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/profile' },
      },
      {
        path: 'logs',
        loadComponent: () => import('./pages/logs/logs').then((m) => m.LogsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/logs' },
      },
      {
        path: 'payroll',
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/payroll' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/payroll/payroll-list/payroll-list.component').then(
                (m) => m.PayrollListComponent,
              ),
          },
          {
            path: 'upload',
            loadComponent: () =>
              import('./pages/payroll/payroll-upload/payroll-upload.component').then(
                (m) => m.PayrollUploadComponent,
              ),
          },
          {
            path: 'detail/:id',
            loadComponent: () =>
              import('./pages/payroll/payroll-detail/payroll-detail.component').then(
                (m) => m.PayrollDetailComponent,
              ),
          },
        ],
      },
      {
        path: '**',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  // Ruta por defecto - redirigir a landing para rutas no encontradas
  {
    path: '**',
    redirectTo: 'landing',
    pathMatch: 'full',
  },
];
