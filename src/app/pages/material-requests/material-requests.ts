import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { TimelineModule } from 'primeng/timeline';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService, ConfirmationService } from 'primeng/api';
import { MaterialRequestsApiService } from '../../shared/services/material-requests-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { AuthService } from '../login/services/auth.service';
import {
  MaterialRequest,
  CreateMaterialRequestRequest,
  UpdateMaterialRequestRequest,
  AddUpdateRequest,
  MaterialRequestStatsResponse,
  MaterialRequestQueryParams,
  MaterialRequestItem,
  MaterialRequestUpdate,
} from '../../shared/interfaces/material-request.interface';
import { ProjectOption } from '../../shared/interfaces/project.interface';

/**
 * Componente de Gestión de Solicitudes de Compra de Materiales y Herramientas
 * Implementa principios SOLID:
 * - Single Responsibility: Solo gestiona la interfaz de usuario para solicitudes de materiales
 * - Open/Closed: Extensible sin modificar código existente
 * - Dependency Inversion: Depende de abstracciones (servicios inyectados)
 */
@Component({
  selector: 'app-material-requests',
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
    TextareaModule,
    CardModule,
    TagModule,
    SelectModule,
    TimelineModule,
    DatePickerModule,
    InputNumberModule,
  ],
  templateUrl: './material-requests.html',
  styleUrl: './material-requests.scss',
  providers: [MessageService, ConfirmationService],
})
export class MaterialRequestsPage implements OnInit {
  // Inyección de dependencias siguiendo Dependency Inversion Principle
  private readonly materialRequestsApi = inject(MaterialRequestsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly usersApi = inject(UsersApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly authService = inject(AuthService);

  // Verificar permisos de edición
  readonly canEdit = computed(() => this.menuService.canEdit('/material-requests'));

  // Signals para gestión reactiva de estado
  items = signal<MaterialRequest[]>([]);
  stats = signal<MaterialRequestStatsResponse | null>(null);
  query = signal('');
  statusFilter = signal<'pendiente' | 'aprobado' | 'rechazado' | 'en_compra' | 'completado' | null>(
    null
  );
  priorityFilter = signal<'baja' | 'media' | 'alta' | 'urgente' | null>(null);
  requestedByFilter = signal<string | null>(null);
  projectFilter = signal<string | null>(null);
  showDialog = signal(false);
  showViewDialog = signal(false);
  showStatsDialog = signal(false);
  showUpdateDialog = signal(false);
  showApproveDialog = signal(false);
  showRejectDialog = signal(false);
  editing = signal<MaterialRequest | null>(null);
  viewing = signal<MaterialRequest | null>(null);
  currentRequestForUpdate = signal<string | null>(null);
  currentRequestForApprove = signal<string | null>(null);
  currentRequestForReject = signal<string | null>(null);
  loading = signal(false);
  loadingStats = signal(false);

  // Usuarios y proyectos disponibles para selección
  availableUsers = signal<{ label: string; value: string }[]>([]);
  availableProjects = signal<ProjectOption[]>([]);
  loadingUsers = signal(false);
  loadingProjects = signal(false);

  // Estado de expansión para vista móvil
  private expandedRowKeys = signal<Set<string>>(new Set());

  // Estado para subida de archivos
  selectedFiles = signal<File[]>([]);
  selectedUpdateFiles = signal<File[]>([]);
  filePreviews = signal<Map<string, string>>(new Map());
  updateFilePreviews = signal<Map<string, string>>(new Map());
  isDragging = signal(false);
  isDraggingUpdate = signal(false);
  uploading = signal(false);
  uploadProgress = signal<Record<string, number>>({});

  // Estado para modal de previsualización
  showPreviewModal = signal(false);
  previewModalUrl = signal<string>('');
  previewModalType = signal<'image' | 'video' | 'audio' | 'document'>('document');

  // Formulario de actualización
  updateMessage = signal('');
  updateUpdatedBy = signal<string>('');

  // Formulario de rechazo
  rejectionReason = signal('');

  // Gestión de items en el formulario
  editingItems = signal<MaterialRequestItem[]>([]);
  editingItemIndex = signal<number | null>(null);
  showItemDialog = signal(false);
  editingItem = signal<Partial<MaterialRequestItem> | null>(null);

  units = [
    { label: 'Tonelada', value: 'tonelada' },
    { label: 'Kilo', value: 'kilo' },
    { label: 'Bolsa', value: 'bolsa' },
    { label: 'm³', value: 'm³' },
    { label: 'Unidad', value: 'unidad' },
    { label: 'Metro', value: 'metro' },
    { label: 'Litro', value: 'litro' },
    { label: 'Galón', value: 'galon' },
  ];

  priorities = [
    { label: 'Baja', value: 'baja' },
    { label: 'Media', value: 'media' },
    { label: 'Alta', value: 'alta' },
    { label: 'Urgente', value: 'urgente' },
  ];

  statuses = [
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Aprobado', value: 'aprobado' },
    { label: 'Rechazado', value: 'rechazado' },
    { label: 'En Compra', value: 'en_compra' },
    { label: 'Completado', value: 'completado' },
  ];

  // Filtrado y ordenamiento
  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const list = this.items().slice();

    // Ordenar por fecha de creación descendente
    list.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate; // DESC
    });

