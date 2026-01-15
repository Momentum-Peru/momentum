import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { Task, CreateTaskRequest } from '../../../../shared/interfaces/task.interface';
import { Board } from '../../../../shared/interfaces/board.interface';
import { TasksApiService } from '../../../../shared/services/tasks-api.service';
import { UsersApiService } from '../../../../shared/services/users-api.service';
import { AuthService } from '../../../login/services/auth.service';
import { MessageService } from 'primeng/api';
import { UserOption } from '../../../../shared/interfaces/menu-permission.interface';

/**
 * Componente de diálogo para mostrar y crear tareas de un día específico
 */
@Component({
  selector: 'app-day-tasks-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    TagModule,
    CardModule,
    ProgressSpinnerModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './day-tasks-dialog.html',
})
export class DayTasksDialogComponent implements OnInit {
  @Input() visible = false;
  @Input() selectedDate: Date | null = null;
  @Input() set tasks(value: Task[]) {
    this.tasksSignal.set(value);
  }
  get tasks(): Task[] {
    return this.tasksSignal();
  }
  private tasksSignal = signal<Task[]>([]);
  @Input() set boards(value: Board[]) {
    this.boardsSignal.set(value);
  }
  get boards(): Board[] {
    return this.boardsSignal();
  }
  private boardsSignal = signal<Board[]>([]);
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() taskCreated = new EventEmitter<Task>();
  @Output() refreshRequested = new EventEmitter<void>();

