import { Component, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DashboardDataService } from '../../shared/services/dashboard-data.service';
import { DashboardKpiCardComponent } from '../../shared/components/dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardChartComponent } from '../../shared/components/dashboard-chart/dashboard-chart.component';
import { DashboardTableComponent } from '../../shared/components/dashboard-table/dashboard-table.component';
import { DashboardFiltersComponent } from '../../shared/components/dashboard-filters/dashboard-filters.component';
import { MenuService } from '../../shared/services/menu.service';
import { AuthService } from '../login/services/auth.service';

/**
 * Página principal del Dashboard
 * Componente Smart que maneja la lógica y estado del dashboard
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DashboardKpiCardComponent,
    DashboardChartComponent,
    DashboardTableComponent,
    DashboardFiltersComponent,
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  protected readonly dashboardService = inject(DashboardDataService);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  // Computed para verificar si el usuario es gerencia
  protected readonly isGerencia = computed(() => this.authService.isGerencia());

  // Mapeo de KPIs a rutas del sistema para verificar permisos
  private readonly kpiRouteMap: Record<string, string> = {
    totalClients: '/companies-crm',
    totalProjects: '/projects',
    totalQuotes: '/quotes',
    totalOrders: '/orders',
    totalUsers: '/users',
    totalRequirements: '/requirements',
    totalDailyReports: '/daily-reports',
    averageDailyReports: '/daily-reports',
    totalDailyReportsValue: '/daily-reports',
  };

  // Mapeo de gráficos a rutas del sistema para verificar permisos
  private readonly chartRouteMap: Record<string, string> = {
    dailyReports: '/daily-reports',
    projectReports: '/projects',
    quotesByStatus: '/quotes',
    clientsByProject: '/companies-crm',
    quotesByProject: '/quotes',
    requirementsByProject: '/requirements',
    projectsByStatus: '/projects',
    requirementsByStatus: '/requirements',
  };

  // Mapeo de tablas a rutas del sistema para verificar permisos
  private readonly tableRouteMap: Record<string, string> = {
    dailyReports: '/daily-reports',
    projectReports: '/projects',
    clientsByProject: '/companies-crm',
  };

  // Configuración de columnas para las tablas
  protected readonly dailyReportsColumns = [
    { field: 'date', header: 'Fecha', sortable: true },
    { field: 'count', header: 'Cantidad', sortable: true },
    { field: 'value', header: 'Valor', sortable: true },
  ];

  protected readonly projectReportsColumns = [
    { field: 'projectName', header: 'Proyecto', sortable: true },
    { field: 'count', header: 'Cantidad', sortable: true },
    { field: 'value', header: 'Valor', sortable: true },
  ];

  ngOnInit(): void {
    // Cargar permisos del usuario antes de cargar el dashboard
    this.menuService.loadUserPermissions();
    this.loadDashboard();
  }

  /**
   * Carga los datos del dashboard con filtros por defecto
   * Para gerencia: carga datos agregados de todas las empresas si no hay filtro
   */
  private async loadDashboard(): Promise<void> {
    const filters: import('../../shared/interfaces/dashboard.interface').DashboardFiltersParams = { 
      period: '30d' 
    };
    
    // Para gerencia, no enviar tenantId inicialmente para obtener datos agregados
    // El interceptor ya maneja esto, pero es bueno ser explícito
    await this.dashboardService.loadDashboardData(filters);
  }

  /**
   * Maneja los cambios en los filtros del dashboard
   * @param filters Nuevos filtros aplicados
   */
  async onFiltersChanged(filters: import('../../shared/interfaces/dashboard.interface').DashboardFiltersParams): Promise<void> {
    await this.dashboardService.loadDashboardData(filters);
  }

  /**
   * Recarga el dashboard
   */
  async reloadDashboard(): Promise<void> {
    this.dashboardService.reset();
    await this.loadDashboard();
  }

  /**
   * Obtiene las entradas de KPIs para el template
   * Filtra los KPIs según los permisos del usuario
   * El rol gerencia puede ver todos los KPIs
   * @returns Array de entradas KPI filtradas
   */
  protected getKpiEntries(): { key: string; value: import('../../shared/interfaces/dashboard.interface').DashboardKpi }[] {
    const kpis = this.dashboardService.kpis();
    if (!kpis) return [];

    // Si el usuario es gerencia, mostrar todos los KPIs
    if (this.isGerencia()) {
      return Object.entries(kpis).map(([key, value]) => ({ key, value }));
    }

    // Filtrar KPIs según permisos del usuario
    return Object.entries(kpis)
      .filter(([key]) => {
        // Obtener la ruta asociada al KPI
        const requiredRoute = this.kpiRouteMap[key];
        
        // Si no hay ruta mapeada, mostrar el KPI (KPIs sin restricción)
        if (!requiredRoute) {
          return true;
        }
        
        // Verificar si el usuario tiene permiso para acceder a la ruta
        return this.menuService.hasPermission(requiredRoute);
      })
      .map(([key, value]) => ({ key, value }));
  }

  /**
   * Verifica si el usuario tiene permiso para ver un gráfico específico
   * El rol gerencia puede ver todos los gráficos
   * @param chartKey Clave del gráfico (ej: 'dailyReports', 'quotesByStatus')
   * @returns true si el usuario tiene permiso, false en caso contrario
   */
  protected canViewChart(chartKey: string): boolean {
    // Si el usuario es gerencia, puede ver todos los gráficos
    if (this.isGerencia()) {
      return true;
    }

    const requiredRoute = this.chartRouteMap[chartKey];
    
    // Si no hay ruta mapeada, mostrar el gráfico (gráficos sin restricción)
    if (!requiredRoute) {
      return true;
    }
    
    // Verificar si el usuario tiene permiso para acceder a la ruta
    return this.menuService.hasPermission(requiredRoute);
  }

  /**
   * Verifica si el usuario tiene permiso para ver una tabla específica
   * El rol gerencia puede ver todas las tablas
   * @param tableKey Clave de la tabla (ej: 'dailyReports', 'projectReports')
   * @returns true si el usuario tiene permiso, false en caso contrario
   */
  protected canViewTable(tableKey: string): boolean {
    // Si el usuario es gerencia, puede ver todas las tablas
    if (this.isGerencia()) {
      return true;
    }

    const requiredRoute = this.tableRouteMap[tableKey];
    
    // Si no hay ruta mapeada, mostrar la tabla (tablas sin restricción)
    if (!requiredRoute) {
      return true;
    }
    
    // Verificar si el usuario tiene permiso para acceder a la ruta
    return this.menuService.hasPermission(requiredRoute);
  }
}
