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
import { UpdateTaskRequest } from '../../../../shared/interfaces/task.interface';
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
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="space-y-6">
      <!-- Quick Create Section -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
      >
        <h3
          class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2"
        >
          <i class="pi pi-plus-circle"></i>
          Crear Tarea Rápida
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <!-- Avatar Current User -->
          <div class="md:col-span-1 xl:col-span-1 flex justify-center">
            <p-avatar
              [image]="currentUser()?.profilePicture"
              [label]="getInitials(currentUser()?.name)"
              shape="circle"
              [style]="{
                'background-color': '#F8FAFC',
                color: '#64748B',
                'font-weight': 'bold',
                width: '38px',
                height: '38px',
                'font-size': '14px',
                border: '2px solid #F1F5F9',
              }"
              [pTooltip]="currentUser()?.name || 'Usuario Actual'"
            ></p-avatar>
          </div>

          <!-- Tarea (título) -->
          <div class="md:col-span-7 xl:col-span-4">
            <input
              type="text"
              pInputText
              [(ngModel)]="newTaskTitle"
              placeholder="Escribe la tarea..."
              class="w-full h-11 !border-gray-200 !rounded-xl !bg-gray-50/50 hover:!bg-gray-50 focus:!bg-white transition-all shadow-none text-sm px-4"
              (keyup.enter)="createTask()"
            />
          </div>

          <!-- Asignar A (usuarios del tablero) -->
          <div class="md:col-span-6 xl:col-span-4">
            <p-select
              [options]="currentAssignees()"
              [(ngModel)]="selectedAssignee"
              optionLabel="name"
              placeholder="Asignar a..."
              styleClass="w-full !border-gray-200 !rounded-xl !bg-gray-50/50 hover:!bg-gray-50 focus:!bg-white transition-all shadow-none h-11 flex items-center"
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
                    [style]="{
                      'background-color': '#EEF2FF',
                      color: '#4F46E5',
                      width: '24px',
                      height: '24px',
                    }"
                  >
                  </p-avatar>
                  <span class="truncate text-sm">{{ user.name }}</span>
                </div>
              </ng-template>
              <ng-template let-user pTemplate="item">
                <div class="flex items-center gap-2">
                  <p-avatar
                    [image]="user.profilePicture"
                    [label]="getInitials(user.name)"
                    shape="circle"
                    [style]="{ 'background-color': '#EEF2FF', color: '#4F46E5' }"
                  >
                  </p-avatar>
                  <div class="flex flex-col overflow-hidden">
                    <span class="text-sm font-medium truncate">{{ user.name }}</span>
                    <span class="text-[10px] text-gray-500 truncate">{{ user.email }}</span>
                  </div>
                </div>
              </ng-template>
            </p-select>
          </div>

          <!-- Fecha Vencimiento -->
          <div class="md:col-span-5 xl:col-span-2">
            <p-datepicker
              [(ngModel)]="selectedDueDate"
              [showIcon]="true"
              iconDisplay="input"
              placeholder="Vencimiento"
              [minDate]="today"
              dateFormat="dd/mm/yy"
              styleClass="w-full"
              inputStyleClass="w-full h-11 !border-gray-200 !rounded-xl !bg-gray-50/50 hover:!bg-gray-50 focus:!bg-white transition-all shadow-none text-sm"
              [appendTo]="'body'"
            ></p-datepicker>
          </div>

          <!-- Botón Crear -->
          <div class="md:col-span-1 xl:col-span-1 flex justify-end">
            <button
              pButton
              icon="pi pi-plus"
              class="w-11 h-11 !rounded-xl flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 !border-none text-white shadow-sm transition-all disabled:!bg-gray-200 disabled:!text-gray-400 disabled:cursor-not-allowed"
              (click)="createTask()"
              [disabled]="!newTaskTitle.trim() || !selectedAssignee"
              pTooltip="Agregar Tarea"
              tooltipPosition="left"
            ></button>
          </div>
        </div>
      </div>

      <!-- Tabla de tareas -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div
          class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50"
        >
          <h3 class="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <i class="pi pi-list text-purple-500"></i>
            Lista de Tareas
            <span
              *ngIf="tasks().length > 0"
              class="text-xs font-normal text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600"
            >
              {{ tasks().length }}
            </span>
          </h3>
        </div>

        <!-- Desktop Table View -->
        <div class="hidden md:block">
          <p-table
            [value]="tasks()"
            [paginator]="true"
            [rows]="10"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} tareas"
            styleClass="p-datatable-sm"
            [rowHover]="true"
            paginatorStyleClass="border-t border-gray-200 dark:border-gray-700"
          >
            <ng-template pTemplate="header">
              <tr
                class="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 font-medium"
              >
                <th class="p-3 w-16">Item</th>
                <th class="p-3 min-w-[160px]">Entregables</th>
                <th class="p-3 min-w-[90px]">Ejecute</th>
                <th class="p-3 min-w-[90px]">Proveedor resp.</th>
                <th class="p-3 text-center w-20">Estatus</th>
                <th class="p-3 text-center w-20">% Avance</th>
                <th class="p-3 min-w-[100px]">Conclusiones</th>
                <th class="p-3 w-26">F. Inicio</th>
                <th class="p-3 w-26">F. Finalización</th>
                <th class="p-3 text-center w-24">Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-task let-rowIndex="rowIndex">
              <tr class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <!-- Item: 1, 2, 3 ascendente (no editable) -->
                <td class="p-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ rowIndex + 1 }}
                </td>
                <!-- Entregables (title) -->
                <td
                  class="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  (click)="startEdit(task, 'title', $event)"
                  [class.ring-1]="isEditing(task, 'title')"
                  [class.ring-blue-400]="isEditing(task, 'title')"
                >
                  <ng-container *ngIf="!isEditing(task, 'title')">
                    <div class="font-medium text-gray-900 dark:text-white">{{ task.title }}</div>
                    <div *ngIf="task.description" class="text-xs text-gray-500 truncate max-w-xs">
                      {{ task.description }}
                    </div>
                  </ng-container>
                  <input
                    *ngIf="isEditing(task, 'title')"
                    type="text"
                    class="inline-edit-input w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    [(ngModel)]="editValue"
                    (blur)="saveEdit(task, 'title')"
                    (keydown.enter)="saveEdit(task, 'title')"
                    (keydown.escape)="cancelEdit()"
                  />
                </td>
                <!-- Ejecute -->
                <td
                  class="p-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  (click)="startEdit(task, 'ejecutor', $event)"
                  [class.ring-1]="isEditing(task, 'ejecutor')"
                  [class.ring-blue-400]="isEditing(task, 'ejecutor')"
                >
                  <ng-container *ngIf="!isEditing(task, 'ejecutor')">{{
                    task.ejecutor || getName(task.assignedTo) || '—'
                  }}</ng-container>
                  <input
                    *ngIf="isEditing(task, 'ejecutor')"
                    type="text"
                    class="inline-edit-input w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    [(ngModel)]="editValue"
                    (blur)="saveEdit(task, 'ejecutor')"
                    (keydown.enter)="saveEdit(task, 'ejecutor')"
                    (keydown.escape)="cancelEdit()"
                  />
                </td>
                <!-- Proveedor resp. -->
                <td
                  class="p-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  (click)="startEdit(task, 'proveedorResponsable', $event)"
                  [class.ring-1]="isEditing(task, 'proveedorResponsable')"
                  [class.ring-blue-400]="isEditing(task, 'proveedorResponsable')"
                >
                  <ng-container *ngIf="!isEditing(task, 'proveedorResponsable')">{{
                    task.proveedorResponsable || '—'
                  }}</ng-container>
                  <input
                    *ngIf="isEditing(task, 'proveedorResponsable')"
                    type="text"
                    class="inline-edit-input w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    [(ngModel)]="editValue"
                    (blur)="saveEdit(task, 'proveedorResponsable')"
                    (keydown.enter)="saveEdit(task, 'proveedorResponsable')"
                    (keydown.escape)="cancelEdit()"
                  />
                </td>
                <!-- Estatus -->
                <td
                  class="p-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  (click)="startEdit(task, 'status', $event)"
                  [class.ring-1]="isEditing(task, 'status')"
                  [class.ring-blue-400]="isEditing(task, 'status')"
                >
                  <ng-container *ngIf="!isEditing(task, 'status')">
                    <button
                      type="button"
                      (click)="toggleStatus(task); $event.stopPropagation()"
                      class="inline-flex items-center justify-center w-8 h-8 rounded border transition-colors"
                      [class.bg-green-100]="task.status === 'Terminada'"
                      [class.text-green-700]="task.status === 'Terminada'"
                      [class.border-green-300]="task.status === 'Terminada'"
                      [class.bg-red-50]="task.status !== 'Terminada'"
                      [class.text-red-600]="task.status !== 'Terminada'"
                      [class.border-red-200]="task.status !== 'Terminada'"
                      [pTooltip]="
                        task.status === 'Terminada'
                          ? 'Completado (clic para pendiente)'
                          : 'Pendiente (clic para completado)'
                      "
                    >
                      <i *ngIf="task.status === 'Terminada'" class="pi pi-check text-sm"></i>
                      <i *ngIf="task.status !== 'Terminada'" class="pi pi-times text-sm"></i>
                    </button>
                  </ng-container>
                  <p-select
                    *ngIf="isEditing(task, 'status')"
                    [ngModel]="editValue"
                    (ngModelChange)="editValue = $event; saveEdit(task, 'status')"
                    [options]="statusOptions"
                    optionLabel="label"
                    optionValue="value"
                    styleClass="text-sm w-full"
                    [appendTo]="'body'"
                  ></p-select>
                </td>
                <!-- % Avance -->
                <td
                  class="p-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  (click)="startEdit(task, 'progress', $event)"
                  [class.ring-1]="isEditing(task, 'progress')"
                  [class.ring-blue-400]="isEditing(task, 'progress')"
                >
                  <ng-container *ngIf="!isEditing(task, 'progress')"
                    >{{ task.progress ?? 0 }}%</ng-container
                  >
                  <input
                    *ngIf="isEditing(task, 'progress')"
                    type="number"
                    min="0"
                    max="100"
                    class="inline-edit-input w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-center"
                    [(ngModel)]="editValue"
                    (blur)="saveEdit(task, 'progress')"
                    (keydown.enter)="saveEdit(task, 'progress')"
                    (keydown.escape)="cancelEdit()"
                  />
                </td>
                <!-- Conclusiones -->
                <td
                  class="p-2 text-sm text-gray-600 dark:text-gray-400 max-w-[180px] truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  (click)="startEdit(task, 'conclusiones', $event)"
                  [title]="task.conclusiones || ''"
                  [class.ring-1]="isEditing(task, 'conclusiones')"
                  [class.ring-blue-400]="isEditing(task, 'conclusiones')"
                >
                  <ng-container *ngIf="!isEditing(task, 'conclusiones')">{{
                    task.conclusiones || '—'
                  }}</ng-container>
                  <textarea
                    *ngIf="isEditing(task, 'conclusiones')"
                    class="inline-edit-input w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 resize-none"
                    rows="2"
                    [(ngModel)]="editValue"
                    (blur)="saveEdit(task, 'conclusiones')"
                    (keydown.escape)="cancelEdit()"
                  ></textarea>
                </td>
                <!-- F. Inicio -->
                <td
                  class="p-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  (click)="startEdit(task, 'startDate', $event)"
                  [class.ring-1]="isEditing(task, 'startDate')"
                  [class.ring-blue-400]="isEditing(task, 'startDate')"
                >
                  <ng-container *ngIf="!isEditing(task, 'startDate')">{{
                    task.startDate ? (task.startDate | date: 'dd/MM/yyyy') : '—'
                  }}</ng-container>
                  <p-datePicker
                    *ngIf="isEditing(task, 'startDate')"
                    [(ngModel)]="editValue"
                    dateFormat="dd/mm/yy"
                    styleClass="w-full text-sm"
                    [showIcon]="true"
                    [appendTo]="'body'"
                    (ngModelChange)="saveDateEdit(task, 'startDate', $event)"
                    (onBlur)="saveDateEdit(task, 'startDate', editValue)"
                  ></p-datePicker>
                </td>
                <!-- F. Finalización -->
                <td
                  class="p-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  (click)="startEdit(task, 'dueDate', $event)"
                  [class.ring-1]="isEditing(task, 'dueDate')"
                  [class.ring-blue-400]="isEditing(task, 'dueDate')"
                >
                  <ng-container *ngIf="!isEditing(task, 'dueDate')">{{
                    task.dueDate
                      ? (task.dueDate | date: 'dd/MM/yyyy')
                      : task.completedDate
                        ? (task.completedDate | date: 'dd/MM/yyyy')
                        : '—'
                  }}</ng-container>
                  <p-datePicker
                    *ngIf="isEditing(task, 'dueDate')"
                    [(ngModel)]="editValue"
                    dateFormat="dd/mm/yy"
                    styleClass="w-full text-sm"
                    [showIcon]="true"
                    [appendTo]="'body'"
                    (ngModelChange)="saveDateEdit(task, 'dueDate', $event)"
                    (onBlur)="saveDateEdit(task, 'dueDate', editValue)"
                  ></p-datePicker>
                </td>
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-1">
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
                <td colspan="10" class="text-center py-8 text-gray-500 dark:text-gray-400">
                  <i class="pi pi-inbox text-4xl mb-4 block text-gray-300 dark:text-gray-600"></i>
                  No hay tareas registradas en este tablero.
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>

        <!-- Mobile Card List View -->
        <div class="md:hidden">
          <div *ngIf="tasks().length > 0" class="divide-y divide-gray-100 dark:divide-gray-700">
            <div
              *ngFor="let task of tasks(); let i = index"
              class="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors"
            >
              <!-- Modo edición: mismos campos que la tabla (item no editable, se muestra 1 2 3 ascendente) -->
              @if (isMobileEditing(task) && mobileEditDraft) {
                <div class="space-y-3">
                  <h4
                    class="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2"
                  >
                    <i class="pi pi-pencil"></i>
                    Editar tarea
                  </h4>
                  <div class="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >Item</label
                      >
                      <span class="block py-2 text-gray-700 dark:text-gray-300 font-medium">{{
                        i + 1
                      }}</span>
                    </div>
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >Entregables (título)</label
                      >
                      <input
                        pInputText
                        [(ngModel)]="mobileEditDraft.title"
                        class="w-full !text-sm !py-2 !rounded-lg"
                        placeholder="Título de la tarea"
                      />
                    </div>
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >Descripción</label
                      >
                      <textarea
                        pInputText
                        [(ngModel)]="mobileEditDraft.description"
                        class="w-full !text-sm !py-2 !rounded-lg resize-none"
                        rows="2"
                        placeholder="Descripción opcional"
                      ></textarea>
                    </div>
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >Ejecute</label
                      >
                      <input
                        pInputText
                        [(ngModel)]="mobileEditDraft.ejecutor"
                        class="w-full !text-sm !py-2 !rounded-lg"
                        placeholder="Responsable que ejecuta"
                      />
                    </div>
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >Proveedor resp.</label
                      >
                      <input
                        pInputText
                        [(ngModel)]="mobileEditDraft.proveedorResponsable"
                        class="w-full !text-sm !py-2 !rounded-lg"
                        placeholder="Proveedor responsable"
                      />
                    </div>
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >Estatus</label
                      >
                      <p-select
                        [(ngModel)]="mobileEditDraft.status"
                        [options]="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        styleClass="w-full !text-sm !py-2 !rounded-lg h-10"
                        [appendTo]="'body'"
                      ></p-select>
                    </div>
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >% Avance</label
                      >
                      <input
                        type="number"
                        min="0"
                        max="100"
                        [(ngModel)]="mobileEditDraft.progress"
                        class="w-full text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        placeholder="0-100"
                      />
                    </div>
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >Conclusiones</label
                      >
                      <textarea
                        pInputText
                        [(ngModel)]="mobileEditDraft.conclusiones"
                        class="w-full !text-sm !py-2 !rounded-lg resize-none"
                        rows="2"
                        placeholder="Conclusiones o notas"
                      ></textarea>
                    </div>
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >F. Inicio</label
                      >
                      <p-datepicker
                        [(ngModel)]="mobileEditDraft.startDate"
                        dateFormat="dd/mm/yy"
                        styleClass="w-full"
                        inputStyleClass="w-full !text-sm !py-2 !rounded-lg"
                        [showIcon]="true"
                        [appendTo]="'body'"
                      ></p-datepicker>
                    </div>
                    <div>
                      <label class="text-[10px] uppercase font-bold text-gray-500 block mb-1"
                        >F. Finalización</label
                      >
                      <p-datepicker
                        [(ngModel)]="mobileEditDraft.dueDate"
                        dateFormat="dd/mm/yy"
                        styleClass="w-full"
                        inputStyleClass="w-full !text-sm !py-2 !rounded-lg"
                        [showIcon]="true"
                        [appendTo]="'body'"
                      ></p-datepicker>
                    </div>
                  </div>
                  <div
                    class="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-600"
                  >
                    <button
                      pButton
                      label="Cancelar"
                      class="p-button-sm p-button-text !text-xs"
                      (click)="cancelMobileEdit()"
                    ></button>
                    <button
                      pButton
                      icon="pi pi-check"
                      label="Guardar"
                      class="p-button-sm !text-xs"
                      (click)="saveMobileEdit(task)"
                    ></button>
                  </div>
                </div>
              } @else {
                <!-- Vista lectura: item 1, 2, 3 ascendente (no editable) -->
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1">
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-2"
                      >#{{ i + 1 }}</span
                    >
                    <h4 class="font-semibold text-gray-900 dark:text-white leading-tight mb-1">
                      {{ task.title }}
                    </h4>
                    <div
                      *ngIf="task.description"
                      class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2"
                    >
                      {{ task.description }}
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="toggleStatus(task)"
                    class="flex-shrink-0 w-8 h-8 rounded border flex items-center justify-center"
                    [class.bg-green-100]="task.status === 'Terminada'"
                    [class.text-green-700]="task.status === 'Terminada'"
                    [class.bg-red-50]="task.status !== 'Terminada'"
                    [class.text-red-600]="task.status !== 'Terminada'"
                  >
                    <i *ngIf="task.status === 'Terminada'" class="pi pi-check text-sm"></i>
                    <i *ngIf="task.status !== 'Terminada'" class="pi pi-times text-sm"></i>
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-y-2 gap-x-3 mb-4 text-xs">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500"
                      >Ejecute</span
                    ><br /><span class="text-gray-700 dark:text-gray-300">{{
                      task.ejecutor || getName(task.assignedTo) || '—'
                    }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500"
                      >% Avance</span
                    ><br /><span class="text-gray-700 dark:text-gray-300"
                      >{{ task.progress ?? 0 }}%</span
                    >
                  </div>
                  <div>
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500"
                      >F. Inicio</span
                    ><br /><span class="text-gray-600 dark:text-gray-400">{{
                      task.startDate ? (task.startDate | date: 'dd/MM/yyyy') : '—'
                    }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500"
                      >F. Finalización</span
                    ><br /><span class="text-gray-600 dark:text-gray-400">{{
                      task.dueDate ? (task.dueDate | date: 'dd/MM/yyyy') : '—'
                    }}</span>
                  </div>
                  <div *ngIf="task.proveedorResponsable" class="col-span-2">
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500"
                      >Proveedor resp.</span
                    ><br /><span class="text-gray-700 dark:text-gray-300">{{
                      task.proveedorResponsable
                    }}</span>
                  </div>
                  <div *ngIf="task.conclusiones" class="col-span-2">
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500"
                      >Conclusiones</span
                    ><br /><span class="text-gray-600 dark:text-gray-400 line-clamp-2">{{
                      task.conclusiones
                    }}</span>
                  </div>
                  <div class="col-span-2">
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500"
                      >Estado</span
                    ><br /><p-select
                      [ngModel]="task.status"
                      (ngModelChange)="onStatusChange(task, $event)"
                      [options]="statusOptions"
                      optionLabel="label"
                      optionValue="value"
                      styleClass="text-[10px] w-full h-7 !border-gray-100 !bg-gray-50/50"
                      [appendTo]="'body'"
                    ></p-select>
                  </div>
                </div>

                <!-- Acciones Mobile -->
                <div
                  class="flex items-center justify-end gap-2 pt-2 border-t border-gray-50 dark:border-gray-700/50"
                >
                  <button
                    pButton
                    icon="pi pi-eye"
                    label="Ver"
                    class="p-button-sm p-button-outlined p-button-info !text-xs !py-1 !px-3"
                    (click)="viewTaskDetails(task)"
                    pTooltip="Ver detalles"
                    tooltipPosition="top"
                  ></button>
                  <button
                    pButton
                    icon="pi pi-pencil"
                    label="Editar"
                    class="p-button-sm p-button-outlined p-button-warning !text-xs !py-1 !px-3"
                    (click)="startMobileEdit(task)"
                    pTooltip="Editar campos de la tabla"
                    tooltipPosition="top"
                  ></button>
                  <button
                    pButton
                    icon="pi pi-trash"
                    label="Eliminar"
                    class="p-button-sm p-button-outlined p-button-danger !text-xs !py-1 !px-3"
                    (click)="confirmDelete(task, $event)"
                  ></button>
                </div>
              }
            </div>
          </div>

          <!-- Empty State Mobile -->
          <div
            *ngIf="tasks().length === 0"
            class="text-center py-12 px-4 text-gray-400 dark:text-gray-500"
          >
            <i class="pi pi-inbox text-4xl mb-3 opacity-20 block"></i>
            <p class="text-sm">No hay tareas registradas</p>
          </div>
        </div>
      </div>

      <!-- Confirm Dialog -->
      <p-confirmDialog></p-confirmDialog>
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
export class AgendaActivityComponent {
  // Internal signals exposed
  tasks = signal<Task[]>([]);
  board = signal<Board | null>(null);
  members = signal<User[]>([]);
  currentUser = signal<User | null>(null);

  // Inputs setters
  @Input('tasks') set setTasks(value: Task[]) {
    this.tasks.set(value);
  }
  @Input('board') set setBoard(value: Board | null) {
    this.board.set(value);
  }
  @Input('members') set setMembers(value: User[]) {
    this.members.set(value);
  }
  @Input('currentUser') set setCurrentUser(value: User | null) {
    this.currentUser.set(value);
  }

  // Outputs
  @Output() taskCreated = new EventEmitter<{
    title: string;
    assignedTo: string;
    dueDate?: Date;
  }>();
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() taskDeleted = new EventEmitter<Task>();
  @Output() viewTask = new EventEmitter<Task>();
  @Output() statusChanged = new EventEmitter<{ task: Task; newStatus: string }>();
  @Output() taskFieldUpdated = new EventEmitter<{
    task: Task;
    updates: Partial<UpdateTaskRequest>;
  }>();

  // Use confirmation service
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  // Inline edit state
  editingTaskId: string | null = null;
  editingField: string | null = null;
  editValue: string | number | Date | null = null;

  // Mobile card edit mode (mismos campos que la tabla)
  mobileEditingTaskId: string | null = null;
  mobileEditDraft: Partial<{
    item: string;
    title: string;
    description: string;
    ejecutor: string;
    proveedorResponsable: string;
    status: TaskStatus;
    progress: number;
    conclusiones: string;
    startDate: Date | null;
    dueDate: Date | null;
  }> | null = null;

  // Form State
  newTaskTitle = '';
  selectedAssignee: User | null = null;
  selectedDueDate: Date | null = null;
  today = new Date();

  // Status options
  statusOptions = [
    { label: 'Pendiente', value: 'Pendiente' },
    { label: 'En curso', value: 'En curso' },
    { label: 'Terminada', value: 'Terminada' },
  ];

  /** Usuarios que pertenecen al tablero (para asignar tarea rápida) */
  public currentAssignees = computed(() => this.members());

  // Helper Methods
  getInitials(name?: string): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
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
      case 'Terminada':
        return 'success';
      case 'En curso':
        return 'info';
      case 'Pendiente':
        return 'warn';
      default:
        return 'info';
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
      dueDate: this.selectedDueDate || undefined,
    });

    this.newTaskTitle = '';
    this.selectedAssignee = null;
    this.selectedDueDate = null;
  }

  /** Alternar estatus entre Terminada y Pendiente (ícono check/X) */
  toggleStatus(task: Task) {
    const newStatus = task.status === 'Terminada' ? 'Pendiente' : 'Terminada';
    this.statusChanged.emit({ task, newStatus });
  }

  onStatusChange(task: Task, newStatus: string) {
    this.statusChanged.emit({ task, newStatus });
  }

  isEditing(task: Task, field: string): boolean {
    return this.editingTaskId === task._id && this.editingField === field;
  }

  startEdit(task: Task, field: string, event?: Event) {
    if (event) (event as Event).stopPropagation();
    this.editingTaskId = task._id;
    this.editingField = field;
    const raw = (task as any)[field];
    if (field === 'startDate' || field === 'dueDate') {
      this.editValue = raw ? new Date(raw) : null;
    } else if (field === 'progress') {
      this.editValue = raw ?? 0;
    } else {
      this.editValue = raw ?? '';
    }
    setTimeout(() => {
      const el = document.querySelector('.inline-edit-input') as
        | HTMLInputElement
        | HTMLTextAreaElement;
      if (el) {
        el.focus();
        el.select?.();
      }
    }, 50);
  }

  /** Convierte valor del datePicker (Date, objeto, string) a Date o null. */
  private toDate(value: unknown): Date | null {
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    if (value != null && typeof (value as any)?.getTime === 'function') return value as Date;
    const obj = value as any;
    if (obj?.value instanceof Date) return obj.value;
    if (typeof value === 'string') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  /** Guarda la edición de fecha; solo emite si hay fecha válida para no enviar payload vacío. */
  saveDateEdit(task: Task, field: 'startDate' | 'dueDate', selectedValue: unknown) {
    if (this.editingTaskId !== task._id || this.editingField !== field) return;
    const date = this.toDate(selectedValue) ?? this.toDate(this.editValue);
    if (!date) return;
    const iso = date.toISOString();
    const current = task[field];
    const currentIso = current ? new Date(current).toISOString() : '';
    if (currentIso && currentIso === iso) return;
    const updates: Partial<UpdateTaskRequest> = { [field]: iso };
    this.taskFieldUpdated.emit({ task, updates });
    this.cancelEdit();
  }

  saveEdit(task: Task, field: string) {
    if (this.editingTaskId !== task._id || this.editingField !== field) return;
    const updates: Partial<UpdateTaskRequest> = {};
    if (field === 'startDate' || field === 'dueDate') {
      updates[field as 'startDate' | 'dueDate'] = this.editValue
        ? (this.editValue as Date).toISOString()
        : undefined;
    } else if (field === 'progress') {
      const n = Number(this.editValue);
      updates.progress = isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
    } else if (field === 'status') {
      updates.status = this.editValue as string as TaskStatus;
    } else {
      (updates as any)[field] =
        this.editValue !== null && this.editValue !== undefined
          ? String(this.editValue).trim()
          : '';
    }
    this.taskFieldUpdated.emit({ task, updates });
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingTaskId = null;
    this.editingField = null;
    this.editValue = null;
  }

  viewTaskDetails(task: Task) {
    this.viewTask.emit(task);
  }

  editTaskDetails(task: Task) {
    this.taskUpdated.emit(task);
  }

  /** Entra en modo edición en la tarjeta móvil con los campos de la tabla */
  startMobileEdit(task: Task) {
    this.mobileEditingTaskId = task._id;
    this.mobileEditDraft = {
      item: task.item ?? '',
      title: task.title ?? '',
      description: task.description ?? '',
      ejecutor: task.ejecutor ?? '',
      proveedorResponsable: task.proveedorResponsable ?? '',
      status: task.status,
      progress: task.progress ?? 0,
      conclusiones: task.conclusiones ?? '',
      startDate: task.startDate ? new Date(task.startDate) : null,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
    };
  }

  /** Guarda la edición móvil y emite los cambios */
  saveMobileEdit(task: Task) {
    if (!this.mobileEditDraft || this.mobileEditingTaskId !== task._id) return;
    const d = this.mobileEditDraft;
    const updates: Partial<UpdateTaskRequest> = {};
    // item no se envía: es 1, 2, 3 ascendente y no editable
    if (d.title !== undefined) updates.title = d.title;
    if (d.description !== undefined) updates.description = d.description;
    if (d.ejecutor !== undefined) updates.ejecutor = d.ejecutor;
    if (d.proveedorResponsable !== undefined) updates.proveedorResponsable = d.proveedorResponsable;
    if (d.status !== undefined) updates.status = d.status;
    if (d.progress !== undefined) updates.progress = Number(d.progress);
    if (d.conclusiones !== undefined) updates.conclusiones = d.conclusiones;
    if (d.startDate !== undefined)
      updates.startDate = d.startDate
        ? d.startDate instanceof Date
          ? d.startDate.toISOString()
          : new Date(d.startDate).toISOString()
        : undefined;
    if (d.dueDate !== undefined)
      updates.dueDate = d.dueDate
        ? d.dueDate instanceof Date
          ? d.dueDate.toISOString()
          : new Date(d.dueDate).toISOString()
        : undefined;
    this.taskFieldUpdated.emit({ task, updates });
    this.cancelMobileEdit();
  }

  cancelMobileEdit() {
    this.mobileEditingTaskId = null;
    this.mobileEditDraft = null;
  }

  isMobileEditing(task: Task): boolean {
    return this.mobileEditingTaskId === task._id;
  }

  confirmDelete(task: Task, event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Estás seguro de que deseas eliminar esta tarea?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.taskDeleted.emit(task);
      },
    });
  }
}
