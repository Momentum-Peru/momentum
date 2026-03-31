import { Routes } from '@angular/router';
import { requireAuthGuard, publicGuard } from './guards/auth.guard';
import { MenuPermissionGuard } from './guards/menu-permission.guard';
import { requireTenantGuard } from './guards/tenant.guard';
// rebuild trigger
import { permissionsGuard } from './guards/permissions.guard';

export const routes: Routes = [
  {
    path: 'sergio-nolasco',
    loadComponent: () =>
      import('./pages/personal-card/personal-card.page').then((m) => m.PersonalCardPage),
  },
  {
    path: 'sergionolasco',
    loadComponent: () =>
      import('./pages/sergionolasco/sergionolasco').then((m) => m.SergioNolascoPage),
  },
  {
    path: 'sergionolasco/admin',
    loadComponent: () =>
      import('./pages/sergionolasco/sergionolasco').then((m) => m.SergioNolascoPage),
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
  {
    path: 'asociacion-quio-lima',
    loadComponent: () =>
      import('./pages/association-quio-lima/association-quio-lima.page').then(
        (m) => m.AssociationQuioLimaPage,
      ),
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
  // Sección de documentación ERP (layout con menú de documentación)
  {
    path: 'docs',
    loadComponent: () =>
      import('./layouts/documentation/documentation').then((m) => m.DocumentationLayout),
    canActivate: [requireAuthGuard, requireTenantGuard],
    children: [
      {
        path: '',
        redirectTo: 'logistica/proveedores',
        pathMatch: 'full',
      },
      {
        path: 'logistica',
        children: [
          {
            path: 'proveedores',
            loadComponent: () =>
              import('./pages/docs/doc-proveedores.doc-page').then((m) => m.DocProveedoresPage),
          },
          {
            path: 'compras',
            loadComponent: () =>
              import('./pages/docs/doc-compras.doc-page').then((m) => m.DocComprasPage),
          },
        ],
      },
    ],
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
        path: 'sales',
        children: [
          {
            path: 'modelado-3d',
            loadComponent: () =>
              import('./pages/sales-3d-modeling/sales-3d-modeling-list.page').then(
                (m) => m.Sales3dModelingListPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/sales/modelado-3d' },
          },
          {
            path: 'modelado-3d/:projectId',
            loadComponent: () =>
              import('./pages/sales-3d-modeling/sales-3d-modeling-project.page').then(
                (m) => m.Sales3dModelingProjectPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/sales/modelado-3d' },
          },
        ],
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
        path: 'agenda',
        loadComponent: () => import('./pages/agenda/agenda').then((m) => m.AgendaPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/agenda' },
      },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./pages/contacts/contacts.component').then((m) => m.ContactsComponent),
      },
      {
        path: 'employees',
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/employees' },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/employees/employees').then((m) => m.EmployeesPage),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./pages/employees/employee-form/employee-form').then(
                (m) => m.EmployeeFormPage,
              ),
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./pages/employees/employee-form/employee-form').then(
                (m) => m.EmployeeFormPage,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./pages/employees/employee-summary/employee-summary.component').then(
                (m) => m.EmployeeSummaryComponent,
              ),
          },
        ],
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
        path: 'work-shifts',
        loadComponent: () =>
          import('./pages/work-shifts/work-shifts').then((m) => m.WorkShiftsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/work-shifts' },
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
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/petty-cash/petty-cash-list').then((m) => m.PettyCashListPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/petty-cash' },
          },
          {
            path: 'box/:boxId',
            loadComponent: () =>
              import('./pages/petty-cash/petty-cash').then((m) => m.PettyCashPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/petty-cash' },
          },
        ],
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
        path: 'time-tracking/detail/:userId',
        loadComponent: () =>
          import('./pages/time-tracking/time-tracking-detail/time-tracking-detail.component').then(
            (m) => m.TimeTrackingDetailComponent,
          ),
        canActivate: [MenuPermissionGuard],
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
        path: 'purchases',
        children: [
          {
            path: 'requirements',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./pages/purchases/purchases-requirements.page').then(
                    (m) => m.PurchasesRequirementsPage,
                  ),
                canActivate: [MenuPermissionGuard],
                data: { menuPermission: '/purchases/requirements' },
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./pages/purchases/purchases-requirement-new.page').then(
                    (m) => m.PurchasesRequirementNewPage,
                  ),
                canActivate: [MenuPermissionGuard],
                data: { menuPermission: '/purchases/requirements' },
              },
              {
                path: ':id/edit',
                loadComponent: () =>
                  import('./pages/purchases/purchases-requirement-edit.page').then(
                    (m) => m.PurchasesRequirementEditPage,
                  ),
                canActivate: [MenuPermissionGuard],
                data: { menuPermission: '/purchases/requirements' },
              },
              {
                path: ':id/compare',
                loadComponent: () =>
                  import('./pages/purchases/purchases-compare.page').then(
                    (m) => m.PurchasesComparePage,
                  ),
                canActivate: [MenuPermissionGuard],
                data: { menuPermission: '/purchases/requirements' },
              },
              {
                path: ':id/quote',
                loadComponent: () =>
                  import('./pages/purchases/purchases-quote-register.page').then(
                    (m) => m.PurchasesQuoteRegisterPage,
                  ),
                canActivate: [MenuPermissionGuard],
                data: { menuPermission: '/purchases/requirements' },
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./pages/purchases/purchases-requirement-detail.page').then(
                    (m) => m.PurchasesRequirementDetailPage,
                  ),
                canActivate: [MenuPermissionGuard],
                data: { menuPermission: '/purchases/requirements' },
              },
            ],
          },
          {
            path: 'orders',
            loadComponent: () =>
              import('./pages/purchases/purchases-orders.page').then((m) => m.PurchasesOrdersPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/orders' },
          },
          {
            path: 'orders/new',
            loadComponent: () =>
              import('./pages/purchases/purchases-order-form/purchases-order-form.component').then(
                (m) => m.PurchasesOrderFormComponent,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/orders' },
          },
          {
            path: 'orders/:id/edit',
            loadComponent: () =>
              import('./pages/purchases/purchases-order-form/purchases-order-form.component').then(
                (m) => m.PurchasesOrderFormComponent,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/orders' },
          },
          {
            path: 'vouchers',
            loadComponent: () =>
              import('./pages/purchases/purchases-vouchers.page').then(
                (m) => m.PurchasesVouchersPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/vouchers' },
          },
          {
            path: 'receipts',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./pages/purchases/purchases-receipts.page').then(
                    (m) => m.PurchasesReceiptsPage,
                  ),
                canActivate: [MenuPermissionGuard],
                data: { menuPermission: '/purchases/orders' }, // Usar permiso de orders por ahora
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./pages/purchases/purchases-receipt-register.page').then(
                    (m) => m.PurchasesReceiptRegisterPage,
                  ),
                canActivate: [MenuPermissionGuard],
                data: { menuPermission: '/purchases/orders' },
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./pages/purchases/purchases-receipt-detail.page').then(
                    (m) => m.PurchasesReceiptDetailPage,
                  ),
                canActivate: [MenuPermissionGuard],
                data: { menuPermission: '/purchases/orders' },
              },
            ],
          },
          {
            path: '',
            redirectTo: 'requirements',
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
        path: 'companies',
        loadComponent: () =>
          import('./pages/companies/companies.page').then((m) => m.CompaniesPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/companies' },
      },
      {
        path: 'approvals',
        loadComponent: () =>
          import('./pages/approvals/approvals.page').then((m) => m.ApprovalsPage),
        // canActivate: [MenuPermissionGuard], // TODO: Add permissions if necessary
      },
      {
        path: 'providers',
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/providers' },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/providers/providers').then((m) => m.ProvidersPage),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./pages/providers/provider-form/provider-form.component').then(
                (m) => m.ProviderFormComponent,
              ),
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./pages/providers/provider-form/provider-form.component').then(
                (m) => m.ProviderFormComponent,
              ),
          },
        ],
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./pages/crm-contacts/crm-contacts.page').then((m) => m.CrmContactsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/leads' },
      },
      {
        path: 'leads/:id',
        loadComponent: () =>
          import('./pages/crm-contact-detail/crm-contact-detail.page').then(
            (m) => m.CrmContactDetailPage,
          ),
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
        path: 'crm-stats',
        loadComponent: () =>
          import('./pages/crm-stats/crm-stats.page').then((m) => m.CrmStatsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/crm-stats' },
      },
      {
        path: 'crm-asociacion',
        loadComponent: () =>
          import('./pages/crm-asociacion/crm-asociacion.page').then((m) => m.CrmAsociacionPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/crm-asociacion' },
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
        path: 'digital-signature',
        loadComponent: () =>
          import('./pages/digital-signature/digital-signature.page').then(
            (m) => m.DigitalSignaturePage,
          ),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/digital-signature' },
      },
      {
        path: 'logs',
        loadComponent: () => import('./pages/logs/logs').then((m) => m.LogsPage),
        canActivate: [MenuPermissionGuard],
        data: { menuPermission: '/logs' },
      },
      {
        path: 'logistics',
        children: [
          {
            path: 'products',
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/logistics/products' },
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./pages/logistics/products/products.page').then((m) => m.ProductsPage),
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./pages/logistics/products/product-form/product-form.component').then(
                    (m) => m.ProductFormComponent,
                  ),
              },
              {
                path: 'edit/:id',
                loadComponent: () =>
                  import('./pages/logistics/products/product-form/product-form.component').then(
                    (m) => m.ProductFormComponent,
                  ),
              },
              {
                path: 'view/:id',
                loadComponent: () =>
                  import('./pages/logistics/products/product-detail/product-detail.component').then(
                    (m) => m.ProductDetailComponent,
                  ),
              },
            ],
          },
          {
            path: 'locations',
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/logistics/locations' },
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./pages/logistics/locations/locations.page').then((m) => m.LocationsPage),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./pages/logistics/locations/location-detail/location-detail.component').then(
                    (m) => m.LocationDetailComponent,
                  ),
              },
            ],
          },
          {
            path: 'quotes',
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/logistics/quotes' },
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./pages/logistics/quotes/quotes.page').then((m) => m.QuotesPage),
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./pages/logistics/quotes/quote-form/quote-form.component').then(
                    (m) => m.QuoteFormComponent,
                  ),
              },
              {
                path: 'edit/:id',
                loadComponent: () =>
                  import('./pages/logistics/quotes/quote-form/quote-form.component').then(
                    (m) => m.QuoteFormComponent,
                  ),
              },
              {
                path: 'view/:id',
                loadComponent: () =>
                  import('./pages/logistics/quotes/quote-view/quote-view.component').then(
                    (m) => m.QuoteViewComponent,
                  ),
              },
            ],
          },
          {
            path: 'deliveries',
            loadComponent: () =>
              import('./pages/logistics/deliveries/deliveries.page').then((m) => m.DeliveriesPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/logistics/deliveries' },
          },
          {
            path: 'quote-entry/new',
            loadComponent: () =>
              import('./pages/logistics/quote-entry/enter-supplier-quote.page').then(
                (m) => m.EnterSupplierQuotePage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/logistics/quote-entry' },
          },
          {
            path: 'quote-entry/edit/:id',
            loadComponent: () =>
              import('./pages/logistics/quote-entry/enter-supplier-quote.page').then(
                (m) => m.EnterSupplierQuotePage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/logistics/quote-entry' },
          },
          {
            path: 'quote-entry',
            loadComponent: () =>
              import('./pages/logistics/quote-entry/quote-entry.page').then(
                (m) => m.QuoteEntryPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/logistics/quote-entry' },
          },
          // Send-quote-request was removed
          {
            path: 'compare-quotes',
            loadComponent: () =>
              import('./pages/logistics/compare-quotes/compare-quotes.page').then(
                (m) => m.CompareQuotesPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/logistics/compare-quotes' },
          },
        ],
      },
      {
        path: 'purchases',
        children: [
          {
            path: 'requirements',
            loadComponent: () =>
              import('./pages/purchases/purchases-requirements.page').then(
                (m) => m.PurchasesRequirementsPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/requirements' },
          },
          {
            path: 'requirements/new',
            loadComponent: () =>
              import('./pages/purchases/purchases-requirement-new.page').then(
                (m) => m.PurchasesRequirementNewPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/requirements' },
          },
          {
            path: 'requirements/:id',
            loadComponent: () =>
              import('./pages/purchases/purchases-requirement-detail.page').then(
                (m) => m.PurchasesRequirementDetailPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/requirements' },
          },
          {
            path: 'requirements/:id/edit',
            loadComponent: () =>
              import('./pages/purchases/purchases-requirement-edit.page').then(
                (m) => m.PurchasesRequirementEditPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/requirements' },
          },
          {
            path: 'requirements/:id/quotes/new',
            loadComponent: () =>
              import('./pages/purchases/purchases-quote-register.page').then(
                (m) => m.PurchasesQuoteRegisterPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/requirements' },
          },
          {
            path: 'requirements/:id/compare',
            loadComponent: () =>
              import('./pages/purchases/purchases-compare.page').then(
                (m) => m.PurchasesComparePage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/requirements' },
          },
          {
            path: 'orders',
            loadComponent: () =>
              import('./pages/purchases/purchases-orders.page').then((m) => m.PurchasesOrdersPage),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/orders' },
          },
          {
            path: 'vouchers',
            loadComponent: () =>
              import('./pages/purchases/purchases-vouchers.page').then(
                (m) => m.PurchasesVouchersPage,
              ),
            canActivate: [MenuPermissionGuard],
            data: { menuPermission: '/purchases/vouchers' },
          },
        ],
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
            path: 'generate',
            loadComponent: () =>
              import('./pages/payroll/payroll-generate/payroll-generate.component').then(
                (m) => m.PayrollGenerateComponent,
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
        path: 'hub/:section',
        loadComponent: () =>
          import('./pages/menu-hub/menu-hub').then((m) => m.MenuHubPage),
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
