import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';
import { Tag } from 'primeng/tag';
import { Card } from 'primeng/card';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  UsersApiService,
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from '../../shared/services/users-api.service';

interface UserFormData {
  _id?: string;
  email: string;
  name: string;
  role: 'user' | 'moderator' | 'admin' | 'gerencia';
  password?: string;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputText,
    ButtonModule,
    TableModule,
    Dialog,
    Select,
    ConfirmDialog,
    Toast,
    Tooltip,
    Tag,
    Card,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly usersApi = inject(UsersApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly baseUrl = environment.apiUrl;

  // Estado de la aplicación
  private _users = signal<User[]>([]);
  query = signal<string>('');
  roleFilter = signal<string>('');
  statusFilter = signal<string>('true'); // Por defecto mostrar solo activos
  showDialog = signal<boolean>(false);
  editing = signal<UserFormData | null>(null);
  loading = signal<boolean>(false);
  showStatsDialog = signal<boolean>(false);
  stats = signal<UserStats | null>(null);
  showDetailsDialog = signal<boolean>(false);
  viewingUser = signal<User | null>(null);
  expandedRowIds = signal<Set<string>>(new Set());
  showPassword = signal<boolean>(false);

  // Subject para debounce de búsqueda
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Getter que garantiza que siempre devuelva un array
  get users() {
    const usersValue = this._users();
    return Array.isArray(usersValue) ? usersValue : [];
  }

  // Opciones para los selectores
  roleOptions = [
    { label: 'Usuario', value: 'user' },
    { label: 'Moderador', value: 'moderator' },
    { label: 'Administrador', value: 'admin' },
    { label: 'Gerencia', value: 'gerencia' },
  ];

  statusOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'true' },
    { label: 'Inactivos', value: 'false' },
  ];

  ngOnInit() {
    // Asegurar que users siempre sea un array
    this._users.set([]);

    // Configurar debounce para búsqueda
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadUsers();
      });

    this.loadUsers();
    this.loadStats();
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo principal
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
        this.showPassword.set(false); // Resetear visibilidad de contraseña al cerrar
      }
    });

    // Efecto para manejar el cierre del diálogo de detalles
    effect(() => {
      if (!this.showDetailsDialog()) {
        this.viewingUser.set(null);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga la lista de usuarios con filtros aplicados
   */
  loadUsers() {
    this.loading.set(true);

    // Construir filtros solo con valores válidos
    const filters: { search?: string; role?: string; isActive?: boolean } = {};

    const query = this.query().trim();
    if (query) {
      filters.search = query;
    }

    const role = this.roleFilter();
    if (role) {
      filters.role = role;
    }

    const status = this.statusFilter();
    // Solo aplicar filtro si no es 'all' (todos)
    if (status && status !== 'all') {
      filters.isActive = status === 'true';
    }
    // Si status es 'all' o está vacío, no enviar isActive para mostrar todos

    this.usersApi.listWithFilters(filters).subscribe({
      next: (response) => {
        // Filtrado del lado del cliente como fallback
        let filteredUsers = response?.users || [];

        // Aplicar filtro de estado si la API no lo procesó correctamente
        // Solo filtrar si isActive está definido (no undefined)
        if (filters.isActive !== undefined) {
          filteredUsers = filteredUsers.filter((user: { isActive?: boolean }) => user.isActive === filters.isActive);
        }
        // Si isActive es undefined, mostrar todos (activos e inactivos)

        // Aplicar filtro de rol si la API no lo procesó correctamente
        if (filters.role) {
          filteredUsers = filteredUsers.filter((user: { role?: string }) => user.role === filters.role);
        }

        // Aplicar filtro de búsqueda si la API no lo procesó correctamente
        if (filters.search) {
          const query = filters.search.toLowerCase();
          filteredUsers = filteredUsers.filter(
            (user: { name?: string; email?: string }) =>
              user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query)
          );
        }

        this._users.set(Array.isArray(filteredUsers) ? filteredUsers : []);
        this.loading.set(false);
        this.loadStats();
      },
      error: (error) => {
        console.error('Error cargando usuarios:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
        this._users.set([]);
        this.loading.set(false);
      },
    });
  }

  /**
   * Actualiza el filtro de búsqueda
   */
  setQuery(value: string) {
    this.query.set(value);
    this.searchSubject.next(value);
  }

  /**
   * Actualiza el filtro de rol
   */
  setRoleFilter(value: string) {
    this.roleFilter.set(value);
    this.loadUsers();
  }

  /**
   * Actualiza el filtro de estado
   */
  setStatusFilter(value: string) {
    this.statusFilter.set(value);
    this.loadUsers();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters() {
    this.query.set('');
    this.roleFilter.set('');
    this.statusFilter.set('true'); // Por defecto mostrar solo activos
    this.loadUsers();
  }

  /**
   * Abre el diálogo para crear un nuevo usuario
   */
  newUser() {
    this.editing.set({
      email: '',
      name: '',
      role: 'user',
      password: '',
    });
    this.showDialog.set(true);
  }

  /**
   * Abre el diálogo para editar un usuario existente
   */
  editUser(user: User) {
    this.editing.set({
      _id: user._id || user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    this.showDialog.set(true);
  }

  /**
   * Cierra el diálogo de edición
   */
  closeDialog() {
    this.showDialog.set(false);
  }

  /**
   * Actualiza un campo del formulario de edición
   */
  onEditChange<K extends keyof UserFormData>(key: K, value: UserFormData[K]) {
    const current = this.editing();
    if (!current) return;
    this.editing.set({ ...current, [key]: value });
  }

  /**
   * Guarda los cambios del usuario
   */
  save() {
    const userData = this.editing();
    if (!userData) return;

    // Validar campos requeridos
    const validationErrors = this.validateForm(userData);
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de validación',
          detail: error,
        });
      });
      return;
    }

    this.loading.set(true);

    if (userData._id) {
      // Actualizar usuario existente
      const updateData: UserUpdateRequest = {
        email: userData.email,
        name: userData.name,
        role: userData.role,
      };

      this.usersApi.update(userData._id, updateData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario actualizado correctamente',
          });
          this.closeDialog();
          this.loadUsers();
          this.loadStats();
        },
        error: (error) => {
          console.error('Error actualizando usuario:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
          this.loading.set(false);
        },
      });
    } else {
      // Crear nuevo usuario
      const createData: UserCreateRequest = {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        password: userData.password || '',
      };

      this.usersApi.create(createData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario creado correctamente',
          });
          this.closeDialog();
          this.loadUsers();
          this.loadStats();
        },
        error: (error) => {
          console.error('Error creando usuario:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
          this.loading.set(false);
        },
      });
    }
  }

  /**
   * Confirma y elimina un usuario
   */
  confirmDelete(user: User) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar al usuario "${user.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.deleteUser(user);
      },
    });
  }

  /**
   * Elimina un usuario
   */
  deleteUser(user: User) {
    this.loading.set(true);
    const userId = user._id || user.id;
    this.usersApi.delete(userId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario eliminado correctamente',
        });
        this.loadUsers();
        this.loadStats();
      },
      error: (error) => {
        console.error('Error eliminando usuario:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Cambia el estado activo/inactivo de un usuario
   */
  toggleUserStatus(user: User) {
    const newStatus = !user.isActive;
    const statusLabel = newStatus ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres ${statusLabel} al usuario "${user.name}"?`,
      header: 'Confirmar cambio de estado',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `Sí, ${statusLabel}`,
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        const userId = user._id || user.id;

        this.usersApi.update(userId, { isActive: newStatus }).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: `Usuario ${statusLabel} correctamente`,
            });
            this.loadUsers();
            this.loadStats();
          },
          error: (error) => {
            console.error('Error cambiando estado del usuario:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
            this.loading.set(false);
          },
        });
      },
    });
  }

  /**
   * Obtiene el texto del rol para mostrar
   */
  getRoleLabel(role: string): string {
    const roleOption = this.roleOptions.find((option) => option.value === role);
    return roleOption ? roleOption.label : role;
  }

  /**
   * Obtiene la clase CSS para el badge del rol
   */
  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  /**
   * Obtiene la clase CSS para el badge de estado
   */
  getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  /**
   * Valida el formulario de usuario
   */
  private validateForm(userData: UserFormData): string[] {
    const errors: string[] = [];

    // Validar nombre
    if (!userData.name || userData.name.trim() === '') {
      errors.push('El nombre es requerido');
    }

    // Validar email
    if (!userData.email || userData.email.trim() === '') {
      errors.push('El email es requerido');
    } else if (!this.isValidEmail(userData.email)) {
      errors.push('El formato del email no es válido');
    }

    // Validar rol
    if (!userData.role || userData.role.trim() === '') {
      errors.push('El rol es requerido');
    }

    // Validar contraseña solo para nuevos usuarios
    if (!userData._id) {
      if (!userData.password || userData.password.trim() === '') {
        errors.push('La contraseña es requerida para nuevos usuarios');
      } else if (userData.password.length < 6) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
      }
    }

    return errors;
  }

  /**
   * Valida el formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Obtiene el mensaje de error de la API
   */
  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as { error?: { message?: string | string[] }; message?: string };
      if (httpError.error?.message) {
        const message = httpError.error.message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }
        if (typeof message === 'string') {
          if (message.includes('name should not be empty')) {
            return 'El nombre es requerido';
          }
          if (message.includes('email should not be empty')) {
            return 'El email es requerido';
          }
          if (message.includes('email must be an email')) {
            return 'El formato del email no es válido';
          }
          if (message.includes('role should not be empty')) {
            return 'El rol es requerido';
          }
          if (message.includes('password should not be empty')) {
            return 'La contraseña es requerida';
          }
          if (message.includes('password must be longer than or equal to 6 characters')) {
            return 'La contraseña debe tener al menos 6 caracteres';
          }
          if (message.includes('email already exists')) {
            return 'Ya existe un usuario con este email';
          }
          if (message.includes('user not found')) {
            return 'Usuario no encontrado';
          }
          if (message.includes('insufficient permissions')) {
            return 'No tienes permisos para realizar esta acción';
          }
          if (message.includes('cannot delete own account')) {
            return 'No puedes eliminar tu propia cuenta';
          }
          return message;
        }
      }

      if (httpError.error && typeof httpError.error === 'object' && 'error' in httpError.error && typeof httpError.error.error === 'string') {
        return httpError.error.error;
      }
    }

    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }

    return 'Ha ocurrido un error inesperado';
  }

  /**
   * Abre el modal de estadísticas
   */
  openStats() {
    this.showStatsDialog.set(true);
  }

  /**
   * Cierra el modal de estadísticas
   */
  closeStats() {
    this.showStatsDialog.set(false);
  }

  /**
   * Abre el modal de detalles del usuario
   */
  viewDetails(user: User) {
    this.viewingUser.set(user);
    this.showDetailsDialog.set(true);
  }

  /**
   * Cierra el modal de detalles
   */
  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  /**
   * Carga las estadísticas de usuarios
   */
  loadStats() {
    this.usersApi.listWithFilters({}).subscribe({
      next: (response) => {
        const users = response?.users || [];
        const stats: UserStats = {
          total: users.length,
          active: users.filter((user: { isActive?: boolean }) => user.isActive).length,
          inactive: users.filter((user: { isActive?: boolean }) => !user.isActive).length,
          admins: users.filter((user: { role?: string }) => user.role === 'admin').length,
        };
        this.stats.set(stats);
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las estadísticas',
        });
      },
    });
  }

  /**
   * Alterna la expansión de una fila en móvil
   */
  toggleRow(id?: string) {
    if (!id) return;
    const next = new Set(this.expandedRowIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedRowIds.set(next);
  }

  /**
   * Verifica si una fila está expandida
   */
  isRowExpanded(id?: string): boolean {
    if (!id) return false;
    return this.expandedRowIds().has(id);
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePassword(): void {
    this.showPassword.update(value => !value);
  }
}
