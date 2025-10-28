import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// PrimeNG Components
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MenuModule } from 'primeng/menu';

// PrimeNG Services
import { ConfirmationService, MessageService } from 'primeng/api';

// Services
import { TasksApiService } from '../../shared/services/tasks-api.service';
import { TaskCommentsApiService } from '../../shared/services/task-comments-api.service';

// Native Components
import { NativeKanbanBoardComponent } from './components/native-kanban-board/native-kanban-board';
import { NativeTaskFormComponent } from './components/native-task-form/native-task-form';
import { NativeTaskStatsComponent } from './components/native-task-stats/native-task-stats';
import { TaskDetailsComponent } from './components/task-details/task-details';

// Interfaces
import {
  Task,
  TaskStatus,
  TasksSearchParams,
  DragDropEvent,
} from '../../shared/interfaces/task.interface';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    TagModule,
    ProgressSpinnerModule,
    MessageModule,
    ConfirmDialogModule,
    ToastModule,
    ToolbarModule,
    SplitButtonModule,
    MenuModule,
    NativeKanbanBoardComponent,
    NativeTaskFormComponent,
    NativeTaskStatsComponent,
    TaskDetailsComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Tareas</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              Organiza y gestiona tus tareas con el tablero Kanban
            </p>
          </div>
          <div class="flex items-center gap-3">
            <p-button
              icon="pi pi-refresh"
              [text]="true"
              severity="secondary"
              (onClick)="refreshTasks()"
              [loading]="tasksService.loading()"
              pTooltip="Actualizar tareas"
            >
            </p-button>
            <p-button
              icon="pi pi-plus"
              label="Nueva Tarea"
              (onClick)="openTaskForm()"
              severity="primary"
            >
            </p-button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <app-native-task-stats [stats]="tasksService.taskStats()" class="mb-6">
      </app-native-task-stats>

      <!-- Loading State -->
      @if (tasksService.loading()) {
      <div class="flex justify-center items-center py-12">
        <p-progressSpinner styleClass="w-8 h-8" strokeWidth="4"> </p-progressSpinner>
      </div>
      }

      <!-- Error State -->
      @if (tasksService.error()) {
      <p-message severity="error" [text]="tasksService.error()!" class="mb-6"> </p-message>
      }

      <!-- Native Kanban Board -->
      @if (!tasksService.loading() && !tasksService.error() && (tasksService.tasks() || []).length >
      0) {
      <app-native-kanban-board
        [tasksByStatus]="tasksService.tasksByStatus()"
        [loading]="tasksService.loading()"
        (taskStatusChanged)="onTaskStatusChanged($event)"
        (editTask)="openTaskForm($event)"
        (deleteTask)="confirmDeleteTask($event)"
        (viewTask)="viewTaskDetails($event)"
      >
      </app-native-kanban-board>
      }

      <!-- Empty State -->
      @if (!tasksService.loading() && !tasksService.error() && (tasksService.tasks() || []).length
      === 0) {
      <div class="text-center py-12">
        <i class="pi pi-inbox text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No hay tareas</h3>
        <p class="text-gray-500 dark:text-gray-500 mb-6">Comienza creando tu primera tarea</p>
        <p-button
          icon="pi pi-plus"
          label="Crear Primera Tarea"
          (onClick)="openTaskForm()"
          severity="primary"
        >
        </p-button>
      </div>
      }
    </div>

    <!-- Native Task Form Dialog -->
    <p-dialog
      [modal]="true"
      [(visible)]="showTaskForm"
      [style]="{ width: '700px' }"
      [closable]="true"
    >
      <app-native-task-form
        [task]="selectedTask() || undefined"
        (save)="onTaskSave($event)"
        (cancel)="closeTaskForm()"
      >
      </app-native-task-form>
    </p-dialog>

    <!-- Confirm Dialog -->
    <p-confirmDialog></p-confirmDialog>

    <!-- Toast Messages -->
    <p-toast></p-toast>

    <!-- Task Details Dialog -->
    <app-task-details
      [task]="selectedTask()"
      [visible]="showTaskDetails"
      (close)="closeTaskDetails()"
    >
    </app-task-details>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class TasksPage implements OnInit {
  public readonly tasksService = inject(TasksApiService);
  private readonly commentsService = inject(TaskCommentsApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // Signals
  public readonly showTaskForm = signal<boolean>(false);
  public readonly isEditing = signal<boolean>(false);
  public readonly selectedTask = signal<Task | null>(null);
  public readonly formLoading = signal<boolean>(false);
  public readonly filters = signal<TasksSearchParams>({});
  public readonly showTaskDetails = signal<boolean>(false);

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showTaskForm()) {
        this.selectedTask.set(null);
        this.isEditing.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.loadTasks();
  }

  /**
   * Carga las tareas iniciales
   */
  private loadTasks(): void {
    this.tasksService.getTasks(this.filters()).subscribe({
      next: () => {
        // Tareas cargadas exitosamente
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las tareas',
        });
      },
    });
  }

  /**
   * Refresca la lista de tareas
   */
  public refreshTasks(): void {
    this.tasksService.refreshTasks();
  }

  /**
   * Abre el formulario de tarea
   */
  public openTaskForm(task?: Task): void {
    if (task) {
      this.selectedTask.set(task);
      this.isEditing.set(true);
    } else {
      this.selectedTask.set(null);
      this.isEditing.set(false);
    }
    this.showTaskForm.set(true);
  }

  /**
   * Cierra el formulario de tarea
   */
  public closeTaskForm(): void {
    this.showTaskForm.set(false);
  }

  /**
   * Maneja el guardado de tareas
   */
  public onTaskSave(taskData: any): void {
    // El formulario ya maneja la creación/actualización
    // Solo cerramos el modal y refrescamos la lista
    this.closeTaskForm();
    this.refreshTasks();
  }

  /**
   * Maneja el cambio de filtros
   */
  public onFiltersChange(newFilters: TasksSearchParams): void {
    this.filters.set(newFilters);
    this.loadTasks();
  }

  /**
   * Maneja el cambio de estado de tareas (drag and drop)
   */
  public onTaskStatusChanged(event: DragDropEvent): void {
    this.tasksService.updateTaskStatus(event).subscribe({
      next: (updatedTask) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Tarea movida a ${event.newStatus}`,
        });
        // No necesitamos refrescar porque el servicio ya actualiza la lista local
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estado de la tarea',
        });
        // Refrescar la lista para revertir el cambio visual
        this.refreshTasks();
      },
    });
  }

  /**
   * Confirma la eliminación de una tarea
   */
  public confirmDeleteTask(task: Task): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar la tarea "${task.title}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.deleteTask(task._id);
      },
    });
  }

  /**
   * Elimina una tarea
   */
  private deleteTask(taskId: string): void {
    this.tasksService.deleteTask(taskId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Tarea eliminada',
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar la tarea',
        });
      },
    });
  }

  /**
   * Muestra los detalles de una tarea
   */
  public viewTaskDetails(task: Task): void {
    this.selectedTask.set(task);
    this.showTaskDetails.set(true);
  }

  /**
   * Cierra los detalles de la tarea
   */
  public closeTaskDetails(): void {
    this.showTaskDetails.set(false);
    this.selectedTask.set(null);
  }
}