  private readonly tasksService = inject(TasksApiService);
  private readonly usersService = inject(UsersApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Signals
  public readonly showCreateForm = signal<boolean>(false);
  public readonly loading = signal<boolean>(false);
  public readonly loadingUsers = signal<boolean>(false);
  public readonly users = signal<UserOption[]>([]);

  // Formulario para crear nueva tarea
  public taskForm: FormGroup;

  // Computed
  public readonly formattedDate = computed(() => {
    const date = this.selectedDate;
    if (!date) return '';
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  public readonly tasksGroupedByBoard = computed(() => {
    const tasks = this.tasksSignal(); // Usar el signal para que el computed reaccione a cambios
    const boards = this.boardsSignal(); // Usar el signal para que el computed reaccione a cambios
    
    if (!tasks || tasks.length === 0) {
      return [];
    }
    
    const grouped = new Map<string, { boardId: string; board: Board | null; tasks: Task[] }>();

    tasks.forEach((task) => {
      // Extraer el boardId: puede ser un string o un objeto con _id
      let boardId: string;
      if (typeof task.boardId === 'string') {
        boardId = task.boardId;
      } else if (task.boardId && typeof task.boardId === 'object' && '_id' in task.boardId) {
        const boardIdObj = task.boardId as { _id?: string; title?: string };
        boardId = boardIdObj._id || 'sin-tablero';
      } else {
        boardId = 'sin-tablero';
      }
      
      if (!grouped.has(boardId)) {
        const board = boards.find((b) => b._id === boardId) || null;
        grouped.set(boardId, { boardId, board, tasks: [] });
      }
      grouped.get(boardId)!.tasks.push(task);
    });

    return Array.from(grouped.values());
  });

  constructor() {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required]],
      description: [''],
      assignedTo: ['', [Validators.required]],
      boardId: ['', [Validators.required]],
      priority: ['Media', [Validators.required]],
      dueDate: [null],
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  /**
   * Carga la lista de usuarios
   */
  private loadUsers(): void {
    this.loadingUsers.set(true);
    this.usersService.listWithFilters({ limit: 10000 }).subscribe({
      next: (response) => {
        const userOptions: UserOption[] = (response.users || []).map((user) => ({
          _id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }));
        this.users.set(userOptions);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.loadingUsers.set(false);
      },
    });
  }

  /**
   * Abre el formulario para crear una nueva tarea
   */
  openCreateForm(): void {
    if (this.selectedDate) {
      // Crear una nueva fecha normalizada a medianoche UTC para evitar problemas de zona horaria
      const date = new Date(this.selectedDate);
      // Si la fecha ya está en UTC (viene del padre normalizada), usar sus componentes UTC
      // Si no, usar los componentes locales pero crear en UTC
      const year = date.getUTCFullYear ? date.getUTCFullYear() : date.getFullYear();
      const month = date.getUTCMonth !== undefined ? date.getUTCMonth() : date.getMonth();
      const day = date.getUTCDate ? date.getUTCDate() : date.getDate();
      const normalizedDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      
      this.taskForm.patchValue({
        dueDate: normalizedDate,
      });
    }
    this.showCreateForm.set(true);
  }

  /**
   * Cierra el formulario de creación
   */
  closeCreateForm(): void {
    this.showCreateForm.set(false);
    this.taskForm.reset({
      priority: 'Media',
      dueDate: this.selectedDate,
    });
  }

  /**
   * Crea una nueva tarea
   */
  onCreateTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Usuario no autenticado',
      });
      return;
    }

    this.loading.set(true);

    const formValue = this.taskForm.value;
    
    // Asegurar que la fecha de vencimiento sea la fecha seleccionada si no se especificó otra
    let dueDate: Date | undefined;
    if (formValue.dueDate) {
      dueDate = new Date(formValue.dueDate);
    } else if (this.selectedDate) {
      // Si no hay fecha en el formulario, usar la fecha seleccionada
      dueDate = new Date(this.selectedDate);
    }
    
    // Normalizar la fecha a medianoche UTC para evitar problemas de zona horaria
    if (dueDate) {
      const year = dueDate.getFullYear();
      const month = dueDate.getMonth();
      const day = dueDate.getDate();
      dueDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
    
    const taskData: CreateTaskRequest = {
      title: formValue.title,
      description: formValue.description || undefined,
      assignedTo: formValue.assignedTo,
      createdBy: currentUser.id,
      boardId: formValue.boardId,
      priority: formValue.priority,
      dueDate: dueDate,
      status: 'Pendiente',
    };

    this.tasksService.createTask(taskData).subscribe({
      next: (task) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Tarea creada exitosamente',
        });
        this.closeCreateForm();
        // Emitir eventos para refrescar
        this.taskCreated.emit(task);
        this.refreshRequested.emit();
        this.loading.set(false);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'Error al crear la tarea',
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Cierra el diálogo
   */
  onClose(): void {
    this.visibleChange.emit(false);
    this.showCreateForm.set(false);
    this.taskForm.reset({
      priority: 'Media',
    });
  }

  /**
   * Navega a la vista de detalles de la tarea
   */
  viewTask(task: Task): void {
    // Extraer el boardId de la tarea
    let boardId: string;
    if (typeof task.boardId === 'string') {
      boardId = task.boardId;
    } else if (task.boardId && typeof task.boardId === 'object' && '_id' in task.boardId) {
      const boardIdObj = task.boardId as { _id?: string; title?: string };
      boardId = boardIdObj._id || '';
    } else {
      boardId = '';
    }

    if (boardId) {
      // Navegar a la vista de tareas con el boardId y luego abrir el modal de detalles
      this.router.navigate(['/tasks', boardId], { 
        queryParams: { taskId: task._id },
        replaceUrl: false 
      });
    } else {
      // Si no hay boardId, navegar solo a tasks
      this.router.navigate(['/tasks'], { 
        queryParams: { taskId: task._id },
        replaceUrl: false 
      });
    }
    
    // Cerrar el modal actual
    this.onClose();
  }

  /**
   * Obtiene el nombre del usuario asignado
   */
  getAssignedUserName(task: Task): string {
    if (typeof task.assignedTo === 'object' && task.assignedTo) {
      return task.assignedTo.name || task.assignedTo.email || 'Sin asignar';
    }
    return 'Sin asignar';
  }

  /**
   * Obtiene el nombre del tablero
   */
  getBoardName(boardId: string | undefined): string {
    if (!boardId) return 'Sin tablero';
    const board = this.boards.find((b) => b._id === boardId);
    return board?.title || 'Tablero desconocido';
  }

  /**
   * Navega a la vista del tablero
   */
  viewBoard(boardId: string | undefined): void {
    if (boardId) {
      window.open(`/tasks/${boardId}`, '_blank');
    }
  }
}
