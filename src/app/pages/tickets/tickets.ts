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
import { MessageService, ConfirmationService } from 'primeng/api';
import { TicketsApiService } from '../../shared/services/tickets-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { AuthService } from '../login/services/auth.service';
import {
  Ticket,
  CreateTicketRequest,
  UpdateTicketRequest,
  AddUpdateRequest,
  TicketStatsResponse,
  TicketQueryParams,
  TicketUpdate,
} from '../../shared/interfaces/ticket.interface';

/**
 * Componente de Gestión de Tickets
 * Implementa principios SOLID:
 * - Single Responsibility: Solo gestiona la interfaz de usuario para tickets
 * - Open/Closed: Extensible sin modificar código existente
 * - Dependency Inversion: Depende de abstracciones (servicios inyectados)
 */
@Component({
  selector: 'app-tickets',
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
  ],
  templateUrl: './tickets.html',
  styleUrl: './tickets.scss',
  providers: [MessageService, ConfirmationService],
})
export class TicketsPage implements OnInit {
  // Inyección de dependencias siguiendo Dependency Inversion Principle
  private readonly ticketsApi = inject(TicketsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly usersApi = inject(UsersApiService);
  private readonly authService = inject(AuthService);

  // Verificar permisos de edición
  readonly canEdit = computed(() => this.menuService.canEdit('/tickets'));

  // Signals para gestión reactiva de estado
  items = signal<Ticket[]>([]);
  stats = signal<TicketStatsResponse | null>(null);
  query = signal('');
  statusFilter = signal<'abierto' | 'cerrado' | null>(null);
  reportedByFilter = signal<string | null>(null);
  showDialog = signal(false);
  showViewDialog = signal(false);
  showStatsDialog = signal(false);
  showUpdateDialog = signal(false);
  editing = signal<Ticket | null>(null);
  viewing = signal<Ticket | null>(null);
  currentTicketForUpdate = signal<string | null>(null);
  loading = signal(false);
  loadingStats = signal(false);

  // Usuarios disponibles para selección
  availableUsers = signal<{ label: string; value: string }[]>([]);
  loadingUsers = signal(false);

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
      const problemMatch = item.problem?.toLowerCase().includes(searchQuery) ?? false;
      const updatesMatch =
        item.updates?.some((update) => update.message?.toLowerCase().includes(searchQuery)) ??
        false;
      return problemMatch || updatesMatch;
    });
  });

  // Opciones de usuarios para el filtro (incluye "Todos")
  reportedByOptions = computed(() => {
    return [{ label: 'Todos', value: null }, ...this.availableUsers()];
  });

  ngOnInit() {
    this.load();
    this.loadUsers();
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
   * Carga la lista de tickets desde el servidor
   */
  load() {
    this.loading.set(true);

    const params: TicketQueryParams = {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    if (this.query()) params.q = this.query();
    if (this.statusFilter()) params.status = this.statusFilter()!;
    if (this.reportedByFilter()) params.reportedBy = this.reportedByFilter()!;

    this.ticketsApi.list(params).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toastError('Error al cargar tickets');
        console.error(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Carga las estadísticas de tickets
   */
  loadStats() {
    this.loadingStats.set(true);
    this.showStatsDialog.set(true);

    this.ticketsApi.getStats().subscribe({
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
  buildRowKey(item: Ticket, index: number): string {
    return item._id ? String(item._id) : `${item.problem}#${index}`;
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
    this.reportedByFilter.set(null);
    this.load();
  }

  /**
   * Abre el diálogo para crear un nuevo ticket
   */
  newItem() {
    const currentUser = this.authService.getCurrentUser();
    this.editing.set({
      reportedBy: currentUser?.id || '',
      problem: '',
      status: 'abierto',
      attachments: [],
    });
    this.showDialog.set(true);
    this.clearSelectedFiles();
  }

  /**
   * Abre el diálogo para editar un ticket existente
   */
  editItem(item: Ticket) {
    const editedItem = { ...item };
    // Convertir reportedBy a ID si viene populado
    if (typeof editedItem.reportedBy === 'object') {
      editedItem.reportedBy = editedItem.reportedBy._id;
    }
    this.editing.set(editedItem);
    this.showDialog.set(true);
  }

  /**
   * Cierra el diálogo de creación/edición
   */
  closeDialog() {
    this.showDialog.set(false);
    this.editing.set(null);
    this.clearSelectedFiles();
    this.closePreviewModal();
  }

  /**
   * Abre el diálogo de visualización de detalles
   */
  viewItem(item: Ticket) {
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
  openUpdateDialog(ticketId: string) {
    this.currentTicketForUpdate.set(ticketId);
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
    this.currentTicketForUpdate.set(null);
    this.updateMessage.set('');
    this.clearSelectedUpdateFiles();
  }

  /**
   * Actualiza un campo del item en edición
   */
  onEditChange(field: keyof Ticket, value: Ticket[keyof Ticket]) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  /**
   * Guarda el ticket (crear o actualizar)
   */
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
      const updateData: UpdateTicketRequest = {
        problem: item.problem.trim(),
        reportedBy: typeof item.reportedBy === 'string' ? item.reportedBy : item.reportedBy._id,
        status: item.status,
      };

      this.ticketsApi.update(item._id, updateData).subscribe({
        next: () => {
          this.toastSuccess('Ticket actualizado exitosamente');
          this.loading.set(false);
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al actualizar el ticket';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    } else {
      // Crear
      const createData: CreateTicketRequest = {
        reportedBy: typeof item.reportedBy === 'string' ? item.reportedBy : item.reportedBy._id,
        problem: item.problem.trim(),
      };

      this.ticketsApi.create(createData).subscribe({
        next: (createdTicket) => {
          this.toastSuccess('Ticket creado exitosamente');

          // Si hay archivos seleccionados, subirlos después de crear el ticket
          const files = this.selectedFiles();
          if (files.length > 0 && createdTicket._id) {
            this.uploadFilesAfterCreate(createdTicket._id, files);
          } else {
            this.loading.set(false);
            this.closeDialog();
            this.load();
          }
        },
        error: (err) => {
          const message = err.error?.message || 'Error al crear el ticket';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    }
  }

  /**
   * Agrega una actualización al ticket
   */
  addUpdate() {
    const ticketId = this.currentTicketForUpdate();
    const message = this.updateMessage().trim();
    const updatedBy = this.updateUpdatedBy();

    if (!ticketId) {
      this.toastError('No se pudo identificar el ticket');
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
      this.uploadUpdateFilesAndGetUrls(ticketId, files).subscribe({
        next: (attachmentUrls) => {
          const updateData: AddUpdateRequest = {
            message,
            updatedBy,
            attachments: attachmentUrls,
          };

          this.ticketsApi.addUpdate(ticketId, updateData).subscribe({
            next: () => {
              this.uploading.set(false);
              this.uploadProgress.set({});
              this.clearSelectedUpdateFiles();
              this.toastSuccess('Actualización agregada exitosamente');
              this.loading.set(false);
              this.closeUpdateDialog();
              this.load();
              // Recargar el ticket en vista si está abierto
              if (this.viewing()?._id === ticketId) {
                this.ticketsApi.getById(ticketId).subscribe({
                  next: (ticket) => this.viewing.set(ticket),
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

      this.ticketsApi.addUpdate(ticketId, updateData).subscribe({
        next: () => {
          this.toastSuccess('Actualización agregada exitosamente');
          this.loading.set(false);
          this.closeUpdateDialog();
          this.load();
          // Recargar el ticket en vista si está abierto
          if (this.viewing()?._id === ticketId) {
            this.ticketsApi.getById(ticketId).subscribe({
              next: (ticket) => this.viewing.set(ticket),
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
   * Cierra un ticket
   */
  closeTicket(ticket: Ticket) {
    if (!ticket._id) return;

    if (ticket.status === 'cerrado') {
      this.toastError('El ticket ya está cerrado');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea cerrar este ticket?`,
      header: 'Confirmar Cierre',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cerrar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        this.ticketsApi.closeTicket(ticket._id!).subscribe({
          next: () => {
            this.toastSuccess('Ticket cerrado exitosamente');
            this.load();
          },
          error: (err) => {
            const message = err.error?.message || 'Error al cerrar el ticket';
            this.toastError(message);
            this.loading.set(false);
          },
        });
      },
    });
  }

  /**
   * Elimina un ticket
   */
  remove(item: Ticket) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar este ticket?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        this.ticketsApi.delete(item._id!).subscribe({
          next: () => {
            this.toastSuccess('Ticket eliminado exitosamente');
            this.load();
          },
          error: (err) => {
            const message = err.error?.message || 'Error al eliminar el ticket';
            this.toastError(message);
            this.loading.set(false);
          },
        });
      },
    });
  }

  /**
   * Valida el formulario de ticket
   */
  validateForm(item: Ticket): string[] {
    const errors: string[] = [];

    if (!item.problem || item.problem.trim().length < 3) {
      errors.push('El problema debe tener al menos 3 caracteres');
    }

    if (!item.reportedBy) {
      errors.push('El usuario que reporta es obligatorio');
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
   * Obtiene el nombre del usuario que reportó
   */
  getReportedByName(ticket: Ticket): string {
    if (typeof ticket.reportedBy === 'string') {
      const user = this.availableUsers().find((u) => u.value === ticket.reportedBy);
      return user?.label || ticket.reportedBy;
    }
    return ticket.reportedBy.name || ticket.reportedBy.email || 'Usuario desconocido';
  }

  /**
   * Obtiene el nombre del usuario que actualizó
   */
  getUpdatedByName(update: TicketUpdate): string {
    if (typeof update.updatedBy === 'string') {
      const user = this.availableUsers().find((u) => u.value === update.updatedBy);
      return user?.label || update.updatedBy;
    }
    return update.updatedBy.name || update.updatedBy.email || 'Usuario desconocido';
  }

  /**
   * Obtiene el número de actualizaciones
   */
  getUpdatesCount(ticket: Ticket): number {
    return ticket.updates?.length || 0;
  }

  /**
   * Obtiene el número de archivos adjuntos
   */
  getAttachmentsCount(ticket: Ticket): number {
    return ticket.attachments?.length || 0;
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
   * Sube archivos después de crear un ticket
   */
  private uploadFilesAfterCreate(ticketId: string, files: File[]) {
    this.uploading.set(true);
    this.uploadFilesToTicket(ticketId, files, () => {
      this.loading.set(false);
      this.closeDialog();
      this.load();
    });
  }

  /**
   * Método privado para subir archivos a un ticket
   */
  private uploadFilesToTicket(ticketId: string, files: File[], onComplete?: () => void) {
    this.uploading.set(true);
    this.uploadProgress.set({});

    const uploadPromises = files.map((file: File) => {
      return new Promise<void>((resolve, reject) => {
        this.uploadProgress.update((progress) => ({
          ...progress,
          [file.name]: 0,
        }));

        this.ticketsApi.uploadDocument(ticketId, file).subscribe({
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

      this.ticketsApi.getById(ticketId).subscribe({
        next: (updatedTicket) => {
          this.editing.set(updatedTicket);
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
   * @param ticketId ID del ticket
   * @param files Archivos a subir
   * @returns Observable con array de URLs de los archivos subidos
   */
  private uploadUpdateFilesAndGetUrls(ticketId: string, files: File[]): Observable<string[]> {
    this.uploading.set(true);
    this.uploadProgress.set({});

    // Primero obtener el ticket actual para conocer los attachments existentes
    return this.ticketsApi.getById(ticketId).pipe(
      switchMap((currentTicket) => {
        const existingAttachments = new Set(currentTicket.attachments || []);

        // Subir todos los archivos en paralelo
        const uploadObservables = files.map((file: File) => {
          this.uploadProgress.update((progress) => ({
            ...progress,
            [file.name]: 0,
          }));

          return this.ticketsApi.uploadDocument(ticketId, file).pipe(
            map((updatedTicket) => {
              this.uploadProgress.update((progress) => ({
                ...progress,
                [file.name]: 100,
              }));

              // Encontrar las nuevas URLs comparando con las existentes
              const newAttachments = (updatedTicket.attachments || []).filter(
                (url) => !existingAttachments.has(url)
              );

              // Agregar las nuevas URLs al set para evitar duplicados
              newAttachments.forEach((url) => existingAttachments.add(url));

              return newAttachments;
            })
          );
        });

        return forkJoin(uploadObservables).pipe(
          map((results) => {
            // Aplanar el array de arrays y eliminar duplicados
            const allUrls = results.flat();
            const uniqueUrls = Array.from(new Set(allUrls));
            return uniqueUrls;
          })
        );
      })
    );
  }

  /**
   * Sube archivos de actualización (método legacy, mantenido por compatibilidad)
   */
  private uploadUpdateFiles(ticketId: string, files: File[], onComplete?: () => void) {
    this.uploading.set(true);
    this.uploadProgress.set({});

    const uploadPromises = files.map((file: File) => {
      return new Promise<void>((resolve, reject) => {
        this.uploadProgress.update((progress) => ({
          ...progress,
          [file.name]: 0,
        }));

        this.ticketsApi.uploadDocument(ticketId, file).subscribe({
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
      this.clearSelectedUpdateFiles();
      if (onComplete) {
        onComplete();
      }
    });
  }
}
