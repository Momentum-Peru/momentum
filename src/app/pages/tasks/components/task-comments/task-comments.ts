import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// PrimeNG Components
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';

// Services
import { TaskCommentsApiService } from '../../../../shared/services/task-comments-api.service';
import { AuthService } from '../../../login/services/auth.service';

// Interfaces
import {
  TaskComment,
  CreateTaskCommentRequest,
  Task,
} from '../../../../shared/interfaces/task.interface';

@Component({
  selector: 'app-task-comments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TextareaModule,
    CardModule,
    AvatarModule,
    TagModule,
    FileUploadModule,
    ProgressSpinnerModule,
    MessageModule,
  ],
  template: `
    <div class="task-comments">
      <!-- Comments List -->
      <div class="comments-list mb-6">
        @for (comment of comments; track comment._id) {
        <div class="comment-item mb-4">
          <p-card styleClass="comment-card">
            <div class="flex items-start gap-3">
              <!-- Avatar -->
              <p-avatar
                [label]="getInitials(getAuthorName(comment.createdBy))"
                size="normal"
                styleClass="bg-blue-500 text-white"
              >
              </p-avatar>

              <!-- Comment Content -->
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-medium text-gray-800">{{
                    getAuthorName(comment.createdBy)
                  }}</span>
                  <span class="text-xs text-gray-500">{{ formatDate(comment.createdAt) }}</span>
                  @if (comment.updatedAt !== comment.createdAt) {
                  <span class="text-xs text-gray-400">(editado)</span>
                  }
                </div>

                <p class="text-gray-700 mb-3">{{ comment.content }}</p>

                <!-- Comment Files -->
                @if (comment.attachments && comment.attachments.length > 0) {
                <div class="files-list mb-3">
                  @for (file of comment.attachments; track file._id) {
                  <div class="file-item flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <i class="pi pi-paperclip text-gray-500"></i>
                    <span class="text-sm text-gray-700">{{ file.originalName }}</span>
                    <span class="text-xs text-gray-500">({{ formatFileSize(file.fileSize) }})</span>
                    <p-button
                      icon="pi pi-download"
                      size="small"
                      [text]="true"
                      severity="secondary"
                      (onClick)="downloadFile(file)"
                      pTooltip="Descargar archivo"
                    >
                    </p-button>
                  </div>
                  }
                </div>
                }
              </div>
            </div>
          </p-card>
        </div>
        } @if (comments.length === 0) {
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-comment text-3xl mb-2"></i>
          <p>No hay comentarios aún</p>
        </div>
        }
      </div>

      <!-- Add Comment Form -->
      <div class="add-comment">
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4">
              <h4 class="text-lg font-semibold text-gray-800">Agregar Comentario</h4>
            </div>
          </ng-template>

          <form [formGroup]="commentForm()" (ngSubmit)="onSubmit()">
            <!-- Comment Text -->
            <div class="field mb-4">
              <textarea
                pTextarea
                formControlName="content"
                placeholder="Escribe tu comentario aquí..."
                rows="4"
                class="w-full"
              >
              </textarea>
            </div>

            <!-- File Upload -->
            <div class="field mb-4">
              <span id="fileUploadLabel" class="block text-sm font-medium text-gray-700 mb-2">
                Archivos adjuntos (opcional)
              </span>
              <p-fileUpload
                aria-labelledby="fileUploadLabel"
                mode="basic"
                name="files[]"
                [multiple]="true"
                accept="*/*"
                [maxFileSize]="10000000"
                (onSelect)="onFileSelect($event)"
                chooseLabel="Seleccionar archivos"
                class="w-full"
              >
              </p-fileUpload>
            </div>

            <!-- Selected Files -->
            @if (selectedFiles().length > 0) {
            <div class="selected-files mb-4">
              <h5 class="text-sm font-medium text-gray-700 mb-2">Archivos seleccionados:</h5>
              <div class="space-y-2">
                @for (file of selectedFiles(); track file.name) {
                <div class="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div class="flex items-center gap-2">
                    <i class="pi pi-file text-blue-600"></i>
                    <span class="text-sm text-blue-800">{{ file.name }}</span>
                    <span class="text-xs text-blue-600">({{ formatFileSize(file.size) }})</span>
                  </div>
                  <p-button
                    icon="pi pi-times"
                    size="small"
                    severity="danger"
                    [text]="true"
                    (onClick)="removeFile(file)"
                  >
                  </p-button>
                </div>
                }
              </div>
            </div>
            }

            <!-- Error Message -->
            @if (errorMessage()) {
            <p-message severity="error" [text]="errorMessage()!" class="mb-4"> </p-message>
            }

            <!-- Submit Button -->
            <div class="flex justify-end">
              <p-button
                type="submit"
                label="Agregar Comentario"
                [loading]="loading()"
                [disabled]="commentForm().invalid || loading()"
              >
              </p-button>
            </div>
          </form>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .comment-card {
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .comment-card:hover {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .file-item {
        border: 1px solid #e5e7eb;
      }

      .selected-files {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
      }

      .field {
        margin-bottom: 1rem;
      }

      :host ::ng-deep .comment-card .p-card {
        border-radius: 8px;
      }

      :host ::ng-deep .comment-card .p-card-body {
        padding: 1rem;
      }
    `,
  ],
})
export class TaskCommentsComponent {
  @Input({ required: true }) taskId!: string;
  @Input() comments: TaskComment[] = [];
  @Output() commentAdded = new EventEmitter<TaskComment>();

