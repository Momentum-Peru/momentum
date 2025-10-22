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
        <div class="flex flex-col h-full">
          <!-- Header de la tarjeta -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
              <div 
                class="w-12 h-12 rounded-lg flex items-center justify-center mr-3"
                [style.background-color]="kpi?.color + '20'">
                <i 
                  [class]="kpi?.icon" 
                  class="text-xl"
                  [style.color]="kpi?.color">
                </i>
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-600 mb-1">
                  {{ kpi?.title }}
                </h3>
                <p class="text-2xl font-bold text-gray-900">
                  @if (loading) {
                    <i class="pi pi-spin pi-spinner text-gray-400"></i>
                  } @else {
                    {{ kpi?.value | number }}
                  }
                </p>
              </div>
            </div>
          </div>

          <!-- Indicador de cambio -->
          @if (kpi && !loading) {
            <div class="mt-auto">
              <div class="flex items-center">
                @if (kpi.changeType === 'increase') {
                  <i class="pi pi-arrow-up text-green-600 text-sm mr-1"></i>
                  <span class="text-green-600 text-sm font-medium">
                    +{{ kpi.change }}%
                  </span>
                } @else if (kpi.changeType === 'decrease') {
                  <i class="pi pi-arrow-down text-red-600 text-sm mr-1"></i>
                  <span class="text-red-600 text-sm font-medium">
                    {{ kpi.change }}%
                  </span>
                } @else {
                  <i class="pi pi-minus text-gray-500 text-sm mr-1"></i>
                  <span class="text-gray-500 text-sm font-medium">
                    {{ kpi.change }}%
                  </span>
                }
                <span class="text-gray-500 text-sm ml-2">
                  vs período anterior
                </span>
              </div>
            </div>
          }

          <!-- Estado de carga -->
          @if (loading) {
            <div class="mt-auto">
              <div class="animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-1/2"></div>
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
