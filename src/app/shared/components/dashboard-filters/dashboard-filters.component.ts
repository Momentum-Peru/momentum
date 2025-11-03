import {
  Component,
  Output,
  EventEmitter,
  Input,
  ChangeDetectionStrategy,
  OnInit,
  signal,
} from '@angular/core';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    { label: 'Período personalizado', value: 'custom' },
  ];

  protected readonly projectOptions = [
    { label: 'Todos los proyectos', value: null },
    { label: 'Proyecto A', value: { id: '1', name: 'Proyecto A' } },
    { label: 'Proyecto B', value: { id: '2', name: 'Proyecto B' } },
    { label: 'Proyecto C', value: { id: '3', name: 'Proyecto C' } },
  ];

  protected readonly clientOptions = [
    { label: 'Todos los clientes', value: null },
    { label: 'Cliente A', value: { id: '1', name: 'Cliente A' } },
    { label: 'Cliente B', value: { id: '2', name: 'Cliente B' } },
    { label: 'Cliente C', value: { id: '3', name: 'Cliente C' } },
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
      period: this.selectedPeriod() as any,
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
    const option = this.periodOptions.find((opt) => opt.value === period);
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
