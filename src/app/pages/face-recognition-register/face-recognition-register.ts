import { Component, OnInit, signal, inject, effect, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FaceRecognitionApiService } from '../../shared/services/face-recognition-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import { FaceDescriptor } from '../../shared/interfaces/face-recognition.interface';
import { TenantService } from '../../core/services/tenant.service';
import { FaceDetectionService, FaceDetectionResult } from '../../shared/services/face-detection.service';

/**
 * Componente de Registro de Reconocimiento Facial
 * Principio de Responsabilidad Única: Gestiona la UI y estado del registro de rostros
 */
@Component({
  selector: 'app-face-recognition-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    FileUploadModule,
  ],
  templateUrl: './face-recognition-register.html',
  styleUrl: './face-recognition-register.scss',
  providers: [MessageService, ConfirmationService],
})
export class FaceRecognitionRegisterPage implements OnInit, AfterViewInit {
  private readonly faceRecognitionApi = inject(FaceRecognitionApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly tenantService = inject(TenantService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly faceDetection = inject(FaceDetectionService);

  @ViewChild('cameraVideo', { static: false }) cameraVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('detectionCanvas', { static: false }) detectionCanvasRef?: ElementRef<HTMLCanvasElement>;

  users = signal<UserOption[]>([]);
  descriptors = signal<FaceDescriptor[]>([]);
  selectedUserId = signal<string>('');
  selectedImage = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  showDialog = signal(false);
  loading = signal(false);
  query = signal('');
  cameraStream = signal<MediaStream | null>(null);
  isCameraActive = signal(false);
  isVideoReady = signal(false);
  faceDetectionResult = signal<FaceDetectionResult | null>(null);
  isDetecting = signal(false);
  private detectionInterval?: ReturnType<typeof setInterval>;

  // Filtrado de usuarios
  filteredUsers = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const list = this.users();

    if (!searchQuery) return list;
    return list.filter((user) => {
      const nameMatch = user.name?.toLowerCase().includes(searchQuery) ?? false;
      const emailMatch = user.email?.toLowerCase().includes(searchQuery) ?? false;
      return nameMatch || emailMatch;
    });
  });

  // Descriptores filtrados por usuario seleccionado
  filteredDescriptors = computed(() => {
    const userId = this.selectedUserId();
    if (!userId) return [];
    return this.descriptors().filter((d) => {
      const id = typeof d.userId === 'object' && d.userId && '_id' in d.userId
        ? (d.userId as { _id: string })._id
        : d.userId;
      return id === userId;
    });
  });

  ngOnInit() {
    this.loadUsers();
  }

  ngAfterViewInit() {
    // Los listeners se configurarán cuando el video esté disponible
  }

