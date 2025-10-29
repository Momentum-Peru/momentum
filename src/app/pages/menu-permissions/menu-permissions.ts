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
import { MenuConfigService } from '../../shared/services/menu-config.service';
import {
  MenuPermission,
  MenuPermissionWithUser,
  AssignPermissionsRequest,
  MenuPermissionQuery,
  UserOption,
} from '../../shared/interfaces/menu-permission.interface';

// Interfaz para agrupar permisos por usuario
export interface UserPermissionsGroup {
  user: UserOption;
  permissions: MenuPermissionWithUser[];
  totalPermissions: number;
  activePermissions: number;
  inactivePermissions: number;
}

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
  private readonly menuConfig = inject(MenuConfigService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // Signals para el estado del componente
  items = signal<MenuPermissionWithUser[]>([]);
  filteredItems = signal<MenuPermissionWithUser[]>([]);
  userGroups = signal<UserPermissionsGroup[]>([]);
  filteredUserGroups = signal<UserPermissionsGroup[]>([]);
  users = signal<UserOption[]>([]);
  query = signal('');
  selectedUser = signal<string>('');
  showDialog = signal(false);
  editing = signal<{
    userId: string;
    selectedRoutes: string[];
    isEditing: boolean;
  } | null>(null);
  expandedRows = signal<Set<string>>(new Set());

  // Signal para carga
  loading = signal(false);

  // Exponer Math para usar en el template
  Math = Math;

  // Computed para estadísticas
  totalPermissions = computed(() => this.items().length);
  activePermissions = computed(() => this.items().filter((item) => item.isActive).length);
  inactivePermissions = computed(() => this.items().filter((item) => !item.isActive).length);
  totalUsers = computed(() => this.userGroups().length);

  // Opciones para el formulario
  statusOptions = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];

  // Rutas predefinidas del sistema (extraídas automáticamente del servicio de configuración)
  predefinedRoutes = computed(() => this.menuConfig.getProtectedRoutes());

  ngOnInit() {
    // Cargar usuarios y permisos
    this.loadUsers();
    this.load();
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

    // Re-agrupar cuando cambien los usuarios
    effect(() => {
      const users = this.users();
      if (users.length > 0 && this.items().length > 0) {
        this.groupPermissionsByUser();
      }
    });
  }

  load() {
    this.loading.set(true);

    // Cargar todos los permisos con límite máximo permitido (1000)
    this.menuPermissionsApi.list({ page: 1, limit: 1000 }).subscribe({
      next: (response) => {
        this.items.set(response.data);
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

  groupPermissionsByUser() {
    const permissions = this.items();
    const usersMap = new Map<string, UserPermissionsGroup>();

    // Agrupar permisos por usuario
    permissions.forEach((permission) => {
      const userId =
        typeof permission.userId === 'object' ? permission.userId._id : permission.userId;
      const userInfo =
        typeof permission.userId === 'object'
          ? permission.userId
          : this.users().find((u) => u._id === userId) || {
              _id: userId,
              name: 'Usuario desconocido',
              email: '',
              role: '',
            };

      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          user: userInfo,
          permissions: [],
          totalPermissions: 0,
          activePermissions: 0,
          inactivePermissions: 0,
        });
      }

      const group = usersMap.get(userId)!;
      group.permissions.push(permission);
      group.totalPermissions++;
      if (permission.isActive) {
        group.activePermissions++;
      } else {
        group.inactivePermissions++;
      }
    });

    // Convertir el map a array y actualizar
    this.userGroups.set(Array.from(usersMap.values()));
    this.applyFilters();
  }

  loadUsers() {
    console.log('Loading users...');
    this.usersApi.list().subscribe({
      next: (data) => {
        console.log('Users API response:', data);
        const usersArray = Array.isArray(data) ? data : [];
        console.log('Setting users to:', usersArray);
        this.users.set(usersArray);
      },
      error: (error) => {
        console.error('Error loading users:', error);
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

  applyFilters() {
    let filtered = [...this.userGroups()];

    // Filtro por texto (búsqueda en nombre de usuario)
    const query = this.query().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(
        (group) =>
          group.user.name.toLowerCase().includes(query) ||
          group.user.email.toLowerCase().includes(query)
      );
    }

    // Filtro por usuario
    const selectedUser = this.selectedUser();
    if (selectedUser) {
      filtered = filtered.filter((group) => group.user._id === selectedUser);
    }

    this.filteredUserGroups.set(filtered);
  }

  newItem() {
    this.editing.set({
      userId: '',
      selectedRoutes: [],
      isEditing: false,
    });
    this.showDialog.set(true);
  }

  editUserPermissions(group: UserPermissionsGroup) {
    const userPermissions = group.permissions.filter((p) => p.isActive);
    const routes = userPermissions.map((p) => p.route);

    this.editing.set({
      userId: group.user._id,
      selectedRoutes: routes,
      isEditing: true,
    });
    this.showDialog.set(true);
  }

  toggleRow(userId: string) {
    const expanded = this.expandedRows();
    if (expanded.has(userId)) {
      expanded.delete(userId);
    } else {
      expanded.add(userId);
    }
    this.expandedRows.set(new Set(expanded));
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  onEditChange(field: string, value: any) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  toggleRoute(route: string) {
    const current = this.editing();
    if (!current) return;

    const selectedRoutes = current.selectedRoutes;
    const index = selectedRoutes.indexOf(route);

    if (index === -1) {
      selectedRoutes.push(route);
    } else {
      selectedRoutes.splice(index, 1);
    }

    this.editing.set({ ...current, selectedRoutes: [...selectedRoutes] });
  }

  isRouteSelected(route: string): boolean {
    const current = this.editing();
    if (!current) return false;
    return current.selectedRoutes.includes(route);
  }

  selectAllRoutes() {
    const current = this.editing();
    if (!current) return;

    const allRoutes = [...this.predefinedRoutes()];
    this.editing.set({
      ...current,
      selectedRoutes: allRoutes,
    });
  }

  deselectAllRoutes() {
    const current = this.editing();
    if (!current) return;

    this.editing.set({
      ...current,
      selectedRoutes: [],
    });
  }

  save() {
    const item = this.editing();
    if (!item) return;

    if (!item.userId || item.userId.trim() === '') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: 'El usuario es requerido',
      });
      return;
    }

    if (!item.selectedRoutes || item.selectedRoutes.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: 'Debes seleccionar al menos una ruta',
      });
      return;
    }

    const payload: AssignPermissionsRequest = {
      userId: item.userId,
      permissions: item.selectedRoutes.map((route) => ({
        route: route,
        isActive: true,
      })),
    };

    this.menuPermissionsApi.assignPermissions(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Permisos asignados correctamente',
        });
        this.load();
        this.menuService.refreshPermissions();
        this.closeDialog();
      },
      error: (error) => {
        console.error('Error assigning permissions:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }

  removeUserPermissions(group: UserPermissionsGroup) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar todos los permisos de ${group.user.name}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.menuPermissionsApi.deleteByUserId(group.user._id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Permisos eliminados correctamente',
            });
            this.load();
            this.menuService.refreshPermissions();
          },
          error: (error) => {
            console.error('Error deleting user permissions:', error);
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

  removeSinglePermission(permission: MenuPermissionWithUser) {
    if (!permission._id) return;

    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este permiso?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.menuPermissionsApi.delete(permission._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Permiso eliminado correctamente',
            });
            this.load();
            this.menuService.refreshPermissions();
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

  isExpanded(userId: string): boolean {
    return this.expandedRows().has(userId);
  }

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
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      const message = error.error.message;

      if (Array.isArray(message)) {
        return message.join(', ');
      }

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
