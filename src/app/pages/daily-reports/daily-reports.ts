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
import { AuthService } from '../login/services/auth.service';
import { DailyReport } from '../../shared/interfaces/daily-report.interface';
import { ProjectOption, Project } from '../../shared/interfaces/project.interface';

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
  ],
  templateUrl: './daily-reports.html',
  styleUrl: './daily-reports.scss',
  providers: [MessageService, ConfirmationService],
})
export class DailyExpensesPage implements OnInit {
  private readonly dailyExpensesApi = inject(DailyExpensesApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  items = signal<DailyReport[]>([]);
  projects = signal<ProjectOption[]>([]);
  query = signal('');
  filterDate = signal<string | null>(null);
  showDialog = signal(false);
  showViewDialog = signal(false);
  editing = signal<DailyReport | null>(null);
  viewing = signal<DailyReport | null>(null);
  // Estado de expansión para vista móvil (accordion)
  private expandedRowKeys = signal<Set<string>>(new Set());

  // Archivos seleccionados (pendientes) cuando aún no existe el reporte
  pendingAudio = signal<File[]>([]);
  pendingVideo = signal<File[]>([]);
  pendingPhoto = signal<File[]>([]);
  pendingDocuments = signal<File[]>([]);

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
  private recordingInterval: any = null;

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

  load() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.items.set([]);
      return;
    }

