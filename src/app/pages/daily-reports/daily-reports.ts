import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DailyExpensesApiService } from '../../shared/services/daily-reports-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { CompaniesApiService } from '../../shared/services/companies-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { AuthService } from '../login/services/auth.service';
import { MenuService } from '../../shared/services/menu.service';
import { DailyReport } from '../../shared/interfaces/daily-report.interface';
import { ProjectOption, Project } from '../../shared/interfaces/project.interface';
import { compressImage } from '../../shared/utils/image-compression.util';
import { compressVideo } from '../../shared/utils/video-compression.util';
import { firstValueFrom } from 'rxjs';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import { TruncatePipe } from './truncate.pipe';

@Component({
  selector: 'app-daily-expenses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    TextareaModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    TruncatePipe,
  ],
  templateUrl: './daily-reports.html',
  styleUrl: './daily-reports.scss',
  providers: [MessageService, ConfirmationService],
})
export class DailyExpensesPage implements OnInit {
  private readonly dailyExpensesApi = inject(DailyExpensesApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/daily-reports'));

  items = signal<DailyReport[]>([]);
  projects = signal<ProjectOption[]>([]);
  users = signal<UserOption[]>([]);
  query = signal('');
  filterDate = signal<string | null>(null);
  selectedCompany = signal<{ id: string; name: string; code?: string } | null>(null);
  selectedUser = signal<{ id: string; name: string; email: string } | null>(null);
  companyOptions = signal<
    { label: string; value: { id: string; name: string; code?: string } | null }[]
  >([]);
  userOptions = signal<
    { label: string; value: { id: string; name: string; email: string } | null }[]
  >([]);
  loadingCompanies = signal(false);
  loadingUsers = signal(false);
  showDialog = signal(false);
  showViewDialog = signal(false);
  editing = signal<DailyReport | null>(null);
  viewing = signal<DailyReport | null>(null);
  // Estado de expansión para vista móvil (accordion)
  private expandedRowKeys = signal<Set<string>>(new Set());

  // Computed para verificar si el usuario es gerencia
  readonly isGerencia = computed(() => this.authService.isGerencia());

  // Archivos seleccionados (pendientes) cuando aún no existe el reporte
  pendingAudio = signal<File[]>([]);
  pendingVideo = signal<File[]>([]);
  pendingPhoto = signal<File[]>([]);
  pendingDocuments = signal<File[]>([]);

  // Estados de carga para archivos
  uploadingFiles = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  uploadingFileType = signal<'audio' | 'video' | 'photo' | 'document' | null>(null);
  uploadingFileName = signal<string | null>(null);

  // Cache de URLs de blob para archivos pendientes (evita recrear URLs)
  private pendingAudioUrlCache = new Map<File, string>();
  private pendingVideoUrlCache = new Map<File, string>();
  private pendingPhotoUrlCache = new Map<File, string>();

  // Signals computed para URLs de archivos pendientes (estable y reactivo)
  pendingAudioUrls = computed(() => {
    const files = this.pendingAudio();
    const urls: string[] = [];
    const newCache = new Map<File, string>();

    files.forEach((file) => {
      // Si ya existe en el cache, reutilizarlo
      if (this.pendingAudioUrlCache.has(file)) {
        const cachedUrl = this.pendingAudioUrlCache.get(file)!;
        newCache.set(file, cachedUrl);
        urls.push(cachedUrl);
      } else {
        // Crear nueva URL solo si no existe
        const url = URL.createObjectURL(file);
        newCache.set(file, url);
        urls.push(url);
      }
    });

    // Limpiar URLs de archivos que ya no están
    this.pendingAudioUrlCache.forEach((url, file) => {
      if (!files.includes(file)) {
        URL.revokeObjectURL(url);
      }
    });

    this.pendingAudioUrlCache = newCache;
    return urls;
  });

  pendingVideoUrls = computed(() => {
    const files = this.pendingVideo();
    const urls: string[] = [];
    const newCache = new Map<File, string>();

    files.forEach((file) => {
      if (this.pendingVideoUrlCache.has(file)) {
        const cachedUrl = this.pendingVideoUrlCache.get(file)!;
        newCache.set(file, cachedUrl);
        urls.push(cachedUrl);
      } else {
        const url = URL.createObjectURL(file);
        newCache.set(file, url);
        urls.push(url);
      }
    });

    this.pendingVideoUrlCache.forEach((url, file) => {
      if (!files.includes(file)) {
        URL.revokeObjectURL(url);
      }
    });

    this.pendingVideoUrlCache = newCache;
    return urls;
  });

  pendingPhotoUrls = computed(() => {
    const files = this.pendingPhoto();
    const urls: string[] = [];
    const newCache = new Map<File, string>();

    files.forEach((file) => {
      if (this.pendingPhotoUrlCache.has(file)) {
        const cachedUrl = this.pendingPhotoUrlCache.get(file)!;
        newCache.set(file, cachedUrl);
        urls.push(cachedUrl);
      } else {
        const url = URL.createObjectURL(file);
        newCache.set(file, url);
        urls.push(url);
      }
    });

    this.pendingPhotoUrlCache.forEach((url, file) => {
      if (!files.includes(file)) {
        URL.revokeObjectURL(url);
      }
    });

    this.pendingPhotoUrlCache = newCache;
    return urls;
  });

  // Modal de visualización de medios
  showMediaModal = signal(false);
  mediaModalType = signal<'audio' | 'video' | 'photo' | null>(null);
  mediaModalUrl = signal<string>('');
  mediaModalUrls = signal<string[]>([]);
  mediaModalCurrentIndex = signal(0);

  // Estado de grabación de audio
  isRecordingAudio = signal(false);
  recordingTime = signal(0);
  isMobile = signal(false);
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  // Filtrado simple por texto
  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const list = this.items()
      .slice()
      .sort((a, b) => {
        const aDt = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const bDt = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return bDt - aDt; // DESC
      });

    if (!searchQuery) return list;
    return list.filter((item) => {
      const descriptionMatch = item.description?.toLowerCase().includes(searchQuery) ?? false;
      const dateMatch = item.date?.toLowerCase().includes(searchQuery) ?? false;
      const timeMatch = item.time?.toLowerCase().includes(searchQuery) ?? false;
      return descriptionMatch || dateMatch || timeMatch;
    });
  });

  ngOnInit() {
    this.load();
    this.loadProjects();
    // Cargar empresas y usuarios si el usuario es gerencia
    if (this.isGerencia()) {
      this.loadCompanies();
      this.loadUsers();
    }
    // Detectar si es móvil
    this.isMobile.set(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        // Detener grabación si está activa
        if (this.isRecordingAudio()) {
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
          }
          if (this.audioStream) {
            this.audioStream.getTracks().forEach((track) => track.stop());
            this.audioStream = null;
          }
          this.isRecordingAudio.set(false);
          if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
          }
          this.recordingTime.set(0);
          this.mediaRecorder = null;
        }

        this.editing.set(null);

        // Limpiar URLs de blob antes de limpiar los arrays
        this.cleanupPendingUrls();

        this.pendingAudio.set([]);
        this.pendingVideo.set([]);
        this.pendingPhoto.set([]);
        this.pendingDocuments.set([]);
      }
      if (!this.showViewDialog()) this.viewing.set(null);
    });
  }

  /**
   * Normaliza una fecha desde cualquier formato (ISO string con UTC o YYYY-MM-DD)
   * a formato YYYY-MM-DD extrayendo directamente los componentes sin conversión de zona horaria
   */
  private normalizeDate(dateValue: string | Date | null | undefined): string {
    if (!dateValue) return '';

    // Si ya es formato YYYY-MM-DD, retornarlo tal cual
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // Si es un string ISO (con T y Z o T y offset), extraer directamente año, mes y día
    if (typeof dateValue === 'string') {
      // Formato ISO: "2026-01-05T00:00:00.000Z" o "2026-01-05T05:00:00.000Z"
      const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      }
    }

    // Si es un objeto Date, usar los métodos get para obtener componentes locales
    if (dateValue instanceof Date) {
      const year = dateValue.getFullYear();
      const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
      const day = dateValue.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return '';
  }

  /**
   * Normaliza un objeto DailyReport completo, especialmente la fecha
   */
  private normalizeDailyReport(report: DailyReport): DailyReport {
    return {
      ...report,
      date: this.normalizeDate(report.date),
    };
  }

  load() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.items.set([]);
      return;
    }

    const fd = this.filterDate();
    const filters: {
      userId?: string;
      startDate?: string;
      endDate?: string;
      tenantId?: string;
    } = {};

    // Para gerencia: no filtrar por userId para ver todos los reportes de todos los usuarios
    // Para otros roles: filtrar por userId del usuario actual
    if (!this.isGerencia()) {
      filters.userId = currentUser.id;
    }

    // Agregar filtro de fecha si existe
    if (fd) {
      filters.startDate = fd;
      filters.endDate = fd;
    }

    // Agregar filtro por empresa si es gerencia y hay empresa seleccionada
    if (this.isGerencia()) {
      const company = this.selectedCompany();
      if (company && company.id) {
        filters.tenantId = company.id;
      }
      // Si no hay empresa seleccionada, no agregar tenantId para ver todas las empresas

      // Agregar filtro por usuario si hay usuario seleccionado
      const user = this.selectedUser();
      if (user && user.id) {
        filters.userId = user.id;
      }
      // Si no hay usuario seleccionado, no agregar userId para ver todos los usuarios
    }

    this.dailyExpensesApi.listWithFilters(filters).subscribe({
      next: (data) => {
        // Normalizar fechas de todos los items para que se muestren correctamente
        const normalizedData = data.map((item) => ({
          ...item,
          date: this.normalizeDate(item.date),
        }));
        this.items.set(normalizedData);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los reportes diarios',
        });
      },
    });
  }

  onFilterDateChange(value: Date | null) {
    if (!value) {
      this.filterDate.set(null);
      this.load();
      return;
    }
    const y = value.getFullYear();
    const m = (value.getMonth() + 1).toString().padStart(2, '0');
    const d = value.getDate().toString().padStart(2, '0');
    this.filterDate.set(`${y}-${m}-${d}`);
    this.load();
  }

  loadProjects() {
    this.projectsApi.getOptions().subscribe({
      next: (data) => this.projects.set(data),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proyectos',
        });
      },
    });
  }

  /**
   * Carga las empresas desde el backend (solo para rol gerencia)
   */
  loadCompanies(): void {
    this.loadingCompanies.set(true);
    this.companiesApi.list({ isActive: true }).subscribe({
      next: (companies) => {
        const options: {
          label: string;
          value: { id: string; name: string; code?: string } | null;
        }[] = [{ label: 'Todas las empresas', value: null }];
        companies.forEach((company) => {
          if (company._id) {
            options.push({
              label: `${company.name}${company.code ? ` (${company.code})` : ''}`,
              value: { id: company._id, name: company.name, code: company.code },
            });
          }
        });
        this.companyOptions.set(options);
        this.loadingCompanies.set(false);
      },
      error: (error) => {
        console.error('Error loading companies:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las empresas',
        });
        this.loadingCompanies.set(false);
        // Mantener opción por defecto en caso de error
        this.companyOptions.set([{ label: 'Todas las empresas', value: null }]);
      },
    });
  }

  /**
   * Maneja el cambio de empresa
   */
  onCompanyChange(): void {
    // Recargar reportes cuando cambia la empresa
    // Si hay empresa seleccionada, recargar usuarios de esa empresa
    if (this.isGerencia()) {
      const company = this.selectedCompany();
      if (company && company.id) {
        this.loadUsers(company.id);
      } else {
        // Si no hay empresa, cargar todos los usuarios
        this.loadUsers();
      }
    }
    this.load();
  }

  /**
   * Carga los usuarios desde el backend (solo para rol gerencia)
   * @param tenantId Opcional: Filtrar usuarios por empresa
   */
  loadUsers(tenantId?: string): void {
    if (!this.isGerencia()) {
      return;
    }

    this.loadingUsers.set(true);
    this.usersApi.list(tenantId).subscribe({
      next: (userOptions) => {
        const options: {
          label: string;
          value: { id: string; name: string; email: string } | null;
        }[] = [{ label: 'Todos los usuarios', value: null }];
        userOptions.forEach((user) => {
          if (user._id) {
            options.push({
              label: `${user.name}${user.email ? ` (${user.email})` : ''}`,
              value: { id: user._id, name: user.name, email: user.email || '' },
            });
          }
        });
        this.userOptions.set(options);
        this.users.set(userOptions);
        this.loadingUsers.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los usuarios',
        });
        this.loadingUsers.set(false);
        // Mantener opción por defecto en caso de error
        this.userOptions.set([{ label: 'Todos los usuarios', value: null }]);
      },
    });
  }

  /**
   * Maneja el cambio de usuario
   */
  onUserChange(): void {
    // Recargar reportes cuando cambia el usuario
    this.load();
  }

  /**
   * Obtiene el nombre del usuario del reporte
   * @param userId ID del usuario o objeto populado
   * @returns Nombre del usuario o 'Usuario desconocido'
   */
  getUserName(
    userId: string | { _id?: string; name?: string; email?: string } | undefined
  ): string {
    if (!userId) return 'Usuario desconocido';

    // Si es un objeto populado
    if (typeof userId === 'object' && 'name' in userId) {
      return userId.name || userId.email || 'Usuario desconocido';
    }

    // Si es un string (ID), buscar en la lista de usuarios
    if (typeof userId === 'string') {
      const user = this.users().find((u) => u._id === userId);
      return user?.name || user?.email || 'Usuario desconocido';
    }

    return 'Usuario desconocido';
  }

  // Helpers de accordion móvil
  private buildRowKey(item: DailyReport, index: number): string {
    const base = `${item.date}T${item.time || '00:00'}`;
    return item._id ? String(item._id) : `${base}#${index}`;
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
  }

  newItem() {
    const currentUser = this.authService.getCurrentUser();
    // Obtener fecha local sin problemas de zona horaria
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const localDate = `${year}-${month}-${day}`;

    this.editing.set({
      date: localDate,
      time: new Date().toTimeString().slice(0, 5),
      description: '',
      audioDescription: null,
      videoDescription: null,
      photoDescription: null,
      documents: [],
      userId: currentUser?.id || '',
      projectId: '',
    });

    // Limpiar URLs de blob si hay archivos pendientes
    this.cleanupPendingUrls();

    this.pendingAudio.set([]);
    this.pendingVideo.set([]);
    this.pendingPhoto.set([]);
    this.pendingDocuments.set([]);
    this.showDialog.set(true);
  }

  editItem(item: DailyReport) {
    // Crear una copia del item para editar
    const editedItem = { ...item };

    // Normalizar la fecha para que se muestre correctamente en el datepicker
    editedItem.date = this.normalizeDate(item.date);

    // Si projectId es un objeto (populado), extraer el _id
    if (
      editedItem.projectId &&
      typeof editedItem.projectId === 'object' &&
      '_id' in editedItem.projectId &&
      editedItem.projectId._id
    ) {
      editedItem.projectId = editedItem.projectId._id;
    }

    // Si el proyecto ha sido eliminado, limpiar el projectId para que el usuario pueda seleccionar uno nuevo
    if (editedItem.projectId && typeof editedItem.projectId === 'string') {
      const projectExists = this.projects().some((p) => p.value === editedItem.projectId);
      if (!projectExists) {
        // El proyecto ya no existe, establecer a string vacío para que el usuario seleccione uno nuevo
        editedItem.projectId = '';
      }
    }

    this.editing.set(editedItem);
    this.showDialog.set(true);
    return;
  }

  closeDialog() {
    // Limpiar URLs de blob antes de limpiar los arrays
    this.cleanupPendingUrls();

    this.pendingAudio.set([]);
    this.pendingVideo.set([]);
    this.pendingPhoto.set([]);
    this.pendingDocuments.set([]);
    this.showDialog.set(false);
  }

  // Limpiar todas las URLs de blob pendientes
  private cleanupPendingUrls() {
    this.pendingAudioUrlCache.forEach((url) => URL.revokeObjectURL(url));
    this.pendingVideoUrlCache.forEach((url) => URL.revokeObjectURL(url));
    this.pendingPhotoUrlCache.forEach((url) => URL.revokeObjectURL(url));

    this.pendingAudioUrlCache.clear();
    this.pendingVideoUrlCache.clear();
    this.pendingPhotoUrlCache.clear();
  }

  // Helper para convertir string a array (compatibilidad hacia atrás)
  normalizeToArray(value: string | string[] | null | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  // Eliminar archivos pendientes
  removePendingAudio(index: number) {
    const current = this.pendingAudio();
    const fileToRemove = current[index];

    // Limpiar URL del archivo removido
    if (fileToRemove && this.pendingAudioUrlCache.has(fileToRemove)) {
      const url = this.pendingAudioUrlCache.get(fileToRemove)!;
      URL.revokeObjectURL(url);
      this.pendingAudioUrlCache.delete(fileToRemove);
    }

    const updated = current.filter((_, i) => i !== index);
    this.pendingAudio.set(updated);
  }

  removePendingVideo(index: number) {
    const current = this.pendingVideo();
    const fileToRemove = current[index];

    if (fileToRemove && this.pendingVideoUrlCache.has(fileToRemove)) {
      const url = this.pendingVideoUrlCache.get(fileToRemove)!;
      URL.revokeObjectURL(url);
      this.pendingVideoUrlCache.delete(fileToRemove);
    }

    const updated = current.filter((_, i) => i !== index);
    this.pendingVideo.set(updated);
  }

  removePendingPhoto(index: number) {
    const current = this.pendingPhoto();
    const fileToRemove = current[index];

    if (fileToRemove && this.pendingPhotoUrlCache.has(fileToRemove)) {
      const url = this.pendingPhotoUrlCache.get(fileToRemove)!;
      URL.revokeObjectURL(url);
      this.pendingPhotoUrlCache.delete(fileToRemove);
    }

    const updated = current.filter((_, i) => i !== index);
    this.pendingPhoto.set(updated);
  }

  // Abrir modal de visualización de medios
  openMediaModal(type: 'audio' | 'video' | 'photo', urls: string[], currentIndex = 0) {
    this.mediaModalType.set(type);
    this.mediaModalUrls.set(urls);
    this.mediaModalCurrentIndex.set(currentIndex);
    this.mediaModalUrl.set(urls[currentIndex] || '');
    this.showMediaModal.set(true);
  }

  // Verificar si la URL actual es de un archivo pendiente
  isCurrentMediaPending(): boolean {
    const currentUrl = this.mediaModalUrl();
    if (!currentUrl) return false;

    // Verificar si está en los URLs de pendientes
    const type = this.mediaModalType();
    if (type === 'audio') {
      return this.pendingAudioUrls().includes(currentUrl);
    } else if (type === 'video') {
      return this.pendingVideoUrls().includes(currentUrl);
    } else if (type === 'photo') {
      return this.pendingPhotoUrls().includes(currentUrl);
    }
    return false;
  }

  // Eliminar el archivo actual desde el modal
  removeCurrentMediaFromModal() {
    const currentUrl = this.mediaModalUrl();
    const type = this.mediaModalType();

    if (!currentUrl || !type) return;

    const isPending = this.isCurrentMediaPending();

    if (isPending) {
      // Confirmar eliminación de archivo pendiente
      this.confirmationService.confirm({
        message: `¿Está seguro de que desea eliminar este ${
          type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'foto'
        }?`,
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        accept: () => {
          // Encontrar el índice correcto en el array de archivos usando la URL actual
          let fileIndex = -1;
          if (type === 'audio') {
            const files = this.pendingAudio();
            const urls = this.pendingAudioUrls();
            // Buscar el índice en las URLs que coincida con la URL actual
            fileIndex = urls.findIndex((url) => url === currentUrl);
            if (fileIndex >= 0 && fileIndex < files.length) {
              this.removePendingAudio(fileIndex);
              // Actualizar modal con nuevas URLs de pendientes (después de que se actualice el signal)
              setTimeout(() => {
                const newUrls = this.pendingAudioUrls();
                this.updateModalUrls(newUrls, type);
              }, 0);
            }
          } else if (type === 'video') {
            const files = this.pendingVideo();
            const urls = this.pendingVideoUrls();
            fileIndex = urls.findIndex((url) => url === currentUrl);
            if (fileIndex >= 0 && fileIndex < files.length) {
              this.removePendingVideo(fileIndex);
              setTimeout(() => {
                const newUrls = this.pendingVideoUrls();
                this.updateModalUrls(newUrls, type);
              }, 0);
            }
          } else if (type === 'photo') {
            const files = this.pendingPhoto();
            const urls = this.pendingPhotoUrls();
            fileIndex = urls.findIndex((url) => url === currentUrl);
            if (fileIndex >= 0 && fileIndex < files.length) {
              this.removePendingPhoto(fileIndex);
              setTimeout(() => {
                const newUrls = this.pendingPhotoUrls();
                this.updateModalUrls(newUrls, type);
              }, 0);
            }
          }

          if (fileIndex === -1) {
            this.toastError('No se pudo encontrar el archivo para eliminar');
          }
        },
      });
    } else {
      // Eliminar archivo guardado (ya tiene confirmación interna)
      if (type === 'audio') {
        this.removeAudioFromEditing(currentUrl);
      } else if (type === 'video') {
        this.removeVideoFromEditing(currentUrl);
      } else if (type === 'photo') {
        this.removePhotoFromEditing(currentUrl);
      }
    }
  }

  // Actualizar URLs del modal después de eliminar
  private updateModalUrls(newUrls: string[], type: 'audio' | 'video' | 'photo') {
    if (!this.showMediaModal() || this.mediaModalType() !== type) return;

    if (newUrls.length === 0) {
      this.closeMediaModal();
    } else {
      const currentIndex = this.mediaModalCurrentIndex();
      const newIndex = currentIndex >= newUrls.length ? newUrls.length - 1 : currentIndex;
      this.mediaModalUrls.set(newUrls);
      this.mediaModalCurrentIndex.set(newIndex);
      this.mediaModalUrl.set(newUrls[newIndex] || '');
    }
  }

  closeMediaModal() {
    this.showMediaModal.set(false);
    this.mediaModalType.set(null);
    this.mediaModalUrl.set('');
    this.mediaModalUrls.set([]);
    this.mediaModalCurrentIndex.set(0);
  }

  nextMedia() {
    const urls = this.mediaModalUrls();
    const currentIndex = this.mediaModalCurrentIndex();
    if (currentIndex < urls.length - 1) {
      this.mediaModalCurrentIndex.set(currentIndex + 1);
      this.mediaModalUrl.set(urls[currentIndex + 1]);
    }
  }

  previousMedia() {
    const currentIndex = this.mediaModalCurrentIndex();
    if (currentIndex > 0) {
      this.mediaModalCurrentIndex.set(currentIndex - 1);
      const urls = this.mediaModalUrls();
      this.mediaModalUrl.set(urls[currentIndex - 1]);
    }
  }

  hasNextMedia(): boolean {
    const urls = this.mediaModalUrls();
    const currentIndex = this.mediaModalCurrentIndex();
    return currentIndex < urls.length - 1;
  }

  hasPreviousMedia(): boolean {
    const currentIndex = this.mediaModalCurrentIndex();
    return currentIndex > 0;
  }

  viewItem(item: DailyReport) {
    // Normalizar la fecha para que se muestre correctamente
    const normalizedItem = {
      ...item,
      date: this.normalizeDate(item.date),
    };
    this.viewing.set(normalizedItem);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  onEditChange(field: keyof DailyReport, value: DailyReport[keyof DailyReport]) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  onDateChange(value: Date | Date[] | null) {
    if (Array.isArray(value)) {
      return;
    }

    if (value instanceof Date) {
      // Guardar fecha en formato local YYYY-MM-DD para evitar desfase por zona horaria
      const y = value.getFullYear();
      const m = (value.getMonth() + 1).toString().padStart(2, '0');
      const d = value.getDate().toString().padStart(2, '0');
      this.onEditChange('date', `${y}-${m}-${d}`);
    } else if (value === null) {
      this.onEditChange('date', '');
    }
  }

  // Captura de archivos (mobile friendly) - múltiples archivos
  async onAudioSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const reportId = this.editing()?._id;
    if (!reportId) {
      // Si no hay reporte, agregar a pendientes (comportamiento anterior)
      this.pendingAudio.set([...this.pendingAudio(), ...files]);
      input.value = '';
      return;
    }

    try {
      // Paso 1: Generar Presigned URLs para todos los archivos
      this.messageService.add({
        severity: 'info',
        summary: 'Preparando subida',
        detail: 'Generando URLs de subida...',
        life: 3000,
      });

      const presignedUrls = await firstValueFrom(
        this.dailyExpensesApi.generateMultipleAudioPresignedUrls(
          reportId,
          files.map((file) => ({
            fileName: file.name,
            contentType: file.type || 'audio/mpeg',
          })),
          3600 // 1 hora de expiración
        )
      );

      // Paso 2: Subir todos los archivos directamente a S3 en paralelo
      this.messageService.add({
        severity: 'info',
        summary: 'Subiendo audios',
        detail: `Subiendo ${files.length} audio(s) directamente a S3...`,
        life: 5000,
      });

      await Promise.all(
        presignedUrls.map(async (presigned, index) => {
          try {
            const file = files[index];
            const contentType = file.type || 'audio/mpeg';
            await this.dailyExpensesApi.uploadFileToS3(presigned.presignedUrl, file, contentType);

            // Paso 3: Confirmar subida al backend
            const updated = await firstValueFrom(
              this.dailyExpensesApi.confirmAudioUpload(reportId, presigned.publicUrl)
            );

            this.editing.set(this.normalizeDailyReport(updated));

            this.messageService.add({
              severity: 'success',
              summary: 'Audio subido',
              detail: `${file.name} subido exitosamente`,
              life: 3000,
            });
          } catch (error) {
            console.error(`Error al subir audio ${files[index].name}:`, error);
            this.toastError(
              `No se pudo subir el audio: ${files[index].name}. ${(error as Error).message}`
            );
          }
        })
      );
    } catch (error) {
      console.error('Error al procesar audios:', error);
      this.toastError(`Error al procesar los audios. ${(error as Error).message}`);
    }

    input.value = '';
  }

  // Grabación de audio con botón presionado (mobile)
  async startRecordingAudio(event: MouseEvent | TouchEvent) {
    // Prevenir que se active el evento click si existe
    if (event.cancelable) {
      event.preventDefault();
    }

    if (this.isRecordingAudio()) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioStream = stream;
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });

        const reportId = this.editing()?._id;
        if (reportId) {
          // Usar Presigned URL para subir el audio
          try {
            const presignedResponse = await firstValueFrom(
              this.dailyExpensesApi.generateAudioPresignedUrl(
                reportId,
                audioFile.name,
                audioFile.type,
                3600
              )
            );

            await this.dailyExpensesApi.uploadFileToS3(
              presignedResponse.presignedUrl,
              audioFile,
              audioFile.type
            );

            const updated = await firstValueFrom(
              this.dailyExpensesApi.confirmAudioUpload(reportId, presignedResponse.publicUrl)
            );

            this.editing.set(this.normalizeDailyReport(updated));

            this.messageService.add({
              severity: 'success',
              summary: 'Audio grabado',
              detail: 'Audio grabado y subido exitosamente',
              life: 3000,
            });
          } catch (error) {
            this.toastError(`No se pudo subir el audio. ${(error as Error).message}`);
          }
        } else {
          // Agregar a pendientes si no hay reporte
          this.pendingAudio.set([...this.pendingAudio(), audioFile]);
        }

        // Detener todos los tracks del stream
        if (this.audioStream) {
          this.audioStream.getTracks().forEach((track) => track.stop());
          this.audioStream = null;
        }
        this.mediaRecorder = null;
      };

      this.mediaRecorder.start();
      this.isRecordingAudio.set(true);
      this.recordingTime.set(0);

      // Iniciar contador de tiempo
      this.recordingInterval = setInterval(() => {
        this.recordingTime.set(this.recordingTime() + 1);
      }, 1000);
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      this.toastError(
        'No se pudo acceder al micrófono. Por favor, permite el acceso al micrófono.'
      );
    }
  }

  stopRecordingAudio(event: MouseEvent | TouchEvent) {
    if (event.cancelable) {
      event.preventDefault();
    }

    if (!this.isRecordingAudio() || !this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.isRecordingAudio.set(false);

    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    this.recordingTime.set(0);
  }

  // Formatear tiempo de grabación
  formatRecordingTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async onVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const reportId = this.editing()?._id;
    if (!reportId) {
      // Si no hay reporte, agregar a pendientes (comportamiento anterior)
      this.pendingVideo.set([...this.pendingVideo(), ...files]);
      input.value = '';
      return;
    }

    // Mostrar mensaje de compresión si hay archivos grandes
    const hasLargeFiles = files.some((f) => f.size > 5 * 1024 * 1024); // > 5MB
    if (hasLargeFiles) {
      this.messageService.add({
        severity: 'info',
        summary: 'Comprimiendo videos',
        detail: 'Los videos grandes se están comprimiendo para reducir su tamaño...',
        life: 5000,
      });
    }

    try {
      // Paso 1: Generar Presigned URLs PRIMERO (rápido, solo envía metadata)
      // CRÍTICO: Esta llamada debe ejecutarse ANTES de cualquier compresión
      // para evitar bloqueos con archivos grandes
      this.messageService.add({
        severity: 'info',
        summary: 'Preparando subida',
        detail: 'Generando URLs de subida...',
        life: 3000,
      });

      let presignedUrls;
      try {
        presignedUrls = await firstValueFrom(
          this.dailyExpensesApi.generateMultipleVideoPresignedUrls(
            reportId,
            files.map((file) => ({
              fileName: file.name,
              contentType: this.getVideoContentType(file),
            })),
            900 // 15 minutos para dar tiempo a la compresión y subida de archivos pesados
          )
        );
      } catch (presignedError) {
        throw new Error(
          `No se pudieron generar las URLs de subida. Por favor, intenta nuevamente. ${
            presignedError instanceof Error ? presignedError.message : 'Error desconocido'
          }`
        );
      }

      // Paso 2: Comprimir videos DESPUÉS de obtener las Presigned URLs (opcional para archivos grandes)
      // Para archivos muy grandes (>100MB), saltar la compresión para evitar bloqueos
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          const shouldCompress = file.size <= 100 * 1024 * 1024; // Solo comprimir si es menor a 100MB

          if (!shouldCompress) {
            return file;
          }

          try {
            // Agregar timeout a la compresión (5 minutos máximo)
            const compressionPromise = compressVideo(file, {
              maxWidth: 1280,
              maxHeight: 720,
              bitrate: 2000000, // 2Mbps
              // maxSizeMB removido para permitir archivos grandes
              maxFPS: 30,
              quality: 0.7,
            });

            const timeoutPromise = new Promise<File>((_, reject) => {
              setTimeout(() => {
                reject(new Error('Timeout: La compresión tardó más de 5 minutos'));
              }, 5 * 60 * 1000); // 5 minutos
            });

            const compressed = await Promise.race([compressionPromise, timeoutPromise]);

            if (compressed.size < file.size) {
              const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
              const compressedSizeMB = (compressed.size / (1024 * 1024)).toFixed(2);
              const reduction = (((file.size - compressed.size) / file.size) * 100).toFixed(1);

              this.messageService.add({
                severity: 'success',
                summary: 'Video comprimido',
                detail: `${file.name}: ${originalSizeMB}MB → ${compressedSizeMB}MB (${reduction}% reducción)`,
                life: 4000,
              });

              return compressed;
            }

            return file;
          } catch {
            // Si falla la compresión, usar el archivo original
            return file;
          }
        })
      );

      // Paso 3: Subir todos los archivos directamente a S3 en paralelo
      this.messageService.add({
        severity: 'info',
        summary: 'Subiendo videos',
        detail: `Subiendo ${processedFiles.length} video(s) directamente a S3...`,
        life: 5000,
      });

      await Promise.all(
        presignedUrls.map(async (presigned, index) => {
          try {
            const file = processedFiles[index];
            const contentType = this.getVideoContentType(file);
            await this.dailyExpensesApi.uploadFileToS3(presigned.presignedUrl, file, contentType);

            // Paso 4: Confirmar subida al backend
            const updated = await firstValueFrom(
              this.dailyExpensesApi.confirmVideoUpload(reportId, presigned.publicUrl)
            );

            this.editing.set(this.normalizeDailyReport(updated));

            this.messageService.add({
              severity: 'success',
              summary: 'Video subido',
              detail: `${file.name} subido exitosamente`,
              life: 3000,
            });
          } catch (error) {
            console.error(`Error al subir video ${processedFiles[index].name}:`, error);
            this.toastError(
              `No se pudo subir el video: ${processedFiles[index].name}. ${
                (error as Error).message
              }`
            );
          }
        })
      );
    } catch (error) {
      console.error('Error al procesar videos:', error);
      this.toastError(`Error al procesar los videos. ${(error as Error).message}`);
    }

    input.value = '';
  }

  async onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    if (this.editing()?._id) {
      // Subir múltiples archivos usando Presigned URLs
      // La compresión se hará dentro de uploadPhotoPromise después de obtener la Presigned URL
      const reportId = this.editing()!._id!;

      for (const file of files) {
        try {
          await this.uploadPhotoPromise(reportId, file);
          // Recargar el reporte para obtener la foto actualizada
          const updated = await firstValueFrom(this.dailyExpensesApi.getById(reportId));
          this.editing.set(this.normalizeDailyReport(updated));
        } catch {
          this.toastError(`No se pudo subir la foto: ${file.name}. Ver consola para más detalles.`);
        }
      }
    } else {
      // Agregar a pendientes (sin comprimir, se comprimirá al subir)
      this.pendingPhoto.set([...this.pendingPhoto(), ...files]);
    }

    input.value = '';
  }

  async onDocumentsSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    if (this.editing()?._id) {
      // Subir usando Presigned URLs
      const reportId = this.editing()!._id!;

      try {
        await this.uploadDocumentsPromise(reportId, files);
        // Recargar el reporte para obtener los documentos actualizados
        const updated = await firstValueFrom(this.dailyExpensesApi.getById(reportId));
        this.editing.set(this.normalizeDailyReport(updated));
        console.log('Documentos subidos exitosamente:', { count: files.length });
      } catch (error) {
        console.error('Error al subir documentos:', {
          reportId,
          fileCount: files.length,
          error,
        });
        this.toastError('Error al subir algunos documentos. Ver consola para más detalles.');
      }
    } else {
      this.pendingDocuments.set([...this.pendingDocuments(), ...files]);
    }
    input.value = '';
  }

  removeDocumentFromEditing(index: number) {
    const current = this.editing();
    if (!current || !current.documents) return;

    const documentToRemove = current.documents[index];
    const documentName = documentToRemove?.split('/').pop() || 'este documento';

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el documento "${documentName}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        const updatedDocuments = current.documents ? [...current.documents] : [];
        updatedDocuments.splice(index, 1);
        this.editing.set({ ...current, documents: updatedDocuments });

        // Si el reporte ya existe en el servidor, eliminar el documento también
        if (current._id && documentToRemove) {
          this.dailyExpensesApi.deleteDocument(current._id, documentToRemove).subscribe({
            next: (updated) => this.editing.set(this.normalizeDailyReport(updated)),
            error: () => {
              this.toastError('No se pudo eliminar el documento');
              // Revertir el cambio local si falla
              this.editing.set({ ...current, documents: current.documents });
            },
          });
        }
      },
    });
  }

  removeAudioFromEditing(url: string, skipConfirm = false) {
    const current = this.editing();
    if (!current) return;

    const doRemove = () => {
      const audioUrls = this.normalizeToArray(current.audioDescription);
      const updatedUrls = audioUrls.filter((u) => u !== url);

      // Actualizar localmente
      this.editing.set({
        ...current,
        audioDescription: updatedUrls.length > 0 ? updatedUrls : null,
      });

      // Actualizar modal inmediatamente con las URLs actualizadas
      this.updateModalAfterDelete('audio', updatedUrls);

      // Si el reporte existe en el servidor, eliminar también
      if (current._id) {
        this.dailyExpensesApi.deleteAudio(current._id, url).subscribe({
          next: (updated) => {
            // Actualizar con la respuesta del servidor
            const serverUrls = this.normalizeToArray(updated.audioDescription);
            this.editing.set(this.normalizeDailyReport(updated));
            // Actualizar modal con las URLs del servidor
            this.updateModalAfterDelete('audio', serverUrls);
          },
          error: () => {
            this.toastError('No se pudo eliminar el audio');
            // Revertir el cambio local
            this.editing.set({ ...current, audioDescription: current.audioDescription });
            // Revertir el modal también
            const originalUrls = this.normalizeToArray(current.audioDescription);
            this.updateModalAfterDelete('audio', originalUrls);
          },
        });
      }
    };

    if (skipConfirm) {
      doRemove();
    } else {
      this.confirmationService.confirm({
        message: '¿Está seguro de que desea eliminar este audio?',
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        accept: doRemove,
      });
    }
  }

  removeVideoFromEditing(url: string, skipConfirm = false) {
    const current = this.editing();
    if (!current) return;

    const doRemove = () => {
      const videoUrls = this.normalizeToArray(current.videoDescription);
      const updatedUrls = videoUrls.filter((u) => u !== url);

      this.editing.set({
        ...current,
        videoDescription: updatedUrls.length > 0 ? updatedUrls : null,
      });

      // Actualizar modal inmediatamente con las URLs actualizadas
      this.updateModalAfterDelete('video', updatedUrls);

      if (current._id) {
        this.dailyExpensesApi.deleteVideo(current._id, url).subscribe({
          next: (updated) => {
            // Actualizar con la respuesta del servidor
            const serverUrls = this.normalizeToArray(updated.videoDescription);
            this.editing.set(this.normalizeDailyReport(updated));
            // Actualizar modal con las URLs del servidor
            this.updateModalAfterDelete('video', serverUrls);
          },
          error: () => {
            this.toastError('No se pudo eliminar el video');
            // Revertir el cambio local
            this.editing.set({ ...current, videoDescription: current.videoDescription });
            // Revertir el modal también
            const originalUrls = this.normalizeToArray(current.videoDescription);
            this.updateModalAfterDelete('video', originalUrls);
          },
        });
      }
    };

    if (skipConfirm) {
      doRemove();
    } else {
      this.confirmationService.confirm({
        message: '¿Está seguro de que desea eliminar este video?',
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        accept: doRemove,
      });
    }
  }

  removePhotoFromEditing(url: string, skipConfirm = false) {
    const current = this.editing();
    if (!current) return;

    const doRemove = () => {
      const photoUrls = this.normalizeToArray(current.photoDescription);
      const updatedUrls = photoUrls.filter((u) => u !== url);

      this.editing.set({
        ...current,
        photoDescription: updatedUrls.length > 0 ? updatedUrls : null,
      });

      // Actualizar modal inmediatamente con las URLs actualizadas
      this.updateModalAfterDelete('photo', updatedUrls);

      if (current._id) {
        this.dailyExpensesApi.deletePhoto(current._id, url).subscribe({
          next: (updated) => {
            // Actualizar con la respuesta del servidor
            const serverUrls = this.normalizeToArray(updated.photoDescription);
            this.editing.set(this.normalizeDailyReport(updated));
            // Actualizar modal con las URLs del servidor
            this.updateModalAfterDelete('photo', serverUrls);
          },
          error: () => {
            this.toastError('No se pudo eliminar la foto');
            // Revertir el cambio local
            this.editing.set({ ...current, photoDescription: current.photoDescription });
            // Revertir el modal también
            const originalUrls = this.normalizeToArray(current.photoDescription);
            this.updateModalAfterDelete('photo', originalUrls);
          },
        });
      }
    };

    if (skipConfirm) {
      doRemove();
    } else {
      this.confirmationService.confirm({
        message: '¿Está seguro de que desea eliminar esta foto?',
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        accept: doRemove,
      });
    }
  }

  // Actualizar el modal después de eliminar un archivo guardado
  private updateModalAfterDelete(type: 'audio' | 'video' | 'photo', newUrls: string[]) {
    if (!this.showMediaModal() || this.mediaModalType() !== type) return;

    // Usar el método compartido para actualizar
    this.updateModalUrls(newUrls, type);
  }

  save() {
    const item = this.editing();
    if (!item) return;

    const errors = this.validateForm(item);
    if (errors.length) {
      errors.forEach((e) => this.toastError(e));
      return;
    }

    const payload: Partial<DailyReport> = {
      date: item.date,
      time: item.time,
      description: item.description.trim(),
      projectId:
        item.projectId && typeof item.projectId === 'string' && item.projectId.trim() !== ''
          ? item.projectId.trim()
          : undefined,
    };

    const upsert$ = item._id
      ? this.dailyExpensesApi.update(item._id, payload)
      : this.dailyExpensesApi.create({
          ...payload,
          userId:
            typeof item.userId === 'object' && item.userId && '_id' in item.userId
              ? (item.userId as { _id: string })._id
              : (item.userId as string),
          documents: [],
        } as DailyReport);

    upsert$.subscribe({
      next: (saved) => {
        const id = saved._id!;
        // Si había archivos pendientes (nuevo), súbelos
        const tasks: Promise<unknown>[] = [];

        // Subir múltiples audios
        this.pendingAudio().forEach((file) => {
          tasks.push(this.uploadAudioPromise(id, file));
        });

        // Subir múltiples videos
        this.pendingVideo().forEach((file) => {
          tasks.push(this.uploadVideoPromise(id, file));
        });

        // Subir múltiples fotos
        this.pendingPhoto().forEach((file) => {
          tasks.push(this.uploadPhotoPromise(id, file));
        });

        // Subir documentos
        if (this.pendingDocuments().length)
          tasks.push(this.uploadDocumentsPromise(id, this.pendingDocuments()));

        if (tasks.length) {
          // Subir archivos con límite de concurrencia para evitar saturar el servidor
          this.uploadFilesWithConcurrencyLimit(tasks, id).finally(() => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Reporte guardado',
            });
            this.load();
            this.closeDialog();
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte guardado',
          });
          this.load();
          this.closeDialog();
        }
      },
      error: (error) => this.toastError(this.getErrorMessage(error)),
    });
  }

  private async uploadAudioPromise(id: string, file: File): Promise<unknown> {
    try {
      // Paso 1: Generar Presigned URL
      const presignedResponse = await firstValueFrom(
        this.dailyExpensesApi.generateAudioPresignedUrl(
          id,
          file.name,
          file.type || 'audio/mpeg',
          3600 // 1 hora
        )
      );

      // Paso 2: Subir directamente a S3 (usar el mismo contentType que se usó para generar la Presigned URL)
      const contentType = file.type || 'audio/mpeg';
      await this.dailyExpensesApi.uploadFileToS3(presignedResponse.presignedUrl, file, contentType);

      // Paso 3: Confirmar subida al backend
      const response = await firstValueFrom(
        this.dailyExpensesApi.confirmAudioUpload(id, presignedResponse.publicUrl)
      );

      return response;
    } catch (error) {
      throw { type: 'audio', fileName: file.name, error };
    }
  }
  private async uploadVideoPromise(id: string, file: File): Promise<unknown> {
    try {
      // Paso 1: Generar Presigned URL PRIMERO (rápido, solo envía metadata)
      // CRÍTICO: Esta llamada debe ejecutarse ANTES de cualquier operación pesada
      // como compresión, para evitar bloqueos con archivos grandes
      let presignedResponse;
      try {
        const presignedObservable = this.dailyExpensesApi.generateVideoPresignedUrl(
          id,
          file.name, // Usar el nombre original, se actualizará después si se comprime
          this.getVideoContentType(file),
          900 // 15 minutos para dar tiempo a la compresión y subida de archivos pesados
        );

        presignedResponse = await firstValueFrom(presignedObservable);
      } catch (presignedError) {
        throw new Error(
          `No se pudo generar la URL de subida. Por favor, intenta nuevamente. ${
            presignedError instanceof Error ? presignedError.message : 'Error desconocido'
          }`
        );
      }

      // Paso 2: Comprimir video DESPUÉS de obtener la Presigned URL (opcional para archivos grandes)
      // Para archivos muy grandes (>100MB), saltar la compresión para evitar bloqueos
      let fileToUpload = file;
      const shouldCompress = file.size <= 100 * 1024 * 1024; // Solo comprimir si es menor a 100MB

      if (shouldCompress) {
        try {
          // Agregar timeout a la compresión (5 minutos máximo)
          const compressionPromise = compressVideo(file, {
            maxWidth: 1280,
            maxHeight: 720,
            bitrate: 2000000, // 2Mbps
            // maxSizeMB removido para permitir archivos grandes
            maxFPS: 30,
            quality: 0.7,
          });

          const timeoutPromise = new Promise<File>((_, reject) => {
            setTimeout(() => {
              reject(new Error('Timeout: La compresión tardó más de 5 minutos'));
            }, 5 * 60 * 1000); // 5 minutos
          });

          const compressed = await Promise.race([compressionPromise, timeoutPromise]);

          if (compressed.size < file.size) {
            fileToUpload = compressed;
          }
        } catch {
          fileToUpload = file;
        }
      } else {
        fileToUpload = file;
      }

      // Paso 3: Subir directamente a S3 (usar el mismo contentType que se usó para generar la Presigned URL)
      const contentType = this.getVideoContentType(fileToUpload);
      await this.dailyExpensesApi.uploadFileToS3(
        presignedResponse.presignedUrl,
        fileToUpload,
        contentType
      );

      // Paso 4: Confirmar subida al backend
      const response = await firstValueFrom(
        this.dailyExpensesApi.confirmVideoUpload(id, presignedResponse.publicUrl)
      );

      return response;
    } catch (error) {
      throw { type: 'video', fileName: file.name, error };
    }
  }
  private async uploadPhotoPromise(id: string, file: File): Promise<unknown> {
    // Asegurar que los estados se establezcan ANTES de cualquier operación
    this.uploadingFiles.set(true);
    this.uploadingFileType.set('photo');
    this.uploadingFileName.set(file.name);
    this.uploadProgress.set(0);

    try {
      // Paso 1: Generar Presigned URL PRIMERO (rápido, solo envía metadata)
      // Esto asegura que el servicio se llame inmediatamente, incluso con archivos pesados
      // IMPORTANTE: Esta llamada se hace ANTES de cualquier procesamiento del archivo
      // para evitar que operaciones pesadas bloqueen la llamada HTTP
      this.uploadProgress.set(5);

      let presignedResponse;
      try {
        const presignedObservable = this.dailyExpensesApi.generatePhotoPresignedUrl(
          id,
          file.name, // Usar el nombre original, se actualizará después si se comprime
          file.type || 'image/jpeg',
          900 // 15 minutos para dar tiempo a la compresión y subida de archivos pesados
        );

        presignedResponse = await firstValueFrom(presignedObservable);
      } catch (presignedError) {
        throw new Error(
          `No se pudo generar la URL de subida. Por favor, intenta nuevamente. ${
            presignedError instanceof Error ? presignedError.message : 'Error desconocido'
          }`
        );
      }

      // Paso 2: Comprimir la imagen DESPUÉS de obtener la Presigned URL
      // Esto permite que el usuario vea progreso desde el principio
      this.uploadProgress.set(10);
      let fileToUpload: File;
      try {
        const compressedFile = await compressImage(file);
        if (compressedFile.size < file.size) {
          fileToUpload = compressedFile;
        } else {
          fileToUpload = file;
        }
      } catch {
        fileToUpload = file;
      }

      // Paso 2: Subir directamente a S3 con progreso
      this.uploadProgress.set(30);
      await this.uploadFileToS3WithProgress(
        presignedResponse.presignedUrl,
        fileToUpload,
        fileToUpload.type || 'image/jpeg',
        (progress) => {
          // Mapear progreso de 30% a 90% (30% inicial + 60% de subida)
          this.uploadProgress.set(30 + progress * 0.6);
        }
      );

      // Paso 3: Confirmar subida al backend
      this.uploadProgress.set(95);
      const response = await firstValueFrom(
        this.dailyExpensesApi.confirmPhotoUpload(id, presignedResponse.publicUrl)
      );

      this.uploadProgress.set(100);
      return response;
    } catch (error) {
      throw { type: 'photo', fileName: file.name, error };
    } finally {
      this.uploadingFiles.set(false);
      this.uploadingFileType.set(null);
      this.uploadingFileName.set(null);
      this.uploadProgress.set(0);
    }
  }

  // Método antiguo (deprecado) - mantenido para referencia
  private uploadPhotoPromise_OLD(id: string, file: File) {
    return new Promise((resolve, reject) => {
      // Comprimir la imagen antes de subir, usando el original si falla
      compressImage(file)
        .then((compressedFile) => {
          console.log('Subiendo foto:', {
            fileName: compressedFile.name,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            compressionRatio: ((1 - compressedFile.size / file.size) * 100).toFixed(1) + '%',
            reportId: id,
          });
          return compressedFile;
        })
        .catch(() => {
          return file; // Fallback al archivo original
        })
        .then((fileToUpload) => {
          this.dailyExpensesApi.uploadPhoto(id, fileToUpload).subscribe({
            next: (response) => {
              resolve(response);
            },
            error: (error) => {
              reject({ type: 'photo', fileName: fileToUpload.name, error });
            },
          });
        })
        .catch((error) => {
          reject({ type: 'photo', fileName: file.name, error });
        });
    });
  }
  private async uploadDocumentsPromise(id: string, files: File[]): Promise<unknown> {
    if (files.length === 0) {
      return Promise.resolve(true);
    }

    try {
      this.uploadingFiles.set(true);
      this.uploadingFileType.set('document');
      this.uploadingFileName.set(`${files.length} archivo(s)`);
      this.uploadProgress.set(0);

      // Paso 1: Generar Presigned URLs para todos los documentos PRIMERO (rápido, solo envía metadata)
      // Esto asegura que el servicio se llame inmediatamente, incluso con archivos pesados
      this.uploadProgress.set(10);

      let presignedResponses;
      try {
        presignedResponses = await firstValueFrom(
          this.dailyExpensesApi.generateMultipleDocumentPresignedUrls(
            id,
            files.map((f) => ({
              fileName: f.name,
              contentType: f.type || 'application/octet-stream',
            })),
            900 // 15 minutos para dar tiempo a la subida de archivos pesados
          )
        );
      } catch (presignedError) {
        throw new Error(
          `No se pudieron generar las URLs de subida. Por favor, intenta nuevamente. ${
            presignedError instanceof Error ? presignedError.message : 'Error desconocido'
          }`
        );
      }

      // Paso 2: Subir todos los documentos directamente a S3
      const totalFiles = files.length;
      const progressPerFile = 80 / totalFiles; // 80% del progreso total para subidas
      let currentProgress = 10;

      const uploadPromises = presignedResponses.map(async (presignedResponse, index) => {
        const file = files[index];
        const fileStartProgress = currentProgress;

        await this.uploadFileToS3WithProgress(
          presignedResponse.presignedUrl,
          file,
          file.type || 'application/octet-stream',
          (fileProgress) => {
            // Progreso individual del archivo
            const fileProgressValue = fileStartProgress + fileProgress * progressPerFile;
            this.uploadProgress.set(Math.min(fileProgressValue, 90));
          }
        );

        // Confirmar subida al backend
        await firstValueFrom(
          this.dailyExpensesApi.confirmDocumentUpload(id, presignedResponse.publicUrl)
        );

        currentProgress += progressPerFile;
        console.log('Documento subido exitosamente:', {
          fileName: file.name,
          reportId: id,
        });
      });

      await Promise.all(uploadPromises);

      this.uploadProgress.set(100);
      console.log('Todos los documentos subidos exitosamente:', {
        count: files.length,
        reportId: id,
      });

      return true;
    } catch (error) {
      console.error('Error al subir documentos:', {
        count: files.length,
        error,
        reportId: id,
      });
      throw { type: 'document', error };
    } finally {
      this.uploadingFiles.set(false);
      this.uploadingFileType.set(null);
      this.uploadingFileName.set(null);
      this.uploadProgress.set(0);
    }
  }

  /**
   * Sube un archivo a S3 con seguimiento de progreso
   */
  private async uploadFileToS3WithProgress(
    presignedUrl: string,
    file: File,
    contentType: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          const errorText = xhr.responseText || xhr.statusText;
          reject(new Error(`Error al subir archivo a S3: ${xhr.status} ${errorText}`));
        }
      });

      xhr.addEventListener('error', () => {
        const currentOrigin = window.location.origin;
        reject(
          new Error(
            `Error de red/CORS: No se pudo conectar a S3 desde "${currentOrigin}". ` +
              `Verifica que el bucket tenga configurado CORS para permitir este origen.`
          )
        );
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(file);
    });
  }

  /**
   * Sube archivos con límite de concurrencia para evitar saturar el servidor
   * @param tasks Array de promesas de subida
   * @param reportId ID del reporte para logging
   * @returns Promise que se resuelve cuando todas las subidas terminan
   */
  private async uploadFilesWithConcurrencyLimit(
    tasks: Promise<unknown>[],
    reportId: string
  ): Promise<void> {
    const CONCURRENT_LIMIT = 3; // Máximo 3 subidas simultáneas
    const results: { status: string; fileName?: string; type?: string; error?: unknown }[] = [];

    // Procesar en lotes con límite de concurrencia
    for (let i = 0; i < tasks.length; i += CONCURRENT_LIMIT) {
      const batch = tasks.slice(i, i + CONCURRENT_LIMIT);
      const batchResults = await Promise.allSettled(batch);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push({ status: 'fulfilled' });
        } else {
          const errorInfo = result.reason as
            | { fileName?: string; type?: string; error?: unknown }
            | undefined;
          results.push({
            status: 'rejected',
            fileName: errorInfo?.fileName || 'desconocido',
            type: errorInfo?.type || 'archivo',
            error: errorInfo?.error || result.reason,
          });

          // Mostrar error específico al usuario
          const errorMsg = this.getErrorMessage(errorInfo?.error || result.reason);
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: `No se pudo subir ${errorInfo?.type || 'archivo'}: ${
              errorInfo?.fileName || 'desconocido'
            }. ${errorMsg}`,
            life: 5000,
          });
        }
      });

      // Pequeña pausa entre lotes para no saturar el servidor
      if (i + CONCURRENT_LIMIT < tasks.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Resumen final
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `Subida completada: ${successful} exitosos, ${failed} fallidos de ${tasks.length} totales`,
      {
        reportId,
        totalResults: results.length,
      }
    );

    if (failed > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: `Se subieron ${successful} de ${tasks.length} archivos. ${failed} archivo(s) no se pudieron subir.`,
        life: 7000,
      });
    }
  }

  // Eliminado: lógica de observaciones y compras

  remove(item: DailyReport) {
    if (!item._id) return;
    if (confirm('¿Estás seguro de eliminar este reporte diario?')) {
      this.dailyExpensesApi.delete(item._id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte diario eliminado correctamente',
          });
          this.load();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }
  // Obtener la fecha como Date para el datepicker
  getEditDate = computed(() => {
    const editing = this.editing();
    if (!editing || !editing.date) return null;
    try {
      // Construir Date desde componentes locales para evitar conversiones a UTC
      const [year, month, day] = editing.date.split('-').map((x) => parseInt(x, 10));
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    } catch {
      return null;
    }
  });

  getProjectName(projectId: string | Project | null | undefined): string {
    if (!projectId) {
      return 'Sin proyecto';
    }

    // Si projectId es un objeto Project (populado), usar el nombre directamente
    if (typeof projectId === 'object' && 'name' in projectId) {
      return projectId.name || 'Sin proyecto';
    }

    // Si projectId es un string, buscar en la lista de proyectos
    if (typeof projectId === 'string') {
      const project = this.projects().find((p) => p.value === projectId);
      return project?.label || 'Sin proyecto';
    }

    return 'Sin proyecto';
  }

  /**
   * Obtiene el label del proyecto seleccionado para mostrar en el selector
   * @param projectId ID del proyecto seleccionado o objeto Project
   * @returns Label del proyecto o string vacío
   */
  getSelectedProjectLabel(projectId: string | Project | null | undefined): string {
    if (!projectId) return '';

    // Si projectId es un objeto Project (populado), usar el nombre directamente
    if (typeof projectId === 'object' && 'name' in projectId) {
      return projectId.name || '';
    }

    // Si projectId es un string, buscar en la lista de proyectos
    if (typeof projectId === 'string') {
      const project = this.projects().find((p) => p.value === projectId);
      return project?.label || '';
    }

    return '';
  }

  // Verificar si el proyecto en edición ha sido eliminado
  isProjectDeleted(): boolean {
    const editing = this.editing();
    if (!editing || !editing._id) {
      return false;
    }
    if (!editing.projectId) {
      return true;
    }

    // Si projectId es un objeto, no está eliminado
    if (typeof editing.projectId === 'object') {
      return false;
    }

    // Si projectId es un string, verificar si existe en la lista de proyectos
    if (typeof editing.projectId === 'string') {
      const projectExists = this.projects().some((p) => p.value === editing.projectId);
      return !projectExists;
    }

    return true;
  }

  // Verificar si el reporte pertenece al usuario actual
  isMyReport(item: DailyReport): boolean {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser || !currentUser.id) {
      return false;
    }

    // Si userId es un objeto (populado), extraer el _id
    let userId: string | null = null;

    if (item.userId) {
      if (typeof item.userId === 'object' && '_id' in item.userId) {
        // El userId es un objeto, extraer el _id
        userId = (item.userId as { _id: string })._id;
      } else if (typeof item.userId === 'string') {
        // El userId es un string
        userId = item.userId;
      }
    }

    if (!userId) {
      return false;
    }

    return userId === currentUser.id;
  }

  // eliminado: lógica de observaciones; no aplica en DailyReport simplificado

  // Métodos auxiliares para documentos
  getFileIcon(url: string): string {
    // Validar que la URL existe y es una cadena válida
    if (!url || typeof url !== 'string') {
      return 'pi pi-file'; // Icono por defecto para URLs inválidas
    }

    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pi pi-file-pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'pi pi-image';
      case 'doc':
      case 'docx':
        return 'pi pi-file-word';
      case 'xls':
      case 'xlsx':
        return 'pi pi-file-excel';
      default:
        return 'pi pi-file';
    }
  }

  getFileTypeColor(url: string): string {
    // Validar que la URL existe y es una cadena válida
    if (!url || typeof url !== 'string') {
      return 'text-gray-600'; // Color por defecto para URLs inválidas
    }

    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'text-red-600';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'text-green-600';
      case 'doc':
      case 'docx':
        return 'text-blue-600';
      case 'xls':
      case 'xlsx':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  }

  viewDocument(url: string): void {
    if (!url || typeof url !== 'string') {
      return;
    }
    window.open(url, '_blank');
  }

  downloadDocument(url: string): void {
    if (!url || typeof url !== 'string') {
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'documento';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Validación
  private validateForm(item: DailyReport): string[] {
    const errors: string[] = [];

    // Fecha
    if (!item.date) {
      errors.push('La fecha es requerida');
    }

    // Hora
    if (!item.time || item.time.trim() === '') {
      errors.push('La hora es requerida');
    }

    // Descripción
    if (!item.description || item.description.trim() === '') {
      errors.push('La descripción es requerida');
    }

    // Proyecto (si se provee) debe existir
    if (item.projectId && typeof item.projectId === 'string' && item.projectId.trim() !== '') {
      const projectExists = this.projects().some((p) => p.value === item.projectId);
      if (!projectExists) {
        errors.push('El proyecto seleccionado ya no está disponible. Selecciona otro.');
      }
    }

    return errors;
  }

  // Método para obtener mensaje de error de la API
  private getErrorMessage(error: unknown): string {
    // Verificar si es un objeto con propiedades de error HTTP
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status?: number; error?: { message?: string; error?: string } };

      // Manejar errores de permisos primero
      if (httpError.status === 403) {
        if (httpError.error?.message?.includes('No puedes enviar gastos de otros usuarios')) {
          return 'No puedes enviar reportes de otros usuarios';
        }
        if (httpError.error?.message?.includes('No puedes aprobar')) {
          return 'No tienes permisos para aprobar este reporte';
        }
        return 'No tienes permisos para realizar esta acción';
      }

      // Manejar errores de validación específicos
      if (httpError.error?.message) {
        const message = httpError.error.message;

        // Traducir mensajes comunes de validación
        if (message.includes('date should not be empty')) {
          return 'La fecha es requerida';
        }
        if (message.includes('time should not be empty')) return 'La hora es requerida';
        if (message.includes('description should not be empty'))
          return 'La descripción es requerida';

        return message;
      }

      if (httpError.error?.error) {
        return httpError.error.error;
      }
    }

    // Verificar si es un objeto Error
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
    ) {
      return (error as { message: string }).message;
    }

    return 'Ha ocurrido un error inesperado';
  }

  private toastError(detail: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }

  /**
   * Detecta el tipo MIME de un video basándose en su extensión
   * Útil cuando file.type está vacío o es inválido
   */
  private getVideoContentType(file: File): string {
    // Si el archivo ya tiene un tipo MIME válido, usarlo
    if (file.type && file.type !== '' && file.type.startsWith('video/')) {
      return file.type;
    }

    // Mapeo de extensiones de video a tipos MIME
    const extensionToMime: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mpeg': 'video/mpeg',
      '.mpeg4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.3gp': 'video/3gpp',
      '.3g2': 'video/3gpp2',
    };

    // Obtener la extensión del archivo
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));

    // Buscar el tipo MIME correspondiente
    const mimeType = extensionToMime[extension];

    // Si encontramos un tipo MIME, retornarlo
    if (mimeType) {
      return mimeType;
    }

    // Fallback a video/mp4 si no se puede determinar
    return 'video/mp4';
  }
}
