import {
  Component,
  OnInit,
  signal,
  inject,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { UsersApiService, User, UserResponse } from '../../shared/services/users-api.service';
import { TimeTrackingApiService } from '../../shared/services/time-tracking-api.service';
import { EmployeesApiService } from '../../shared/services/employees-api.service';
import { TimeTracking } from '../../shared/interfaces/time-tracking.interface';
import { forkJoin } from 'rxjs';
import { PayrollCalculationUserDetailsComponent } from './components/payroll-calculation-user-details/payroll-calculation-user-details';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import * as XLSX from 'xlsx';

interface UserSummary {
  user: User;
  name: string;
  email: string;
  totalAsistencias: number;
  totalTardanzas: number;
  totalFaltas: number;
  totalHorasTrabajadas: number;
}

/**
 * Componente principal de Cálculo de Planilla
 * Muestra tabla con resumen de asistencias por usuario
 */
@Component({
  selector: 'app-payroll-calculation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    ConfirmDialogModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    TooltipModule,
    DatePickerModule,
    InputTextModule,
    PayrollCalculationUserDetailsComponent,
  ],
  templateUrl: './payroll-calculation.html',
  styleUrl: './payroll-calculation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService, ConfirmationService],
})
export class PayrollCalculationPage implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly timeTrackingApi = inject(TimeTrackingApiService);
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly messageService = inject(MessageService);

  // Estado
  users = signal<User[]>([]);
  usersTimeTrackings = signal<Map<string, TimeTracking[]>>(new Map());
  loading = signal(false);

  // Filtros
  searchQuery = signal('');
  dateRange = signal<Date[] | null>(null);

  // Diálogos
  showUserDetailsDialog = signal(false);
  selectedUserForDetails = signal<User | null>(null);

  // Hora límite para considerar tardanza (8:00 AM)
  private readonly TARDANZA_HOUR = 8;
  private readonly TARDANZA_MINUTE = 0;

  ngOnInit(): void {
    // Establecer rango por defecto (mes actual)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.dateRange.set([startDate, endDate]);
    this.loadAllUsersData();
  }

  /**
   * Obtener fecha de inicio del rango seleccionado
   */
  getStartDate(): Date | null {
    const range = this.dateRange();
    if (!range || !Array.isArray(range) || range.length === 0) return null;
    return range[0] || null;
  }

  /**
   * Obtener fecha de fin del rango seleccionado
   */
  getEndDate(): Date | null {
    const range = this.dateRange();
    if (!range || !Array.isArray(range) || range.length < 2) return null;
    return range[1] || null;
  }

  /**
   * Cargar todos los usuarios y sus datos
   */
  loadAllUsersData(): void {
    this.loading.set(true);
    // Cargar todos los usuarios aumentando el límite para obtener todos de una vez
    this.usersApi.listWithFilters({ isActive: true, limit: 1000 }).subscribe({
      next: (response: UserResponse & { total?: number; totalPages?: number; page?: number }) => {
        // La respuesta puede tener 'users' o 'data'
        const usersList = response.users || response.data || [];
        
        // Verificar si hay más páginas y cargarlas si es necesario
        const total = response.total;
        const totalPages = response.totalPages;
        
        if (totalPages && totalPages > 1 && typeof total === 'number' && usersList.length < total) {
          // Cargar todas las páginas restantes usando forkJoin
          this.loadAllPagesUsers(totalPages, usersList);
        } else {
          this.users.set(usersList);
          this.loadUsersTimeTrackings(usersList);
        }
      },
      error: (error: unknown) => {
        console.error('Error al cargar usuarios:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los usuarios',
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Cargar todas las páginas de usuarios usando forkJoin
   */
  private loadAllPagesUsers(totalPages: number, initialUsers: User[]): void {
    const requests = [];
    
    // Crear requests para todas las páginas restantes
    for (let page = 2; page <= totalPages; page++) {
      requests.push(this.usersApi.listWithFilters({ isActive: true, page, limit: 1000 }));
    }
    
    // Ejecutar todas las peticiones en paralelo
    forkJoin(requests).subscribe({
      next: (responses: (UserResponse & { total?: number; totalPages?: number; page?: number })[]) => {
        let allUsers = [...initialUsers];
        
        // Combinar todos los usuarios de todas las páginas
        responses.forEach((response) => {
          const pageUsers = response.users || response.data || [];
          allUsers = allUsers.concat(pageUsers);
        });
        
        this.users.set(allUsers);
        this.loadUsersTimeTrackings(allUsers);
      },
      error: (error: unknown) => {
        console.error('Error al cargar todas las páginas:', error);
        // Usar al menos los usuarios iniciales
        this.users.set(initialUsers);
        this.loadUsersTimeTrackings(initialUsers);
      },
    });
  }

  /**
   * Cargar marcaciones de todos los usuarios
   */
  private loadUsersTimeTrackings(users: User[]): void {
    const trackingsMap = new Map<string, TimeTracking[]>();
    let loadedCount = 0;
    const totalUsers = users.length;

    if (totalUsers === 0) {
      this.usersTimeTrackings.set(trackingsMap);
      this.loading.set(false);
      return;
    }

    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    const filters: { startDate?: string; endDate?: string } = {};
    if (startDate) {
      filters.startDate = startDate.toISOString().split('T')[0];
    }
    if (endDate) {
      filters.endDate = endDate.toISOString().split('T')[0];
    }

    users.forEach((user) => {
      const userId = user._id || user.id;
      this.timeTrackingApi.getByUser(userId, filters).subscribe({
        next: (trackings) => {
          // Filtrar registros legacy
          const validTrackings = trackings.filter(
            (t) => t.type === 'INGRESO' || t.type === 'SALIDA'
          );
          trackingsMap.set(userId, validTrackings);
          loadedCount++;

          if (loadedCount === totalUsers) {
            this.usersTimeTrackings.set(trackingsMap);
            this.loading.set(false);
          }
        },
        error: (error: unknown) => {
          console.error(`Error al cargar marcaciones del usuario ${userId}:`, error);
          trackingsMap.set(userId, []);
          loadedCount++;

          if (loadedCount === totalUsers) {
            this.usersTimeTrackings.set(trackingsMap);
            this.loading.set(false);
          }
        },
      });
    });
  }

  /**
   * Obtener la fecha local como string YYYY-MM-DD
   */
  private getLocalDateString(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calcular resumen para un usuario
   */
  private calculateUserSummary(user: User, trackings: TimeTracking[]): UserSummary {
    // Agrupar por día
    const groupedByDay = new Map<string, { ingreso?: TimeTracking; salida?: TimeTracking }>();

    trackings.forEach((tracking) => {
      const date = this.getLocalDateString(tracking.date);
      if (!groupedByDay.has(date)) {
        groupedByDay.set(date, {});
      }
      const dayData = groupedByDay.get(date)!;
      if (tracking.type === 'INGRESO') {
        dayData.ingreso = tracking;
      } else if (tracking.type === 'SALIDA') {
        dayData.salida = tracking;
      }
    });

    let totalAsistencias = 0;
    let totalTardanzas = 0;
    let totalFaltas = 0;
    let totalHorasTrabajadas = 0;

    // Convertir a array ordenado por fecha para poder buscar el día siguiente
    const sortedDays = Array.from(groupedByDay.entries()).sort((a, b) => {
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });

    sortedDays.forEach(([, dayData]) => {
      const hasIngreso = !!dayData.ingreso;
      const hasSalida = !!dayData.salida;

      // Calcular horas trabajadas SOLO si hay entrada Y salida en el mismo día
      if (hasIngreso && hasSalida) {
        const entryTime = new Date(dayData.ingreso!.date);
        const exitTime = new Date(dayData.salida!.date);

        // Verificar que la salida sea del mismo día que la entrada
        const entryDay = this.getLocalDateString(entryTime);
        const exitDay = this.getLocalDateString(exitTime);

        // Solo calcular si son del mismo día
        if (exitDay === entryDay && exitTime.getTime() > entryTime.getTime()) {
          const diffMs = exitTime.getTime() - entryTime.getTime();
          const hoursToAdd = diffMs / (1000 * 60 * 60);
          totalHorasTrabajadas += Math.round(hoursToAdd * 100) / 100;
        }
      }

      // Asistencia: tiene entrada Y salida en el mismo día
      if (hasIngreso && hasSalida) {
        // Verificar que sean del mismo día
        const entryDay = this.getLocalDateString(dayData.ingreso!.date);
        const exitDay = this.getLocalDateString(dayData.salida!.date);

        if (exitDay === entryDay) {
          totalAsistencias++;

          // Verificar tardanza: entrada después de la hora límite
          const entryDate = new Date(dayData.ingreso!.date);
          const entryHour = entryDate.getHours();
          const entryMinute = entryDate.getMinutes();

          if (
            entryHour > this.TARDANZA_HOUR ||
            (entryHour === this.TARDANZA_HOUR && entryMinute > this.TARDANZA_MINUTE)
          ) {
            totalTardanzas++;
          }
        } else {
          // Tiene entrada y salida pero de días diferentes = falta
          totalFaltas++;
        }
      } else {
        // Falta: no tiene entrada o no tiene salida en el mismo día
        totalFaltas++;
      }
    });

    return {
      user,
      name: user.name,
      email: user.email,
      totalAsistencias,
      totalTardanzas,
      totalFaltas,
      totalHorasTrabajadas,
    };
  }

  /**
   * Datos resumidos para la tabla
   */
  userSummaryData = computed(() => {
    const summaries: UserSummary[] = [];
    const trackingsMap = this.usersTimeTrackings();

    this.users().forEach((user) => {
      const userId = user._id || user.id;
      const trackings = trackingsMap.get(userId) || [];
      const summary = this.calculateUserSummary(user, trackings);
      summaries.push(summary);
    });

    // Filtrar por búsqueda
    const query = this.searchQuery().toLowerCase();
    if (query) {
      return summaries.filter(
        (s) => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
      );
    }

    return summaries;
  });

  /**
   * Aplicar filtros
   */
  applyFilters(): void {
    this.loadAllUsersData();
  }

  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.searchQuery.set('');
    // Establecer rango por defecto (mes actual)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.dateRange.set([startDate, endDate]);
    this.loadAllUsersData();
  }

  /**
   * Manejar cambio del rango de fechas
   */
  onRangeChange(range: Date[] | null): void {
    this.dateRange.set(Array.isArray(range) && range.length === 2 ? range : null);
    if (this.dateRange()) {
      this.applyFilters();
    }
  }

  /**
   * Abrir detalles del usuario
   */
  openUserDetails(user: User): void {
    this.selectedUserForDetails.set(user);
    this.showUserDetailsDialog.set(true);
  }

  /**
   * Formatear horas trabajadas
   */
  formatWorkedHours(hours: number | undefined | null): string {
    if (hours === undefined || hours === null || isNaN(hours)) return '-';
    if (hours <= 0) return '0h 0m';

    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0 && m > 0) return `${m}m`;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0 && m === 0) return `${h}h`;
    return '0h 0m';
  }

  /**
   * Descargar reporte general en Excel
   */
  downloadGeneralReport(): void {
    const data = this.userSummaryData();
    if (data.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay datos para exportar',
      });
      return;
    }

    const reportData = data.map((item) => ({
      Usuario: item.name,
      Email: item.email,
      'Total Asistencias': item.totalAsistencias,
      'Total Tardanzas': item.totalTardanzas,
      'Total Faltas': item.totalFaltas,
      'Horas Trabajadas': this.formatWorkedHours(item.totalHorasTrabajadas),
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen Asistencias');

    // Generar nombre de archivo con rango de fechas
    const start = this.getStartDate();
    const end = this.getEndDate();
    let fileName = 'Reporte_General_Asistencias';
    if (start && end) {
      fileName += `_${start.toISOString().split('T')[0]}_a_${end.toISOString().split('T')[0]}`;
    }
    fileName += '.xlsx';

    XLSX.writeFile(workbook, fileName);
  }
}
