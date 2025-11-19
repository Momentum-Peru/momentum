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
import { UsersApiService, User } from '../../shared/services/users-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { MenuConfigService } from '../../shared/services/menu-config.service';
import { TenantService } from '../../core/services/tenant.service';
import { AuthService } from '../../pages/login/services/auth.service';
import {
  MenuPermissionWithUser,
  AssignPermissionsRequest,
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
  private readonly tenantService = inject(TenantService);
  private readonly authService = inject(AuthService);

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
      // Validar que userId no sea null o undefined
      if (!permission.userId) {
        console.warn('Permission with null/undefined userId found:', permission);
        return; // Saltar este permiso si no tiene userId válido
      }

      // Determinar userId y userInfo de forma segura
      const userId =
        typeof permission.userId === 'object' && permission.userId !== null
          ? permission.userId._id
          : permission.userId;

      // Validar que userId sea válido
      if (!userId) {
        console.warn('Permission with invalid userId found:', permission);
        return; // Saltar este permiso si userId no es válido
      }

      const userInfo =
        typeof permission.userId === 'object' && permission.userId !== null
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
    const currentTenantId = this.tenantService.tenantId();
    const isGerencia = this.authService.isGerencia();
    console.log('Loading users for tenant:', currentTenantId, 'isGerencia:', isGerencia);

    // Obtener usuarios completos con tenantIds para filtrar
    this.usersApi.listWithFilters({}).subscribe({
      next: (response) => {
        const allUsers = response.data ?? response.users ?? [];
        console.log('Users API response:', allUsers);

        const toUserOption = (user: User): UserOption => ({
          _id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        });

        // Para gerencia: mostrar todos los usuarios sin filtrar por tenant
        // Para otros roles: filtrar por tenant seleccionado
        if (isGerencia) {
          console.log('Gerencia: showing all users');
          const userOptions = allUsers.map(toUserOption);
          this.users.set(userOptions);
        } else if (currentTenantId) {
          const filteredUsers = allUsers.filter((user) => {
            const tenantIds = user.tenantIds ?? [];
            if (tenantIds.length === 0) {
              return true;
            }
            return tenantIds.includes(currentTenantId);
          });

          const userOptions = filteredUsers.map(toUserOption);

          console.log('Filtered users for tenant:', userOptions);
          this.users.set(userOptions);
        } else {
          console.log('No tenant selected, showing all users');
          const userOptions = allUsers.map(toUserOption);
          this.users.set(userOptions);
        }
      },
      error: (error: unknown) => {
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

  onEditChange(field: string, value: string | boolean) {
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

    const tenantId = this.tenantService.tenantId();
    if (!tenantId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Tenant no seleccionado',
        detail: 'Debes seleccionar una empresa antes de asignar permisos',
      });
      return;
    }

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
    if (!item.userId) {
      return 'Usuario no encontrado';
    }

    // Si userId es un objeto User, usar su nombre directamente
    if (typeof item.userId === 'object' && item.userId !== null) {
      return item.userId.name || 'Usuario no encontrado';
    }

    // Si userId es un string, buscar el usuario en la lista
    if (typeof item.userId === 'string') {
      const user = this.users().find((u) => u._id === item.userId);
      return user?.name || 'Usuario no encontrado';
    }

    return 'Usuario no encontrado';
  }

  getStatusClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  /**
   * Obtiene el label en español de una ruta usando MenuConfigService
   */
  getRouteLabel(route: string): string {
    const config = this.menuConfig.getRouteConfig(route);
    return config?.label || route;
  }

  /**
   * Obtiene el icono de una ruta usando MenuConfigService
   */
  getRouteIcon(route: string): string {
    const config = this.menuConfig.getRouteConfig(route);
    return config?.icon || 'pi pi-circle';
  }

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as { error?: { message?: string | string[] }; message?: string };
      if (httpError.error?.message) {
        const message = httpError.error.message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }
        if (typeof message === 'string') {
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
}
