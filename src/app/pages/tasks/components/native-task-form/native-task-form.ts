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
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';

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
  TaskSubtask,
  TaskAttachment,
} from '../../../../shared/interfaces/task.interface';
import { User } from '../../../../shared/services/users-api.service';
import { Board } from '../../../../shared/interfaces/board.interface';

// PrimeNG Services
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

@Component({
  selector: 'app-native-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SelectModule, DatePickerModule],
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
              Fecha y Hora Límite
            </label>
            <p-datePicker
              id="dueDate"
              formControlName="dueDate"
              placeholder="Selecciona fecha y hora"
              dateFormat="dd/mm/yy"
              [showTime]="true"
              [showSeconds]="false"
              hourFormat="24"
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

        <!-- Subtasks Field -->
        <div class="space-y-2">
          <div class="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtareas</div>
          <div class="space-y-2">
            <div
              *ngFor="let subtask of subtasks(); let i = index; trackBy: trackBySubtaskIndex"
              class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
            >
              <input
                type="checkbox"
                [checked]="subtask.completed"
                (change)="toggleSubtask(i)"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <input
                type="text"
                [ngModel]="subtask.title"
                (ngModelChange)="updateSubtaskTitle(i, $event)"
                [ngModelOptions]="{ standalone: true }"
                [class.line-through]="subtask.completed"
                [class.text-gray-400]="subtask.completed"
                class="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Título de la subtarea"
              />
              <button
                type="button"
                (click)="removeSubtask(i)"
                class="px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                title="Eliminar subtarea"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
            <button
              type="button"
              (click)="addSubtask()"
              class="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              + Agregar Subtarea
            </button>
          </div>
        </div>

        <!-- Files/Attachments Field -->
        <div class="space-y-2">
          <div class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Archivos y Documentos
          </div>
          <div class="space-y-2">
            <!-- Archivos existentes (solo en modo edición) -->
            @if (isEditing() && existingAttachments().length > 0) {
            <div class="mb-3">
              <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Archivos existentes
              </div>
              @for (attachment of existingAttachments(); track attachment._id || $index) {
              <div
                class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md mb-2"
                [class.opacity-50]="attachmentsToDelete().includes(attachment._id || '')"
              >
                <i class="pi pi-file text-gray-500"></i>
                <span class="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                  {{ attachment.originalName }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatFileSize(attachment.size) }}
                </span>
                <button
                  type="button"
                  (click)="removeExistingAttachment(attachment._id || '')"
                  class="px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  [title]="
                    attachmentsToDelete().includes(attachment._id || '')
                      ? 'Restaurar archivo'
                      : 'Eliminar archivo'
                  "
                >
                  @if (attachmentsToDelete().includes(attachment._id || '')) {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  } @else {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  }
                </button>
              </div>
              }
            </div>
            }

            <!-- Archivos nuevos seleccionados -->
            @if (selectedFiles().length > 0) {
            <div class="mb-3">
              <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Archivos nuevos
              </div>
              @for (file of selectedFiles(); track $index) {
              <div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md mb-2">
                <i class="pi pi-file text-gray-500"></i>
                <span class="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                  {{ file.name }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatFileSize(file.size) }}
                </span>
                <button
                  type="button"
                  (click)="removeFile($index)"
                  class="px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  title="Eliminar archivo"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
              }
            </div>
            }
            <label
              class="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  class="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span class="font-semibold">Haz clic para subir</span> o arrastra y suelta
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, PDF, DOC, DOCX (MAX. 20MB)
                </p>
              </div>
              <input
                type="file"
                class="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                (change)="onFileSelected($event)"
              />
            </label>
          </div>
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
  public readonly subtasks = signal<TaskSubtask[]>([]);
  public readonly selectedFiles = signal<File[]>([]);
  public readonly existingAttachments = signal<TaskAttachment[]>([]);
  public readonly attachmentsToDelete = signal<string[]>([]);

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

      // Inicializar subtareas
      if (this.task.subtasks && Array.isArray(this.task.subtasks)) {
        this.subtasks.set([...this.task.subtasks]);
      } else {
        this.subtasks.set([]);
      }

      // Inicializar archivos adjuntos existentes
      if (this.task.attachments && Array.isArray(this.task.attachments)) {
        this.existingAttachments.set([...this.task.attachments]);
      } else {
        this.existingAttachments.set([]);
      }
    } else {
      this.isEditing.set(false);
      this.taskForm.reset();
      this.taskForm.patchValue({
        status: 'Pendiente',
      });
      this.subtasks.set([]);
      this.existingAttachments.set([]);
    }
    this.selectedFiles.set([]);
    this.attachmentsToDelete.set([]);
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
        subtasks: this.subtasks().map((st, index) => ({
          title: st.title,
          completed: st.completed || false,
          order: index,
        })),
      };

      const task = this.task;
      const operation = task
        ? this.tasksApiService.updateTask(task._id, taskData as UpdateTaskRequest)
        : this.tasksApiService.createTask(taskData as CreateTaskRequest);

      operation.pipe(take(1)).subscribe({
        next: (res) => {
          // Si estamos editando y hay archivos para eliminar, eliminarlos primero
          const attachmentsToDelete = this.attachmentsToDelete();
          if (this.isEditing() && attachmentsToDelete.length > 0) {
            this.deleteAttachments(res._id, attachmentsToDelete).then(() => {
              // Después de eliminar, subir nuevos archivos si hay
              const files = this.selectedFiles();
              if (files.length > 0) {
                this.uploadFiles(res._id, files, currentUser.id);
              } else {
                this.finishTaskUpdate(res);
              }
            });
          } else {
            // Si hay archivos seleccionados, subirlos después de crear/actualizar la tarea
            const files = this.selectedFiles();
            if (files.length > 0) {
              this.uploadFiles(res._id, files, currentUser.id);
            } else {
              this.finishTaskUpdate(res);
            }
          }
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

  /**
   * Agrega una nueva subtarea
   */
  public addSubtask(): void {
    const newSubtask: TaskSubtask = {
      title: '',
      completed: false,
      order: this.subtasks().length,
    };
    this.subtasks.set([...this.subtasks(), newSubtask]);
  }

  /**
   * Elimina una subtarea
   */
  public removeSubtask(index: number): void {
    const current = this.subtasks();
    current.splice(index, 1);
    this.subtasks.set([...current]);
  }

  /**
   * TrackBy function para el ngFor de subtareas
   */
  public trackBySubtaskIndex(index: number): number {
    return index;
  }

  /**
   * Actualiza el título de una subtarea
   */
  public updateSubtaskTitle(index: number, value: string): void {
    const current = this.subtasks();
    const updated = [...current];
    updated[index] = { ...updated[index], title: value };
    this.subtasks.set(updated);
  }

  /**
   * Toggle el estado completado de una subtarea
   */
  public toggleSubtask(index: number): void {
    const current = this.subtasks();
    current[index] = { ...current[index], completed: !current[index].completed };
    this.subtasks.set([...current]);
  }

  /**
   * Maneja la selección de archivos
   */
  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      const currentFiles = this.selectedFiles();
      this.selectedFiles.set([...currentFiles, ...newFiles]);
      // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
      input.value = '';
    }
  }

  /**
   * Elimina un archivo de la lista
   */
  public removeFile(index: number): void {
    const current = this.selectedFiles();
    current.splice(index, 1);
    this.selectedFiles.set([...current]);
  }

  /**
   * Formatea el tamaño del archivo
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Elimina archivos adjuntos existentes
   */
  private async deleteAttachments(taskId: string, attachmentIds: string[]): Promise<void> {
    const deletePromises = attachmentIds.map((attachmentId) =>
      this.tasksApiService.deleteTaskAttachment(taskId, attachmentId).pipe(take(1)).toPromise()
    );

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting attachments:', error);
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Algunos archivos no se pudieron eliminar.',
      });
    }
  }

  /**
   * Finaliza la actualización de la tarea
   */
  private finishTaskUpdate(res: Task): void {
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
      });
      this.subtasks.set([]);
      this.selectedFiles.set([]);
      this.existingAttachments.set([]);
      this.attachmentsToDelete.set([]);
    } else {
      // Limpiar solo los archivos nuevos y la lista de eliminación
      this.selectedFiles.set([]);
      this.attachmentsToDelete.set([]);
    }

    this.loading.set(false);
  }

  /**
   * Sube los archivos a la tarea
   */
  private uploadFiles(taskId: string, files: File[], uploadedBy: string): void {
    this.tasksApiService
      .uploadTaskAttachments(taskId, files, uploadedBy)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Tarea ${
              this.isEditing() ? 'actualizada' : 'creada'
            } con archivos correctamente.`,
          });
          this.save.emit(res);
          this.selectedFiles.set([]);
          this.attachmentsToDelete.set([]);
          this.loading.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'La tarea se creó pero hubo un error al subir los archivos.',
          });
          this.loading.set(false);
        },
      });
  }

  /**
   * Elimina o restaura un archivo adjunto existente
   */
  public removeExistingAttachment(attachmentId: string): void {
    const toDelete = this.attachmentsToDelete();
    if (toDelete.includes(attachmentId)) {
      // Restaurar el archivo
      this.attachmentsToDelete.set(toDelete.filter((id) => id !== attachmentId));
    } else {
      // Marcar para eliminar
      this.attachmentsToDelete.set([...toDelete, attachmentId]);
    }
  }
}
