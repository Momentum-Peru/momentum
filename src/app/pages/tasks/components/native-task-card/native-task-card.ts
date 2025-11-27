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
      class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
      (click)="onCardClick()"
      (keyup.enter)="onCardClick()"
      (keyup.space)="onCardClick()"
      tabindex="0"
      role="button"
      [attr.aria-label]="'Ver detalles de la tarea: ' + task.title"
      [class.border-red-300]="isOverdue()"
      [class.dark:border-red-500]="isOverdue()"
      [class.bg-red-50]="isOverdue()"
      [class.dark:bg-red-900/20]="isOverdue()"
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1 mr-2">
          {{ task.title }}
        </h3>
        <div class="flex items-center gap-1">
          <!-- Priority Badge -->
          <span
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            [ngClass]="getPriorityClass()"
          >
            {{ getPriorityLabel() }}
          </span>
        </div>
      </div>

      <!-- Project -->
      @if (getProjectName()) {
      <div class="mb-2">
        <div class="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <svg class="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
          <span class="text-xs font-medium text-blue-700 dark:text-blue-300">
            {{ getProjectName() }}
          </span>
        </div>
      </div>
      }

      <!-- Description -->
      @if (task.description) {
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {{ task.description }}
      </p>
      }

      <!-- Tags -->
      @if (task.tags && task.tags.length > 0) {
      <div class="flex flex-wrap gap-1 mb-3">
        @for (tag of task.tags; track tag) {
        <span
          class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          {{ tag }}
        </span>
        }
      </div>
      }

      <!-- Footer -->
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <!-- Due Date -->
        @if (task.dueDate) {
        <div class="flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
          <span
            [class.text-red-600]="isOverdue()"
            [class.dark:text-red-400]="isOverdue()"
            [class.font-semibold]="isOverdue()"
          >
            {{ formatDate(task.dueDate) }}
          </span>
        </div>
        }

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <button
            (click)="onEdit($event)"
            class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Editar tarea"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              ></path>
            </svg>
          </button>
          <button
            (click)="onDelete($event)"
            class="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Eliminar tarea"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Overdue Warning -->
      @if (isOverdue()) {
      <div class="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
        <div class="flex items-center gap-1">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            ></path>
          </svg>
          <span class="font-semibold">Tarea vencida</span>
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
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
   * Formatea la fecha
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
