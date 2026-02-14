import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  signal,
  computed,
  Pipe,
  PipeTransform,
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
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

// Services
import { TasksApiService } from '../../../../shared/services/tasks-api.service';
import { UsersApiService } from '../../../../shared/services/users-api.service';
import { AuthService } from '../../../login/services/auth.service';
import { BoardsApiService } from '../../../../shared/services/boards-api.service';
import { ProjectsApiService } from '../../../../shared/services/projects-api.service';
import { ClientsApiService } from '../../../../shared/services/clients-api.service';
import { AreasApiService } from '../../../../shared/services/areas-api.service'; // Added

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
import { Project } from '../../../../shared/interfaces/project.interface';
import { Area } from '../../../../shared/interfaces/area.interface'; // Added

// PrimeNG Services
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, maxLength = 50): string {
    if (!value) return '';
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  }
}

@Component({
  selector: 'app-native-task-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SelectModule,
    DatePickerModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    TruncatePipe,
  ],
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
          <!-- Area Field -->
          <div class="space-y-2">
            <label for="areaId" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Área
            </label>
            <p-select
              id="areaId"
              formControlName="areaId"
              [options]="areaOptions()"
              placeholder="Selecciona un área"
              [appendTo]="'body'"
              styleClass="w-full"
              [showClear]="true"
            ></p-select>
          </div>

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
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Project Field -->
          <div class="space-y-2">
            <label
              for="projectId"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Proyecto
            </label>
            <p-select
              id="projectId"
              formControlName="projectId"
              [options]="projectOptions()"
              placeholder="Selecciona un proyecto"
              [appendTo]="'body'"
              styleClass="w-full"
              [loading]="projectsLoading()"
              [showClear]="true"
            >
              <ng-template let-project pTemplate="selectedItem">
                @if (project?.label) {
                <span class="truncate block w-full" [title]="project.label">
                  {{ project.label | truncate : 40 }}
                </span>
                } @else {
                <span class="truncate block w-full">Selecciona un proyecto</span>
                }
              </ng-template>
              <ng-template let-project pTemplate="item">
                <span class="truncate block w-full" [title]="project.label">
                  {{ project.label | truncate : 40 }}
                </span>
              </ng-template>
            </p-select>
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
              class="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200"
              [ngClass]="{
                'border-blue-500 bg-blue-50 dragging-overlay': isDragging(),
                'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600':
                  !isDragging()
              }"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              tabindex="0"
              role="button"
              [attr.aria-label]="
                'Zona de arrastrar y soltar archivos. Haz clic para seleccionar archivos o pega archivos con Ctrl+V'
              "
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  class="w-8 h-8 mb-4 transition-colors"
                  [class.text-blue-500]="isDragging()"
                  [class.text-gray-500]="!isDragging()"
                  [class.dark:text-gray-400]="!isDragging()"
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
                <p
                  class="mb-2 text-sm transition-colors"
                  [class.text-blue-700]="isDragging()"
                  [class.dark:text-blue-300]="isDragging()"
                  [class.text-gray-500]="!isDragging()"
                  [class.dark:text-gray-400]="!isDragging()"
                >
                  @if (isDragging()) {
                  <span class="font-semibold">Suelta los archivos aquí</span>
                  } @else {
                  <span class="font-semibold">Haz clic para subir</span> o arrastra y suelta }
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, PDF, DOC, DOCX, DWG, SKP (MAX. 20MB). También puedes arrastrar desde
                  WhatsApp o pegar con Ctrl+V
                </p>
              </div>
              <input
                type="file"
                class="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.dwg,.skp"
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

    <!-- Dialog: Crear Nuevo Proyecto -->
    <p-dialog
      [modal]="true"
      [visible]="showProjectDialog()"
      (visibleChange)="showProjectDialog.set($event)"
      [style]="{ width: '600px' }"
      [closable]="true"
      header="Crear Nuevo Proyecto"
      (onHide)="closeProjectDialog()"
    >
      <form [formGroup]="projectForm" (ngSubmit)="onCreateProject()" class="space-y-4">
        <!-- Name -->
        <div class="space-y-2">
          <label
            for="projectName"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Nombre <span class="text-red-500">*</span>
          </label>
          <input
            pInputText
            id="projectName"
            formControlName="name"
            placeholder="Nombre del proyecto"
            class="w-full"
            [class.p-invalid]="projectForm.get('name')?.invalid && projectForm.get('name')?.touched"
          />
          @if (projectForm.get('name')?.invalid && projectForm.get('name')?.touched) {
          <small class="text-red-500">El nombre es requerido (2-100 caracteres)</small>
          }
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <label
            for="projectDescription"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Descripción
          </label>
          <textarea
            pInputTextarea
            id="projectDescription"
            formControlName="description"
            rows="4"
            placeholder="Descripción del proyecto (opcional)"
            class="w-full"
            [class.p-invalid]="
              projectForm.get('description')?.invalid && projectForm.get('description')?.touched
            "
          ></textarea>
          @if (projectForm.get('description')?.invalid && projectForm.get('description')?.touched) {
          <small class="text-red-500"
            >Si proporcionas una descripción, debe tener entre 10 y 500 caracteres</small
          >
          }
        </div>

        <!-- Client -->
        <div class="space-y-2">
          <label
            for="projectClient"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Cliente <span class="text-red-500">*</span>
          </label>
          <p-select
            id="projectClient"
            formControlName="clientId"
            [options]="clientOptions()"
            placeholder="Selecciona un cliente"
            [appendTo]="'body'"
            styleClass="w-full"
            [class.p-invalid]="
              projectForm.get('clientId')?.invalid && projectForm.get('clientId')?.touched
            "
          ></p-select>
          @if (projectForm.get('clientId')?.invalid && projectForm.get('clientId')?.touched) {
          <small class="text-red-500">El cliente es requerido</small>
          }
        </div>

        <!-- Start Date -->
        <div class="space-y-2">
          <label
            for="projectStartDate"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Fecha de Inicio <span class="text-red-500">*</span>
          </label>
          <p-datePicker
            id="projectStartDate"
            formControlName="startDate"
            placeholder="Selecciona fecha de inicio"
            dateFormat="dd/mm/yy"
            [showIcon]="true"
            [appendTo]="'body'"
            styleClass="w-full"
            [class.p-invalid]="
              projectForm.get('startDate')?.invalid && projectForm.get('startDate')?.touched
            "
          ></p-datePicker>
          @if (projectForm.get('startDate')?.invalid && projectForm.get('startDate')?.touched) {
          <small class="text-red-500">La fecha de inicio es requerida</small>
          }
        </div>

        <!-- End Date (Optional) -->
        <div class="space-y-2">
          <label
            for="projectEndDate"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Fecha de Fin
          </label>
          <p-datePicker
            id="projectEndDate"
            formControlName="endDate"
            placeholder="Selecciona fecha de fin (opcional)"
            dateFormat="dd/mm/yy"
            [showIcon]="true"
            [appendTo]="'body'"
            styleClass="w-full"
          ></p-datePicker>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <p-button
            label="Cancelar"
            severity="secondary"
            [text]="true"
            (onClick)="closeProjectDialog()"
            [disabled]="projectFormLoading()"
          ></p-button>
          <p-button
            label="Crear Proyecto"
            severity="primary"
            [loading]="projectFormLoading()"
            [disabled]="projectForm.invalid"
            type="submit"
          ></p-button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      :host-context(.dark) .dragging-overlay {
        background-color: rgba(30, 58, 138, 0.2);
      }
    `,
  ],
})
export class NativeTaskFormComponent implements OnInit, OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly tasksApiService = inject(TasksApiService);
  private readonly usersApiService = inject(UsersApiService);
  private readonly boardsApiService = inject(BoardsApiService);
  private readonly projectsApiService = inject(ProjectsApiService);
  private readonly clientsApiService = inject(ClientsApiService);
  private readonly areasApiService = inject(AreasApiService); // Added
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  @Input() task: Task | undefined;
  @Input() boardId?: string;
  @Input() visible?: boolean;
  @Output() save = new EventEmitter<Task>();
  @Output() formCancel = new EventEmitter<void>();

  public taskForm: FormGroup = this.createForm();
  public projectForm: FormGroup = this.createProjectForm();
  public readonly allUsers = signal<User[]>([]);
  public readonly board = signal<Board | null>(null);
  public readonly projects = signal<Project[]>([]);
  public readonly projectsLoading = signal<boolean>(false);
  public readonly usersLoading = signal<boolean>(false);
  public readonly loading = signal<boolean>(false);
  public readonly showProjectDialog = signal<boolean>(false);
  public readonly projectFormLoading = signal<boolean>(false);
  public readonly clients = signal<{ _id: string; name: string }[]>([]);
  public readonly areas = signal<Area[]>([]); // Updated type
  public readonly areaUsers = signal<string[] | null>(null);
  public readonly subtasks = signal<TaskSubtask[]>([]);
  public readonly selectedFiles = signal<File[]>([]);
  public readonly existingAttachments = signal<TaskAttachment[]>([]);
  public readonly attachmentsToDelete = signal<string[]>([]);
  public readonly isDragging = signal<boolean>(false);

  public readonly isEditing = signal<boolean>(false);

  // Referencia al método onPaste para poder remover el listener
  private pasteHandler = (event: ClipboardEvent) => this.onPaste(event);

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
    const areaAllowedUserIds = this.areaUsers(); // Get filtered users by area

    // Filter by Area first if selected
    let filteredUsers = allUsersList;
    if (areaAllowedUserIds) {
      filteredUsers = filteredUsers.filter(u => areaAllowedUserIds.includes(u.id));
    }

    // Si no hay boardId o tablero cargado, mostrar usuarios filtrados (posiblemente solo por area)
    if (!this.boardId || !currentBoard) {
      return filteredUsers;
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
    return filteredUsers.filter((user) => allowedUserIds.has(user.id));
  });

  public readonly userOptions = computed(() => {
    return this.users().map((user) => ({
      label: user.name,
      value: user.id,
    }));
  });

  public readonly projectOptions = computed(() => {
    return this.projects().map((project) => ({
      label: `${project.code} - ${project.name}`,
      value: project._id || '',
    }));
  });

  public readonly areaOptions = computed(() => {
    return this.areas().map((area) => ({
      label: area.nombre,
      value: area._id || '',
    }));
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadProjects();
    this.loadClients();
    this.loadAreas(); // Added

    // Subscribe to area changes
    this.taskForm.get('areaId')?.valueChanges.subscribe(areaId => {
      if (areaId) {
        this.areasApiService.getAssignedUsers(areaId).subscribe({
          next: (users) => {
            const userIds = users.map(u => u._id || u.id);
            this.areaUsers.set(userIds);

            // If current assignedTo is not in new list, maybe clear it?
            // Optional, but good UX.
            const currentAssigned = this.taskForm.get('assignedTo')?.value;
            if (currentAssigned && !userIds.includes(currentAssigned)) {
              this.taskForm.patchValue({ assignedTo: null });
            }
          },
          error: () => this.areaUsers.set([])
        });
      } else {
        this.areaUsers.set(null);
      }
    });
    if (this.boardId) {
      this.loadBoard();
    }
    this.initializeForm();
    // Agregar listener global de paste
    document.addEventListener('paste', this.pasteHandler);
  }

  ngOnDestroy(): void {
    // Remover listener global de paste
    document.removeEventListener('paste', this.pasteHandler);
    // Limpiar archivos seleccionados cuando el componente se destruye
    this.selectedFiles.set([]);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task']) {
      this.initializeForm();
    }
    if (changes['boardId'] && this.boardId) {
      this.loadBoard();
    }
    // Limpiar archivos cuando el dialog se cierra (visible cambia de true a false)
    if (changes['visible'] && !changes['visible'].firstChange) {
      const previousValue = changes['visible'].previousValue;
      const currentValue = changes['visible'].currentValue;
      if (previousValue === true && currentValue === false) {
        // El dialog se cerró, limpiar archivos
        this.selectedFiles.set([]);
      }
    }
  }

  /**
   * Crea el formulario reactivo
   */
  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['Pendiente', Validators.required],
      priority: ['Media', Validators.required],
      assignedTo: ['', Validators.required],
      dueDate: [null],
      tags: [''],
      projectId: [null],
      areaId: [null], // Added
      incompleteReason: [''],
    });
  }

  /**
   * Crea el formulario de proyecto
   */
  private createProjectForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.minLength(10), Validators.maxLength(500)]],
      clientId: ['', [Validators.required]],
      startDate: [null, [Validators.required]],
      endDate: [null],
    });
  }

  /**
   * Carga la lista de clientes
   */
  private loadClients(): void {
    this.clientsApiService.list().subscribe({
      next: (clients) => {
        this.clients.set(clients);
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los clientes',
        });
      },
    });
  }

  private loadAreas(): void {
    this.areasApiService.listActive().subscribe({
      next: (areas) => {
        this.areas.set(areas);
      },
      error: (error) => {
        console.error('Error loading areas:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las áreas',
        });
      },
    });
  }

  /**
   * Opciones de clientes para el selector
   */
  public readonly clientOptions = computed(() => {
    return this.clients().map((client) => ({
      label: client.name,
      value: client._id,
    }));
  });

  /**
   * Cierra el diálogo de proyecto
   */
  public closeProjectDialog(): void {
    this.showProjectDialog.set(false);
    this.projectForm.reset();
    this.projectFormLoading.set(false);
  }

  /**
   * Crea un nuevo proyecto
   */
  public onCreateProject(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.projectFormLoading.set(true);

    const formValue = this.projectForm.value;
    const payload = {
      name: formValue.name.trim(),
      description: formValue.description?.trim() || '',
      clientId: formValue.clientId,
      startDate: formValue.startDate ? new Date(formValue.startDate).toISOString() : undefined,
      endDate: formValue.endDate ? new Date(formValue.endDate).toISOString() : undefined,
      status: 'PENDIENTE' as const,
      isActive: true,
    };

    this.projectsApiService.create(payload).subscribe({
      next: (newProject) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Proyecto creado correctamente',
        });

        // Recargar la lista de proyectos
        this.loadProjects();

        // Seleccionar el nuevo proyecto en el formulario de tarea
        this.taskForm.patchValue({ projectId: newProject._id });

        // Resetear el estado de carga antes de cerrar
        this.projectFormLoading.set(false);

        // Cerrar el diálogo
        this.closeProjectDialog();
      },
      error: (error) => {
        console.error('Error creating project:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'No se pudo crear el proyecto',
        });
        this.projectFormLoading.set(false);
      },
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

      // Extraer el ID del projectId si es un objeto
      const projectId =
        typeof this.task.projectId === 'object' && this.task.projectId !== null
          ? (this.task.projectId as { _id?: string })._id
          : this.task.projectId;

      // Extraer el ID del areaId si es un objeto
      const areaId =
        typeof this.task.areaId === 'object' && this.task.areaId !== null
          ? (this.task.areaId as { _id?: string })._id
          : this.task.areaId;

      // Llenar con los datos de la tarea
      this.taskForm.patchValue({
        title: this.task.title,
        description: this.task.description,
        status: this.task.status,
        priority: this.task.priority,
        assignedTo: assignedToId,
        projectId: projectId || null,
        areaId: areaId || null, // Added
        dueDate: this.task.dueDate ? this.convertUTCDateToLocalDate(new Date(this.task.dueDate)) : null,
        tags: Array.isArray(this.task.tags) ? this.task.tags.join(', ') : this.task.tags || '',
        incompleteReason: this.task.incompleteReason || '',
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
   * Carga la lista de proyectos
   */
  private loadProjects(): void {
    this.projectsLoading.set(true);
    this.projectsApiService
      .list()
      .pipe(take(1))
      .subscribe({
        next: (data) => {
          this.projects.set(data);
          this.projectsLoading.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar los proyectos.',
          });
          this.projectsLoading.set(false);
        },
      });
  }

  /**
   * Carga la lista de usuarios
   * Si hay un boardId, extrae los usuarios del board (más eficiente y muestra solo usuarios relevantes)
   * Si no hay boardId, carga todos los usuarios desde el endpoint /users
   */
  private loadUsers(): void {
    // Si hay un boardId, no cargar usuarios aquí
    // Se extraerán del board cuando se cargue (más eficiente)
    // Si hay un boardId y no es 'all', no cargar usuarios aquí
    // Se extraerán del board cuando se cargue (más eficiente)
    if (this.boardId && this.boardId !== 'all') {
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
    if (!this.boardId || this.boardId === 'all') return;

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
        name: board.owner.name || board.owner.email || 'Sin nombre',
        email: board.owner.email || '',
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
            name: member.name || member.email || 'Sin nombre',
            email: member.email || '',
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
          const exists = users.some((u) => u._id === invitation.userId?._id);
          if (!exists && invitation.userId) {
            users.push({
              _id: invitation.userId._id,
              id: invitation.userId._id,
              name: invitation.userId.name || invitation.userId.email || 'Sin nombre',
              email: invitation.userId.email || '',
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

      // Normalizar la fecha a UTC preservando la hora seleccionada
      // El datepicker devuelve fechas en hora local, necesitamos convertir correctamente a UTC
      let normalizedDueDate: Date | undefined;
      if (formValue.dueDate) {
        const dueDate = formValue.dueDate instanceof Date ? formValue.dueDate : new Date(formValue.dueDate);
        // El objeto Date ya tiene la información de zona horaria correcta
        // Simplemente usamos toISOString() que convierte correctamente de hora local a UTC
        // No necesitamos extraer componentes manualmente porque eso causaría problemas de zona horaria
        normalizedDueDate = dueDate;
      }

      const taskData = {
        ...formValue,
        // Solo agregar createdBy si es una nueva tarea
        ...(this.isEditing() ? {} : { createdBy: currentUser.id }),
        // Agregar boardId si está disponible
        ...(this.boardId ? { boardId: this.boardId } : {}),
        // Agregar projectId si está disponible
        ...(formValue.projectId ? { projectId: formValue.projectId } : {}),
        dueDate: normalizedDueDate ? normalizedDueDate.toISOString() : undefined,
        tags: formValue.tags
          ? formValue.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0)
          : [],
        incompleteReason: formValue.incompleteReason?.trim() || undefined,
        subtasks: this.subtasks()
          .map((st, index) => ({
            title: st.title.trim(),
            completed: st.completed || false,
            order: index,
          }))
          .filter((st) => st.title.length > 0),
      };

      const task = this.task;
      const operation = task
        ? this.tasksApiService.updateTask(task._id, taskData as UpdateTaskRequest)
        : this.tasksApiService.createTask(taskData as CreateTaskRequest);

      operation.pipe(take(1)).subscribe({
        next: async (res) => {
          // Si estamos editando y hay archivos para eliminar, eliminarlos primero
          const attachmentsToDelete = this.attachmentsToDelete();
          if (this.isEditing() && attachmentsToDelete.length > 0) {
            await this.deleteAttachments(res._id, attachmentsToDelete);
            // Después de eliminar, subir nuevos archivos si hay
            const files = this.selectedFiles();
            if (files.length > 0) {
              await this.uploadFiles(res._id, files, currentUser.id);
            } else {
              this.finishTaskUpdate(res);
            }
          } else {
            // Si hay archivos seleccionados, subirlos después de crear/actualizar la tarea
            const files = this.selectedFiles();
            if (files.length > 0) {
              await this.uploadFiles(res._id, files, currentUser.id);
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
    // Limpiar archivos seleccionados
    this.selectedFiles.set([]);
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
      this.processDroppedFiles(newFiles);
      // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
      input.value = '';
    }
  }

  /**
   * Maneja el evento dragover
   */
  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  /**
   * Maneja el evento dragleave
   */
  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  /**
   * Maneja el evento drop
   */
  public onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    this.processDroppedFiles(Array.from(files));
  }

  /**
   * Maneja el evento paste (pegar archivos)
   */
  public onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) return;

    // Verificar si hay archivos en el clipboard
    const hasFiles = Array.from(items).some((item) => item.kind === 'file');
    if (!hasFiles) {
      // Si no hay archivos, permitir el comportamiento normal (pegar texto)
      return;
    }

    // Si hay archivos, procesarlos y prevenir el comportamiento por defecto
    if (hasFiles) {
      event.preventDefault();
      event.stopPropagation();

      const files: File[] = [];
      for (const item of Array.from(items)) {
        // Solo procesar archivos (no texto)
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        this.processDroppedFiles(files);
      }
    }
  }

  /**
   * Procesa los archivos arrastrados o seleccionados
   */
  private processDroppedFiles(files: File[]): void {
    // Validar tamaño máximo (20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB en bytes
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      if (file.size > maxSize) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    // Mostrar error si hay archivos que exceden el tamaño
    if (invalidFiles.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Archivos muy grandes',
        detail: `Los siguientes archivos exceden el tamaño máximo de 20MB: ${invalidFiles.join(
          ', '
        )}`,
      });
    }

    // Agregar archivos válidos
    if (validFiles.length > 0) {
      const currentFiles = this.selectedFiles();
      this.selectedFiles.set([...currentFiles, ...validFiles]);

      this.messageService.add({
        severity: 'info',
        summary: 'Archivos agregados',
        detail: `${validFiles.length} archivo(s) agregado(s) correctamente`,
      });
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
      if (this.attachmentsToDelete) {
        this.attachmentsToDelete.set([]);
      }
    }

    this.loading.set(false);
  }

  /**
   * Sube los archivos a la tarea usando Presigned URLs
   */
  private async uploadFiles(taskId: string, files: File[], uploadedBy: string): Promise<void> {
    try {
      const res = await this.tasksApiService.uploadTaskAttachments(
        taskId,
        files,
        uploadedBy,
        undefined,
        (progress) => {
          // Opcional: mostrar progreso
          console.log(`Progreso de subida: ${progress}%`);
        }
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `Tarea ${this.isEditing() ? 'actualizada' : 'creada'} con archivos correctamente.`,
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
    } catch (error) {
      console.error('Error uploading files:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La tarea se creó pero hubo un error al subir los archivos.',
      });
      this.loading.set(false);
    }
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

  /**
   * Convierte una fecha UTC a una fecha local que representa el mismo día y hora
   * Esto es necesario para que el datepicker muestre correctamente la fecha
   * sin que se desplace un día debido a la zona horaria
   */
  private convertUTCDateToLocalDate(utcDate: Date): Date {
    // Usar los componentes locales de la fecha para obtener el día calendario que el usuario ve
    // Cuando una fecha UTC se convierte a hora local, getFullYear(), getMonth(), getDate()
    // devuelven el día calendario local, no el día UTC
    // Por ejemplo: 2026-01-27T01:01:00.000Z (UTC) = 26/01/2026 20:01 (hora local UTC-5)
    // getFullYear() = 2026, getMonth() = 0, getDate() = 26 (día local)
    const year = utcDate.getFullYear();
    const month = utcDate.getMonth();
    const day = utcDate.getDate();
    const hours = utcDate.getHours();
    const minutes = utcDate.getMinutes();
    const seconds = utcDate.getSeconds();
    const milliseconds = utcDate.getMilliseconds();

    // Crear una nueva fecha local con esos componentes
    // Esto asegura que el datepicker muestre el mismo día y hora que el usuario ve
    return new Date(year, month, day, hours, minutes, seconds, milliseconds);
  }
}
