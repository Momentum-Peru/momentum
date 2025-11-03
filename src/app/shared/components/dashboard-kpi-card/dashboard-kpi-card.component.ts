import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { DashboardKpi } from '../../interfaces/dashboard.interface';

/**
 * Componente de tarjeta KPI
 * Componente Dumb que solo presenta datos
 * Principio de Responsabilidad Única: Solo renderiza una tarjeta KPI
 */
@Component({
    selector: 'app-dashboard-kpi-card',
    standalone: true,
    imports: [CommonModule, CardModule],
    template: `
    <p-card 
      [style]="{ 'height': '100%' }"
      styleClass="h-full">
      <ng-template pTemplate="content">
        <div class="flex flex-col h-full min-w-0">
          <!-- Header de la tarjeta -->
          <div class="flex items-center justify-between mb-4 min-w-0">
            <div class="flex items-center min-w-0 flex-1">
              <div 
                class="w-12 h-12 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
                [style.background-color]="kpi?.color + '20'">
                <i 
                  [class]="kpi?.icon" 
                  class="text-xl"
                  [style.color]="kpi?.color">
                </i>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-medium text-gray-600 dark:text-white mb-1 truncate" title="{{ kpi?.title }}">
                  {{ kpi?.title }}
                </h3>
                <p class="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  @if (loading) {
                    <i class="pi pi-spin pi-spinner text-gray-400 dark:text-gray-300"></i>
                  } @else {
                    {{ kpi?.value | number }}
                  }
                </p>
              </div>
            </div>
          </div>

          <!-- Indicador de cambio -->
          @if (kpi && !loading) {
            <div class="mt-auto min-w-0">
              <div class="flex items-center min-w-0">
                @if (kpi.changeType === 'increase') {
                  <i class="pi pi-arrow-up text-green-600 text-sm mr-1 flex-shrink-0"></i>
                  <span class="text-green-600 text-sm font-medium flex-shrink-0">
                    +{{ kpi.change }}%
                  </span>
                } @else if (kpi.changeType === 'decrease') {
                  <i class="pi pi-arrow-down text-red-600 text-sm mr-1 flex-shrink-0"></i>
                  <span class="text-red-600 text-sm font-medium flex-shrink-0">
                    {{ kpi.change }}%
                  </span>
                } @else {
                  <i class="pi pi-minus text-gray-500 text-sm mr-1 flex-shrink-0"></i>
                  <span class="text-gray-500 text-sm font-medium flex-shrink-0">
                    {{ kpi.change }}%
                  </span>
                }
                <span class="text-gray-500 dark:text-white text-sm ml-2 truncate" title="vs período anterior">
                  vs período anterior
                </span>
              </div>
            </div>
          }

          <!-- Estado de carga -->
          @if (loading) {
            <div class="mt-auto">
              <div class="animate-pulse">
                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          }
        </div>
      </ng-template>
    </p-card>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardKpiCardComponent {
    @Input({ required: true }) kpi!: DashboardKpi | null;
    @Input() loading: boolean = false;
}
