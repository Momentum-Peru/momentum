import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MenuPermissionsApiService } from '../../shared/services/menu-permissions-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { MenuService } from '../../shared/services/menu.service';
import {
  MenuPermission,
  MenuPermissionWithUser,
  AssignPermissionsRequest,
  MenuPermissionQuery,
  UserOption,
} from '../../shared/interfaces/menu-permission.interface';

@Component({
  selector: 'app-menu-permissions',
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    CheckboxModule,
    InputNumberModule,
    TextareaModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './menu-permissions.html',
  styleUrl: './menu-permissions.scss',
  providers: [ConfirmationService],
})
export class MenuPermissionsPage implements OnInit {
  private readonly menuPermissionsApi = inject(MenuPermissionsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly menuService = inject(MenuService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // Signals para el estado del componente
  items = signal<MenuPermissionWithUser[]>([]);
  filteredItems = signal<MenuPermissionWithUser[]>([]);
  users = signal<UserOption[]>([]);
  query = signal('');
  selectedUser = signal<string>('');
  showDialog = signal(false);
  editing = signal<MenuPermission | null>(null);

  // Signals para paginación
  currentPage = signal(1);
  pageSize = signal(50);
  totalItems = signal(0);
  totalPages = signal(0);
  loading = signal(false);

  // Exponer Math para usar en el template
  Math = Math;

  // Computed para estadísticas
  totalPermissions = computed(() => this.items().length);
  activePermissions = computed(() => this.items().filter((item) => item.isActive).length);
  inactivePermissions = computed(() => this.items().filter((item) => !item.isActive).length);

  // Opciones para el formulario
  statusOptions = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];

  // Rutas predefinidas del sistema (solo las rutas, sin nombres ni iconos)
  predefinedRoutes = [
    '/dashboard',
    '/projects',
    '/clients',
    '/quotes',
    '/orders',
    '/requirements',
    '/tasks',
    '/tdrs',
    '/users',
    '/daily-reports',
    '/menu-permissions',
    '/admin/settings',
  ];

  ngOnInit() {
    this.load();
    this.loadUsers();
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
      }
    });

    // Efecto para aplicar filtros cuando cambian los datos
    effect(() => {
      this.applyFilters();
    });
  }

  load(page: number = 1) {
    this.loading.set(true);

    const query: MenuPermissionQuery = {
      page,
      limit: this.pageSize(),
    };

    this.menuPermissionsApi.list(query).subscribe({
      next: (response) => {
        this.items.set(response.data);
        this.totalItems.set(response.pagination.total);
        this.totalPages.set(response.pagination.pages);
        this.currentPage.set(page);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading menu permissions:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los permisos de menú',
        });
        this.loading.set(false);
      },
    });
  }

  loadUsers() {
    console.log('Loading users...');
    this.usersApi.list().subscribe({
      next: (data) => {
        console.log('Users API response:', data);
        // Asegurar que siempre sea un array
        const usersArray = Array.isArray(data) ? data : [];
        console.log('Setting users to:', usersArray);
        this.users.set(usersArray);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        // En caso de error, inicializar con array vacío
        this.users.set([]);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los usuarios',
        });
      },
    });
  }

  setQuery(value: string) {
    this.query.set(value);
  }

  setSelectedUser(userId: string) {
    this.selectedUser.set(userId);
  }

  // Métodos para paginación
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.load(page);
    }
  }

  nextPage() {
    const nextPage = this.currentPage() + 1;
    if (nextPage <= this.totalPages()) {
      this.goToPage(nextPage);
    }
  }

  previousPage() {
    const prevPage = this.currentPage() - 1;
    if (prevPage >= 1) {
      this.goToPage(prevPage);
    }
  }

  setPageSize(size: string | number) {
    this.pageSize.set(Number(size));
    this.load(1); // Recargar desde la primera página
  }

  applyFilters() {
    let filtered = [...this.items()];

    // Filtro por texto (búsqueda en ruta y nombre de usuario)
    const query = this.query().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(
        (item) =>
          item.route.toLowerCase().includes(query) ||
          (typeof item.userId === 'object' && item.userId.name.toLowerCase().includes(query))
      );
    }

    // Filtro por usuario
    const selectedUser = this.selectedUser();
    if (selectedUser) {
      filtered = filtered.filter((item) => {
        if (typeof item.userId === 'object') {
          return item.userId._id === selectedUser;
        }
        return item.userId === selectedUser;
      });
    }

    this.filteredItems.set(filtered);
  }

  newItem() {
    this.editing.set({
      userId: '',
      route: '',
      isActive: true,
    });
    this.showDialog.set(true);
  }

  editItem(item: MenuPermissionWithUser) {
    const editedItem: MenuPermission = {
      _id: item._id,
      userId: typeof item.userId === 'object' ? item.userId._id : item.userId,
      route: item.route,
      isActive: item.isActive,
    };

    this.editing.set(editedItem);
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  onEditChange(field: keyof MenuPermission, value: any) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  save() {
    const item = this.editing();
    if (!item) return;

    // Validar campos requeridos
    const validationErrors = this.validateForm(item);
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

    const payload = {
      userId: item.userId.trim(),
      route: item.route.trim(),
      isActive: item.isActive,
    };

    if (item._id) {
      this.menuPermissionsApi.update(item._id, payload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Permiso actualizado correctamente',
          });
          this.load();
          this.menuService.refreshPermissions(); // Actualizar el menú
          this.closeDialog();
        },
        error: (error) => {
          console.error('Error updating permission:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    } else {
      this.menuPermissionsApi.create(payload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Permiso creado correctamente',
          });
          this.load();
          this.menuService.refreshPermissions(); // Actualizar el menú
          this.closeDialog();
        },
        error: (error) => {
          console.error('Error creating permission:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }

  remove(item: MenuPermissionWithUser) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este permiso?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.menuPermissionsApi.delete(item._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Permiso eliminado correctamente',
            });
            this.load();
            this.menuService.refreshPermissions(); // Actualizar el menú
          },
          error: (error) => {
            console.error('Error deleting permission:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
          },
        });
      },
    });
  }

  // Métodos de utilidad
  getUserName(item: MenuPermissionWithUser): string {
    if (typeof item.userId === 'object') {
      return item.userId.name;
    }
    const user = this.users().find(
      (u) => u._id === (typeof item.userId === 'string' ? item.userId : item.userId._id)
    );
    return user?.name || 'Usuario no encontrado';
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  // Validaciones
  private validateForm(item: MenuPermission): string[] {
    const errors: string[] = [];

    if (!item.userId || item.userId.trim() === '') {
      errors.push('El usuario es requerido');
    }

    if (!item.route || item.route.trim() === '') {
      errors.push('La ruta es requerida');
    }

    return errors;
  }

  private validatePermissions(
    permissions: Omit<MenuPermission, '_id' | 'userId' | 'createdAt' | 'updatedAt'>[]
  ): string[] {
    const errors: string[] = [];

    permissions.forEach((permission, index) => {
      if (!permission.route || permission.route.trim() === '') {
        errors.push(`La ruta del permiso ${index + 1} es requerida`);
      }
    });

    return errors;
  }

  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      const message = error.error.message;

      if (Array.isArray(message)) {
        return message.join(', ');
      }

      // Traducir mensajes comunes de validación
      if (message.includes('userId should not be empty')) {
        return 'El usuario es requerido';
      }
      if (message.includes('route should not be empty')) {
        return 'La ruta es requerida';
      }
      if (message.includes('userId must be a valid ObjectId')) {
        return 'El usuario seleccionado no es válido';
      }
      if (message.includes('Ya existe un permiso para este usuario y ruta')) {
        return 'Ya existe un permiso para este usuario y ruta';
      }

      return message;
    }

    if (error.error?.error) {
      return error.error.error;
    }

    if (error.message) {
      return error.message;
    }

    return 'Ha ocurrido un error inesperado';
  }
}
