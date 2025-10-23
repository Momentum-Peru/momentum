import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

// Components
import { NativeTaskCardComponent } from '../native-task-card/native-task-card';

// Interfaces
import { Task, TaskStatus, DragDropEvent } from '../../../../shared/interfaces/task.interface';

@Component({
  selector: 'app-native-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, NativeTaskCardComponent],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Pending Column -->
      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
            Pendientes
          </h3>
          <span class="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
            {{ pendingTasks().length }}
          </span>
        </div>

        <div
          cdkDropList
          id="pending"
          [cdkDropListData]="pendingTasks()"
          [cdkDropListConnectedTo]="['in_progress', 'completed']"
          (cdkDropListDropped)="onTaskDrop($event)"
          class="min-h-[200px] space-y-3"
        >
          @for (task of pendingTasks(); track task._id) {
          <div cdkDrag class="cursor-move">
            <app-native-task-card
              [task]="task"
              (edit)="onEditTask($event)"
              (delete)="onDeleteTask($event)"
              (view)="onViewTask($event)"
            >
            </app-native-task-card>
          </div>
          } @if (pendingTasks().length === 0) {
          <div class="text-center py-8 text-gray-500">
            <svg
              class="w-12 h-12 mx-auto mb-2 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              ></path>
            </svg>
            <p class="text-sm">No hay tareas pendientes</p>
          </div>
          }
        </div>
      </div>

      <!-- In Progress Column -->
      <div class="bg-blue-50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
            En Progreso
          </h3>
          <span class="bg-blue-200 text-blue-700 px-2 py-1 rounded-full text-sm font-medium">
            {{ inProgressTasks().length }}
          </span>
        </div>

        <div
          cdkDropList
          id="in_progress"
          [cdkDropListData]="inProgressTasks()"
          [cdkDropListConnectedTo]="['pending', 'completed']"
          (cdkDropListDropped)="onTaskDrop($event)"
          class="min-h-[200px] space-y-3"
        >
          @for (task of inProgressTasks(); track task._id) {
          <div cdkDrag class="cursor-move">
            <app-native-task-card
              [task]="task"
              (edit)="onEditTask($event)"
              (delete)="onDeleteTask($event)"
              (view)="onViewTask($event)"
            >
            </app-native-task-card>
          </div>
          } @if (inProgressTasks().length === 0) {
          <div class="text-center py-8 text-gray-500">
            <svg
              class="w-12 h-12 mx-auto mb-2 text-gray-300"
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
            <p class="text-sm">No hay tareas en progreso</p>
          </div>
          }
        </div>
      </div>

      <!-- Completed Column -->
      <div class="bg-green-50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
            Completadas
          </h3>
          <span class="bg-green-200 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
            {{ completedTasks().length }}
          </span>
        </div>

        <div
          cdkDropList
          id="completed"
          [cdkDropListData]="completedTasks()"
          [cdkDropListConnectedTo]="['pending', 'in_progress']"
          (cdkDropListDropped)="onTaskDrop($event)"
          class="min-h-[200px] space-y-3"
        >
          @for (task of completedTasks(); track task._id) {
          <div cdkDrag class="cursor-move">
            <app-native-task-card
              [task]="task"
              (edit)="onEditTask($event)"
              (delete)="onDeleteTask($event)"
              (view)="onViewTask($event)"
            >
            </app-native-task-card>
          </div>
          } @if (completedTasks().length === 0) {
          <div class="text-center py-8 text-gray-500">
            <svg
              class="w-12 h-12 mx-auto mb-2 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <p class="text-sm">No hay tareas completadas</p>
          </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .cdk-drag-preview {
        box-sizing: border-box;
        border-radius: 8px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        background: white;
        opacity: 0.95;
        transform: rotate(5deg);
        cursor: grabbing;
      }

      .cdk-drag-placeholder {
        opacity: 0.4;
        background: #f3f4f6;
        border: 2px dashed #3b82f6;
        border-radius: 8px;
        min-height: 100px;
        transition: all 200ms ease;
      }

      .cdk-drag-animating {
        transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
      }

      .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
        transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
      }

      .cdk-drop-list {
        transition: background-color 200ms ease;
      }

      .cdk-drop-list.cdk-drop-list-receiving {
        background-color: rgba(59, 130, 246, 0.1);
        border: 2px dashed #3b82f6;
        border-radius: 8px;
      }

      .cdk-drag {
        cursor: grab;
        transition: transform 200ms ease;
      }

      .cdk-drag:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .cdk-drag:active {
        cursor: grabbing;
        transform: rotate(2deg) scale(1.02);
      }
    `,
  ],
})
export class NativeKanbanBoardComponent implements OnInit, OnChanges {
  @Input() tasksByStatus: { pending: Task[]; inProgress: Task[]; completed: Task[] } = {
    pending: [],
    inProgress: [],
    completed: [],
  };
  @Input() loading: boolean = false;

  @Output() taskStatusChanged = new EventEmitter<DragDropEvent>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<Task>();
  @Output() viewTask = new EventEmitter<Task>();

  // Signals para las tareas
  public readonly pendingTasks = signal<Task[]>([]);
  public readonly inProgressTasks = signal<Task[]>([]);
  public readonly completedTasks = signal<Task[]>([]);

  ngOnInit(): void {
    this.updateTasks();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasksByStatus']) {
      this.updateTasks();
    }
  }

  /**
   * Actualiza las tareas cuando cambian los inputs
   */
  private updateTasks(): void {
    this.pendingTasks.set(this.tasksByStatus.pending || []);
    this.inProgressTasks.set(this.tasksByStatus.inProgress || []);
    this.completedTasks.set(this.tasksByStatus.completed || []);
  }

  /**
   * Maneja el drop de tareas entre columnas
   */
  public onTaskDrop(event: CdkDragDrop<Task[]>): void {
    const previousContainer = event.previousContainer.id;
    const currentContainer = event.container.id;

    // Mapear los IDs de contenedores a los valores de estado en español
    const statusMap: { [key: string]: TaskStatus } = {
      pending: 'Pendiente',
      in_progress: 'En curso',
      completed: 'Terminada',
    };

    const newStatus = statusMap[currentContainer];

    console.log('🔄 Drag & Drop Event:', {
      previousContainer,
      currentContainer,
      newStatus,
      isSameContainer: event.previousContainer === event.container,
    });

    if (event.previousContainer === event.container) {
      // Reordenar dentro de la misma columna
      console.log('📋 Reordenando dentro de la misma columna');
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Mover entre columnas
      console.log('🔄 Moviendo entre columnas:', {
        from: previousContainer,
        to: currentContainer,
        newStatus,
      });

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Emitir el cambio de estado
      // Obtener la tarea del array de datos en lugar de event.item.data
      const task = event.container.data[event.currentIndex] as Task;

      if (!task || !task._id) {
        console.error('❌ Error: No se pudo obtener la tarea del drop event');
        return;
      }

      console.log('📤 Emitiendo cambio de estado:', {
        taskId: task._id,
        taskTitle: task.title,
        newStatus,
      });

      this.taskStatusChanged.emit({
        taskId: task._id,
        newStatus: newStatus,
      });
    }
  }

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
}