    const fd = this.filterDate();
    if (fd) {
      this.dailyExpensesApi
        .listWithFilters({ userId: currentUser.id, startDate: fd, endDate: fd })
        .subscribe({
          next: (data) => {
            this.items.set(data);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al cargar los reportes diarios',
            });
          },
        });
      return;
    }

    this.dailyExpensesApi.listWithFilters({ userId: currentUser.id }).subscribe({
      next: (data) => {
        this.items.set(data);
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
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proyectos',
        });
      },
    });
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
    this.editing.set({
      date: new Date().toISOString().split('T')[0],
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
  openMediaModal(type: 'audio' | 'video' | 'photo', urls: string[], currentIndex: number = 0) {
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
    const currentIndex = this.mediaModalCurrentIndex();

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
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  onEditChange(field: keyof DailyReport, value: any) {
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
  onAudioSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    if (this.editing()?._id) {
      // Subir múltiples archivos
      files.forEach((file) => {
        this.dailyExpensesApi.uploadAudio(this.editing()!._id!, file).subscribe({
          next: (updated) => this.editing.set(updated),
          error: () => this.toastError(`No se pudo subir el audio: ${file.name}`),
        });
      });
    } else {
      // Agregar a pendientes
      this.pendingAudio.set([...this.pendingAudio(), ...files]);
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

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });

        if (this.editing()?._id) {
          this.dailyExpensesApi.uploadAudio(this.editing()!._id!, audioFile).subscribe({
            next: (updated) => this.editing.set(updated),
            error: () => this.toastError('No se pudo subir el audio'),
          });
        } else {
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

  onVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    if (this.editing()?._id) {
      // Subir múltiples archivos
      files.forEach((file) => {
        this.dailyExpensesApi.uploadVideo(this.editing()!._id!, file).subscribe({
          next: (updated) => this.editing.set(updated),
          error: () => this.toastError(`No se pudo subir el video: ${file.name}`),
        });
      });
    } else {
      // Agregar a pendientes
      this.pendingVideo.set([...this.pendingVideo(), ...files]);
    }
    input.value = '';
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    if (this.editing()?._id) {
      // Subir múltiples archivos
      files.forEach((file) => {
        this.dailyExpensesApi.uploadPhoto(this.editing()!._id!, file).subscribe({
          next: (updated) => this.editing.set(updated),
          error: () => this.toastError(`No se pudo subir la foto: ${file.name}`),
        });
      });
    } else {
      // Agregar a pendientes
      this.pendingPhoto.set([...this.pendingPhoto(), ...files]);
    }
    input.value = '';
  }

  onDocumentsSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    if (this.editing()?._id) {
      // subir en serie para mantener feedback
      files.forEach((file) => {
        this.dailyExpensesApi.uploadDocument(this.editing()!._id!, file).subscribe({
          next: (updated) => this.editing.set(updated),
          error: () => this.toastError(`No se pudo subir ${file.name}`),
        });
      });
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
            next: (updated) => this.editing.set(updated),
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

  removeAudioFromEditing(url: string, skipConfirm: boolean = false) {
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
            this.editing.set(updated);
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

  removeVideoFromEditing(url: string, skipConfirm: boolean = false) {
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
            this.editing.set(updated);
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

  removePhotoFromEditing(url: string, skipConfirm: boolean = false) {
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
            this.editing.set(updated);
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
              ? (item.userId as any)._id
              : (item.userId as string),
          documents: [],
        } as DailyReport);

    upsert$.subscribe({
      next: (saved) => {
        const id = saved._id!;
        // Si había archivos pendientes (nuevo), súbelos
        const tasks: Array<Promise<any>> = [];

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

  private uploadAudioPromise(id: string, file: File) {
    return new Promise((resolve, reject) => {
      console.log('Subiendo audio:', { fileName: file.name, fileSize: file.size, reportId: id });
      this.dailyExpensesApi.uploadAudio(id, file).subscribe({
        next: (response) => {
          console.log('Audio subido exitosamente:', { fileName: file.name, reportId: id });
          resolve(response);
        },
        error: (error) => {
          console.error('Error al subir audio:', { fileName: file.name, error, reportId: id });
          reject({ type: 'audio', fileName: file.name, error });
        },
      });
    });
  }
  private uploadVideoPromise(id: string, file: File) {
    return new Promise((resolve, reject) => {
      console.log('Subiendo video:', { fileName: file.name, fileSize: file.size, reportId: id });
      this.dailyExpensesApi.uploadVideo(id, file).subscribe({
        next: (response) => {
          console.log('Video subido exitosamente:', { fileName: file.name, reportId: id });
          resolve(response);
        },
        error: (error) => {
          console.error('Error al subir video:', { fileName: file.name, error, reportId: id });
          reject({ type: 'video', fileName: file.name, error });
        },
      });
    });
  }
  private uploadPhotoPromise(id: string, file: File) {
    return new Promise((resolve, reject) => {
      console.log('Subiendo foto:', { fileName: file.name, fileSize: file.size, reportId: id });
      this.dailyExpensesApi.uploadPhoto(id, file).subscribe({
        next: (response) => {
          console.log('Foto subida exitosamente:', { fileName: file.name, reportId: id });
          resolve(response);
        },
        error: (error) => {
          console.error('Error al subir foto:', { fileName: file.name, error, reportId: id });
          reject({ type: 'photo', fileName: file.name, error });
        },
      });
    });
  }
  private uploadDocumentsPromise(id: string, files: File[]) {
    return new Promise((resolve) => {
      let remaining = files.length;
      if (remaining === 0) {
        resolve(true);
        return;
      }
      files.forEach((f) => {
        console.log('Subiendo documento:', { fileName: f.name, fileSize: f.size, reportId: id });
        this.dailyExpensesApi.uploadDocument(id, f).subscribe({
          next: () => {
            console.log('Documento subido exitosamente:', { fileName: f.name, reportId: id });
            remaining -= 1;
            if (remaining === 0) resolve(true);
          },
          error: (error) => {
            console.error('Error al subir documento:', { fileName: f.name, error, reportId: id });
            remaining -= 1;
            if (remaining === 0) resolve(true);
          },
        });
      });
    });
  }

  /**
   * Sube archivos con límite de concurrencia para evitar saturar el servidor
   * @param tasks Array de promesas de subida
   * @param reportId ID del reporte para logging
   * @returns Promise que se resuelve cuando todas las subidas terminan
   */
  private async uploadFilesWithConcurrencyLimit(
    tasks: Array<Promise<any>>,
    reportId: string
  ): Promise<void> {
    const CONCURRENT_LIMIT = 3; // Máximo 3 subidas simultáneas
    const results: Array<{ status: string; fileName?: string; type?: string; error?: any }> = [];

    // Procesar en lotes con límite de concurrencia
    for (let i = 0; i < tasks.length; i += CONCURRENT_LIMIT) {
      const batch = tasks.slice(i, i + CONCURRENT_LIMIT);
      const batchResults = await Promise.allSettled(batch);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push({ status: 'fulfilled' });
          console.log(`Archivo ${i + index + 1}/${tasks.length} subido exitosamente`);
        } else {
          const errorInfo = result.reason as any;
          results.push({
            status: 'rejected',
            fileName: errorInfo?.fileName || 'desconocido',
            type: errorInfo?.type || 'archivo',
            error: errorInfo?.error || result.reason,
          });
          console.error(`Error al subir archivo ${i + index + 1}/${tasks.length}:`, errorInfo);
          
          // Mostrar error específico al usuario
          const errorMsg = this.getErrorMessage(errorInfo?.error || result.reason);
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: `No se pudo subir ${errorInfo?.type || 'archivo'}: ${errorInfo?.fileName || 'desconocido'}. ${errorMsg}`,
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
    
    console.log(`Subida completada: ${successful} exitosos, ${failed} fallidos de ${tasks.length} totales`);

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
        userId = (item.userId as any)._id;
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
  private getErrorMessage(error: any): string {
    // Manejar errores de permisos primero
    if (error.status === 403) {
      if (error.error?.message?.includes('No puedes enviar gastos de otros usuarios')) {
        return 'No puedes enviar reportes de otros usuarios';
      }
      if (error.error?.message?.includes('No puedes aprobar')) {
        return 'No tienes permisos para aprobar este reporte';
      }
      return 'No tienes permisos para realizar esta acción';
    }

    // Manejar errores de validación específicos
    if (error.error?.message) {
      const message = error.error.message;

      // Traducir mensajes comunes de validación
      if (message.includes('date should not be empty')) {
        return 'La fecha es requerida';
      }
      if (message.includes('time should not be empty')) return 'La hora es requerida';
      if (message.includes('description should not be empty')) return 'La descripción es requerida';

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

  private toastError(detail: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }
}
