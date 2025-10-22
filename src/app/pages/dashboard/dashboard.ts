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
        DashboardFiltersComponent
    ],
    template: `
    <div class="min-h-screen bg-gray-50 p-4 md:p-6">
      <!-- Header del Dashboard -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Dashboard de Tecmeing
        </h1>
        <p class="text-gray-600">
          Resumen ejecutivo de métricas y KPIs principales
        </p>
      </div>

      <!-- Filtros del Dashboard -->
      <div class="mb-6">
        <app-dashboard-filters 
          (filtersChanged)="onFiltersChanged($event)"
          [loading]="dashboardService.loading()">
        </app-dashboard-filters>
      </div>

      <!-- Estado de carga -->
      @if (dashboardService.loading()) {
        <div class="flex justify-center items-center py-12">
          <div class="flex flex-col items-center space-y-4">
            <i class="pi pi-spin pi-spinner text-4xl text-blue-600"></i>
            <p class="text-gray-600">Cargando datos del dashboard...</p>
          </div>
        </div>
      }

      <!-- Estado de error -->
      @if (dashboardService.hasError()) {
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div class="flex items-center">
            <i class="pi pi-exclamation-triangle text-red-600 text-xl mr-3"></i>
            <div>
              <h3 class="text-red-800 font-semibold">Error al cargar el dashboard</h3>
              <p class="text-red-600">{{ dashboardService.errorMessage() }}</p>
            </div>
          </div>
          <button 
            (click)="reloadDashboard()"
            class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            <i class="pi pi-refresh mr-2"></i>
            Reintentar
          </button>
        </div>
      }

      <!-- Contenido principal del Dashboard -->
      @if (!dashboardService.loading() && !dashboardService.hasError() && dashboardService.kpis()) {
        <!-- Tarjetas de KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          @for (kpi of getKpiEntries(); track kpi.key) {
            <app-dashboard-kpi-card 
              [kpi]="kpi.value"
              [loading]="false">
            </app-dashboard-kpi-card>
          }
        </div>

        <!-- Gráficos principales -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Gráfico de Reportes Diarios -->
          @if (dashboardService.charts()?.dailyReports) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">
                <i class="pi pi-chart-line text-blue-600 mr-2"></i>
                Reportes Diarios
              </h3>
              <app-dashboard-chart 
                [data]="dashboardService.charts()!.dailyReports"
                type="line"
                [options]="dashboardService.getLineChartOptions()">
              </app-dashboard-chart>
            </div>
          }

          <!-- Gráfico de Reportes por Proyecto -->
          @if (dashboardService.charts()?.projectReports) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">
                <i class="pi pi-chart-bar text-green-600 mr-2"></i>
                Reportes por Proyecto
              </h3>
              <app-dashboard-chart 
                [data]="dashboardService.charts()!.projectReports"
                type="bar"
                [options]="dashboardService.getBarChartOptions()">
              </app-dashboard-chart>
            </div>
          }
        </div>

        <!-- Gráficos secundarios -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Gráfico de Cotizaciones por Estado -->
          @if (dashboardService.charts()?.quotesByStatus) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">
                <i class="pi pi-chart-pie text-yellow-600 mr-2"></i>
                Cotizaciones por Estado
              </h3>
              <app-dashboard-chart 
                [data]="dashboardService.charts()!.quotesByStatus"
                type="doughnut"
                [options]="dashboardService.getDoughnutChartOptions()">
              </app-dashboard-chart>
            </div>
          }

          <!-- Gráfico de Clientes por Proyecto -->
          @if (dashboardService.charts()?.clientsByProject) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">
                <i class="pi pi-users text-purple-600 mr-2"></i>
                Clientes por Proyecto
              </h3>
              <app-dashboard-chart 
                [data]="dashboardService.charts()?.clientsByProject || null"
                type="bar"
                [options]="dashboardService.getBarChartOptions()">
              </app-dashboard-chart>
            </div>
          }
        </div>

        <!-- Tablas de datos -->
        @if (dashboardService.tables()) {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Tabla de Reportes Diarios -->
            @if (dashboardService.tables()?.dailyReports) {
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">
                  <i class="pi pi-table text-indigo-600 mr-2"></i>
                  Reportes Diarios Detallados
                </h3>
                <app-dashboard-table 
                  [data]="dashboardService.tables()!.dailyReports"
                  [columns]="dailyReportsColumns">
                </app-dashboard-table>
              </div>
            }

            <!-- Tabla de Reportes por Proyecto -->
            @if (dashboardService.tables()?.projectReports) {
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">
                  <i class="pi pi-table text-teal-600 mr-2"></i>
                  Reportes por Proyecto Detallados
                </h3>
                <app-dashboard-table 
                  [data]="dashboardService.tables()!.projectReports"
                  [columns]="projectReportsColumns">
                </app-dashboard-table>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements OnInit {
    protected readonly dashboardService = inject(DashboardDataService);

    // Configuración de columnas para las tablas
    protected readonly dailyReportsColumns = [
        { field: 'date', header: 'Fecha', sortable: true },
        { field: 'count', header: 'Cantidad', sortable: true },
        { field: 'value', header: 'Valor', sortable: true }
    ];

    protected readonly projectReportsColumns = [
        { field: 'projectName', header: 'Proyecto', sortable: true },
        { field: 'count', header: 'Cantidad', sortable: true },
        { field: 'value', header: 'Valor', sortable: true }
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
