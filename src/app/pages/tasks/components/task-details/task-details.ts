import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

// PrimeNG Components
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';

// Services
import { TaskCommentsApiService } from '../../../../shared/services/task-comments-api.service';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../login/services/auth.service';

// Interfaces
import {
  Task,
  TaskComment,
  CreateTaskCommentRequest,
} from '../../../../shared/interfaces/task.interface';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    TagModule,
    ChipModule,
    AvatarModule,
    DividerModule,
    ScrollPanelModule,
    BadgeModule,
    TooltipModule,
    ProgressSpinnerModule,
    TextareaModule,
    MessageModule,
  ],
  template: `
    <p-dialog
      [modal]="true"
      [(visible)]="visible"
      [style]="{ width: '800px' }"
      [closable]="true"
      (onHide)="onClose()"
    >
      @if (task) {
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <!-- Header -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Detalles de la Tarea
          </h2>
        </div>
        <!-- Header Section -->
        <div class="mb-6">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {{ task.title }}
              </h3>
              <div class="flex items-center gap-3 mb-3">
                <!-- Status Badge -->
                <p-tag
                  [value]="task.status"
                  [severity]="getStatusSeverity(task.status)"
                  [rounded]="true"
                ></p-tag>

                <!-- Priority Badge -->
                <p-tag
                  [value]="task.priority"
                  [severity]="getPrioritySeverity(task.priority)"
                  [rounded]="true"
                ></p-tag>
              </div>
            </div>
          </div>

          <!-- Description -->
          @if (task.description) {
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ task.description }}
            </p>
          </div>
          }
        </div>

        <p-divider></p-divider>

        <!-- Task Information Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Left Column -->
          <div class="space-y-4">
            <!-- Assigned To -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Asignado a
              </h3>
              <div class="flex items-center gap-2">
                <p-avatar
                  [label]="getInitials(getAssignedToName())"
                  styleClass="bg-blue-500 text-white"
                  size="normal"
                ></p-avatar>
                <span class="text-gray-600 dark:text-gray-400">
                  {{ getAssignedToName() }}
                </span>
              </div>
            </div>

            <!-- Created By -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Creado por
              </h3>
              <div class="flex items-center gap-2">
                <p-avatar
                  [label]="getInitials(getCreatedByName())"
                  styleClass="bg-green-500 text-white"
                  size="normal"
                ></p-avatar>
                <span class="text-gray-600 dark:text-gray-400">
                  {{ getCreatedByName() }}
                </span>
              </div>
            </div>

            <!-- Created Date -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Fecha de creación
              </h3>
              <div class="flex items-center gap-2">
                <i class="pi pi-clock text-gray-500"></i>
                <span class="text-gray-600 dark:text-gray-400">
                  {{ formatDateTime(task.createdAt) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="space-y-4">
            <!-- Due Date -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Fecha límite
              </h3>
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar text-gray-500"></i>
                <span
                  class="text-gray-600 dark:text-gray-400"
                  [class.text-red-600]="isOverdue()"
                  [class.dark:text-red-400]="isOverdue()"
                  [class.font-semibold]="isOverdue()"
                >
                  {{ task.dueDate ? formatDate(task.dueDate) : 'Sin fecha límite' }}
                </span>
                @if (isOverdue()) {
                <p-badge value="Vencida" severity="danger"></p-badge>
                }
              </div>
            </div>

            <!-- Last Updated -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Última actualización
              </h3>
              <div class="flex items-center gap-2">
                <i class="pi pi-refresh text-gray-500"></i>
                <span class="text-gray-600 dark:text-gray-400">
                  {{ formatDateTime(task.updatedAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tags -->
        @if (task.tags && task.tags.length > 0) {
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Etiquetas</h3>
          <div class="flex flex-wrap gap-2">
            @for (tag of task.tags; track tag) {
            <p-chip
              [label]="tag"
              styleClass="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            ></p-chip>
            }
          </div>
        </div>
        }

        <p-divider></p-divider>

        <!-- Comments Section -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Comentarios</h3>
            <p-badge [value]="task.info?.length || 0" severity="info"></p-badge>
          </div>

          @if (commentsLoading()) {
          <div class="flex justify-center py-4">
            <p-progressSpinner styleClass="w-6 h-6" strokeWidth="4"></p-progressSpinner>
          </div>
          } @else if (task.info && task.info.length > 0) {
          <p-scrollPanel [style]="{ height: '300px' }">
            <div class="space-y-4 pr-4">
              @for (comment of task.info; track comment._id) {
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 group">
                <div class="flex items-start gap-3">
                  <p-avatar
                    [label]="getInitials(getAuthorName(comment.createdBy))"
                    styleClass="bg-purple-500 text-white"
                    size="normal"
                  ></p-avatar>
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-gray-900 dark:text-white text-sm">
                          {{ getAuthorName(comment.createdBy) }}
                        </span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                          {{ formatDateTime(comment.createdAt) }}
                        </span>
                      </div>
                      <p-button
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        [text]="true"
                        (onClick)="deleteComment(comment)"
                        pTooltip="Eliminar comentario"
                        class="opacity-0 group-hover:opacity-100 transition-opacity"
                      ></p-button>
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {{ comment.content }}
                    </p>

                    <!-- Comment Files -->
                    @if (comment.attachments && comment.attachments.length > 0) {
                    <div class="mt-3">
                      <div class="flex flex-wrap gap-2">
                        @for (file of comment.attachments || []; track file._id) {
                        <div
                          class="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600"
                        >
                          <i class="pi pi-file text-gray-500"></i>
                          <span class="text-sm text-gray-700 dark:text-gray-300">
                            {{ file.originalName }}
                          </span>
                          <span class="text-xs text-gray-500 dark:text-gray-400">
                            ({{ formatFileSize(file.fileSize) }})
                          </span>
                        </div>
                        }
                      </div>
                    </div>
                    }
                  </div>
                </div>
              </div>
              }
            </div>
          </p-scrollPanel>
          } @else {
          <div class="text-center py-8 text-gray-500 dark:text-gray-400">
            <i class="pi pi-comments text-4xl mb-3"></i>
            <p>No hay comentarios aún</p>
          </div>
          }
        </div>

        <!-- Add Comment Section -->
        <div class="mt-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Agregar Comentario
          </h3>

          @if (commentError()) {
          <p-message severity="error" [text]="commentError()!" class="mb-4"></p-message>
          }

          <form [formGroup]="commentForm" (ngSubmit)="onSubmitComment()">
            <div class="space-y-4">
              <div>
                <textarea
                  pInputTextarea
                  formControlName="content"
                  placeholder="Escribe tu comentario aquí..."
                  rows="4"
                  class="w-full"
                  [class.p-invalid]="
                    commentForm.get('content')?.invalid && commentForm.get('content')?.touched
                  "
                ></textarea>
                @if (commentForm.get('content')?.invalid && commentForm.get('content')?.touched) {
                <small class="text-red-500 dark:text-red-400 mt-1 block">
                  El comentario es requerido y debe tener al menos 3 caracteres
                </small>
                }
              </div>

              <div class="flex justify-end gap-2">
                <p-button
                  label="Cancelar"
                  severity="secondary"
                  [text]="true"
                  type="button"
                  (onClick)="onClose()"
                ></p-button>
                <p-button
                  label="Agregar Comentario"
                  severity="primary"
                  type="submit"
                  [loading]="commentsService.loading()"
                  [disabled]="commentForm.invalid"
                ></p-button>
              </div>
            </div>
          </form>
        </div>

        <!-- Files Section -->
        @if (task.files && task.files.length > 0) {
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Archivos adjuntos
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            @for (file of task.files; track file._id) {
            <div
              class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <i class="pi pi-file text-gray-500 text-lg"></i>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ file.originalName }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatFileSize(file.fileSize) }} • {{ formatDateTime(file.uploadedAt) }}
                </p>
              </div>
              <p-button
                icon="pi pi-download"
                [text]="true"
                size="small"
                severity="secondary"
                pTooltip="Descargar archivo"
              ></p-button>
            </div>
            }
          </div>
        </div>
        }
      </div>
      }
    </p-dialog>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class TaskDetailsComponent {
  @Input() task: Task | null = null;
  @Input() visible = signal<boolean>(false);
  @Output() close = new EventEmitter<void>();

  public readonly commentsService = inject(TaskCommentsApiService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  // Signals
  public readonly commentsLoading = signal<boolean>(false);
  public readonly commentError = signal<string | null>(null);

  // Form
  public readonly commentForm: FormGroup;

  constructor() {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  /**
   * Verifica si la tarea está vencida
   */
  public isOverdue(): boolean {
    if (!this.task?.dueDate) return false;
    const now = new Date();
    const dueDate = new Date(this.task.dueDate);
    return dueDate < now && this.task.status !== 'Terminada';
  }

  /**
   * Obtiene la severidad del estado para PrimeNG
   */
  public getStatusSeverity(
    status: string
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null | undefined {
    switch (status) {
      case 'Pendiente':
        return 'warn';
      case 'En curso':
        return 'info';
      case 'Terminada':
        return 'success';
      default:
        return 'secondary';
    }
  }

  /**
   * Obtiene la severidad de la prioridad para PrimeNG
   */
  public getPrioritySeverity(
    priority: string
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null | undefined {
    switch (priority) {
      case 'Crítica':
        return 'danger';
      case 'Alta':
        return 'danger';
      case 'Media':
        return 'warn';
      case 'Baja':
        return 'success';
      default:
        return 'secondary';
    }
  }

  /**
   * Obtiene el nombre de la persona asignada
   */
  public getAssignedToName(): string {
    if (!this.task) return 'Sin asignar';

    // Si assignedTo es un objeto (poblado), usar directamente
    if (typeof this.task.assignedTo === 'object' && this.task.assignedTo !== null) {
      return (this.task.assignedTo as any).name || (this.task.assignedTo as any).email || 'Usuario';
    }

    // Si assignedToName está disponible, usarlo
    if (this.task.assignedToName) {
      return this.task.assignedToName;
    }

    // Si assignedTo es un string (ID), buscar en el usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id === this.task.assignedTo) {
      return currentUser?.name || currentUser?.email || 'Usuario actual';
    }

    return 'Sin asignar';
  }

  /**
   * Obtiene el nombre de la persona que creó la tarea
   */
  public getCreatedByName(): string {
    if (!this.task) return 'Usuario';

    // Si createdBy es un objeto (poblado), usar directamente
    if (typeof this.task.createdBy === 'object' && this.task.createdBy !== null) {
      return (this.task.createdBy as any).name || (this.task.createdBy as any).email || 'Usuario';
    }

    // Si createdByName está disponible, usarlo
    if (this.task.createdByName) {
      return this.task.createdByName;
    }

    // Si createdBy es un string (ID), buscar en el usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id === this.task.createdBy) {
      return currentUser?.name || currentUser?.email || 'Usuario actual';
    }

    return 'Usuario';
  }

  /**
   * Obtiene el nombre del autor del comentario
   */
  public getAuthorName(createdBy: any): string {
    // Si createdBy es un objeto (poblado), usar directamente
    if (typeof createdBy === 'object' && createdBy !== null) {
      return createdBy.name || createdBy.email || 'Usuario';
    }

    // Si createdBy es un string (ID), buscar en el usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id === createdBy) {
      return currentUser?.name || currentUser?.email || 'Usuario actual';
    }

    // Buscar en la información de la tarea si hay datos del usuario
    if (this.task?.createdBy && typeof this.task.createdBy === 'object') {
      const createdByObj = this.task.createdBy as any;
      if (createdByObj._id === createdBy) {
        return createdByObj.name || createdByObj.email || 'Usuario';
      }
    }

    return 'Usuario'; // Fallback genérico
  }

  /**
   * Obtiene las iniciales de un nombre
   */
  public getInitials(name?: string): string {
    if (!name || typeof name !== 'string') return '?';
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Formatea una fecha
   */
  public formatDate(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Formatea una fecha y hora
   */
  public formatDateTime(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formatea el tamaño de archivo
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Maneja el cierre del modal
   */
  public onClose(): void {
    this.visible.set(false);
    this.close.emit();
  }

  /**
   * Maneja el envío del formulario de comentario
   */
  public onSubmitComment(): void {
    if (this.commentForm.valid && this.task) {
      const currentUser = this.authService.getCurrentUser();

      if (!currentUser?.id) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo obtener la información del usuario',
        });
        return;
      }

      const commentData = {
        content: this.commentForm.get('content')?.value,
        taskId: this.task._id,
        createdBy: currentUser.id,
      } as CreateTaskCommentRequest;

      this.commentError.set(null);
      this.commentsService.createComment(commentData).subscribe({
        next: (response) => {
          // El backend devuelve la tarea completa actualizada
          if (response && response._id) {
            // Actualizar la tarea completa con la información del servidor
            if (this.task && response.info) {
              this.task.info = response.info;
            }

            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Comentario agregado correctamente',
            });

            this.resetCommentForm();
          } else {
            console.warn('Comment created but with unexpected structure:', response);
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'Comentario creado pero con estructura inesperada',
            });
            this.resetCommentForm();
          }
        },
        error: (error) => {
          this.commentError.set('Error al agregar el comentario');
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo agregar el comentario',
          });
        },
      });
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.commentForm.controls).forEach((key) => {
        this.commentForm.get(key)?.markAsTouched();
      });
    }
  }

  /**
   * Resetea el formulario de comentario
   */
  public resetCommentForm(): void {
    this.commentForm.reset();
    this.commentError.set(null);
  }

  /**
   * Elimina un comentario
   */
  public deleteComment(comment: TaskComment): void {
    if (!this.task || !comment._id) return;

    this.commentsService.deleteComment(this.task._id, comment._id).subscribe({
      next: () => {
        // Remover el comentario de la lista local
        if (this.task?.info) {
          this.task.info = this.task.info.filter((c) => c._id !== comment._id);
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Comentario eliminado correctamente',
        });
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el comentario',
        });
      },
    });
  }
}
