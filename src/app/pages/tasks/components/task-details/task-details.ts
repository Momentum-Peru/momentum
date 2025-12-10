import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
import { TasksApiService } from '../../../../shared/services/tasks-api.service';
import { LogsApiService, Log } from '../../../../shared/services/logs-api.service';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../login/services/auth.service';

// Interfaces
import {
  Task,
  TaskComment,
  CreateTaskCommentRequest,
  TaskSubtask,
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
      (onShow)="onDialogShow()"
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

          <!-- Project -->
          @if (getProjectName()) {
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Proyecto</h3>
            <div
              class="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <i class="pi pi-folder text-blue-600 dark:text-blue-400"></i>
              <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
                {{ getProjectName() }}
              </span>
            </div>
          </div>
          }

          <!-- Description -->
          @if (task.description) {
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ task.description }}
            </p>
          </div>
          }

          <!-- Incomplete Reason -->
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Razón por la que no se terminó la tarea
            </h3>
            <div class="space-y-2">
              <textarea
                pInputTextarea
                [(ngModel)]="incompleteReasonValue"
                placeholder="Explica por qué no se pudo terminar la tarea..."
                rows="3"
                class="w-full"
                [class.p-invalid]="incompleteReasonError()"
              ></textarea>
              @if (incompleteReasonError()) {
              <small class="text-red-500 dark:text-red-400 block">
                {{ incompleteReasonError() }}
              </small>
              }
              <div class="flex justify-end gap-2">
                <p-button
                  label="Guardar razón"
                  icon="pi pi-save"
                  severity="primary"
                  size="small"
                  (onClick)="saveIncompleteReason()"
                  [loading]="savingIncompleteReason()"
                  [disabled]="savingIncompleteReason()"
                ></p-button>
              </div>
            </div>
          </div>

          <!-- Subtasks -->
          @if (task.subtasks && task.subtasks.length > 0) {
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Subtareas</h3>
            <div class="space-y-2">
              @for (subtask of task.subtasks; track subtask._id || $index) {
              <div
                class="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <input
                  type="checkbox"
                  [id]="'subtask-' + $index"
                  [checked]="subtask.completed"
                  (change)="toggleSubtask(subtask)"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label
                  [for]="'subtask-' + $index"
                  [class.line-through]="subtask.completed"
                  [class.text-gray-400]="subtask.completed"
                  class="flex-1 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {{ subtask.title }}
                </label>
              </div>
              }
            </div>
          </div>
          }

          <!-- Attachments -->
          @if (task.attachments && task.attachments.length > 0) {
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Archivos Adjuntos
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              @for (attachment of task.attachments; track attachment._id || $index) {
              <div
                class="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <i class="pi pi-file text-gray-500 text-lg"></i>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ attachment.originalName }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatFileSize(attachment.size) }}
                  </p>
                </div>
                <a
                  [href]="attachment.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  pTooltip="Abrir archivo"
                >
                  <i class="pi pi-external-link"></i>
                </a>
              </div>
              }
            </div>
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
                Fecha y hora límite
              </h3>
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar text-gray-500"></i>
                <span
                  class="text-gray-600 dark:text-gray-400"
                  [class.text-red-600]="isOverdue()"
                  [class.dark:text-red-400]="isOverdue()"
                  [class.font-semibold]="isOverdue()"
                >
                  {{ task.dueDate ? formatDateTime(task.dueDate) : 'Sin fecha límite' }}
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

            <!-- Last Modified By -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Última modificación
              </h3>
              @if (logsLoading()) {
              <div class="flex items-center gap-2">
                <i class="pi pi-spin pi-spinner text-gray-500"></i>
                <span class="text-gray-600 dark:text-gray-400 text-sm">Cargando...</span>
              </div>
              } @else if (lastModificationLog()) {
              <div class="flex items-center gap-2">
                <p-avatar
                  [label]="getInitials(getLastModifierName())"
                  styleClass="bg-purple-500 text-white"
                  size="normal"
                ></p-avatar>
                <div class="flex-1">
                  <div class="text-sm text-gray-600 dark:text-gray-400">
                    <span class="font-medium">{{ getLastModifierName() }}</span>
                    <span> {{ getLastModificationAction() }} la tarea</span>
                  </div>
                  @if (getLastModificationDate()) {
                  <div class="text-xs text-gray-500 dark:text-gray-500">
                    {{ getLastModificationDate() }}
                  </div>
                  }
                </div>
              </div>
              } @else {
              <div class="flex items-center gap-2">
                <i class="pi pi-info-circle text-gray-400"></i>
                <span class="text-gray-500 dark:text-gray-400 text-sm"
                  >Sin información de modificación</span
                >
              </div>
              }
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
                    <div class="mt-3 space-y-2">
                      @for (file of comment.attachments || []; track file._id) {
                      <div
                        class="bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden"
                      >
                        @if (file.mimeType && file.mimeType.startsWith('audio/')) {
                        <!-- Audio -->
                        <div class="p-3">
                          <div class="flex items-center gap-2 mb-2">
                            <i class="pi pi-volume-up text-blue-500"></i>
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {{ file.originalName }}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              ({{ formatFileSize(file.size || 0) }})
                            </span>
                          </div>
                          <audio [src]="file.url" controls class="w-full"></audio>
                        </div>
                        } @else if (file.mimeType && file.mimeType.startsWith('video/')) {
                        <!-- Video -->
                        <div class="p-3">
                          <div class="flex items-center gap-2 mb-2">
                            <i class="pi pi-video text-red-500"></i>
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {{ file.originalName }}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              ({{ formatFileSize(file.size || 0) }})
                            </span>
                          </div>
                          <video [src]="file.url" controls class="w-full max-h-64 rounded"></video>
                        </div>
                        } @else if (file.mimeType && file.mimeType.startsWith('image/')) {
                        <!-- Imagen -->
                        <div class="p-3">
                          <div class="flex items-center gap-2 mb-2">
                            <i class="pi pi-image text-green-500"></i>
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {{ file.originalName }}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              ({{ formatFileSize(file.size || 0) }})
                            </span>
                          </div>
                          <img
                            [src]="file.url"
                            [alt]="file.originalName"
                            class="w-full max-h-64 object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                            (click)="openFileInNewTab(file.url)"
                            (keydown.enter)="openFileInNewTab(file.url)"
                            tabindex="0"
                            role="button"
                            [attr.aria-label]="'Abrir imagen ' + file.originalName"
                          />
                        </div>
                        } @else if (file.mimeType === 'application/pdf') {
                        <!-- PDF -->
                        <div class="p-3">
                          <div class="flex items-center justify-between gap-2 mb-2">
                            <div class="flex items-center gap-2">
                              <i class="pi pi-file-pdf text-red-500"></i>
                              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {{ file.originalName }}
                              </span>
                              <span class="text-xs text-gray-500 dark:text-gray-400">
                                ({{ formatFileSize(file.size || 0) }})
                              </span>
                            </div>
                          </div>
                          <!-- Miniatura del PDF -->
                          <div
                            class="relative w-full border border-gray-200 dark:border-gray-600 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
                            (click)="openPdfModal(file.url, file.originalName)"
                            (keydown.enter)="openPdfModal(file.url, file.originalName)"
                            tabindex="0"
                            role="button"
                            [attr.aria-label]="'Ver PDF completo: ' + file.originalName"
                          >
                            <!-- Miniatura - Primera página del PDF -->
                            <iframe
                              [src]="getSafePdfUrl(file.url, 1)"
                              class="w-full pointer-events-none"
                              style="height: 200px; border: none;"
                              title="Miniatura del PDF"
                              loading="lazy"
                            ></iframe>
                            <!-- Overlay con información -->
                            <div
                              class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center"
                            >
                              <div
                                class="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2"
                              >
                                <i class="pi pi-eye text-blue-600 dark:text-blue-400"></i>
                                <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                                  >Ver PDF completo</span
                                >
                              </div>
                            </div>
                          </div>
                        </div>
                        } @else {
                        <!-- Documento genérico -->
                        <div class="flex items-center gap-2 p-3">
                          <i class="pi pi-file text-gray-500"></i>
                          <span class="text-sm text-gray-700 dark:text-gray-300 flex-1">
                            {{ file.originalName }}
                          </span>
                          <span class="text-xs text-gray-500 dark:text-gray-400">
                            ({{ formatFileSize(file.size || 0) }})
                          </span>
                          <a
                            [href]="file.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            pTooltip="Abrir archivo"
                          >
                            <i class="pi pi-external-link"></i>
                          </a>
                        </div>
                        }
                      </div>
                      }
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

          <!-- Zona de Drag and Drop -->
          <div
            [class]="
              isDragging()
                ? 'mb-4 p-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'mb-4 p-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            "
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="documentsInput.click()"
            role="button"
            tabindex="0"
            (keydown.enter)="documentsInput.click()"
            (keydown.space)="documentsInput.click()"
            [attr.aria-label]="
              'Zona de arrastrar y soltar archivos. Haz clic para seleccionar archivos'
            "
          >
            <div class="text-center">
              <i
                class="pi pi-cloud-upload text-5xl mb-3 transition-colors"
                [class.text-blue-500]="isDragging()"
                [class.text-gray-400]="!isDragging()"
                [class.dark:text-gray-500]="!isDragging()"
              ></i>
              <p
                class="text-sm font-medium mb-1 transition-colors"
                [class.text-blue-700]="isDragging()"
                [class.dark:text-blue-300]="isDragging()"
                [class.text-gray-700]="!isDragging()"
                [class.dark:text-gray-300]="!isDragging()"
              >
                @if (isDragging()) {
                <span>Suelta los archivos aquí</span>
                } @else {
                <span>Arrastra archivos aquí o haz clic para seleccionar</span>
                }
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Imágenes desde WhatsApp, videos, audios o documentos desde tu PC
              </p>
            </div>
          </div>

          <form [formGroup]="commentForm" (ngSubmit)="onSubmitComment()">
            <div class="space-y-4">
              <div>
                <textarea
                  pInputTextarea
                  formControlName="content"
                  placeholder="Escribe tu comentario aquí (opcional si subes archivos)..."
                  rows="4"
                  class="w-full"
                  [class.p-invalid]="
                    commentForm.get('content')?.invalid && commentForm.get('content')?.touched
                  "
                ></textarea>
                @if (commentForm.get('content')?.invalid && commentForm.get('content')?.touched) {
                <small class="text-red-500 dark:text-red-400 mt-1 block">
                  Si escribes un comentario, debe tener al menos 3 caracteres
                </small>
                }
              </div>

              <!-- Botones de Media -->
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  pButton
                  icon="pi pi-volume-up"
                  label="Audio"
                  (click)="audioInput.click()"
                  class="flex-1 min-w-[100px]"
                  severity="secondary"
                  [outlined]="pendingAudio().length === 0"
                  aria-label="Seleccionar archivos de audio"
                ></button>
                <input
                  type="file"
                  #audioInput
                  accept="audio/*"
                  capture
                  multiple
                  (change)="onAudioSelected($event)"
                  class="hidden"
                />

                <button
                  type="button"
                  pButton
                  icon="pi pi-image"
                  label="Foto"
                  (click)="photoInput.click()"
                  class="flex-1 min-w-[100px]"
                  severity="secondary"
                  [outlined]="pendingPhoto().length === 0"
                  aria-label="Seleccionar fotos"
                ></button>
                <input
                  type="file"
                  #photoInput
                  accept="image/*"
                  capture="environment"
                  multiple
                  (change)="onPhotoSelected($event)"
                  class="hidden"
                />

                <button
                  type="button"
                  pButton
                  icon="pi pi-video"
                  label="Video"
                  (click)="videoInput.click()"
                  class="flex-1 min-w-[100px]"
                  severity="secondary"
                  [outlined]="pendingVideo().length === 0"
                  aria-label="Seleccionar videos"
                ></button>
                <input
                  type="file"
                  #videoInput
                  accept="video/*"
                  capture
                  multiple
                  (change)="onVideoSelected($event)"
                  class="hidden"
                />
              </div>

              <!-- Archivos seleccionados -->
              @if (pendingAudio().length > 0 || pendingPhoto().length > 0 || pendingVideo().length >
              0 || pendingDocuments().length > 0) {
              <div class="space-y-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                @if (pendingAudio().length > 0) {
                <div class="text-sm">
                  <span class="font-medium text-gray-700 dark:text-gray-300">Audios:</span>
                  @for (file of pendingAudio(); track $index) {
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-gray-600 dark:text-gray-400 text-xs">{{ file.name }}</span>
                    <button
                      type="button"
                      pButton
                      icon="pi pi-times"
                      [text]="true"
                      severity="danger"
                      size="small"
                      (click)="removePendingAudio($index)"
                      [attr.aria-label]="'Eliminar ' + file.name"
                    ></button>
                  </div>
                  }
                </div>
                } @if (pendingPhoto().length > 0) {
                <div class="text-sm">
                  <span class="font-medium text-gray-700 dark:text-gray-300">Fotos:</span>
                  @for (file of pendingPhoto(); track $index) {
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-gray-600 dark:text-gray-400 text-xs">{{ file.name }}</span>
                    <button
                      type="button"
                      pButton
                      icon="pi pi-times"
                      [text]="true"
                      severity="danger"
                      size="small"
                      (click)="removePendingPhoto($index)"
                      [attr.aria-label]="'Eliminar ' + file.name"
                    ></button>
                  </div>
                  }
                </div>
                } @if (pendingVideo().length > 0) {
                <div class="text-sm">
                  <span class="font-medium text-gray-700 dark:text-gray-300">Videos:</span>
                  @for (file of pendingVideo(); track $index) {
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-gray-600 dark:text-gray-400 text-xs">{{ file.name }}</span>
                    <button
                      type="button"
                      pButton
                      icon="pi pi-times"
                      [text]="true"
                      severity="danger"
                      size="small"
                      (click)="removePendingVideo($index)"
                      [attr.aria-label]="'Eliminar ' + file.name"
                    ></button>
                  </div>
                  }
                </div>
                } @if (pendingDocuments().length > 0) {
                <div class="text-sm">
                  <span class="font-medium text-gray-700 dark:text-gray-300">Documentos:</span>
                  @for (file of pendingDocuments(); track $index) {
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-gray-600 dark:text-gray-400 text-xs">{{ file.name }}</span>
                    <button
                      type="button"
                      pButton
                      icon="pi pi-times"
                      [text]="true"
                      severity="danger"
                      size="small"
                      (click)="removePendingDocument($index)"
                      [attr.aria-label]="'Eliminar ' + file.name"
                    ></button>
                  </div>
                  }
                </div>
                }
              </div>
              }

              <!-- Campo de Documentos -->
              <div>
                <label
                  for="documents-input"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Documentos
                </label>
                <button
                  type="button"
                  pButton
                  icon="pi pi-file"
                  label="Elegir archivos"
                  (click)="documentsInput.click()"
                  severity="secondary"
                  [outlined]="true"
                  class="w-full"
                  aria-label="Seleccionar documentos"
                ></button>
                <input
                  type="file"
                  id="documents-input"
                  #documentsInput
                  accept="*/*"
                  multiple
                  (change)="onDocumentsSelected($event)"
                  class="hidden"
                />
                @if (pendingDocuments().length === 0) {
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ningún archivo seleccionado
                </p>
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
                  label="Agregar"
                  severity="primary"
                  type="submit"
                  [loading]="commentsService.loading()"
                  [disabled]="commentForm.invalid"
                ></p-button>
              </div>
            </div>
          </form>
        </div>
      </div>
      }
    </p-dialog>

    <!-- Modal del PDF -->
    <p-dialog
      [modal]="true"
      [visible]="showPdfModal()"
      (visibleChange)="showPdfModal.set($event)"
      (onHide)="closePdfModal()"
      [style]="{ width: '90vw', maxWidth: '1200px' }"
      [contentStyle]="{ height: '90vh', display: 'flex', flexDirection: 'column', padding: '0' }"
      [closable]="true"
      [maximizable]="true"
      [header]="selectedPdfName() || 'Visualizador de PDF'"
    >
      @if (selectedPdfUrl()) {
      <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        <!-- Botones de acción -->
        <div
          class="flex items-center justify-end gap-2 p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
        >
          <p-button
            icon="pi pi-download"
            label="Descargar PDF"
            severity="primary"
            (onClick)="downloadPdf(selectedPdfUrl()!, selectedPdfName() || 'documento.pdf')"
            pTooltip="Descargar el PDF"
          ></p-button>
        </div>

        <!-- Contenedor del PDF -->
        <div
          style="flex: 1; overflow: hidden; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: #f3f4f6;"
        >
          <iframe
            [src]="getSafePdfUrl(selectedPdfUrl()!)"
            style="width: 100%; height: 100%; border: none; display: block;"
            title="Visualizador de PDF"
            loading="lazy"
          ></iframe>
        </div>
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
  @Input() visible = false;
  @Output() closeDialog = new EventEmitter<void>();

  public readonly commentsService = inject(TaskCommentsApiService);
  private readonly tasksApiService = inject(TasksApiService);
  private readonly logsApiService = inject(LogsApiService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  // Signals
  public readonly commentsLoading = signal<boolean>(false);
  public readonly commentError = signal<string | null>(null);
  public readonly pendingAudio = signal<File[]>([]);
  public readonly pendingPhoto = signal<File[]>([]);
  public readonly pendingVideo = signal<File[]>([]);
  public readonly pendingDocuments = signal<File[]>([]);
  public readonly isDragging = signal<boolean>(false);
  public readonly lastModificationLog = signal<Log | null>(null);
  public readonly logsLoading = signal<boolean>(false);
  public readonly showPdfModal = signal<boolean>(false);
  public readonly selectedPdfUrl = signal<string | null>(null);
  public readonly selectedPdfName = signal<string | null>(null);
  public readonly incompleteReasonValue = signal<string>('');
  public readonly incompleteReasonError = signal<string | null>(null);
  public readonly savingIncompleteReason = signal<boolean>(false);

  // Form
  public readonly commentForm: FormGroup;

  constructor() {
    this.commentForm = this.fb.group({
      content: ['', [Validators.minLength(3)]], // Opcional, pero si se escribe debe tener al menos 3 caracteres
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
      const assignedToObj = this.task.assignedTo as { name?: string; email?: string };
      return assignedToObj.name || assignedToObj.email || 'Usuario';
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
      const createdByObj = this.task.createdBy as { name?: string; email?: string };
      return createdByObj.name || createdByObj.email || 'Usuario';
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
   * Obtiene el nombre del proyecto
   */
  public getProjectName(): string | null {
    if (!this.task?.projectId) return null;

    // Si projectId es un objeto (poblado), usar directamente
    if (typeof this.task.projectId === 'object' && this.task.projectId !== null) {
      const projectObj = this.task.projectId as { name?: string; code?: string };
      if (projectObj.code && projectObj.name) {
        return `${projectObj.code} - ${projectObj.name}`;
      }
      return projectObj.name || projectObj.code || null;
    }

    return null;
  }

  /**
   * Obtiene el nombre del autor del comentario
   */
  public getAuthorName(
    createdBy: string | { name?: string; email?: string; _id?: string } | null | undefined
  ): string {
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
      const createdByObj = this.task.createdBy as { _id?: string; name?: string; email?: string };
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
    this.closeDialog.emit();
  }

  /**
   * Maneja cuando se abre el diálogo
   */
  public onDialogShow(): void {
    if (this.task?._id) {
      this.loadLastModificationLog(this.task._id);
      // Inicializar el valor de la razón de no terminación
      this.incompleteReasonValue.set(this.task?.incompleteReason || '');
    }
  }

  /**
   * Maneja el envío del formulario de comentario
   */
  public async onSubmitComment(): Promise<void> {
    if (!this.task) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información del usuario',
      });
      return;
    }

    // Verificar si hay archivos seleccionados
    const hasFiles =
      this.pendingAudio().length > 0 ||
      this.pendingPhoto().length > 0 ||
      this.pendingVideo().length > 0 ||
      this.pendingDocuments().length > 0;

    // Obtener el contenido del comentario
    const content = this.commentForm.get('content')?.value?.trim() || '';

    // Validar: debe haber comentario O archivos
    if (!content && !hasFiles) {
      this.commentError.set('Debes escribir un comentario o seleccionar archivos para subir');
      return;
    }

    // Validar: si hay comentario, debe tener al menos 3 caracteres
    if (content && content.length < 3) {
      this.commentError.set('El comentario debe tener al menos 3 caracteres');
      return;
    }

    // Si no hay comentario pero hay archivos, crear un comentario automático
    const finalContent = content || this.generateCommentFileDescriptionMessage();

    const commentData = {
      content: finalContent,
      taskId: this.task._id,
      createdBy: currentUser.id,
    } as CreateTaskCommentRequest;

    this.commentError.set(null);
    this.commentsService.createComment(commentData).subscribe({
      next: async (response) => {
        // El backend devuelve la tarea completa actualizada
        if (response && response._id) {
          // Actualizar la tarea completa con la información del servidor
          if (this.task && response.info) {
            this.task.info = response.info;
          }

          // Obtener el ID del comentario recién creado
          const newComment = response.info?.[response.info.length - 1];
          if (newComment?._id) {
            // Subir archivos multimedia si hay
            const hasFiles =
              this.pendingAudio().length > 0 ||
              this.pendingPhoto().length > 0 ||
              this.pendingVideo().length > 0 ||
              this.pendingDocuments().length > 0;

            if (hasFiles) {
              // Convertir el ID a string si es necesario
              const commentId =
                typeof newComment._id === 'string'
                  ? newComment._id
                  : typeof newComment._id === 'object' &&
                    newComment._id !== null &&
                    '_id' in newComment._id
                  ? String((newComment._id as { _id?: string })._id || newComment._id)
                  : String(newComment._id);

              await this.uploadCommentFiles(commentId);
            } else {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Comentario agregado correctamente',
              });
            }
          } else {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Comentario agregado correctamente',
            });
          }

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
      error: () => {
        this.commentError.set('Error al agregar el comentario');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo agregar el comentario',
        });
      },
    });
  }

  /**
   * Resetea el formulario de comentario
   */
  public resetCommentForm(): void {
    this.commentForm.reset();
    this.commentError.set(null);
    this.pendingAudio.set([]);
    this.pendingPhoto.set([]);
    this.pendingVideo.set([]);
    this.pendingDocuments.set([]);
  }

  /**
   * Genera un mensaje descriptivo basado en los archivos del comentario
   */
  private generateCommentFileDescriptionMessage(): string {
    const audioCount = this.pendingAudio().length;
    const photoCount = this.pendingPhoto().length;
    const videoCount = this.pendingVideo().length;
    const docCount = this.pendingDocuments().length;

    const parts: string[] = [];
    if (audioCount > 0) parts.push(`${audioCount} audio${audioCount > 1 ? 's' : ''}`);
    if (photoCount > 0) parts.push(`${photoCount} foto${photoCount > 1 ? 's' : ''}`);
    if (videoCount > 0) parts.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
    if (docCount > 0) parts.push(`${docCount} documento${docCount > 1 ? 's' : ''}`);

    if (parts.length === 0) return 'Archivos subidos';
    if (parts.length === 1) return `Se subió ${parts[0]}`;
    if (parts.length === 2) return `Se subieron ${parts[0]} y ${parts[1]}`;
    return `Se subieron ${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
  }

  /**
   * Maneja la selección de archivos de audio
   */
  public onAudioSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.pendingAudio.set([...this.pendingAudio(), ...files]);
      input.value = '';
    }
  }

  /**
   * Maneja la selección de fotos
   */
  public onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.pendingPhoto.set([...this.pendingPhoto(), ...files]);
      input.value = '';
    }
  }

  /**
   * Maneja la selección de videos
   */
  public onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.pendingVideo.set([...this.pendingVideo(), ...files]);
      input.value = '';
    }
  }

  /**
   * Maneja la selección de documentos
   */
  public onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.pendingDocuments.set([...this.pendingDocuments(), ...files]);
      input.value = '';
    }
  }

  /**
   * Elimina un archivo de audio pendiente
   */
  public removePendingAudio(index: number): void {
    const current = this.pendingAudio();
    current.splice(index, 1);
    this.pendingAudio.set([...current]);
  }

  /**
   * Elimina una foto pendiente
   */
  public removePendingPhoto(index: number): void {
    const current = this.pendingPhoto();
    current.splice(index, 1);
    this.pendingPhoto.set([...current]);
  }

  /**
   * Elimina un video pendiente
   */
  public removePendingVideo(index: number): void {
    const current = this.pendingVideo();
    current.splice(index, 1);
    this.pendingVideo.set([...current]);
  }

  /**
   * Elimina un documento pendiente
   */
  public removePendingDocument(index: number): void {
    const current = this.pendingDocuments();
    current.splice(index, 1);
    this.pendingDocuments.set([...current]);
  }

  /**
   * Abre un archivo en una nueva pestaña
   */
  public openFileInNewTab(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Sanitiza la URL del PDF para uso seguro en iframe
   */
  public getSafePdfUrl(url: string, page?: number): SafeResourceUrl {
    // Agregar #page=1 para mostrar solo la primera página (para miniatura)
    const pageParam = page ? `#page=${page}` : '#page=1';
    const pdfUrl = url + pageParam;
    return this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
  }

  /**
   * Abre el modal del PDF
   */
  public openPdfModal(url: string, fileName: string): void {
    this.selectedPdfUrl.set(url);
    this.selectedPdfName.set(fileName);
    this.showPdfModal.set(true);
  }

  /**
   * Cierra el modal del PDF
   */
  public closePdfModal(): void {
    this.showPdfModal.set(false);
    this.selectedPdfUrl.set(null);
    this.selectedPdfName.set(null);
  }

  /**
   * Descarga el PDF
   */
  public downloadPdf(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Maneja el evento dragover
   */
  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  /**
   * Maneja el evento dragleave
   */
  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  /**
   * Maneja el evento drop
   */
  public onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    this.processDroppedFiles(Array.from(files));
  }

  /**
   * Procesa los archivos arrastrados y los clasifica según su tipo
   */
  private processDroppedFiles(files: File[]): void {
    files.forEach((file) => {
      const fileType = file.type || '';
      const fileName = file.name.toLowerCase();

      // Clasificar por tipo MIME primero
      if (fileType.startsWith('audio/')) {
        // Archivo de audio
        this.pendingAudio.set([...this.pendingAudio(), file]);
      } else if (fileType.startsWith('image/')) {
        // Archivo de imagen (incluye imágenes de WhatsApp)
        this.pendingPhoto.set([...this.pendingPhoto(), file]);
      } else if (fileType.startsWith('video/')) {
        // Archivo de video
        this.pendingVideo.set([...this.pendingVideo(), file]);
      } else {
        // Si no hay tipo MIME, intentar clasificar por extensión
        // Esto es útil para archivos de WhatsApp que pueden no tener tipo MIME
        if (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
          // Imagen por extensión
          this.pendingPhoto.set([...this.pendingPhoto(), file]);
        } else if (fileName.match(/\.(mp3|wav|ogg|aac|m4a|flac)$/i)) {
          // Audio por extensión
          this.pendingAudio.set([...this.pendingAudio(), file]);
        } else if (fileName.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i)) {
          // Video por extensión
          this.pendingVideo.set([...this.pendingVideo(), file]);
        } else {
          // Documento genérico o archivo sin tipo MIME definido
          this.pendingDocuments.set([...this.pendingDocuments(), file]);
        }
      }
    });

    // Mostrar mensaje de éxito
    this.messageService.add({
      severity: 'info',
      summary: 'Archivos agregados',
      detail: `${files.length} archivo(s) agregado(s) correctamente`,
    });
  }

  /**
   * Sube los archivos multimedia después de crear el comentario usando Presigned URLs
   */
  private async uploadCommentFiles(commentId: string): Promise<void> {
    if (!this.task) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información del usuario',
      });
      return;
    }

    const allFiles: File[] = [
      ...this.pendingAudio(),
      ...this.pendingPhoto(),
      ...this.pendingVideo(),
      ...this.pendingDocuments(),
    ];

    if (allFiles.length === 0) return;

    try {
      // Subir todos los archivos usando Presigned URLs
      const updatedTask = await this.commentsService.uploadCommentFiles(
        this.task._id,
        commentId,
        allFiles,
        currentUser.id,
        (progress) => {
          // Opcional: mostrar progreso
          console.log(`Progreso de subida: ${progress}%`);
        }
      );

      // Actualizar la tarea con los datos del servidor
      if (this.task) {
        this.task = updatedTask;
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `${allFiles.length} archivo(s) subido(s) correctamente`,
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al subir archivos',
      });
    }
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

  /**
   * Carga el último log de modificación de la tarea
   */
  private loadLastModificationLog(taskId: string): void {
    this.logsLoading.set(true);
    this.logsApiService.findByModulo('tasks', 100).subscribe({
      next: (logs) => {
        // Filtrar logs que correspondan a esta tarea específica
        // Los logs tienen el taskId en detalle.entityId, detalle.datos._id, o en la URL
        const taskLogs = logs.filter((log) => {
          const detalle = log.detalle || {};

          // Buscar en entityId (ID extraído de la URL en actualizaciones/eliminaciones)
          if (detalle['entityId'] === taskId) {
            return true;
          }

          // Buscar en datos._id (si el body contiene el _id)
          if (detalle['datos'] && typeof detalle['datos'] === 'object') {
            const datos = detalle['datos'] as Record<string, unknown>;
            if (datos['_id'] === taskId || datos['taskId'] === taskId) {
              return true;
            }
          }

          // Buscar en la URL (para casos donde la URL contiene el taskId)
          const url = detalle['url'] as string | undefined;
          if (url && url.includes(`/tasks/${taskId}`)) {
            return true;
          }

          return false;
        });

        // Ordenar por fecha de modificación descendente y tomar el más reciente
        if (taskLogs.length > 0) {
          const sortedLogs = taskLogs.sort((a, b) => {
            const dateA = new Date(a.fechaModificacion).getTime();
            const dateB = new Date(b.fechaModificacion).getTime();
            return dateB - dateA;
          });
          this.lastModificationLog.set(sortedLogs[0]);
        } else {
          this.lastModificationLog.set(null);
        }
        this.logsLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading task logs:', error);
        this.lastModificationLog.set(null);
        this.logsLoading.set(false);
      },
    });
  }

  /**
   * Obtiene el nombre del usuario que modificó la tarea
   */
  public getLastModifierName(): string {
    const log = this.lastModificationLog();
    if (!log) return 'N/A';

    const userId = log.userId;
    if (typeof userId === 'object' && userId !== null) {
      return userId.name || userId.email || 'Usuario';
    }

    return 'Usuario';
  }

  /**
   * Obtiene la fecha de la última modificación desde el log
   */
  public getLastModificationDate(): string | null {
    const log = this.lastModificationLog();
    if (!log) return null;
    return this.formatDateTime(log.fechaModificacion);
  }

  /**
   * Obtiene la acción de la última modificación
   */
  public getLastModificationAction(): string {
    const log = this.lastModificationLog();
    if (!log || !log.detalle) return 'modificó';

    const detalle = log.detalle;
    const accion = (detalle as { accion?: string }).accion;

    if (accion) {
      switch (accion) {
        case 'crear':
          return 'creó';
        case 'actualizar':
          return 'actualizó';
        case 'eliminar':
          return 'eliminó';
        default:
          return accion;
      }
    }

    return 'modificó';
  }

  /**
   * Marca o desmarca una subtarea
   */
  public toggleSubtask(subtask: TaskSubtask): void {
    if (!this.task || !subtask._id) {
      // Si la subtarea no tiene _id, solo actualizar localmente (puede ser una subtarea nueva)
      if (this.task?.subtasks) {
        const index = this.task.subtasks.findIndex((st) => st === subtask);
        if (index !== -1) {
          this.task.subtasks[index] = {
            ...this.task.subtasks[index],
            completed: !subtask.completed,
          };
        }
      }
      return;
    }

    const newCompletedState = !subtask.completed;

    // Actualizar localmente primero para mejor UX
    if (this.task?.subtasks) {
      const index = this.task.subtasks.findIndex((st) => st._id === subtask._id);
      if (index !== -1) {
        this.task.subtasks[index] = { ...this.task.subtasks[index], completed: newCompletedState };
      }
    }

    this.tasksApiService
      .updateSubtaskStatus(this.task._id, subtask._id, newCompletedState)
      .subscribe({
        next: (updatedTask) => {
          // Si el backend devuelve la tarea completa actualizada, usar esos datos
          if (updatedTask.subtasks && this.task) {
            this.task.subtasks = updatedTask.subtasks;
          }
        },
        error: (error) => {
          console.error('Error updating subtask:', error);
          // Revertir el cambio local en caso de error
          if (this.task?.subtasks) {
            const index = this.task.subtasks.findIndex((st) => st._id === subtask._id);
            if (index !== -1) {
              this.task.subtasks[index] = {
                ...this.task.subtasks[index],
                completed: !newCompletedState,
              };
            }
          }
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la subtarea',
          });
        },
      });
  }

  /**
   * Guarda la razón de no terminación
   */
  public saveIncompleteReason(): void {
    if (!this.task) return;

    const value = this.incompleteReasonValue().trim();
    
    // Si el valor no cambió, no hacer nada
    const currentValue = this.task.incompleteReason || '';
    if (value === currentValue) {
      this.messageService.add({
        severity: 'info',
        summary: 'Sin cambios',
        detail: 'No hay cambios para guardar',
      });
      return;
    }

    // Validación: si se proporciona un valor, debe tener al menos 3 caracteres
    if (value && value.length < 3) {
      this.incompleteReasonError.set('La razón debe tener al menos 3 caracteres');
      return;
    }

    this.savingIncompleteReason.set(true);
    this.incompleteReasonError.set(null);

    const updateData = {
      incompleteReason: value || undefined,
    };

    this.tasksApiService.updateTask(this.task._id, updateData).subscribe({
      next: (updatedTask) => {
        // Actualizar la tarea local
        if (this.task) {
          this.task.incompleteReason = updatedTask.incompleteReason;
        }
        this.savingIncompleteReason.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: value ? 'Razón guardada correctamente' : 'Razón eliminada correctamente',
        });
      },
      error: (error) => {
        console.error('Error saving incomplete reason:', error);
        this.incompleteReasonError.set('Error al guardar la razón');
        this.savingIncompleteReason.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la razón',
        });
      },
    });
  }
}