  private setupVideoListeners() {
    const video = this.cameraVideoRef?.nativeElement;
    if (!video) {
      // Reintentar si el video no está disponible
      setTimeout(() => this.setupVideoListeners(), 100);
      return;
    }

    // Remover listeners anteriores si existen
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

  constructor() {
    effect(() => {
      if (!this.showDialog()) {
        this.selectedImage.set(null);
        this.imagePreview.set(null);
        this.selectedUserId.set('');
        this.stopCamera();
        this.isVideoReady.set(false);
        this.stopDetection();
      }
    });
  }

  loadUsers() {
    const tenantId = this.tenantService.tenantId();
    if (!tenantId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay una empresa seleccionada. Se mostrarán todos los usuarios.',
      });
      // Si no hay tenantId, cargar todos los usuarios
      this.usersApi.list().subscribe({
        next: (users) => {
          this.users.set(users);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los usuarios',
          });
        },
      });
      return;
    }

    // Filtrar usuarios por tenantId
    this.usersApi.list(tenantId).subscribe({
      next: (users) => {
        this.users.set(users);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los usuarios',
        });
      },
    });
  }

  loadDescriptors(userId: string) {
    const tenantId = this.tenantService.tenantId();
    if (!tenantId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hay una empresa seleccionada',
      });
      return;
    }

    this.loading.set(true);
    this.faceRecognitionApi.getDescriptorsByUser(userId, tenantId).subscribe({
      next: (descriptors) => {
        this.descriptors.set(descriptors);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los descriptores faciales',
        });
        this.loading.set(false);
      },
    });
  }

  setQuery(value: string) {
    this.query.set(value);
  }

  onUserSelect(userId: string) {
    this.selectedUserId.set(userId);
    if (userId) {
      this.loadDescriptors(userId);
    } else {
      this.descriptors.set([]);
    }
  }

  async startCamera() {
    try {
      // Detener cualquier stream anterior
      this.stopCamera();
      
      // Cargar modelos de face-api.js
      this.loading.set(true);
      try {
        await this.faceDetection.loadModels();
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los modelos de reconocimiento facial',
        });
        this.loading.set(false);
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      
      this.cameraStream.set(stream);
      this.isCameraActive.set(true);
      this.isVideoReady.set(false);
      this.loading.set(false);
      
      // Configurar listeners primero
      this.setupVideoListeners();
      
      // Asignar el stream al video y esperar a que esté listo
      const assignStream = () => {
        const video = this.cameraVideoRef?.nativeElement;
        if (video && stream) {
          video.srcObject = stream;
          video.play()
            .then(() => {
              // El video está reproduciéndose, verificar dimensiones periódicamente
              const checkReady = () => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  this.isVideoReady.set(true);
                  this.startDetection();
                } else {
                  // Continuar verificando hasta que tenga dimensiones
                  setTimeout(checkReady, 50);
                }
              };
              // Dar un pequeño delay antes de verificar
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
          // Si el video no está disponible, reintentar
          setTimeout(assignStream, 100);
        }
      };
      
      // Esperar a que el diálogo esté completamente renderizado
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
      this.loading.set(false);
    }
  }

  stopCamera() {
    this.stopDetection();
    
    const stream = this.cameraStream();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.cameraStream.set(null);
      this.isCameraActive.set(false);
      this.isVideoReady.set(false);
    }
    
    // Limpiar el video element
    const video = this.cameraVideoRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

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
    }, 200); // Detectar cada 200ms
  }

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

  private drawOverlay(video: HTMLVideoElement, result: FaceDetectionResult) {
    const canvas = this.detectionCanvasRef?.nativeElement;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar tamaño del canvas al tamaño visual del video
    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Si no hay rostro detectado, no dibujar nada
    if (!result.detected || !result.box) {
      return;
    }

    // Calcular escala entre el video real y el video mostrado
    const scaleX = rect.width / video.videoWidth;
    const scaleY = rect.height / video.videoHeight;

    // Convertir coordenadas del video real al canvas
    const box = result.box;
    const x = box.x * scaleX;
    const y = box.y * scaleY;
    const width = box.width * scaleX;
    const height = box.height * scaleY;

    // Color según estado
    const isReady = result.isValid ?? false;
    const color = isReady ? '#10b981' : '#ef4444';

    // Dibujar elipse que se ajuste al rostro
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

    // Elipse interna sutil
    ctx.strokeStyle = isReady ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx - 4, 0), Math.max(ry - 4, 0), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  captureFromCamera() {
    const result = this.faceDetectionResult();
    if (!result || !result.isValid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: result?.message || 'Asegúrate de que tu rostro esté centrado y nítido antes de capturar.',
      });
      return;
    }

    const stream = this.cameraStream();
    if (!stream) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'La cámara no está activa. Por favor, inicia la cámara primero.',
      });
      return;
    }

    const video = this.cameraVideoRef?.nativeElement;
    if (!video) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El elemento de video no está disponible.',
      });
      return;
    }

    // Verificar que el video tenga dimensiones válidas
    if (!this.isVideoReady() || !video.videoWidth || !video.videoHeight) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Esperando...',
        detail: 'El video aún no está listo. Por favor, espera un momento e intenta de nuevo.',
      });
      return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear el contexto del canvas',
      });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `face-capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          this.selectedImage.set(file);
          this.imagePreview.set(canvas.toDataURL('image/jpeg'));
          this.stopCamera();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo capturar la imagen',
          });
        }
      },
      'image/jpeg',
      0.9
    );
  }

  removeImage() {
    this.selectedImage.set(null);
    this.imagePreview.set(null);
  }

  openRegisterDialog() {
    this.selectedUserId.set('');
    this.selectedImage.set(null);
    this.imagePreview.set(null);
    this.showDialog.set(true);
    // Iniciar cámara automáticamente al abrir el diálogo
    setTimeout(() => {
      this.startCamera();
    }, 100);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  async registerFace() {
    const userId = this.selectedUserId();
    const image = this.selectedImage();

    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes seleccionar un usuario',
      });
      return;
    }

    if (!image) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes seleccionar una imagen',
      });
      return;
    }

    const tenantId = this.tenantService.tenantId();
    if (!tenantId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hay una empresa seleccionada',
      });
      return;
    }

    this.loading.set(true);

    try {
      const descriptor = await this.faceDetection.getDescriptorFromFile(image);
      if (!descriptor || descriptor.length !== 128) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo extraer el descriptor facial (128 valores). Verifica la imagen.',
        });
        this.loading.set(false);
        return;
      }

      const descriptorArr = Array.from(descriptor);
      this.faceRecognitionApi
        .registerFaceWithDescriptor(userId, image, descriptorArr, tenantId)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Rostro registrado correctamente',
            });
            this.closeDialog();
            if (userId) {
              this.loadDescriptors(userId);
            }
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
            this.loading.set(false);
          },
        });
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al procesar el descriptor facial',
      });
      this.loading.set(false);
    }
  }

  deleteDescriptor(descriptor: FaceDescriptor) {
    const userName = this.getUserName(descriptor.userId);
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar el descriptor facial de "${userName}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        const tenantId = this.tenantService.tenantId();
        if (!tenantId) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No hay una empresa seleccionada',
          });
          return;
        }

        this.loading.set(true);
        this.faceRecognitionApi.deleteDescriptor(descriptor._id, tenantId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Descriptor facial eliminado correctamente',
            });
            const userId = this.selectedUserId();
            if (userId) {
              this.loadDescriptors(userId);
            }
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
            this.loading.set(false);
          },
        });
      },
    });
  }

  getUserName(userId: string | { _id?: string } | null | undefined): string {
    if (!userId) return 'Usuario desconocido';
    const id = typeof userId === 'object' && userId && '_id' in userId
      ? (userId as { _id?: string })._id
      : userId;
    if (!id) {
      return 'Usuario desconocido';
    }
    const user = this.users().find((u) => u._id === id);
    return user?.name || 'Usuario desconocido';
  }

  getUserEmail(userId: string | { _id?: string } | null | undefined): string {
    if (!userId) return '';
    const id = typeof userId === 'object' && userId && '_id' in userId
      ? (userId as { _id?: string })._id
      : userId;
    if (!id) {
      return '';
    }
    const user = this.users().find((u) => u._id === id);
    return user?.email || '';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (typeof error === 'string') {
      return error;
    }

    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const errorObject = error as { message?: unknown; error?: unknown };

    if (typeof errorObject.message === 'string') {
      const message = errorObject.message;
      if (message.includes('No se detectó ninguna cara')) {
        return 'No se detectó ninguna cara en la imagen. Asegúrate de que la imagen contenga un rostro visible.';
      }
      if (message.includes('Ya existe un descriptor facial activo')) {
        return 'Ya existe un descriptor facial activo para este usuario. Elimina el existente antes de registrar uno nuevo.';
      }
      return message;
    }

    if (typeof errorObject.error === 'string') {
      return errorObject.error;
    }

    if (errorObject.error !== undefined) {
      return this.extractErrorMessage(errorObject.error);
    }

    return undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (!error || typeof error !== 'object') {
      return 'Ha ocurrido un error inesperado';
    }

    const errorObject = error as { message?: unknown; error?: unknown };
    const serverMessage = this.extractErrorMessage(errorObject.error);
    if (serverMessage) {
      return serverMessage;
    }

    if (typeof errorObject.message === 'string') {
      return errorObject.message;
    }

    return 'Ha ocurrido un error inesperado';
  }
}

