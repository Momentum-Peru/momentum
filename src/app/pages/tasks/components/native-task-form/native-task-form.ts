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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// Services
import { TasksApiService } from '../../../../shared/services/tasks-api.service';
import { UsersApiService } from '../../../../shared/services/users-api.service';
import { AuthService } from '../../../login/services/auth.service';

// Interfaces
import {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatus,
} from '../../../../shared/interfaces/task.interface';
import { User } from '../../../../shared/services/users-api.service';

// PrimeNG Services
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

@Component({
  selector: 'app-native-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [MessageService],
  template: `
    <div class="bg-white rounded-lg shadow-lg p-6">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900">
          {{ isEditing() ? 'Editar Tarea' : 'Crear Nueva Tarea' }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{
            isEditing()
              ? 'Modifica los datos de la tarea'
              : 'Completa la información para crear una nueva tarea'
          }}
        </p>
      </div>

      <form [formGroup]="taskForm()" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Loading State -->
        <div *ngIf="loading()" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <!-- Title Field -->
        <div class="space-y-2">
          <label for="title" class="block text-sm font-medium text-gray-700">
            Título <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            formControlName="title"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            [class.border-red-500]="
              taskForm().get('title')?.invalid && taskForm().get('title')?.touched
            "
            placeholder="Ingresa el título de la tarea"
          />
          <p
            *ngIf="taskForm().get('title')?.invalid && taskForm().get('title')?.touched"
            class="text-red-500 text-sm"
          >
            El título es requerido y debe tener al menos 3 caracteres.
          </p>
        </div>

        <!-- Description Field -->
        <div class="space-y-2">
          <label for="description" class="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            id="description"
            formControlName="description"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe los detalles de la tarea"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Status Field -->
          <div class="space-y-2">
            <label for="status" class="block text-sm font-medium text-gray-700">
              Estado <span class="text-red-500">*</span>
            </label>
            <select
              id="status"
              formControlName="status"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              [class.border-red-500]="
                taskForm().get('status')?.invalid && taskForm().get('status')?.touched
              "
            >
              <option value="">Selecciona el estado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En curso">En curso</option>
              <option value="Terminada">Terminada</option>
            </select>
            <p
              *ngIf="taskForm().get('status')?.invalid && taskForm().get('status')?.touched"
              class="text-red-500 text-sm"
            >
              El estado es requerido.
            </p>
          </div>

          <!-- Priority Field -->
          <div class="space-y-2">
            <label for="priority" class="block text-sm font-medium text-gray-700">
              Prioridad <span class="text-red-500">*</span>
            </label>
            <select
              id="priority"
              formControlName="priority"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              [class.border-red-500]="
                taskForm().get('priority')?.invalid && taskForm().get('priority')?.touched
              "
            >
              <option value="">Selecciona la prioridad</option>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Crítica">Crítica</option>
            </select>
            <p
              *ngIf="taskForm().get('priority')?.invalid && taskForm().get('priority')?.touched"
              class="text-red-500 text-sm"
            >
              La prioridad es requerida.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Assigned To Field -->
          <div class="space-y-2">
            <label for="assignedTo" class="block text-sm font-medium text-gray-700">
              Asignar a <span class="text-red-500">*</span>
            </label>
            <select
              id="assignedTo"
              formControlName="assignedTo"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              [class.border-red-500]="
                taskForm().get('assignedTo')?.invalid && taskForm().get('assignedTo')?.touched
              "
            >
              <option value="">Selecciona un usuario</option>
              <option *ngIf="usersLoading()" disabled>Cargando usuarios...</option>
              <option *ngFor="let user of users() || []; trackBy: trackByUserId" [value]="user.id">
                {{ user.name }}
              </option>
            </select>
            <p
              *ngIf="taskForm().get('assignedTo')?.invalid && taskForm().get('assignedTo')?.touched"
              class="text-red-500 text-sm"
            >
              Debes seleccionar un usuario.
            </p>
          </div>

          <!-- Due Date Field -->
          <div class="space-y-2">
            <label for="dueDate" class="block text-sm font-medium text-gray-700">
              Fecha Límite
            </label>
            <input
              type="date"
              id="dueDate"
              formControlName="dueDate"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Tags Field -->
        <div class="space-y-2">
          <label for="tags" class="block text-sm font-medium text-gray-700"> Etiquetas </label>
          <input
            type="text"
            id="tags"
            formControlName="tags"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Separar etiquetas con comas (ej: urgente, frontend, bug)"
          />
          <p class="text-gray-500 text-sm">Separa múltiples etiquetas con comas</p>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            (click)="onCancel()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            [disabled]="loading()"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="taskForm().invalid || loading()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  @Input() task: Task | undefined;
  @Output() save = new EventEmitter<CreateTaskRequest | UpdateTaskRequest>();
  @Output() cancel = new EventEmitter<void>();

  public readonly taskForm = signal<FormGroup>(this.createForm());
  public readonly users = signal<User[]>([]);
  public readonly usersLoading = signal<boolean>(false);
  public readonly loading = signal<boolean>(false);

  public readonly isEditing = signal<boolean>(false);

  ngOnInit(): void {
    this.loadUsers();
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && !changes['task'].firstChange) {
      this.initializeForm();
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
      const form = this.taskForm();
      form.patchValue({
        title: this.task.title,
        description: this.task.description,
        status: this.task.status,
        priority: this.task.priority,
        assignedTo: this.task.assignedTo,
        dueDate: this.task.dueDate ? new Date(this.task.dueDate).toISOString().split('T')[0] : null,
        tags: Array.isArray(this.task.tags) ? this.task.tags.join(', ') : this.task.tags || '',
      });
    }
  }

  /**
   * Carga la lista de usuarios
   */
  private loadUsers(): void {
    this.usersLoading.set(true);
    this.usersApiService
      .listWithFilters()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.users.set(Array.isArray(response.users) ? response.users : []);
          this.usersLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading users', err);
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
   * Maneja el envío del formulario
   */
  public onSubmit(): void {
    if (this.taskForm().valid) {
      this.loading.set(true);
      const formValue = this.taskForm().value;
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
        dueDate: formValue.dueDate ? new Date(formValue.dueDate).toISOString() : undefined,
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
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error saving task', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `No se pudo ${this.isEditing() ? 'actualizar' : 'crear'} la tarea.`,
          });
          this.loading.set(false);
        },
      });
    } else {
      Object.keys(this.taskForm().controls).forEach((key) => {
        this.taskForm().get(key)?.markAsTouched();
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
    this.cancel.emit();
  }

  /**
   * TrackBy function para el ngFor de usuarios
   */
  public trackByUserId(index: number, user: User): string {
    return user.id;
  }
}
