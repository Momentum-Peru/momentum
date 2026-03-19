import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { MultiSelectModule } from 'primeng/multiselect';
import { AreasApiService } from '../../shared/services/areas-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { Area, CreateAreaRequest, UpdateAreaRequest } from '../../shared/interfaces/area.interface';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    ToggleButtonModule,
    SelectModule,
    TextareaModule,
    MultiSelectModule,
  ],
  templateUrl: './areas.html',
  styleUrl: './areas.scss',
  providers: [MessageService, ConfirmationService],
})
export class AreasPage implements OnInit {
  private readonly areasApi = inject(AreasApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  items = signal<Area[]>([]);
  query = signal('');
  filterActive = signal<boolean | null>(null);
  showDialog = signal(false);
  showViewDialog = signal(false);
  editing = signal<Area | null>(null);
  viewing = signal<Area | null>(null);
  loading = signal(false);

  // Estado para gestión de usuarios
  showUsersDialog = signal(false);
  areaForUsers = signal<Area | null>(null);
  allUsers = signal<UserOption[]>([]);
  selectedUserIds = signal<string[]>([]);
  loadingUsers = signal(false);

  // Opciones para el filtro de estado
  filterActiveOptions = [
    { label: 'Todas', value: null },
    { label: 'Activas', value: true },
    { label: 'Inactivas', value: false },
  ];

  // Estado de expansión para vista móvil
  private expandedRowKeys = signal<Set<string>>(new Set());

  // Filtrado simple por texto y estado
  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const isActiveFilter = this.filterActive();
    let list = this.items()
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate; // DESC
      });

    // Filtrar por estado activo
    if (isActiveFilter !== null) {
      list = list.filter((item) => item.isActive === isActiveFilter);
    }

    // Filtrar por búsqueda de texto
    if (!searchQuery) return list;
    return list.filter((item) => {
      const nombreMatch = item.nombre?.toLowerCase().includes(searchQuery) ?? false;
      const codigoMatch = item.codigo?.toLowerCase().includes(searchQuery) ?? false;
      const descripcionMatch = item.descripcion?.toLowerCase().includes(searchQuery) ?? false;
      return nombreMatch || codigoMatch || descripcionMatch;
    });
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const params: {
      q?: string;
      isActive?: boolean;
    } = {};
    if (this.query()) params.q = this.query();
    const active = this.filterActive();
    if (active !== null) params.isActive = active;

    this.areasApi.list(params).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toastError('Error al cargar áreas');
        this.loading.set(false);
      },
    });
  }

  // Helpers de accordion móvil
  buildRowKey(item: Area, index: number): string {
    return item._id ? String(item._id) : `${item.nombre}#${index}`;
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

  setFilterActive(value: boolean | null) {
    this.filterActive.set(value);
    this.load();
  }

  newItem() {
    this.editing.set({
      nombre: '',
      codigo: '',
      descripcion: '',
      isActive: true,
    });
    this.showDialog.set(true);
  }

  editItem(item: Area) {
    this.editing.set({ ...item });
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editing.set(null);
  }

  viewItem(item: Area) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  onEditChange(field: keyof Area, value: Area[keyof Area]) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  toggleActive(item: Area, event: Event) {
    event.stopPropagation();
    if (!item._id) return;

    const newStatus = !item.isActive;
    const action = newStatus ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea ${action} el área "${item.nombre}"?`,
      header: `Confirmar ${action === 'activar' ? 'Activación' : 'Desactivación'}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `Sí, ${action}`,
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        this.areasApi.toggleActive(item._id!, newStatus).subscribe({
          next: () => {
            this.toastSuccess(
              `Área ${action === 'activar' ? 'activada' : 'desactivada'} exitosamente`
            );
            this.load();
          },
          error: (err) => {
            const message = err.error?.message || `Error al ${action} el área`;
            this.toastError(message);
            this.loading.set(false);
          },
        });
      },
    });
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
      const updateData: UpdateAreaRequest = {
        nombre: item.nombre,
        codigo: item.codigo ?? '',
        descripcion: item.descripcion ?? '',
        isActive: item.isActive,
      };

      this.areasApi.update(item._id, updateData).subscribe({
        next: () => {
          this.toastSuccess('Área actualizada exitosamente');
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al actualizar el área';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    } else {
      // Crear
      const createData: CreateAreaRequest = {
        nombre: item.nombre,
        codigo: item.codigo || undefined,
        descripcion: item.descripcion || undefined,
        isActive: item.isActive ?? true,
      };

      this.areasApi.create(createData).subscribe({
        next: () => {
          this.toastSuccess('Área creada exitosamente');
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al crear el área';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    }
  }

  remove(item: Area) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el área "${item.nombre}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        this.areasApi.delete(item._id!).subscribe({
          next: () => {
            this.toastSuccess('Área eliminada exitosamente');
            this.load();
          },
          error: (err) => {
            const message = err.error?.message || 'Error al eliminar el área';
            this.toastError(message);
            this.loading.set(false);
          },
        });
      },
    });
  }

  validateForm(item: Area): string[] {
    const errors: string[] = [];

    if (!item.nombre || item.nombre.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (item.nombre && item.nombre.length > 100) {
      errors.push('El nombre no puede exceder 100 caracteres');
    }

    if (item.codigo && item.codigo.length > 20) {
      errors.push('El código no puede exceder 20 caracteres');
    }

    if (item.descripcion && item.descripcion.length > 500) {
      errors.push('La descripción no puede exceder 500 caracteres');
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

  // --- Gestión de Usuarios ---

  openUsersModal(area: Area) {
    this.areaForUsers.set(area);
    this.showUsersDialog.set(true);
    this.loadAllUsers();
    this.loadAssignedUsers(area._id!);
  }

  loadAllUsers() {
    if (this.allUsers().length > 0) return;
    this.loadingUsers.set(true);
    this.usersApi.listAll().subscribe({
      next: (users) => {
        this.allUsers.set(users);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.toastError('Error al cargar la lista de usuarios');
        this.loadingUsers.set(false);
      },
    });
  }

  loadAssignedUsers(areaId: string) {
    this.loadingUsers.set(true);
    this.areasApi.getAssignedUsers(areaId).subscribe({
      next: (users) => {
        const ids = users.map((u: any) => u._id || u.id);
        this.selectedUserIds.set(ids);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.toastError('Error al cargar usuarios asignados');
        this.loadingUsers.set(false);
      },
    });
  }

  saveUserAssignments() {
    const area = this.areaForUsers();
    if (!area?._id) return;

    this.loadingUsers.set(true);
    this.areasApi
      .assignUsers(area._id, { userIds: this.selectedUserIds() })
      .subscribe({
        next: () => {
          this.toastSuccess('Usuarios asignados correctamente');
          this.showUsersDialog.set(false);
          this.loadingUsers.set(false);
        },
        error: (err) => {
          const msg = err.error?.message || 'Error al asignar usuarios';
          this.toastError(msg);
          this.loadingUsers.set(false);
        },
      });
  }
}
