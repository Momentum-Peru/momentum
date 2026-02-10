import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

// Shared
import { Task, TaskStatus } from '../../../../shared/interfaces/task.interface';
import { Board } from '../../../../shared/interfaces/board.interface';
import { User } from '../../../../shared/services/users-api.service';

@Component({
  selector: 'app-agenda-activity',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    ButtonModule,
    TableModule,
    TagModule,
    AvatarModule,
    TooltipModule,
    MenuModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  template: `
    <div class="space-y-6">
      
      <!-- Quick Create Section -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
          <i class="pi pi-plus-circle"></i>
          Crear Actividad Rápida
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <!-- Avatar Current User -->
          <div class="md:col-span-1 flex justify-center">
            <p-avatar 
              [image]="currentUser()?.profilePicture" 
              [label]="getInitials(currentUser()?.name)" 
              shape="circle" 
              [style]="{'background-color': '#EEF2FF', 'color': '#6366f1', 'font-weight': 'bold', 'width': '36px', 'height': '36px', 'font-size': '14px'}"
              [pTooltip]="currentUser()?.name || 'Usuario Actual'"
            ></p-avatar>
          </div>

          <!-- Actividad Input -->
          <div class="md:col-span-4">
            <span class="p-input-icon-right w-full">

              <input 
                type="text" 
                pInputText 
                [(ngModel)]="newTaskTitle" 
                placeholder="Escribe la actividad..." 
                class="w-full text-sm"
                (keyup.enter)="createTask()"
              />
            </span>
          </div>

          <!-- Asignar A -->
          <div class="md:col-span-3">
             <p-select 
              [options]="members()" 
              [(ngModel)]="selectedAssignee" 
              optionLabel="name" 
              placeholder="Asignar a..."
              styleClass="w-full text-sm border-gray-300 rounded-lg"
              [appendTo]="'body'"
              [filter]="true"
              filterBy="name,email"
              [showClear]="true"
            >
              <ng-template let-user pTemplate="selectedItem">
                <div class="flex items-center gap-2" *ngIf="user">
                  <p-avatar 
                    [image]="user.profilePicture" 
                    [label]="getInitials(user.name)" 
                    shape="circle" 
                    [style]="{'background-color': '#EEF2FF', 'color': '#4F46E5', 'width': '24px', 'height': '24px'}">
                  </p-avatar>
                  <span class="truncate">{{ user.name }}</span>
                </div>
              </ng-template>
              <ng-template let-user pTemplate="item">
                <div class="flex items-center gap-2">
                  <p-avatar 
                    [image]="user.profilePicture" 
                    [label]="getInitials(user.name)" 
                    shape="circle"
                    [style]="{'background-color': '#EEF2FF', 'color': '#4F46E5'}">
                  </p-avatar>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium">{{ user.name }}</span>
                    <span class="text-xs text-gray-500">{{ user.email }}</span>
                  </div>
                </div>
              </ng-template>
            </p-select>
          </div>

          <!-- Fecha Vencimiento -->
          <div class="md:col-span-3">
            <p-datepicker 
              [(ngModel)]="selectedDueDate" 
              [showIcon]="true" 
              placeholder="Vencimiento"
              [minDate]="today"
              dateFormat="dd/mm/yy"
              styleClass="w-full text-sm border-gray-300 rounded-lg"
              inputStyleClass="text-sm rounded-lg"
              [appendTo]="'body'"
            ></p-datepicker>
          </div>

          <!-- Botón Crear -->
          <div class="md:col-span-1 flex justify-end">
             <button 
              pButton 
              icon="pi pi-plus" 
              class="p-button-rounded p-button-secondary w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 border-none text-white focus:ring-0" 
              (click)="createTask()"
              [disabled]="!newTaskTitle.trim() || !selectedAssignee"
              pTooltip="Agregar Actividad"
              tooltipPosition="left"
            ></button>
          </div>
        </div>
      </div>

      <!-- Agenda Table -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
           <h3 class="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
             <i class="pi pi-list text-purple-500"></i>
             Lista de Actividades
             <span *ngIf="tasks().length > 0" class="text-xs font-normal text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600">
               {{ tasks().length }}
             </span>
           </h3>
        </div>

        <p-table 
          [value]="tasks()" 
          [paginator]="true" 
          [rows]="10"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} atividades"
          styleClass="p-datatable-sm"
          [rowHover]="true"
          paginatorStyleClass="border-t border-gray-200 dark:border-gray-700"
        >
          <ng-template pTemplate="header">
            <tr class="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 font-medium">
              <th style="width: 35%" class="p-3">Actividad</th>
              <th style="width: 20%" class="p-3">Asignado A</th>
              <th style="width: 20%" class="p-3">Fecha y Hora vencimiento</th>
              <th style="width: 10%" class="p-3">Asignado por</th>
              <th style="width: 10%" class="p-3 text-center">Estado</th>
              <th style="width: 5%" class="p-3 text-center">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-task>
            <tr class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td>
                <div class="font-medium text-gray-900 dark:text-white">{{ task.title }}</div>
                <div *ngIf="task.description" class="text-xs text-gray-500 truncate max-w-xs">{{ task.description }}</div>
              </td>

              <td>
                <div class="flex items-center gap-2">
                  <p-avatar 
                    [image]="getAvatar(task.assignedTo)" 
                    [label]="getInitialsName(task.assignedTo)" 
                    shape="circle" 
                    class="border-2 border-white dark:border-gray-800 shadow-sm"
                    [style]="{'background-color': '#EEF2FF', 'color': '#4F46E5', 'width': '24px', 'height': '24px'}"
                  ></p-avatar>
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ getName(task.assignedTo) }}</span>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <i class="pi pi-calendar-clock text-xs"></i>
                  <span>{{ task.dueDate | date:'dd/MM/yyyy' }}</span>
                </div>
              </td>
              <td>
                <div class="flex justify-center">
                    <div class="flex -space-x-2 overflow-hidden" pTooltip="Creado por {{ getName(task.createdBy) }}">
                       <p-avatar 
                        [image]="getAvatar(task.createdBy)" 
                        [label]="getInitialsName(task.createdBy)" 
                        shape="circle" 
                        class="inline-block ring-2 ring-white dark:ring-gray-800"
                        [style]="{'background-color': '#F3F4F6', 'color': '#374151', 'width': '24px', 'height': '24px'}"
                      ></p-avatar>
                    </div>
                </div>
              </td>
              <td class="text-center">
                <p-select
                  [ngModel]="task.status"
                  (ngModelChange)="onStatusChange(task, $event)"
                  [options]="statusOptions"
                  optionLabel="label"
                  optionValue="value"
                  styleClass="text-sm w-auto"
                  [appendTo]="'body'"
                >
                  <ng-template let-option pTemplate="item">
                    <span 
                      [class]="getStatusClass(option.value)"
                      class="text-sm font-medium py-1 px-2 rounded"
                    >
                      {{ option.label }}
                    </span>
                  </ng-template>
                  <ng-template let-option pTemplate="selectedItem">
                    <p-tag 
                      [value]="option.label" 
                      [severity]="getStatusSeverity(option.value)"
                      [rounded]="true"
                      styleClass="text-xs"
                    ></p-tag>
                  </ng-template>
                </p-select>
              </td>
              <td class="text-center">
                <div class="flex items-center justify-center gap-1">
                  <button 
                    pButton 
                    icon="pi pi-eye" 
                    class="p-button-rounded p-button-text p-button-secondary w-8 h-8 flex align-items-center justify-content-center" 
                    (click)="viewTaskDetails(task)"
                    pTooltip="Ver detalles"
                    tooltipPosition="left"
                  ></button>
                  <button 
                    pButton 
                    icon="pi pi-pencil" 
                    class="p-button-rounded p-button-text p-button-info w-8 h-8 flex align-items-center justify-content-center" 
                    (click)="editTaskDetails(task)"
                    pTooltip="Editar"
                    tooltipPosition="left"
                  ></button>
                  <button 
                    pButton 
                    icon="pi pi-trash" 
                    class="p-button-rounded p-button-text p-button-danger w-8 h-8 flex align-items-center justify-content-center" 
                    (click)="confirmDelete(task, $event)"
                    pTooltip="Eliminar"
                    tooltipPosition="left"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center py-8 text-gray-500 dark:text-gray-400">
                <i class="pi pi-inbox text-4xl mb-4 block text-gray-300 dark:text-gray-600"></i>
                No hay actividades registradas en este tablero.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Confirm Dialog -->
      <p-confirmDialog></p-confirmDialog>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class AgendaActivityComponent {
  // Internal signals exposed
  tasks = signal<Task[]>([]);
  board = signal<Board | null>(null);
  members = signal<User[]>([]);
  currentUser = signal<User | null>(null);

  // Inputs setters
  @Input('tasks') set setTasks(value: Task[]) { this.tasks.set(value); }
  @Input('board') set setBoard(value: Board | null) { this.board.set(value); }
  @Input('members') set setMembers(value: User[]) { this.members.set(value); }
  @Input('currentUser') set setCurrentUser(value: User | null) { this.currentUser.set(value); }

  // Outputs
  @Output() taskCreated = new EventEmitter<{title: string, assignedTo: string, dueDate?: Date}>();
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() taskDeleted = new EventEmitter<Task>();
  @Output() viewTask = new EventEmitter<Task>();
  @Output() statusChanged = new EventEmitter<{task: Task, newStatus: string}>();

  // Use confirmation service
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  // Form State
  newTaskTitle = '';
  selectedAssignee: User | null = null;
  selectedDueDate: Date | null = null;
  today = new Date();
  
  // Status options
  statusOptions = [
    { label: 'Pendiente', value: 'Pendiente' },
    { label: 'En curso', value: 'En curso' },
    { label: 'Terminada', value: 'Terminada' }
  ];

  // Helper Methods
  getInitials(name?: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getInitialsName(user: any): string {
     const name = this.getName(user);
     return this.getInitials(name);
  }

  getName(user: any): string {
    if (typeof user === 'string') return 'Usuario';
    return user?.name || user?.email || 'Usuario';
  }

  getAvatar(user: any): string | undefined {
    if (typeof user === 'string') return undefined; // Should be populated
    return user?.profilePicture;
  }

  getStatusSeverity(status: TaskStatus): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'Terminada': return 'success';
      case 'En curso': return 'info';
      case 'Pendiente': return 'warn';
      default: return 'info';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pendiente': 
        return 'text-amber-700 bg-amber-50 hover:bg-amber-100';
      case 'En curso': 
        return 'text-blue-700 bg-blue-50 hover:bg-blue-100';
      case 'Terminada': 
        return 'text-green-700 bg-green-50 hover:bg-green-100';
      default: 
        return 'text-gray-700 bg-gray-50 hover:bg-gray-100';
    }
  }

  createTask() {
    if (!this.newTaskTitle.trim() || !this.selectedAssignee) return;

    this.taskCreated.emit({
      title: this.newTaskTitle,
      assignedTo: this.selectedAssignee._id,
      dueDate: this.selectedDueDate || undefined
    });

    // Reset Form
    this.newTaskTitle = '';
    this.selectedAssignee = null;
    this.selectedDueDate = null;
  }

  onStatusChange(task: Task, newStatus: string) {
    // Emitir evento específico para cambio de estado (no abre modal de edición)
    this.statusChanged.emit({ task, newStatus });
  }

  viewTaskDetails(task: Task) {
    this.viewTask.emit(task);
  }

  editTaskDetails(task: Task) {
    this.taskUpdated.emit(task);
  }

  confirmDelete(task: Task, event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Estás seguro de que deseas eliminar esta actividad?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.taskDeleted.emit(task);
      }
    });
  }
}
