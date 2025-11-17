import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// PrimeNG Components
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';

// Services
import { TasksApiService } from '../../../../shared/services/tasks-api.service';
import { UsersApiService } from '../../../../shared/services/users-api.service';
import { AuthService } from '../../../login/services/auth.service';
import { BoardsApiService } from '../../../../shared/services/boards-api.service';

// Interfaces
import {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../../../../shared/interfaces/task.interface';
import { User } from '../../../../shared/services/users-api.service';
import { Board } from '../../../../shared/interfaces/board.interface';

// PrimeNG Services
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

@Component({
  selector: 'app-native-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule, DatePickerModule],
  providers: [MessageService],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ isEditing() ? 'Editar Tarea' : 'Crear Nueva Tarea' }}
        </h2>
        <p class="text-gray-600 dark:text-gray-300 mt-1">
          {{
            isEditing()
              ? 'Modifica los datos de la tarea'
              : 'Completa la información para crear una nueva tarea'
          }}
        </p>
      </div>

      <form [formGroup]="taskForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Loading State -->
        <div *ngIf="loading()" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <!-- Title Field -->
        <div class="space-y-2">
          <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Título <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            formControlName="title"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            [class.border-red-500]="
              taskForm.get('title')?.invalid && taskForm.get('title')?.touched
            "
            placeholder="Ingresa el título de la tarea"
          />
          <p
            *ngIf="taskForm.get('title')?.invalid && taskForm.get('title')?.touched"
            class="text-red-500 text-sm"
          >
            El título es requerido y debe tener al menos 3 caracteres.
          </p>
        </div>

        <!-- Description Field -->
        <div class="space-y-2">
          <label
            for="description"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Descripción
          </label>
          <textarea
            id="description"
            formControlName="description"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Describe los detalles de la tarea"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Status Field -->
          <div class="space-y-2">
            <label for="status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Estado <span class="text-red-500">*</span>
            </label>
            <p-select
              id="status"
              formControlName="status"
              [options]="statusOptions"
              placeholder="Selecciona el estado"
              [appendTo]="'body'"
              [class.p-invalid]="taskForm.get('status')?.invalid && taskForm.get('status')?.touched"
              styleClass="w-full"
            ></p-select>
            <p
              *ngIf="taskForm.get('status')?.invalid && taskForm.get('status')?.touched"
              class="text-red-500 text-sm"
            >
              El estado es requerido.
            </p>
          </div>

          <!-- Priority Field -->
          <div class="space-y-2">
            <label
              for="priority"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Prioridad <span class="text-red-500">*</span>
            </label>
            <p-select
              id="priority"
              formControlName="priority"
              [options]="priorityOptions"
              placeholder="Selecciona la prioridad"
              [appendTo]="'body'"
              [class.p-invalid]="
                taskForm.get('priority')?.invalid && taskForm.get('priority')?.touched
              "
              styleClass="w-full"
            ></p-select>
            <p
              *ngIf="taskForm.get('priority')?.invalid && taskForm.get('priority')?.touched"
              class="text-red-500 text-sm"
            >
              La prioridad es requerida.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Assigned To Field -->
          <div class="space-y-2">
            <label
              for="assignedTo"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Asignar a <span class="text-red-500">*</span>
            </label>
            <p-select
              id="assignedTo"
              formControlName="assignedTo"
              [options]="userOptions()"
              placeholder="Selecciona un usuario"
              [appendTo]="'body'"
              [class.p-invalid]="
                taskForm.get('assignedTo')?.invalid && taskForm.get('assignedTo')?.touched
              "
              styleClass="w-full"
              [loading]="usersLoading()"
            ></p-select>
            <p
              *ngIf="taskForm.get('assignedTo')?.invalid && taskForm.get('assignedTo')?.touched"
              class="text-red-500 text-sm"
            >
              Debes seleccionar un usuario.
            </p>
          </div>

          <!-- Due Date Field -->
          <div class="space-y-2">
            <label for="dueDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fecha Límite
            </label>
            <p-datePicker
              id="dueDate"
              formControlName="dueDate"
              placeholder="Selecciona una fecha"
              dateFormat="dd/mm/yy"
              styleClass="w-full"
              [showIcon]="true"
              [showButtonBar]="true"
              [appendTo]="'body'"
            ></p-datePicker>
          </div>
        </div>

        <!-- Tags Field -->
        <div class="space-y-2">
          <label for="tags" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Etiquetas
          </label>
          <input
            type="text"
            id="tags"
            formControlName="tags"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Separar etiquetas con comas (ej: urgente, frontend, bug)"
          />
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            Separa múltiples etiquetas con comas
          </p>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            (click)="onCancel()"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            [disabled]="loading()"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="taskForm.invalid || loading()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span *ngIf="loading()" class="flex items-center">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {{ isEditing() ? 'Actualizando...' : 'Creando...' }}
            </span>
            <span *ngIf="!loading()">
              {{ isEditing() ? 'Actualizar Tarea' : 'Crear Tarea' }}
            </span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class NativeTaskFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly tasksApiService = inject(TasksApiService);
  private readonly usersApiService = inject(UsersApiService);
  private readonly boardsApiService = inject(BoardsApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  @Input() task: Task | undefined;
  @Input() boardId?: string;
  @Output() save = new EventEmitter<CreateTaskRequest | UpdateTaskRequest>();
  @Output() formCancel = new EventEmitter<void>();

  public taskForm: FormGroup = this.createForm();
  public readonly allUsers = signal<User[]>([]);
  public readonly board = signal<Board | null>(null);
  public readonly usersLoading = signal<boolean>(false);
  public readonly loading = signal<boolean>(false);

  public readonly isEditing = signal<boolean>(false);

  // Options for selects
  public readonly statusOptions = [
    { label: 'Pendiente', value: 'Pendiente' },
    { label: 'En curso', value: 'En curso' },
    { label: 'Terminada', value: 'Terminada' },
  ];

  public readonly priorityOptions = [
    { label: 'Baja', value: 'Baja' },
    { label: 'Media', value: 'Media' },
    { label: 'Alta', value: 'Alta' },
    { label: 'Crítica', value: 'Crítica' },
  ];

  /**
   * Filtra los usuarios basándose en el board (owner, members, invitaciones aceptadas)
   */
  public readonly users = computed(() => {
    const allUsersList = this.allUsers();
    const currentBoard = this.board();

    // Si no hay boardId, mostrar todos los usuarios
    if (!this.boardId || !currentBoard) {
      return allUsersList;
    }

    // Obtener IDs de usuarios permitidos del board
    const allowedUserIds = new Set<string>();

    // Agregar el owner
    if (currentBoard.owner?._id) {
      allowedUserIds.add(currentBoard.owner._id);
    }

    // Agregar los members
    if (currentBoard.members && Array.isArray(currentBoard.members)) {
      currentBoard.members.forEach((member) => {
        if (member._id) {
          allowedUserIds.add(member._id);
        }
      });
    }

    // Agregar usuarios con invitaciones aceptadas
    if (currentBoard.invitations && Array.isArray(currentBoard.invitations)) {
      currentBoard.invitations.forEach((invitation) => {
        if (invitation.status === 'accepted' && invitation.userId?._id) {
          allowedUserIds.add(invitation.userId._id);
        }
      });
    }

    // Filtrar usuarios que están en la lista permitida
    return allUsersList.filter((user) => allowedUserIds.has(user.id));
  });

  public readonly userOptions = computed(() => {
    return this.users().map((user) => ({
      label: user.name,
      value: user.id,
    }));
  });

  ngOnInit(): void {
    this.loadUsers();
    if (this.boardId) {
      this.loadBoard();
    }
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task']) {
      this.initializeForm();
    }
    if (changes['boardId'] && this.boardId) {
      this.loadBoard();
    }
  }

  /**
   * Crea el formulario reactivo
   */
  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['Pendiente', [Validators.required]],
      priority: ['Media', [Validators.required]],
      assignedTo: [null, [Validators.required]],
      dueDate: [null],
      tags: [''],
    });
  }

  /**
   * Inicializa el formulario con datos de la tarea
   */
  private initializeForm(): void {
    if (this.task) {
      this.isEditing.set(true);

      // Extraer el ID del assignedTo si es un objeto
      const assignedToId =
        typeof this.task.assignedTo === 'object' && this.task.assignedTo !== null
          ? (this.task.assignedTo as { _id?: string })._id
          : this.task.assignedTo;

      // Resetear el formulario primero
      this.taskForm.reset();

      // Llenar con los datos de la tarea
      this.taskForm.patchValue({
        title: this.task.title,
        description: this.task.description,
        status: this.task.status,
        priority: this.task.priority,
        assignedTo: assignedToId,
        dueDate: this.task.dueDate ? new Date(this.task.dueDate) : null,
        tags: Array.isArray(this.task.tags) ? this.task.tags.join(', ') : this.task.tags || '',
      });
    } else {
      this.isEditing.set(false);
      this.taskForm.reset();
      this.taskForm.patchValue({
        status: 'Pendiente',
        priority: 'Media',
      });
    }
  }

  /**
   * Carga la lista de usuarios
   * Si hay un boardId, extrae los usuarios del board (más eficiente y muestra solo usuarios relevantes)
   * Si no hay boardId, carga todos los usuarios desde el endpoint /users
   */
  private loadUsers(): void {
    // Si hay un boardId, no cargar usuarios aquí
    // Se extraerán del board cuando se cargue (más eficiente)
    if (this.boardId) {
      this.usersLoading.set(false);
      return;
    }

    // Cargar todos los usuarios si NO hay boardId
    this.usersLoading.set(true);
    this.usersApiService
      .listWithFilters()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.allUsers.set(Array.isArray(response.users) ? response.users : []);
          this.usersLoading.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los usuarios.',
          });
          this.usersLoading.set(false);
        },
      });
  }

  /**
   * Carga el board para obtener los miembros e invitaciones
   * También extrae los usuarios del board para evitar llamar al endpoint /users
   */
  private loadBoard(): void {
    if (!this.boardId) return;

    this.boardsApiService
      .getById(this.boardId)
      .pipe(take(1))
      .subscribe({
        next: (board) => {
          this.board.set(board);
          // Extraer usuarios del board para evitar llamar al endpoint /users
          this.extractUsersFromBoard(board);
        },
        error: () => {
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail:
              'No se pudo cargar la información del tablero. Se mostrarán todos los usuarios.',
          });
        },
      });
  }

  /**
   * Extrae los usuarios del board (owner, members, invitaciones aceptadas)
   * y los convierte al formato User para usar en el formulario
   */
  private extractUsersFromBoard(board: Board): void {
    const users: User[] = [];

    // Agregar el owner
    if (board.owner?._id) {
      users.push({
        _id: board.owner._id,
        id: board.owner._id,
        name: board.owner.name,
        email: board.owner.email,
        role: 'user', // Valor por defecto, el board no incluye el rol
        isActive: true,
        createdAt: '',
        updatedAt: '',
      });
    }

    // Agregar los members
    if (board.members && Array.isArray(board.members)) {
      board.members.forEach((member) => {
        if (member._id) {
          users.push({
            _id: member._id,
            id: member._id,
            name: member.name,
            email: member.email,
            role: 'user', // Valor por defecto
            isActive: true,
            createdAt: '',
            updatedAt: '',
          });
        }
      });
    }

    // Agregar usuarios con invitaciones aceptadas
    if (board.invitations && Array.isArray(board.invitations)) {
      board.invitations.forEach((invitation) => {
        if (invitation.status === 'accepted' && invitation.userId?._id) {
          // Verificar que no esté ya en la lista
          const exists = users.some((u) => u._id === invitation.userId._id);
          if (!exists) {
            users.push({
              _id: invitation.userId._id,
              id: invitation.userId._id,
              name: invitation.userId.name,
              email: invitation.userId.email,
              role: 'user', // Valor por defecto
              isActive: true,
              createdAt: '',
              updatedAt: '',
            });
          }
        }
      });
    }

    this.allUsers.set(users);
    this.usersLoading.set(false);
  }

  /**
   * Maneja el envío del formulario
   */
  public onSubmit(): void {
    if (this.taskForm.valid) {
      this.loading.set(true);
      const formValue = this.taskForm.value;
      const currentUser = this.authService.getCurrentUser();

      if (!currentUser) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo obtener la información del usuario actual.',
        });
        this.loading.set(false);
        return;
      }

      const taskData = {
        ...formValue,
        // Solo agregar createdBy si es una nueva tarea
        ...(this.isEditing() ? {} : { createdBy: currentUser.id }),
        // Agregar boardId si está disponible
        ...(this.boardId ? { boardId: this.boardId } : {}),
        dueDate: formValue.dueDate ? formValue.dueDate.toISOString() : undefined,
        tags: formValue.tags
          ? formValue.tags
              .split(',')
              .map((tag: string) => tag.trim())
              .filter((tag: string) => tag.length > 0)
          : [],
      };

      const task = this.task;
      const operation = task
        ? this.tasksApiService.updateTask(task._id, taskData as UpdateTaskRequest)
        : this.tasksApiService.createTask(taskData as CreateTaskRequest);

      operation.pipe(take(1)).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Tarea ${this.isEditing() ? 'actualizada' : 'creada'} correctamente.`,
          });
          this.save.emit(res);

          // Limpiar el formulario solo cuando se crea una nueva tarea
          if (!this.isEditing()) {
            this.taskForm.reset();
            this.taskForm.patchValue({
              status: 'Pendiente',
              priority: 'Media',
            });
          }

          this.loading.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `No se pudo ${this.isEditing() ? 'actualizar' : 'crear'} la tarea.`,
          });
          this.loading.set(false);
        },
      });
    } else {
      Object.keys(this.taskForm.controls).forEach((key) => {
        this.taskForm.get(key)?.markAsTouched();
      });
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Validación',
        detail: 'Por favor, revisa los campos del formulario.',
      });
    }
  }

  /**
   * Maneja la cancelación del formulario
   */
  public onCancel(): void {
    this.formCancel.emit();
  }

  /**
   * TrackBy function para el ngFor de usuarios
   */
  public trackByUserId(index: number, user: User): string {
    return user.id;
  }
}
