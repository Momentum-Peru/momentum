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
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  UsersApiService,
  UserCreateRequest,
  UserUpdateRequest,
} from '../../shared/services/users-api.service';
import { User } from '../../pages/login/services/auth.service';

interface UserFormData {
  _id?: string;
  email: string;
  name: string;
  role: 'user' | 'moderator' | 'admin';
  password?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
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
  statusFilter = signal<string>('');
  showDialog = signal<boolean>(false);
  editing = signal<UserFormData | null>(null);
  loading = signal<boolean>(false);

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
  ];

  statusOptions = [
    { label: 'Todos', value: '' },
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
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
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
    const filters: { q?: string; role?: string; isActive?: boolean } = {};

    const query = this.query().trim();
    if (query) {
      filters.q = query;
    }

    const role = this.roleFilter();
    if (role) {
      filters.role = role;
    }

    const status = this.statusFilter();
    if (status) {
      filters.isActive = status === 'true';
    }

    // Debug: mostrar filtros aplicados
    console.log('Filtros aplicados:', filters);
    console.log('Query actual:', this.query());
    console.log('Role filter actual:', this.roleFilter());
    console.log('Status filter actual:', this.statusFilter());

    this.usersApi.listWithFilters(filters).subscribe({
      next: (response) => {
        console.log('Respuesta recibida:', response);

        // Filtrado del lado del cliente como fallback
        let filteredUsers = response?.users || [];

        // Aplicar filtro de estado si la API no lo procesó correctamente
        if (filters.isActive !== undefined) {
          filteredUsers = filteredUsers.filter((user: any) => user.isActive === filters.isActive);
          console.log('Usuarios filtrados por estado:', filteredUsers);
        }

        // Aplicar filtro de rol si la API no lo procesó correctamente
        if (filters.role) {
          filteredUsers = filteredUsers.filter((user: any) => user.role === filters.role);
          console.log('Usuarios filtrados por rol:', filteredUsers);
        }

        // Aplicar filtro de búsqueda si la API no lo procesó correctamente
        if (filters.q) {
          const query = filters.q.toLowerCase();
          filteredUsers = filteredUsers.filter(
            (user: any) =>
              user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
          );
          console.log('Usuarios filtrados por búsqueda:', filteredUsers);
        }

        this._users.set(Array.isArray(filteredUsers) ? filteredUsers : []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando usuarios:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los usuarios',
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
    this.statusFilter.set('');
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
   * NOTA: Funcionalidad deshabilitada - backend no implementado
   */
  editUser(user: User) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Funcionalidad no disponible',
      detail: 'La edición de usuarios no está implementada en el backend',
    });
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
        },
        error: (error) => {
          console.error('Error actualizando usuario:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el usuario',
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
        },
        error: (error) => {
          console.error('Error creando usuario:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el usuario',
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
    this.usersApi.delete(user.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario eliminado correctamente',
        });
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error eliminando usuario:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el usuario',
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Cambia el estado activo/inactivo de un usuario
   * NOTA: Funcionalidad deshabilitada - backend no implementado
   */
  toggleUserStatus(user: User) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Funcionalidad no disponible',
      detail: 'El cambio de estado de usuarios no está implementado en el backend',
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
        return 'bg-red-100 text-red-800';
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Obtiene la clase CSS para el badge de estado
   */
  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  }
}
