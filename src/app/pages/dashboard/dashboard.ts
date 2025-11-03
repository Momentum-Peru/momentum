import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DashboardDataService } from '../../shared/services/dashboard-data.service';
import { DashboardKpiCardComponent } from '../../shared/components/dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardChartComponent } from '../../shared/components/dashboard-chart/dashboard-chart.component';
import { DashboardTableComponent } from '../../shared/components/dashboard-table/dashboard-table.component';
import { DashboardFiltersComponent } from '../../shared/components/dashboard-filters/dashboard-filters.component';

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
    this.loadDashboard();
  }

  /**
   * Carga los datos del dashboard con filtros por defecto
   */
  private async loadDashboard(): Promise<void> {
    await this.dashboardService.loadDashboardData({ period: '30d' });
  }

  /**
   * Maneja los cambios en los filtros del dashboard
   * @param filters Nuevos filtros aplicados
   */
  async onFiltersChanged(filters: any): Promise<void> {
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
   * @returns Array de entradas KPI
   */
  protected getKpiEntries(): Array<{ key: string; value: any }> {
    const kpis = this.dashboardService.kpis();
    if (!kpis) return [];

    return Object.entries(kpis).map(([key, value]) => ({ key, value }));
  }
}
