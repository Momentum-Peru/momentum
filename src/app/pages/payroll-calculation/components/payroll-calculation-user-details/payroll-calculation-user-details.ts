import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { User } from '../../../../shared/services/users-api.service';
import { TimeTrackingApiService } from '../../../../shared/services/time-tracking-api.service';
import {
  TimeTracking,
  CreateTimeTrackingRequest,
  UpdateTimeTrackingRequest,
} from '../../../../shared/interfaces/time-tracking.interface';
import { PayrollCalculationTimeTrackingDialogComponent } from '../payroll-calculation-time-tracking-dialog/payroll-calculation-time-tracking-dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from '../../../../pages/login/services/auth.service';
import { MenuService } from '../../../../shared/services/menu.service';
import * as XLSX from 'xlsx';

/**
 * Componente de Detalles de Usuario
 * Muestra tabla de asistencias con opciones de editar y agregar
 */
@Component({
  selector: 'app-payroll-calculation-user-details',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    CardModule,
    PayrollCalculationTimeTrackingDialogComponent,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './payroll-calculation-user-details.html',
  styleUrl: './payroll-calculation-user-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService, ConfirmationService],
})
export class PayrollCalculationUserDetailsComponent implements OnInit {
  @Input({ required: true }) visible = false;
  @Input({ required: true }) user: User | null = null;
  @Input() startDate: Date | null = null;
  @Input() endDate: Date | null = null;
  @Output() closeDialog = new EventEmitter<void>();
  @Output() refreshData = new EventEmitter<void>();

  private readonly timeTrackingApi = inject(TimeTrackingApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);

  // Usuario actual
  currentUser = toSignal(this.authService.currentUser$, {
    initialValue: this.authService.getCurrentUser(),
  });

  // Verificar si el usuario puede editar/agregar/eliminar marcaciones
  // Debe cumplir dos condiciones:
  // 1. Tener rol de gerencia, supervisor o admin
  // 2. Tener permiso de edición (edit) explícito en el módulo de cálculo de planilla (/payroll-calculation)
  // NOTA: Incluso gerencia/supervisor necesitan tener permiso 'edit' configurado en menu-permissions
  canEditTimeTracking = computed(() => {
    const user = this.currentUser();
    const hasRolePermission =
      user?.role === 'gerencia' || user?.role === 'supervisor' || user?.role === 'admin';

    if (!hasRolePermission) {
      return false;
    }

    // Verificar directamente el tipo de permiso configurado en menu-permissions
    // Buscar el permiso específico para /payroll-calculation
    const userPermissions = this.menuService.getUserPermissions();
    const payrollPermission = userPermissions.find(
      (p) => p.route === '/payroll-calculation' && p.isActive
    );

    // Solo permitir edición si el permiso es explícitamente 'edit'
    // Si es 'view' o no existe, no permitir edición
    const hasMenuEditPermission = payrollPermission?.permissionType === 'edit';

    // Ambas condiciones deben cumplirse
    return hasRolePermission && hasMenuEditPermission;
  });

  timeTrackings = signal<TimeTracking[]>([]);
  loading = signal(false);
  showTimeTrackingDialog = signal(false);
  editingTimeTracking = signal<TimeTracking | null>(null);
  selectedTimeTrackingDate = signal<Date | null>(null);
  defaultTrackingType = signal<'INGRESO' | 'SALIDA' | null>(null);

