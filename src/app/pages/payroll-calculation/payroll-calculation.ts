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
import { UsersApiService, User } from '../../shared/services/users-api.service';
import { TimeTrackingApiService } from '../../shared/services/time-tracking-api.service';
import { EmployeesApiService } from '../../shared/services/employees-api.service';
import { TimeTracking } from '../../shared/interfaces/time-tracking.interface';
import { PayrollCalculationUserDetailsComponent } from './components/payroll-calculation-user-details/payroll-calculation-user-details';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';

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
  selectedMonth = signal<Date | null>(null);

  // Diálogos
  showUserDetailsDialog = signal(false);
  selectedUserForDetails = signal<User | null>(null);

  // Hora límite para considerar tardanza (8:00 AM)
  private readonly TARDANZA_HOUR = 8;
  private readonly TARDANZA_MINUTE = 0;

  ngOnInit(): void {
    // Establecer mes por defecto (mes actual)
    this.selectedMonth.set(new Date());
    this.loadAllUsersData();
  }

  /**
   * Obtener fecha de inicio del mes seleccionado
   */
  getStartDate(): Date | null {
    if (!this.selectedMonth()) return null;
    const month = this.selectedMonth()!;
    return new Date(month.getFullYear(), month.getMonth(), 1);
  }

  /**
   * Obtener fecha de fin del mes seleccionado
   */
  getEndDate(): Date | null {
    if (!this.selectedMonth()) return null;
    const month = this.selectedMonth()!;
    return new Date(month.getFullYear(), month.getMonth() + 1, 0);
  }

  /**
   * Cargar todos los usuarios y sus datos
   */
  loadAllUsersData(): void {
    this.loading.set(true);
    this.usersApi.listWithFilters({ isActive: true }).subscribe({
      next: (response) => {
        const usersList = response.users || response.data || [];
        this.users.set(usersList);
        this.loadUsersTimeTrackings(usersList);
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

    groupedByDay.forEach((dayData, date) => {
      const hasIngreso = !!dayData.ingreso;
      const hasSalida = !!dayData.salida;

      // Calcular horas trabajadas
      if (hasIngreso && hasSalida) {
        const entryTime = new Date(dayData.ingreso!.date).getTime();
        const exitTime = new Date(dayData.salida!.date).getTime();
        if (exitTime > entryTime) {
          const diffMs = exitTime - entryTime;
          const diffHours = diffMs / (1000 * 60 * 60);
          totalHorasTrabajadas += Math.round(diffHours * 100) / 100;
        }
      }

      // Asistencia: tiene entrada y salida
      if (hasIngreso && hasSalida) {
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
        // Falta: no tiene entrada o no tiene salida
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
    this.selectedMonth.set(new Date());
    this.loadAllUsersData();
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
}
