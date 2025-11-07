import { Component, OnInit, signal, inject, effect, computed, ViewChild, ElementRef } from '@angular/core';
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
import { TimeTrackingApiService } from '../../shared/services/time-tracking-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { FaceRecognitionApiService } from '../../shared/services/face-recognition-api.service';
import { AuthService } from '../login/services/auth.service';
import { TenantService } from '../../core/services/tenant.service';
import { TimeTracking, TimeTrackingStatus } from '../../shared/interfaces/time-tracking.interface';
import { AttendanceRecord } from '../../shared/interfaces/face-recognition.interface';
import { FaceDetectionService, FaceDetectionResult } from '../../shared/services/face-detection.service';
import { ProjectOption, Project } from '../../shared/interfaces/project.interface';

/**
 * Componente de Marcación de Hora
 * Principio de Responsabilidad Única: Gestiona la UI y estado de los registros de tiempo
 */
@Component({
  selector: 'app-time-tracking',
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
  templateUrl: './time-tracking.html',
  styleUrl: './time-tracking.scss',
  providers: [MessageService, ConfirmationService],
})
export class TimeTrackingPage implements OnInit {
  private readonly timeTrackingApi = inject(TimeTrackingApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly faceRecognitionApi = inject(FaceRecognitionApiService);
  private readonly faceDetection = inject(FaceDetectionService);
  private readonly authService = inject(AuthService);
  private readonly tenantService = inject(TenantService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  items = signal<TimeTracking[]>([]);
  projects = signal<ProjectOption[]>([]);
  query = signal('');
  filterDate = signal<string | null>(null);
  filterStatus = signal<TimeTrackingStatus | null>(null);
  showDialog = signal(false);
  showViewDialog = signal(false);
  showFaceDialog = signal(false);
  editing = signal<TimeTracking | null>(null);
  viewing = signal<TimeTracking | null>(null);
  private expandedRowKeys = signal<Set<string>>(new Set());

  // Estado para marcación con reconocimiento facial
  faceImage = signal<File | null>(null);
  faceImagePreview = signal<string | null>(null);
  faceLocation = signal<string>('');
  faceNotes = signal<string>('');
  isMarkingAttendance = signal(false);

  // Cámara y detección en tiempo real
  @ViewChild('cameraVideo', { static: false }) cameraVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('detectionCanvas', { static: false }) detectionCanvasRef?: ElementRef<HTMLCanvasElement>;
  cameraStream = signal<MediaStream | null>(null);
  isCameraActive = signal(false);
  isVideoReady = signal(false);
  faceDetectionResult = signal<FaceDetectionResult | null>(null);
  isDetecting = signal(false);
  private detectionInterval?: ReturnType<typeof setInterval>;
  private autoCaptureTriggered = signal(false);

  // Opciones de estado
  statusOptions = signal<{ label: string; value: TimeTrackingStatus }[]>([
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'En Progreso', value: 'EN_PROGRESO' },
    { label: 'Completado', value: 'COMPLETADO' },
    { label: 'Pausado', value: 'PAUSADO' },
  ]);

  // Filtrado simple por texto
  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const statusFilter = this.filterStatus();
    let list = this.items()
      .slice()
      .sort((a, b) => {
        const aDt = new Date(`${a.date}T${a.startTime || '00:00'}`).getTime();
        const bDt = new Date(`${b.date}T${b.startTime || '00:00'}`).getTime();
        return bDt - aDt; // DESC
      });

    // Filtrar por estado
    if (statusFilter) {
      list = list.filter((item) => item.status === statusFilter);
    }

    if (!searchQuery) return list;
    return list.filter((item) => {
      const descriptionMatch = item.description?.toLowerCase().includes(searchQuery) ?? false;
      const dateMatch = item.date?.toLowerCase().includes(searchQuery) ?? false;
      const notesMatch = item.notes?.toLowerCase().includes(searchQuery) ?? false;
      return descriptionMatch || dateMatch || notesMatch;
    });
  });

  ngOnInit() {
    this.load();
    this.loadProjects();
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
      }
      if (!this.showViewDialog()) this.viewing.set(null);
      if (!this.showFaceDialog()) {
        this.faceImage.set(null);
        this.faceImagePreview.set(null);
        this.faceLocation.set('');
        this.faceNotes.set('');
        this.stopCamera();
        this.isVideoReady.set(false);
        this.stopDetection();
        this.autoCaptureTriggered.set(false);
      }
    });

    // Efecto para auto-capturar y enviar cuando el rostro sea válido
    effect(() => {
      const result = this.faceDetectionResult();
      const isValid = result?.isValid ?? false;
      const alreadyTriggered = this.autoCaptureTriggered();
      const isMarking = this.isMarkingAttendance();

      // Solo auto-capturar si:
      // - El rostro es válido
      // - No se ha disparado ya
      // - No se está marcando actualmente
      // - El video está listo
      if (isValid && !alreadyTriggered && !isMarking && this.isVideoReady()) {
        this.autoCaptureTriggered.set(true);
        // Pequeño delay para asegurar estabilidad
        setTimeout(() => {
          this.autoCaptureAndMark();
        }, 500);
      }
    });
  }

  load() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.items.set([]);
      return;
    }

    const filters: {
      userId: string;
      startDate?: string;
      endDate?: string;
    } = { userId: currentUser.id };
    const fd = this.filterDate();
    if (fd) {
      filters.startDate = fd;
      filters.endDate = fd;
    }

    this.timeTrackingApi.list(filters).subscribe({
      next: (data) => {
        this.items.set(data);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los registros de tiempo',
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

  // Obtener la fecha del filtro como Date para el datepicker
  getFilterDate = computed(() => {
    const fd = this.filterDate();
    if (!fd) return null;
    try {
      const [year, month, day] = fd.split('-').map((x) => parseInt(x, 10));
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    } catch {
      return null;
    }
  });

  onFilterStatusChange(value: TimeTrackingStatus | null) {
    this.filterStatus.set(value);
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

  // Helpers de accordion móvil
  private buildRowKey(item: TimeTracking, index: number): string {
    const base = `${item.date}T${item.startTime || '00:00'}`;
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

  // Método eliminado: Los nuevos registros solo se crean mediante reconocimiento facial

  editItem(item: TimeTracking) {
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

    // Si el proyecto ha sido eliminado, limpiar el projectId
    if (editedItem.projectId && typeof editedItem.projectId === 'string') {
      const projectExists = this.projects().some((p) => p.value === editedItem.projectId);
      if (!projectExists) {
        editedItem.projectId = '';
      }
    }

    this.editing.set(editedItem);
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  viewItem(item: TimeTracking) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  onEditChange(field: keyof TimeTracking, value: TimeTracking[keyof TimeTracking]) {
    const current = this.editing();
    if (current) {
      const updated = { ...current, [field]: value };

      // Calcular duración automáticamente si cambian las horas
      if (field === 'startTime' || field === 'endTime') {
        if (updated.startTime && updated.endTime) {
          updated.duration = this.calculateDuration(updated.startTime, updated.endTime);
          // Si hay duración, actualizar estado a COMPLETADO
          if (updated.duration > 0 && !updated.status) {
            updated.status = 'COMPLETADO';
          }
        }
      }

      this.editing.set(updated);
    }
  }

  /**
   * Calcula la duración en minutos entre dos horas
   */
  private calculateDuration(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    let duration = endTotalMinutes - startTotalMinutes;
    if (duration < 0) {
      duration += 24 * 60; // Agregar 24 horas si es del día siguiente
    }

    return duration;
  }

  /**
   * Formatea la duración en horas y minutos
   */
  formatDuration(minutes?: number): string {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Obtiene el color del badge según el estado
   */
  getStatusBadgeClass(status: TimeTrackingStatus): string {
    switch (status) {
      case 'PENDIENTE':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'EN_PROGRESO':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'COMPLETADO':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PAUSADO':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  onDateChange(value: Date | Date[] | null) {
    if (Array.isArray(value)) {
      return;
    }

    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = (value.getMonth() + 1).toString().padStart(2, '0');
      const d = value.getDate().toString().padStart(2, '0');
      this.onEditChange('date', `${y}-${m}-${d}`);
    } else if (value === null) {
      this.onEditChange('date', '');
    }
  }

  // Métodos de documentos eliminados: No se permiten subir archivos manualmente

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

        if (current._id && documentToRemove) {
          this.timeTrackingApi.deleteDocument(current._id, documentToRemove).subscribe({
            next: (updated) => this.editing.set(updated),
            error: () => {
              this.toastError('No se pudo eliminar el documento');
              this.editing.set({ ...current, documents: current.documents });
            },
          });
        }
      },
    });
  }

  save() {
    const item = this.editing();
    if (!item || !item._id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'Solo se pueden editar registros existentes. Use el reconocimiento facial para crear nuevos registros.',
      });
      return;
    }

    const errors = this.validateForm(item);
    if (errors.length) {
      errors.forEach((e) => this.toastError(e));
      return;
    }

    const payload: {
      date: string;
      startTime: string;
      endTime?: string;
      duration?: number;
      status: TimeTrackingStatus;
      description: string;
      notes?: string;
      projectId?: string;
    } = {
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      duration: item.duration,
      status: item.status,
      description: item.description.trim(),
      notes: item.notes?.trim() || undefined,
      projectId:
        item.projectId && typeof item.projectId === 'string' && item.projectId.trim() !== ''
          ? item.projectId.trim()
          : undefined,
    };

    this.timeTrackingApi.update(item._id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Registro de tiempo actualizado',
        });
        this.load();
        this.closeDialog();
      },
      error: (error) => this.toastError(this.getErrorMessage(error)),
    });
  }

  remove(item: TimeTracking) {
    if (!item._id) return;
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este registro de tiempo?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.timeTrackingApi.delete(item._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Registro de tiempo eliminado correctamente',
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
      },
    });
  }

  // Obtener la fecha como Date para el datepicker
  getEditDate = computed(() => {
    const editing = this.editing();
    if (!editing || !editing.date) return null;
    try {
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

    if (typeof projectId === 'object' && 'name' in projectId) {
      return projectId.name || 'Sin proyecto';
    }

    if (typeof projectId === 'string') {
      const project = this.projects().find((p) => p.value === projectId);
      return project?.label || 'Sin proyecto';
    }

    return 'Sin proyecto';
  }

  // Métodos auxiliares para documentos
  getFileIcon(url: string): string {
    if (!url || typeof url !== 'string') {
      return 'pi pi-file';
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
  private validateForm(item: TimeTracking): string[] {
    const errors: string[] = [];

    if (!item.date) {
      errors.push('La fecha es requerida');
    }

    if (!item.startTime || item.startTime.trim() === '') {
      errors.push('La hora de inicio es requerida');
    }

    if (item.endTime && item.startTime) {
      const duration = this.calculateDuration(item.startTime, item.endTime);
      if (duration <= 0) {
        errors.push('La hora de fin debe ser mayor que la hora de inicio');
      }
    }

    if (!item.description || item.description.trim() === '') {
      errors.push('La descripción es requerida');
    }

    if (item.description && item.description.trim().length < 5) {
      errors.push('La descripción debe tener al menos 5 caracteres');
    }

    if (item.description && item.description.trim().length > 500) {
      errors.push('La descripción no puede exceder 500 caracteres');
    }

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
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; error?: { message?: string | string[] }; message?: string };
      if (httpError.status === 403) {
        if (httpError.error?.message && typeof httpError.error.message === 'string' && httpError.error.message.includes('No puedes crear registros')) {
          return 'No puedes crear registros para otros usuarios';
        }
        if (httpError.error?.message && typeof httpError.error.message === 'string' && httpError.error.message.includes('No puedes editar')) {
          return 'No puedes editar registros de otros usuarios';
        }
        return 'No tienes permisos para realizar esta acción';
      }

      if (httpError.error?.message) {
        const message = httpError.error.message;
        if (typeof message === 'string') {
          if (message.includes('date should not be empty')) {
            return 'La fecha es requerida';
          }
          if (message.includes('startTime should not be empty')) {
            return 'La hora de inicio es requerida';
          }
          if (message.includes('description should not be empty')) {
            return 'La descripción es requerida';
          }
          return message;
        }
        if (Array.isArray(message)) {
          return message.join(', ');
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

  private toastError(detail: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }

  // ========== Métodos para Marcación con Reconocimiento Facial ==========

  /**
   * Abre el diálogo para marcar asistencia con reconocimiento facial
   */
  openFaceMarkDialog() {
    this.showFaceDialog.set(true);
    this.autoCaptureTriggered.set(false);
    // Iniciar cámara automáticamente al abrir el diálogo
    setTimeout(() => {
      this.startCamera();
    }, 100);
  }

  /**
   * Cierra el diálogo de marcación facial
   */
  closeFaceDialog() {
    this.showFaceDialog.set(false);
  }

  /**
   * Inicia la cámara para detección en tiempo real
   */
  async startCamera() {
    try {
      this.stopCamera();

      // Cargar modelos de face-api.js
      this.isMarkingAttendance.set(true);
      try {
        await this.faceDetection.loadModels();
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los modelos de reconocimiento facial',
        });
        this.isMarkingAttendance.set(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });

      this.cameraStream.set(stream);
      this.isCameraActive.set(true);
      this.isVideoReady.set(false);
      this.isMarkingAttendance.set(false);

      this.setupVideoListeners();

      const assignStream = () => {
        const video = this.cameraVideoRef?.nativeElement;
        if (video && stream) {
          video.srcObject = stream;
          video.play()
            .then(() => {
              const checkReady = () => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  this.isVideoReady.set(true);
                  this.startDetection();
                } else {
                  setTimeout(checkReady, 50);
                }
              };
              setTimeout(checkReady, 100);
            })
            .catch((err) => {
              console.error('Error al reproducir video:', err);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo iniciar la reproducción del video',
              });
              this.isCameraActive.set(false);
            });
        } else {
          setTimeout(assignStream, 100);
        }
      };

      setTimeout(assignStream, 200);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'No se pudo acceder a la cámara. Verifica los permisos de la cámara en tu navegador.',
      });
      this.isCameraActive.set(false);
      this.isVideoReady.set(false);
      this.isMarkingAttendance.set(false);
    }
  }

  /**
   * Detiene la cámara
   */
  stopCamera() {
    this.stopDetection();

    const stream = this.cameraStream();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.cameraStream.set(null);
      this.isCameraActive.set(false);
      this.isVideoReady.set(false);
    }

    const video = this.cameraVideoRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  /**
   * Configura listeners del video
   */
  private setupVideoListeners() {
    const video = this.cameraVideoRef?.nativeElement;
    if (!video) {
      setTimeout(() => this.setupVideoListeners(), 100);
      return;
    }

    const onLoadedMetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        this.isVideoReady.set(true);
      }
    };

    const onPlaying = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        this.isVideoReady.set(true);
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('playing', onPlaying);
  }

  /**
   * Inicia la detección facial en tiempo real
   */
  private startDetection() {
    this.stopDetection();
    this.isDetecting.set(true);

    this.detectionInterval = setInterval(async () => {
      const video = this.cameraVideoRef?.nativeElement;
      if (!video || !this.isVideoReady()) return;

      try {
        const result = await this.faceDetection.detectFace(video);
        this.faceDetectionResult.set(result);
        this.drawOverlay(video, result);
      } catch (error) {
        console.error('Error en detección facial:', error);
      }
    }, 200);
  }

  /**
   * Detiene la detección facial
   */
  private stopDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = undefined;
    }
    this.isDetecting.set(false);
    this.faceDetectionResult.set(null);

    const canvas = this.detectionCanvasRef?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  /**
   * Dibuja el overlay en el canvas
   */
  private drawOverlay(video: HTMLVideoElement, result: FaceDetectionResult) {
    const canvas = this.detectionCanvasRef?.nativeElement;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!result.detected || !result.box) {
      return;
    }

    const scaleX = rect.width / video.videoWidth;
    const scaleY = rect.height / video.videoHeight;

    const box = result.box;
    const x = box.x * scaleX;
    const y = box.y * scaleY;
    const width = box.width * scaleX;
    const height = box.height * scaleY;

    const isReady = result.isValid ?? false;
    const color = isReady ? '#10b981' : '#ef4444';

    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isReady ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx - 4, 0), Math.max(ry - 4, 0), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Captura automáticamente y marca asistencia cuando el rostro es válido
   */
  private async autoCaptureAndMark() {
    const video = this.cameraVideoRef?.nativeElement;
    if (!video || !this.isVideoReady() || !video.videoWidth || !video.videoHeight) {
      return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        const file = new File([blob], `attendance-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        this.faceImage.set(file);
        this.faceImagePreview.set(canvas.toDataURL('image/jpeg'));

        // Detener cámara antes de procesar
        this.stopCamera();

        // Marcar asistencia automáticamente
        await this.markAttendanceWithFace();
      },
      'image/jpeg',
      0.9
    );
  }


  /**
   * Marca la asistencia usando reconocimiento facial y crea el registro de tiempo
   */
  async markAttendanceWithFace() {
    const image = this.faceImage();
    if (!image) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes capturar una imagen desde la cámara',
      });
      return;
    }

    const tenantId = this.tenantService.tenantId();
    if (!tenantId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el tenantId',
      });
      return;
    }

    this.isMarkingAttendance.set(true);

    const request = {
      location: this.faceLocation().trim() || undefined,
      notes: this.faceNotes().trim() || undefined,
    };

    try {
      const descriptor = await this.faceDetection.getDescriptorFromFile(image);
      if (!descriptor || descriptor.length !== 128) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo extraer el descriptor facial (128 valores). Verifica la imagen.',
        });
        this.isMarkingAttendance.set(false);
        return;
      }

      const descriptorArr = Array.from(descriptor);
      this.faceRecognitionApi.markAttendanceWithDescriptor(image, descriptorArr, tenantId, request).subscribe({
      next: (attendanceRecord: AttendanceRecord) => {
        // Obtener el userId del registro de asistencia
        const userId =
          typeof attendanceRecord.userId === 'object' &&
          attendanceRecord.userId !== null &&
          '_id' in attendanceRecord.userId
            ? (attendanceRecord.userId as { _id: string })._id
            : String(attendanceRecord.userId);

        // Crear automáticamente el registro de tiempo
        const timestamp = new Date(attendanceRecord.timestamp);
        const date = timestamp.toISOString().split('T')[0];
        const startTime = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;

        const timeTrackingPayload = {
          userId: userId,
          date: date,
          startTime: startTime,
          status: 'EN_PROGRESO' as TimeTrackingStatus,
          description: `Marcación ${attendanceRecord.type} - Validada con reconocimiento facial`,
          notes: attendanceRecord.notes || undefined,
          attendanceRecordId: attendanceRecord._id,
        };

        this.timeTrackingApi.create(timeTrackingPayload).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: `Asistencia marcada correctamente. Confianza: ${(
                (attendanceRecord.confidence || 0) * 100
              ).toFixed(1)}%`,
            });
            this.load();
            this.closeFaceDialog();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'warning',
              summary: 'Advertencia',
              detail:
                'La asistencia fue validada pero no se pudo crear el registro de tiempo. ' +
                this.getErrorMessage(error),
            });
            this.closeFaceDialog();
          },
        });
      },
      error: (error) => {
        let errorMessage = 'Error al validar la asistencia';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Error de Validación',
          detail: errorMessage,
        });
      },
      complete: () => {
        this.isMarkingAttendance.set(false);
      },
    });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al procesar el descriptor facial',
      });
      this.isMarkingAttendance.set(false);
    }
  }
}
