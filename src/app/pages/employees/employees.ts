import { Component, OnInit, signal, inject, computed } from '@angular/core';
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
import { MessageService, ConfirmationService } from 'primeng/api';
import { EmployeesApiService } from '../../shared/services/employees-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { AreasApiService } from '../../shared/services/areas-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  AreaInfo,
} from '../../shared/interfaces/employee.interface';
import { Area } from '../../shared/interfaces/area.interface';

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

  items = signal<Employee[]>([]);
  users = signal<UserOption[]>([]);
  areas = signal<Area[]>([]);
  query = signal('');
  showDialog = signal(false);
  showViewDialog = signal(false);
  editing = signal<Employee | null>(null);
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
      const seguroMatch = item.numeroSeguroSocial?.toLowerCase().includes(searchQuery) ?? false;
      const cargoMatch = item.cargo?.toLowerCase().includes(searchQuery) ?? false;
      return nombreMatch || apellidoMatch || dniMatch || correoMatch || seguroMatch || cargoMatch;
    });
  });

  ngOnInit() {
    this.load();
    this.loadUsers();
    this.loadAreas();
  }

  load() {
    this.loading.set(true);
    this.employeesApi.list({ q: this.query() || undefined }).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toastError('Error al cargar empleados');
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
    this.editing.set({
      nombre: '',
      apellido: '',
      dni: '',
      correo: '',
      telefono: '',
      direccion: '',
      cargo: '',
      numeroSeguroSocial: '',
      userId: '',
      areaId: undefined,
    });
    this.showDialog.set(true);
  }

  editItem(item: Employee) {
    const editedItem = { ...item };

    // Si userId es un objeto (populado), extraer el _id
    if (
      editedItem.userId &&
      typeof editedItem.userId === 'object' &&
      '_id' in editedItem.userId &&
      editedItem.userId._id
    ) {
      editedItem.userId = editedItem.userId._id;
    }

    // Si areaId es un objeto (populado), extraer el _id
    if (
      editedItem.areaId &&
      typeof editedItem.areaId === 'object' &&
      '_id' in editedItem.areaId &&
      editedItem.areaId._id
    ) {
      editedItem.areaId = editedItem.areaId._id;
    }

    this.editing.set(editedItem);
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editing.set(null);
  }

  viewItem(item: Employee) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  onEditChange(field: keyof Employee, value: Employee[keyof Employee]) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  getUserName(userId: string | { name?: string; email?: string } | null | undefined): string {
    if (!userId) return 'Sin usuario';
    if (typeof userId === 'object' && 'name' in userId) {
      return userId.name;
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

  getUserIdForSelect(employee: Employee): string {
    if (!employee.userId) return '';
    if (typeof employee.userId === 'string') {
      return employee.userId;
    }
    return employee.userId._id || '';
  }

  getAreaIdForSelect(employee: Employee): string {
    if (!employee.areaId) return '';
    if (typeof employee.areaId === 'string') {
      return employee.areaId;
    }
    return employee.areaId._id || '';
  }

  getAreaName(areaId: string | AreaInfo | undefined): string {
    if (!areaId) return 'Sin área';
    if (typeof areaId === 'object' && 'nombre' in areaId) {
      return areaId.nombre;
    }
    const area = this.areas().find((a) => a._id === areaId);
    return area?.nombre || 'Área no encontrada';
  }

  save() {
    const item = this.editing();
    if (!item) return;

    const errors = this.validateForm(item);
    if (errors.length) {
      errors.forEach((e) => this.toastError(e));
      return;
    }

    this.loading.set(true);

    if (item._id) {
      // Actualizar
      const updateData: UpdateEmployeeRequest = {
        nombre: item.nombre,
        apellido: item.apellido,
        dni: item.dni,
        correo: item.correo,
        telefono: item.telefono || undefined,
        direccion: item.direccion || undefined,
        cargo: item.cargo || undefined,
        numeroSeguroSocial: item.numeroSeguroSocial,
        userId: typeof item.userId === 'string' ? item.userId : undefined,
      };

      // Manejar areaId: solo incluir si tiene un valor válido
      const areaIdValue =
        typeof item.areaId === 'string' && item.areaId.trim() !== ''
          ? item.areaId
          : typeof item.areaId === 'object' && item.areaId && '_id' in item.areaId
          ? item.areaId._id
          : '';

      // Si hay un valor válido, incluirlo; si es cadena vacía, enviar cadena vacía para limpiar
      if (areaIdValue) {
        updateData.areaId = areaIdValue;
      } else {
        // Enviar cadena vacía para indicar que se debe limpiar el área
        updateData.areaId = '';
      }

      this.employeesApi.update(item._id, updateData).subscribe({
        next: () => {
          this.toastSuccess('Empleado actualizado exitosamente');
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al actualizar el empleado';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    } else {
      // Crear
      if (typeof item.userId !== 'string') {
        this.toastError('Debe seleccionar un usuario');
        this.loading.set(false);
        return;
      }

      const createData: CreateEmployeeRequest = {
        nombre: item.nombre,
        apellido: item.apellido,
        dni: item.dni,
        correo: item.correo,
        telefono: item.telefono || undefined,
        direccion: item.direccion || undefined,
        cargo: item.cargo || undefined,
        numeroSeguroSocial: item.numeroSeguroSocial,
        userId: item.userId,
        areaId: typeof item.areaId === 'string' && item.areaId ? item.areaId : undefined,
      };

      this.employeesApi.create(createData).subscribe({
        next: () => {
          this.toastSuccess('Empleado creado exitosamente');
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al crear el empleado';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    }
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
            const message = err.error?.message || 'Error al eliminar el empleado';
            this.toastError(message);
            this.loading.set(false);
          },
        });
      },
    });
  }

  validateForm(item: Employee): string[] {
    const errors: string[] = [];

    if (!item.nombre || item.nombre.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (!item.apellido || item.apellido.trim().length < 2) {
      errors.push('El apellido debe tener al menos 2 caracteres');
    }

    if (!item.dni || !/^\d{8}$/.test(item.dni)) {
      errors.push('El DNI debe tener exactamente 8 dígitos');
    }

    if (!item.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.correo)) {
      errors.push('El correo electrónico no es válido');
    }

    if (!item.numeroSeguroSocial || item.numeroSeguroSocial.trim().length === 0) {
      errors.push('El número de seguro social es obligatorio');
    }

    if (!item.userId || (typeof item.userId === 'string' && item.userId.trim().length === 0)) {
      errors.push('Debe seleccionar un usuario');
    }

    return errors;
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
}
