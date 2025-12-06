import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FiApiService } from '../../shared/services/fi-api.service';
import {
  Accionable,
  Fi,
  FiActionableAttachment,
  FiActionableTask,
} from '../../shared/interfaces/fi';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {
  PresignedUploadService,
  PresignedUrlResponse,
} from '../../shared/services/presigned-upload.service';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../login/services/auth.service';

@Component({
  selector: 'app-fi-day-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    Button,
    InputText,
    Textarea,
    FileUploadModule,
    ToastModule,
    CardModule,
    CheckboxModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './fi-day-detail.page.html',
  styleUrl: './fi-day-detail.page.scss',
})
export class FiDayDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(FiApiService);
  private readonly messageService = inject(MessageService);
  private readonly presignedUpload = inject(PresignedUploadService);
  private readonly authService = inject(AuthService);

  fi = signal<Fi | null>(null);
  actionable = signal<Accionable | null>(null);
  fecha = signal<string>('');
  loading = signal<boolean>(false);
  uploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);

  newTaskTitle = '';
  selectedFiles = signal<File[]>([]);
  actionableDescription = '';
  creatingActionable = signal<boolean>(false);

  get fiId(): string {
    return this.route.snapshot.paramMap.get('id') || '';
  }

  get dateParam(): string {
    return this.route.snapshot.paramMap.get('date') || '';
  }

  ngOnInit(): void {
    this.fecha.set(this.dateParam);
    this.loadFi();
    this.loadActionable();
  }

  loadFi(): void {
    if (!this.fiId) return;
    this.loading.set(true);
    this.api.getById(this.fiId).subscribe({
      next: (f) => {
        this.fi.set(f);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadActionable(): void {
    if (!this.fiId || !this.fecha()) return;
    this.loading.set(true);
    this.api.getActionableByDate(this.fiId, this.fecha()).subscribe({
      next: (a) => {
        this.actionable.set(a);
        this.actionableDescription = a.descripcion || '';
        this.loading.set(false);
      },
      error: () => {
        // Si no existe, crear uno vacío
        this.actionable.set(null);
        this.actionableDescription = '';
        this.loading.set(false);
      },
    });
  }

  createActionable(): void {
    if (!this.fiId || !this.fecha()) return;
    if (!this.actionableDescription.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, ingresa una descripción para el accionable',
      });
      return;
    }

    this.creatingActionable.set(true);
    this.api
      .createActionable(this.fiId, {
        fecha: this.fecha(),
        descripcion: this.actionableDescription.trim(),
      })
      .subscribe({
        next: (a) => {
          this.actionable.set(a);
          this.creatingActionable.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Accionable creado correctamente',
          });
        },
        error: () => {
          this.creatingActionable.set(false);
        },
      });
  }

  updateActionableDescription(): void {
    const actionable = this.actionable();
    if (!actionable || !this.actionableDescription.trim()) return;

    this.loading.set(true);
    this.api
      .updateActionable(this.fiId, actionable._id, {
        descripcion: this.actionableDescription.trim(),
      })
      .subscribe({
        next: (a) => {
          this.actionable.set(a);
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Descripción actualizada correctamente',
          });
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  async ensureActionableExists(): Promise<boolean> {
    const actionable = this.actionable();
    if (actionable) return true;

    // Si no existe, crear uno con descripción por defecto
    if (!this.actionableDescription.trim()) {
      this.actionableDescription = `Accionable para ${this.formattedDate()}`;
    }

    try {
      const newActionable = await firstValueFrom(
        this.api.createActionable(this.fiId, {
          fecha: this.fecha(),
          descripcion: this.actionableDescription.trim(),
        })
      );
      this.actionable.set(newActionable);
      return true;
    } catch (error) {
      console.error('Error creating actionable:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear el accionable. Por favor, inténtalo nuevamente.',
      });
      return false;
    }
  }

  // Estadísticas
  stats = computed(() => {
    const acc = this.actionable();
    if (!acc) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        totalAttachments: 0,
      };
    }
    return {
      totalTasks: acc.tasks?.length || 0,
      completedTasks: acc.tasks?.filter((t) => t.completed).length || 0,
      totalAttachments: acc.attachments?.length || 0,
    };
  });

  // Formatear fecha
  formattedDate = computed(() => {
    const fecha = this.fecha();
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // TAREAS (CHECKLIST)
  async addTask(): Promise<void> {
    if (!this.newTaskTitle.trim()) return;

    // Asegurar que el accionable existe
    const exists = await this.ensureActionableExists();
    if (!exists) return;

    const actionable = this.actionable();
    if (!actionable) return;

    this.loading.set(true);
    this.api
      .addActionableTask(this.fiId, actionable._id, { title: this.newTaskTitle.trim() })
      .subscribe({
        next: () => {
          this.newTaskTitle = '';
          this.loadActionable();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Tarea agregada correctamente',
          });
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  toggleTask(task: FiActionableTask): void {
    const actionable = this.actionable();
    if (!actionable || !task._id) return;

    this.loading.set(true);
    this.api
      .updateActionableTask(this.fiId, actionable._id, task._id, {
        completed: !task.completed,
      })
      .subscribe({
        next: () => {
          this.loadActionable();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Tarea actualizada correctamente',
          });
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  deleteTask(task: FiActionableTask): void {
    const actionable = this.actionable();
    if (!actionable || !task._id) return;

    this.loading.set(true);
    this.api.deleteActionableTask(this.fiId, actionable._id, task._id).subscribe({
      next: () => {
        this.loadActionable();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Tarea eliminada correctamente',
        });
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  // ARCHIVOS
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files) as File[];
      this.selectedFiles.set([...this.selectedFiles(), ...files]);
      // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
      input.value = '';
    }
  }

  onFileSelect(event: { files?: File[] | FileList }): void {
    const files = Array.from(event.files || []) as File[];
    this.selectedFiles.set([...this.selectedFiles(), ...files]);
  }

  onFileUploadError(event: { error?: { message?: string } }): void {
    // Ignorar errores de tipo de archivo cuando accept="*/*" ya que aceptamos cualquier tipo
    if (event.error && event.error.message && event.error.message.includes('Invalid file type')) {
      // El archivo se procesará en onSelect de todas formas
      return;
    }
    // Para otros errores, mostrar mensaje
    this.messageService.add({
      severity: 'error',
      summary: 'Error al seleccionar archivo',
      detail: event.error?.message || 'Error desconocido al seleccionar el archivo',
    });
  }

  removeFile(file: File): void {
    this.selectedFiles.set(this.selectedFiles().filter((f) => f !== file));
  }

  async uploadFiles(): Promise<void> {
    const files = this.selectedFiles();
    if (files.length === 0) return;

    // Asegurar que el accionable existe
    const exists = await this.ensureActionableExists();
    if (!exists) return;

    const actionable = this.actionable();
    if (!actionable) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información del usuario',
      });
      return;
    }

    this.uploading.set(true);
    this.uploadProgress.set(0);

    try {
      // Paso 1: Generar Presigned URLs
      const presignedResponses: PresignedUrlResponse[] = await firstValueFrom(
        this.api.generateActionableAttachmentPresignedUrls(this.fiId, actionable._id, {
          files: files.map((f) => ({
            fileName: f.name,
            contentType: f.type || 'application/octet-stream',
          })),
          expirationTime: 300,
        })
      );

      // Paso 2: Subir archivos directamente a S3
      const totalFiles = files.length;
      const progressPerFile = 80 / totalFiles;
      let currentProgress = 10;

      const uploadPromises = presignedResponses.map(
        (presignedResponse: PresignedUrlResponse, index: number) => {
          const file = files[index];
          return this.presignedUpload
            .uploadFileToS3(
              presignedResponse.presignedUrl,
              file,
              file.type || 'application/octet-stream',
              (progress) => {
                const fileProgress = (progress / 100) * progressPerFile;
                currentProgress = 10 + fileProgress + index * progressPerFile;
                this.uploadProgress.set(Math.min(currentProgress, 90));
              }
            )
            .then(() => presignedResponse);
        }
      );

      await Promise.all(uploadPromises);
      this.uploadProgress.set(90);

      // Paso 3: Confirmar subida al backend
      const attachments = presignedResponses.map(
        (presignedResponse: PresignedUrlResponse, index: number) => {
          const file = files[index];
          // Detectar mimeType basado en extensión si no está disponible
          let mimeType = file.type;
          if (!mimeType || mimeType === '') {
            const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            const mimeTypeMap: Record<string, string> = {
              '.pdf': 'application/pdf',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp',
              '.mp4': 'video/mp4',
              '.mov': 'video/quicktime',
              '.avi': 'video/x-msvideo',
              '.mp3': 'audio/mpeg',
              '.wav': 'audio/wav',
              '.doc': 'application/msword',
              '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              '.xls': 'application/vnd.ms-excel',
              '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };
            mimeType = mimeTypeMap[extension] || 'application/octet-stream';
          }
          return {
            publicUrl: presignedResponse.publicUrl,
            key: presignedResponse.key,
            originalName: file.name,
            mimeType: mimeType,
            size: Number(file.size), // Asegurar que sea número
            uploadedBy: String(currentUser.id), // Asegurar que sea string
          };
        }
      );

      await firstValueFrom(
        this.api.confirmActionableAttachments(this.fiId, actionable._id, { attachments })
      );

      this.uploadProgress.set(100);
      this.selectedFiles.set([]);
      this.uploading.set(false);
      this.loadActionable();

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Archivos subidos correctamente',
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      this.uploading.set(false);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al subir archivos. Por favor, intenta nuevamente.',
      });
    }
  }

  deleteAttachment(attachment: FiActionableAttachment): void {
    const actionable = this.actionable();
    if (!actionable || !attachment._id) return;

    this.loading.set(true);
    this.api.deleteActionableAttachment(this.fiId, actionable._id, attachment._id).subscribe({
      next: () => {
        this.loadActionable();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Archivo eliminado correctamente',
        });
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'pi pi-image';
    if (mimeType.startsWith('video/')) return 'pi pi-video';
    if (mimeType.startsWith('audio/')) return 'pi pi-volume-up';
    return 'pi pi-file';
  }

  back(): void {
    this.router.navigate(['/fi', this.fiId]);
  }
}
