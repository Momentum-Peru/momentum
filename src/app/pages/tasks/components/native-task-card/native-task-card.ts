import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Interfaces
import { Task } from '../../../../shared/interfaces/task.interface';

@Component({
  selector: 'app-native-task-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2.5 hover:shadow-md transition-shadow duration-200 cursor-pointer h-full flex flex-col"
      (click)="onCardClick()"
      (keyup.enter)="onCardClick()"
      (keyup.space)="onCardClick()"
      tabindex="0"
      role="button"
      [attr.aria-label]="'Ver detalles de la tarea: ' + task.title"
      [ngClass]="{
        'border-red-300 dark:border-red-500 bg-red-50 overdue-card': isOverdue(),
        'border-orange-300 dark:border-orange-500 bg-orange-50 due-today-card':
          isDueToday() && !isOverdue()
      }"
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-1.5">
        <h3 class="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1 flex-1 mr-1.5">
          {{ task.title }}
        </h3>
        <div class="flex items-center gap-0.5 flex-wrap">
          <!-- Overdue Badge -->
          @if (isOverdue()) {
          <span
            class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          >
            <svg class="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              ></path>
            </svg>
            <span>Vencida</span>
          </span>
          }
          <!-- Priority Badge -->
          <span
            class="inline-flex items-center px-1 py-0.5 rounded-full text-[9px] font-medium"
            [ngClass]="getPriorityClass()"
          >
            {{ getPriorityLabel() }}
          </span>
          <!-- Due Date Status Indicator -->
          @if (task.dueDate && task.status !== 'Terminada') {
          <span
            class="w-2 h-2 rounded-full flex-shrink-0"
            [ngClass]="getDueDateStatusClass()"
            [title]="getDueDateStatusTitle()"
          ></span>
          }
        </div>
      </div>

      <!-- Project and Tags (combined) -->
      @if (getProjectName() || (task.tags && task.tags.length > 0)) {
      <div class="flex flex-wrap items-center gap-1 mb-1.5">
        @if (getProjectName()) {
        <div
          class="inline-flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-[9px]"
        >
          <svg
            class="w-2 h-2 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            ></path>
          </svg>
          <span class="font-medium text-blue-700 dark:text-blue-300 truncate max-w-[100px]">
            {{ getProjectName() }}
          </span>
        </div>
        } @if (task.tags && task.tags.length > 0) { @for (tag of task.tags.slice(0, 3); track tag) {
        <span
          class="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          {{ tag }}
        </span>
        } @if (task.tags.length > 3) {
        <span
          class="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          +{{ task.tags.length - 3 }}
        </span>
        } }
      </div>
      }

      <!-- Description -->
      @if (task.description) {
      <p class="text-xs text-gray-600 dark:text-gray-400 mb-1.5 line-clamp-1">
        {{ task.description }}
      </p>
      }

      <!-- Incomplete Reason -->
      @if (task.incompleteReason) {
      <div class="mb-1.5 p-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded text-xs">
        <div class="flex items-start gap-1">
          <svg
            class="w-3 h-3 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            ></path>
          </svg>
          <div class="flex-1 min-w-0">
            <span class="font-semibold text-orange-700 dark:text-orange-300 text-[10px] block mb-0.5">
              No terminada:
            </span>
            <p class="text-orange-800 dark:text-orange-200 line-clamp-2 text-[10px] leading-tight">
              {{ task.incompleteReason }}
            </p>
          </div>
        </div>
      </div>
      }

      <!-- Footer -->
      <div class="flex flex-col gap-1 mt-auto">
        <!-- Due Date Row -->
        @if (task.dueDate) {
        <div class="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <svg
            class="w-2.5 h-2.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
          <span class="font-medium">Vence:</span>
          <span
            class="truncate"
            [class.text-red-600]="isOverdue()"
            [class.dark:text-red-400]="isOverdue()"
            [class.font-semibold]="isOverdue()"
            [title]="formatDate(task.dueDate)"
          >
            {{ formatDate(task.dueDate) }}
          </span>
          @if (getAssignedToName()) {
          <span class="font-medium">delegado:</span>
          <span class="truncate">{{ getAssignedToName() }}</span>
          }
        </div>
        }

        <!-- Actions and Created Date Row -->
        <div class="flex items-center justify-between gap-1">
          <!-- Created Date -->
          @if (task.createdAt) {
          <div
            class="flex items-center gap-0.5 min-w-0 text-xs text-gray-500 dark:text-gray-400 flex-wrap"
          >
            <svg
              class="w-2.5 h-2.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span class="font-medium">Creado:</span>
            <span class="truncate" [title]="formatDate(task.createdAt)">
              {{ formatDate(task.createdAt) }}
            </span>
            @if (getCreatedByName()) {
            <span class="font-medium">por:</span>
            <span class="truncate">{{ getCreatedByName() }}</span>
            }
          </div>
          }

          <!-- Actions -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              (click)="onEdit($event)"
              class="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs text-gray-400 hover:text-blue-600 transition-colors rounded flex-shrink-0"
              title="Editar tarea"
            >
              <svg
                class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                ></path>
              </svg>
              <span class="hidden sm:inline">Editar</span>
            </button>
            <button
              (click)="onDelete($event)"
              class="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs text-gray-400 hover:text-red-600 transition-colors rounded flex-shrink-0"
              title="Eliminar tarea"
            >
              <svg
                class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                ></path>
              </svg>
              <span class="hidden sm:inline">Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .line-clamp-1 {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      :host-context(.dark) .overdue-card {
        background-color: rgba(127, 29, 29, 0.2);
      }

      :host-context(.dark) .due-today-card {
        background-color: rgba(154, 52, 18, 0.2);
      }
    `,
  ],
})
export class NativeTaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Output() edit = new EventEmitter<Task>();
  @Output() delete = new EventEmitter<Task>();
  @Output() view = new EventEmitter<Task>();

  /**
   * Verifica si la tarea está vencida
   */
  public isOverdue(): boolean {
    if (!this.task.dueDate) return false;
    const now = new Date();
    const dueDate = new Date(this.task.dueDate);
    return dueDate < now && this.task.status !== 'Terminada';
  }

  /**
   * Verifica si la tarea se vence hoy
   */
  public isDueToday(): boolean {
    if (!this.task.dueDate || this.task.status === 'Terminada') return false;
    const now = new Date();
    const dueDate = new Date(this.task.dueDate);

    // Comparar solo día, mes y año (sin horas)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    return today.getTime() === due.getTime();
  }

  /**
   * Obtiene la clase CSS para el indicador de estado de vencimiento
   */
  public getDueDateStatusClass(): string {
    if (!this.task.dueDate || this.task.status === 'Terminada') return '';

    if (this.isOverdue()) {
      return 'bg-red-500 dark:bg-red-400';
    }

    if (this.isDueToday()) {
      return 'bg-orange-500 dark:bg-orange-400';
    }

    // Tarea que aún no vence
    return 'bg-green-500 dark:bg-green-400';
  }

  /**
   * Obtiene el título (tooltip) para el indicador de estado de vencimiento
   */
  public getDueDateStatusTitle(): string {
    if (!this.task.dueDate || this.task.status === 'Terminada') return '';

    if (this.isOverdue()) {
      return 'Tarea vencida';
    }

    if (this.isDueToday()) {
      return 'Vence hoy';
    }

    return 'Aún no vence';
  }

  /**
   * Obtiene la clase CSS para la prioridad
   */
  public getPriorityClass(): string {
    switch (this.task.priority) {
      case 'Alta':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      case 'Media':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 'Baja':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'Crítica':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  }

  /**
   * Obtiene la etiqueta de prioridad
   */
  public getPriorityLabel(): string {
    switch (this.task.priority) {
      case 'Alta':
        return 'Alta';
      case 'Media':
        return 'Media';
      case 'Baja':
        return 'Baja';
      case 'Crítica':
        return 'Crítica';
      default:
        return 'Sin prioridad';
    }
  }

  /**
   * Formatea la fecha y hora
   */
  public formatDate(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const dateStr = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${dateStr} ${timeStr}`;
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
   * Obtiene el nombre del usuario asignado (delegado)
   */
  public getAssignedToName(): string | null {
    if (!this.task?.assignedTo) return null;

    // Si assignedToName está disponible, usarlo directamente
    if (this.task.assignedToName) {
      return this.task.assignedToName;
    }

    // Si assignedTo es un objeto (poblado), extraer el nombre
    if (typeof this.task.assignedTo === 'object' && this.task.assignedTo !== null) {
      const userObj = this.task.assignedTo as { name?: string; email?: string };
      return userObj.name || userObj.email || null;
    }

    return null;
  }

  /**
   * Obtiene el nombre del usuario creador
   */
  public getCreatedByName(): string | null {
    if (!this.task?.createdBy) return null;

    // Si createdByName está disponible, usarlo directamente
    if (this.task.createdByName) {
      return this.task.createdByName;
    }

    // Si createdBy es un objeto (poblado), extraer el nombre
    if (typeof this.task.createdBy === 'object' && this.task.createdBy !== null) {
      const userObj = this.task.createdBy as { name?: string; email?: string };
      return userObj.name || userObj.email || null;
    }

    return null;
  }

  /**
   * Maneja el clic en la tarjeta
   */
  public onCardClick(): void {
    this.view.emit(this.task);
  }

  /**
   * Maneja el clic en editar
   */
  public onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.task);
  }

  /**
   * Maneja el clic en eliminar
   */
  public onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.task);
  }
}