    if (!searchQuery) return list;

    return list.filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(searchQuery) ?? false;
      const updatesMatch =
        item.updates?.some((update) => update.message?.toLowerCase().includes(searchQuery)) ??
        false;
      return titleMatch || updatesMatch;
    });
  });

  // Opciones de usuarios para el filtro (incluye "Todos")
  requestedByOptions = computed(() => {
    return [{ label: 'Todos', value: null }, ...this.availableUsers()];
  });

  // Opciones de proyectos para el filtro (incluye "Todos")
  projectOptions = computed(() => {
    return [{ label: 'Todos', value: null }, ...this.availableProjects()];
  });

  ngOnInit() {
    this.load();
    this.loadUsers();
    this.loadProjects();
    // Obtener usuario actual para actualizaciones
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.updateUpdatedBy.set(currentUser.id);
    }
  }

  /**
   * Carga la lista de usuarios disponibles
   */
  loadUsers() {
    this.loadingUsers.set(true);
    this.usersApi.list().subscribe({
      next: (users) => {
        this.availableUsers.set(
          users.map((user) => ({
            label: user.name,
            value: user._id,
          }))
        );
        this.loadingUsers.set(false);
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.loadingUsers.set(false);
      },
    });
  }

  /**
   * Carga la lista de proyectos disponibles
   */
  loadProjects() {
    this.loadingProjects.set(true);
    this.projectsApi.getOptions().subscribe({
      next: (projects) => {
        this.availableProjects.set(projects);
        this.loadingProjects.set(false);
      },
      error: (err) => {
        console.error('Error al cargar proyectos:', err);
        this.loadingProjects.set(false);
      },
    });
  }

  /**
   * Carga la lista de solicitudes desde el servidor
   */
  load() {
    this.loading.set(true);

    const params: MaterialRequestQueryParams = {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    if (this.query()) params.q = this.query();
    if (this.statusFilter()) params.status = this.statusFilter()!;
    if (this.priorityFilter()) params.priority = this.priorityFilter()!;
    if (this.requestedByFilter()) params.requestedBy = this.requestedByFilter()!;
    if (this.projectFilter()) params.projectId = this.projectFilter()!;

    this.materialRequestsApi.list(params).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toastError('Error al cargar solicitudes');
        console.error(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Carga las estadísticas de solicitudes
   */
  loadStats() {
    this.loadingStats.set(true);
    this.showStatsDialog.set(true);

    this.materialRequestsApi.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loadingStats.set(false);
      },
      error: (err) => {
        this.toastError('Error al cargar estadísticas');
        console.error(err);
        this.loadingStats.set(false);
      },
    });
  }

  /**
   * Helpers para gestión de expansión en vista móvil
   */
  buildRowKey(item: MaterialRequest, index: number): string {
    return item._id ? String(item._id) : `${item.title}#${index}`;
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

  /**
   * Establece el término de búsqueda y recarga la lista
   */
  setQuery(value: string) {
    this.query.set(value);
    this.load();
  }

  /**
   * Aplica filtros y recarga
   */
  applyFilters() {
    this.load();
  }

  /**
   * Limpia los filtros
   */
  clearFilters() {
    this.query.set('');
    this.statusFilter.set(null);
    this.priorityFilter.set(null);
    this.requestedByFilter.set(null);
    this.projectFilter.set(null);
    this.load();
  }

  /**
   * Abre el diálogo para crear una nueva solicitud
   */
  newItem() {
    const currentUser = this.authService.getCurrentUser();
    this.editing.set({
      requestedBy: currentUser?.id || '',
      title: '',
      items: [],
      status: 'pendiente',
      priority: 'media',
      attachments: [],
    });
    this.editingItems.set([]);
    this.showDialog.set(true);
    this.clearSelectedFiles();
  }

  /**
   * Abre el diálogo para editar una solicitud existente
   */
  editItem(item: MaterialRequest) {
    const editedItem = { ...item };
    // Convertir requestedBy a ID si viene populado
    if (typeof editedItem.requestedBy === 'object') {
      editedItem.requestedBy = editedItem.requestedBy._id;
    }
    // Convertir projectId a ID si viene populado
    if (editedItem.projectId && typeof editedItem.projectId === 'object') {
      editedItem.projectId = editedItem.projectId._id;
    }
    this.editing.set(editedItem);
    this.editingItems.set([...item.items]);
    this.showDialog.set(true);
  }

  /**
   * Cierra el diálogo de creación/edición
   */
  closeDialog() {
    this.showDialog.set(false);
    this.editing.set(null);
    this.editingItems.set([]);
    this.clearSelectedFiles();
    this.closePreviewModal();
  }

  /**
   * Abre el diálogo de visualización de detalles
   */
  viewItem(item: MaterialRequest) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  /**
   * Cierra el diálogo de visualización
   */
  closeViewDialog() {
    this.showViewDialog.set(false);
    this.viewing.set(null);
  }

  /**
   * Cierra el diálogo de estadísticas
   */
  closeStatsDialog() {
    this.showStatsDialog.set(false);
    this.stats.set(null);
  }

  /**
   * Abre el diálogo para agregar una actualización
   */
  openUpdateDialog(requestId: string) {
    this.currentRequestForUpdate.set(requestId);
    this.updateMessage.set('');
    this.updateUpdatedBy.set(this.authService.getCurrentUser()?.id || '');
    this.clearSelectedUpdateFiles();
    this.showUpdateDialog.set(true);
  }

  /**
   * Cierra el diálogo de actualización
   */
  closeUpdateDialog() {
    this.showUpdateDialog.set(false);
    this.currentRequestForUpdate.set(null);
    this.updateMessage.set('');
    this.clearSelectedUpdateFiles();
  }

  /**
   * Abre el diálogo para aprobar una solicitud
   */
  openApproveDialog(requestId: string) {
    this.currentRequestForApprove.set(requestId);
    this.showApproveDialog.set(true);
  }

  /**
   * Cierra el diálogo de aprobación
   */
  closeApproveDialog() {
    this.showApproveDialog.set(false);
    this.currentRequestForApprove.set(null);
  }

  /**
   * Abre el diálogo para rechazar una solicitud
   */
  openRejectDialog(requestId: string) {
    this.currentRequestForReject.set(requestId);
    this.rejectionReason.set('');
    this.showRejectDialog.set(true);
  }

  /**
   * Cierra el diálogo de rechazo
   */
  closeRejectDialog() {
    this.showRejectDialog.set(false);
    this.currentRequestForReject.set(null);
    this.rejectionReason.set('');
  }

  /**
   * Actualiza un campo del item en edición
   */
  onEditChange(field: keyof MaterialRequest, value: unknown) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  /**
   * Guarda la solicitud (crear o actualizar)
   */
  save() {
    const item = this.editing();
    if (!item) return;

    const errors = this.validateForm(item);
    if (errors.length) {
      errors.forEach((e) => this.toastError(e));
      return;
    }

    if (this.editingItems().length === 0) {
      this.toastError('Debe agregar al menos un item a la solicitud');
      return;
    }

    this.loading.set(true);

    if (item._id) {
      // Actualizar
      const updateData: UpdateMaterialRequestRequest = {
        title: item.title.trim(),
        items: this.editingItems(),
        priority: item.priority,
        status: item.status,
        projectId: typeof item.projectId === 'string' ? item.projectId : undefined,
      };

      this.materialRequestsApi.update(item._id, updateData).subscribe({
        next: () => {
          this.toastSuccess('Solicitud actualizada exitosamente');
          this.loading.set(false);
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al actualizar la solicitud';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    } else {
      // Crear
      const createData: CreateMaterialRequestRequest = {
        requestedBy: typeof item.requestedBy === 'string' ? item.requestedBy : item.requestedBy._id,
        title: item.title.trim(),
        items: this.editingItems(),
        priority: item.priority,
        projectId: typeof item.projectId === 'string' ? item.projectId : undefined,
      };

      this.materialRequestsApi.create(createData).subscribe({
        next: (createdRequest) => {
          this.toastSuccess('Solicitud creada exitosamente');

          // Si hay archivos seleccionados, subirlos después de crear la solicitud
          const files = this.selectedFiles();
          if (files.length > 0 && createdRequest._id) {
            this.uploadFilesAfterCreate(createdRequest._id, files);
          } else {
            this.loading.set(false);
            this.closeDialog();
            this.load();
          }
        },
        error: (err) => {
          const message = err.error?.message || 'Error al crear la solicitud';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    }
  }

  /**
   * Agrega una actualización a la solicitud
   */
  addUpdate() {
    const requestId = this.currentRequestForUpdate();
    const message = this.updateMessage().trim();
    const updatedBy = this.updateUpdatedBy();

    if (!requestId) {
      this.toastError('No se pudo identificar la solicitud');
      return;
    }

    if (!message) {
      this.toastError('El mensaje es obligatorio');
      return;
    }

    if (!updatedBy) {
      this.toastError('El usuario que actualiza es obligatorio');
      return;
    }

    this.loading.set(true);

    const files = this.selectedUpdateFiles();

    // Si hay archivos, subirlos primero y obtener las URLs
    if (files.length > 0) {
      this.uploadUpdateFilesAndGetUrls(requestId, files).subscribe({
        next: (attachmentUrls) => {
          const updateData: AddUpdateRequest = {
            message,
            updatedBy,
            attachments: attachmentUrls,
          };

          this.materialRequestsApi.addUpdate(requestId, updateData).subscribe({
            next: () => {
              this.uploading.set(false);
              this.uploadProgress.set({});
              this.clearSelectedUpdateFiles();
              this.toastSuccess('Actualización agregada exitosamente');
              this.loading.set(false);
              this.closeUpdateDialog();
              this.load();
              // Recargar la solicitud en vista si está abierto
              if (this.viewing()?._id === requestId) {
                this.materialRequestsApi.getById(requestId).subscribe({
                  next: (request) => this.viewing.set(request),
                });
              }
            },
            error: (err) => {
              this.uploading.set(false);
              this.uploadProgress.set({});
              const message = err.error?.message || 'Error al agregar la actualización';
              this.toastError(message);
              this.loading.set(false);
            },
          });
        },
        error: (err) => {
          this.uploading.set(false);
          this.uploadProgress.set({});
          const message = err.error?.message || 'Error al subir los archivos';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    } else {
      // No hay archivos, agregar la actualización directamente
      const updateData: AddUpdateRequest = {
        message,
        updatedBy,
      };

      this.materialRequestsApi.addUpdate(requestId, updateData).subscribe({
        next: () => {
          this.toastSuccess('Actualización agregada exitosamente');
          this.loading.set(false);
          this.closeUpdateDialog();
          this.load();
          // Recargar la solicitud en vista si está abierto
          if (this.viewing()?._id === requestId) {
            this.materialRequestsApi.getById(requestId).subscribe({
              next: (request) => this.viewing.set(request),
            });
          }
        },
        error: (err) => {
          const message = err.error?.message || 'Error al agregar la actualización';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    }
  }

  /**
   * Aprueba una solicitud
   */
  approveRequest() {
    const requestId = this.currentRequestForApprove();
    if (!requestId) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.toastError('No se pudo identificar el usuario actual');
      return;
    }

    this.loading.set(true);
    this.materialRequestsApi.approveRequest(requestId, currentUser.id).subscribe({
      next: () => {
        this.toastSuccess('Solicitud aprobada exitosamente');
        this.loading.set(false);
        this.closeApproveDialog();
        this.load();
        // Recargar la solicitud en vista si está abierto
        if (this.viewing()?._id === requestId) {
          this.materialRequestsApi.getById(requestId).subscribe({
            next: (request) => this.viewing.set(request),
          });
        }
      },
      error: (err) => {
        const message = err.error?.message || 'Error al aprobar la solicitud';
        this.toastError(message);
        this.loading.set(false);
      },
    });
  }

  /**
   * Rechaza una solicitud
   */
  rejectRequest() {
    const requestId = this.currentRequestForReject();
    if (!requestId) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.toastError('No se pudo identificar el usuario actual');
      return;
    }

    this.loading.set(true);
    this.materialRequestsApi
      .rejectRequest(requestId, currentUser.id, this.rejectionReason().trim() || undefined)
      .subscribe({
        next: () => {
          this.toastSuccess('Solicitud rechazada exitosamente');
          this.loading.set(false);
          this.closeRejectDialog();
          this.load();
          // Recargar la solicitud en vista si está abierto
          if (this.viewing()?._id === requestId) {
            this.materialRequestsApi.getById(requestId).subscribe({
              next: (request) => this.viewing.set(request),
            });
          }
        },
        error: (err) => {
          const message = err.error?.message || 'Error al rechazar la solicitud';
          this.toastError(message);
          this.loading.set(false);
        },
      });
  }

  /**
   * Elimina una solicitud
   */
  remove(item: MaterialRequest) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar esta solicitud?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        this.materialRequestsApi.delete(item._id!).subscribe({
          next: () => {
            this.toastSuccess('Solicitud eliminada exitosamente');
            this.load();
          },
          error: (err) => {
            const message = err.error?.message || 'Error al eliminar la solicitud';
            this.toastError(message);
            this.loading.set(false);
          },
        });
      },
    });
  }

  /**
   * Valida el formulario de solicitud
   */
  validateForm(item: MaterialRequest): string[] {
    const errors: string[] = [];

    if (!item.title || item.title.trim().length < 3) {
      errors.push('El título debe tener al menos 3 caracteres');
    }

    if (!item.requestedBy) {
      errors.push('El usuario que solicita es obligatorio');
    }

    if (this.editingItems().length === 0) {
      errors.push('Debe agregar al menos un item a la solicitud');
    }

    return errors;
  }

  /**
   * Formatea una fecha para mostrarla en la interfaz
   */
  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formatea solo la fecha (sin hora)
   */
  formatDateOnly(date: string | Date | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Obtiene el nombre del usuario actual
   */
  getCurrentUserName(): string {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return 'Usuario desconocido';
    }
    // Buscar en la lista de usuarios disponibles
    const user = this.availableUsers().find((u) => u.value === currentUser.id);
    if (user) {
      return user.label;
    }
    // Si no está en la lista, usar name o email del usuario actual
    return currentUser.name || currentUser.email || 'Usuario actual';
  }

  /**
   * Obtiene el nombre del usuario que solicitó
   */
  getRequestedByName(request: MaterialRequest): string {
    if (typeof request.requestedBy === 'string') {
      const user = this.availableUsers().find((u) => u.value === request.requestedBy);
      return user?.label || request.requestedBy;
    }
    return request.requestedBy.name || request.requestedBy.email || 'Usuario desconocido';
  }

  /**
   * Obtiene el nombre del usuario que actualizó
   */
  getUpdatedByName(update: MaterialRequestUpdate): string {
    if (typeof update.updatedBy === 'string') {
      const user = this.availableUsers().find((u) => u.value === update.updatedBy);
      return user?.label || update.updatedBy;
    }
    return update.updatedBy.name || update.updatedBy.email || 'Usuario desconocido';
  }

  /**
   * Obtiene el nombre del proyecto
   */
  getProjectName(request: MaterialRequest): string {
    if (!request.projectId) return '-';
    if (typeof request.projectId === 'string') {
      const project = this.availableProjects().find((p) => p.value === request.projectId);
      return project?.label || request.projectId;
    }
    return request.projectId.name || '-';
  }

  /**
   * Obtiene el nombre del usuario que aprobó
   */
  getApprovedByName(request: MaterialRequest): string {
    if (!request.approvedBy) return '-';
    if (typeof request.approvedBy === 'string') {
      const user = this.availableUsers().find((u) => u.value === request.approvedBy);
      return user?.label || request.approvedBy;
    }
    return request.approvedBy.name || request.approvedBy.email || '-';
  }

  /**
   * Obtiene el nombre del usuario que rechazó
   */
  getRejectedByName(request: MaterialRequest): string {
    if (!request.rejectedBy) return '-';
    if (typeof request.rejectedBy === 'string') {
      const user = this.availableUsers().find((u) => u.value === request.rejectedBy);
      return user?.label || request.rejectedBy;
    }
    return request.rejectedBy.name || request.rejectedBy.email || '-';
  }

  /**
   * Obtiene el número de actualizaciones
   */
  getUpdatesCount(request: MaterialRequest): number {
    return request.updates?.length || 0;
  }

  /**
   * Obtiene el número de archivos adjuntos
   */
  getAttachmentsCount(request: MaterialRequest): number {
    return request.attachments?.length || 0;
  }

  /**
   * Obtiene el número de items
   */
  getItemsCount(request: MaterialRequest): number {
    return request.items?.length || 0;
  }

  /**
   * Obtiene el color del tag según el estado
   */
  getStatusSeverity(
    status: MaterialRequest['status']
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'pendiente':
        return 'warn';
      case 'aprobado':
        return 'success';
      case 'rechazado':
        return 'danger';
      case 'en_compra':
        return 'info';
      case 'completado':
        return 'success';
      default:
        return 'secondary';
    }
  }

  /**
   * Obtiene el color del tag según la prioridad
   */
  getPrioritySeverity(
    priority: MaterialRequest['priority']
  ): 'success' | 'info' | 'warn' | 'danger' {
    switch (priority) {
      case 'baja':
        return 'success';
      case 'media':
        return 'info';
      case 'alta':
        return 'warn';
      case 'urgente':
        return 'danger';
      default:
        return 'info';
    }
  }

  /**
   * Obtiene el icono según el estado
   */
  getStatusIcon(status: MaterialRequest['status']): string {
    switch (status) {
      case 'pendiente':
        return 'pi-clock';
      case 'aprobado':
        return 'pi-check-circle';
      case 'rechazado':
        return 'pi-times-circle';
      case 'en_compra':
        return 'pi-shopping-cart';
      case 'completado':
        return 'pi-check';
      default:
        return 'pi-circle';
    }
  }

  /**
   * Obtiene el icono según la prioridad
   */
  getPriorityIcon(priority: MaterialRequest['priority']): string {
    switch (priority) {
      case 'baja':
        return 'pi-arrow-down';
      case 'media':
        return 'pi-minus';
      case 'alta':
        return 'pi-arrow-up';
      case 'urgente':
        return 'pi-exclamation-triangle';
      default:
        return 'pi-minus';
    }
  }

  /**
   * Muestra un mensaje de éxito
   */
  toastSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: message,
    });
  }

  /**
   * Muestra un mensaje de error
   */
  toastError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }

  // ========== MÉTODOS PARA GESTIÓN DE ITEMS ==========

  /**
   * Abre el diálogo para agregar/editar un item
   */
  openItemDialog(index?: number) {
    if (index !== undefined && index !== null) {
      // Editar item existente
      const item = this.editingItems()[index];
      this.editingItem.set({ ...item });
      this.editingItemIndex.set(index);
    } else {
      // Nuevo item
      this.editingItem.set({
        description: '',
        quantity: 0,
        unit: 'unidad',
      });
      this.editingItemIndex.set(null);
    }
    this.showItemDialog.set(true);
  }

  /**
   * Cierra el diálogo de item
   */
  closeItemDialog() {
    this.showItemDialog.set(false);
    this.editingItem.set(null);
    this.editingItemIndex.set(null);
  }

  /**
   * Guarda el item (agregar o editar)
   */
  saveItem() {
    const item = this.editingItem();
    if (!item) return;

    // Validar item
    if (!item.description || item.description.trim().length === 0) {
      this.toastError('La descripción es obligatoria');
      return;
    }
    if (!item.quantity || item.quantity <= 0) {
      this.toastError('La cantidad debe ser mayor a 0');
      return;
    }
    if (!item.unit) {
      this.toastError('La unidad es obligatoria');
      return;
    }

    const items = [...this.editingItems()];
    const index = this.editingItemIndex();

    if (index !== null && index !== undefined) {
      // Editar item existente
      items[index] = item as MaterialRequestItem;
    } else {
      // Agregar nuevo item
      items.push(item as MaterialRequestItem);
    }

    this.editingItems.set(items);
    this.closeItemDialog();
  }

  /**
   * Elimina un item de la lista
   */
  removeItem(index: number) {
    const items = [...this.editingItems()];
    items.splice(index, 1);
    this.editingItems.set(items);
  }

  /**
   * Mueve un item hacia arriba
   */
  moveItemUp(index: number) {
    if (index === 0) return;
    const items = [...this.editingItems()];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    this.editingItems.set(items);
  }

  /**
   * Mueve un item hacia abajo
   */
  moveItemDown(index: number) {
    const items = [...this.editingItems()];
    if (index === items.length - 1) return;
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    this.editingItems.set(items);
  }

  // ========== MÉTODOS PARA GESTIÓN DE ARCHIVOS ==========

  /**
   * Maneja el evento dragover
   */
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  /**
   * Maneja el evento dragleave
   */
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  /**
   * Maneja el evento drop
   */
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.processFiles(files);
    }
  }

  /**
   * Maneja el evento paste (pegar desde portapapeles)
   */
  onPaste(event: ClipboardEvent) {
    const target = event.target as HTMLElement;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    ) {
      return;
    }

    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      this.processFiles(files);
    }
  }

  /**
   * Maneja el cambio del input de archivos
   */
  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.processFiles(files);
    }
  }

  /**
   * Procesa los archivos seleccionados
   */
  private processFiles(files: File[]) {
    const maxSize = 200 * 1024 * 1024; // 200MB
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];

    files.forEach((file) => {
      if (file.size > maxSize) {
        invalidFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      invalidFiles.forEach((file) => {
        this.toastError(`El archivo ${file.name} es demasiado grande. Máximo 200MB.`);
      });
    }

    if (validFiles.length > 0) {
      const currentFiles = this.selectedFiles();
      const updatedFiles = [...currentFiles, ...validFiles];
      this.selectedFiles.set(updatedFiles);

      validFiles.forEach((file) => {
        this.createFilePreview(file);
      });

      this.toastSuccess(`${validFiles.length} archivo(s) agregado(s) correctamente`);
    }
  }

  /**
   * Crea una previsualización para un archivo
   */
  private createFilePreview(file: File) {
    const fileType = this.getFileType(file.name);
    if (fileType !== 'image' && fileType !== 'video' && fileType !== 'audio') {
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      console.error('Error al leer el archivo para preview:', file.name);
    };
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        const previews = new Map(this.filePreviews());
        previews.set(file.name, e.target.result as string);
        this.filePreviews.set(previews);
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Elimina un archivo de la lista seleccionada
   */
  removeSelectedFile(fileToRemove: File) {
    const currentFiles = this.selectedFiles();
    const updatedFiles = currentFiles.filter((file) => file !== fileToRemove);
    this.selectedFiles.set(updatedFiles);

    const previews = new Map(this.filePreviews());
    previews.delete(fileToRemove.name);
    this.filePreviews.set(previews);
  }

  /**
   * Limpia todos los archivos seleccionados
   */
  clearSelectedFiles() {
    this.selectedFiles.set([]);
    this.filePreviews.set(new Map());
  }

  /**
   * Sube archivos después de crear una solicitud
   */
  private uploadFilesAfterCreate(requestId: string, files: File[]) {
    this.uploading.set(true);
    this.uploadFilesToRequest(requestId, files, () => {
      this.loading.set(false);
      this.closeDialog();
      this.load();
    });
  }

  /**
   * Método privado para subir archivos a una solicitud
   */
  private uploadFilesToRequest(requestId: string, files: File[], onComplete?: () => void) {
    this.uploading.set(true);
    this.uploadProgress.set({});

    const uploadPromises = files.map((file: File) => {
      return new Promise<void>((resolve, reject) => {
        this.uploadProgress.update((progress) => ({
          ...progress,
          [file.name]: 0,
        }));

        this.materialRequestsApi.uploadDocument(requestId, file).subscribe({
          next: () => {
            this.uploadProgress.update((progress) => ({
              ...progress,
              [file.name]: 100,
            }));
            resolve();
          },
          error: (error) => {
            const errorMessage = error.error?.message || `Error al subir ${file.name}`;
            this.toastError(errorMessage);
            reject(error);
          },
        });
      });
    });

    Promise.allSettled(uploadPromises).then(() => {
      this.uploading.set(false);
      this.uploadProgress.set({});
      this.toastSuccess(`${files.length} archivo(s) procesado(s)`);
      this.clearSelectedFiles();

      this.materialRequestsApi.getById(requestId).subscribe({
        next: (updatedRequest) => {
          this.editing.set(updatedRequest);
          this.load();
          if (onComplete) {
            onComplete();
          }
        },
        error: () => {
          this.load();
          if (onComplete) {
            onComplete();
          }
        },
      });
    });
  }

  /**
   * Obtiene el tipo de archivo basado en la extensión
   */
  getFileType(fileName: string): 'image' | 'video' | 'audio' | 'document' {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];

    if (imageTypes.includes(extension)) return 'image';
    if (videoTypes.includes(extension)) return 'video';
    if (audioTypes.includes(extension)) return 'audio';
    return 'document';
  }

  /**
   * Obtiene el icono según el tipo de archivo
   */
  getFileIcon(fileName: string): string {
    const type = this.getFileType(fileName);
    switch (type) {
      case 'image':
        return 'pi pi-image';
      case 'video':
        return 'pi pi-video';
      case 'audio':
        return 'pi pi-volume-up';
      default:
        return 'pi pi-file';
    }
  }

  /**
   * Abre un archivo adjunto en una nueva ventana
   */
  openAttachment(url: string) {
    window.open(url, '_blank');
  }

  /**
   * Obtiene la URL de preview de un archivo
   */
  getFilePreview(fileName: string): string | null {
    return this.filePreviews().get(fileName) || null;
  }

  /**
   * Abre el modal de previsualización
   */
  openPreviewModal(url: string, fileName: string) {
    const fileType = this.getFileType(fileName);
    this.previewModalUrl.set(url);
    this.previewModalType.set(fileType);
    this.showPreviewModal.set(true);
  }

  /**
   * Cierra el modal de previsualización
   */
  closePreviewModal() {
    this.showPreviewModal.set(false);
    this.previewModalUrl.set('');
  }

  // ========== MÉTODOS PARA ARCHIVOS DE ACTUALIZACIONES ==========

  /**
   * Maneja el evento dragover para actualizaciones
   */
  onDragOverUpdate(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingUpdate.set(true);
  }

  /**
   * Maneja el evento dragleave para actualizaciones
   */
  onDragLeaveUpdate(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingUpdate.set(false);
  }

  /**
   * Maneja el evento drop para actualizaciones
   */
  onDropUpdate(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingUpdate.set(false);

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.processUpdateFiles(files);
    }
  }

  /**
   * Maneja el evento paste para actualizaciones
   */
  onPasteUpdate(event: ClipboardEvent) {
    const target = event.target as HTMLElement;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    ) {
      return;
    }

    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      this.processUpdateFiles(files);
    }
  }

  /**
   * Maneja el cambio del input de archivos para actualizaciones
   */
  onFileInputChangeUpdate(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.processUpdateFiles(files);
    }
  }

  /**
   * Procesa los archivos seleccionados para actualizaciones
   */
  private processUpdateFiles(files: File[]) {
    const maxSize = 200 * 1024 * 1024; // 200MB
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];

    files.forEach((file) => {
      if (file.size > maxSize) {
        invalidFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      invalidFiles.forEach((file) => {
        this.toastError(`El archivo ${file.name} es demasiado grande. Máximo 200MB.`);
      });
    }

    if (validFiles.length > 0) {
      const currentFiles = this.selectedUpdateFiles();
      const updatedFiles = [...currentFiles, ...validFiles];
      this.selectedUpdateFiles.set(updatedFiles);

      validFiles.forEach((file) => {
        this.createUpdateFilePreview(file);
      });

      this.toastSuccess(`${validFiles.length} archivo(s) agregado(s) correctamente`);
    }
  }

  /**
   * Crea una previsualización para un archivo de actualización
   */
  private createUpdateFilePreview(file: File) {
    const fileType = this.getFileType(file.name);
    if (fileType !== 'image' && fileType !== 'video' && fileType !== 'audio') {
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      console.error('Error al leer el archivo para preview:', file.name);
    };
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        const previews = new Map(this.updateFilePreviews());
        previews.set(file.name, e.target.result as string);
        this.updateFilePreviews.set(previews);
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Elimina un archivo de la lista de actualizaciones
   */
  removeSelectedUpdateFile(fileToRemove: File) {
    const currentFiles = this.selectedUpdateFiles();
    const updatedFiles = currentFiles.filter((file) => file !== fileToRemove);
    this.selectedUpdateFiles.set(updatedFiles);

    const previews = new Map(this.updateFilePreviews());
    previews.delete(fileToRemove.name);
    this.updateFilePreviews.set(previews);
  }

  /**
   * Limpia todos los archivos seleccionados de actualizaciones
   */
  clearSelectedUpdateFiles() {
    this.selectedUpdateFiles.set([]);
    this.updateFilePreviews.set(new Map());
  }

  /**
   * Sube archivos de actualización y obtiene sus URLs
   */
  private uploadUpdateFilesAndGetUrls(requestId: string, files: File[]): Observable<string[]> {
    this.uploading.set(true);
    this.uploadProgress.set({});

    return this.materialRequestsApi.getById(requestId).pipe(
      switchMap((currentRequest) => {
        const existingAttachments = new Set(currentRequest.attachments || []);

        const uploadObservables = files.map((file: File) => {
          this.uploadProgress.update((progress) => ({
            ...progress,
            [file.name]: 0,
          }));

          return this.materialRequestsApi.uploadDocument(requestId, file).pipe(
            map((updatedRequest) => {
              this.uploadProgress.update((progress) => ({
                ...progress,
                [file.name]: 100,
              }));

              const newAttachments = (updatedRequest.attachments || []).filter(
                (url) => !existingAttachments.has(url)
              );

              newAttachments.forEach((url) => existingAttachments.add(url));

              return newAttachments;
            })
          );
        });

        return forkJoin(uploadObservables).pipe(
          map((results) => {
            const allUrls = results.flat();
            const uniqueUrls = Array.from(new Set(allUrls));
            return uniqueUrls;
          })
        );
      })
    );
  }
}
