import { Component, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardDataService } from '../../shared/services/dashboard-data.service';
import { DashboardKpiCardComponent } from '../../shared/components/dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardChartComponent } from '../../shared/components/dashboard-chart/dashboard-chart.component';
import { DashboardTableComponent } from '../../shared/components/dashboard-table/dashboard-table.component';
import { DashboardFiltersComponent } from '../../shared/components/dashboard-filters/dashboard-filters.component';
import { MenuService } from '../../shared/services/menu.service';
import { DashboardFiltersParams } from '../../shared/interfaces/dashboard.interface';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';

/**
 * Dashboard de Proyectos
 * Muestra KPIs y métricas específicas del flujo de trabajo de ingeniería
 */
@Component({
  selector: 'app-projects-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    CardModule,
    DashboardKpiCardComponent,
    DashboardChartComponent,
    DashboardTableComponent,
    DashboardFiltersComponent,
  ],
  templateUrl: './projects-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsDashboardPage implements OnInit {
  protected readonly dashboardService = inject(DashboardDataService);
  private readonly menuService = inject(MenuService);

  // Mapeo de KPIs a rutas del sistema para verificar permisos
  private readonly kpiRouteMap: Record<string, string> = {
    totalProjects: '/projects',
    totalQuotes: '/quotes',
    totalOrders: '/orders',
    totalRequirements: '/requirements',
    totalTdrs: '/tdrs',
  };

  // Mapeo de gráficos a rutas del sistema para verificar permisos
  private readonly chartRouteMap: Record<string, string> = {
    projectsByStatus: '/projects',
    quotesByStatus: '/quotes',
    requirementsByStatus: '/requirements',
  };

  // Configuración de columnas para las tablas
  protected readonly projectsColumns = [
    { field: 'projectName', header: 'Proyecto', sortable: true },
    { field: 'status', header: 'Estado', sortable: true },
    { field: 'count', header: 'Cantidad', sortable: true },
  ];

  protected readonly quotesColumns = [
    { field: 'projectName', header: 'Proyecto', sortable: true },
    { field: 'status', header: 'Estado', sortable: true },
    { field: 'count', header: 'Cantidad', sortable: true },
  ];

  protected readonly requirementsColumns = [
    { field: 'projectName', header: 'Proyecto', sortable: true },
    { field: 'status', header: 'Estado', sortable: true },
    { field: 'count', header: 'Cantidad', sortable: true },
  ];

  ngOnInit(): void {
    // Cargar permisos del usuario antes de cargar el dashboard
    this.menuService.loadUserPermissions();
    this.loadDashboard();
  }

  /**
   * Carga los datos del dashboard con filtros por defecto
   */
  private async loadDashboard(): Promise<void> {
    const filters: DashboardFiltersParams = {
      period: '30d',
    };
    await this.dashboardService.loadDashboardData(filters);
  }

  /**
   * Maneja los cambios en los filtros del dashboard
   * @param filters Nuevos filtros aplicados
   */
  async onFiltersChanged(filters: DashboardFiltersParams): Promise<void> {
    await this.dashboardService.loadDashboardData(filters);
  }

  /**
   * Obtiene las entradas de KPIs filtradas por permisos
   */
  protected getKpiEntries(): Array<{ key: string; value: any }> {
    const kpis = this.dashboardService.kpis();
    if (!kpis) return [];

    const entries: Array<{ key: string; value: any }> = [];
    
    // KPIs específicos del dashboard de proyectos
    if (kpis.totalProjects && this.canViewKpi('totalProjects')) {
      entries.push({ key: 'totalProjects', value: kpis.totalProjects });
    }
    if (kpis.totalQuotes && this.canViewKpi('totalQuotes')) {
      entries.push({ key: 'totalQuotes', value: kpis.totalQuotes });
    }
    if (kpis.totalOrders && this.canViewKpi('totalOrders')) {
      entries.push({ key: 'totalOrders', value: kpis.totalOrders });
    }
    if (kpis.totalRequirements && this.canViewKpi('totalRequirements')) {
      entries.push({ key: 'totalRequirements', value: kpis.totalRequirements });
    }

    return entries;
  }

  /**
   * Verifica si el usuario puede ver un KPI específico
   */
  private canViewKpi(kpiKey: string): boolean {
    const route = this.kpiRouteMap[kpiKey];
    if (!route) return true;
    return this.menuService.hasPermission(route);
  }

  /**
   * Verifica si el usuario puede ver un gráfico específico
   */
  protected canViewChart(chartKey: string): boolean {
    const route = this.chartRouteMap[chartKey];
    if (!route) return true;
    return this.menuService.hasPermission(route);
  }

  /**
   * Recarga el dashboard
   */
  protected reloadDashboard(): void {
    this.loadDashboard();
  }
}