  private readonly fb = inject(FormBuilder);
  private readonly commentsService = inject(TaskCommentsApiService);
  private readonly authService = inject(AuthService);

  // Signals
  public readonly commentForm = signal<FormGroup>(this.createForm());
  public readonly loading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly selectedFiles = signal<File[]>([]);

  /**
   * Crea el formulario de comentario
   */
  private createForm(): FormGroup {
    return this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1)]],
    });
  }

  /**
   * Maneja el envío del formulario
   */
  public onSubmit(): void {
    if (this.commentForm().valid) {
      this.loading.set(true);
      this.errorMessage.set(null);

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.errorMessage.set('No se pudo obtener la información del usuario');
        this.loading.set(false);
        return;
      }

      const commentData: CreateTaskCommentRequest = {
        content: this.commentForm().get('content')?.value,
        taskId: this.taskId,
        createdBy: currentUser.id,
      };

      this.commentsService.createComment(commentData).subscribe({
        next: (response: Task) => {
          // El backend devuelve la tarea completa actualizada
          if (response && response.info && response.info.length > 0) {
            // Emitir el último comentario creado
            const lastComment = response.info[response.info.length - 1];
            if (lastComment) {
              // Si hay archivos seleccionados, subirlos
              if (this.selectedFiles().length > 0) {
                this.uploadFiles(lastComment._id);
              } else {
                this.commentAdded.emit(lastComment);
                this.resetForm();
              }
            }
          } else {
            this.errorMessage.set('Error: respuesta inesperada del servidor');
            this.loading.set(false);
          }
        },
        error: () => {
          this.errorMessage.set('Error al crear el comentario');
          this.loading.set(false);
        },
      });
    }
  }

  /**
   * Sube los archivos del comentario
   */
  private uploadFiles(commentId: string): void {
    const files = this.selectedFiles();
    let uploadCount = 0;
    const totalFiles = files.length;

    files.forEach((file) => {
      this.commentsService.uploadCommentFile(this.taskId, commentId, file).subscribe({
        next: () => {
          uploadCount++;
          if (uploadCount === totalFiles) {
            this.commentAdded.emit();
            this.resetForm();
          }
        },
        error: () => {
          this.errorMessage.set('Error al subir archivos');
          this.loading.set(false);
        },
      });
    });
  }

  /**
   * Maneja la selección de archivos
   */
  public onFileSelect(event: { files?: FileList | File[] }): void {
    const fileList = event.files;
    if (!fileList) return;
    const files = Array.from(fileList) as File[];
    this.selectedFiles.set([...this.selectedFiles(), ...files]);
  }

  /**
   * Remueve un archivo de la selección
   */
  public removeFile(file: File): void {
    const files = this.selectedFiles().filter((f) => f !== file);
    this.selectedFiles.set(files);
  }

  /**
   * Descarga un archivo
   */
  public downloadFile(file: { _id: string; originalName: string }): void {
    this.commentsService.downloadFile(this.taskId, file._id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        // Error al descargar archivo
      },
    });
  }

  /**
   * Resetea el formulario
   */
  private resetForm(): void {
    this.commentForm().reset();
    this.selectedFiles.set([]);
    this.loading.set(false);
    this.errorMessage.set(null);
  }

  /**
   * Obtiene el nombre del autor del comentario
   */
  public getAuthorName(createdBy: string | { name?: string; email?: string } | null | undefined): string {
    // Si createdBy es un objeto (poblado), usar directamente
    if (typeof createdBy === 'object' && createdBy !== null) {
      return createdBy.name || createdBy.email || 'Usuario';
    }

    // Si createdBy es un string (ID), buscar en el usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id === createdBy) {
      return currentUser?.name || currentUser?.email || 'Usuario actual';
    }

    return 'Usuario'; // Fallback genérico
  }

  /**
   * Obtiene las iniciales del nombre
   */
  public getInitials(name?: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Formatea la fecha
   */
  public formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formatea el tamaño del archivo
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
