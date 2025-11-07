import { Component, Input, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TableData } from '../../interfaces/dashboard.interface';

export interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
}

// Usamos TableData del módulo de interfaces para evitar duplicidad de tipos

/**
 * Componente de tabla del dashboard
 * Componente Dumb que solo presenta datos en tabla
 * Principio de Responsabilidad Única: Solo renderiza tablas de datos
 */
@Component({
  selector: 'app-dashboard-table',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  styleUrls: ['./dashboard-table.component.scss'],
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

      <!-- Vista Desktop: Tabla normal -->
      @if (!loading && data && data.length > 0) {
      <div class="hidden md:block">
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
          scrollHeight="300px"
        >
          <!-- Columnas dinámicas -->
          @for (col of columns; track col.field) {
          <ng-template pTemplate="header" let-columns>
            <tr>
              @for (col of columns; track col.field) {
              <th
                [pSortableColumn]="col.sortable ? col.field : null"
                class="text-left p-3 bg-gray-50 border-b border-gray-200"
              >
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
                {{ getCellValue(rowData, col.field) }}
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
      </div>

      <!-- Vista Móvil: Accordion desplegable -->
      <div class="md:hidden space-y-3">
        @for (row of data; track $index) {
        <div
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-all duration-200"
        >
          <!-- Header del accordion (siempre visible) -->
          <button
            type="button"
            class="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            (click)="toggleRow($index)"
          >
            <div class="flex-1 text-left min-w-0 pr-4">
              <div class="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {{ getCellValue(row, columns[0]?.field || '') }}
              </div>
              @if (columns.length > 1) {
              <div class="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                {{ columns[1]?.header }}: {{ getCellValue(row, columns[1]?.field || '') }}
              </div>
              }
            </div>
            <div class="flex-shrink-0">
              <i
                class="pi transition-transform duration-200 text-gray-500 dark:text-gray-400"
                [class.pi-chevron-down]="!isRowExpanded($index)"
                [class.pi-chevron-up]="isRowExpanded($index)"
              ></i>
            </div>
          </button>

          <!-- Contenido del accordion (desplegable) -->
          @if (isRowExpanded($index)) {
          <div class="border-t border-gray-200 dark:border-gray-700 animate-fade-in">
            <div class="px-4 py-4 space-y-3">
              @for (col of columns; track col.field) {
              <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  {{ col.header }}
                </div>
                <div class="text-sm text-gray-900 dark:text-gray-100 break-words">
                  {{ getCellValue(row, col.field) }}
                </div>
              </div>
              }
            </div>
          </div>
          }
        </div>
        }
      </div>
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardTableComponent {
  @Input({ required: true }) data: TableData[] = [];
  @Input({ required: true }) columns: TableColumn[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() paginator = true;
  @Input() rows = 10;
  @Input() scrollable = false;

  expandedRows = signal<Set<number>>(new Set());

  /**
   * Formatea una fecha para mostrar
   * @param date Fecha a formatear
   * @returns Fecha formateada
   */
  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Formatea un valor monetario
   * @param value Valor a formatear
   * @returns Valor formateado como moneda
   */
  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
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

  /**
   * Alterna la expansión de una fila del accordion
   */
  toggleRow(index: number): void {
    const expanded = new Set(this.expandedRows());
    if (expanded.has(index)) {
      expanded.delete(index);
    } else {
      expanded.add(index);
    }
    this.expandedRows.set(expanded);
  }

  /**
   * Verifica si una fila está expandida
   */
  isRowExpanded(index: number): boolean {
    return this.expandedRows().has(index);
  }

  /**
   * Obtiene el valor formateado de una celda
   */
  getCellValue(rowData: TableData, field: string): string {
    const raw = (rowData as Record<string, string | number | Date | null | undefined>)[field];
    if (field === 'date') {
      return this.formatDate(raw as string | Date | null | undefined);
    }
    if (field === 'value') {
      return this.formatCurrency(raw as number | null | undefined);
    }
    if (raw === null || raw === undefined) return '-';
    return String(raw);
  }
}
