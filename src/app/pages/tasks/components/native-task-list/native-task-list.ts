import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { SelectModule } from 'primeng/select';

// Components
import { NativeTaskCardComponent } from '../native-task-card/native-task-card';

// Interfaces
import { Task, TaskStatus, DragDropEvent } from '../../../../shared/interfaces/task.interface';

@Component({
  selector: 'app-native-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NativeTaskCardComponent, SelectModule],
  template: `
    <div class="space-y-4">
      <!-- Header con estadísticas -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ allTasks().length }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {{ pendingTasks().length }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Pendientes</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{ inProgressTasks().length }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">En curso</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ completedTasks().length }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Terminadas</div>
          </div>
        </div>
      </div>

      <!-- Filtros de estado -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          (click)="selectedStatus.set('all')"
          [class]="
            selectedStatus() === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          "
          class="px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Todas ({{ allTasks().length }})
        </button>
        <button
          (click)="selectedStatus.set('Pendiente')"
          [class]="
            selectedStatus() === 'Pendiente'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          "
          class="px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Pendientes ({{ pendingTasks().length }})
        </button>
        <button
          (click)="selectedStatus.set('En curso')"
          [class]="
            selectedStatus() === 'En curso'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          "
          class="px-4 py-2 rounded-lg font-medium transition-colors"
        >
          En curso ({{ inProgressTasks().length }})
        </button>
        <button
          (click)="selectedStatus.set('Terminada')"
          [class]="
            selectedStatus() === 'Terminada'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          "
          class="px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Terminadas ({{ completedTasks().length }})
        </button>
      </div>

      <!-- Lista de tareas -->
      @if (filteredTasks().length > 0) {
      <div class="space-y-3">
        @for (task of filteredTasks(); track task._id) {
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
          <!-- Selector de estado -->
          <div class="px-3 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between gap-2">
              <label class="text-xs font-medium text-gray-600 dark:text-gray-400">
                Estado:
              </label>
              <p-select
                [ngModel]="task.status"
                (ngModelChange)="onStatusChange(task, $event)"
                [options]="statusOptions"
                optionLabel="label"
                optionValue="value"
                [appendTo]="'body'"
                styleClass="w-32 text-xs"
                [showClear]="false"
              >
                <ng-template let-status pTemplate="item">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-2 h-2 rounded-full"
                      [class]="getStatusColorClass(status.value)"
                    ></div>
                    <span>{{ status.label }}</span>
                  </div>
                </ng-template>
                <ng-template let-status pTemplate="selectedItem">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-2 h-2 rounded-full"
                      [class]="getStatusColorClass(status.value)"
                    ></div>
                    <span class="text-xs">{{ status.label }}</span>
                  </div>
                </ng-template>
              </p-select>
            </div>
          </div>
          <!-- Tarjeta de tarea -->
          <app-native-task-card
            [task]="task"
            (edit)="onEditTask($event)"
            (delete)="onDeleteTask($event)"
            (view)="onViewTask($event)"
          ></app-native-task-card>
        </div>
        }
      </div>
      } @else {
      <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <svg
          class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          ></path>
        </svg>
        <p class="text-gray-500 dark:text-gray-400 text-lg font-medium">
          No hay tareas
          @if (selectedStatus() !== 'all') {
          <span>con estado "{{ selectedStatus() }}"</span>
          }
        </p>
        <p class="text-gray-400 dark:text-gray-500 text-sm mt-2">
          Crea una nueva tarea para comenzar
        </p>
      </div>
      }

      <!-- Botón para crear tarea -->
      <div class="flex justify-center pt-4">
        <button
          (click)="onCreateTask()"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          Nueva Tarea
        </button>
      </div>
    </div>
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
export class NativeTaskListComponent {
  @Input({ required: true })
  set tasksByStatus(value: { pending: Task[]; inProgress: Task[]; completed: Task[] }) {
    this.localTasksByStatus.set({
      pending: [...value.pending],
      inProgress: [...value.inProgress],
      completed: [...value.completed],
    });
  }

  @Input() loading = false;

  @Output() taskStatusChanged = new EventEmitter<DragDropEvent>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<Task>();
  @Output() viewTask = new EventEmitter<Task>();
  @Output() createTask = new EventEmitter<void>();

  // Copia local de las tareas para actualización optimista
  private readonly localTasksByStatus = signal<{
    pending: Task[];
    inProgress: Task[];
    completed: Task[];
  }>({
    pending: [],
    inProgress: [],
    completed: [],
  });

  // Estado del filtro
  public readonly selectedStatus = signal<TaskStatus | 'all'>('all');

  // Opciones de estado
  public readonly statusOptions = [
    { label: 'Pendiente', value: 'Pendiente' },
    { label: 'En curso', value: 'En curso' },
    { label: 'Terminada', value: 'Terminada' },
  ];

  // Computed para todas las tareas usando la copia local
  public readonly allTasks = computed(() => {
    const local = this.localTasksByStatus();
    return [
      ...local.pending,
      ...local.inProgress,
      ...local.completed,
    ];
  });

  public readonly pendingTasks = computed(() => this.localTasksByStatus().pending);
  public readonly inProgressTasks = computed(() => this.localTasksByStatus().inProgress);
  public readonly completedTasks = computed(() => this.localTasksByStatus().completed);

  // Tareas filtradas según el estado seleccionado y ordenadas
  public readonly filteredTasks = computed(() => {
    const status = this.selectedStatus();
    let tasks = status === 'all' ? this.allTasks() : this.allTasks().filter((task) => task.status === status);
    
    // Ordenar tareas: primero las vencidas, luego por prioridad, luego por fecha de creación
    return tasks.sort((a, b) => {
      // 1. Tareas vencidas primero
      const aOverdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'Terminada';
      const bOverdue = b.dueDate && new Date(b.dueDate) < new Date() && b.status !== 'Terminada';
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // 2. Ordenar por prioridad (Crítica > Alta > Media > Baja)
      const priorityOrder: Record<string, number> = { 'Crítica': 4, 'Alta': 3, 'Media': 2, 'Baja': 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // 3. Ordenar por fecha de creación (más recientes primero)
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return bDate - aDate;
    });
  });

  /**
   * Maneja la edición de una tarea
   */
  public onEditTask(task: Task): void {
    this.editTask.emit(task);
  }

  /**
   * Maneja la eliminación de una tarea
   */
  public onDeleteTask(task: Task): void {
    this.deleteTask.emit(task);
  }

  /**
   * Maneja la visualización de una tarea
   */
  public onViewTask(task: Task): void {
    this.viewTask.emit(task);
  }

  /**
   * Maneja la creación de una nueva tarea
   */
  public onCreateTask(): void {
    this.createTask.emit();
  }

  /**
   * Maneja el cambio de estado de una tarea con actualización optimista
   */
  public onStatusChange(task: Task, newStatus: TaskStatus): void {
    if (task.status === newStatus || !task._id) {
      return;
    }

    // Actualización optimista: actualizar localmente inmediatamente
    const local = this.localTasksByStatus();
    const updatedTask = { ...task, status: newStatus };

    // Remover la tarea del estado anterior
    const removeFromArray = (arr: Task[], taskId: string) => {
      return arr.filter((t) => t._id !== taskId);
    };

    // Agregar la tarea al nuevo estado
    const addToArray = (arr: Task[], task: Task) => {
      return [...arr, task];
    };

    let updatedPending = local.pending;
    let updatedInProgress = local.inProgress;
    let updatedCompleted = local.completed;

    // Remover del estado anterior
    if (task.status === 'Pendiente') {
      updatedPending = removeFromArray(updatedPending, task._id);
    } else if (task.status === 'En curso') {
      updatedInProgress = removeFromArray(updatedInProgress, task._id);
    } else if (task.status === 'Terminada') {
      updatedCompleted = removeFromArray(updatedCompleted, task._id);
    }

    // Agregar al nuevo estado
    if (newStatus === 'Pendiente') {
      updatedPending = addToArray(updatedPending, updatedTask);
    } else if (newStatus === 'En curso') {
      updatedInProgress = addToArray(updatedInProgress, updatedTask);
    } else if (newStatus === 'Terminada') {
      updatedCompleted = addToArray(updatedCompleted, updatedTask);
    }

    // Actualizar el estado local
    this.localTasksByStatus.set({
      pending: updatedPending,
      inProgress: updatedInProgress,
      completed: updatedCompleted,
    });

    // Emitir el evento para actualizar en el backend
    this.taskStatusChanged.emit({
      taskId: task._id,
      fromStatus: task.status,
      newStatus: newStatus,
    });
  }

  /**
   * Obtiene la clase de color para el estado
   */
  public getStatusColorClass(status: TaskStatus): string {
    switch (status) {
      case 'Pendiente':
        return 'bg-yellow-500';
      case 'En curso':
        return 'bg-blue-500';
      case 'Terminada':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  }
}

