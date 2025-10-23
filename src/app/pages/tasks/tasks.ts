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
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

// PrimeNG Services
import { ConfirmationService, MessageService } from 'primeng/api';

// Services
import { TasksApiService } from '../../shared/services/tasks-api.service';
import { TaskCommentsApiService } from '../../shared/services/task-comments-api.service';

// Native Components
import { NativeKanbanBoardComponent } from './components/native-kanban-board/native-kanban-board';
import { NativeTaskFormComponent } from './components/native-task-form/native-task-form';
import { NativeTaskStatsComponent } from './components/native-task-stats/native-task-stats';

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
    TableModule,
    TooltipModule,
    NativeKanbanBoardComponent,
    NativeTaskFormComponent,
    NativeTaskStatsComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Gestión de Tareas</h1>
            <p class="text-gray-600 mt-1">Organiza y gestiona tus tareas con el tablero Kanban</p>
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

      <!-- Search and Stats -->
      <div class="mb-6 space-y-4">
        <!-- Search Bar -->
        <div class="flex items-center gap-2">
          <input
            pInputText
            placeholder="Buscar tareas..."
            [ngModel]="searchQuery()"
            (ngModelChange)="setSearchQuery($event)"
            class="w-full"
          />
        </div>

        <!-- Stats Cards -->
        <app-native-task-stats [stats]="tasksService.taskStats()"> </app-native-task-stats>
      </div>

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

      <!-- Tasks Table -->
      @if (!tasksService.loading() && !tasksService.error() && (filteredTasks() || []).length > 0) {
      <p-table [value]="filteredTasks()" [tableStyle]="{ 'min-width': '50rem' }">
        <ng-template pTemplate="header">
          <tr>
            <th>Título</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Asignado a</th>
            <th>Fecha Límite</th>
            <th>Etiquetas</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              <div class="max-w-xs">
                <p class="font-semibold truncate">{{ row.title }}</p>
              </div>
            </td>
            <td>
              <div class="max-w-xs">
                <p class="text-sm text-gray-600 truncate">
                  {{ row.description || 'Sin descripción' }}
                </p>
              </div>
            </td>
            <td>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                [class]="getStatusClass(row.status)"
              >
                {{ getStatusLabel(row.status) }}
              </span>
            </td>
            <td>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                [class]="getPriorityClass(row.priority)"
              >
                {{ getPriorityLabel(row.priority) }}
              </span>
            </td>
            <td>
              <span class="text-sm">{{ getAssignedUserName(row.assignedTo) }}</span>
            </td>
            <td>
              <span class="text-sm">{{ row.dueDate | date : 'dd/MM/yyyy' }}</span>
            </td>
            <td>
              @if (row.tags && row.tags.length > 0) {
              <div class="flex flex-wrap gap-1">
                @for (tag of row.tags; track tag) {
                <span
                  class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {{ tag }}
                </span>
                }
              </div>
              } @else {
              <span class="text-gray-400 text-sm">Sin etiquetas</span>
              }
            </td>
            <td class="text-right">
              <button
                pButton
                icon="pi pi-pencil"
                class="p-button-text"
                (click)="openTaskForm(row)"
                pTooltip="Editar tarea"
                tooltipPosition="top"
              ></button>
              <button
                pButton
                icon="pi pi-trash"
                class="p-button-text p-button-danger"
                (click)="confirmDeleteTask(row)"
                pTooltip="Eliminar tarea"
                tooltipPosition="top"
              ></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
      }

      <!-- Empty State -->
      @if (!tasksService.loading() && !tasksService.error() && (filteredTasks() || []).length === 0)
      {
      <div class="text-center py-12">
        <i class="pi pi-inbox text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay tareas</h3>
        <p class="text-gray-500 mb-6">Comienza creando tu primera tarea</p>
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
  public readonly searchQuery = signal<string>('');
  public readonly filteredTasks = signal<Task[]>([]);

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showTaskForm()) {
        this.selectedTask.set(null);
        this.isEditing.set(false);
      }
    });

    // Efecto para filtrar tareas cuando cambie la búsqueda
    effect(() => {
      this.applyFilters();
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
        this.applyFilters();
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
      // Preparar la tarea para edición
      const editedTask = {
        ...task,
        // Asegurar que assignedTo sea un string si viene como objeto
        assignedTo:
          typeof task.assignedTo === 'object' &&
          task.assignedTo !== null &&
          '_id' in task.assignedTo
            ? (task.assignedTo as any)._id
            : task.assignedTo,
        // Convertir fechas de string a Date si es necesario
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      };

      this.selectedTask.set(editedTask);
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
   * Establece la consulta de búsqueda
   */
  public setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  /**
   * Aplica filtros a las tareas
   */
  private applyFilters(): void {
    const allTasks = this.tasksService.tasks() || [];
    const query = this.searchQuery().toLowerCase().trim();

    let filtered = [...allTasks];

    if (query) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query)) ||
          task.status.toLowerCase().includes(query) ||
          task.priority.toLowerCase().includes(query) ||
          (task.tags && task.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    }

    this.filteredTasks.set(filtered);
  }

  /**
   * Maneja el cambio de estado de tareas (drag and drop)
   */
  public onTaskStatusChanged(event: DragDropEvent): void {
    this.tasksService.updateTask(event.taskId, { status: event.newStatus }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Estado de tarea actualizado',
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estado de la tarea',
        });
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

  /**
   * Obtiene la etiqueta del estado
   */
  public getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      Pendiente: 'Pendiente',
      'En curso': 'En curso',
      Terminada: 'Terminada',
    };
    return statusLabels[status] || status;
  }

  /**
   * Obtiene la clase CSS para el estado
   */
  public getStatusClass(status: string): string {
    switch (status) {
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'En curso':
        return 'bg-blue-100 text-blue-800';
      case 'Terminada':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Obtiene la etiqueta de prioridad
   */
  public getPriorityLabel(priority: string): string {
    const priorityLabels: { [key: string]: string } = {
      Baja: 'Baja',
      Media: 'Media',
      Alta: 'Alta',
      Crítica: 'Crítica',
    };
    return priorityLabels[priority] || priority;
  }

  /**
   * Obtiene la clase CSS para la prioridad
   */
  public getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Baja':
        return 'bg-green-100 text-green-800';
      case 'Media':
        return 'bg-yellow-100 text-yellow-800';
      case 'Alta':
        return 'bg-orange-100 text-orange-800';
      case 'Crítica':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Obtiene el nombre del usuario asignado
   */
  public getAssignedUserName(assignedTo: any): string {
    if (typeof assignedTo === 'object' && assignedTo !== null && 'name' in assignedTo) {
      return assignedTo.name;
    }
    return 'Usuario no encontrado';
  }
}
