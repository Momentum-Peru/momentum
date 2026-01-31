import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DashboardDataService } from '../../shared/services/dashboard-data.service';
import { DashboardApiService } from '../../shared/services/dashboard-api.service';
import { DashboardGerenciaApiService } from '../../shared/services/dashboard-gerencia-api.service';
import { DashboardKpiCardComponent } from '../../shared/components/dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardChartComponent } from '../../shared/components/dashboard-chart/dashboard-chart.component';
import { DashboardTableComponent } from '../../shared/components/dashboard-table/dashboard-table.component';
import { DashboardFiltersComponent } from '../../shared/components/dashboard-filters/dashboard-filters.component';
import { MenuService } from '../../shared/services/menu.service';
import { AuthService } from '../login/services/auth.service';
import { GeocodingService } from '../../shared/services/geocoding.service';
import { CompaniesApiService } from '../../shared/services/companies-api.service';
import { CompanyOption } from '../../shared/interfaces/company.interface';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import * as XLSX from 'xlsx';
import {
  DashboardFiltersParams,
  DashboardKpi,
  TimeTrackingByUser,
  TimeTrackingDetail,
} from '../../shared/interfaces/dashboard.interface';
import {
  GerenciaDashboardResponse,
  MarcacionDiaria,
  DayTrackingData,
  UserTrackingData,
  DayReportData,
  UserReportData,
  ReporteDiario,
} from '../../shared/interfaces/dashboard-gerencia.interface';

