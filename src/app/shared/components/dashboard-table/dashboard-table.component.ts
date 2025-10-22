import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

export interface TableColumn {
    field: string;
    header: string;
    sortable?: boolean;
}

export interface TableData {
    [key: string]: any;
}

/**
 * Componente de tabla del dashboard
 * Componente Dumb que solo presenta datos en tabla
 * Principio de Responsabilidad Única: Solo renderiza tablas de datos
 */
@Component({
    selector: 'app-dashboard-table',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule],
    template: `
    <div class="relative">
      <!-- Estado de carga -->
      @if (loading) {
        <div class="flex justify-center items-center h-32">
          <div class="flex flex-col items-center space-y-2">
            <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
            <p class="text-gray-500 text-sm">Cargando datos...</p>
          </div>
        </div>
      }

      <!-- Tabla -->
      @if (!loading && data && data.length > 0) {
        <p-table 
          [value]="data" 
          [columns]="columns"
          [paginator]="paginator"
          [rows]="rows"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros"
          [rowsPerPageOptions]="[5, 10, 25]"
          styleClass="p-datatable-sm"
          [scrollable]="scrollable"
          scrollHeight="300px">
          
          <!-- Columnas dinámicas -->
          @for (col of columns; track col.field) {
            <ng-template pTemplate="header" let-columns>
              <tr>
                @for (col of columns; track col.field) {
                  <th 
                    [pSortableColumn]="col.sortable ? col.field : null"
                    class="text-left p-3 bg-gray-50 border-b border-gray-200">
                    {{ col.header }}
                    @if (col.sortable) {
                      <p-sortIcon [field]="col.field"></p-sortIcon>
                    }
                  </th>
                }
              </tr>
            </ng-template>
            
            <ng-template pTemplate="body" let-rowData let-columns="columns">
              <tr class="hover:bg-gray-50 transition-colors">
                @for (col of columns; track col.field) {
                  <td class="p-3 border-b border-gray-100">
                    @if (col.field === 'date') {
                      {{ formatDate(rowData[col.field]) }}
                    } @else if (col.field === 'value') {
                      {{ formatCurrency(rowData[col.field]) }}
                    } @else {
                      {{ rowData[col.field] }}
                    }
                  </td>
                }
              </tr>
            </ng-template>
          }

          <!-- Template para datos vacíos -->
          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="columns.length" class="text-center p-8 text-gray-500">
                <div class="flex flex-col items-center space-y-2">
                  <i class="pi pi-inbox text-2xl text-gray-400"></i>
                  <p>No hay datos disponibles</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      }

      <!-- Estado vacío -->
      @if (!loading && (!data || data.length === 0)) {
        <div class="flex justify-center items-center h-32">
          <div class="text-center">
            <i class="pi pi-inbox text-gray-400 text-2xl mb-2"></i>
            <p class="text-gray-500 text-sm">No hay datos disponibles</p>
          </div>
        </div>
      }

      <!-- Estado de error -->
      @if (error) {
        <div class="flex justify-center items-center h-32">
          <div class="text-center">
            <i class="pi pi-exclamation-triangle text-red-500 text-xl mb-2"></i>
            <p class="text-red-600 text-sm">{{ error }}</p>
          </div>
        </div>
      }
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardTableComponent {
    @Input({ required: true }) data: TableData[] = [];
    @Input({ required: true }) columns: TableColumn[] = [];
    @Input() loading: boolean = false;
    @Input() error: string | null = null;
    @Input() paginator: boolean = true;
    @Input() rows: number = 10;
    @Input() scrollable: boolean = false;

    /**
     * Formatea una fecha para mostrar
     * @param date Fecha a formatear
     * @returns Fecha formateada
     */
    formatDate(date: string | Date): string {
        if (!date) return '-';

        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Formatea un valor monetario
     * @param value Valor a formatear
     * @returns Valor formateado como moneda
     */
    formatCurrency(value: number): string {
        if (value === null || value === undefined) return '-';

        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(value);
    }

    /**
     * Formatea un número
     * @param value Número a formatear
     * @returns Número formateado
     */
    formatNumber(value: number): string {
        if (value === null || value === undefined) return '-';

        return new Intl.NumberFormat('es-ES').format(value);
    }
}
