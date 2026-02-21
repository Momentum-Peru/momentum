import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EmployeesApiService } from '../../shared/services/employees-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { AreasApiService } from '../../shared/services/areas-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { ApisPeruApiService } from '../../shared/services/apisperu-api.service';
import { WorkShiftsApiService } from '../../shared/services/work-shifts-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  AreaInfo,
} from '../../shared/interfaces/employee.interface';
import { Area } from '../../shared/interfaces/area.interface';
import { WorkShift } from '../../shared/interfaces/work-shift.interface';
import { BANKS, getBankCode } from '../../shared/constants/banks.constants';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    FileUploadModule,
  ],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
  providers: [MessageService, ConfirmationService],
})
export class EmployeesPage implements OnInit {
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly areasApi = inject(AreasApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly workShiftsApi = inject(WorkShiftsApiService);
  private readonly menuService = inject(MenuService);
  private readonly apisPeruService = inject(ApisPeruApiService);
  private readonly router = inject(Router);

  // Subject para manejar la autocompletación de DNI y RUC
  private readonly dniSubject = new Subject<string>();
  private readonly rucSubject = new Subject<string>();

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/employees'));

  items = signal<Employee[]>([]);
  users = signal<UserOption[]>([]);
  areas = signal<Area[]>([]);
  workShifts = signal<WorkShift[]>([]);
  query = signal('');

  // Vista y detalles
  showViewDialog = signal(false);
  viewing = signal<Employee | null>(null);
  loading = signal(false);

  // Estado de expansión para vista móvil
  private expandedRowKeys = signal<Set<string>>(new Set());

  // Filtrado simple por texto
  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const list = this.items()
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate; // DESC
      });

    if (!searchQuery) return list;
    return list.filter((item) => {
      const nombreMatch = item.nombre?.toLowerCase().includes(searchQuery) ?? false;
      const apellidoMatch = item.apellido?.toLowerCase().includes(searchQuery) ?? false;
      const dniMatch = item.dni?.toLowerCase().includes(searchQuery) ?? false;
      const correoMatch = item.correo?.toLowerCase().includes(searchQuery) ?? false;
      const cargoMatch = item.cargo?.toLowerCase().includes(searchQuery) ?? false;
      return nombreMatch || apellidoMatch || dniMatch || correoMatch || cargoMatch;
    });
  });

  ngOnInit() {
    this.load();
    this.loadUsers();
    this.loadAreas();
    this.loadWorkShifts();
  }

  load() {
    this.loading.set(true);
    this.employeesApi.list({ q: this.query() || undefined }).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        const errorMessage = this.getErrorMessage(error);
        this.toastError(errorMessage);
        this.loading.set(false);
      },
    });
  }

  loadUsers() {
    this.usersApi.list().subscribe({
      next: (data) => {
        this.users.set(data);
      },
      error: () => {
        this.toastError('Error al cargar usuarios');
      },
    });
  }

  loadAreas() {
    this.areasApi.list({ isActive: true }).subscribe({
      next: (data) => {
        this.areas.set(data);
      },
      error: () => {
        this.toastError('Error al cargar áreas');
      },
    });
  }

  loadWorkShifts() {
    this.workShiftsApi.list({ isActive: true }).subscribe({
      next: (data) => {
        this.workShifts.set(data);
      },
      error: () => {
        this.toastError('Error al cargar turnos');
      },
    });
  }

  // Helpers de accordion móvil
  buildRowKey(item: Employee, index: number): string {
    return item._id ? String(item._id) : `${item.dni}#${index}`;
  }

  isRowExpandedByKey(key: string): boolean {
    return this.expandedRowKeys().has(key);
  }

  toggleRowByKey(key: string): void {
    const set = new Set(this.expandedRowKeys());
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this.expandedRowKeys.set(set);
  }

  setQuery(value: string) {
    this.query.set(value);
    this.load();
  }

  newItem() {
    this.router.navigate(['/employees', 'new']);
  }

  editItem(item: Employee) {
    if (item._id) {
      this.router.navigate(['/employees', 'edit', item._id]);
    }
  }

  viewItem(item: Employee) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  navigateToSummary(employee: Employee) {
    if (employee._id) {
      this.router.navigate(['/employees', employee._id]);
    }
  }

  getUserName(userId: string | { name?: string; email?: string } | null | undefined): string {
    if (!userId) return 'Sin usuario';
    if (typeof userId === 'object' && 'name' in userId) {
      return userId.name || '';
    }
    const user = this.users().find((u) => u._id === userId);
    return user?.name || 'Usuario no encontrado';
  }

  getUserEmail(userId: string | { email?: string } | null | undefined): string {
    if (!userId) return '';
    if (typeof userId === 'object' && 'email' in userId) {
      return userId.email ?? '';
    }
    const user = this.users().find((u) => u._id === userId);
    return user?.email || '';
  }

  getAreaName(areaId: string | AreaInfo | undefined): string {
    if (!areaId) return 'Sin área';
    if (typeof areaId === 'object' && 'nombre' in areaId) {
      return areaId.nombre;
    }
    const area = this.areas().find((a) => a._id === areaId);
    return area?.nombre || 'Área no encontrada';
  }

  getWorkShiftName(workShiftId: string | WorkShift | undefined): string {
    if (!workShiftId) return 'Sin turno';
    if (typeof workShiftId === 'object' && 'name' in workShiftId) {
      return workShiftId.name;
    }
    const ws = this.workShifts().find((w) => w._id === workShiftId);
    return ws?.name || 'Turno no encontrado';
  }

  remove(item: Employee) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar al empleado ${item.nombre} ${item.apellido}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        this.employeesApi.delete(item._id!).subscribe({
          next: () => {
            this.toastSuccess('Empleado eliminado exitosamente');
            this.load();
          },
          error: (err) => {
            const errorMessage = this.getErrorMessage(err);
            this.toastError(errorMessage);
            this.loading.set(false);
          },
        });
      },
    });
  }

  toastSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: message,
    });
  }

  toastError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }

  // Método para descargar archivo
  downloadFile(url: string) {
    window.open(url, '_blank');
  }

  // Método para verificar si un archivo es una imagen
  isImageFile(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some((ext) => lowerUrl.includes(ext));
  }

  /**
   * Extrae el mensaje de error del backend
   */
  private getErrorMessage(error: unknown): string {
    // Manejar HttpErrorResponse de Angular
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as {
        error?:
          | {
              message?: string | string[];
              statusCode?: number;
              error?: string;
            }
          | string;
        message?: string;
        status?: number;
      };

      // Si error.error es un objeto con message
      if (httpError.error && typeof httpError.error === 'object' && 'message' in httpError.error) {
        const message = httpError.error.message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }
        if (typeof message === 'string') {
          return message;
        }
      }

      // Si error.error es directamente un string
      if (typeof httpError.error === 'string') {
        return httpError.error;
      }

      // Manejar mensaje directo en el nivel superior
      if (httpError.message && typeof httpError.message === 'string') {
        return httpError.message;
      }

      // Manejar error anidado (error.error.error)
      if (
        httpError.error &&
        typeof httpError.error === 'object' &&
        'error' in httpError.error &&
        typeof httpError.error.error === 'string'
      ) {
        return httpError.error.error;
      }
    }

    // Manejar error con propiedad message directa
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return 'Error al cargar empleados';
  }
}