type TrackingLocation = NonNullable<TimeTrackingDetail['location']>;

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
    FormsModule,
    TableModule,
    PanelModule,
    ButtonModule,
    DatePickerModule,
    ToastModule,
    CardModule,
    TooltipModule,
    DialogModule,
    SelectModule,
    DashboardKpiCardComponent,
    DashboardChartComponent,
    DashboardTableComponent,
    DashboardFiltersComponent,
  ],
  providers: [MessageService],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  protected readonly dashboardService = inject(DashboardDataService);
  private readonly dashboardApiService = inject(DashboardApiService);
  private readonly dashboardGerenciaApiService = inject(DashboardGerenciaApiService);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly companiesApiService = inject(CompaniesApiService);
  private readonly messageService = inject(MessageService);
  private readonly injector = inject(Injector);

  // Computed para verificar si el usuario es gerencia
  protected readonly isGerencia = computed(() => this.authService.isGerencia());

  // Signals para reportes de horas (solo gerencia)
  protected readonly timeTrackingDetails = signal<TimeTrackingDetail[]>([]);
  protected readonly timeTrackingByUser = signal<TimeTrackingByUser[]>([]);
  protected readonly loadingTimeTracking = signal(false);
  protected readonly locationAddresses = signal<Record<string, string>>({});
  protected readonly locationLoading = signal<Record<string, boolean>>({});

  // Signals para datos de gerencia (dashboard-gerencia)
  protected readonly gerenciaDashboardData = signal<GerenciaDashboardResponse | null>(null);
  protected readonly loadingGerencia = signal(false);
  protected readonly gerenciaError = signal<string | null>(null);
  protected readonly gerenciaStartDate = signal<Date | null>(null);
  protected readonly gerenciaEndDate = signal<Date | null>(null);
  public gerenciaStartDateValue: Date | null = null;
  public gerenciaEndDateValue: Date | null = null;
  public gerenciaSelectedCompanyId: string | null = null;
  public gerenciaSelectedUserId: string | null = null;
  private readonly expandedUsers = signal<Set<string>>(new Set());
  private readonly expandedReportUsers = signal<Set<string>>(new Set());

  // Signals para empresas (gerencia)
  protected readonly gerenciaCompanies = signal<CompanyOption[]>([]);
  protected readonly loadingGerenciaCompanies = signal<boolean>(false);

  // Signal para almacenar todos los usuarios disponibles (sin filtrar)
  protected readonly allGerenciaUsers = signal<
    { userId: string; userName: string; userEmail: string }[]
  >([]);

  // Exportaciones (gerencia)
  protected readonly exportingGerenciaExcel = signal<boolean>(false);

  // Signals para el diálogo de archivos
  protected readonly filesDialogVisible = signal(false);
  protected readonly selectedReportFiles = signal<{
    urls: string[];
    type: 'photos' | 'videos' | 'audios' | 'documents' | 'all';
    title: string;
    files?: {
      url: string;
      type: 'photos' | 'videos' | 'audios' | 'documents';
      label: string;
    }[];
  } | null>(null);
  private readonly gerenciaLocationAddresses = signal<Record<string, string>>({});
  private readonly gerenciaLocationLoading = signal<Record<string, boolean>>({});

  // Computed para datos derivados de gerencia
  protected readonly dailyTimeTrackings = computed(
    () => this.gerenciaDashboardData()?.marcacionesDiarias ?? [],
  );
  protected readonly dailyReportsGerencia = computed(
    () => this.gerenciaDashboardData()?.reportesDiarios ?? [],
  );
  protected readonly invoices = computed(
    () => this.gerenciaDashboardData()?.facturasIngresadas ?? [],
  );
  protected readonly ticketsByStatus = computed(
    () => this.gerenciaDashboardData()?.ticketsPorEstado ?? [],
  );
  protected readonly tickets = computed(() => this.gerenciaDashboardData()?.tickets ?? []);
  protected readonly sales = computed(() => this.gerenciaDashboardData()?.ventas ?? []);

  // Computed para obtener lista única de usuarios de marcaciones y reportes
  protected readonly gerenciaUsers = computed(() => {
    // Si ya tenemos usuarios almacenados, usarlos
    const storedUsers = this.allGerenciaUsers();
    if (storedUsers.length > 0) {
      return storedUsers;
    }

    // Si no, generar desde los datos actuales
    const marcaciones = this.dailyTimeTrackings();
    const reportes = this.dailyReportsGerencia();
    const userMap = new Map<string, { userId: string; userName: string; userEmail: string }>();

    // Agregar usuarios de marcaciones
    marcaciones.forEach((marcacion) => {
      if (!userMap.has(marcacion.userId)) {
        userMap.set(marcacion.userId, {
          userId: marcacion.userId,
          userName: marcacion.userName,
          userEmail: marcacion.userEmail,
        });
      }
    });

    // Agregar usuarios de reportes
    reportes.forEach((reporte) => {
      if (!userMap.has(reporte.userId)) {
        userMap.set(reporte.userId, {
          userId: reporte.userId,
          userName: reporte.userName,
          userEmail: reporte.userEmail,
        });
      }
    });

    return Array.from(userMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  });

  // Guardar los filtros actuales para usar en la descarga
  private currentFilters: DashboardFiltersParams = { period: '30d' };

  // Computed para calcular totales de marcaciones
  protected readonly totalIngresos = computed(() => {
    return this.timeTrackingByUser().reduce((sum, user) => sum + (user.ingresos || 0), 0);
  });

  protected readonly totalSalidas = computed(() => {
    return this.timeTrackingByUser().reduce((sum, user) => sum + (user.salidas || 0), 0);
  });

  protected readonly totalMarcaciones = computed(() => {
    return this.timeTrackingByUser().reduce((sum, user) => sum + (user.totalMarcaciones || 0), 0);
  });

  // Mapeo de KPIs a rutas del sistema para verificar permisos
  private readonly kpiRouteMap: Record<string, string> = {
    totalClients: '/companies-crm',
    totalProjects: '/projects',
    totalQuotes: '/quotes',
    totalOrders: '/orders',
    totalUsers: '/users',
    totalRequirements: '/requirements',
    totalDailyReports: '/daily-reports',
    averageDailyReports: '/daily-reports',
    totalDailyReportsValue: '/daily-reports',
  };

  // Mapeo de gráficos a rutas del sistema para verificar permisos
  private readonly chartRouteMap: Record<string, string> = {
    dailyReports: '/daily-reports',
    projectReports: '/projects',
    quotesByStatus: '/quotes',
    clientsByProject: '/companies-crm',
    quotesByProject: '/quotes',
    requirementsByProject: '/requirements',
    projectsByStatus: '/projects',
    requirementsByStatus: '/requirements',
  };

  // Mapeo de tablas a rutas del sistema para verificar permisos
  private readonly tableRouteMap: Record<string, string> = {
    dailyReports: '/daily-reports',
    projectReports: '/projects',
    clientsByProject: '/companies-crm',
  };

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
    // Cargar permisos del usuario antes de cargar el dashboard
    this.menuService.loadUserPermissions();
    this.loadDashboard();

    // Si es gerencia, inicializar fechas para el dashboard de gerencia
    if (this.isGerencia()) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      this.gerenciaStartDateValue = startDate;
      this.gerenciaEndDateValue = endDate;
      this.gerenciaStartDate.set(startDate);
      this.gerenciaEndDate.set(endDate);

      // Cargar empresas disponibles
      this.loadGerenciaCompanies();

      // Effect para resolver ubicaciones automáticamente cuando cambian los datos
      runInInjectionContext(this.injector, () => {
        effect(() => {
          const data = this.gerenciaDashboardData();
          if (data?.marcacionesDiarias) {
            this.resolveAllLocationAddresses(data.marcacionesDiarias);
          }
        });
      });

      // Cargar datos iniciales de gerencia
      this.loadGerenciaDashboard();
    }
  }

  /**
   * Carga las empresas disponibles para el filtro de gerencia
   */
  async loadGerenciaCompanies(): Promise<void> {
    this.loadingGerenciaCompanies.set(true);
    try {
      const companies = await this.companiesApiService.listActiveAsOptions().toPromise();
      this.gerenciaCompanies.set(companies ?? []);
    } catch (err: unknown) {
      console.error('Error al cargar empresas:', err);
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se pudieron cargar las empresas',
      });
    } finally {
      this.loadingGerenciaCompanies.set(false);
    }
  }

  /**
   * Carga los datos del dashboard con filtros por defecto
   * Para gerencia: carga datos agregados de todas las empresas si no hay filtro
   */
  private async loadDashboard(): Promise<void> {
    const filters: DashboardFiltersParams = {
      period: '30d',
    };

    // Para gerencia, no enviar tenantId inicialmente para obtener datos agregados
    // El interceptor ya maneja esto, pero es bueno ser explícito
    await this.dashboardService.loadDashboardData(filters);

    // Si es gerencia, cargar también los reportes de horas
    if (this.isGerencia()) {
      await this.loadTimeTrackingReports(filters);
    }
  }

  /**
   * Maneja los cambios en los filtros del dashboard
   * @param filters Nuevos filtros aplicados
   */
  async onFiltersChanged(filters: DashboardFiltersParams): Promise<void> {
    // Guardar los filtros actuales
    this.currentFilters = filters;
    await this.dashboardService.loadDashboardData(filters);
    // Si es gerencia, cargar también los reportes de horas
    if (this.isGerencia()) {
      await this.loadTimeTrackingReports(filters);
    }
  }

  /**
   * Descarga todas las marcaciones en formato Excel
   */
  async downloadTimeTrackingExcel(): Promise<void> {
    if (!this.isGerencia()) return;

    try {
      // Descargar el archivo Excel usando los filtros actuales
      this.dashboardApiService.exportTimeTrackingToExcel(this.currentFilters).subscribe({
        next: (blob: Blob) => {
          // Crear un enlace temporal para descargar el archivo
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;

          // Generar nombre de archivo con rango de fechas
          const now = new Date();
          const startDate = this.currentFilters?.startDate
            ? new Date(this.currentFilters.startDate).toISOString().split('T')[0]
            : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const endDate = this.currentFilters?.endDate
            ? new Date(this.currentFilters.endDate).toISOString().split('T')[0]
            : now.toISOString().split('T')[0];

          link.download = `Marcaciones_${startDate}_a_${endDate}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error al descargar el archivo Excel:', error);
          alert('Error al descargar el archivo Excel. Por favor, intente nuevamente.');
        },
      });
    } catch (error) {
      console.error('Error al descargar marcaciones:', error);
      alert('Error al descargar las marcaciones. Por favor, intente nuevamente.');
    }
  }

  /**
   * Carga los reportes de horas (solo para gerencia)
   * @param filters Filtros del dashboard
   */
  private async loadTimeTrackingReports(filters?: DashboardFiltersParams): Promise<void> {
    if (!this.isGerencia()) return;

    this.loadingTimeTracking.set(true);
    try {
      const [details, byUser] = await Promise.all([
        this.dashboardApiService.getTimeTrackingDetails(filters).toPromise(),
        this.dashboardApiService.getTimeTrackingByUser(filters).toPromise(),
      ]);
      const parsedDetails = (details as unknown as TimeTrackingDetail[]) || [];
      this.timeTrackingDetails.set(parsedDetails);
      this.timeTrackingByUser.set((byUser as unknown as TimeTrackingByUser[]) || []);
      this.prefetchLocationAddresses(parsedDetails);
    } catch (error) {
      console.error('Error al cargar reportes de horas:', error);
      this.timeTrackingDetails.set([]);
      this.timeTrackingByUser.set([]);
    } finally {
      this.loadingTimeTracking.set(false);
    }
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
   * Filtra los KPIs según los permisos del usuario
   * El rol gerencia puede ver todos los KPIs
   * @returns Array de entradas KPI filtradas
   */
  protected getKpiEntries(): { key: string; value: DashboardKpi }[] {
    const kpis = this.dashboardService.kpis();
    if (!kpis) return [];

    // Si el usuario es gerencia, mostrar todos los KPIs
    if (this.isGerencia()) {
      return Object.entries(kpis).map(([key, value]) => ({ key, value }));
    }

    // Filtrar KPIs según permisos del usuario
    return Object.entries(kpis)
      .filter(([key]) => {
        // Obtener la ruta asociada al KPI
        const requiredRoute = this.kpiRouteMap[key];

        // Si no hay ruta mapeada, mostrar el KPI (KPIs sin restricción)
        if (!requiredRoute) {
          return true;
        }

        // Verificar si el usuario tiene permiso para acceder a la ruta
        return this.menuService.hasPermission(requiredRoute);
      })
      .map(([key, value]) => ({ key, value }));
  }

  /**
   * Verifica si el usuario tiene permiso para ver un gráfico específico
   * El rol gerencia puede ver todos los gráficos
   * @param chartKey Clave del gráfico (ej: 'dailyReports', 'quotesByStatus')
   * @returns true si el usuario tiene permiso, false en caso contrario
   */
  protected canViewChart(chartKey: string): boolean {
    // Si el usuario es gerencia, puede ver todos los gráficos
    if (this.isGerencia()) {
      return true;
    }

    const requiredRoute = this.chartRouteMap[chartKey];

    // Si no hay ruta mapeada, mostrar el gráfico (gráficos sin restricción)
    if (!requiredRoute) {
      return true;
    }

    // Verificar si el usuario tiene permiso para acceder a la ruta
    return this.menuService.hasPermission(requiredRoute);
  }

  /**
   * Verifica si el usuario tiene permiso para ver una tabla específica
   * El rol gerencia puede ver todas las tablas
   * @param tableKey Clave de la tabla (ej: 'dailyReports', 'projectReports')
   * @returns true si el usuario tiene permiso, false en caso contrario
   */
  protected canViewTable(tableKey: string): boolean {
    // Si el usuario es gerencia, puede ver todas las tablas
    if (this.isGerencia()) {
      return true;
    }

    const requiredRoute = this.tableRouteMap[tableKey];

    // Si no hay ruta mapeada, mostrar la tabla (tablas sin restricción)
    if (!requiredRoute) {
      return true;
    }

    // Verificar si el usuario tiene permiso para acceder a la ruta
    return this.menuService.hasPermission(requiredRoute);
  }

  /**
   * Formatea la fecha y hora ISO a formato legible
   */
  protected formatDateTime(dateString?: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Obtiene el badge class según el tipo de marcación
   */
  protected getTypeBadgeClass(type?: string): string {
    switch (type) {
      case 'INGRESO':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'SALIDA':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  protected getLocationLabel(row: TimeTrackingDetail): string {
    const location = row.location;
    if (!location) {
      return '-';
    }
    const key = this.buildLocationKey(location);
    if (this.locationLoading()[key]) {
      return 'Buscando dirección...';
    }
    return this.locationAddresses()[key] ?? this.formatCoordinates(location);
  }

  private prefetchLocationAddresses(details: TimeTrackingDetail[]): void {
    details.forEach((detail) => {
      const location = detail.location;
      if (!location) {
        return;
      }
      this.resolveLocationAddress(location);
    });
  }

  private resolveLocationAddress(location: TrackingLocation): void {
    const key = this.buildLocationKey(location);
    if (this.locationAddresses()[key] || this.locationLoading()[key]) {
      return;
    }

    this.locationLoading.update((state) => ({
      ...state,
      [key]: true,
    }));

    this.geocodingService
      .getAddress(location.latitude, location.longitude)
      .then((address) => {
        this.locationAddresses.update((state) => ({
          ...state,
          [key]: address,
        }));
      })
      .catch(() => {
        this.locationAddresses.update((state) => ({
          ...state,
          [key]: this.formatCoordinates(location),
        }));
      })
      .finally(() => {
        this.locationLoading.update((state) => {
          const { [key]: _, ...rest } = state;
          return rest;
        });
      });
  }

  private buildLocationKey(location: TrackingLocation): string {
    return `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
  }

  private formatCoordinates(location: TrackingLocation): string {
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }

  // ========== MÉTODOS PARA DASHBOARD DE GERENCIA ==========

  /**
   * Agrupa marcaciones primero por persona, luego por día
   */
  public readonly groupedTimeTrackingsByUser = computed(() => {
    const timeTrackings = this.dailyTimeTrackings();

    // Primero agrupar por usuario y día
    const dayGrouped = new Map<string, DayTrackingData>();

    timeTrackings.forEach((timeTracking: MarcacionDiaria) => {
      const key = `${timeTracking.userId}_${timeTracking.fecha}`;

      if (!dayGrouped.has(key)) {
        dayGrouped.set(key, {
          date: timeTracking.fecha,
        });
      }

      const dayData = dayGrouped.get(key)!;
      const timeTrackingWithType = timeTracking as MarcacionDiaria & { type?: string };
      const trackingType: string = timeTrackingWithType.tipo || timeTrackingWithType.type || '';
      const normalizedType = trackingType.toUpperCase();

      if (normalizedType === 'INGRESO' || normalizedType === 'ENTRADA') {
        const formattedTime = timeTracking.hora ? timeTracking.hora.substring(0, 5) : '00:00';
        dayData.entry = {
          time: formattedTime,
          date: `${timeTracking.fecha}T${timeTracking.hora || '00:00:00'}`,
          location: timeTracking.location,
        };
      } else if (normalizedType === 'SALIDA' || normalizedType === 'EXIT') {
        const formattedTime = timeTracking.hora ? timeTracking.hora.substring(0, 5) : '00:00';
        dayData.exit = {
          time: formattedTime,
          date: `${timeTracking.fecha}T${timeTracking.hora || '00:00:00'}`,
          location: timeTracking.location,
        };
      }
    });

    // Ahora agrupar por usuario
    const userGrouped = new Map<string, UserTrackingData>();

    dayGrouped.forEach((dayData, key) => {
      const [userId] = key.split('_');
      const firstTracking = timeTrackings.find((t: MarcacionDiaria) => t.userId === userId);

      if (!firstTracking) return;

      if (!userGrouped.has(userId)) {
        userGrouped.set(userId, {
          userId,
          userName: firstTracking.userName,
          userEmail: firstTracking.userEmail,
          days: [],
          totalDays: 0,
          totalHours: 0,
        });
      }

      const userData = userGrouped.get(userId)!;
      userData.days.push(dayData);
    });

    // Calcular totales y ordenar
    const result: UserTrackingData[] = [];

    userGrouped.forEach((userData) => {
      // Ordenar días por fecha descendente
      userData.days.sort((a, b) => b.date.localeCompare(a.date));

      // Calcular totales
      userData.totalDays = userData.days.length;

      let totalHours = 0;
      userData.days.forEach((day) => {
        if (day.entry && day.exit) {
          totalHours += this.calculateWorkedHours(day.entry, day.exit);
        }
      });
      userData.totalHours = Math.round(totalHours * 100) / 100;

      result.push(userData);
    });

    // Ordenar por nombre de usuario
    result.sort((a, b) => a.userName.localeCompare(b.userName));

    return result;
  });

  /**
   * Agrupa reportes primero por persona, luego por día
   */
  public readonly groupedReportsByUser = computed(() => {
    const reports = this.dailyReportsGerencia();

    // Agrupar por usuario y día
    const dayGrouped = new Map<string, DayReportData>();

    reports.forEach((report: ReporteDiario) => {
      const key = `${report.userId}_${report.fecha}`;

      if (!dayGrouped.has(key)) {
        dayGrouped.set(key, {
          date: report.fecha,
          reports: [],
          totalReports: 0,
        });
      }

      const dayData = dayGrouped.get(key)!;
      dayData.reports.push(report);
    });

    // Calcular totales por día
    dayGrouped.forEach((dayData) => {
      dayData.totalReports = dayData.reports.reduce(
        (sum, report) => sum + (report.cantidadReportes || 1),
        0,
      );
    });

    // Ahora agrupar por usuario
    const userGrouped = new Map<string, UserReportData>();

    dayGrouped.forEach((dayData, key) => {
      const [userId] = key.split('_');
      const firstReport = reports.find((r: ReporteDiario) => r.userId === userId);

      if (!firstReport) return;

      if (!userGrouped.has(userId)) {
        userGrouped.set(userId, {
          userId,
          userName: firstReport.userName,
          userEmail: firstReport.userEmail,
          days: [],
          totalDays: 0,
          totalReports: 0,
        });
      }

      const userData = userGrouped.get(userId)!;
      userData.days.push(dayData);
    });

    // Calcular totales y ordenar
    const result: UserReportData[] = [];

    userGrouped.forEach((userData) => {
      // Ordenar días por fecha descendente
      userData.days.sort((a, b) => b.date.localeCompare(a.date));

      // Calcular totales
      userData.totalDays = userData.days.length;
      userData.totalReports = userData.days.reduce((sum, day) => sum + day.totalReports, 0);

      result.push(userData);
    });

    // Ordenar por nombre de usuario
    result.sort((a, b) => a.userName.localeCompare(b.userName));

    return result;
  });

  /**
   * Verifica si un usuario está expandido
   */
  isUserExpanded(userId: string): boolean {
    return this.expandedUsers().has(userId);
  }

  /**
   * Alterna el estado de expansión de un usuario
   */
  toggleUserExpansion(userId: string): void {
    const current = new Set(this.expandedUsers());
    if (current.has(userId)) {
      current.delete(userId);
    } else {
      current.add(userId);
    }
    this.expandedUsers.set(current);
  }

  /**
   * Calcula la cantidad de entradas para un usuario
   */
  getEntryCount(userData: UserTrackingData): number {
    return userData.days.filter((day) => day.entry).length;
  }

  /**
   * Calcula la cantidad de salidas para un usuario
   */
  getExitCount(userData: UserTrackingData): number {
    return userData.days.filter((day) => day.exit).length;
  }

  /**
   * Verifica si un usuario está expandido (reportes)
   */
  isReportUserExpanded(userId: string): boolean {
    return this.expandedReportUsers().has(userId);
  }

  /**
   * Alterna el estado de expansión de un usuario (reportes)
   */
  toggleReportUserExpansion(userId: string): void {
    const current = new Set(this.expandedReportUsers());
    if (current.has(userId)) {
      current.delete(userId);
    } else {
      current.add(userId);
    }
    this.expandedReportUsers.set(current);
  }

  /**
   * Carga los datos del dashboard de gerencia
   */
  async loadGerenciaDashboard(): Promise<void> {
    const start = this.gerenciaStartDateValue;
    const end = this.gerenciaEndDateValue;

    if (!start || !end) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fechas requeridas',
        detail: 'Por favor seleccione un rango de fechas',
      });
      return;
    }

    if (start > end) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de fechas',
        detail: 'La fecha de inicio no puede ser mayor que la fecha de fin',
      });
      return;
    }

    this.loadingGerencia.set(true);
    this.gerenciaError.set(null);

    try {
      const params: any = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };

      // Agregar filtro de empresa si está seleccionado
      if (this.gerenciaSelectedCompanyId) {
        params.companyId = this.gerenciaSelectedCompanyId;
      }

      // Agregar filtro de usuario si está seleccionado
      if (this.gerenciaSelectedUserId) {
        params.userId = this.gerenciaSelectedUserId;
      }

      const data = await this.dashboardGerenciaApiService.getDashboardData(params).toPromise();
      this.gerenciaDashboardData.set(data ?? null);

      // Si no hay filtro de usuario, almacenar la lista completa de usuarios
      if (!this.gerenciaSelectedUserId && data) {
        const userMap = new Map<string, { userId: string; userName: string; userEmail: string }>();

        // Agregar usuarios de marcaciones
        data.marcacionesDiarias?.forEach((marcacion) => {
          if (!userMap.has(marcacion.userId)) {
            userMap.set(marcacion.userId, {
              userId: marcacion.userId,
              userName: marcacion.userName,
              userEmail: marcacion.userEmail,
            });
          }
        });

        // Agregar usuarios de reportes
        data.reportesDiarios?.forEach((reporte) => {
          if (!userMap.has(reporte.userId)) {
            userMap.set(reporte.userId, {
              userId: reporte.userId,
              userName: reporte.userName,
              userEmail: reporte.userEmail,
            });
          }
        });

        const allUsers = Array.from(userMap.values()).sort((a, b) =>
          a.userName.localeCompare(b.userName),
        );
        this.allGerenciaUsers.set(allUsers);
      }
    } catch (err: unknown) {
      const errorMessage =
        (err && typeof err === 'object' && 'error' in err
          ? (err.error as { message?: string })?.message
          : null) || 'Error al cargar los datos del dashboard';
      this.gerenciaError.set(errorMessage);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    } finally {
      this.loadingGerencia.set(false);
    }
  }

  /**
   * Maneja el cambio de fecha de inicio
   */
  onGerenciaStartDateChange(): void {
    this.gerenciaStartDate.set(this.gerenciaStartDateValue);
    // Limpiar filtro de usuario y lista cuando cambian las fechas
    this.gerenciaSelectedUserId = null;
    this.allGerenciaUsers.set([]);
  }

  /**
   * Maneja el cambio de fecha de fin
   */
  onGerenciaEndDateChange(): void {
    this.gerenciaEndDate.set(this.gerenciaEndDateValue);
    // Limpiar filtro de usuario y lista cuando cambian las fechas
    this.gerenciaSelectedUserId = null;
    this.allGerenciaUsers.set([]);
  }

  /**
   * Maneja el cambio de empresa seleccionada en el dashboard de gerencia
   */
  onGerenciaCompanyChange(): void {
    // Limpiar filtro de usuario y lista de usuarios al cambiar empresa
    this.gerenciaSelectedUserId = null;
    this.allGerenciaUsers.set([]);

    // Recargar automáticamente cuando cambia la empresa
    if (this.gerenciaStartDateValue && this.gerenciaEndDateValue) {
      this.loadGerenciaDashboard();
    }
  }

  /**
   * Maneja el cambio de usuario seleccionado en el dashboard de gerencia
   */
  onGerenciaUserChange(): void {
    // Recargar automáticamente cuando cambia el usuario
    if (this.gerenciaStartDateValue && this.gerenciaEndDateValue) {
      this.loadGerenciaDashboard();
    }
  }

  /**
   * Establece el rango de fechas según el filtro rápido seleccionado
   */
  setGerenciaDateRange(range: 'today' | 'week' | 'month'): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        return;
    }

    // Establecer las fechas
    this.gerenciaStartDateValue = startDate;
    this.gerenciaEndDateValue = endDate;
    this.gerenciaStartDate.set(startDate);
    this.gerenciaEndDate.set(endDate);

    // Limpiar filtro de usuario y lista
    this.gerenciaSelectedUserId = null;
    this.allGerenciaUsers.set([]);

    // Cargar el dashboard automáticamente
    this.loadGerenciaDashboard();
  }

  /**
   * Calculates worked hours between entry and exit
   */
  calculateWorkedHours(
    entry?: { time: string; date: string },
    exit?: { time: string; date: string },
  ): number {
    if (!entry || !exit) return 0;

    try {
      const entryTime = new Date(entry.date);
      const exitTime = new Date(exit.date);

      if (exitTime.getTime() <= entryTime.getTime()) return 0;

      const diffMs = exitTime.getTime() - entryTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return Math.round(diffHours * 100) / 100;
    } catch {
      return 0;
    }
  }

  /**
   * Formatea horas trabajadas
   */
  formatWorkedHours(hours: number): string {
    if (hours <= 0) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0 && m > 0) return `${m}m`;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0 && m === 0) return `${h}h`;
    return '0h 0m';
  }

  /**
   * Checks if has complete attendance
   */
  hasCompleteAttendance(dayData: {
    entry?: { time: string; date: string };
    exit?: { time: string; date: string };
  }): boolean {
    return !!(dayData.entry && dayData.exit);
  }

  /**
   * Gets attendance status
   */
  getAttendanceStatus(dayData: {
    entry?: { time: string; date: string };
    exit?: { time: string; date: string };
  }): string {
    if (dayData.entry && dayData.exit) return 'Completo';
    if (dayData.entry || dayData.exit) return 'Incompleto';
    return 'Sin registro';
  }

  /**
   * Gets badge class based on attendance status
   */
  getAttendanceBadgeClass(status: string): string {
    switch (status) {
      case 'Completo':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Incompleto':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Sin registro':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  /**
   * Gets badge class based on ticket status
   */
  getTicketBadgeClass(status: string): string {
    switch (status) {
      case 'abierto':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cerrado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  /**
   * Gets badge class based on invoice type
   */
  getInvoiceBadgeClass(type: string): string {
    switch (type) {
      case 'compra':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'venta':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  /**
   * Gets badge class based on sale type
   */
  getSaleBadgeClass(type: string): string {
    switch (type) {
      case 'requerimiento':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'cotizacion':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'tdr':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  /**
   * Formatea un número como moneda
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value);
  }

  /**
   * Formats date in readable format
   */
  formatGerenciaDate(dateString: string): string {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Gets the day of the week
   */
  getDayOfWeek(dateString: string): string {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-PE', { weekday: 'long' });
    } catch {
      return '';
    }
  }

  /**
   * Formatea fecha y hora para mostrar (versión gerencia)
   */
  formatGerenciaDateTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Resuelve todas las direcciones de forma optimizada (agrupa únicas y hace peticiones con delay)
   */
  private resolveAllLocationAddresses(marcaciones: MarcacionDiaria[]): void {
    // Obtener ubicaciones únicas que no estén ya en caché
    const uniqueLocations = new Map<string, { latitude: number; longitude: number }>();
    const addresses = this.gerenciaLocationAddresses();
    const loading = this.gerenciaLocationLoading();

    marcaciones.forEach((marcacion) => {
      if (marcacion.location) {
        const key = this.buildGerenciaLocationKey(marcacion.location);
        // Solo agregar si no está en caché ni cargando
        if (!addresses[key] && !loading[key] && !uniqueLocations.has(key)) {
          uniqueLocations.set(key, marcacion.location);
        }
      }
    });

    // Resolver direcciones con un pequeño delay entre peticiones para evitar rate limiting
    Array.from(uniqueLocations.values()).forEach((location, index) => {
      setTimeout(() => {
        this.resolveGerenciaLocationAddress(location);
      }, index * 1200); // 1.2 segundos entre peticiones
    });
  }

  /**
   * Resuelve la dirección de una ubicación usando geocodificación (versión gerencia)
   */
  private resolveGerenciaLocationAddress(location: { latitude: number; longitude: number }): void {
    const key = this.buildGerenciaLocationKey(location);
    if (this.gerenciaLocationAddresses()[key] || this.gerenciaLocationLoading()[key]) {
      return;
    }

    this.gerenciaLocationLoading.update((state) => ({
      ...state,
      [key]: true,
    }));

    this.geocodingService
      .getAddress(location.latitude, location.longitude)
      .then((address) => {
        this.gerenciaLocationAddresses.update((state) => ({
          ...state,
          [key]: address,
        }));
      })
      .catch(() => {
        // Fallback a coordenadas formateadas
        const fallback = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        this.gerenciaLocationAddresses.update((state) => ({
          ...state,
          [key]: fallback,
        }));
      })
      .finally(() => {
        this.gerenciaLocationLoading.update((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [key]: _, ...rest } = state;
          return rest;
        });
      });
  }

  /**
   * Construye una clave única para una ubicación (versión gerencia)
   */
  private buildGerenciaLocationKey(location: { latitude: number; longitude: number }): string {
    return `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
  }

  /**
   * Formatea la ubicación para mostrar (dirección o coordenadas) - versión gerencia
   */
  formatGerenciaLocation(location?: { latitude: number; longitude: number }): string {
    if (!location) return 'N/A';

    const key = this.buildGerenciaLocationKey(location);

    // Acceder a los signals para que Angular detecte los cambios
    const addresses = this.gerenciaLocationAddresses();
    const loading = this.gerenciaLocationLoading();

    // Si está cargando, mostrar indicador
    if (loading[key]) {
      return 'Buscando dirección...';
    }

    // Si ya tenemos la dirección, retornarla
    const address = addresses[key];
    if (address) {
      return address;
    }

    // Retornar coordenadas mientras se carga
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }

  /**
   * Descarga el PDF del dashboard de gerencia
   */
  async downloadGerenciaPdf(): Promise<void> {
    const start = this.gerenciaStartDateValue;
    const end = this.gerenciaEndDateValue;

    if (!start || !end) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fechas requeridas',
        detail: 'Por favor seleccione un rango de fechas',
      });
      return;
    }

    if (start > end) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de fechas',
        detail: 'La fecha de inicio no puede ser mayor que la fecha de fin',
      });
      return;
    }

    this.loadingGerencia.set(true);

    try {
      const params: any = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };

      // Agregar filtro de empresa si está seleccionado
      if (this.gerenciaSelectedCompanyId) {
        params.companyId = this.gerenciaSelectedCompanyId;
      }

      // Agregar filtro de usuario si está seleccionado
      if (this.gerenciaSelectedUserId) {
        params.userId = this.gerenciaSelectedUserId;
      }

      const blob = await this.dashboardGerenciaApiService.downloadPdf(params).toPromise();

      if (!blob) {
        throw new Error('No se pudo descargar el PDF');
      }

      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generar nombre del archivo
      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];
      const companyName = this.gerenciaSelectedCompanyId
        ? `_${this.gerenciaCompanies().find((c) => c._id === this.gerenciaSelectedCompanyId)?.name || 'empresa'}`
        : '';
      const userName = this.gerenciaSelectedUserId
        ? `_${this.gerenciaUsers().find((u) => u.userId === this.gerenciaSelectedUserId)?.userName || 'usuario'}`
        : '';
      link.download = `dashboard-gerencia_${startDateStr}_${endDateStr}${companyName}${userName}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.messageService.add({
        severity: 'success',
        summary: 'PDF descargado',
        detail: 'El PDF del dashboard se ha descargado exitosamente',
      });
    } catch (err: unknown) {
      const errorMessage =
        (err && typeof err === 'object' && 'error' in err
          ? (err.error as { message?: string })?.message
          : null) || 'Error al descargar el PDF';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    } finally {
      this.loadingGerencia.set(false);
    }
  }

  /**
   * Descarga Excel de marcaciones (gerencia) con filtros actuales:
   * fecha + empresa + persona. Incluye entrada/salida y dirección.
   */
  async downloadGerenciaExcel(): Promise<void> {
    const start = this.gerenciaStartDateValue;
    const end = this.gerenciaEndDateValue;

    if (!start || !end) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fechas requeridas',
        detail: 'Por favor seleccione un rango de fechas',
      });
      return;
    }

    if (start > end) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de fechas',
        detail: 'La fecha de inicio no puede ser mayor que la fecha de fin',
      });
      return;
    }

    this.exportingGerenciaExcel.set(true);
    try {
      // Asegurar que tengamos data cargada (y filtrada) antes de exportar
      if (!this.gerenciaDashboardData()) {
        await this.loadGerenciaDashboard();
      }

      const marcaciones = this.dailyTimeTrackings();

      // Resolver direcciones para las ubicaciones que falten (sin delays largos)
      await this.resolveGerenciaAddressesForExcel(marcaciones);

      interface DayRow {
        userId: string;
        userName: string;
        userEmail: string;
        fechaIso: string;
        entradaHora?: string;
        entradaDireccion?: string;
        salidaHora?: string;
        salidaDireccion?: string;
        horasTrabajadas?: string;
      }

      const getAddress = (loc?: { latitude: number; longitude: number }): string => {
        if (!loc) return '';
        let address = this.formatGerenciaLocation(loc);
        if (!address || address === 'Buscando dirección...') {
          address = `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
        }
        return address;
      };

      const normalizeTipo = (m: MarcacionDiaria): 'INGRESO' | 'SALIDA' | 'OTRO' => {
        const raw = ((m as any).tipo || (m as any).type || '').toString().toUpperCase();
        if (raw === 'INGRESO' || raw === 'ENTRADA') return 'INGRESO';
        if (raw === 'SALIDA' || raw === 'EXIT') return 'SALIDA';
        return 'OTRO';
      };

      // Agrupar por persona + día y poner entrada/salida en la misma fila
      const grouped = new Map<string, DayRow>();

      marcaciones.forEach((m) => {
        const key = `${m.userId}__${m.fecha}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            userId: m.userId,
            userName: m.userName || '',
            userEmail: m.userEmail || '',
            fechaIso: m.fecha,
          });
        }

        const row = grouped.get(key)!;
        const tipo = normalizeTipo(m);
        const hora = (m.hora || '').toString();

        if (tipo === 'INGRESO') {
          // Si hay múltiples ingresos en el día, conservar el más temprano
          if (!row.entradaHora || hora < row.entradaHora) {
            row.entradaHora = hora;
            row.entradaDireccion = getAddress(m.location);
          }
        } else if (tipo === 'SALIDA') {
          // Si hay múltiples salidas en el día, conservar la más tardía
          if (!row.salidaHora || hora > row.salidaHora) {
            row.salidaHora = hora;
            row.salidaDireccion = getAddress(m.location);
          }
        }
      });

      const dayRows = Array.from(grouped.values())
        .sort(
          (a, b) => a.userName.localeCompare(b.userName) || b.fechaIso.localeCompare(a.fechaIso),
        )
        .map((r) => {
          // Calcular horas trabajadas si hay entrada y salida
          if (r.entradaHora && r.salidaHora) {
            const entry = {
              time: r.entradaHora.substring(0, 5),
              date: `${r.fechaIso}T${r.entradaHora}`,
            };
            const exit = {
              time: r.salidaHora.substring(0, 5),
              date: `${r.fechaIso}T${r.salidaHora}`,
            };
            const hours = this.calculateWorkedHours(entry as any, exit as any);
            r.horasTrabajadas = this.formatWorkedHours(hours);
          } else {
            r.horasTrabajadas = '-';
          }

          return {
            Usuario: r.userName,
            Email: r.userEmail,
            Fecha: this.formatGerenciaDate(r.fechaIso),
            'Entrada (hora)': r.entradaHora || '-',
            'Entrada (dirección)': r.entradaDireccion || '-',
            'Salida (hora)': r.salidaHora || '-',
            'Salida (dirección)': r.salidaDireccion || '-',
            'Horas trabajadas': r.horasTrabajadas || '-',
          };
        });

      const ws = XLSX.utils.json_to_sheet(dayRows);
      // Mejoras de presentación
      ws['!freeze'] = { xSplit: 0, ySplit: 1 }; // congelar encabezado
      ws['!autofilter'] = { ref: ws['!ref'] as string }; // filtros en encabezado
      ws['!cols'] = [
        { wch: 24 }, // Usuario
        { wch: 28 }, // Email
        { wch: 12 }, // Fecha
        { wch: 14 }, // Entrada hora
        { wch: 42 }, // Entrada dirección
        { wch: 14 }, // Salida hora
        { wch: 42 }, // Salida dirección
        { wch: 16 }, // Horas trabajadas
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Marcaciones');

      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];
      const companyName = this.gerenciaSelectedCompanyId
        ? `_${this.gerenciaCompanies().find((c) => c._id === this.gerenciaSelectedCompanyId)?.name || 'empresa'}`
        : '';
      const userName = this.gerenciaSelectedUserId
        ? `_${this.gerenciaUsers().find((u) => u.userId === this.gerenciaSelectedUserId)?.userName || 'usuario'}`
        : '';

      XLSX.writeFile(wb, `marcaciones_${startDateStr}_${endDateStr}${companyName}${userName}.xlsx`);

      this.messageService.add({
        severity: 'success',
        summary: 'Excel descargado',
        detail: 'El Excel de marcaciones se ha descargado exitosamente',
      });
    } catch (err) {
      console.error('Error al descargar Excel de gerencia:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al descargar el Excel',
      });
    } finally {
      this.exportingGerenciaExcel.set(false);
    }
  }

  private async resolveGerenciaAddressesForExcel(marcaciones: MarcacionDiaria[]): Promise<void> {
    const unique = new Map<string, { latitude: number; longitude: number }>();
    const addresses = this.gerenciaLocationAddresses();

    marcaciones.forEach((m) => {
      if (!m.location) return;
      const key = this.buildGerenciaLocationKey(m.location);
      if (!addresses[key] && !unique.has(key)) {
        unique.set(key, m.location);
      }
    });

    const locations = Array.from(unique.values());
    if (locations.length === 0) return;

    // Concurrencia simple para evitar saturar el geocoder
    const CONCURRENCY = 5;
    let idx = 0;

    const worker = async (): Promise<void> => {
      while (idx < locations.length) {
        const current = locations[idx++];
        const key = this.buildGerenciaLocationKey(current);
        if (this.gerenciaLocationAddresses()[key]) continue;

        try {
          const address = await this.geocodingService.getAddress(
            current.latitude,
            current.longitude,
          );
          this.gerenciaLocationAddresses.update((state) => ({
            ...state,
            [key]: address,
          }));
        } catch {
          const fallback = `${current.latitude.toFixed(4)}, ${current.longitude.toFixed(4)}`;
          this.gerenciaLocationAddresses.update((state) => ({
            ...state,
            [key]: fallback,
          }));
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, locations.length) }, () => worker()),
    );
  }

  /**
   * Obtiene las fotos de un reporte
   */
  getReportPhotos(report: ReporteDiario): string[] {
    if (!report.photoDescriptions || !Array.isArray(report.photoDescriptions)) return [];
    return report.photoDescriptions.filter((url: string | null | undefined): url is string => {
      return typeof url === 'string' && url.trim() !== '';
    });
  }

  /**
   * Obtiene los videos de un reporte
   */
  getReportVideos(report: ReporteDiario): string[] {
    if (!report.videoDescriptions || !Array.isArray(report.videoDescriptions)) return [];
    return report.videoDescriptions.filter((url: string | null | undefined): url is string => {
      return typeof url === 'string' && url.trim() !== '';
    });
  }

  /**
   * Obtiene los audios de un reporte
   */
  getReportAudios(report: ReporteDiario): string[] {
    if (!report.audioDescriptions || !Array.isArray(report.audioDescriptions)) return [];
    return report.audioDescriptions.filter((url: string | null | undefined): url is string => {
      return typeof url === 'string' && url.trim() !== '';
    });
  }

  /**
   * Obtiene los documentos de un reporte
   */
  getReportDocuments(report: ReporteDiario): string[] {
    if (!report.documents || !Array.isArray(report.documents)) return [];
    return report.documents.filter((url: string | null | undefined): url is string => {
      return typeof url === 'string' && url.trim() !== '';
    });
  }

  /**
   * Obtiene el total de archivos de un reporte
   */
  getReportFilesCount(report: ReporteDiario): number {
    return (
      this.getReportPhotos(report).length +
      this.getReportVideos(report).length +
      this.getReportAudios(report).length +
      this.getReportDocuments(report).length
    );
  }

  /**
   * Abre el diálogo para ver todos los archivos de un reporte
   */
  openAllFilesDialog(report: ReporteDiario): void {
    const photos = this.getReportPhotos(report);
    const videos = this.getReportVideos(report);
    const audios = this.getReportAudios(report);
    const documents = this.getReportDocuments(report);

    const allFiles: {
      url: string;
      type: 'photos' | 'videos' | 'audios' | 'documents';
      label: string;
    }[] = [];

    photos.forEach((url) => {
      allFiles.push({ url, type: 'photos', label: 'Foto' });
    });
    videos.forEach((url) => {
      allFiles.push({ url, type: 'videos', label: 'Video' });
    });
    audios.forEach((url) => {
      allFiles.push({ url, type: 'audios', label: 'Audio' });
    });
    documents.forEach((url) => {
      allFiles.push({ url, type: 'documents', label: 'Documento' });
    });

    if (allFiles.length > 0) {
      this.selectedReportFiles.set({
        urls: allFiles.map((f) => f.url),
        type: 'all',
        title: `Archivos del Reporte - ${report.userName} (${allFiles.length} archivos)`,
        files: allFiles,
      } as any);
      this.filesDialogVisible.set(true);
    }
  }

  /**
   * Abre el diálogo para ver los archivos de un reporte (método legacy, mantenido por compatibilidad)
   */
  openFilesDialog(report: ReporteDiario, type: 'photos' | 'videos' | 'audios' | 'documents'): void {
    let urls: string[] = [];
    let title = '';

    switch (type) {
      case 'photos':
        urls = this.getReportPhotos(report);
        title = `Fotos del Reporte - ${report.userName}`;
        break;
      case 'videos':
        urls = this.getReportVideos(report);
        title = `Videos del Reporte - ${report.userName}`;
        break;
      case 'audios':
        urls = this.getReportAudios(report);
        title = `Audios del Reporte - ${report.userName}`;
        break;
      case 'documents':
        urls = this.getReportDocuments(report);
        title = `Documentos del Reporte - ${report.userName}`;
        break;
    }

    if (urls.length > 0) {
      this.selectedReportFiles.set({ urls, type, title });
      this.filesDialogVisible.set(true);
    }
  }

  /**
   * Cierra el diálogo de archivos
   */
  closeFilesDialog(): void {
    this.filesDialogVisible.set(false);
    this.selectedReportFiles.set(null);
  }

  /**
   * Abre un archivo en una nueva pestaña
   */
  openFile(url: string): void {
    window.open(url, '_blank');
  }

  /**
   * Obtiene el tipo de archivo basado en la extensión
   */
  protected getFileType(url: string): 'image' | 'video' | 'audio' | 'document' {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension)) {
      return 'video';
    }
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension)) {
      return 'audio';
    }
    return 'document';
  }

  /**
   * Obtiene los archivos filtrados por tipo
   */
  protected getFilesByType(
    type: 'photos' | 'videos' | 'audios' | 'documents',
  ): { url: string; type: 'photos' | 'videos' | 'audios' | 'documents'; label: string }[] {
    const files = this.selectedReportFiles()?.files;
    if (!files) return [];
    return files.filter((f) => f.type === type);
  }

  /**
   * Verifica si hay archivos de un tipo específico
   */
  protected hasFilesOfType(type: 'photos' | 'videos' | 'audios' | 'documents'): boolean {
    return this.getFilesByType(type).length > 0;
  }
}