  // Agrupar marcaciones por día para mostrar en la tabla
  groupedTrackings = computed(() => {
    const grouped = new Map<string, { ingreso?: TimeTracking; salida?: TimeTracking }>();

    this.timeTrackings()
      .filter((t) => t.type === 'INGRESO' || t.type === 'SALIDA')
      .forEach((tracking) => {
        const date = this.getLocalDateString(tracking.date);
        if (!grouped.has(date)) {
          grouped.set(date, {});
        }
        const dayData = grouped.get(date)!;
        if (tracking.type === 'INGRESO') {
          dayData.ingreso = tracking;
        } else if (tracking.type === 'SALIDA') {
          dayData.salida = tracking;
        }
      });

    // Convertir a array y ordenar por fecha descendente (más reciente primero)
    return Array.from(grouped.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Orden descendente
      });
  });

  // Calcular estadísticas
  statistics = computed(() => {
    const grouped = this.groupedTrackings();
    let totalHoras = 0;
    let diasCompletos = 0;
    let diasIncompletos = 0;

    grouped.forEach((dayData) => {
      const horas = this.calculateWorkedHours(dayData.ingreso, dayData.salida);
      totalHoras += horas;

      if (dayData.ingreso && dayData.salida) {
        diasCompletos++;
      } else if (dayData.ingreso || dayData.salida) {
        diasIncompletos++;
      }
    });

    return {
      totalDias: grouped.length,
      totalHoras,
      diasCompletos,
      diasIncompletos,
    };
  });

  ngOnInit(): void {
    // Asegurar que los permisos de menú estén cargados
    this.menuService.loadUserPermissions();

    if (this.user) {
      this.loadUserTimeTrackings();
    }
  }

  /**
   * Cargar marcaciones del usuario
   */
  private loadUserTimeTrackings(): void {
    if (!this.user) return;

    this.loading.set(true);
    const userId = this.user._id || this.user.id;

    const filters: { startDate?: string; endDate?: string } = {};
    if (this.startDate) {
      filters.startDate = this.startDate.toISOString().split('T')[0];
    }
    if (this.endDate) {
      filters.endDate = this.endDate.toISOString().split('T')[0];
    }

    this.timeTrackingApi.getByUser(userId, filters).subscribe({
      next: (trackings) => {
        // Filtrar registros legacy y ordenar por fecha descendente
        const validTrackings = trackings
          .filter((t) => t.type === 'INGRESO' || t.type === 'SALIDA')
          .sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
        this.timeTrackings.set(validTrackings);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error al cargar marcaciones:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las marcaciones',
        });
        this.loading.set(false);
      },
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
   * Formatear fecha
   */
  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    }
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Formatear hora
   */
  formatTime(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Calcular horas trabajadas del día
   */
  calculateWorkedHours(ingreso?: TimeTracking, salida?: TimeTracking): number {
    if (!ingreso || !salida) return 0;
    const entryTime = new Date(ingreso.date).getTime();
    const exitTime = new Date(salida.date).getTime();
    if (exitTime <= entryTime) return 0;
    const diffMs = exitTime - entryTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100;
  }

  /**
   * Formatear horas trabajadas
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
   * Obtener el día de la semana
   */
  getDayOfWeek(date: string | Date | undefined): string {
    if (!date) return '';
    const d =
      typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? (() => {
            const [year, month, day] = date.split('-').map(Number);
            return new Date(year, month - 1, day);
          })()
        : typeof date === 'string'
        ? new Date(date)
        : date;
    return d.toLocaleDateString('es-PE', { weekday: 'long' });
  }

  /**
   * Formatear rango de fechas
   */
  formatDateRange(start: Date, end: Date): string {
    const startStr = start.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const endStr = end.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return `${startStr} - ${endStr}`;
  }

  /**
   * Abrir diálogo para agregar marcación
   */
  openAddTimeTrackingDialog(type: 'INGRESO' | 'SALIDA', date?: string): void {
    let defaultDate = new Date();
    if (date) {
      // Si viene una fecha string YYYY-MM-DD, crear fecha local
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        defaultDate = new Date(year, month - 1, day);
        // Establecer hora por defecto según el tipo
        if (type === 'INGRESO') {
          defaultDate.setHours(8, 0, 0, 0);
        } else {
          defaultDate.setHours(17, 0, 0, 0);
        }
      } else {
        defaultDate = new Date(date);
      }
    } else {
      // Si no hay fecha, usar fecha actual con hora según tipo
      if (type === 'INGRESO') {
        defaultDate.setHours(8, 0, 0, 0);
      } else {
        defaultDate.setHours(17, 0, 0, 0);
      }
    }
    this.selectedTimeTrackingDate.set(defaultDate);
    this.defaultTrackingType.set(type);
    this.editingTimeTracking.set(null);
    this.showTimeTrackingDialog.set(true);
  }

  /**
   * Abrir diálogo para editar marcación
   */
  openEditTimeTrackingDialog(tracking: TimeTracking): void {
    this.editingTimeTracking.set(tracking);
    this.selectedTimeTrackingDate.set(new Date(tracking.date));
    this.showTimeTrackingDialog.set(true);
  }

  /**
   * Guardar marcación
   */
  saveTimeTracking(request: CreateTimeTrackingRequest | UpdateTimeTrackingRequest): void {
    const editing = this.editingTimeTracking();
    const userId = this.user?._id || this.user?.id;

    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Usuario no seleccionado',
      });
      return;
    }

    if (editing) {
      this.timeTrackingApi.update(editing._id!, request as UpdateTimeTrackingRequest).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Marcación actualizada exitosamente',
          });
          this.showTimeTrackingDialog.set(false);
          this.editingTimeTracking.set(null);
          this.loadUserTimeTrackings();
          this.refreshData.emit();
        },
        error: (error: unknown) => {
          console.error('Error al actualizar marcación:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la marcación',
          });
        },
      });
    } else {
      const createRequest = request as CreateTimeTrackingRequest;
      createRequest.userId = userId;
      this.timeTrackingApi.create(createRequest).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Marcación creada exitosamente',
          });
          this.showTimeTrackingDialog.set(false);
          this.loadUserTimeTrackings();
          this.refreshData.emit();
        },
        error: (error: unknown) => {
          console.error('Error al crear marcación:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la marcación',
          });
        },
      });
    }
  }

  /**
   * Eliminar marcación
   */
  deleteTimeTracking(tracking: TimeTracking): void {
    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar esta marcación?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.timeTrackingApi.delete(tracking._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Marcación eliminada exitosamente',
            });
            this.loadUserTimeTrackings();
            this.refreshData.emit();
          },
          error: (error: unknown) => {
            console.error('Error al eliminar marcación:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la marcación',
            });
          },
        });
      },
    });
  }

  /**
   * Cerrar diálogo
   */
  onClose(): void {
    this.closeDialog.emit();
  }

  /**
   * Descargar reporte individual en Excel
   */
  downloadIndividualReport(): void {
    const data = this.groupedTrackings();
    if (data.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay datos para exportar',
      });
      return;
    }

    const reportData = data.map((day) => ({
      Fecha: this.formatDate(day.date),
      Día: this.getDayOfWeek(day.date),
      Entrada: day.ingreso ? this.formatTime(day.ingreso.date) : '-',
      Salida: day.salida ? this.formatTime(day.salida.date) : '-',
      'Horas Trabajadas': this.formatWorkedHours(
        this.calculateWorkedHours(day.ingreso, day.salida)
      ),
      Estado: this.getAttendanceStatus(day),
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencias');

    // Generar nombre de archivo
    const userName = (this.user?.name || 'Usuario').replace(/\s+/g, '_');
    let fileName = `Reporte_Asistencias_${userName}`;
    if (this.startDate && this.endDate) {
      fileName += `_${this.startDate.toISOString().split('T')[0]}_a_${
        this.endDate.toISOString().split('T')[0]
      }`;
    }
    fileName += '.xlsx';

    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Obtener estado de asistencia para el reporte
   */
  private getAttendanceStatus(dayData: { ingreso?: TimeTracking; salida?: TimeTracking }): string {
    if (dayData.ingreso && dayData.salida) return 'Completo';
    if (dayData.ingreso || dayData.salida) return 'Incompleto';
    return 'Sin registro';
  }
}
