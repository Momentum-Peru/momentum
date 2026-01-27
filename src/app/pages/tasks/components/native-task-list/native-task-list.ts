import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

// Interfaces
import { Task, TaskStatus, DragDropEvent } from '../../../../shared/interfaces/task.interface';

@Component({
  selector: 'app-native-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ButtonModule, TooltipModule],
  template: `
    <div class="space-y-4">
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

      <!-- Tabla de tareas - Desktop -->
      @if (filteredTasks().length > 0) {
      <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
                >
                  ITEM
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
                >
                  ENTREGABLES
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
                >
                  RESPONSABLE QUE SE EJECUTE
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
                >
                  PROVEEDOR RESPONSABLE
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
                >
                  ESTATUS
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
                >
                  FECHA DE INICIO
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
                >
                  FECHA DE ENTREGABLE
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
                >
                  PUNTOS IMPORTANTES
                </th>
                <th
                  class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                >
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              @for (task of filteredTasks(); track task._id; let i = $index) {
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td
                  class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 font-medium"
                >
                  {{ i + 1 }}
                </td>
                <td
                  class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600"
                >
                  <div class="font-medium">{{ task.title }}</div>
                </td>
                <td
                  class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600"
                >
                  {{ getAssignedToName(task) }}
                </td>
                <td
                  class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600"
                >
                  {{ getProviderName(task) }}
                </td>
                <td class="px-4 py-3 text-sm border-r border-gray-200 dark:border-gray-600">
                  <p-select
                    [ngModel]="task.status"
                    (ngModelChange)="onStatusChange(task, $event)"
                    [options]="statusOptions"
                    optionLabel="label"
                    optionValue="value"
                    [appendTo]="'body'"
                    styleClass="w-full text-xs"
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
                </td>
                <td
                  class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600"
                >
                  {{ formatDate(task.createdAt) }}
                </td>
                <td
                  class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600"
                >
                  {{ formatDate(task.dueDate) }}
                </td>
                <td
                  class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600"
                >
                  <div class="max-w-xs">
                    {{ task.description || '-' }}
                  </div>
                </td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex items-center justify-center gap-2">
                    <p-button
                      icon="pi pi-eye"
                      [text]="true"
                      severity="info"
                      size="small"
                      (onClick)="onViewTask(task)"
                      pTooltip="Ver detalles"
                      styleClass="p-1"
                    ></p-button>
                    <p-button
                      icon="pi pi-pencil"
                      [text]="true"
                      severity="warn"
                      size="small"
                      (onClick)="onEditTask(task)"
                      pTooltip="Editar tarea"
                      styleClass="p-1"
                    ></p-button>
                    <p-button
                      icon="pi pi-trash"
                      [text]="true"
                      severity="danger"
                      size="small"
                      (onClick)="onDeleteTask(task)"
                      pTooltip="Eliminar tarea"
                      styleClass="p-1"
                    ></p-button>
                  </div>
                </td>
              </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Vista móvil - Cards -->
      <div class="md:hidden space-y-3">
        @for (task of filteredTasks(); track task._id; let i = $index) {
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <!-- Header del card (siempre visible) -->
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >#{{ i + 1 }}</span
                  >
                  <div
                    class="w-2 h-2 rounded-full"
                    [class]="getStatusColorClass(task.status)"
                  ></div>
                  <span class="text-xs font-medium text-gray-600 dark:text-gray-400">{{
                    task.status
                  }}</span>
                </div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                  {{ task.title }}
                </h3>
                @if (task.description) {
                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                  {{ task.description }}
                </p>
                }
              </div>
              <div class="flex-shrink-0 flex items-center gap-1">
                <p-button
                  icon="pi pi-eye"
                  [text]="true"
                  severity="info"
                  size="small"
                  (onClick)="onViewTask(task)"
                  pTooltip="Ver detalles"
                  styleClass="p-1"
                ></p-button>
                <p-button
                  icon="pi pi-pencil"
                  [text]="true"
                  severity="warn"
                  size="small"
                  (onClick)="onEditTask(task)"
                  pTooltip="Editar"
                  styleClass="p-1"
                ></p-button>
                <p-button
                  icon="pi pi-trash"
                  [text]="true"
                  severity="danger"
                  size="small"
                  (onClick)="onDeleteTask(task)"
                  pTooltip="Eliminar"
                  styleClass="p-1"
                ></p-button>
              </div>
            </div>
          </div>

          <!-- Contenido expandible -->
          <div class="px-4 py-3 space-y-3">
            <!-- Responsable -->
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[120px]">
                Responsable:
              </span>
              <span class="text-sm text-gray-900 dark:text-gray-100 flex-1">
                {{ getAssignedToName(task) }}
              </span>
            </div>

            <!-- Proveedor -->
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[120px]">
                Proveedor:
              </span>
              <span class="text-sm text-gray-900 dark:text-gray-100 flex-1">
                {{ getProviderName(task) }}
              </span>
            </div>

            <!-- Estado -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[120px]">
                Estado:
              </span>
              <div class="flex-1">
                <p-select
                  [ngModel]="task.status"
                  (ngModelChange)="onStatusChange(task, $event)"
                  [options]="statusOptions"
                  optionLabel="label"
                  optionValue="value"
                  [appendTo]="'body'"
                  styleClass="w-full text-xs"
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

            <!-- Fecha de inicio -->
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[120px]">
                Fecha inicio:
              </span>
              <span class="text-sm text-gray-900 dark:text-gray-100 flex-1">
                {{ formatDate(task.createdAt) }}
              </span>
            </div>

            <!-- Fecha de entregable -->
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[120px]">
                Fecha entregable:
              </span>
              <span class="text-sm text-gray-900 dark:text-gray-100 flex-1">
                {{ formatDate(task.dueDate) }}
              </span>
            </div>

            <!-- Puntos importantes -->
            @if (task.description) {
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[120px]">
                Puntos importantes:
              </span>
              <span class="text-sm text-gray-900 dark:text-gray-100 flex-1">
                {{ task.description }}
              </span>
            </div>
            }
          </div>
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
          No hay tareas @if (selectedStatus() !== 'all') {
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
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    return [...local.pending, ...local.inProgress, ...local.completed];
  });

  public readonly pendingTasks = computed(() => this.localTasksByStatus().pending);
  public readonly inProgressTasks = computed(() => this.localTasksByStatus().inProgress);
  public readonly completedTasks = computed(() => this.localTasksByStatus().completed);

  // Tareas filtradas según el estado seleccionado y ordenadas
  public readonly filteredTasks = computed(() => {
    const status = this.selectedStatus();
    const tasks =
      status === 'all' ? this.allTasks() : this.allTasks().filter((task) => task.status === status);

    // Ordenar tareas: primero las vencidas, luego por prioridad, luego por fecha de creación
    return tasks.sort((a, b) => {
      // 1. Tareas vencidas primero
      const aOverdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'Terminada';
      const bOverdue = b.dueDate && new Date(b.dueDate) < new Date() && b.status !== 'Terminada';
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // 2. Ordenar por prioridad (Crítica > Alta > Media > Baja)
      const priorityOrder: Record<string, number> = { Crítica: 4, Alta: 3, Media: 2, Baja: 1 };
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

  /**
   * Obtiene el nombre del responsable asignado
   */
  public getAssignedToName(task: Task): string {
    if (task.assignedToName) {
      return task.assignedToName;
    }
    if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
      return task.assignedTo.name || task.assignedTo.email || 'Sin asignar';
    }
    return 'Sin asignar';
  }

  /**
   * Obtiene el nombre del proveedor responsable (tablero o proyecto)
   */
  public getProviderName(task: Task): string {
    // Intentar obtener el nombre del proyecto primero
    if (task.projectId) {
      if (typeof task.projectId === 'object' && task.projectId !== null) {
        return task.projectId.name || task.projectId.code || 'Proyecto';
      }
      return 'Proyecto';
    }
    // Si no hay proyecto, usar el tablero
    if (task.boardId) {
      return 'Sin proyecto';
    }
    return '-';
  }

  /**
   * Formatea la fecha de creación
   * Usa métodos locales para mostrar el día calendario que el usuario ve
   */
  public formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '-';

      // Usar métodos locales para mostrar el día calendario que el usuario ve
      // Cuando una fecha UTC se convierte a hora local, getFullYear(), getMonth(), getDate()
      // devuelven el día calendario local, no el día UTC
      // Por ejemplo: 2026-01-27T01:01:00.000Z (UTC) = 26/01/2026 20:01 (hora local UTC-5)
      // getFullYear() = 2026, getMonth() = 0, getDate() = 26 (día local)
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();

      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  }
}
