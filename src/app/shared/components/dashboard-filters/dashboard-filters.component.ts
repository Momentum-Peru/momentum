import { Component, Output, EventEmitter, Input, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardFiltersParams } from '../../interfaces/dashboard.interface';

/**
 * Componente de filtros del dashboard
 * Componente Smart que maneja la lógica de filtros
 * Principio de Responsabilidad Única: Solo maneja filtros del dashboard
 */
@Component({
    selector: 'app-dashboard-filters',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule
    ],
    template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- Filtros principales -->
        <div class="flex flex-col sm:flex-row gap-4 flex-1">
          <!-- Período -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-gray-700 mb-1">
              <i class="pi pi-calendar mr-1"></i>
              Período
            </label>
            <select 
              [(ngModel)]="selectedPeriod"
              (change)="onPeriodChange()"
              class="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              @for (option of periodOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>

          <!-- Fechas personalizadas -->
          @if (selectedPeriod() === 'custom') {
            <div class="flex flex-col">
              <label class="text-sm font-medium text-gray-700 mb-1">
                <i class="pi pi-calendar-times mr-1"></i>
                Rango de fechas
              </label>
              <div class="flex gap-2">
                <input 
                  type="date"
                  [(ngModel)]="startDate"
                  class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <input 
                  type="date"
                  [(ngModel)]="endDate"
                  class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
          }

          <!-- Proyecto -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-gray-700 mb-1">
              <i class="pi pi-folder mr-1"></i>
              Proyecto
            </label>
            <select 
              [(ngModel)]="selectedProject"
              (change)="onProjectChange()"
              class="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              @for (option of projectOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>

          <!-- Cliente -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-gray-700 mb-1">
              <i class="pi pi-users mr-1"></i>
              Cliente
            </label>
            <select 
              [(ngModel)]="selectedClient"
              (change)="onClientChange()"
              class="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              @for (option of clientOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="flex gap-2">
          <!-- Botón aplicar filtros -->
          <button
            (click)="applyFilters()"
            [disabled]="loading"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            @if (loading) {
              <i class="pi pi-spin pi-spinner"></i>
            } @else {
              <i class="pi pi-check"></i>
            }
            Aplicar
          </button>

          <!-- Botón limpiar filtros -->
          <button
            (click)="clearFilters()"
            [disabled]="loading"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <i class="pi pi-times"></i>
            Limpiar
          </button>

          <!-- Botón refrescar -->
          <button
            (click)="refreshData()"
            [disabled]="loading"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refrescar datos">
            <i class="pi pi-refresh"></i>
          </button>
        </div>
      </div>

      <!-- Filtros activos -->
      @if (hasActiveFilters()) {
        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-filter text-gray-600"></i>
            <span class="text-sm font-medium text-gray-700">Filtros activos:</span>
          </div>
          <div class="flex flex-wrap gap-2">
            @if (selectedPeriod() && selectedPeriod() !== '30d') {
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Período: {{ getPeriodLabel(selectedPeriod()) }}
                <button 
                  (click)="removePeriodFilter()"
                  class="ml-1 text-blue-600 hover:text-blue-800">
                  <i class="pi pi-times text-xs"></i>
                </button>
              </span>
            }
            @if (selectedProject()) {
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Proyecto: {{ selectedProject()?.name }}
                <button 
                  (click)="removeProjectFilter()"
                  class="ml-1 text-green-600 hover:text-green-800">
                  <i class="pi pi-times text-xs"></i>
                </button>
              </span>
            }
            @if (selectedClient()) {
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Cliente: {{ selectedClient()?.name }}
                <button 
                  (click)="removeClientFilter()"
                  class="ml-1 text-purple-600 hover:text-purple-800">
                  <i class="pi pi-times text-xs"></i>
                </button>
              </span>
            }
          </div>
        </div>
      }
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardFiltersComponent implements OnInit {
    @Input() loading: boolean = false;
    @Output() filtersChanged = new EventEmitter<DashboardFiltersParams>();

    // Signals para el estado reactivo
    protected readonly selectedPeriod = signal<string>('30d');
    protected readonly selectedProject = signal<any>(null);
    protected readonly selectedClient = signal<any>(null);
    protected readonly startDate = signal<string>('');
    protected readonly endDate = signal<string>('');

    // Opciones para los dropdowns
    protected readonly periodOptions = [
        { label: 'Últimos 7 días', value: '7d' },
        { label: 'Últimos 30 días', value: '30d' },
        { label: 'Últimos 90 días', value: '90d' },
        { label: 'Último año', value: '1y' },
        { label: 'Período personalizado', value: 'custom' }
    ];

    protected readonly projectOptions = [
        { label: 'Todos los proyectos', value: null },
        { label: 'Proyecto A', value: { id: '1', name: 'Proyecto A' } },
        { label: 'Proyecto B', value: { id: '2', name: 'Proyecto B' } },
        { label: 'Proyecto C', value: { id: '3', name: 'Proyecto C' } }
    ];

    protected readonly clientOptions = [
        { label: 'Todos los clientes', value: null },
        { label: 'Cliente A', value: { id: '1', name: 'Cliente A' } },
        { label: 'Cliente B', value: { id: '2', name: 'Cliente B' } },
        { label: 'Cliente C', value: { id: '3', name: 'Cliente C' } }
    ];

    ngOnInit(): void {
        // Configuración inicial
        this.loadInitialFilters();
    }

    /**
     * Carga los filtros iniciales
     */
    private loadInitialFilters(): void {
        // Aquí se podrían cargar filtros desde un servicio o localStorage
        this.applyFilters();
    }

    /**
     * Maneja el cambio de período
     */
    onPeriodChange(): void {
        if (this.selectedPeriod() !== 'custom') {
            this.startDate.set('');
            this.endDate.set('');
        }
    }

    /**
     * Maneja el cambio de rango de fechas
     */
    onDateRangeChange(): void {
        // El cambio se maneja automáticamente por el binding
    }

    /**
     * Maneja el cambio de proyecto
     */
    onProjectChange(): void {
        // El cambio se maneja automáticamente por el binding
    }

    /**
     * Maneja el cambio de cliente
     */
    onClientChange(): void {
        // El cambio se maneja automáticamente por el binding
    }

    /**
     * Aplica los filtros seleccionados
     */
    applyFilters(): void {
        const filters: DashboardFiltersParams = {
            period: this.selectedPeriod() as any
        };

        if (this.selectedPeriod() === 'custom' && this.startDate() && this.endDate()) {
            filters.startDate = this.startDate();
            filters.endDate = this.endDate();
        }

        if (this.selectedProject()) {
            filters.projectId = this.selectedProject().id;
        }

        if (this.selectedClient()) {
            filters.clientId = this.selectedClient().id;
        }

        this.filtersChanged.emit(filters);
    }

    /**
     * Limpia todos los filtros
     */
    clearFilters(): void {
        this.selectedPeriod.set('30d');
        this.selectedProject.set(null);
        this.selectedClient.set(null);
        this.startDate.set('');
        this.endDate.set('');
        this.applyFilters();
    }

    /**
     * Refresca los datos con los filtros actuales
     */
    refreshData(): void {
        this.applyFilters();
    }

    /**
     * Verifica si hay filtros activos
     */
    hasActiveFilters(): boolean {
        return (
            this.selectedPeriod() !== '30d' ||
            this.selectedProject() !== null ||
            this.selectedClient() !== null
        );
    }

    /**
     * Obtiene la etiqueta del período
     */
    getPeriodLabel(period: string): string {
        const option = this.periodOptions.find(opt => opt.value === period);
        return option ? option.label : period;
    }

    /**
     * Remueve el filtro de período
     */
    removePeriodFilter(): void {
        this.selectedPeriod.set('30d');
        this.startDate.set('');
        this.endDate.set('');
        this.applyFilters();
    }

    /**
     * Remueve el filtro de proyecto
     */
    removeProjectFilter(): void {
        this.selectedProject.set(null);
        this.applyFilters();
    }

    /**
     * Remueve el filtro de cliente
     */
    removeClientFilter(): void {
        this.selectedClient.set(null);
        this.applyFilters();
    }
}
