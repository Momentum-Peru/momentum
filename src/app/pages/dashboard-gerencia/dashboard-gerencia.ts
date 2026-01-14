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
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { DashboardGerenciaApiService } from '../../shared/services/dashboard-gerencia-api.service';
import {
  GerenciaDashboardResponse,
  MarcacionDiaria,
  DayTrackingData,
  UserTrackingData,
  DayReportData,
  UserReportData,
} from '../../shared/interfaces/dashboard-gerencia.interface';
import { AuthService } from '../login/services/auth.service';
import { GeocodingService } from '../../shared/services/geocoding.service';

/**
 * Componente principal del Dashboard de Gerencia
 * Principio de Responsabilidad Única: Coordina la vista y carga de datos del dashboard de gerencia
 */
@Component({
  selector: 'app-dashboard-gerencia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerModule,
    ButtonModule,
    PanelModule,
    ProgressSpinnerModule,
    MessageModule,
    ToastModule,
    TableModule,
    CardModule,
  ],
  providers: [MessageService],
  templateUrl: './dashboard-gerencia.html',
  styleUrl: './dashboard-gerencia.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardGerenciaPage implements OnInit {
  private readonly apiService = inject(DashboardGerenciaApiService);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly injector = inject(Injector);

  // Signals para el estado
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);
  public readonly dashboardData = signal<GerenciaDashboardResponse | null>(null);

  // Propiedades para two-way binding con Calendar
  public startDateValue: Date | null = null;
  public endDateValue: Date | null = null;

  // Signals para fechas
  private readonly _startDate = signal<Date | null>(null);
  private readonly _endDate = signal<Date | null>(null);

  // Getters para acceder a los signals
  public readonly startDate = computed(() => this._startDate());
  public readonly endDate = computed(() => this._endDate());

  // Computed para verificar si el usuario es gerencia
  public readonly isGerencia = computed(() => this.authService.isGerencia());

  // Computed para datos derivados
  public readonly dailyTimeTrackings = computed(
    () => this.dashboardData()?.marcacionesDiarias ?? []
  );
  public readonly dailyReports = computed(() => this.dashboardData()?.reportesDiarios ?? []);
  public readonly invoices = computed(() => this.dashboardData()?.facturasIngresadas ?? []);
  public readonly ticketsByStatus = computed(() => this.dashboardData()?.ticketsPorEstado ?? []);
  public readonly tickets = computed(() => this.dashboardData()?.tickets ?? []);
  public readonly sales = computed(() => this.dashboardData()?.ventas ?? []);

  // Signal para manejar qué personas están expandidas (marcaciones)
  private readonly expandedUsers = signal<Set<string>>(new Set());

  // Signal para manejar qué personas están expandidas (reportes)
  private readonly expandedReportUsers = signal<Set<string>>(new Set());

  // Signals para almacenar direcciones resueltas y estado de carga
  private readonly locationAddresses = signal<Record<string, string>>({});
  private readonly locationLoading = signal<Record<string, boolean>>({});
  
  // Set para trackear ubicaciones pendientes de resolución
  private readonly pendingLocations = signal<Set<string>>(new Set());

  /**
   * Agrupa marcaciones primero por persona, luego por día
   */
  public readonly groupedTimeTrackingsByUser = computed(() => {
    const timeTrackings = this.dailyTimeTrackings();

    // Primero agrupar por usuario y día
    const dayGrouped = new Map<string, DayTrackingData>();

    timeTrackings.forEach((timeTracking) => {
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
      const firstTracking = timeTrackings.find((t) => t.userId === userId);

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
   * Computed legacy para compatibilidad (agrupa por día)
   */
  public readonly groupedTimeTrackings = computed(() => {
    const users = this.groupedTimeTrackingsByUser();
    const result: {
      userId: string;
      userName: string;
      userEmail: string;
      date: string;
      entry?: { time: string; date: string; location?: { latitude: number; longitude: number } };
      exit?: { time: string; date: string; location?: { latitude: number; longitude: number } };
    }[] = [];

    users.forEach((user) => {
      user.days.forEach((day) => {
        result.push({
          userId: user.userId,
          userName: user.userName,
          userEmail: user.userEmail,
          date: day.date,
          entry: day.entry,
          exit: day.exit,
        });
      });
    });

    return result.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return a.userName.localeCompare(b.userName);
    });
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
   * Agrupa reportes primero por persona, luego por día
   */
  public readonly groupedReportsByUser = computed(() => {
    const reports = this.dailyReports();

    // Agrupar por usuario y día
    const dayGrouped = new Map<string, DayReportData>();

    reports.forEach((report) => {
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
        0
      );
    });

    // Ahora agrupar por usuario
    const userGrouped = new Map<string, UserReportData>();

    dayGrouped.forEach((dayData, key) => {
      const [userId] = key.split('_');
      const firstReport = reports.find((r) => r.userId === userId);

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

  // Columnas para tablas (mantenidas para compatibilidad con el template)
  public readonly timeTrackingColumns = [
    { field: 'fecha', header: 'Fecha', sortable: true },
    { field: 'hora', header: 'Hora', sortable: true },
    { field: 'userName', header: 'Usuario', sortable: true },
    { field: 'tipo', header: 'Tipo', sortable: true },
  ];

  public readonly reportColumns = [
    { field: 'fecha', header: 'Fecha', sortable: true },
    { field: 'hora', header: 'Hora', sortable: true },
    { field: 'userName', header: 'Usuario', sortable: true },
    { field: 'descripcion', header: 'Descripción', sortable: true },
    { field: 'cantidadReportes', header: 'Cantidad', sortable: true },
  ];

  ngOnInit(): void {
    // Inicializar fechas por defecto (último mes)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    this.startDateValue = startDate;
    this.endDateValue = endDate;
    this._startDate.set(startDate);
    this._endDate.set(endDate);

    // Effect para resolver ubicaciones pendientes de forma reactiva
    // Usar runInInjectionContext porque effect() requiere un contexto de inyección
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const pending = this.pendingLocations();
        if (pending.size > 0) {
          // Resolver ubicaciones pendientes
          pending.forEach((key) => {
            const [lat, lon] = key.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lon)) {
              this.resolveLocationAddress({ latitude: lat, longitude: lon });
            }
          });
          // Limpiar el set después de procesar
          this.pendingLocations.set(new Set());
        }
      });
    });

    // Cargar datos iniciales
    this.loadDashboard();
  }

  /**
   * Carga los datos del dashboard con las fechas seleccionadas
   */
  async loadDashboard(): Promise<void> {
    const start = this.startDateValue;
    const end = this.endDateValue;

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

    this.loading.set(true);
    this.error.set(null);

    try {
      const params = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };

      const data = await this.apiService.getDashboardData(params).toPromise();
      this.dashboardData.set(data ?? null);

      // Resolver direcciones de todas las ubicaciones únicas de forma optimizada
      if (data?.marcacionesDiarias) {
        this.resolveAllLocationAddresses(data.marcacionesDiarias);
      }
    } catch (err: unknown) {
      const errorMessage =
        (err && typeof err === 'object' && 'error' in err
          ? (err.error as { message?: string })?.message
          : null) || 'Error al cargar los datos del dashboard';
      this.error.set(errorMessage);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Maneja el cambio de fecha de inicio
   */
  onStartDateChange(): void {
    this._startDate.set(this.startDateValue);
  }

  /**
   * Maneja el cambio de fecha de fin
   */
  onEndDateChange(): void {
    this._endDate.set(this.endDateValue);
  }

  /**
   * Establece el rango de fechas según el filtro rápido seleccionado
   */
  setDateRange(range: 'today' | 'week' | 'month'): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case 'today':
        startDate = new Date(today);
        // Establecer la fecha de fin al final del día (23:59:59.999)
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        // Establecer la fecha de fin al final del día actual
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
        // Establecer la fecha de fin al final del día actual
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        return;
    }

    // Establecer las fechas
    this.startDateValue = startDate;
    this.endDateValue = endDate;
    this._startDate.set(startDate);
    this._endDate.set(endDate);

    // Cargar el dashboard automáticamente
    this.loadDashboard();
  }

  /**
   * Gets badge class based on time tracking type
   */
  getTimeTrackingBadgeClass(type: string): string {
    switch (type) {
      case 'INGRESO':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'SALIDA':
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
  formatDate(dateString: string): string {
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
   * Calculates worked hours between entry and exit
   */
  calculateWorkedHours(
    entry?: { time: string; date: string },
    exit?: { time: string; date: string }
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
   * Formatea fecha y hora para mostrar
   */
  formatDateTime(dateString: string): string {
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
   * Construye una clave única para una ubicación
   */
  private buildLocationKey(location: { latitude: number; longitude: number }): string {
    return `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
  }

  /**
   * Resuelve todas las direcciones de forma optimizada (agrupa únicas y hace peticiones con delay)
   */
  private resolveAllLocationAddresses(marcaciones: MarcacionDiaria[]): void {
    // Obtener ubicaciones únicas que no estén ya en caché
    const uniqueLocations = new Map<string, { latitude: number; longitude: number }>();
    const addresses = this.locationAddresses();
    const loading = this.locationLoading();

    marcaciones.forEach((marcacion) => {
      if (marcacion.location) {
        const key = this.buildLocationKey(marcacion.location);
        // Solo agregar si no está en caché ni cargando
        if (!addresses[key] && !loading[key] && !uniqueLocations.has(key)) {
          uniqueLocations.set(key, marcacion.location);
        }
      }
    });

    // Resolver direcciones con un pequeño delay entre peticiones para evitar rate limiting
    // Nominatim tiene un límite de 1 petición por segundo, usamos 1.2s para estar seguros
    Array.from(uniqueLocations.values()).forEach((location, index) => {
      setTimeout(() => {
        this.resolveLocationAddress(location);
      }, index * 1200); // 1.2 segundos entre peticiones
    });
  }

  /**
   * Resuelve la dirección de una ubicación usando geocodificación
   */
  private resolveLocationAddress(location: { latitude: number; longitude: number }): void {
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
        // Fallback a coordenadas formateadas
        const fallback = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        this.locationAddresses.update((state) => ({
          ...state,
          [key]: fallback,
        }));
      })
      .finally(() => {
        this.locationLoading.update((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [key]: _, ...rest } = state;
          return rest;
        });
      });
  }

  /**
   * Formatea la ubicación para mostrar (dirección o coordenadas)
   * Accede a los signals para que Angular detecte los cambios automáticamente
   */
  formatLocation(location?: { latitude: number; longitude: number }): string {
    if (!location) return 'N/A';

    const key = this.buildLocationKey(location);

    // Acceder a los signals para que Angular detecte los cambios
    const addresses = this.locationAddresses();
    const loading = this.locationLoading();

    // Si está cargando, mostrar indicador
    if (loading[key]) {
      return 'Buscando dirección...';
    }

    // Si ya tenemos la dirección, retornarla
    const address = addresses[key];
    if (address) {
      return address;
    }

    // Agregar a ubicaciones pendientes para que el effect las resuelva
    // Esto evita actualizar signals durante el renderizado
    const currentPending = this.pendingLocations();
    if (!currentPending.has(key)) {
      this.pendingLocations.update((pending) => {
        const newPending = new Set(pending);
        newPending.add(key);
        return newPending;
      });
    }

    // Retornar coordenadas mientras se carga
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }

  /**
   * Descarga el PDF del dashboard
   */
  async downloadPdf(): Promise<void> {
    const start = this.startDateValue;
    const end = this.endDateValue;

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

    this.loading.set(true);

    try {
      const params = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };

      const blob = await this.apiService.downloadPdf(params).toPromise();

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
      link.download = `dashboard-gerencia_${startDateStr}_${endDateStr}.pdf`;

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
      this.loading.set(false);
    }
  }
}
