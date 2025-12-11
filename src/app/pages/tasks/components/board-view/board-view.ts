import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { DialogModule } from 'primeng/dialog';
import { Board } from '../../../../shared/interfaces/board.interface';
import { NativeKanbanBoardComponent } from '../native-kanban-board/native-kanban-board';
import { NativeTaskStatsComponent } from '../native-task-stats/native-task-stats';
import { NativeTaskListComponent } from '../native-task-list/native-task-list';
import {
  Task,
  DragDropEvent,
  TasksSearchParams,
} from '../../../../shared/interfaces/task.interface';

/**
 * Componente de vista de tablero con sus tareas
 * Principio de Responsabilidad Única: Solo renderiza la vista del tablero con tareas
 */
@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TagModule,
    TooltipModule,
    SelectModule,
    DatePickerModule,
    MultiSelectModule,
    DialogModule,
    NativeKanbanBoardComponent,
    NativeTaskStatsComponent,
    NativeTaskListComponent,
  ],
  templateUrl: './board-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardViewComponent {
  @Input({ required: true }) board!: Board;
  @Input() isOwner = false;
  @Input() tasksByStatus: { pending: Task[]; inProgress: Task[]; completed: Task[] } = {
    pending: [],
    inProgress: [],
    completed: [],
  };
  @Input() taskStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  } = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };
  @Input() loading = false;

  @Output() back = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() invite = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() taskStatusChanged = new EventEmitter<DragDropEvent>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<Task>();
  @Output() viewTask = new EventEmitter<Task>();
  @Output() createTask = new EventEmitter<void>();
  @Output() filtersChanged = new EventEmitter<TasksSearchParams>();

  // Modo de vista
  public readonly viewMode = signal<'kanban' | 'list'>('kanban');
  public readonly showMembersDialog = signal(false);

  // Filtros
  public readonly showFilters = signal<boolean>(false);
  public readonly filterAssignedTo = signal<string | undefined>(undefined);
  public readonly filterDateFrom = signal<Date | undefined>(undefined);
  public readonly filterDateTo = signal<Date | undefined>(undefined);
  public readonly filterTags = signal<string[]>([]);

  // Opciones para filtros
  @Input() availableUsers: { label: string; value: string }[] = [];
  @Input() availableTags: string[] = [];
  @Input() currentUserId = '';
  @Output() removeMember = new EventEmitter<{ board: Board; memberId: string }>();
  @Output() leaveBoard = new EventEmitter<Board>();

  /**
   * Opciones de etiquetas para el multiSelect
   */
  public get tagOptions(): { label: string; value: string }[] {
    return this.availableTags.map((tag) => ({ label: tag, value: tag }));
  }

  /**
   * Cambia el modo de vista
   */
  public toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'kanban' ? 'list' : 'kanban');
  }

  get pendingInvitations(): number {
    return (this.board.invitations || []).filter((inv) => inv.status === 'pending').length;
  }

  getPendingInvitations() {
    return (this.board.invitations || []).filter((inv) => inv.status === 'pending');
  }

  /**
   * Toggle la visibilidad de los filtros
   */
  public toggleFilters(): void {
    this.showFilters.update((value) => !value);
  }

  /**
   * Aplica los filtros
   */
  public applyFilters(): void {
    const filters: TasksSearchParams = {
      boardId: this.board._id,
    };

    // Normalizar y agregar filtro de asignado a
    const assignedTo = this.filterAssignedTo();
    if (assignedTo !== undefined && assignedTo !== null && assignedTo !== '') {
      // Asegurar que sea un string válido
      const assignedToValue = typeof assignedTo === 'string' ? assignedTo : String(assignedTo);
      if (assignedToValue.trim() !== '') {
        filters.assignedTo = assignedToValue;
      }
    }

    // Normalizar y agregar filtros de fecha
    const dateFrom = this.filterDateFrom();
    const dateTo = this.filterDateTo();

    if (dateFrom !== undefined && dateFrom !== null) {
      const dateFromObj = dateFrom instanceof Date ? dateFrom : new Date(dateFrom);
      // Solo agregar si es una fecha válida
      if (!isNaN(dateFromObj.getTime())) {
        filters.dueDateFrom = dateFromObj.toISOString();
      }
    }

    if (dateTo !== undefined && dateTo !== null) {
      const dateToObj = dateTo instanceof Date ? dateTo : new Date(dateTo);
      // Solo agregar si es una fecha válida
      if (!isNaN(dateToObj.getTime())) {
        // Usar la fecha y hora seleccionada por el usuario
        filters.dueDateTo = dateToObj.toISOString();
      }
    }

    // Normalizar y agregar filtro de etiquetas
    const tags = this.filterTags();
    if (tags && Array.isArray(tags) && tags.length > 0) {
      filters.tags = tags;
    }

    this.filtersChanged.emit(filters);
  }

  /**
   * Limpia los filtros
   */
  public clearFilters(): void {
    this.filterAssignedTo.set(undefined);
    this.filterDateFrom.set(undefined);
    this.filterDateTo.set(undefined);
    this.filterTags.set([]);
    this.applyFilters();
  }

  /**
   * Normaliza el valor de asignado a cuando cambia
   */
  public onAssignedToChange(
    value: string | { value: string; label: string } | null | undefined
  ): void {
    if (value === null || value === undefined || value === '') {
      this.filterAssignedTo.set(undefined);
    } else if (typeof value === 'object' && 'value' in value) {
      // Si PrimeNG devuelve el objeto completo, extraer el value
      const extractedValue = value.value;
      this.filterAssignedTo.set(
        extractedValue === null || extractedValue === undefined || extractedValue === ''
          ? undefined
          : extractedValue
      );
    } else if (typeof value === 'string' && value.trim() !== '') {
      this.filterAssignedTo.set(value);
    } else {
      this.filterAssignedTo.set(undefined);
    }
    // Los signals son síncronos, así que podemos llamar applyFilters directamente
    this.applyFilters();
  }

  /**
   * Normaliza el valor de fecha desde cuando cambia
   */
  public onDateFromChange(value: Date | null | undefined | string): void {
    // Manejar todos los casos: null, undefined, string vacío, o Date inválido
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      this.filterDateFrom.set(undefined);
    } else if (value instanceof Date) {
      // Solo establecer si es una fecha válida
      if (!isNaN(value.getTime())) {
        this.filterDateFrom.set(value);
      } else {
        this.filterDateFrom.set(undefined);
      }
    } else {
      this.filterDateFrom.set(undefined);
    }
    // Los signals son síncronos, así que podemos llamar applyFilters directamente
    this.applyFilters();
  }

  /**
   * Normaliza el valor de fecha hasta cuando cambia
   */
  public onDateToChange(value: Date | null | undefined | string): void {
    // Manejar todos los casos: null, undefined, string vacío, o Date inválido
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      this.filterDateTo.set(undefined);
    } else if (value instanceof Date) {
      // Solo establecer si es una fecha válida
      if (!isNaN(value.getTime())) {
        this.filterDateTo.set(value);
      } else {
        this.filterDateTo.set(undefined);
      }
    } else {
      this.filterDateTo.set(undefined);
    }
    // Los signals son síncronos, así que podemos llamar applyFilters directamente
    this.applyFilters();
  }

  /**
   * Normaliza el valor de etiquetas cuando cambia
   */
  public onTagsChange(value: string[] | null | undefined): void {
    // Asegurar que siempre sea un array, nunca null
    if (value === null || value === undefined) {
      this.filterTags.set([]);
    } else if (Array.isArray(value)) {
      this.filterTags.set(value);
    } else {
      this.filterTags.set([]);
    }
    // Los signals son síncronos, así que podemos llamar applyFilters directamente
    this.applyFilters();
  }

  /**
   * Verifica si hay filtros activos
   */
  public hasActiveFilters(): boolean {
    return !!(
      this.filterAssignedTo() ||
      this.filterDateFrom() ||
      this.filterDateTo() ||
      this.filterTags().length > 0
    );
  }

  onBack(event: Event): void {
    event.stopPropagation();
    this.back.emit();
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit();
  }

  onInvite(event: Event): void {
    event.stopPropagation();
    this.invite.emit();
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.refresh.emit();
  }

  onCreateTask(event: Event): void {
    event.stopPropagation();
    this.createTask.emit();
  }

  isCurrentUserMember(): boolean {
    if (!this.currentUserId) return false;
    return (this.board.members || []).some((member) => member._id === this.currentUserId);
  }

  isCurrentUser(memberId: string): boolean {
    return this.currentUserId === memberId;
  }

  onRemoveMember(memberId: string): void {
    this.removeMember.emit({ board: this.board, memberId });
  }

  onLeaveBoard(): void {
    this.leaveBoard.emit(this.board);
  }
}
