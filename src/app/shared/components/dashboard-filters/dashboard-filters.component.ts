import {
  Component,
  Output,
  EventEmitter,
  Input,
  ChangeDetectionStrategy,
  OnInit,
  signal,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DashboardFiltersParams } from '../../interfaces/dashboard.interface';
import { ProjectsApiService } from '../../services/projects-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { CompaniesApiService } from '../../services/companies-api.service';
import { AuthService } from '../../../pages/login/services/auth.service';

interface ProjectOption {
  id: string;
  name: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface CompanyOption {
  id: string;
  name: string;
  code?: string;
}

/**
 * Componente de filtros del dashboard
 * Componente Smart que maneja la lógica de filtros
 * Principio de Responsabilidad Única: Solo maneja filtros del dashboard
 */
@Component({
  selector: 'app-dashboard-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ToastModule],
  templateUrl: './dashboard-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class DashboardFiltersComponent implements OnInit {
  @Input() loading = false;
  @Output() filtersChanged = new EventEmitter<DashboardFiltersParams>();

  private readonly projectsApi = inject(ProjectsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  // Signals para el estado reactivo
  protected readonly selectedPeriod = signal<string>('30d');
  protected readonly selectedProject = signal<ProjectOption | null>(null);
  protected readonly selectedClient = signal<ClientOption | null>(null);
  protected readonly selectedCompany = signal<CompanyOption | null>(null);
  protected readonly startDate = signal<string>('');
  protected readonly endDate = signal<string>('');

  // Signals para opciones de los dropdowns
  protected readonly projectOptions = signal<{ label: string; value: ProjectOption | null }[]>([]);
  protected readonly clientOptions = signal<{ label: string; value: ClientOption | null }[]>([]);
  protected readonly companyOptions = signal<{ label: string; value: CompanyOption | null }[]>([]);
  protected readonly loadingProjects = signal<boolean>(false);
  protected readonly loadingClients = signal<boolean>(false);
  protected readonly loadingCompanies = signal<boolean>(false);

  // Computed para verificar si el usuario es gerencia
  protected readonly isGerencia = computed(() => this.authService.isGerencia());

  // Opciones para el período
  protected readonly periodOptions = [
    { label: 'Últimos 7 días', value: '7d' },
    { label: 'Últimos 30 días', value: '30d' },
    { label: 'Últimos 90 días', value: '90d' },
    { label: 'Último año', value: '1y' },
    { label: 'Período personalizado', value: 'custom' },
  ];

  ngOnInit(): void {
    // Cargar proyectos y clientes desde los servicios
    this.loadProjects();
    this.loadClients();
    // Cargar empresas si el usuario es gerencia
    if (this.isGerencia()) {
      this.loadCompanies();
    }
    // Configuración inicial
    this.loadInitialFilters();
  }

  /**
   * Carga los proyectos desde el backend
   */
  private loadProjects(): void {
    this.loadingProjects.set(true);
    this.projectsApi.listActive().subscribe({
      next: (projects) => {
        const options: { label: string; value: { id: string; name: string } | null }[] = [
          { label: 'Todos los proyectos', value: null },
        ];
        projects.forEach((project) => {
          if (project._id) {
            options.push({
              label: `${project.name}${project.code ? ` (${project.code})` : ''}`,
              value: { id: project._id, name: project.name },
            });
          }
        });
        this.projectOptions.set(options);
        this.loadingProjects.set(false);
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proyectos',
        });
        this.loadingProjects.set(false);
        // Mantener opción por defecto en caso de error
        this.projectOptions.set([{ label: 'Todos los proyectos', value: null }]);
      },
    });
  }

  /**
   * Carga los clientes desde el backend
   */
  private loadClients(): void {
    this.loadingClients.set(true);
    this.clientsApi.list().subscribe({
      next: (clients) => {
        const options: { label: string; value: { id: string; name: string } | null }[] = [
          { label: 'Todos los clientes', value: null },
        ];
        clients.forEach((client) => {
          options.push({
            label: client.name,
            value: { id: client._id, name: client.name },
          });
        });
        this.clientOptions.set(options);
        this.loadingClients.set(false);
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los clientes',
        });
        this.loadingClients.set(false);
        // Mantener opción por defecto en caso de error
        this.clientOptions.set([{ label: 'Todos los clientes', value: null }]);
      },
    });
  }

  /**
   * Carga las empresas desde el backend (solo para rol gerencia)
   */
  private loadCompanies(): void {
    this.loadingCompanies.set(true);
    this.companiesApi.list({ isActive: true }).subscribe({
      next: (companies) => {
        const options: { label: string; value: CompanyOption | null }[] = [
          { label: 'Todas las empresas', value: null },
        ];
        companies.forEach((company) => {
          if (company._id) {
            options.push({
              label: `${company.name}${company.code ? ` (${company.code})` : ''}`,
              value: { id: company._id, name: company.name, code: company.code },
            });
          }
        });
        this.companyOptions.set(options);
        this.loadingCompanies.set(false);
      },
      error: (error) => {
        console.error('Error loading companies:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las empresas',
        });
        this.loadingCompanies.set(false);
        // Mantener opción por defecto en caso de error
        this.companyOptions.set([{ label: 'Todas las empresas', value: null }]);
      },
    });
  }

  /**
   * Carga los filtros iniciales
   */
  private loadInitialFilters(): void {
    // Para gerencia, aplicar filtros sin empresa seleccionada para obtener datos agregados
    // Para otros roles, aplicar filtros normales
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
    // Aplicar filtros automáticamente cuando cambia el proyecto
    this.applyFilters();
  }

  /**
   * Maneja el cambio de cliente
   */
  onClientChange(): void {
    // Aplicar filtros automáticamente cuando cambia el cliente
    this.applyFilters();
  }

  /**
   * Maneja el cambio de empresa
   */
  onCompanyChange(): void {
    // Aplicar filtros automáticamente cuando cambia la empresa
    this.applyFilters();
  }

  /**
   * Aplica los filtros seleccionados
   */
  applyFilters(): void {
    const filters: DashboardFiltersParams = {
      period: this.selectedPeriod() as '7d' | '30d' | '90d' | '1y' | 'custom',
    };

    if (this.selectedPeriod() === 'custom' && this.startDate() && this.endDate()) {
      filters.startDate = this.startDate();
      filters.endDate = this.endDate();
    }

    const project = this.selectedProject();
    if (project && project !== null) {
      // PrimeNG Select devuelve el objeto completo del value
      if (typeof project === 'object' && 'id' in project) {
        filters.projectId = project.id;
      }
    }

    const client = this.selectedClient();
    if (client && client !== null) {
      // PrimeNG Select devuelve el objeto completo del value
      if (typeof client === 'object' && 'id' in client) {
        filters.clientId = client.id;
      }
    }

    // Agregar filtro por empresa si el usuario es gerencia
    if (this.isGerencia()) {
      const company = this.selectedCompany();
      if (company && company !== null) {
        if (typeof company === 'object' && 'id' in company) {
          filters.tenantId = company.id;
          filters.companyId = company.id; // Alias para compatibilidad
        }
      }
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
    this.selectedCompany.set(null);
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
      this.selectedClient() !== null ||
      (this.isGerencia() && this.selectedCompany() !== null)
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

  /**
   * Remueve el filtro de empresa
   */
  removeCompanyFilter(): void {
    this.selectedCompany.set(null);
    this.applyFilters();
  }
}
